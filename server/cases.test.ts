import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadCases } from './cases.ts';
import { getPack } from './packs.ts';

const dev = loadCases('dev');
const tst = loadCases('test');
const risks = (c: { labels: Record<string, string> }) => Object.values(c.labels).filter((v) => v === '위험').length;

test('labels cover every item of the pack', () => {
  for (const c of [...dev, ...tst]) {
    const pack = getPack(c.pack);
    assert.ok(pack, `${c.id}: 팩 ${c.pack}`);
    assert.deepEqual(Object.keys(c.labels).sort(), pack.items.map((i) => i.id).sort(), c.id);
    for (const v of Object.values(c.labels)) assert.ok(['보호됨', '언급 없음', '위험'].includes(v), `${c.id}: ${v}`);
  }
});

test('split sizes', () => {
  assert.equal(dev.length, 10);
  assert.equal(tst.length, 20);
  assert.equal(dev.filter((c) => c.pack === 'lease').length, 6);
  assert.equal(tst.filter((c) => c.pack === 'lease').length, 12);
  assert.equal(new Set([...dev, ...tst].map((c) => c.id)).size, 30);
});

test('tricky cases present in the test split', () => {
  assert.ok(tst.filter((c) => risks(c) === 0).length >= 2, '위험 0개');
  assert.ok(tst.filter((c) => risks(c) >= 3).length >= 2, '위험 3개 이상');
  assert.ok(tst.filter((c) => /\d{6}-[1-4]\d{6}|01[016789]-\d{3,4}-\d{4}/.test(c.text)).length >= 3, '개인정보');
  assert.ok(tst.filter((c) => /(하지 않는다|하지 아니한다|않는다)/.test(c.text) && Object.values(c.labels).includes('보호됨')).length >= 2, '부정문 보호');
  assert.ok(tst.filter((c) => c.pack === 'gym' && c.labels.penalty_rate === '위험').length >= 2, '위약금 초과');
});
