/**
 * 프롬프트 v0 → v1 → v2. 바꾼 이유와 dev 점수는 프롬프트.md 에 적는다.
 * 세 버전 모두 같은 출력 모양(항목별 판정)을 받는다 — 같은 자로 재기 위해서.
 */
import type { Pack } from '../shared/types.ts';
import type { RuleHit } from './rules.ts';
import { openKnowledge } from './knowledge.ts';

const VERDICT_RULE = '판정은 보호됨(나를 지키는 조항이 있음), 위험(나에게 불리한 조항이 있음), 언급 없음(관련 조항이 없음) 셋 중 하나다.';

/** v0: 그냥 물어보기. 항목 이름만 주고 한 줄로 지시한다(근거·인용 요구 없음). */
export function promptV0(pack: Pack, text: string): { system: string; prompt: string } {
  return {
    system: `다음 ${pack.name} 문구에서 나에게 불리한 조항을 찾아 줘. 아래 항목마다 판정해 줘. ${VERDICT_RULE}`,
    prompt: `항목: ${pack.items.map((i) => `${i.id}(${i.title})`).join(', ')}\n\n문구:\n${text}`,
  };
}

/** v1: 점검 항목의 설명을 주고, 판정마다 원문 문장을 그대로 인용하게 한다. */
export function promptV1(pack: Pack, text: string): { system: string; prompt: string } {
  return {
    system: [
      `너는 ${pack.name} 문구를 세입자·회원 편에서 점검하는 도우미다. 법률 판단을 단정하지 않는다.`,
      `모든 항목을 하나도 빼지 말고 판정한다. ${VERDICT_RULE}`,
      '보호됨·위험이면 quote 에 그 근거가 된 원문 문장을 글자 그대로 옮긴다. 원문에 없는 문장을 만들지 않는다. 언급 없음이면 quote 는 빈 문자열이다.',
      '부정문을 주의한다. "설정하지 않는다"처럼 나쁜 일을 하지 않겠다는 약속은 보호됨이다.',
      '[주민번호], [전화번호] 같은 표시는 가린 개인정보다. 판정에 쓰지 않는다.',
    ].join('\n'),
    prompt: `점검 항목:\n${pack.items.map((i) => `- ${i.id} | ${i.title}: ${i.whatToCheck}`).join('\n')}\n\n문구:\n${text}`,
  };
}

/** v2: v1 + 항목별 근거 원문(서버가 미리 묶음) + 규칙 검사 결과. */
export function promptV2(pack: Pack, text: string, rules: Record<string, RuleHit>): { system: string; prompt: string } {
  const v1 = promptV1(pack, text);
  const evidence = pack.items
    .map((i) => {
      const k = openKnowledge(i.knowledge);
      const r = rules[i.id];
      const ruleLine = r?.verdict ? `규칙 검사: ${r.verdict} ("${r.quote}")` : '규칙 검사: 판단 못 함';
      return `### ${i.id} | ${i.title}\n${i.whatToCheck}\n근거(${i.knowledge}):\n${k?.text ?? ''}\n${ruleLine}`;
    })
    .join('\n\n');
  return {
    system: [
      v1.system,
      '각 항목에 붙은 근거 원문을 기준으로 판정한다. 모델 상식보다 근거 원문이 우선이다.',
      '규칙 검사 결과는 참고다. 규칙이 틀렸다고 보면 원문 인용으로 바로잡는다. 숫자 기준(증액 5%, 위약금 10%)은 규칙 검사를 따른다.',
    ].join('\n'),
    prompt: `${evidence}\n\n문구:\n${text}`,
  };
}
