/**
 * 개인정보 가림. AI에 보내기 전에 서버에서 가리고, 가린 글을 화면에 먼저 보여 준다.
 * 금액(120,000,000원, 1억 2천만원)은 가리지 않는다: 계좌번호는 은행 이름 바로 뒤 숫자-숫자 꼴만 본다.
 */
export type PiiKind = '주민번호' | '전화번호' | '계좌번호' | '동·호수';

const BANKS = '(국민|신한|우리|하나|농협|기업|카카오뱅크|카카오|토스뱅크|토스|케이뱅크|SC제일|씨티|수협|새마을|우체국|신협|부산|대구|경남|광주|전북|제주|산업)(은행)?';

const RULES: { kind: PiiKind; re: RegExp; replace: (m: string, ...g: string[]) => string }[] = [
  { kind: '주민번호', re: /\b\d{6}\s?-\s?[1-8]\d{6}\b/g, replace: () => '[주민번호]' },
  { kind: '전화번호', re: /\b01[016789][-\s]?\d{3,4}[-\s]?\d{4}\b/g, replace: () => '[전화번호]' },
  { kind: '계좌번호', re: new RegExp(`${BANKS}(\\s*계좌)?\\s*(\\d{2,6}(-\\d{2,8}){1,3})`, 'g'), replace: (_m, bank) => `${bank} [계좌번호]` },
  { kind: '동·호수', re: /\d{1,4}\s?동\s?\d{1,5}\s?호/g, replace: () => '[동·호수]' },
];

export function maskPii(text: string): { masked: string; found: { kind: PiiKind; sample: string }[] } {
  const found: { kind: PiiKind; sample: string }[] = [];
  let masked = text;
  for (const rule of RULES) {
    masked = masked.replace(rule.re, (...args: string[]) => {
      const m = args[0];
      found.push({ kind: rule.kind, sample: m.slice(0, 4) + '…' });
      return rule.replace(m, ...args.slice(1));
    });
  }
  return { masked, found };
}
