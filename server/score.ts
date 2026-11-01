/** 채점. 단위는 '항목'이다(케이스 수 × 그 팩의 점검 항목 수). 빠진 항목은 틀린 것으로 센다. */
import type { CheckResult } from '../shared/types.ts';
import type { Case } from './cases.ts';

export type Score = {
  cases: number;
  items: number;
  riskRecall: number;
  riskPrecision: number | null;
  accuracy: number;
  missingItems: number;
  autoFailed: number;
  avgElapsedMs: number;
  missedRisks: { caseId: string; itemId: string }[];
  falseAlarms: { caseId: string; itemId: string }[];
};

export function score(results: CheckResult[], cases: Case[]): Score {
  let items = 0, correct = 0, goldRisk = 0, hitRisk = 0, predRisk = 0, missing = 0, autoFailed = 0, elapsed = 0;
  const missedRisks: Score['missedRisks'] = [];
  const falseAlarms: Score['falseAlarms'] = [];
  cases.forEach((c, i) => {
    const r = results[i];
    elapsed += r.elapsedMs;
    for (const [itemId, gold] of Object.entries(c.labels)) {
      items++;
      const got = r.items.find((x) => x.itemId === itemId);
      if (!got) missing++;
      if (got?.autoFailed) autoFailed++;
      const pred = got?.verdict;
      if (pred === gold) correct++;
      if (gold === '위험') {
        goldRisk++;
        if (pred === '위험') hitRisk++;
        else missedRisks.push({ caseId: c.id, itemId });
      }
      if (pred === '위험') {
        predRisk++;
        if (gold !== '위험') falseAlarms.push({ caseId: c.id, itemId });
      }
    }
  });
  return {
    cases: cases.length,
    items,
    riskRecall: goldRisk ? hitRisk / goldRisk : 1,
    riskPrecision: predRisk ? hitRisk / predRisk : null,
    accuracy: items ? correct / items : 0,
    missingItems: missing,
    autoFailed,
    avgElapsedMs: cases.length ? Math.round(elapsed / cases.length) : 0,
    missedRisks,
    falseAlarms,
  };
}
