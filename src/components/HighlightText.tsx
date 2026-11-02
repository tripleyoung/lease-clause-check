import React from 'react';

// 독소/보호/주의 기본 키워드 사전
export const DEFAULT_RISK_KEYWORDS = [
  '다음 임차인이 입주한 후에 반환',
  '다음 임차인이 입주한 후',
  '입주한 후에 반환',
  '40만원을 보증금에서 공제',
  '비용 40만원을 보증금에서',
  '보증금에서 일괄 공제',
  '보증금에서 공제',
  '매년 8% 인상',
  '매년 8%',
  '8% 인상',
  '정상가(월 15만원) 기준',
  '정상가(월 15만원)',
  '정상가 기준',
  '위약금 20%를 공제',
  '위약금 20%',
  '어떠한 경우에도 환불되지 않습니다',
  '어떠한 경우에도 환불',
  '환불되지 않습니다',
  '정가 12만원을 차감',
  '정가 12만원',
  '일체 반환하지 아니한다',
  '반환하지 않는다',
  '반환하지 아니한다',
  '임차인의 부담으로 한다',
  '임차인이 부담',
  '수리비 일체',
  '전액 임차인 부담',
  '이의를 제기할 수 없다',
  '권리를 포기한다',
  '즉시 명도한다',
];

export const DEFAULT_SAFE_KEYWORDS = [
  '저당권 등 담보물권을 설정하지 아니한다',
  '담보물권을 설정하지 아니한다',
  '통상의 사용에 따른 마모',
  '원상복구 대상에서 제외한다',
  '원상복구 대상에서 제외',
  '소비자분쟁해결기준에 따라',
  '위약금 10%를 공제한 후 환급',
  '위약금 10%',
  '15% 세액공제',
  '연간 135만 원 환급',
  '연 135만 원',
  '연간 135만 원',
  '총 148.5만 원',
  '148.5만 원',
  '새로운 임대차 계약의 성립 여부와 관계없이',
  '임대차 계약 만료일에 즉시 전액 반환',
  '통상의 마모는 임차인이 부담하지 않는다',
  '법정 상한인 5% 이내',
  '실제 결제 금액 기준',
];

export const DEFAULT_CAUTION_KEYWORDS = [
  '임차주택 주소지로 전입신고 필수',
  '전입신고 필수',
  '집주인 동의 불필요',
];

function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export interface HighlightTextProps {
  text: string;
  customKeywords?: string[];
  tone?: 'risk' | 'safe' | 'caution' | 'neutral';
  className?: string;
}

/**
 * 긴 계약서 원문이나 조항 중에서 사용자가 핵심 독소/보호 어구를
 * 0.1초 만에 식별할 수 있도록 형광펜(Highlighter) 효과를 부여하는 컴포넌트
 */
export const HighlightText: React.FC<HighlightTextProps> = ({
  text,
  customKeywords,
  tone,
  className,
}) => {
  if (!text) return null;

  // 1. 하이라이트할 타겟 키워드 목록 수집
  let targets: { word: string; tone: 'risk' | 'safe' | 'caution' }[] = [];

  if (customKeywords && customKeywords.length > 0) {
    const forcedTone = tone && tone !== 'neutral' ? tone : 'risk';
    targets = customKeywords
      .filter(Boolean)
      .map((kw) => ({ word: kw.trim(), tone: forcedTone }));
  } else {
    // 자동 사전 매칭
    if (!tone || tone === 'risk') {
      targets.push(...DEFAULT_RISK_KEYWORDS.map((w) => ({ word: w, tone: 'risk' as const })));
    }
    if (!tone || tone === 'safe') {
      targets.push(...DEFAULT_SAFE_KEYWORDS.map((w) => ({ word: w, tone: 'safe' as const })));
    }
    if (!tone || tone === 'caution') {
      targets.push(...DEFAULT_CAUTION_KEYWORDS.map((w) => ({ word: w, tone: 'caution' as const })));
    }
  }

  // 긴 단어 우선 매칭 (sub-string 충돌 방지)
  targets.sort((a, b) => b.word.length - a.word.length);

  // 텍스트에 실제로 존재하는 키워드만 필터
  const activeTargets = targets.filter((t) => t.word && text.includes(t.word));

  if (activeTargets.length === 0) {
    return <span className={className}>{text}</span>;
  }

  // 정규식 분할 패턴 생성
  const pattern = new RegExp(`(${activeTargets.map((t) => escapeRegExp(t.word)).join('|')})`, 'g');
  const parts = text.split(pattern);

  return (
    <span className={className}>
      {parts.map((part, index) => {
        const matched = activeTargets.find((t) => t.word === part);
        if (matched) {
          const matchTone = tone && tone !== 'neutral' ? tone : matched.tone;
          return (
            <mark
              key={index}
              className={`kw-highlight kw-highlight--${matchTone}`}
              data-testid="kw-highlight"
            >
              {part}
            </mark>
          );
        }
        return <React.Fragment key={index}>{part}</React.Fragment>;
      })}
    </span>
  );
};
