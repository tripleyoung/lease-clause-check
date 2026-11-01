import { test } from 'node:test';
import assert from 'node:assert/strict';
import { score } from './score.ts';
import type { CheckResult, Verdict } from '../shared/types.ts';
import type { Case } from './cases.ts';

const kase = (labels: Record<string, Verdict>): Case => ({ id: 'c1', pack: 'lease', kind: '월세', text: '', labels });
const result = (verdicts: Record<string, Verdict>, missing: string[] = []): CheckResult => ({
  pack: 'lease',
  version: 'v1',
  elapsedMs: 100,
  referenceOnly: false,
  items: Object.entries(verdicts)
    .filter(([id]) => !missing.includes(id))
    .map(([itemId, verdict]) => ({ itemId, verdict, quote: '', knowledge: '', question: '', fixText: '', autoFailed: false })),
});

const gold = { a: '위험', b: '위험', c: '보호됨', d: '언급 없음' } as Record<string, Verdict>;

test('perfect score', () => {
  const s = score([result(gold)], [kase(gold)]);
  assert.equal(s.riskRecall, 1);
  assert.equal(s.riskPrecision, 1);
  assert.equal(s.accuracy, 1);
  assert.equal(s.missingItems, 0);
});

test('missed risk halves recall', () => {
  const s = score([result({ ...gold, b: '언급 없음' })], [kase(gold)]);
  assert.equal(s.riskRecall, 0.5);
  assert.equal(s.riskPrecision, 1);
});

test('false alarm lowers precision', () => {
  const s = score([result({ ...gold, c: '위험' })], [kase(gold)]);
  assert.equal(s.riskRecall, 1);
  assert.ok(s.riskPrecision !== null && s.riskPrecision < 1);
});

test('missing item counted and scored as wrong', () => {
  const s = score([result(gold, ['c'])], [kase(gold)]);
  assert.equal(s.missingItems, 1);
  assert.equal(s.accuracy, 0.75);
});

test('no risk predicted gives null precision', () => {
  const none = { a: '언급 없음', b: '언급 없음', c: '보호됨', d: '언급 없음' } as Record<string, Verdict>;
  assert.equal(score([result(none)], [kase(gold)]).riskPrecision, null);
});
