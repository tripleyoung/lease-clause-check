import { useState, useRef } from 'react';
import type { ItemResult } from '../../shared/types';
import { HighlightText } from './HighlightText';
import { EmailReportModal } from './EmailReportModal';

export interface DocAnnotationBox {
  left: number; // percentage (0 - 100)
  top: number;  // percentage (0 - 100)
  width: number; // percentage (0 - 100)
  height: number; // percentage (0 - 100)
}

export interface SampleDocSpec {
  id: 'lease_sample' | 'gym_sample' | 'tax_sample';
  topic: 'lease' | 'gym' | 'tax';
  mode: 'check' | 'tax';
  badge: string;
  title: string;
  subtitle: string;
  docHeader: string;
  scannedImageUrl?: string;
  aspectRatio: string; // e.g. '824 / 1089'
  metaLines: Array<{ label: string; value: string; maskedValue: string; isPii?: boolean }>;
  clauses: Array<{
    num: number;
    text: string;
    tone: 'risk' | 'safe' | 'caution';
    tag: string;
    shortPoint: string;
    highlightWords?: string[];
    annotationBox?: DocAnnotationBox;
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
    scannedImageUrl: '/samples/scanned_lease_contract.png',
    aspectRatio: '824 / 1089',
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
        highlightWords: ['담보물권을 설정하지 아니한다'],
        annotationBox: { left: 8.34, top: 55.83, width: 83.38, height: 2.1 },
      },
      {
        num: 2,
        text: '제4조(수선 및 원상복구): 통상의 사용에 따른 마모(도배·장판 변색 등 자연 마모)는 원상복구 대상에서 제외한다.',
        tone: 'safe',
        tag: '보호 · 통상 마모 면책 (대법원 2005다51389)',
        shortPoint: '대법원 판례 기준에 따라 일상적인 생활 마모 책임을 면책해 주는 표준 조항이에요.',
        highlightWords: ['통상의 사용에 따른 마모', '원상복구 대상에서 제외한다'],
        annotationBox: { left: 8.34, top: 58.28, width: 83.38, height: 4.0 },
      },
      {
        num: 3,
        text: '특약 1. 보증금은 다음 임차인이 입주한 후에 반환한다.',
        tone: 'risk',
        tag: '위험 · 보증금 반환 지연 (주임법 위반)',
        shortPoint: '새 세입자가 안 구해지면 보증금을 제때 못 돌려받는 대표적 불법 독소 조항이에요.',
        highlightWords: ['다음 임차인이 입주한 후에 반환'],
        annotationBox: { left: 8.36, top: 62.63, width: 83.38, height: 2.1 },
      },
      {
        num: 4,
        text: '특약 2. 퇴실 시 도배·장판 비용 40만원을 보증금에서 공제한다.',
        tone: 'risk',
        tag: '위험 · 원상복구 과다 전가 (약관규제법 위반)',
        shortPoint: '자연 노후화까지 세입자에게 물려 보증금을 부당 차감하는 불리한 특약이에요.',
        highlightWords: ['40만원을 보증금에서 공제'],
        annotationBox: { left: 8.37, top: 65.08, width: 83.38, height: 2.1 },
      },
      {
        num: 5,
        text: '특약 3. 차임은 매년 8% 인상한다.',
        tone: 'risk',
        tag: '위험 · 법정 5% 상한 초과 (주임법 제7조)',
        shortPoint: '주택임대차보호법상 법정 증액 상한(5%)을 초과하여 법적 효력이 없는 무효 조항이에요.',
        highlightWords: ['매년 8% 인상'],
        annotationBox: { left: 8.38, top: 67.53, width: 83.38, height: 2.1 },
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
    scannedImageUrl: '/samples/scanned_gym_contract.png',
    aspectRatio: '822 / 891',
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
        highlightWords: ['소비자분쟁해결기준에 따라', '위약금 10%를 공제한 후 환급'],
        annotationBox: { left: 8.2, top: 58.2, width: 83.6, height: 3.4 },
      },
      {
        num: 2,
        text: '특약 1. 중도 해지 시 정상가(월 15만원) 기준으로 이용 개월을 차감하고 위약금 20%를 공제합니다.',
        tone: 'risk',
        tag: '위험 · 정상가 꼼수 차감 및 위약금 10% 초과',
        shortPoint: '실제 결제한 할인가가 아닌 부풀린 정상가로 계산해 환불금을 0원으로 만드는 대표적 꼼수예요.',
        highlightWords: ['정상가(월 15만원) 기준', '위약금 20%를 공제'],
        annotationBox: { left: 8.2, top: 61.9, width: 83.6, height: 5.3 },
      },
      {
        num: 3,
        text: '특약 2. 센터 이전 시 회원권은 소멸되며 어떠한 경우에도 환불되지 않습니다.',
        tone: 'risk',
        tag: '위험 · 환불 일체 불가 및 사업자 귀책 면책',
        shortPoint: '센터 사정으로 운동을 못 하게 되었는데도 환불을 전면 거부하는 원천 무효 조항이에요.',
        highlightWords: ['어떠한 경우에도 환불되지 않습니다'],
        annotationBox: { left: 8.2, top: 67.6, width: 83.6, height: 3.2 },
      },
      {
        num: 4,
        text: '특약 3. 사은품(운동복)은 해지 시 정가 12만원을 차감합니다.',
        tone: 'risk',
        tag: '위험 · 사은품 과다 위약금 전가',
        shortPoint: '공짜 사은품 명목으로 정가의 몇 배를 청구해 환불금을 대폭 깎는 부당 조항이에요.',
        highlightWords: ['정가 12만원을 차감'],
        annotationBox: { left: 8.2, top: 71.1, width: 83.6, height: 3.2 },
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
    scannedImageUrl: '/samples/scanned_tax_receipt.png',
    aspectRatio: '822 / 751',
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
        highlightWords: ['월세 750,000원', '연간 총 9,000,000원'],
        annotationBox: { left: 8.25, top: 57.9, width: 83.54, height: 3.8 },
      },
      {
        num: 2,
        text: '2. 적용 공제율: 총급여 5,500만 원 초과 ~ 8,000만 원 이하 구간 → 15% 세액공제',
        tone: 'safe',
        tag: '환급 예상액 · 연 135만 원 (지방세 포함 148.5만 원)',
        shortPoint: '연 900만 원 × 15% = 지방소득세 포함 총 148.5만 원을 연말정산에서 돌려받아요.',
        highlightWords: ['15% 세액공제', '연 135만 원', '148.5만 원'],
        annotationBox: { left: 8.26, top: 62.0, width: 83.53, height: 2.6 },
      },
      {
        num: 3,
        text: '3. 필수 서류: 주민등록등본(임차주택 주소지로 전입신고 필수) + 임대차계약서 사본 + 계좌이체 영수증',
        tone: 'caution',
        tag: '주의 · 전입신고 필수 (집주인 동의 불필요)',
        shortPoint: '임대인의 동의나 서명 없이도 국세청 홈택스 또는 회사 연말정산 간소화에서 직접 신청할 수 있어요.',
        highlightWords: ['전입신고 필수', '집주인 동의 불필요'],
        annotationBox: { left: 8.27, top: 64.8, width: 83.54, height: 3.8 },
      },
    ],
    rawText:
      '[국세청 주택임차료(월세) 세액공제 신청 및 검증서]\n신청인: 박서연 (주민등록번호 921103-2345678, 신한은행 110-332-887766)\n무주택 단독 세대주 직장인이고 총급여 5,800만 원입니다. 오피스텔(전용 59.8㎡) 월세 75만 원을 매달 계좌이체 중인데 연말정산 세액공제율과 홈택스 신청 방법이 궁금해요.\n1. 거래내역: 월세 75만 원(연간 900만 원) 계좌이체 완료\n2. 공제율: 15% 적용 대상 (연간 135만 원 환급 예상)\n3. 필수 서류: 주민등록등본(전입신고), 임대차계약서, 계좌이체 영수증',
  },
];

/**
 * 고해상도 스캔 계약서 원본 전체화면 뷰어 (라이트박스 모달)
 */
export function DocumentFullscreenModal({
  doc,
  isOpen,
  onClose,
  onStartCheck,
  selectedClauseNum,
  onSelectClause,
}: {
  doc: SampleDocSpec;
  isOpen: boolean;
  onClose: () => void;
  onStartCheck?: (doc: SampleDocSpec) => void;
  selectedClauseNum: number;
  onSelectClause: (num: number) => void;
}) {
  const [zoom, setZoom] = useState(100);

  if (!isOpen || !doc.scannedImageUrl) return null;

  const activeClause = doc.clauses.find((c) => c.num === selectedClauseNum) ?? doc.clauses[0];

  const handleContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('.doc-annotation-box')) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickY = ((e.clientY - rect.top) / rect.height) * 100;
    let closestClause = doc.clauses[0];
    let minDiff = 9999;
    for (const c of doc.clauses) {
      if (c.annotationBox) {
        const midY = c.annotationBox.top + c.annotationBox.height / 2;
        const diff = Math.abs(midY - clickY);
        if (diff < minDiff) {
          minDiff = diff;
          closestClause = c;
        }
      }
    }
    if (closestClause) {
      onSelectClause(closestClause.num);
    }
  };

  return (
    <div
      className="doc-fullscreen-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label={`${doc.title} 스캔 원본 전체화면`}
      data-testid="doc-fullscreen-modal"
    >
      <div className="doc-fullscreen-header">
        <div className="doc-fullscreen-header__left">
          <span className="doc-fullscreen-badge">{doc.badge}</span>
          <h3 className="doc-fullscreen-title">{doc.title}</h3>
          <span className="doc-fullscreen-sub">(공식 원본 서식 1:1 대조 모드)</span>
        </div>

        {/* 줌 컨트롤 & 닫기 액션 */}
        <div className="doc-fullscreen-header__actions">
          <div className="doc-zoom-controls">
            <button
              type="button"
              className="copy-chip"
              onClick={() => setZoom((z) => Math.max(80, z - 15))}
              disabled={zoom <= 80}
              title="축소"
            >
              ➖ 축소
            </button>
            <span className="doc-zoom-val">{zoom}%</span>
            <button
              type="button"
              className="copy-chip"
              onClick={() => setZoom((z) => Math.min(180, z + 15))}
              disabled={zoom >= 180}
              title="확대"
            >
              ➕ 확대
            </button>
            <button
              type="button"
              className="copy-chip doc-zoom-reset-btn"
              onClick={() => setZoom(100)}
              title="100% 기본 맞춤"
            >
              ⛶ 100%
            </button>
          </div>

          <button
            type="button"
            className="turn__reset"
            onClick={onClose}
            aria-label="전체화면 닫기"
            data-testid="close-doc-fullscreen"
          >
            ✕ 닫기 (Esc)
          </button>
        </div>
      </div>

      {/* 스크롤 가능한 대화면 뷰포트 */}
      <div className="doc-fullscreen-body">
        <div
          className="paper-doc-scanned-container is-fullscreen"
          style={{
            aspectRatio: doc.aspectRatio,
            width: `${Math.round(860 * (zoom / 100))}px`,
            maxWidth: 'none',
            cursor: 'pointer',
          }}
          onClick={handleContainerClick}
        >
          <img
            src={doc.scannedImageUrl}
            alt={`${doc.title} 전체화면 고해상도 스캔본`}
            className="paper-doc-scanned-img"
          />

          {/* 문서 위 직접 조항 핀 오버레이 */}
          <div className="doc-annotation-layer" aria-label="문서 위 조항 위치 하이라이트">
            {doc.clauses.map((c) => {
              if (!c.annotationBox) return null;
              const isSelected = c.num === selectedClauseNum;
              return (
                <button
                  key={c.num}
                  type="button"
                  className={`doc-annotation-box doc-annotation-box--${c.tone} ${isSelected ? 'is-selected is-active-pulse' : ''}`}
                  style={{
                    left: `${c.annotationBox.left}%`,
                    top: `${c.annotationBox.top}%`,
                    width: `${c.annotationBox.width}%`,
                    height: `${c.annotationBox.height}%`,
                  }}
                  onClick={() => onSelectClause(c.num)}
                  title={`${c.num}번: ${c.tag}`}
                  data-testid={`fs-pin-${c.num}`}
                >
                  <span className={`doc-annotation-pin doc-annotation-pin--${c.tone}`}>
                    {c.num}
                  </span>
                  {isSelected && (
                    <span className="doc-annotation-tooltip">
                      <strong>#{c.num} {c.tag}</strong>
                      <small>{c.shortPoint}</small>
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 하단 플로팅 액션 바 */}
      <footer className="doc-fullscreen-footer">
        {activeClause && (
          <div className="doc-fullscreen-clause-summary">
            <span className={`paper-doc__pin paper-doc__pin--${activeClause.tone}`}>
              {activeClause.num}
            </span>
            <div className="doc-fullscreen-clause-text">
              <strong>{activeClause.tag}</strong>
              <p>
                <HighlightText
                  text={activeClause.text}
                  customKeywords={activeClause.highlightWords}
                  tone={activeClause.tone}
                />
              </p>
            </div>
          </div>
        )}
        {onStartCheck && (
          <button
            type="button"
            className="pill-btn pill-btn--primary"
            onClick={() => {
              onClose();
              onStartCheck(doc);
            }}
            data-testid="fs-start-check-btn"
          >
            🔍 이 스캔 문서로 정밀 점검 시작하기
          </button>
        )}
      </footer>
    </div>
  );
}

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
  const [viewMode, setViewMode] = useState<'scan' | 'structured'>('scan');
  const [showMasked, setShowMasked] = useState(true);
  const [showPinsOnScan, setShowPinsOnScan] = useState(true);
  const [selectedClauseNum, setSelectedClauseNum] = useState<number>(1); // 기본 1번(안심) 조항 선택 상태에서 시작하여 3번/4번(위험) 클릭 시 명확한 변화 확인
  const [isFullscreen, setIsFullscreen] = useState(false);

  const activeClause = doc.clauses.find((c) => c.num === selectedClauseNum) ?? doc.clauses[0];

  const handleContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('.doc-annotation-box')) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickY = ((e.clientY - rect.top) / rect.height) * 100;
    let closestClause = doc.clauses[0];
    let minDiff = 9999;
    for (const c of doc.clauses) {
      if (c.annotationBox) {
        const midY = c.annotationBox.top + c.annotationBox.height / 2;
        const diff = Math.abs(midY - clickY);
        if (diff < minDiff) {
          minDiff = diff;
          closestClause = c;
        }
      }
    }
    if (closestClause) {
      setSelectedClauseNum(closestClause.num);
      setShowPinsOnScan(true);
    }
  };

  return (
    <>
      <section className="doc-preview-shell" aria-label={`${doc.title} 미리보기`} data-testid="sample-preview-card">
        <div className="doc-preview-shell__top">
          <div>
            <span className="visual-card__eyebrow">📄 공식 계약서 스캔 원본 및 위험 조항 위치 확인</span>
            <h3 className="visual-card__title">{doc.title}</h3>
            <p className="doc-preview-shell__sub">{doc.subtitle}</p>
          </div>
          <div className="doc-preview-shell__toggles">
            {doc.scannedImageUrl && (
              <div style={{ display: 'inline-flex', gap: '4px' }}>
                <button
                  type="button"
                  className={viewMode === 'scan' ? 'copy-chip copy-chip--active' : 'copy-chip'}
                  onClick={() => setViewMode('scan')}
                  data-testid="toggle-view-scan"
                >
                  📄 스캔 원본 (A4 정비율)
                </button>
                <button
                  type="button"
                  className={viewMode === 'structured' ? 'copy-chip copy-chip--active' : 'copy-chip'}
                  onClick={() => setViewMode('structured')}
                  data-testid="toggle-view-structured"
                >
                  📋 조항 분석 텍스트
                </button>
              </div>
            )}
            {viewMode === 'scan' && (
              <>
                <button
                  type="button"
                  className={showPinsOnScan ? 'copy-chip copy-chip--active' : 'copy-chip'}
                  onClick={() => setShowPinsOnScan((v) => !v)}
                  data-testid="toggle-scan-pins"
                >
                  {showPinsOnScan ? '🎯 조항 위치 핀 표시 켜짐' : '🎯 조항 핀 숨기기'}
                </button>
                <button
                  type="button"
                  className="copy-chip"
                  onClick={() => setIsFullscreen(true)}
                  title="스캔 계약서 전체화면으로 크게 보기"
                  data-testid="open-doc-fullscreen-btn"
                >
                  ⛶ 스캔문서 전체화면
                </button>
              </>
            )}
            {viewMode === 'structured' && (
              <button
                type="button"
                className={showMasked ? 'copy-chip copy-chip--active' : 'copy-chip'}
                onClick={() => setShowMasked((v) => !v)}
              >
                {showMasked ? '🔒 개인정보 가림 적용됨' : '원본 개인정보 보기'}
              </button>
            )}
            <button type="button" className="turn__reset" onClick={onClose}>
              닫기
            </button>
          </div>
        </div>

      {viewMode === 'scan' && doc.scannedImageUrl ? (
        <div className="paper-doc-scanned-wrap" data-testid="scanned-scroll-wrap">
          {/* 스크롤 안내 힌트 바 */}
          <div className="scanned-scroll-notice">
            <span>📜 아래로 스크롤하여 계약서 하단 서명·날인과 [정밀 점검 시작] 버튼까지 전체를 확인하실 수 있어요</span>
          </div>

          {/* 원본 해상도와 100% 일치하는 종횡비 컨테이너 (Zero-Letterbox Pixel-Perfect 바인딩) */}
          <div
            className="paper-doc-scanned-container"
            style={{ aspectRatio: doc.aspectRatio, cursor: 'pointer' }}
            onClick={handleContainerClick}
            data-testid="scanned-a4-container"
          >
            <img
              src={doc.scannedImageUrl}
              alt={`${doc.title} 실제 스캔본 계약서`}
              className="paper-doc-scanned-img"
            />

            {/* 계약서 문서 '위'에 직접 오버레이되는 조항 하이라이트 박스 및 번호 핀 */}
            {showPinsOnScan && (
              <div className="doc-annotation-layer" aria-label="문서 위 조항 위치 하이라이트">
                {doc.clauses.map((c) => {
                  if (!c.annotationBox) return null;
                  const isSelected = c.num === selectedClauseNum;
                  return (
                    <button
                      key={c.num}
                      type="button"
                      className={`doc-annotation-box doc-annotation-box--${c.tone} ${isSelected ? 'is-selected' : ''}`}
                      style={{
                        left: `${c.annotationBox.left}%`,
                        top: `${c.annotationBox.top}%`,
                        width: `${c.annotationBox.width}%`,
                        height: `${c.annotationBox.height}%`,
                      }}
                      onClick={() => setSelectedClauseNum(c.num)}
                      title={`${c.num}번: ${c.tag}`}
                      data-testid={`scan-overlay-pin-${c.num}`}
                    >
                      <span className={`doc-annotation-pin doc-annotation-pin--${c.tone}`}>
                        {c.num}
                      </span>
                      {isSelected && (
                        <span className="doc-annotation-tooltip">
                          <strong>#{c.num} {c.tag}</strong>
                          <small>{c.shortPoint}</small>
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* 스캔본 바로 아래: 현재 문서 위에서 선택된 핀의 해설 요약 */}
          {showPinsOnScan && activeClause && (
            <div className="scan-pin-summary-bar">
              <span className={`paper-doc__pin paper-doc__pin--${activeClause.tone}`}>
                {activeClause.num}
              </span>
              <div className="scan-pin-summary-body">
                <strong>{activeClause.tag}</strong>
                <p>
                  <HighlightText
                    text={activeClause.text}
                    customKeywords={activeClause.highlightWords}
                    tone={activeClause.tone}
                  />
                </p>
                <span className="scan-pin-summary-point">💡 {activeClause.shortPoint}</span>
              </div>
            </div>
          )}
        </div>
      ) : (
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
                  <p className="paper-doc__clause-text">
                    <HighlightText
                      text={c.text}
                      customKeywords={c.highlightWords}
                      tone={c.tone}
                    />
                  </p>
                  <span className={`paper-doc__clause-badge paper-doc__clause-badge--${c.tone}`}>
                    {c.tag} · {c.shortPoint}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="doc-preview-shell__footer">
        <span className="doc-preview-shell__hint">
          <span className="hint-desktop">
            👆 {viewMode === 'scan' ? '스캔 계약서 위 핀(①~⑤)을 눌러 위치를 확인한 후' : '위 계약서·명세서에서 위험 조항 위치(①~⑤)를 확인하고'} 한결의 정밀 분석을 시작해 보세요.
          </span>
          <span className="hint-mobile">
            👆 {viewMode === 'scan' ? '스캔본 핀(①~⑤) 확인 후' : '위험 조항 위치(①~⑤) 확인 후'} 정밀 분석을 시작하세요.
          </span>
        </span>
        <button
          type="button"
          className="pill-btn pill-btn--primary"
          disabled={busy}
          onClick={() => onStartCheck(doc)}
          data-testid="start-sample-check-btn"
        >
          🔍 이 스캔 문서로 정밀 점검 시작하기
        </button>
      </div>
    </section>

    {/* 스캔 계약서 전체화면 라이트박스 뷰어 */}
    {doc.scannedImageUrl && (
      <DocumentFullscreenModal
        doc={doc}
        isOpen={isFullscreen}
        onClose={() => setIsFullscreen(false)}
        onStartCheck={onStartCheck}
        selectedClauseNum={selectedClauseNum}
        onSelectClause={setSelectedClauseNum}
      />
    )}
  </>
  );
}

export interface LawLookupStatute {
  lawName: string;
  article: string;
  articleText: string;
  officialUrl: string;
  ministry: string;
  proclamationNo?: string;
  effectiveDate?: string;
}

export interface LawLookupPrecedent {
  id?: string;
  caseNumber: string;
  courtName: string;
  decisionDate: string;
  caseName: string;
  summary: string;
  officialUrl: string;
}

export interface LawLookupData {
  itemId: string;
  statute: LawLookupStatute;
  precedents: LawLookupPrecedent[];
  engine?: string;
}

/**
 * 점검 결과 화면에서 실제 계약서/영수증 이미지(또는 문서 시트) 위의 조항을 번호 핀(①, ②, ③)으로 가리키며
 * 한결의 설명과 대안 특약·법령을 연동해 보여주는 인터랙티브 문서 포인터 컴포넌트
 */
export function AnnotatedDocumentDeckCard({
  doc,
  uploadedImageUrl,
  items,
  lawData,
  safetyScore = 72,
  totalClauses = 5,
  riskCount = 2,
  safeCount = 2,
  cautionCount = 1,
  onSelectClauseForSpeech,
  onCopyAlternative,
  copiedKey,
}: {
  doc?: SampleDocSpec;
  uploadedImageUrl?: string;
  items: ItemResult[];
  lawData?: LawLookupData | null;
  safetyScore?: number;
  totalClauses?: number;
  riskCount?: number;
  safeCount?: number;
  cautionCount?: number;
  onSelectClauseForSpeech?: (speech: string, mood: 'worry' | 'joy' | 'thinking') => void;
  onCopyAlternative: (key: string, text: string) => void;
  copiedKey: string | null;
}) {
  const highlightedItems = items.filter((i) => i.verdict === '위험' || i.verdict === '보호됨');
  const displayItems = highlightedItems.length > 0 ? highlightedItems : items.slice(0, 4);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [isFullscreenDoc, setIsFullscreenDoc] = useState(false);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);

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

  const detailRef = useRef<HTMLDivElement>(null);

  const handleSelectWithScroll = (idx: number) => {
    handleSelect(idx);
    if (typeof window !== 'undefined' && window.innerWidth <= 768) {
      detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  };

  const handleContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('.doc-annotation-box')) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickY = ((e.clientY - rect.top) / rect.height) * 100;
    let closestIdx = 0;
    let minDiff = 9999;
    displayItems.forEach((item, idx) => {
      const matchedClause = doc?.clauses[idx] ?? doc?.clauses.find((c) =>
        c.text.includes(item.quote?.slice(0, 8) || '') || c.num === idx + 1
      );
      const box = matchedClause?.annotationBox ?? {
        top: 55 + idx * 3.5,
        height: 2.1,
      };
      const midY = box.top + box.height / 2;
      const diff = Math.abs(midY - clickY);
      if (diff < minDiff) {
        minDiff = diff;
        closestIdx = idx;
      }
    });
    handleSelectWithScroll(closestIdx);
  };

  // 스캔본 이미지가 있고 doc의 clauses에 annotationBox가 있으면 핀 오버레이 제공
  const hasScannedDoc = Boolean(doc?.scannedImageUrl || uploadedImageUrl);
  const effectiveImageUrl = uploadedImageUrl || doc?.scannedImageUrl;

  return (
    <>
      <section className="visual-card annotated-doc-card wanted-doc-card" aria-label="통합 계약서 특약 점검 및 법령 인스펙터" data-testid="annotated-doc-card">
        {/* Wanted Design System: 정돈된 KPI 안심 지수 및 상태 바 */}
        <div className="wanted-status-bar inspection-status-strip" data-testid="inspection-status-strip">
          <div className="wanted-status-bar__metrics">
            <div className={`wanted-metric-card wanted-metric-card--${riskCount > 0 ? 'risk' : 'safe'}`}>
              <span className="wanted-metric-card__label">종합 안심 지수</span>
              <div className="wanted-metric-card__val-row">
                <span className="wanted-metric-card__value">{safetyScore}점</span>
                <span className={`wanted-badge wanted-badge--${riskCount > 0 ? 'risk' : 'safe'}`}>
                  {riskCount > 0 ? '수정 권장' : '안전 확인'}
                </span>
              </div>
            </div>

            <div className="wanted-metric-card">
              <span className="wanted-metric-card__label">위험 특약</span>
              <div className="wanted-metric-card__val-row">
                <span className="wanted-metric-card__value text-risk">{riskCount}건</span>
                <span className="wanted-badge wanted-badge--risk-subtle">독소 조항</span>
              </div>
            </div>

            <div className="wanted-metric-card">
              <span className="wanted-metric-card__label">보호 조항</span>
              <div className="wanted-metric-card__val-row">
                <span className="wanted-metric-card__value text-safe">{safeCount}건</span>
                <span className="wanted-badge wanted-badge--safe-subtle">권리 보장</span>
              </div>
            </div>

            <div className="wanted-metric-card">
              <span className="wanted-metric-card__label">법률 검토 기준</span>
              <div className="wanted-metric-card__val-row">
                <span className="wanted-metric-card__value text-neutral">국가법령</span>
                <span className="wanted-badge wanted-badge--mcp-subtle">실시간 대조</span>
              </div>
            </div>
          </div>

          <div className="wanted-status-bar__actions">
            <button
              type="button"
              className="wanted-btn wanted-btn--primary"
              onClick={() => setIsEmailModalOpen(true)}
              title="점검 리포트 및 대안 특약 이메일로 전달"
              data-testid="open-email-modal-btn"
            >
              이메일로 전달
            </button>
            {doc?.scannedImageUrl && (
              <button
                type="button"
                className="wanted-btn wanted-btn--secondary"
                onClick={() => setIsFullscreenDoc(true)}
                title="스캔 계약서 고해상도 전체화면으로 크게 보기"
                data-testid="annotated-doc-fullscreen-btn"
              >
                문서 전체화면
              </button>
            )}
          </div>
        </div>

      <div className="annotated-doc-grid wanted-grid">
        {/* 왼쪽: 실제 A4 정비율 스캔본 문서 위 직접 하이라이트 핀 오버레이 */}
        <div className="paper-doc-result-view wanted-left-col">
          {hasScannedDoc ? (
            <div
              className="paper-doc-scanned-container is-result-mode"
              style={{ aspectRatio: doc?.aspectRatio || '824 / 1089', cursor: 'pointer' }}
              onClick={handleContainerClick}
              data-testid="result-scanned-container"
            >
              <img
                src={effectiveImageUrl}
                alt="계약서·약관 실제 스캔 이미지"
                className="paper-doc-scanned-img"
              />

              {/* 스캔 문서 위 직접 표시되는 핀 레이어 */}
              <div className="doc-annotation-layer" aria-label="점검 결과 문서 위 위치 오버레이">
                {displayItems.map((item, idx) => {
                  const matchedClause = doc?.clauses[idx] ?? doc?.clauses.find((c) =>
                    c.text.includes(item.quote?.slice(0, 8) || '') ||
                    c.num === idx + 1
                  );
                  const box = matchedClause?.annotationBox ?? {
                    left: 8.3,
                    top: 55 + idx * 3.5,
                    width: 83.4,
                    height: 2.1,
                  };

                  const isSelected = idx === safeIdx;
                  const isRisk = item.verdict === '위험';
                  const tone = isRisk ? 'risk' : 'safe';

                  return (
                    <button
                      key={item.itemId}
                      type="button"
                      className={`doc-annotation-box doc-annotation-box--${tone} ${isSelected ? 'is-selected is-active-pulse' : ''}`}
                      style={{
                        left: `${box.left}%`,
                        top: `${box.top}%`,
                        width: `${box.width}%`,
                        height: `${box.height}%`,
                      }}
                      onClick={() => handleSelect(idx)}
                      title={`#${idx + 1}: ${item.title}`}
                      data-testid={`result-pin-${idx + 1}`}
                    >
                      <span className={`doc-annotation-pin doc-annotation-pin--${tone}`}>
                        {idx + 1}
                      </span>
                      {isSelected && (
                        <span className="doc-annotation-tooltip">
                          <strong>#{idx + 1} {item.title}</strong>
                          <small>{isRisk ? '수정 권장 독소 특약' : '권리 보호 조항'}</small>
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="paper-doc paper-doc--compact">
              <div className="paper-doc__header">
                <span className="paper-doc__title">{doc?.docHeader ?? '점검 대상 계약서 · 특약 원문'}</span>
              </div>
            </div>
          )}

          {/* 문서 하단에 조항 선택 리스트 (Wanted 디자인 시스템) */}
          <div className="wanted-clause-list" aria-label="검토 특약 목록">
            <div className="wanted-clause-list__head">
              <span className="wanted-clause-list__title">검토된 특약 항목</span>
              <span className="wanted-clause-list__count">총 {displayItems.length}건</span>
            </div>
            {displayItems.map((item, idx) => {
              const isSelected = idx === safeIdx;
              const isRisk = item.verdict === '위험';
              const tone = isRisk ? 'risk' : 'safe';
              return (
                <button
                  key={item.itemId}
                  type="button"
                  onClick={() => handleSelect(idx)}
                  className={`wanted-clause-item wanted-clause-item--${tone} ${isSelected ? 'is-selected' : ''}`}
                  data-testid={`doc-pin-${idx + 1}`}
                >
                  <span className={`wanted-clause-item__pin wanted-clause-item__pin--${tone}`}>{idx + 1}</span>
                  <div className="wanted-clause-item__body">
                    <div className="wanted-clause-item__meta">
                      <span className={`wanted-badge wanted-badge--${isRisk ? 'risk' : 'safe'}`}>
                        {isRisk ? '위험' : '보호'}
                      </span>
                      <strong className="wanted-clause-item__title">{item.title}</strong>
                    </div>
                    <p className="wanted-clause-item__quote">
                      <HighlightText
                        text={item.quote || item.title || ''}
                        tone={tone}
                      />
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 오른쪽: 가리키고 있는 핀(조항)의 상세 진단 & 대안 문구 (Wanted Inspector Card) */}
        {activeItem && (
          <div className="wanted-inspector-panel" ref={detailRef}>
            <div className="wanted-inspector-panel__header">
              <div className="wanted-inspector-panel__tag-row">
                <span className={`wanted-badge wanted-badge--${activeItem.verdict === '위험' ? 'risk' : 'safe'}`}>
                  {activeItem.verdict === '위험' ? '위험 특약' : '보호 조항'} #{safeIdx + 1}
                </span>
                <span className="wanted-inspector-panel__subtag">임대차 표준계약서 기준</span>
              </div>
              <h3 className="wanted-inspector-panel__title">{activeItem.title}</h3>
            </div>

            <p className="wanted-inspector-panel__desc">
              {activeItem.riskReason
                ? `${activeItem.riskReason} ${activeItem.riskConsequence ?? ''}`
                : '임차인의 권리를 법적으로 보호하는 안전한 표준 특약 조항입니다.'}
            </p>

            {/* 1. 계약서 원문 박스 */}
            <div className="wanted-card-box wanted-card-box--neutral">
              <span className="wanted-card-box__label">계약서 기재 원문</span>
              <p className="wanted-card-box__content">
                <HighlightText
                  text={activeItem.quote || activeItem.title || ''}
                  tone={activeItem.verdict === '위험' ? 'risk' : 'safe'}
                />
              </p>
            </div>

            {/* 2. 법률 검토 근거 (국가법령정보센터 실시간 법령 MCP) */}
            {lawData?.statute && (
              <div className="wanted-card-box wanted-card-box--law">
                <div className="wanted-card-box__header-row">
                  <span className="wanted-card-box__label text-blue">법률 검토 근거 (국가법령정보센터)</span>
                  <a href={lawData.statute.officialUrl} target="_blank" rel="noreferrer" className="wanted-ext-link">
                    {lawData.statute.lawName} {lawData.statute.article} ↗
                  </a>
                </div>
                <p className="wanted-card-box__content text-muted">{lawData.statute.articleText}</p>
                {Array.isArray(lawData.precedents) && lawData.precedents[0] && (
                  <div className="wanted-precedent-row">
                    <strong>대법원 판례 ({lawData.precedents[0].caseNumber}):</strong>
                    <span>{lawData.precedents[0].summary}</span>
                  </div>
                )}
              </div>
            )}

            {/* 3. 권장 대안 특약 문구 & 원클릭 복사 */}
            {activeItem.fixText && (
              <div className="wanted-card-box wanted-card-box--fix">
                <div className="wanted-card-box__header-row">
                  <span className="wanted-card-box__label text-safe">수정 권장 대안 특약</span>
                  <button
                    type="button"
                    className="wanted-copy-btn"
                    onClick={() =>
                      onCopyAlternative(`pin-${activeItem.itemId}-${safeIdx}`, activeItem.fixText)
                    }
                  >
                    {copiedKey === `pin-${activeItem.itemId}-${safeIdx}` ? '복사 완료 ✓' : '대안 문구 복사'}
                  </button>
                </div>
                <p className="wanted-card-box__content font-medium">
                  <HighlightText
                    text={activeItem.fixText}
                    tone="safe"
                  />
                </p>
              </div>
            )}

            {/* 4. 공인중개사용 현장 협상 가이드 */}
            {activeItem.fixText && (
              <div className="wanted-negotiation-box">
                <span className="wanted-negotiation-box__label">공인중개사·임대인 협상 멘트</span>
                <p className="wanted-negotiation-box__text">
                  &ldquo;공인중개사님, 특약 #{safeIdx + 1}항 문구는 주택임대차보호법 권고에 맞춰 &lsquo;{activeItem.fixText}&rsquo;(으)로 반영해 주시면 바로 날인하겠습니다.&rdquo;
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </section>

    {/* 점검 결과 이메일 전달 모달 */}
    <EmailReportModal
      isOpen={isEmailModalOpen}
      onClose={() => setIsEmailModalOpen(false)}
      docTitle={doc?.title || '주택임대차 계약서'}
      items={items}
    />

    {/* 결과 화면에서 스캔 원본 크게 보기 라이트박스 */}
    {doc?.scannedImageUrl && (
      <DocumentFullscreenModal
        doc={doc}
        isOpen={isFullscreenDoc}
        onClose={() => setIsFullscreenDoc(false)}
        selectedClauseNum={safeIdx + 1}
        onSelectClause={(num) => handleSelect(Math.max(0, num - 1))}
      />
    )}
  </>
  );
}

