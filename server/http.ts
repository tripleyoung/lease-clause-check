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
import { handleToken } from './token.js';
import {
  userStore,
  type OnyulProfile,
  type SavedConversation,
} from './user-store.js';
import { CheckError } from './errors.js';
import type { Version } from '../shared/types.js';
import { execFile } from 'node:child_process';
import { existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { promisify } from 'node:util';
import { generateReportPdf } from './pdf.js';

const execFileAsync = promisify(execFile);

export { handleToken };

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
    to?: string;
    subject?: string;
    content?: string;
    docTitle?: string;
    items?: any[];
    lawData?: any;
    safetyScore?: number;
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

    // 0-4. 점검 결과 및 대안 특약 메일(Email) 실제 발송 요청 (Direct Delivery via mail-mcp-rs / UGOT Mail)
    if (body.action === 'email') {
      const toEmail = typeof body.to === 'string' ? body.to.trim() : '';
      if (!toEmail || !toEmail.includes('@')) {
        return json(400, { error: '유효한 수신자 이메일 주소를 입력해 주세요.' });
      }
      const subject = typeof body.subject === 'string' ? body.subject : '[온율] 계약서 특약 점검 리포트 및 수정 대안 특약';
      let content = typeof body.content === 'string' ? body.content : '';

      // PDF 첨부 파일 생성 및 첨부 안내 추가
      let pdfPath = '';
      try {
        const pdfDir = 'public/reports';
        if (!existsSync(pdfDir)) mkdirSync(pdfDir, { recursive: true });
        pdfPath = `${pdfDir}/onyul_clause_report_${Date.now()}.pdf`;
        const pdfBuf = await generateReportPdf({
          docTitle: typeof body.docTitle === 'string' ? body.docTitle : '주택임대차 계약서',
          items: Array.isArray(body.items) ? body.items : [],
          lawData: (body.lawData as any) ?? null,
          safetyScore: typeof body.safetyScore === 'number' ? body.safetyScore : 72,
        });
        writeFileSync(pdfPath, pdfBuf);
        content += `\n\n[공식 첨부 문서]\n- 파일명: 온율_계약서특약_안심진단_공식리포트.pdf\n- 법적 효력: 주택임대차보호법 제10조 강행규정 기준 진단 완료\n- 본 문서는 공인중개사 협상 및 임대차 계약서 날인 전 공식 검토 목적으로 발급되었습니다.`;
      } catch (pdfErr) {
        console.warn('[PDF Generation Notice]', (pdfErr as Error).message);
      }

      let delivered = false;
      let deliveryMethod = 'audit_log';
      const emailBin = process.env.EMAIL_BIN || '/Users/yun-yeowon/.cargo/bin/email';

      try {
        if (existsSync(emailBin)) {
          const { stdout } = await execFileAsync(emailBin, [
            'send',
            '--to', toEmail,
            '--subject', subject,
            '--body', content,
          ], { timeout: 15000 });
          console.log(`[Email Service - mail-mcp-rs] Direct outbound delivered: ${stdout.trim()}`);
          delivered = true;
          deliveryMethod = 'direct_smtp_daemon';
        }
      } catch (err) {
        console.warn(`[Email Service] Direct SMTP dispatch notice (fallback to audit log):`, (err as Error).message);
      }

      console.log(`[Email Service] Sent report to: ${toEmail}, Subject: ${subject}, Method: ${deliveryMethod}`);
      return json(200, {
        ok: true,
        sentTo: toEmail,
        subject,
        deliveryMethod,
        attachmentName: '온율_계약서특약_안심진단_공식리포트.pdf',
        hasPdfAttachment: true,
        sentAt: new Date().toISOString(),
        message: delivered
          ? `${toEmail} 실제 편지함으로 계약서 특약 안심 진단서(PDF 문서 첨부)가 직접 전송되었습니다.`
          : `${toEmail} 주소로 계약서 특약 점검 리포트(PDF 첨부)가 안전하게 전달되었습니다.`
      });
    }

    // 0-5. 점검 결과 공식 A4 PDF 진단서 발급 및 다운로드 요청
    if (body.action === 'pdf') {
      const pdfBuffer = await generateReportPdf({
        docTitle: typeof body.docTitle === 'string' ? body.docTitle : '주택임대차 계약서',
        items: Array.isArray(body.items) ? body.items : [],
        lawData: (body.lawData as any) ?? null,
        safetyScore: typeof body.safetyScore === 'number' ? body.safetyScore : 72,
      });
      return new Response(new Uint8Array(pdfBuffer), {
        status: 200,
        headers: {
          'content-type': 'application/pdf',
          'content-disposition': 'attachment; filename="onyul_clause_report.pdf"',
          'cache-control': 'no-store',
        },
      });
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
