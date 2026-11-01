/** 입력 검사. AI를 부르기 전에 막을 것은 여기서 막는다(빈 글, 너무 긴 글, 계약·약관이 아닌 글). */
export const MIN_CHARS = 20;
export const MAX_CHARS = 4000;

const CONTRACT_WORDS = /(임대인|임차인|보증금|월세|차임|전세|특약|계약|약관|회원권|환불|환급|위약금|해지|이용료|PT|헬스)/;

export function validateInput(text: string): { ok: true } | { ok: false; message: string } {
  const t = text.trim();
  if (!t) return { ok: false, message: '점검할 계약서·약관 문구를 붙여 넣어 주세요.' };
  if (t.length < MIN_CHARS) return { ok: false, message: `문구가 너무 짧아요. 특약이나 약관 문장을 ${MIN_CHARS}자 이상 붙여 넣어 주세요.` };
  if (t.length > MAX_CHARS) return { ok: false, message: `한 번에 ${MAX_CHARS.toLocaleString('ko-KR')}자까지 볼 수 있어요. 특약·환불 규정 부분만 잘라서 넣어 주세요.` };
  if (!CONTRACT_WORDS.test(t)) return { ok: false, message: '계약서나 약관 문구가 아닌 것 같아요. 특약사항이나 환불 규정을 붙여 넣어 주세요.' };
  return { ok: true };
}
