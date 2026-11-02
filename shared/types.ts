/** 화면과 서버가 함께 쓰는 모양. 판정은 세 값뿐이다. */
export type Verdict = '보호됨' | '언급 없음' | '위험';
export const VERDICTS: readonly Verdict[] = ['보호됨', '언급 없음', '위험'];

export type Version = 'v0' | 'v1' | 'v2';

export type CheckItem = {
  id: string;
  title: string;
  /** 무엇을 보는지 한 문장 (AI에게도 그대로 준다) */
  whatToCheck: string;
  /** 왜 위험한지 (법적·구조적 원인) */
  riskReason: string;
  /** 이 특약에 서명했을 때 나에게 생기는 구체적인 결과와 피해 */
  riskConsequence: string;
  /** 이런 표현이 있으면 위험 쪽 (규칙 검사용 정규식 원문) */
  riskHints: string[];
  /** 이런 표현이 있으면 보호됨 쪽 */
  protectHints: string[];
  /** 'knowledge/<pack>/<문서>.md#<절 제목>' */
  knowledge: string;
  /** 상대에게 물어볼 질문 */
  question: string;
  /** 위험·언급 없음일 때 넣어 달라고 할 대안 문구 */
  fixText: string;
};

export type Pack = { id: string; name: string; kinds: string[]; items: CheckItem[] };

export type ItemResult = {
  itemId: string;
  title?: string;
  verdict: Verdict;
  /** 원문에서 그대로 옮긴 문장 (언급 없음이면 빈 문자열) */
  quote: string;
  knowledge: string;
  question: string;
  fixText: string;
  /** 왜 위험한지 */
  riskReason?: string;
  /** 서명 시 발생할 구체적인 피해 결과 */
  riskConsequence?: string;
  /** AI 결과가 빠졌거나 원문에 없는 인용이라 자동 판정에 실패한 항목 */
  autoFailed: boolean;
};

export type CheckResult = {
  pack: string;
  version: Version;
  items: ItemResult[];
  elapsedMs: number;
  /** 점검팩이 없는 종류라 참고용 */
  referenceOnly: boolean;
  /** 팩 없이 돌린 참고용 결과의 자유 설명 */
  note?: string;
};
