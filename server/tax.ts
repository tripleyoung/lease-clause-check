/**
 * OKE 클러스터 단일 Rust Law MCP 파드(`https://webrtc.ugot.uk/law/mcp`) 기반
 * 영수증·거래명세서·임대차계약 세무 자동 판정 모듈 (신규 파드 추가 없음).
 *
 * - 근거 법령: 부가가치세법 제38조·제39조, 소득세법 제27조·제33조·제160조의2, 조세특례제한법 제95조의2
 * - 기능:
 *   1) 개인정보(주민번호, 사업자·계좌·전화번호) 로컬 정규식 비식별화
 *   2) OKE Rust Law MCP에서 실시간 세법 조문 및 대법원 세무 판례 조회
 *   3) 부가가치세 매입세액공제 / 종합소득세 필요경비 / 월세 세액공제 / 적격증빙(3만원 기준) 판정
 *   4) 홈택스(Hometax) 실무 처리 가이드 및 다온사주 스타일 후속 질문 3개(followups) 생성
 */

import { generateText, Output } from 'ai';
import { z } from 'zod';
import { CheckError } from './errors.js';
import { lookupLawByItemId, type LawLookupResponse } from './law-api.js';
import { resolveModel } from './llm.js';
import { maskPii } from './pii.js';

export interface TaxCheckRequest {
  text: string;
  filerType?: 'individual_biz' | 'wage_earner' | 'freelancer';
}

export interface TaxCheckResponse {
  taxLawItemId: string;
  maskedText: string;
  filerType: 'individual_biz' | 'wage_earner' | 'freelancer';
  headline: string;
  vatVerdict: '매입세액 공제 가능' | '매입세액 불공제' | '연말정산·종소세 세액공제 대상' | '면세·해당 없음';
  incomeTaxVerdict: '필요경비 산입 가능' | '한도 내 인정 (업무추진비)' | '필요경비 불산입 (가사경비)' | '월세 세액공제 (15~17%)';
  accountTitle: string;
  evidenceStatus: string;
  analysis: string;
  hometaxGuide: string;
  followups: string[];
  law: LawLookupResponse;
}

const TaxAiSchema = z.object({
  headline: z.string(),
  vatVerdict: z.enum(['매입세액 공제 가능', '매입세액 불공제', '연말정산·종소세 세액공제 대상', '면세·해당 없음']),
  incomeTaxVerdict: z.enum(['필요경비 산입 가능', '한도 내 인정 (업무추진비)', '필요경비 불산입 (가사경비)', '월세 세액공제 (15~17%)']),
  accountTitle: z.string(),
  evidenceStatus: z.string(),
  analysis: z.string(),
  hometaxGuide: z.string(),
  followups: z.array(z.string()).min(3).max(3),
});

export function classifyTaxItemId(text: string, filerType: string): string {
  if (/월세|임대차|보증금|관리비|전월세/.test(text)) {
    return filerType === 'wage_earner' ? 'tax_rent_credit' : 'tax_income_expense';
  }
  if (/가정용|생필품|가족\s*외식|백화점|명품|헬스장|PT|병원|약국|학원비/.test(text)) {
    return 'tax_personal_disallowed';
  }
  if (/거래처|접대|골프|화환|선물|비영업용\s*승용차|승용차\s*주유|간이영수증|계좌이체/.test(text)) {
    return 'tax_vat_non_deductible';
  }
  if (/세금계산서|노트북|모니터|사무용품|서버|클라우드|소프트웨어|화물|비품/.test(text)) {
    return 'tax_vat_deductible';
  }
  return 'tax_income_expense';
}

function buildDeterministicTaxResult(
  taxLawItemId: string,
  maskedText: string,
  filerType: 'individual_biz' | 'wage_earner' | 'freelancer',
  law: LawLookupResponse,
): TaxCheckResponse {
  const hasQualifiedEvidence = /세금계산서|신용카드|체크카드|법인카드|현금영수증/.test(maskedText);
  const isCashTransferOnly = /계좌이체|무통장|간이영수증/.test(maskedText) && !hasQualifiedEvidence;

  if (taxLawItemId === 'tax_rent_credit') {
    return {
      taxLawItemId,
      maskedText,
      filerType,
      headline: '조세특례제한법 제95조의2에 따라 무주택 세대주 근로자는 연 1,000만 원 한도로 월세액의 15~17% 세액공제가 가능합니다.',
      vatVerdict: '연말정산·종소세 세액공제 대상',
      incomeTaxVerdict: '월세 세액공제 (15~17%)',
      accountTitle: '주거비 세액공제 (조세특례제한법 제95조의2)',
      evidenceStatus: '임대차계약서 사본 + 주민등록등본(전입신고 필수) + 계좌이체 영수증(무통장입금증) 구비 시 집주인 동의 없이 공제 가능',
      analysis: `${law.statute.lawName} ${law.statute.article} 기준에 따라 총급여 8,000만 원(종합소득금액 7,000만 원) 이하 무주택 세대주가 국민주택규모(85㎡) 또는 기준시가 4억 원 이하 주택을 임차한 경우 월세 세액공제를 받을 수 있습니다. 계약서상 주소지와 주민등록 전입신고 주소지가 일치해야 합니다.`,
      hometaxGuide: '홈택스(Hometax) → [상담·불복·고충·제보·기타] → [주택임차료(월세) 현금영수증 발급 신청]에 임대차계약서를 첨부해 등록하면 연말정산 간소화 자료에 자동 반영됩니다.',
      followups: [
        '집주인이 월세 세액공제 신청을 하지 말라고 특약에 적었는데 신청해도 되나요?',
        '전입신고를 늦게 한 달의 월세도 소급해서 공제받을 수 있나요?',
        '관리비 명목으로 매달 내는 금액도 월세 세액공제 대상에 포함되나요?',
      ],
      law,
    };
  }

  if (taxLawItemId === 'tax_personal_disallowed') {
    return {
      taxLawItemId,
      maskedText,
      filerType,
      headline: '소득세법 제33조 제1항 제5호(가사관련비) 및 부가가치세법 제39조에 따라 사업과 무관한 개인·가사 지출은 매입세액 공제 및 필요경비 산입이 모두 불가합니다.',
      vatVerdict: '매입세액 불공제',
      incomeTaxVerdict: '필요경비 불산입 (가사경비)',
      accountTitle: '가사관련비 / 인출금 (비용 불산입)',
      evidenceStatus: '신용카드·현금영수증이 있더라도 사업 관련성이 없으므로 비용 처리 제외 대상',
      analysis: `${law.statute.lawName} ${law.statute.article}는 거주자가 가사와 관련하여 지출한 금액을 사업소득 필요경비에 산입하지 않도록 명시하고 있습니다. 사업용 카드로 결제했더라도 홈택스 사업용 신용카드 매입세액 공제 선택 시 반드시 '불공제(가사경비)'로 분류해야 과소신고가산세를 예방할 수 있습니다.`,
      hometaxGuide: '홈택스 → [전자(세금)계산서·현금영수증·신용카드] → [사업용신용카드] → [매입세액 공제 확인/변경]에서 해당 결제 건을 [공제제외]로 전환하세요.',
      followups: [
        '실수로 사업용 카드로 결제한 개인 병원비·마트 비용은 어떻게 처리하나요?',
        '1인 사업자가 직원 없이 혼자 마신 커피나 식대는 필요경비로 인정되나요?',
        '가사경비를 사업 경비로 넣었다가 적발되면 가산세가 얼마나 나오나요?',
      ],
      law,
    };
  }

  if (taxLawItemId === 'tax_vat_non_deductible') {
    return {
      taxLawItemId,
      maskedText,
      filerType,
      headline: '부가가치세법 제39조에 따라 기업업무추진비(구 접대비)·비영업용 소형승용차 관련 비용 또는 적격증빙 미수취분은 부가가치세 매입세액은 불공제되나, 소득세 필요경비는 한도 내 인정됩니다.',
      vatVerdict: '매입세액 불공제',
      incomeTaxVerdict: '한도 내 인정 (업무추진비)',
      accountTitle: '기업업무추진비(접대비) / 차량유지비',
      evidenceStatus: isCashTransferOnly
        ? '주의: 건당 3만 원 초과 지출 시 적격증빙(세금계산서·카드·현금영수증) 미수취에 해당하여 접대비 손금불산입 또는 증빙불비가산세(2%) 위험'
        : '적격증빙(법인·사업용 카드 또는 세금계산서) 수취 확인됨 · 부가세만 불공제 처리 후 종합소득세 비용 반영',
      analysis: `${law.statute.lawName} ${law.statute.article} 제1항에 따라 기업업무추진비(접대비) 및 이와 유사한 비용, 비영업용 소형승용자동차(개소세 과세대상)의 구입·임차·유지 비용은 부가가치세 매입세액에서 공제하지 않습니다. 다만 사업 관련성이 입증되고 적격증빙을 갖춘 경우 소득세법 제27조 및 제35조에 따라 종합소득세 필요경비로는 산입할 수 있습니다.`,
      hometaxGuide: '부가가치세 신고 시 [공제받지 못할 매입세액 명세서]에 반영하고, 공급대가(부가세 포함 총액) 전체를 종합소득세 장부상 비용(기업업무추진비 등)으로 계상하세요.',
      followups: [
        '거래처 경조사비(축의금·부의금)는 청첩장만 있으면 몇 만 원까지 비용 처리되나요?',
        '경차(모닝·레이·캐스퍼)나 9인승 카니발 주유비는 부가세 매입세액 공제가 되나요?',
        '건당 3만 원 초과 거래를 계좌이체만 하고 세금계산서를 못 받았을 때 대처법은?',
      ],
      law,
    };
  }

  if (taxLawItemId === 'tax_vat_deductible') {
    return {
      taxLawItemId,
      maskedText,
      filerType,
      headline: '부가가치세법 제38조 및 소득세법 제27조에 따라 사업용 비품·소모품·용역 지출로서 부가가치세 매입세액 공제(10%)와 종합소득세 필요경비 산입이 모두 가능합니다.',
      vatVerdict: '매입세액 공제 가능',
      incomeTaxVerdict: '필요경비 산입 가능',
      accountTitle: '비품 / 소모품비 / 지급수수료',
      evidenceStatus: hasQualifiedEvidence
        ? '적격증빙(세금계산서·사업용카드·현금영수증) 충족 · 가산세 없음'
        : '건당 3만 원 초과 시 반드시 전자세금계산서·신용카드전표·지출증빙용 현금영수증을 수취해야 매입세액 공제가 가능합니다',
      analysis: `${law.statute.lawName} ${law.statute.article}에 따라 자기의 사업을 위하여 사용하거나 사용할 목적으로 공급받은 재화·용역의 부가가치세액은 매출세액에서 전액 공제됩니다. 또한 공급가액은 소득세법 제27조에 따라 사업소득 필요경비로 산입됩니다.`,
      hometaxGuide: '홈택스에 등록된 사업용 신용카드 또는 전자세금계산서 수취분은 부가가치세 신고서 [그 밖의 공제매입세액 - 신용카드매출전표등 수령명세서]에 자동 집계됩니다.',
      followups: [
        '홈택스에 사업용 신용카드 등록을 하기 전에 결제한 카드 영수증도 공제되나요?',
        '노트북·컴퓨터 구입비가 몇 백만 원 이상이면 감가상각 자산으로 처리해야 하나요?',
        '해외 SaaS(구글·노션·챗GPT 등) 해외카드 결제분은 부가세와 종소세를 어떻게 처리하나요?',
      ],
      law,
    };
  }

  return {
    taxLawItemId,
    maskedText,
    filerType,
    headline: '소득세법 제27조에 따라 총수입금액에 대응하는 사업장 임차료·관리비 등 업무 관련 지출은 종합소득세 필요경비 산입이 가능합니다.',
    vatVerdict: hasQualifiedEvidence ? '매입세액 공제 가능' : '매입세액 불공제',
    incomeTaxVerdict: '필요경비 산입 가능',
    accountTitle: '지급임차료 / 관리비 / 일반관리비',
    evidenceStatus: isCashTransferOnly
      ? '상가·사무실 임차료를 계좌이체만 한 경우 전자세금계산서 미수취 시 부가세 공제 불가 (주택 임차료 등 면세 거래나 간이과세자 임대인인 경우 송금명세서 제출로 가산세 면제 가능)'
      : '적격증빙(세금계산서·카드·현금영수증) 수취 시 부가세 매입세액 공제 및 종소세 필요경비 모두 인정',
    analysis: `${law.statute.lawName} ${law.statute.article}에 따라 사업자가 해당 과세기간의 총수입금액에 대응하는 비용으로서 일반적으로 용인되는 통상적인 지출은 필요경비에 산입합니다. 건당 3만 원 초과 지출은 적격증빙 수취가 원칙이나, 금융기관을 통한 계좌이체 임대료(간이과세자 등)는 영수증수취명세서(송금명세서) 제출을 통해 적격증빙 갈음이 가능합니다.`,
    hometaxGuide: '세금계산서 미발급 임대인에게 월세를 이체한 경우 종합소득세 신고 시 [영수증수취명세서(경비 등 송금명세서)]에 임대인 인적사항과 계좌번호를 기재해 증빙불비가산세(2%)를 면제받으세요.',
    followups: [
      '집을 사업장 주소로 등록(홈오피스)한 경우 자택 월세와 공과금도 경비 처리가 되나요?',
      '임대인이 세금계산서 발급을 거부하고 부가세 10%를 따로 달라고 하면 어떻게 하나요?',
      '프리랜서(3.3% 원천징수 사업소득자)가 가장 많이 놓치는 필요경비 항목은 무엇인가요?',
    ],
    law,
  };
}

export async function runTaxCheck(req: TaxCheckRequest): Promise<TaxCheckResponse> {
  const rawText = (req.text ?? '').trim();
  if (rawText.length < 2) {
    throw new CheckError(400, '점검할 영수증·거래내역·임대료 문구를 입력해 주세요.');
  }
  if (rawText.length > 1500) {
    throw new CheckError(400, '문구는 1,500자 이내로 입력해 주세요.');
  }

  const filerType = req.filerType ?? 'individual_biz';
  const { masked: maskedText } = maskPii(rawText);
  const taxLawItemId = classifyTaxItemId(maskedText, filerType);

  // OKE Rust Law MCP (`https://webrtc.ugot.uk/law/mcp`) 실시간 세법 조문 및 대법원 세무 판례 조회
  const law = await lookupLawByItemId(taxLawItemId);
  const fallback = buildDeterministicTaxResult(taxLawItemId, maskedText, filerType, law);

  try {
    const { model } = await resolveModel();
    const precText = law.precedents
      .map((p) => `- ${p.courtName} ${p.decisionDate} 선고 ${p.caseNumber} (${p.caseName}): ${p.summary}`)
      .join('\n');

    const filerLabel =
      filerType === 'wage_earner'
        ? '근로소득자(연말정산)'
        : filerType === 'freelancer'
          ? '프리랜서(3.3% 원천징수 사업소득자)'
          : '개인사업자(일반과세자·종합소득세)';

    const prompt = [
      '당신은 대한민국 국세청 홈택스 실무 및 부가가치세법·소득세법·조세특례제한법 전문 세무 자동 판정 도우미입니다.',
      '반드시 아래 [고정된 현행 세법 조문 및 대법원 판례]만을 근거로 판정하고, 없는 조문 번호나 판례를 절대 지어내지 마세요.',
      '',
      `[납세자 유형] ${filerLabel}`,
      `[현행 세법 조문 (${law.statute.lawName} · ${law.statute.article})]`,
      law.statute.articleText,
      precText ? `[관련 대법원 세무 판례]\n${precText}` : '',
      '',
      `[점검 대상 영수증·거래내역·계약 문구]\n${maskedText}`,
      '',
      '다음 항목을 정확히 출력하세요:',
      '- headline: 세법 조문을 명시한 핵심 판정 한 문장',
      '- vatVerdict / incomeTaxVerdict / accountTitle / evidenceStatus(적격증빙 3만원 기준 및 가산세 여부)',
      '- analysis: 세법 조문 및 대법원 판례 기반 상세 해설 (3~4문장)',
      '- hometaxGuide: 국세청 홈택스(Hometax) 메뉴 경로 및 실무 신고 방법 (1~2문장)',
      '- followups: 사용자가 이어서 클릭해 물어볼 만한 구체적 세무 후속 질문 3개',
    ]
      .filter(Boolean)
      .join('\n');

    const res = await generateText({
      model,
      output: Output.object({ schema: TaxAiSchema }),
      prompt,
      abortSignal: AbortSignal.timeout(4_500),
    });

    if (res.output) {
      return {
        taxLawItemId,
        maskedText,
        filerType,
        headline: res.output.headline,
        vatVerdict: res.output.vatVerdict,
        incomeTaxVerdict: res.output.incomeTaxVerdict,
        accountTitle: res.output.accountTitle,
        evidenceStatus: res.output.evidenceStatus,
        analysis: res.output.analysis,
        hometaxGuide: res.output.hometaxGuide,
        followups: res.output.followups,
        law,
      };
    }
  } catch {
    // AI 호출 실패 시에도 OKE Rust Law MCP 세법·판례 기반 결정론적 세무 판정 반환
  }

  return fallback;
}
