/**
 * @daon/stage-ui/auth — 다온 사주(apps/saju-ai) · 온율 계약·법률·세무(lease-clause-check) 등이
 * 공통으로 사용하는 auth.ugot.uk OAuth2 PKCE + Google Identity Services 토큰 교환 클라이언트.
 *
 * 서비스(Host)는 storagePrefix / clientId 설정만 주입하고,
 * PKCE S256 생성·콜백 검증·Google ID 토큰 nonce 검증·Web Locks 기반 리프레시 토큰 갱신은
 * 이 공통 모듈이 단일 소유(Library-First Ownership)한다.
 */
import { cancelGoogleSignIn, mountGoogleSignIn } from '../../googleIdentity';

export { cancelGoogleSignIn, mountGoogleSignIn };

export interface AuthClientOptions {
  /** localStorage / sessionStorage 키 접두사 (예: 'saju-ai', 'onyul') */
  storagePrefix: string;
  /** OAuth2 client_id (기본값: VITE_OAUTH_CLIENT_ID ?? 'saju-ai') */
  clientId?: string;
  /** 인증 서버 베이스 URL (기본값: 'https://auth.ugot.uk') */
  authBase?: string;
  /** 토큰 교환 프록시 엔드포인트 (기본값: '/api/token') */
  tokenEndpoint?: string;
  /** 기본 UI 로케일 (기본값: 'ko') */
  locale?: string;
}

export interface AuthSession {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
}

interface PendingLogin {
  verifier: string;
  state: string;
}

const DEFAULT_AUTH_BASE = 'https://auth.ugot.uk';
const DEFAULT_SCOPE = 'openid profile email offline_access';

/** 인증 서버가 갱신 토큰·코드를 거절했을 때(만료·이미 사용됨) 던지는 내부 예외 */
class TokenRejected extends Error {}

/** 인증 콜백 검증 실패 시 UI에서 안내 문구를 표시하기 위한 공개 예외 */
export class AuthCallbackError extends Error {
  constructor() {
    super('Invalid OAuth callback');
    this.name = 'AuthCallbackError';
  }
}

const b64url = (bytes: ArrayBuffer | Uint8Array) =>
  btoa(String.fromCharCode(...new Uint8Array(bytes)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

export interface DaonAuthClient {
  startLogin: () => Promise<void>;
  finishLoginIfCallback: () => Promise<boolean>;
  finishGoogleLogin: (
    credential: string,
    nonce: string,
    revision: string | null,
    isCurrent?: () => boolean,
  ) => Promise<boolean>;
  devLogin: () => void;
  logout: (options?: { endSession?: boolean }) => Promise<void>;
  isLoggedIn: () => boolean;
  getAccessToken: () => Promise<string | null>;
  forceRefresh: () => Promise<string | null>;
  authRevision: () => string | null;
}

export function createAuthClient(options: AuthClientOptions): DaonAuthClient {
  const prefix = options.storagePrefix;
  const clientId = options.clientId ?? import.meta.env.VITE_OAUTH_CLIENT_ID ?? 'saju-ai';
  const authBase = options.authBase ?? DEFAULT_AUTH_BASE;
  const tokenEndpoint = options.tokenEndpoint ?? '/api/token';
  const locale = options.locale ?? 'ko';

  const STORE_KEY = `${prefix}.session`;
  const PKCE_KEY = `${prefix}.pkce`;
  const REVISION_KEY = `${prefix}.auth-revision`;
  const LOCK_NAME = `${prefix}.refresh`;

  const redirectUri = () => `${location.origin}/auth/callback`;

  function read(): AuthSession | null {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as Partial<AuthSession> | null;
      if (
        !parsed ||
        typeof parsed.accessToken !== 'string' ||
        !parsed.accessToken ||
        typeof parsed.expiresAt !== 'number' ||
        !Number.isFinite(parsed.expiresAt)
      ) {
        localStorage.removeItem(STORE_KEY);
        return null;
      }
      return {
        accessToken: parsed.accessToken,
        refreshToken:
          typeof parsed.refreshToken === 'string' && parsed.refreshToken
            ? parsed.refreshToken
            : undefined,
        expiresAt: parsed.expiresAt,
      };
    } catch {
      localStorage.removeItem(STORE_KEY);
      return null;
    }
  }

  function write(s: AuthSession | null) {
    if (s) localStorage.setItem(STORE_KEY, JSON.stringify(s));
    else localStorage.removeItem(STORE_KEY);
  }

  function authRevision() {
    return localStorage.getItem(REVISION_KEY);
  }

  async function startLogin() {
    cancelGoogleSignIn();
    const revision = authRevision();
    const verifier = b64url(crypto.getRandomValues(new Uint8Array(32)));
    const challenge = b64url(
      await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier)),
    );
    if (revision !== authRevision()) return;
    const state = b64url(crypto.getRandomValues(new Uint8Array(16)));
    sessionStorage.setItem(PKCE_KEY, JSON.stringify({ verifier, state }));
    const url = new URL(`${authBase}/oauth2/authorize`);
    url.search = new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      redirect_uri: redirectUri(),
      scope: DEFAULT_SCOPE,
      ui_locales: locale,
      code_challenge: challenge,
      code_challenge_method: 'S256',
      state,
      prompt: 'login',
      max_age: '0',
    }).toString();
    location.assign(url.toString());
  }

  function pendingLogin(): PendingLogin | null {
    try {
      const raw = sessionStorage.getItem(PKCE_KEY);
      if (!raw) return null;
      const saved = JSON.parse(raw) as Partial<PendingLogin> | null;
      if (
        !saved ||
        typeof saved.verifier !== 'string' ||
        !/^[A-Za-z0-9_-]{43}$/.test(saved.verifier) ||
        typeof saved.state !== 'string' ||
        !/^[A-Za-z0-9_-]{22}$/.test(saved.state)
      ) {
        throw new AuthCallbackError();
      }
      return { verifier: saved.verifier, state: saved.state };
    } catch {
      sessionStorage.removeItem(PKCE_KEY);
      return null;
    }
  }

  async function tokenRequest(params: Record<string, string>): Promise<AuthSession> {
    const res = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
        'accept-language': locale,
      },
      body: new URLSearchParams({ client_id: clientId, ...params }),
    });
    if (res.status === 400 || res.status === 401) {
      throw new TokenRejected(`token rejected: HTTP ${res.status}`);
    }
    if (!res.ok) throw new Error(`token request failed: HTTP ${res.status}`);
    const body = (await res.json()) as Partial<{
      access_token: string;
      refresh_token?: string;
      expires_in: number;
    }> | null;
    if (
      !body ||
      typeof body.access_token !== 'string' ||
      !body.access_token ||
      typeof body.expires_in !== 'number' ||
      !Number.isFinite(body.expires_in)
    ) {
      throw new Error('invalid token response');
    }
    return {
      accessToken: body.access_token,
      refreshToken:
        typeof body.refresh_token === 'string' && body.refresh_token
          ? body.refresh_token
          : undefined,
      expiresAt: Date.now() + body.expires_in * 1000,
    };
  }

  async function finishLoginIfCallback(): Promise<boolean> {
    if (location.pathname !== '/auth/callback') return false;
    const params = new URLSearchParams(location.search);
    history.replaceState(null, '', '/');
    const code = params.get('code');
    const state = params.get('state');
    const error = params.get('error');
    if (
      !state ||
      params.getAll('state').length !== 1 ||
      params.getAll('code').length > 1 ||
      params.getAll('error').length > 1 ||
      params.has('code') === params.has('error') ||
      (!code && !error)
    ) {
      throw new AuthCallbackError();
    }
    const saved = pendingLogin();
    if (!saved || saved.state !== state) throw new AuthCallbackError();
    sessionStorage.removeItem(PKCE_KEY);
    if (error || !code) throw new AuthCallbackError();
    const revision = authRevision();
    const next = await tokenRequest({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri(),
      code_verifier: saved.verifier,
    });
    if (revision !== authRevision()) return false;
    write(next);
    return true;
  }

  async function finishGoogleLogin(
    credential: string,
    nonce: string,
    revision: string | null,
    isCurrent: () => boolean = () => true,
  ): Promise<boolean> {
    if (!isCurrent() || revision !== authRevision()) return false;
    try {
      const parts = credential.split('.');
      if (parts.length !== 3 || !nonce) throw new AuthCallbackError();
      const encoded = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const payload = JSON.parse(
        atob(encoded.padEnd(Math.ceil(encoded.length / 4) * 4, '=')),
      ) as { nonce?: unknown };
      if (payload.nonce !== nonce) throw new AuthCallbackError();
    } catch {
      throw new AuthCallbackError();
    }
    const next = await tokenRequest({
      grant_type: 'urn:ietf:params:oauth:grant-type:token-exchange',
      subject_token_type: 'urn:ietf:params:oauth:token-type:id_token',
      subject_token: credential,
      scope: DEFAULT_SCOPE,
    });
    if (!isCurrent() || revision !== authRevision()) return false;
    write(next);
    return true;
  }

  function devLogin() {
    write({ accessToken: 'dev', expiresAt: Number.MAX_SAFE_INTEGER });
  }

  async function logout({ endSession = false }: { endSession?: boolean } = {}) {
    localStorage.setItem(REVISION_KEY, crypto.randomUUID());
    write(null);
    sessionStorage.removeItem(PKCE_KEY);
    cancelGoogleSignIn(true);
    if (!endSession) return;
    const url = new URL(`${authBase}/connect/logout`);
    url.search = new URLSearchParams({
      client_id: clientId,
      post_logout_redirect_uri: `${location.origin}/`,
    }).toString();
    location.assign(url.toString());
  }

  function isLoggedIn() {
    return read() !== null;
  }

  const fresh = (s: AuthSession) => s.expiresAt - 60_000 > Date.now();

  async function refreshSession(): Promise<AuthSession | null> {
    const run = async (): Promise<AuthSession | null> => {
      const cur = read();
      if (!cur) return null;
      if (fresh(cur)) return cur;
      if (!cur.refreshToken) {
        write(null);
        return null;
      }
      try {
        const revision = authRevision();
        const next = await tokenRequest({
          grant_type: 'refresh_token',
          refresh_token: cur.refreshToken,
        });
        const latest = read();
        if (revision !== authRevision() || latest?.refreshToken !== cur.refreshToken) {
          return latest;
        }
        const saved = { ...next, refreshToken: next.refreshToken ?? cur.refreshToken };
        write(saved);
        return saved;
      } catch (e) {
        if (e instanceof TokenRejected) {
          const latest = read();
          if (latest && latest.refreshToken !== cur.refreshToken) return latest;
          write(null);
          return null;
        }
        throw e;
      }
    };
    return 'locks' in navigator ? navigator.locks.request(LOCK_NAME, run) : run();
  }

  async function forceRefresh(): Promise<string | null> {
    const s = read();
    if (!s) return null;
    write({ ...s, expiresAt: 0 });
    return (await refreshSession())?.accessToken ?? null;
  }

  async function getAccessToken(): Promise<string | null> {
    const s = read();
    if (!s) return null;
    if (fresh(s)) return s.accessToken;
    return (await refreshSession())?.accessToken ?? null;
  }

  return {
    startLogin,
    finishLoginIfCallback,
    finishGoogleLogin,
    devLogin,
    logout,
    isLoggedIn,
    getAccessToken,
    forceRefresh,
    authRevision,
  };
}
