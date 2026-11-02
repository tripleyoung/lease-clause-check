/**
 * @daon/stage-ui — 다온 사주(apps/saju-ai)와 다온 계약·법률·세무(lease-clause-check)가
 * 공통으로 사용하는 캐릭터 화자(Narrator/Mascot) · 말풍선(SpeechBubble) · 시각화 카드 덱(VisualDeck/InsightCard/ScoreRing) 코어 라이브러리.
 */
export { FitBox } from '../../components/FitBox';
export { InsightCard, type InsightCardContent, type InsightCardProps } from '../../components/InsightCard';
export { Mascot, type Mood } from '../../components/Mascot';
export { Narrator, paginateSpeech } from '../../components/Narrator';
export { RichText } from '../../components/RichText';
export { ScoreRing, type ScoreRingProps } from '../../components/ScoreRing';
export { SpeechBubble, type SpeechBubbleProps } from '../../components/SpeechBubble';
export { parseInline, parseRich, type Block, type Inline } from '../../components/speechMarkdown';
export { useElementSize } from '../../components/useElementSize';
export { VisualDeck, type DeckItem } from '../../components/VisualDeck';
