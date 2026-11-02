/** HTTP 처리기. Vercel 함수(api/*.ts)와 개발 서버(vite.config.ts)가 같은 처리기를 쓴다. */
import { PACKS, openKnowledge } from './packs.js';
import { maskPii } from './pii.js';
import { validateInput } from './validate.js';
import { check } from './check.js';
import { extractTextFromImage } from './ocr.js';
import { CheckError } from './errors.js';
import type { Version } from '../shared/types.js';

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });

export function handlePacks(): Response {
  return json(200, {
    packs: PACKS.map((p) => ({
      id: p.id,
      name: p.name,
      kinds: p.kinds,
      itemCount: p.items.length,
      items: p.items.map((i) => ({ id: i.id, title: i.title, knowledge: i.knowledge, knowledgeText: openKnowledge(i.knowledge)?.text ?? '' })),
    })),
  });
}

export async function handleCheck(request: Request): Promise<Response> {
  if (request.method !== 'POST') return json(405, { error: 'POST 요청만 받아요.' });
  let body: { action?: string; pack?: string; text?: string; image?: string; version?: string };
  try {
    body = await request.json();
  } catch {
    return json(400, { error: '요청 내용을 읽지 못했어요.' });
  }

  let text = typeof body.text === 'string' ? body.text : '';
  const pack = typeof body.pack === 'string' ? body.pack : '';

  try {
    // 1. 사진(OCR) 텍스트 추출 요청
    if (body.action === 'ocr') {
      if (!body.image) return json(400, { error: '분석할 계약서 사진(image)을 전송해 주세요.' });
      const extractedText = await extractTextFromImage(body.image);
      return json(200, { text: extractedText, ...maskPii(extractedText) });
    }

    // 텍스트가 없고 이미지가 전달된 경우 이미지로부터 텍스트 자동 추출
    if (!text.trim() && body.image) {
      text = await extractTextFromImage(body.image);
    }

    // 2. 개인정보 마스킹 요청
    if (body.action === 'mask') {
      const valid = validateInput(text);
      if (!valid.ok) return json(400, { error: valid.message });
      return json(200, maskPii(text));
    }

    // 3. 계약서 점검 실행 요청
    if (body.action === 'check') {
      const version = (['v0', 'v1', 'v2'] as const).includes(body.version as Version) ? (body.version as Version) : undefined;
      return json(200, await check({ text, pack, version }));
    }

    return json(400, { error: 'action 은 ocr, mask 또는 check 예요.' });
  } catch (e) {
    if (e instanceof CheckError) return json(e.status, { error: e.message });
    console.error('[check] unexpected', e);
    return json(500, { error: '점검 중 문제가 생겼어요. 잠시 뒤 다시 눌러 주세요.' });
  }
}
