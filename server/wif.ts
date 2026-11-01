/**
 * Workload Identity Federation (WIF) for Gemini API:
 * auth.ugot.uk 이 발급한 OIDC JWT 를 Google STS -> IAM Service Account 단기 토큰으로 교환해
 * generativelanguage.googleapis.com 전용 제한 키를 메모리에서 동적으로 받아 캐시한다.
 * (다온 사주 apps/saju-ai/server/wif.ts 와 동일한 파이프라인)
 */
const AUTH_TOKEN_URL = 'https://auth.ugot.uk/oauth2/token';
const GCP_STS_URL = 'https://sts.googleapis.com/v1/token';
const REFRESH_MARGIN_MS = 60_000;

const WIF = {
  clientId: process.env.ANTHROPIC_WIF_CLIENT_ID ?? 'anthropic-wif',
};

const GCP_WIF = {
  audience:
    process.env.GCP_WIF_AUDIENCE ??
    '//iam.googleapis.com/projects/504223920623/locations/global/workloadIdentityPools/ugot-pool/providers/ugot-auth',
  serviceAccount:
    process.env.GCP_WIF_SERVICE_ACCOUNT ?? 'play-api-user@reward-443513.iam.gserviceaccount.com',
  apiKeyResource:
    process.env.GCP_GEMINI_API_KEY_RESOURCE ??
    'projects/504223920623/locations/global/keys/daon-saju-gemini',
};

let cachedGeminiAccessToken: { token: string; expiresAt: number } | null = null;
let inflightGeminiAccessToken: Promise<string> | null = null;
let cachedGemini: { token: string; expiresAt: number } | null = null;
let inflightGemini: Promise<string> | null = null;

export function resetWifCacheForTest(): void {
  cachedGeminiAccessToken = null;
  inflightGeminiAccessToken = null;
  cachedGemini = null;
  inflightGemini = null;
}

async function fetchIdentityJwt(): Promise<string> {
  const secret = process.env.ANTHROPIC_WIF_CLIENT_SECRET;
  if (!secret) throw new Error('ANTHROPIC_WIF_CLIENT_SECRET is not configured');
  const basic = Buffer.from(`${WIF.clientId}:${encodeURIComponent(secret)}`).toString('base64');
  const res = await fetch(AUTH_TOKEN_URL, {
    method: 'POST',
    headers: { authorization: `Basic ${basic}`, 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'client_credentials', scope: 'anthropic.access' }),
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new Error(`identity token request failed: HTTP ${res.status}`);
  const body = (await res.json()) as { access_token: string };
  return body.access_token;
}

async function exchangeGeminiWifAccessToken(): Promise<string> {
  const assertion = await fetchIdentityJwt();
  const stsRes = await fetch(GCP_STS_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      audience: GCP_WIF.audience,
      grantType: 'urn:ietf:params:oauth:grant-type:token-exchange',
      requestedTokenType: 'urn:ietf:params:oauth:token-type:access_token',
      scope: 'https://www.googleapis.com/auth/cloud-platform',
      subjectTokenType: 'urn:ietf:params:oauth:token-type:jwt',
      subjectToken: assertion,
    }),
    signal: AbortSignal.timeout(20_000),
  });
  if (!stsRes.ok) {
    throw new Error(`gcp sts token exchange failed: HTTP ${stsRes.status} ${(await stsRes.text()).slice(0, 200)}`);
  }
  const stsBody = (await stsRes.json()) as { access_token: string; expires_in?: number };

  const iamUrl = `https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/${encodeURIComponent(GCP_WIF.serviceAccount)}:generateAccessToken`;
  const iamRes = await fetch(iamUrl, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${stsBody.access_token}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      scope: ['https://www.googleapis.com/auth/cloud-platform'],
    }),
    signal: AbortSignal.timeout(20_000),
  });
  if (!iamRes.ok) {
    throw new Error(`gcp iam service account impersonation failed: HTTP ${iamRes.status} ${(await iamRes.text()).slice(0, 200)}`);
  }
  const iamBody = (await iamRes.json()) as { accessToken: string; expireTime?: string };
  if (!iamBody.accessToken) {
    throw new Error('gcp iam service account impersonation returned empty accessToken');
  }
  const expiresAt = iamBody.expireTime ? Date.parse(iamBody.expireTime) : Date.now() + 50 * 60_000;
  cachedGeminiAccessToken = {
    token: iamBody.accessToken,
    expiresAt: Number.isFinite(expiresAt) ? expiresAt : Date.now() + 50 * 60_000,
  };
  return iamBody.accessToken;
}

export async function getGeminiWifAccessToken(): Promise<string> {
  if (cachedGeminiAccessToken && cachedGeminiAccessToken.expiresAt - REFRESH_MARGIN_MS > Date.now()) {
    return cachedGeminiAccessToken.token;
  }
  inflightGeminiAccessToken ??= exchangeGeminiWifAccessToken().finally(() => {
    inflightGeminiAccessToken = null;
  });
  return inflightGeminiAccessToken;
}

async function exchangeGeminiWif(): Promise<string> {
  const accessToken = await getGeminiWifAccessToken();
  const keyUrl = `https://apikeys.googleapis.com/v2/${GCP_WIF.apiKeyResource}/keyString`;
  const keyRes = await fetch(keyUrl, {
    headers: {
      authorization: `Bearer ${accessToken}`,
    },
    signal: AbortSignal.timeout(20_000),
  });
  if (!keyRes.ok) {
    throw new Error(`gcp gemini api key fetch failed: HTTP ${keyRes.status} ${(await keyRes.text()).slice(0, 200)}`);
  }
  const keyBody = (await keyRes.json()) as { keyString: string };
  if (!keyBody.keyString) {
    throw new Error('gcp gemini api key fetch returned empty keyString');
  }
  cachedGemini = {
    token: keyBody.keyString,
    expiresAt: cachedGeminiAccessToken?.expiresAt ?? Date.now() + 50 * 60_000,
  };
  return keyBody.keyString;
}

export async function getGeminiWifApiKey(): Promise<string> {
  const explicitKey = process.env.GEMINI_API_KEY?.trim();
  if (explicitKey) return explicitKey;
  if (cachedGemini && cachedGemini.expiresAt - REFRESH_MARGIN_MS > Date.now()) return cachedGemini.token;
  inflightGemini ??= exchangeGeminiWif().finally(() => {
    inflightGemini = null;
  });
  return inflightGemini;
}
