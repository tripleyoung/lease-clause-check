import { useState } from 'react';
import type { ItemResult } from '../../shared/types';

export interface SampleDocSpec {
  id: 'lease_sample' | 'gym_sample' | 'tax_sample';
  topic: 'lease' | 'gym' | 'tax';
  mode: 'check' | 'tax';
  badge: string;
  title: string;
  subtitle: string;
  docHeader: string;
  metaLines: Array<{ label: string; value: string; maskedValue: string; isPii?: boolean }>;
  clauses: Array<{
    num: number;
    text: string;
    tone: 'risk' | 'safe' | 'caution';
    tag: string;
    shortPoint: string;
  }>;
  rawText: string;
}

export const SAMPLE_DOCS: SampleDocSpec[] = [
  {
    id: 'lease_sample',
    topic: 'lease',
    mode: 'check',
    badge: '법무부 주택임대차표준계약서',
    title: '법무부·국토교통부 표준 주택임대차계약서 (보증부월세)',
    subtitle: '법무부 고시 제2023-1호 공식 서식 · 대항력 확보 조항 및 보증금 반환 지연·원상복구 독소 특약 점검',
    docHeader: '법무부·국토교통부 서식 주택임대차표준계약서 (제2023-1호)',
    metaLines: [
      {
        label: '소재지',
        value: '서울특별시 관악구 신림로 123, 402호 (전용면적 45.2㎡)',
        maskedValue: '서울특별시 관악구 신림로 [상세주소] (전용면적 45.2㎡)',
      },
      {
        label: '임대인',
        value: '홍길동 (주민등록번호 800505-1234567, 010-2468-1357)',
        maskedValue: '홍○○ (주민번호 [주민번호], [전화번호])',
        isPii: true,
      },
      {
        label: '임차인',
        value: '김영희 (주민등록번호 950812-2345678, 010-9876-5432)',
        maskedValue: '김○○ (주민번호 [주민번호], [전화번호])',
        isPii: true,
      },
      {
        label: '보증금·차임',
        value: '보증금 5,000만 원 / 월 차임 65만 원 (계약기간 24개월)',
        maskedValue: '보증금 5,000만 원 / 월 차임 65만 원 (계약기간 24개월)',
      },
    ],
    clauses: [
      {
        num: 1,
        text: '제2조(담보권 설정 금지): 임대인은 잔금 지급일 다음 날까지 이 주택에 저당권 등 담보물권을 설정하지 아니한다.',
        tone: 'safe',
        tag: '보호 · 최우선 권리 확보 (법무부 권고)',
        shortPoint: '전입신고 대항력이 생길 때까지 내 보증금 순위를 지켜주는 필수 보호 조항이에요.',
      },
      {
        num: 2,
        text: '제4조(수선 및 원상복구): 통상의 사용에 따른 마모(도배·장판 변색 등 자연 마모)는 원상복구 대상에서 제외한다.',
        tone: 'safe',
        tag: '보호 · 통상 마모 면책 (대법원 2005다51389)',
        shortPoint: '대법원 판례 기준에 따라 일상적인 생활 마모 책임을 면책해 주는 표준 조항이에요.',
      },
      {
        num: 3,
        text: '특약 1. 보증금은 다음 임차인이 입주한 후에 반환한다.',
        tone: 'risk',
        tag: '위험 · 보증금 반환 지연 (주임법 위반)',
        shortPoint: '새 세입자가 안 구해지면 보증금을 제때 못 돌려받는 대표적 불법 독소 조항이에요.',
      },
      {
        num: 4,
        text: '특약 2. 퇴실 시 도배·장판 비용 40만원을 보증금에서 공제한다.',
        tone: 'risk',
        tag: '위험 · 원상복구 과다 전가 (약관규제법 위반)',
        shortPoint: '자연 노후화까지 세입자에게 물려 보증금을 부당 차감하는 불리한 특약이에요.',
      },
      {
        num: 5,
        text: '특약 3. 차임은 매년 8% 인상한다.',
        tone: 'risk',
        tag: '위험 · 법정 5% 상한 초과 (주임법 제7조)',
        shortPoint: '주택임대차보호법상 법정 증액 상한(5%)을 초과하여 법적 효력이 없는 무효 조항이에요.',
      },
    ],
    rawText:
      '[법무부·국토교통부 서식 주택임대차표준계약서 제2023-1호]\n소재지: 서울특별시 관악구 신림로 123, 402호\n보증금: 50,000,000원 / 월 차임: 650,000원 (계약기간 24개월)\n임대인: 홍길동 (주민등록번호 800505-1234567, 010-2468-1357)\n임차인: 김영희 (주민등록번호 950812-2345678)\n\n제2조(담보권 설정 금지): 임대인은 잔금 지급일 다음 날까지 담보물권을 설정하지 아니한다.\n제4조(수선 및 원상복구): 통상의 사용에 따른 마모는 원상복구 대상에서 제외한다.\n\n특약사항\n1. 보증금은 다음 임차인이 입주한 후에 반환한다.\n2. 퇴실 시 도배·장판 비용 40만원을 보증금에서 공제한다.\n3. 차임은 매년 8% 인상한다.',
  },
  {
    id: 'gym_sample',
    topic: 'gym',
    mode: 'check',
    badge: '공정위 헬스장 표준약관',
    title: '공정거래위원회 체력단련장 이용계약서 (표준약관 제10037호)',
    subtitle: '공정거래위원회 표준약관 제10037호 준용 · 중도 해지 환불 거부 및 정상가 과다 공제 독소 약관 점검',
    docHeader: '체력단련장(피트니스·PT) 이용 표준계약서 (공정위 제10037호)',
    metaLines: [
      {
        label: '사업자',
        value: '아레나 피트니스 강남본점 (사업자등록번호 214-85-12345)',
        maskedValue: '아레나 피트니스 강남본점 (사업자등록번호 214-85-12345)',
      },
      {
        label: '회원명',
        value: '김민수 (주민등록번호 900315-1234567, 010-9876-5432)',
        maskedValue: '김○○ (주민번호 [주민번호], [전화번호])',
        isPii: true,
      },
      {
        label: '결제내역',
        value: '12개월 VIP 회원권 + 1:1 PT 20회 · 총 실결제금액 1,200,000원',
        maskedValue: '12개월 VIP 회원권 + 1:1 PT 20회 · 총 실결제금액 1,200,000원',
      },
    ],
    clauses: [
      {
        num: 1,
        text: '제11조(중도 해지 환급): 회원의 사정으로 중도 해지 시 소비자분쟁해결기준에 따라 이용일수를 일할 차감하고 위약금 10%를 공제한 후 환급한다.',
        tone: 'safe',
        tag: '보호 · 법정 환불 기준 (공정위 표준약관)',
        shortPoint: '실제 결제 금액 기준으로 10% 위약금만 공제하고 남은 금액을 돌려받는 표준 권리예요.',
      },
      {
        num: 2,
        text: '특약 1. 중도 해지 시 정상가(월 15만원) 기준으로 이용 개월을 차감하고 위약금 20%를 공제합니다.',
        tone: 'risk',
        tag: '위험 · 정상가 꼼수 차감 및 위약금 10% 초과',
        shortPoint: '실제 결제한 할인가가 아닌 부풀린 정상가로 계산해 환불금을 0원으로 만드는 대표적 꼼수예요.',
      },
      {
        num: 3,
        text: '특약 2. 센터 이전 시 회원권은 소멸되며 어떠한 경우에도 환불되지 않습니다.',
        tone: 'risk',
        tag: '위험 · 환불 일체 불가 및 사업자 귀책 면책',
        shortPoint: '센터 사정으로 운동을 못 하게 되었는데도 환불을 전면 거부하는 원천 무효 조항이에요.',
      },
      {
        num: 4,
        text: '특약 3. 사은품(운동복)은 해지 시 정가 12만원을 차감합니다.',
        tone: 'risk',
        tag: '위험 · 사은품 과다 위약금 전가',
        shortPoint: '공짜 사은품 명목으로 정가의 몇 배를 청구해 환불금을 대폭 깎는 부당 조항이에요.',
      },
    ],
    rawText:
      '[공정거래위원회 체력단련장 이용 표준약관 제10037호 준용 계약서]\n회원명: 김민수 (주민등록번호 900315-1234567, 010-9876-5432)\n12개월 VIP 회원권 (실 결제금액 120만원)\n\n제11조(중도 해지): 회원의 사정으로 중도 해지 시 소비자분쟁해결기준에 따라 이용일수를 일할 차감하고 위약금 10%를 공제한 후 환급한다.\n\n특약사항\n1. 중도 해지 시 정상가(월 15만원) 기준으로 이용 개월을 차감하고 위약금 20%를 공제합니다.\n2. 센터 이전 시 회원권은 소멸되며 어떠한 경우에도 환불되지 않습니다.\n3. 사은품(운동복)은 해지 시 정가 12만원을 차감합니다.',
  },
  {
    id: 'tax_sample',
    topic: 'tax',
    mode: 'tax',
    badge: '국세청 월세 세액공제',
    title: '국세청 주택임차료(월세) 세액공제 신청 및 검증서',
    subtitle: '국세청 홈택스 연말정산 서식 기준 · 총급여 5,800만 원 직장인의 월세 세액공제 요건 및 환급액 정밀 진단',
    docHeader: '국세청 연말정산 주택임차료(월세) 세액공제 명세서',
    metaLines: [
      {
        label: '신청인',
        value: '박서연 (주민번호 921103-2345678 · 무주택 단독 세대주)',
        maskedValue: '박○○ (주민번호 [주민번호] · 무주택 단독 세대주)',
        isPii: true,
      },
      {
        label: '소득구간',
        value: '총급여 5,800만 원 (15% 세액공제 적용 구간)',
        maskedValue: '총급여 5,800만 원 (15% 세액공제 적용 구간)',
      },
      {
        label: '임차주택',
        value: '주거용 오피스텔 (전용 59.8㎡, 기준시가 2억 8천만 원)',
        maskedValue: '주거용 오피스텔 (전용 59.8㎡, 기준시가 2억 8천만 원)',
      },
      {
        label: '지급계좌',
        value: '신한은행 110-332-887766 (임대인 계좌 매월 25일 750,000원 이체)',
        maskedValue: '신한 [계좌번호] (임대인 계좌 매월 25일 750,000원 이체)',
        isPii: true,
      },
    ],
    clauses: [
      {
        num: 1,
        text: '1. 거래내역: 주거용 오피스텔 월세 750,000원 (연간 총 9,000,000원 금융기관 계좌이체)',
        tone: 'safe',
        tag: '공제 요건 충족 · 연 1,000만 원 한도',
        shortPoint: '총급여 8,000만 원 이하 무주택 세대주 요건을 충족해 조세특례제한법상 월세 세액공제 대상이에요.',
      },
      {
        num: 2,
        text: '2. 적용 공제율: 총급여 5,500만 원 초과 ~ 8,000만 원 이하 구간 → 15% 세액공제',
        tone: 'safe',
        tag: '환급 예상액 · 연 135만 원 (지방세 포함 148.5만 원)',
        shortPoint: '연 900만 원 × 15% = 지방소득세 포함 총 148.5만 원을 연말정산에서 돌려받아요.',
      },
      {
        num: 3,
        text: '3. 필수 서류: 주민등록등본(임차주택 주소지로 전입신고 필수) + 임대차계약서 사본 + 계좌이체 영수증',
        tone: 'caution',
        tag: '주의 · 전입신고 필수 (집주인 동의 불필요)',
        shortPoint: '임대인의 동의나 서명 없이도 국세청 홈택스 또는 회사 연말정산 간소화에서 직접 신청할 수 있어요.',
      },
    ],
    rawText:
      '[국세청 주택임차료(월세) 세액공제 신청 및 검증서]\n신청인: 박서연 (주민등록번호 921103-2345678, 신한은행 110-332-887766)\n무주택 단독 세대주 직장인이고 총급여 5,800만 원입니다. 오피스텔(전용 59.8㎡) 월세 75만 원을 매달 계좌이체 중인데 연말정산 세액공제율과 홈택스 신청 방법이 궁금해요.\n1. 거래내역: 월세 75만 원(연간 900만 원) 계좌이체 완료\n2. 공제율: 15% 적용 대상 (연간 135만 원 환급 예상)\n3. 필수 서류: 주민등록등본(전입신고), 임대차계약서, 계좌이체 영수증',
  },
];

/**
 * 첫 화면에서 샘플 문서를 클릭했을 때 실제 문서 모양과 마스킹 위치를 먼저 눈으로 확인하는 미리보기 시트
 */
export function SamplePreviewCard({
  doc,
  onStartCheck,
  onClose,
  busy,
}: {
  doc: SampleDocSpec;
  onStartCheck: (doc: SampleDocSpec) => void;
  onClose: () => void;
  busy: boolean;
}) {
  const [showMasked, setShowMasked] = useState(true);

  return (
    <section className="doc-preview-shell" aria-label={`${doc.title} 미리보기`} data-testid="sample-preview-card">
      <div className="doc-preview-shell__top">
        <div>
          <span className="visual-card__eyebrow">📄 샘플 문서 이미지 미리보기</span>
          <h3 className="visual-card__title">{doc.title}</h3>
          <p className="doc-preview-shell__sub">{doc.subtitle}</p>
        </div>
        <div className="doc-preview-shell__toggles">
          <button
            type="button"
            className={showMasked ? 'copy-chip copy-chip--active' : 'copy-chip'}
            onClick={() => setShowMasked((v) => !v)}
          >
            {showMasked ? '🔒 개인정보 가림 적용됨' : '원본 개인정보 보기'}
          </button>
          <button type="button" className="turn__reset" onClick={onClose}>
            닫기
          </button>
        </div>
      </div>

      {/* 실제 종이 계약서·영수증 시각화 시트 */}
      <div className="paper-doc">
        <div className="paper-doc__header">
          <span className="paper-doc__title">{doc.docHeader}</span>
          <span className="paper-doc__stamp" aria-hidden="true">
            印
          </span>
        </div>

        <div className="paper-doc__meta">
          {doc.metaLines.map((m) => (
            <div key={m.label} className="paper-doc__meta-row">
              <span className="paper-doc__meta-label">{m.label}</span>
              <span className={m.isPii && showMasked ? 'paper-doc__meta-val is-masked' : 'paper-doc__meta-val'}>
                {showMasked ? m.maskedValue : m.value}
              </span>
            </div>
          ))}
        </div>

        <div className="paper-doc__clauses">
          <div className="paper-doc__section-label">
            <span>점검 대상 조항 및 주요 항목 (클릭하면 한결이 해당 위치를 짚어 설명합니다)</span>
          </div>
          {doc.clauses.map((c) => (
            <div key={c.num} className={`paper-doc__clause paper-doc__clause--${c.tone}`}>
              <span className={`paper-doc__pin paper-doc__pin--${c.tone}`}>{c.num}</span>
              <div className="paper-doc__clause-body">
                <p className="paper-doc__clause-text">{c.text}</p>
                <span className={`paper-doc__clause-badge paper-doc__clause-badge--${c.tone}`}>
                  {c.tag} · {c.shortPoint}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="doc-preview-shell__footer">
        <span className="doc-preview-shell__hint">
          👆 위 계약서·명세서에서 위험 조항 위치(①~④)를 확인하고 한결의 정밀 분석을 시작해 보세요.
        </span>
        <button
          type="button"
          className="pill-btn pill-btn--primary"
          disabled={busy}
          onClick={() => onStartCheck(doc)}
          data-testid="start-sample-check-btn"
        >
          🔍 이 문서 가리키며 정밀 점검 시작하기
        </button>
      </div>
    </section>
  );
}

/**
 * 점검 결과 화면에서 실제 계약서/영수증 이미지(또는 문서 시트) 위의 조항을 번호 핀(①, ②, ③)으로 가리키며
 * 한결의 설명과 대안 특약·법령을 연동해 보여주는 인터랙티브 문서 포인터 컴포넌트
 */
export function AnnotatedDocumentDeckCard({
  doc,
  uploadedImageUrl,
  items,
  onSelectClauseForSpeech,
  onCopyAlternative,
  copiedKey,
}: {
  doc?: SampleDocSpec;
  uploadedImageUrl?: string;
  items: ItemResult[];
  onSelectClauseForSpeech?: (speech: string, mood: 'worry' | 'joy' | 'thinking') => void;
  onCopyAlternative: (key: string, text: string) => void;
  copiedKey: string | null;
}) {
  const highlightedItems = items.filter((i) => i.verdict === '위험' || i.verdict === '보호됨');
  const displayItems = highlightedItems.length > 0 ? highlightedItems : items.slice(0, 4);
  const [selectedIdx, setSelectedIdx] = useState(0);

  const safeIdx = Math.min(selectedIdx, Math.max(0, displayItems.length - 1));
  const activeItem = displayItems[safeIdx];

  const handleSelect = (idx: number) => {
    setSelectedIdx(idx);
    const item = displayItems[idx];
    if (!item || !onSelectClauseForSpeech) return;
    if (item.verdict === '위험') {
      onSelectClauseForSpeech(
        `지금 문서에서 가리키고 있는 **${idx + 1}번 조항("${item.title ?? item.itemId}")**을 보세요!\n\n계약서 원문에 적힌 **"${item.quote}"** 문구는 ${item.riskReason ?? '임차인·소비자에게 불리한 독소 조항이에요.'} ${item.riskConsequence ?? ''}\n\n오른쪽 아래의 **권장 대안 특약 문구**를 복사해 수정을 요청해 보세요.`,
        'worry',
      );
    } else {
      onSelectClauseForSpeech(
        `지금 가리키고 있는 **${idx + 1}번 조항("${item.title ?? item.itemId}")**은 내 권리를 안전하게 지켜주는 **보호 조항**이에요.\n\n원문의 **"${item.quote}"** 문구가 그대로 유지되도록 서명 전 다시 한 번 확인해 주세요.`,
        'joy',
      );
    }
  };

  return (
    <section className="visual-card annotated-doc-card" aria-label="문서 원문 위치 가리키기 및 조항별 해설" data-testid="annotated-doc-card">
      <header className="annotated-doc-card__head">
        <div>
          <span className="visual-card__eyebrow">👆 문서 위치 가리키며 보기 · 번호를 누르면 한결이 해당 조항을 설명해요</span>
          <h3 className="visual-card__title">
            계약서 원문 하이라이트 ({safeIdx + 1}/{displayItems.length}번 조항 가리키는 중)
          </h3>
        </div>
      </header>

      <div className="annotated-doc-grid">
        {/* 왼쪽: 실제 문서 시트 또는 첨부 이미지 + 번호 핀 하이라이트 */}
        <div className="paper-doc paper-doc--compact">
          <div className="paper-doc__header">
            <span className="paper-doc__title">{doc?.docHeader ?? '점검 대상 계약서 · 특약 원문'}</span>
            <span className="paper-doc__stamp" aria-hidden="true">
              印
            </span>
          </div>

          {uploadedImageUrl && (
            <div className="paper-doc__uploaded-wrap">
              <img src={uploadedImageUrl} alt="첨부한 계약서·영수증 이미지" className="paper-doc__uploaded-img" />
            </div>
          )}

          {doc && (
            <div className="paper-doc__meta">
              {doc.metaLines.slice(0, 2).map((m) => (
                <div key={m.label} className="paper-doc__meta-row">
                  <span className="paper-doc__meta-label">{m.label}</span>
                  <span className="paper-doc__meta-val is-masked">{m.maskedValue}</span>
                </div>
              ))}
            </div>
          )}

          <div className="paper-doc__clauses">
            {displayItems.map((item, idx) => {
              const isSelected = idx === safeIdx;
              const isRisk = item.verdict === '위험';
              const tone = isRisk ? 'risk' : 'safe';
              return (
                <button
                  key={item.itemId}
                  type="button"
                  onClick={() => handleSelect(idx)}
                  className={`paper-doc__clause paper-doc__clause--${tone} ${isSelected ? 'is-pointed' : ''}`}
                  data-testid={`doc-pin-${idx + 1}`}
                >
                  <span className={`paper-doc__pin paper-doc__pin--${tone}`}>{idx + 1}</span>
                  <div className="paper-doc__clause-body">
                    <p className="paper-doc__clause-text">{item.quote || item.title}</p>
                    <span className={`paper-doc__clause-badge paper-doc__clause-badge--${tone}`}>
                      {isRisk ? '🔴 수정 권장' : '🟢 보호 조항'} · {item.title}
                      {isSelected ? ' 👈 한결이 설명 중' : ''}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 오른쪽: 현재 가리키고 있는 핀(조항)의 상세 진단 & 대안 문구 복사 */}
        {activeItem && (
          <div className="pointed-detail">
            <div className="pointed-detail__badge-row">
              <span className={`pointed-detail__pin-pill pointed-detail__pin-pill--${activeItem.verdict === '위험' ? 'risk' : 'safe'}`}>
                문서 위치 #{safeIdx + 1} · {activeItem.verdict === '위험' ? '위험 특약' : '보호 조항'}
              </span>
              <strong>{activeItem.title}</strong>
            </div>

            <p className="pointed-detail__desc">
              {activeItem.riskReason
                ? `${activeItem.riskReason} ${activeItem.riskConsequence ?? ''}`
                : '임차인·소비자의 법정 권리를 보호하는 안전한 특약 문구입니다.'}
            </p>

            <div className="clause-box clause-box--risk">
              <span className="clause-box__label">문서에서 짚은 원문 (#{safeIdx + 1})</span>
              <p className="clause-box__text">{activeItem.quote || activeItem.title}</p>
            </div>

            {activeItem.fixText && (
              <div className="clause-box clause-box--safe">
                <span className="clause-box__label">
                  <span>권장 대안 특약 문구</span>
                  <button
                    type="button"
                    className="copy-chip"
                    onClick={() =>
                      onCopyAlternative(`pin-${activeItem.itemId}-${safeIdx}`, activeItem.fixText)
                    }
                  >
                    {copiedKey === `pin-${activeItem.itemId}-${safeIdx}` ? '복사됨 ✓' : '대안 문구 복사'}
                  </button>
                </span>
                <p className="clause-box__text">{activeItem.fixText}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
