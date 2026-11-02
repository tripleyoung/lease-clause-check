import {
  AuthCallbackError,
  createAuthClient,
  type DaonAuthClient,
} from './packages/daon-stage';

/** 온율(lease-clause-check) 서비스 호스트의 인증 클라이언트 인스턴스 (@daon/stage-ui 공통 모듈 사용) */
export const onyulAuth: DaonAuthClient = createAuthClient({
  storagePrefix: 'onyul',
});

export { AuthCallbackError };
export const startLogin = () => onyulAuth.startLogin();
export const finishLoginIfCallback = () => onyulAuth.finishLoginIfCallback();
export const finishGoogleLogin = (
  credential: string,
  nonce: string,
  revision: string | null,
  isCurrent?: () => boolean,
) => onyulAuth.finishGoogleLogin(credential, nonce, revision, isCurrent);
export const devLogin = () => onyulAuth.devLogin();
export const logout = (opts?: { endSession?: boolean }) => onyulAuth.logout(opts);
export const isLoggedIn = () => onyulAuth.isLoggedIn();
export const getAccessToken = () => onyulAuth.getAccessToken();
export const forceRefresh = () => onyulAuth.forceRefresh();
export const authRevision = () => onyulAuth.authRevision();
