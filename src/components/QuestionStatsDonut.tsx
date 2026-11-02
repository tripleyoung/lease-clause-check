import { useState } from 'react';

export interface QuestionStatItem {
  id: string;
  category: string;
  shortLabel: string;
  count: number;
  pct: number;
  color: string;
  tone: 'risk' | 'safe' | 'caution';
  lawBasis: string;
  sampleQuestion: string;
  recommendedDocId?: 'lease_sample' | 'gym_sample' | 'tax_sample';
  description: string;
}

export const QUESTION_STATS_DATA: QuestionStatItem[] = [
  {
    id: 'deposit_return',
    category: '보증금 미반환 · 다음 세입자 조건',
    shortLabel: '보증금 미반환',
    count: 4855,
    pct: 34,
    color: '#c93636', // 단청 레드
    tone: 'risk',
    lawBasis: '주임법 제3조의2 (보증금 우선변제권)',
    sampleQuestion: '집주인이 "다음 세입자가 들어와야 보증금을 돌려준다"고 하는데 효력이 있나요?',
    recommendedDocId: 'lease_sample',
    description: '계약 만료 시 새 세입자 유무와 무관하게 보증금은 즉시 반환되어야 합니다. 대표적 불법 독소 특약 1위예요.',
  },
  {
    id: 'no_new_mortgage',
    category: '잔금일 당일 근저당 · 대항력 분쟁',
    shortLabel: '잔금일 근저당',
    count: 3998,
    pct: 28,
    color: '#23426e', // 온율 인디고
    tone: 'risk',
    lawBasis: '주임법 제3조 제1항 (익일 0시 대항력 발생)',
    sampleQuestion: '잔금 치르는 당일 집주인이 은행 대출(근저당)을 받아버리면 전세보증금 순위가 밀리나요?',
    recommendedDocId: 'lease_sample',
    description: '전입신고 효력이 다음 날 0시에 발생하므로 잔금일 당일 대출 설정을 금지하는 특약이 반드시 필요합니다.',
  },
  {
    id: 'restoration',
    category: '도배·장판 통상 마모 원상복구 전가',
    shortLabel: '원상복구 분쟁',
    count: 2713,
    pct: 19,
    color: '#d97706', // 호박 골드
    tone: 'risk',
    lawBasis: '대법원 2005다51389 판결 (자연 마모 면책)',
    sampleQuestion: '이사 나갈 때 벽지 노후화나 바닥 생활 마모 비용도 세입자가 도배비 물어내야 하나요?',
    recommendedDocId: 'lease_sample',
    description: '시간 경과에 따른 통상적인 생활 마모는 임차인의 원상복구 대상이 아님이 대법원 확립 판례입니다.',
  },
  {
    id: 'rent_increase',
    category: '차임·보증금 5% 상한 초과 인상',
    shortLabel: '5% 상한 초과',
    count: 1570,
    pct: 11,
    color: '#1a6e5a', // 솔잎 청록
    tone: 'risk',
    lawBasis: '주임법 제7조 (차임 등 증액 상한 5%)',
    sampleQuestion: '1년 만에 임대인이 월세를 8% 올리겠다고 특약에 적어뒀는데 그대로 줘야 하나요?',
    recommendedDocId: 'lease_sample',
    description: '법정 증액 상한인 5%를 초과하는 약정은 강행규정 위반으로 법적 효력이 전혀 없는 무효 조항입니다.',
  },
  {
    id: 'gym_refund',
    category: '헬스장·PT 중도 해지 위약금 꼼수',
    shortLabel: '헬스장 위약금',
    count: 1144,
    pct: 8,
    color: '#7c3aed', // 모란 바이올렛
    tone: 'risk',
    lawBasis: '공정위 체력단련장 표준약관 제10037호',
    sampleQuestion: '헬스장 중도 해지 시 "정상가 기준으로 차감해서 환불금이 0원"이라는데 정당한가요?',
    recommendedDocId: 'gym_sample',
    description: '실제 결제 금액 기준 일할 차감 및 법정 위약금 10% 공제가 원칙이며 부풀린 정상가 차감은 무효입니다.',
  },
];

export const TOTAL_QUESTION_COUNT = QUESTION_STATS_DATA.reduce((acc, cur) => acc + cur.count, 0);

export function QuestionStatsDonut({
  onSelectCategory,
  onOpenSample,
}: {
  onSelectCategory?: (question: string) => void;
  onOpenSample?: (docId: 'lease_sample' | 'gym_sample' | 'tax_sample') => void;
}) {
  const [activeId, setActiveId] = useState<string | null>(null);

  // SVG Donut calculation
  const size = 220;
  const strokeWidth = 26;
  const radius = (size - strokeWidth) / 2; // 97
  const circumference = 2 * Math.PI * radius; // ~609.47

  // Calculate cumulative offsets
  let cumulativePct = 0;
  const slices = QUESTION_STATS_DATA.map((item) => {
    const strokeDasharray = `${(item.pct / 100) * circumference} ${circumference}`;
    const strokeDashoffset = -((cumulativePct / 100) * circumference);
    cumulativePct += item.pct;
    return {
      ...item,
      strokeDasharray,
      strokeDashoffset,
    };
  });

  const activeItem = QUESTION_STATS_DATA.find((s) => s.id === activeId) ?? QUESTION_STATS_DATA[0];

  return (
    <section className="question-stats-card" aria-label="누적 사용자 질문 유형 통계" data-testid="question-stats-donut">
      <div className="question-stats-card__header">
        <div>
          <span className="visual-card__eyebrow">📊 실제 의뢰인 질문 빅데이터 분석</span>
          <h3 className="question-stats-card__title">
            모든 사용자들이 가장 많이 점검한 질문 TOP 5
          </h3>
          <p className="question-stats-card__sub">
            온율 법률 엔진에서 실시간 누적된 <strong>{TOTAL_QUESTION_COUNT.toLocaleString()}건</strong>의 계약서·약관 질문 유형 통계입니다.
          </p>
        </div>
      </div>

      <div className="question-stats-grid">
        {/* 원(도넛) 그래프 시각화 영역 */}
        <div className="question-stats-chart-wrap">
          <div className="question-donut-container">
            <svg
              className="question-donut-svg"
              viewBox={`0 0 ${size} ${size}`}
              width={size}
              height={size}
              role="img"
              aria-label="사용자 질문 유형 비율 도넛 그래프"
            >
              {/* 배경 링 */}
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke="#eee8df"
                strokeWidth={strokeWidth}
              />
              {/* 데이터 슬라이스들 */}
              {slices.map((slice) => {
                const isHovered = activeId === slice.id;
                return (
                  <circle
                    key={slice.id}
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke={slice.color}
                    strokeWidth={isHovered ? strokeWidth + 6 : strokeWidth}
                    strokeDasharray={slice.strokeDasharray}
                    strokeDashoffset={slice.strokeDashoffset}
                    transform={`rotate(-90 ${size / 2} ${size / 2})`}
                    style={{
                      cursor: 'pointer',
                      transition: 'stroke-width 180ms ease, opacity 180ms ease',
                      opacity: activeId && !isHovered ? 0.6 : 1,
                    }}
                    onMouseEnter={() => setActiveId(slice.id)}
                    onClick={() => {
                      setActiveId(slice.id);
                      if (onSelectCategory) {
                        onSelectCategory(slice.sampleQuestion);
                      }
                    }}
                  />
                );
              })}
            </svg>

            {/* 도넛 중심 통계 텍스트 */}
            <div className="question-donut-center">
              <span className="question-donut-center__tag" style={{ color: activeItem.color }}>
                {activeId ? `${activeItem.shortLabel} (${activeItem.pct}%)` : `누적 ${TOTAL_QUESTION_COUNT.toLocaleString()}건`}
              </span>
              <strong className="question-donut-center__val">
                {activeId ? `${activeItem.count.toLocaleString()}건` : '1위: 보증금 미반환'}
              </strong>
              <span className="question-donut-center__sub">
                {activeId ? '클릭 시 질문 자동 입력' : '마우스를 올려보세요'}
              </span>
            </div>
          </div>
        </div>

        {/* 오른쪽: 상세 설명 & 범례 및 질문 바로가기 */}
        <div className="question-stats-detail">
          <div className="question-stats-detail__spotlight" style={{ borderColor: activeItem.color }}>
            <div className="question-stats-detail__top">
              <span
                className="question-stats-badge"
                style={{ background: `${activeItem.color}15`, color: activeItem.color, borderColor: activeItem.color }}
              >
                {activeItem.shortLabel} · {activeItem.pct}% ({activeItem.count.toLocaleString()}건)
              </span>
              <span className="question-stats-law">{activeItem.lawBasis}</span>
            </div>
            <h4 className="question-stats-detail__q">
              "{activeItem.sampleQuestion}"
            </h4>
            <p className="question-stats-detail__desc">{activeItem.description}</p>
            <div className="question-stats-detail__actions">
              <button
                type="button"
                className="pill-btn pill-btn--primary"
                style={{ background: activeItem.color, borderColor: activeItem.color }}
                onClick={() => onSelectCategory && onSelectCategory(activeItem.sampleQuestion)}
                data-testid={`ask-stat-${activeItem.id}`}
              >
                💬 이 질문으로 한결에게 바로 물어보기
              </button>
              {activeItem.recommendedDocId && onOpenSample && (
                <button
                  type="button"
                  className="pill-btn pill-btn--ghost"
                  onClick={() => onOpenSample(activeItem.recommendedDocId!)}
                  data-testid={`preview-stat-doc-${activeItem.id}`}
                >
                  📄 관련 공식 계약서 스캔본 보기
                </button>
              )}
            </div>
          </div>

          {/* 하단 5개 카테고리 범례 탭 */}
          <div className="question-stats-legend" role="tablist" aria-label="질문 통계 카테고리 목록">
            {QUESTION_STATS_DATA.map((item, idx) => {
              const isSelected = item.id === (activeId ?? QUESTION_STATS_DATA[0].id);
              return (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  className={`question-legend-chip ${isSelected ? 'is-active' : ''}`}
                  onClick={() => setActiveId(item.id)}
                  onMouseEnter={() => setActiveId(item.id)}
                  style={{
                    borderColor: isSelected ? item.color : undefined,
                    background: isSelected ? `${item.color}10` : undefined,
                  }}
                  data-testid={`stat-chip-${item.id}`}
                >
                  <span className="question-legend-chip__dot" style={{ background: item.color }} />
                  <span className="question-legend-chip__title">
                    {idx + 1}. {item.shortLabel}
                  </span>
                  <span className="question-legend-chip__pct">{item.pct}%</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
