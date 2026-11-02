import { useState } from 'react';

export type QuestionTopicFilter = 'all' | 'lease' | 'gym' | 'tax';

export interface QuestionStatItem {
  id: string;
  category: string;
  shortLabel: string;
  topic: 'lease' | 'gym' | 'tax';
  count: number;
  pct: number;
  color: string;
  tone: 'risk' | 'safe' | 'caution';
  lawBasis: string;
  sampleQuestion: string;
  recommendedDocId: 'lease_sample' | 'gym_sample' | 'tax_sample';
  description: string;
}

export const QUESTION_DATA_BY_TOPIC: Record<
  QuestionTopicFilter,
  {
    title: string;
    totalCount: number;
    items: QuestionStatItem[];
  }
> = {
  all: {
    title: '온율 3대 상담 분야 전체 누적 통계',
    totalCount: 14280,
    items: [
      {
        id: 'all_deposit',
        category: '주택 · 보증금 미반환 (다음 세입자 조건)',
        shortLabel: '보증금 미반환',
        topic: 'lease',
        count: 3998,
        pct: 28,
        color: '#c93636', // 단청 레드
        tone: 'risk',
        lawBasis: '주임법 제3조의2 (보증금 우선변제권)',
        sampleQuestion: '집주인이 "다음 세입자가 들어와야 보증금을 돌려준다"고 하는데 효력이 있나요?',
        recommendedDocId: 'lease_sample',
        description: '계약 만료 시 새 세입자 유무와 무관하게 보증금은 즉시 반환되어야 합니다. 온율 최다 상담 1위예요.',
      },
      {
        id: 'all_gym_refund',
        category: '헬스 · 중도 해지 정상가 꼼수 차감',
        shortLabel: '헬스장 정상가 꼼수',
        topic: 'gym',
        count: 3284,
        pct: 23,
        color: '#7c3aed', // 모란 바이올렛
        tone: 'risk',
        lawBasis: '공정위 체력단련장 표준약관 제10037호',
        sampleQuestion: '헬스장 중도 해지 시 "정상가(월 15만원) 기준으로 차감해서 환불금이 0원"이라는데 정당한가요?',
        recommendedDocId: 'gym_sample',
        description: '실제 결제 금액 기준 일할 차감 및 법정 위약금 10% 공제가 원칙이며 부풀린 정상가 차감은 무효입니다.',
      },
      {
        id: 'all_tax_deduction',
        category: '세무 · 월세 세액공제율 및 홈택스 신청',
        shortLabel: '월세 세액공제율',
        topic: 'tax',
        count: 2570,
        pct: 18,
        color: '#1a6e5a', // 솔잎 청록
        tone: 'safe',
        lawBasis: '조세특례제한법 제95조의2 (월세액에 대한 세액공제)',
        sampleQuestion: '무주택 직장인 총급여 5,800만원인데 월세 75만원 내면 연말정산에서 얼마나 돌려받나요?',
        recommendedDocId: 'tax_sample',
        description: '총급여 8,000만원 이하 무주택 세대주는 연 1,000만원 한도로 최대 17% 세액공제를 적용받습니다.',
      },
      {
        id: 'all_mortgage',
        category: '주택 · 잔금일 당일 근저당 (대항력 상실)',
        shortLabel: '잔금일 근저당 분쟁',
        topic: 'lease',
        count: 2428,
        pct: 17,
        color: '#23426e', // 온율 인디고
        tone: 'risk',
        lawBasis: '주임법 제3조 제1항 (익일 0시 대항력 발생)',
        sampleQuestion: '잔금 치르는 당일 집주인이 은행 대출(근저당)을 받아버리면 전세보증금 순위가 밀리나요?',
        recommendedDocId: 'lease_sample',
        description: '전입신고 효력이 다음 날 0시에 발생하므로 잔금일 당일 대출 설정을 금지하는 특약이 필수입니다.',
      },
      {
        id: 'all_restoration',
        category: '주택 · 도배·장판 통상 마모 원상복구 전가',
        shortLabel: '도배·장판 원상복구',
        topic: 'lease',
        count: 2000,
        pct: 14,
        color: '#d97706', // 호박 골드
        tone: 'risk',
        lawBasis: '대법원 2005다51389 판결 (자연 마모 면책)',
        sampleQuestion: '이사 나갈 때 벽지 노후화나 바닥 생활 마모 비용도 세입자가 도배비 물어내야 하나요?',
        recommendedDocId: 'lease_sample',
        description: '시간 경과에 따른 통상적인 생활 마모는 임차인의 원상복구 대상이 아님이 대법원 확립 판례입니다.',
      },
    ],
  },
  lease: {
    title: '주택 전월세·임대차 계약서 특약 통계',
    totalCount: 6426,
    items: [
      {
        id: 'lease_deposit',
        category: '보증금 미반환 (다음 세입자 입주 조건)',
        shortLabel: '다음 세입자 특약',
        topic: 'lease',
        count: 2442,
        pct: 38,
        color: '#c93636',
        tone: 'risk',
        lawBasis: '주임법 제3조의2',
        sampleQuestion: '계약서에 "다음 임차인이 들어와야 보증금을 반환한다"고 적혀 있는데 효력이 있나요?',
        recommendedDocId: 'lease_sample',
        description: '임차인의 보증금 반환청구권을 부당하게 유예하는 편면적 강행규정 위반 무효 조항입니다.',
      },
      {
        id: 'lease_mortgage',
        category: '잔금일 당일 담보권 설정 금지 위반',
        shortLabel: '잔금일 근저당 설정',
        topic: 'lease',
        count: 1864,
        pct: 29,
        color: '#23426e',
        tone: 'risk',
        lawBasis: '주임법 제3조 제1항',
        sampleQuestion: '잔금 당일 임대인이 근저당권을 설정하지 못하도록 특약에 넣으려면 어떻게 쓰나요?',
        recommendedDocId: 'lease_sample',
        description: '법무부 표준계약서 제2조에 따라 잔금일 다음 날까지 담보물권 설정을 금지해야 안전합니다.',
      },
      {
        id: 'lease_wear',
        category: '퇴거 시 도배·장판비 및 청소비 공제',
        shortLabel: '도배비 부당 공제',
        topic: 'lease',
        count: 1350,
        pct: 21,
        color: '#d97706',
        tone: 'risk',
        lawBasis: '대법원 2005다51389 판결',
        sampleQuestion: '특약에 "퇴실 시 도배비 40만원을 보증금에서 공제한다"고 적혀 있는데 무효인가요?',
        recommendedDocId: 'lease_sample',
        description: '임차인의 귀책 없는 자연 마모까지 일괄 공제하는 것은 약관법 및 주임법 취지에 반합니다.',
      },
      {
        id: 'lease_cap',
        category: '차임·보증금 법정 5% 증액 상한 초과',
        shortLabel: '5% 상한 초과 인상',
        topic: 'lease',
        count: 770,
        pct: 12,
        color: '#1a6e5a',
        tone: 'risk',
        lawBasis: '주임법 제7조 (증액 청구 5% 한도)',
        sampleQuestion: '집주인이 1년마다 월세를 8%씩 올리겠다고 특약에 적었는데 효력이 있나요?',
        recommendedDocId: 'lease_sample',
        description: '법정 증액 상한 5%를 초과하는 증액 약정은 효력이 없으며 초과 지급분은 반환 청구 가능합니다.',
      },
    ],
  },
  gym: {
    title: '헬스장·PT·필라테스 이용약관 분쟁 통계',
    totalCount: 4374,
    items: [
      {
        id: 'gym_normal_price',
        category: '중도 해지 시 정상가 기준 과다 공제',
        shortLabel: '정상가 차감 꼼수',
        topic: 'gym',
        count: 1793,
        pct: 41,
        color: '#7c3aed',
        tone: 'risk',
        lawBasis: '공정위 표준약관 제10037호 제11조',
        sampleQuestion: '헬스장 중도 해지 시 할인가가 아닌 정상가(월 15만원)로 공제해 환불금이 0원이래요.',
        recommendedDocId: 'gym_sample',
        description: '소비자분쟁해결기준에 따라 실제 결제한 금액을 기준으로 일할 계산하여 환급해야 합니다.',
      },
      {
        id: 'gym_no_refund',
        category: '센터 이전·폐업·트레이너 퇴사 시 환불 불가',
        shortLabel: '환불 일체 불가 약관',
        topic: 'gym',
        count: 1181,
        pct: 27,
        color: '#c93636',
        tone: 'risk',
        lawBasis: '약관규제법 제9조 (소비자 해지권 배제 무효)',
        sampleQuestion: '센터 이전 공사로 1달간 운동을 못 하는데 환불이나 이용기간 연장이 불가능하다고 해요.',
        recommendedDocId: 'gym_sample',
        description: '사업자 귀책사유로 계약이 이행되지 않을 경우 전액 환불 및 위약금 청구가 가능합니다.',
      },
      {
        id: 'gym_freebie',
        category: '사은품(운동복·락커) 과다 위약금 청구',
        shortLabel: '사은품 과다 위약금',
        topic: 'gym',
        count: 831,
        pct: 19,
        color: '#d97706',
        tone: 'risk',
        lawBasis: '소비자기본법 제16조',
        sampleQuestion: '무료로 준다던 운동복을 해지할 때 12만원을 공제하겠다고 하는데 정당한가요?',
        recommendedDocId: 'gym_sample',
        description: '무료 사은품을 빌미로 부풀린 가액을 청구하여 환불을 방해하는 행위는 부당 약관입니다.',
      },
      {
        id: 'gym_excess_penalty',
        category: '법정 위약금 10% 초과 (20~30% 공제)',
        shortLabel: '법정 10% 위약금 초과',
        topic: 'gym',
        count: 569,
        pct: 13,
        color: '#23426e',
        tone: 'risk',
        lawBasis: '계속거래 표준약관 제10037호',
        sampleQuestion: '약관에 중도 해지 위약금이 총 금액의 20%로 적혀 있는데 10%만 내도 되나요?',
        recommendedDocId: 'gym_sample',
        description: '체력단련장 이용 계약의 중도 해지 법정 위약금 상한은 총 결제금액의 10% 이내입니다.',
      },
    ],
  },
  tax: {
    title: '월세 세액공제·홈택스 세무 증빙 통계',
    totalCount: 3480,
    items: [
      {
        id: 'tax_rate_limit',
        category: '월세 세액공제율 (15% vs 17%) 및 한도',
        shortLabel: '월세 세액공제율·한도',
        topic: 'tax',
        count: 1531,
        pct: 44,
        color: '#1a6e5a',
        tone: 'safe',
        lawBasis: '조특법 제95조의2 제1항',
        sampleQuestion: '총급여 5,800만원 직장인인데 월세 75만원 연말정산 세액공제율과 한도는 얼마인가요?',
        recommendedDocId: 'tax_sample',
        description: '연 1,000만원 한도로 총급여 5,500만원 이하는 17%, 8,000만원 이하는 15% 세액공제를 받습니다.',
      },
      {
        id: 'tax_no_consent',
        category: '임대인 동의 없는 홈택스 현금영수증 신청',
        shortLabel: '임대인 동의 불필요',
        topic: 'tax',
        count: 974,
        pct: 28,
        color: '#23426e',
        tone: 'safe',
        lawBasis: '소득세법 제162조의3 제4항',
        sampleQuestion: '집주인이 월세 세액공제 신청하지 말라고 하는데 동의 없이 신청해도 불이익 없나요?',
        recommendedDocId: 'tax_sample',
        description: '임대인의 동의나 서명은 일체 필요 없으며, 홈택스에서 계약서와 이체내역으로 직접 신청합니다.',
      },
      {
        id: 'tax_freelancer',
        category: '프리랜서·간이과세자 월세 필요경비 인정',
        shortLabel: '프리랜서 사업소득 경비',
        topic: 'tax',
        count: 626,
        pct: 18,
        color: '#d97706',
        tone: 'caution',
        lawBasis: '소득세법 제27조 (필요경비의 계산)',
        sampleQuestion: '프리랜서 3.3% 사업소득자인데 주거 겸용 오피스텔 월세도 종합소득세 경비처리가 되나요?',
        recommendedDocId: 'tax_sample',
        description: '사업용 공간으로 실제 사용하는 면적 비율만큼 종합소득세 필요경비로 안분 산입할 수 있습니다.',
      },
      {
        id: 'tax_retroactive',
        category: '전입신고 누락 및 지난 5년간 월세 소급 환급',
        shortLabel: '경정청구 5년 소급 환급',
        topic: 'tax',
        count: 349,
        pct: 10,
        color: '#7c3aed',
        tone: 'safe',
        lawBasis: '국세기본법 제45조의2 (경정청구)',
        sampleQuestion: '지난 3년 동안 깜빡하고 연말정산 때 월세 세액공제를 안 받았는데 지금 돌려받을 수 있나요?',
        recommendedDocId: 'tax_sample',
        description: '국세기본법에 따라 최근 5년 이내 납부한 세금에 대해 홈택스 경정청구로 전액 소급 환급받습니다.',
      },
    ],
  },
};

export function QuestionStatsDonut({
  currentTopic = 'all',
  onSelectCategory,
  onOpenSample,
}: {
  currentTopic?: QuestionTopicFilter;
  onSelectCategory?: (question: string) => void;
  onOpenSample?: (docId: 'lease_sample' | 'gym_sample' | 'tax_sample') => void;
}) {
  const [selectedTopic, setSelectedTopic] = useState<QuestionTopicFilter>(currentTopic);
  const [activeId, setActiveId] = useState<string | null>(null);

  const topicData = QUESTION_DATA_BY_TOPIC[selectedTopic] ?? QUESTION_DATA_BY_TOPIC.all;
  const items = topicData.items;

  // SVG Donut calculation
  const size = 220;
  const strokeWidth = 26;
  const radius = (size - strokeWidth) / 2; // 97
  const circumference = 2 * Math.PI * radius; // ~609.47

  // Calculate cumulative offsets
  let cumulativePct = 0;
  const slices = items.map((item) => {
    const strokeDasharray = `${(item.pct / 100) * circumference} ${circumference}`;
    const strokeDashoffset = -((cumulativePct / 100) * circumference);
    cumulativePct += item.pct;
    return {
      ...item,
      strokeDasharray,
      strokeDashoffset,
    };
  });

  const activeItem = items.find((s) => s.id === activeId) ?? items[0];

  return (
    <section className="question-stats-card" aria-label="누적 사용자 질문 유형 통계" data-testid="question-stats-donut">
      <div className="question-stats-card__header">
        <div>
          <span className="visual-card__eyebrow">📊 실제 의뢰인 14,280건 상담 빅데이터 분석</span>
          <h3 className="question-stats-card__title">
            사용자들이 가장 많이 점검한 질문 TOP 통계
          </h3>
          <p className="question-stats-card__sub">
            온율 법률·세무 엔진의 <strong>주택 전월세·헬스장 약관·월세 세무</strong> 3대 영역 실시간 통계입니다.
          </p>
        </div>

        {/* 3대 상담 분야 필터 탭 */}
        <div className="question-stats-filter-tabs" role="tablist" aria-label="상담 분야 선택">
          <button
            type="button"
            role="tab"
            aria-selected={selectedTopic === 'all'}
            className={`question-filter-tab ${selectedTopic === 'all' ? 'is-active' : ''}`}
            onClick={() => {
              setSelectedTopic('all');
              setActiveId(null);
            }}
            data-testid="filter-tab-all"
          >
            🌐 전체 종합
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={selectedTopic === 'lease'}
            className={`question-filter-tab ${selectedTopic === 'lease' ? 'is-active' : ''}`}
            onClick={() => {
              setSelectedTopic('lease');
              setActiveId(null);
            }}
            data-testid="filter-tab-lease"
          >
            🏠 주택 전월세
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={selectedTopic === 'gym'}
            className={`question-filter-tab ${selectedTopic === 'gym' ? 'is-active' : ''}`}
            onClick={() => {
              setSelectedTopic('gym');
              setActiveId(null);
            }}
            data-testid="filter-tab-gym"
          >
            🏋️ 헬스장·PT
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={selectedTopic === 'tax'}
            className={`question-filter-tab ${selectedTopic === 'tax' ? 'is-active' : ''}`}
            onClick={() => {
              setSelectedTopic('tax');
              setActiveId(null);
            }}
            data-testid="filter-tab-tax"
          >
            🧾 월세 세무
          </button>
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
                {activeId ? `${activeItem.shortLabel} (${activeItem.pct}%)` : `누적 ${topicData.totalCount.toLocaleString()}건`}
              </span>
              <strong className="question-donut-center__val">
                {activeId ? `${activeItem.count.toLocaleString()}건` : `1위: ${items[0].shortLabel}`}
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
                  onClick={() => onOpenSample(activeItem.recommendedDocId)}
                  data-testid={`preview-stat-doc-${activeItem.id}`}
                >
                  📄 관련 공식 스캔 문서 보기
                </button>
              )}
            </div>
          </div>

          {/* 하단 카테고리 범례 칩 목록 */}
          <div className="question-stats-legend" role="tablist" aria-label="질문 통계 항목 목록">
            {items.map((item, idx) => {
              const isSelected = item.id === (activeId ?? items[0].id);
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
