/** 공개 클라이언트의 코드·Google ID 토큰 교환과 갱신을 인증 서버에 전달한다 (다온 사주 server/token.ts 와 동일). */
const TOKEN_URL = 'https://auth.ugot.uk/oauth2/token';
const ALLOWED_CLIENT = process.env.VITE_OAUTH_CLIENT_ID ?? 'saju-ai';
const GOOGLE_EXCHANGE = 'urn:ietf:params:oauth:grant-type:token-exchange';
const ALLOWED_GRANTS = new Set(['authorization_code', 'refresh_token', GOOGLE_EXCHANGE]);

const jsonResponse = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

export async function handleToken(request: Request): Promise<Response> {
  const form = new URLSearchParams(await request.text());
  if (
    form.getAll('client_id').length !== 1 ||
    form.getAll('grant_type').length !== 1 ||
    form.get('client_id') !== ALLOWED_CLIENT ||
    !ALLOWED_GRANTS.has(form.get('grant_type') ?? '')
  ) {
    return jsonResponse(400, { error: 'invalid_request' });
  }
  if (form.get('grant_type') === GOOGLE_EXCHANGE) {
    const fields = ['client_id', 'grant_type', 'subject_token_type', 'subject_token', 'scope'];
    if (
      [...form.keys()].some((key) => !fields.includes(key) || form.getAll(key).length !== 1) ||
      form.get('subject_token_type') !== 'urn:ietf:params:oauth:token-type:id_token' ||
      !form.get('subject_token') ||
      form.get('subject_token')!.length > 16_384 ||
      form.get('scope') !== 'openid profile email offline_access'
    ) {
      return jsonResponse(400, { error: 'invalid_request' });
    }
  }
  let res: Response;
  try {
    res = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: form,
      redirect: 'manual',
      signal: AbortSignal.timeout(20_000),
    });
  } catch {
    return jsonResponse(502, { error: 'auth_unavailable' });
  }
  if (res.status >= 300 && res.status < 400) {
    return jsonResponse(502, { error: 'upstream_redirect' });
  }
  const text = await res.text();
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return jsonResponse(res.status === 400 || res.status === 401 ? res.status : 502, {
      error: res.status === 400 || res.status === 401 ? 'invalid_grant' : 'invalid_token_response',
    });
  }
  if (res.ok) {
    const token = parsed as Record<string, unknown> | null;
    if (
      !token ||
      typeof token !== 'object' ||
      typeof token.access_token !== 'string' ||
      !token.access_token ||
      typeof token.expires_in !== 'number' ||
      !Number.isFinite(token.expires_in)
    ) {
      return jsonResponse(502, { error: 'invalid_token_response' });
    }
  }
  return new Response(text, { status: res.status, headers: { 'content-type': 'application/json' } });
}
