/** HTTP 처리기. Vercel 함수(api/*.ts)와 개발 서버(vite.config.ts)가 같은 처리기를 쓴다. */
import { PACKS, openKnowledge } from './packs.js';
import { maskPii } from './pii.js';
import { validateInput } from './validate.js';
import { check } from './check.js';
import { runConsult } from './consult.js';
import { extractTextFromImage } from './ocr.js';
import { lookupLawByItemId } from './law-api.js';
import { getLawGraphStats } from './law-graphrag.js';
import { runTaxCheck } from './tax.js';
import { responseCache } from './response-cache.js';
import {
  userStore,
  type OnyulProfile,
  type SavedConversation,
} from './user-store.js';
import { CheckError } from './errors.js';
import type { Version } from '../shared/types.js';

const json = (status: number, body: unknown, extraHeaders?: Record<string, string>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      ...extraHeaders,
    },
  });

export function handlePacks(): Response {
  return json(200, {
    packs: PACKS.map((p) => ({
      id: p.id,
      name: p.name,
      kinds: p.kinds,
      itemCount: p.items.length,
      items: p.items.map((i) => ({
        id: i.id,
        title: i.title,
        knowledge: i.knowledge,
        knowledgeText: openKnowledge(i.knowledge)?.text ?? '',
      })),
    })),
  });
}

export async function handleCheck(request: Request): Promise<Response> {
  if (request.method !== 'POST') return json(405, { error: 'POST 요청만 받아요.' });
  let body: {
    action?: string;
    pack?: string;
    text?: string;
    image?: string;
    version?: string;
    itemId?: string;
    question?: string;
    quote?: string;
    filerType?: 'individual_biz' | 'wage_earner' | 'freelancer';
    profile?: Partial<OnyulProfile>;
    profileId?: string;
    conversation?: SavedConversation;
    conversationId?: string;
    oauthParams?: Record<string, string>;
    bypassCache?: boolean;
  };
  try {
    body = await request.json();
  } catch {
    return json(400, { error: '요청 내용을 읽지 못했어요.' });
  }

  let text = typeof body.text === 'string' ? body.text : '';
  const pack = typeof body.pack === 'string' ? body.pack : '';
  const authHeader = request.headers.get('authorization') ?? undefined;

  try {
    // 0-0. GraphRAG 지식그래프 실시간 통계 조회
    if (body.action === 'graph_stats') {
      return json(200, {
        ...getLawGraphStats(),
        cache: responseCache.stats(),
      });
    }

    // 0-0b. 캐시 통계 조회
    if (body.action === 'cache_stats') {
      return json(200, responseCache.stats());
    }

    // 0-0c. 개인화 계정·프로필·대화내역 통합 조회 및 관리 (다온 사주 스타일)
    if (body.action === 'account') {
      const account = await userStore.resolveUserFromAuthHeader(authHeader);
      return json(200, {
        account,
        profiles: userStore.getProfiles(account),
        conversations: userStore.listConversations(account),
        cacheStats: responseCache.stats(),
      });
    }

    if (body.action === 'profiles_save') {
      const account = await userStore.resolveUserFromAuthHeader(authHeader);
      const p = body.profile ?? {};
      const res = userStore.saveProfile(account, {
        id: p.id,
        name: p.name ?? '맞춤 프로필',
        topic: p.topic ?? 'lease',
        filerType: p.filerType ?? 'wage_earner',
        memo: p.memo ?? '',
        isDefault: p.isDefault,
      });
      return json(200, res);
    }

    if (body.action === 'profiles_delete') {
      const account = await userStore.resolveUserFromAuthHeader(authHeader);
      const profiles = userStore.deleteProfile(account, String(body.profileId ?? ''));
      return json(200, { profiles });
    }

    if (body.action === 'conversations_list') {
      const account = await userStore.resolveUserFromAuthHeader(authHeader);
      return json(200, {
        conversations: userStore.listConversations(account),
      });
    }

    if (body.action === 'conversations_get') {
      const account = await userStore.resolveUserFromAuthHeader(authHeader);
      const conv = userStore.getConversation(account, String(body.conversationId ?? ''));
      if (!conv) return json(404, { error: '대화를 찾지 못했어요.' });
      return json(200, { conversation: conv });
    }

    if (body.action === 'conversations_save') {
      const account = await userStore.resolveUserFromAuthHeader(authHeader);
      if (!body.conversation) return json(400, { error: '저장할 대화 데이터가 없어요.' });
      const saved = userStore.saveConversation(account, body.conversation);
      return json(200, {
        conversation: saved,
        conversations: userStore.listConversations(account),
      });
    }

    if (body.action === 'conversations_delete') {
      const account = await userStore.resolveUserFromAuthHeader(authHeader);
      userStore.deleteConversation(account, String(body.conversationId ?? ''));
      return json(200, {
        conversations: userStore.listConversations(account),
      });
    }

    if (body.action === 'oauth_token') {
      const exchanged = await userStore.exchangeOAuthToken(body.oauthParams ?? {});
      return json(exchanged.status, exchanged.body);
    }

    // 0-1. 국가법령정보센터 실시간 법령·대법원 판례 조회 요청 (OKE Rust Law MCP + 캐시)
    if (body.action === 'law') {
      const itemId =
        typeof body.itemId === 'string' && body.itemId.trim() ? body.itemId.trim() : 'no_new_mortgage';
      const cachePayload = { itemId };
      if (!body.bypassCache) {
        const hit = responseCache.get<Record<string, unknown>>('law', cachePayload);
        if (hit) {
          return json(
            200,
            { ...hit.value, cached: true, cacheKey: hit.key, cacheHits: hit.hits },
            { 'x-onyul-cache': 'HIT' },
          );
        }
      }
      const result = await lookupLawByItemId(itemId);
      const cacheKey = responseCache.set('law', cachePayload, result);
      return json(200, { ...result, cached: false, cacheKey }, { 'x-onyul-cache': 'MISS' });
    }

    // 0-2. 법령·판례 고정형 법률 상담 요청 (OKE Rust Law MCP + 캐시)
    if (body.action === 'consult') {
      const consultInput = {
        itemId: body.itemId,
        pack,
        question: typeof body.question === 'string' ? body.question : text,
        quote: body.quote,
      };
      if (!body.bypassCache) {
        const hit = responseCache.get<Record<string, unknown>>('consult', consultInput);
        if (hit) {
          return json(
            200,
            { ...hit.value, cached: true, cacheKey: hit.key, cacheHits: hit.hits },
            { 'x-onyul-cache': 'HIT' },
          );
        }
      }
      const result = await runConsult(consultInput);
      const cacheKey = responseCache.set('consult', consultInput, result);
      return json(200, { ...result, cached: false, cacheKey }, { 'x-onyul-cache': 'MISS' });
    }

    // 0-3. 영수증·거래내역·계약서 세무 자동 판정 요청 (OKE Rust Law MCP + 캐시)
    if (body.action === 'tax') {
      const taxInput = {
        text: text || (typeof body.question === 'string' ? body.question : ''),
        filerType: body.filerType ?? 'wage_earner',
      };
      if (!body.bypassCache) {
        const hit = responseCache.get<Record<string, unknown>>('tax', taxInput);
        if (hit) {
          return json(
            200,
            { ...hit.value, cached: true, cacheKey: hit.key, cacheHits: hit.hits },
            { 'x-onyul-cache': 'HIT' },
          );
        }
      }
      const result = await runTaxCheck(taxInput);
      const cacheKey = responseCache.set('tax', taxInput, result);
      return json(200, { ...result, cached: false, cacheKey }, { 'x-onyul-cache': 'MISS' });
    }

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

    // 3. 계약서 점검 실행 요청 (+ SHA-256 응답 캐싱)
    if (body.action === 'check') {
      const version = (['v0', 'v1', 'v2'] as const).includes(body.version as Version)
        ? (body.version as Version)
        : undefined;
      const hasApiKey =
        process.env.LLM_PROVIDER === 'gemini'
          ? Boolean(process.env.GEMINI_API_KEY)
          : Boolean(process.env.OPENAI_API_KEY);
      const checkInput = { text, pack, version: version ?? 'v2', hasApiKey };
      if (!body.bypassCache && hasApiKey) {
        const hit = responseCache.get<Record<string, unknown>>('check', checkInput);
        if (hit) {
          return json(
            200,
            { ...hit.value, cached: true, cacheKey: hit.key, cacheHits: hit.hits },
            { 'x-onyul-cache': 'HIT' },
          );
        }
      }
      const result = await check({ text, pack, version });
      if (hasApiKey) {
        const cacheKey = responseCache.set('check', checkInput, result);
        return json(200, { ...result, cached: false, cacheKey }, { 'x-onyul-cache': 'MISS' });
      }
      return json(200, result);
    }

    return json(400, { error: 'action 은 ocr, mask 또는 check 예요.' });
  } catch (e) {
    if (e instanceof CheckError) return json(e.status, { error: e.message });
    console.error('[check] unexpected', e);
    return json(500, { error: '점검 중 문제가 생겼어요. 잠시 뒤 다시 눌러 주세요.' });
  }
}
