/** HTTP 처리기. Vercel 함수(api/*.ts)와 개발 서버(vite.config.ts)가 같은 처리기를 쓴다. */
import { PACKS } from './packs.ts';
import { maskPii } from './pii.ts';
import { validateInput } from './validate.ts';
import { check } from './check.ts';
import { CheckError } from './errors.ts';
import type { Version } from '../shared/types.ts';

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });

export function handlePacks(): Response {
  return json(200, { packs: PACKS.map((p) => ({ id: p.id, name: p.name, kinds: p.kinds, itemCount: p.items.length })) });
}

export async function handleCheck(request: Request): Promise<Response> {
  if (request.method !== 'POST') return json(405, { error: 'POST 요청만 받아요.' });
  let body: { action?: string; pack?: string; text?: string; version?: string };
  try {
    body = await request.json();
  } catch {
    return json(400, { error: '요청 내용을 읽지 못했어요.' });
  }
  const text = typeof body.text === 'string' ? body.text : '';
  const pack = typeof body.pack === 'string' ? body.pack : '';
  try {
    if (body.action === 'mask') {
      const valid = validateInput(text);
      if (!valid.ok) return json(400, { error: valid.message });
      return json(200, maskPii(text));
    }
    if (body.action === 'check') {
      const version = (['v0', 'v1', 'v2'] as const).includes(body.version as Version) ? (body.version as Version) : undefined;
      return json(200, await check({ text, pack, version }));
    }
    return json(400, { error: 'action 은 mask 또는 check 예요.' });
  } catch (e) {
    if (e instanceof CheckError) return json(e.status, { error: e.message });
    console.error('[check] unexpected', e);
    return json(500, { error: '점검 중 문제가 생겼어요. 잠시 뒤 다시 눌러 주세요.' });
  }
}
