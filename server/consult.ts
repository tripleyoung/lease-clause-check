/**
 * 다온사주(apps/saju-ai) 아키텍처 기반 법령·판례 고정형 법률 상담 모듈.
 * 1. 질문 내 개인정보(주민번호, 전화번호, 계좌, 동·호수)를 로컬 정규식으로 먼저 마스킹
 * 2. OKE 클러스터의 단일 Rust 멀티플렉서 파드(`https://webrtc.ugot.uk/law/mcp`)에서 현행 법령 및 대법원 판례를 실시간 조회해 고정
 * 3. 법령·판례 근거 기반의 한 줄 결론 + 상세 설명 + 현장 전달용 문자 초안 + 꼬리질문 3개(followups) 생성
 */

import { generateText, Output } from 'ai';
import { z } from 'zod';
import { CheckError } from './errors.js';
import { lookupLawByItemId, type LawLookupResponse } from './law-api.js';
import { resolveModel } from './llm.js';
import { PACKS } from './packs.js';
import { maskPii } from './pii.js';

export interface ConsultRequest {
  itemId?: string;
  pack?: string;
  question: string;
  quote?: string;
}

export interface ConsultResponse {
  itemId: string;
  itemTitle: string;
  maskedQuestion: string;
  headline: string;
  analysis: string;
  messageDraft: string;
  followups: string[];
  law: LawLookupResponse;
}

const ConsultSchema = z.object({
  headline: z.string(),
  analysis: z.string(),
  messageDraft: z.string(),
  followups: z.array(z.string()).min(3).max(3),
});

const KEYWORD_TO_ITEM: Array<{ itemId: string; keywords: RegExp }> = [
  { itemId: 'no_new_mortgage', keywords: /근저당|담보|대출|선순위|경매/ },
  { itemId: 'move_in_and_fixed_date', keywords: /전입|확정일자|대항력|우선변제/ },
  { itemId: 'landlord_info', keywords: /체납|납세|세금|국세|선순위\s*보증금/ },
  { itemId: 'deposit_return', keywords: /보증금.{0,10}반환|다음\s*세입자|새\s*임차인|만기|만료/ },
  { itemId: 'term_two_years', keywords: /1년\s*계약|2년\s*미만|단기\s*임대/ },
  { itemId: 'renewal_right', keywords: /갱신|재계약|연장|2\+2/ },
  { itemId: 'rent_increase', keywords: /5%|인상|증액|월세\s*올/ },
  { itemId: 'early_exit', keywords: /중도\s*해지|묵시적\s*갱신|복비|중개보수/ },
  { itemId: 'repair_duty', keywords: /수선|수리|보일러|누수|배관|곰팡이|고장/ },
  { itemId: 'restoration', keywords: /원상복구|원상회복|도배|장판|청소비|못\s*자국|마모/ },
  { itemId: 'owner_change', keywords: /집주인.{0,8}바뀌|매매|매도|양수인|승계/ },
  { itemId: 'refund_allowed', keywords: /환불\s*불가|양도만|PT\s*환불|헬스장\s*해지/ },
  { itemId: 'penalty_rate', keywords: /위약금|10%|20%|30%|수수료/ },
  { itemId: 'price_basis', keywords: /정상가|할인가|1회\s*단가|일할\s*계산/ },
  { itemId: 'before_start', keywords: /시작\s*전|개시\s*전|이용\s*전/ },
  { itemId: 'business_fault', keywords: /폐업|휴업|이전|트레이너\s*퇴사/ },
  { itemId: 'ad_mismatch', keywords: /광고|상담.{0,10}다르|약속/ },
  { itemId: 'gift_return', keywords: /사은품|증정품|운동복|락커/ },
];

export function inferItemId(question: string, pack?: string, explicitItemId?: string): string {
  const allItems = PACKS.flatMap((p) => p.items);
  if (explicitItemId && allItems.some((i) => i.id === explicitItemId)) {
    return explicitItemId;
  }
  for (const entry of KEYWORD_TO_ITEM) {
    if (entry.keywords.test(question)) {
      return entry.itemId;
    }
  }
  return pack === 'gym' ? 'refund_allowed' : 'deposit_return';
}

function buildFallbackConsult(
  itemId: string,
  maskedQuestion: string,
  law: LawLookupResponse,
): ConsultResponse {
  const allItems = PACKS.flatMap((p) => p.items);
  const item = allItems.find((i) => i.id === itemId) ?? allItems[0];

  const headline = `${law.statute.lawName} ${law.statute.article} 기준에 따라 임차인·소비자 보호 규정을 우선 확인해야 합니다.`;
  const analysis = [
    item.riskReason,
    item.riskConsequence,
    law.statute.articleText ? `근거 조문(${law.statute.lawName} ${law.statute.article})에 따라 불리한 특약은 수정 요구 또는 효력 다툼의 대상이 됩니다.` : '',
  ]
    .filter(Boolean)
    .join(' ');

  const messageDraft = `안녕하세요. 계약서 특약 조항 중 "${item.title}" 관련하여 ${law.statute.lawName} ${law.statute.article} 기준에 맞도록 아래와 같이 문구를 조정하고 싶습니다.\n\n[수정 요청 문구]\n"${item.fixText}"\n\n확인 부탁드립니다.`;

  const followups =
    itemId.startsWith('refund') || itemId === 'penalty_rate' || itemId === 'price_basis'
      ? [
          '사업자가 계속 환불을 거부하면 한국소비자원 피해구제는 어떻게 신청하나요?',
          '신용카드 할부로 결제했는데 할부항변권(결제 취소)을 쓸 수 있나요?',
          '계약서에 정상가 차감 동의 서명을 이미 했는데도 무효를 주장할 수 있나요?',
        ]
      : [
          '집주인이 관행이라며 특약 수정을 끝까지 거부하면 어떻게 대응해야 하나요?',
          '이미 도장을 찍은 계약서인데도 강행규정 위반으로 무효가 될 수 있나요?',
          '분쟁 발생 시 문자나 카톡 기록을 어떻게 남겨두면 법적 증거가 되나요?',
        ];

  return {
    itemId: item.id,
    itemTitle: item.title,
    maskedQuestion,
    headline,
    analysis,
    messageDraft,
    followups,
    law,
  };
}

export async function runConsult(req: ConsultRequest): Promise<ConsultResponse> {
  const rawQuestion = (req.question ?? '').trim();
  if (rawQuestion.length < 2) {
    throw new CheckError(400, '궁금한 법률·특약 질문을 입력해 주세요.');
  }
  if (rawQuestion.length > 1500) {
    throw new CheckError(400, '질문은 1,500자 이내로 입력해 주세요.');
  }

  const { masked: maskedQuestion } = maskPii(rawQuestion);
  const { masked: maskedQuote } = maskPii(req.quote ?? '');
  const resolvedItemId = inferItemId(maskedQuestion, req.pack, req.itemId);
  const allItems = PACKS.flatMap((p) => p.items);
  const item = allItems.find((i) => i.id === resolvedItemId) ?? allItems[0];

  // OKE Rust Law MCP (`https://webrtc.ugot.uk/law/mcp`) 실시간 법령·판례 조회
  const law = await lookupLawByItemId(resolvedItemId);
  const fallback = buildFallbackConsult(resolvedItemId, maskedQuestion, law);

  try {
    const { model } = await resolveModel();
    const precText = law.precedents
      .map((p) => `- ${p.courtName} ${p.decisionDate} 선고 ${p.caseNumber} (${p.caseName}): ${p.summary}`)
      .join('\n');

    const prompt = [
      '당신은 대한민국 주택임대차보호법·민법·소비자분쟁해결기준·약관규제법 전문 법률 상담 도우미입니다.',
      '반드시 아래 [고정된 현행 법령 및 대법원 판례]만을 근거로 답변하고, 없는 조문 번호나 판례 번호를 절대 지어내지 마세요.',
      '',
      `[점검 항목] ${item.title}`,
      `[핵심 법리] ${item.riskReason}`,
      `[예상 불이익] ${item.riskConsequence}`,
      `[권장 수정 특약] ${item.fixText}`,
      `[현행 법령 (${law.statute.lawName} · ${law.statute.article})]`,
      law.statute.articleText || item.knowledge,
      precText ? `[관련 대법원 판례]\n${precText}` : '',
      maskedQuote ? `[계약서 내 문제 문구]\n"${maskedQuote}"` : '',
      '',
      `[사용자 질문]\n${maskedQuestion}`,
      '',
      '다음 4가지를 한국어로 명확하고 정중하게 작성하세요:',
      '1. headline: 질문에 대한 핵심 법적 결론 한 문장 (50~90자)',
      '2. analysis: 위 법령 조문과 대법원 판례를 인용한 구체적 해설 및 실무 행동 지침 (3~4문장)',
      '3. messageDraft: 임대인·중개사·사업자에게 감정싸움 없이 법적 근거를 들어 바로 보낼 수 있는 정중한 문자/카톡 초안',
      '4. followups: 사용자가 이어서 클릭해 물어볼 만한 구체적 후속 질문 3개 (각 25~45자)',
    ]
      .filter(Boolean)
      .join('\n');

    const res = await generateText({
      model,
      output: Output.object({ schema: ConsultSchema }),
      prompt,
      abortSignal: AbortSignal.timeout(4_500),
    });

    if (res.output) {
      return {
        itemId: item.id,
        itemTitle: item.title,
        maskedQuestion,
        headline: res.output.headline,
        analysis: res.output.analysis,
        messageDraft: res.output.messageDraft,
        followups: res.output.followups,
        law,
      };
    }
  } catch {
    // AI 호출 지연/키 미설정 시에도 법령·판례 기반 결정론적 상담 결과 반환
  }

  return fallback;
}
