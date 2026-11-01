/**
 * 규칙 검사(v2 재료). 문장 단위로 팩의 위험·보호 힌트를 찾고, 숫자 기준(증액 5%, 위약금 10%)은 직접 계산한다.
 * 판단하지 못하면 null — AI가 정한다. 규칙은 dev 세트만 보고 고친다.
 */
import type { Pack, Verdict } from '../shared/types.js';

export type RuleHit = { verdict: Verdict | null; quote: string };

function sentences(text: string): string[] {
  return text
    .split(/\n|(?<=[.다요])\s+(?=\d+\.|[가-힣])/)
    .map((s) => s.trim())
    .filter(Boolean);
}

const percentIn = (s: string): number[] => [...s.matchAll(/(\d{1,3})\s*%/g)].map((m) => Number(m[1]));

/** 숫자로 정하는 항목: 정해지면 판정, 아니면 undefined */
function numeric(itemId: string, s: string): Verdict | undefined {
  if (itemId === 'rent_increase' && /(인상|증액|올)/.test(s)) {
    const p = percentIn(s);
    if (p.length) return Math.max(...p) > 5 ? '위험' : '보호됨';
  }
  if (itemId === 'penalty_rate' && /(위약금|공제|수수료)/.test(s)) {
    const p = percentIn(s);
    if (p.length) return Math.max(...p) > 10 ? '위험' : '보호됨';
  }
  return undefined;
}

export function ruleScan(text: string, pack: Pack): Record<string, RuleHit> {
  const sents = sentences(text);
  const out: Record<string, RuleHit> = {};
  for (const item of pack.items) {
    let hit: RuleHit = { verdict: null, quote: '' };
    for (const s of sents) {
      const n = numeric(item.id, s);
      if (n) { hit = { verdict: n, quote: s }; if (n === '위험') break; continue; }
      if (item.riskHints.some((re) => new RegExp(re).test(s))) { hit = { verdict: '위험', quote: s }; break; }
      if (!hit.verdict && item.protectHints.some((re) => new RegExp(re).test(s))) hit = { verdict: '보호됨', quote: s };
    }
    out[item.id] = hit;
  }
  return out;
}
