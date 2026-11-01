import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MockLanguageModelV4 } from 'ai/test';
import { check } from './check.ts';
import { getModel } from './llm.ts';
import { getPack } from './packs.ts';
import { CheckError } from './errors.ts';

const usage = { inputTokens: { total: 1, noCache: 1, cacheRead: 0, cacheWrite: 0 }, outputTokens: { total: 1, text: 1, reasoning: 0 } };
function mock(text: string, seen: string[] = []) {
  return new MockLanguageModelV4({
    doGenerate: async (options: { prompt: unknown }) => {
      seen.push(JSON.stringify(options.prompt));
      return { content: [{ type: 'text', text }], finishReason: { unified: 'stop', raw: undefined }, usage, warnings: [] };
    },
  } as never);
}

const lease = getPack('lease')!;
const text = '특약\n1. 보증금은 다음 임차인이 들어오면 반환한다.\n2. 임대인 900101-1234567';

test('v1 parses structured output', async () => {
  const items = lease.items.map((i) => ({ itemId: i.id, verdict: i.id === 'deposit_return' ? '위험' : '언급 없음', quote: i.id === 'deposit_return' ? '보증금은 다음 임차인이 들어오면 반환한다.' : '' }));
  const r = await check({ text, pack: 'lease', version: 'v1' }, { model: mock(JSON.stringify({ items })) });
  assert.equal(r.items.length, lease.items.length);
  assert.equal(r.items.find((i) => i.itemId === 'deposit_return')!.verdict, '위험');
  assert.equal(r.items.filter((i) => i.autoFailed).length, 0);
});

test('missing items are filled', async () => {
  const items = [{ itemId: 'deposit_return', verdict: '위험', quote: '보증금은 다음 임차인이 들어오면 반환한다.' }];
  const r = await check({ text, pack: 'lease', version: 'v1' }, { model: mock(JSON.stringify({ items })) });
  assert.equal(r.items.length, lease.items.length);
  assert.equal(r.items.filter((i) => i.autoFailed).length, lease.items.length - 1);
});

test('non-structured response does not throw', async () => {
  const r = await check({ text, pack: 'lease', version: 'v2' }, { model: mock('죄송하지만 판단하기 어렵습니다.') });
  assert.ok(r.items.every((i) => i.autoFailed && i.verdict === '언급 없음'));
});

test('quote not in text is downgraded (v2)', async () => {
  const items = lease.items.map((i) => ({ itemId: i.id, verdict: i.id === 'deposit_return' ? '위험' : '언급 없음', quote: i.id === 'deposit_return' ? '보증금은 절대 돌려주지 않는다.' : '' }));
  const r = await check({ text, pack: 'lease', version: 'v2' }, { model: mock(JSON.stringify({ items })) });
  const d = r.items.find((i) => i.itemId === 'deposit_return')!;
  assert.equal(d.verdict, '언급 없음');
  assert.equal(d.autoFailed, true);
});

test('knowledge citation comes from the pack', async () => {
  const items = lease.items.map((i) => ({ itemId: i.id, verdict: '언급 없음', quote: '' }));
  const r = await check({ text, pack: 'lease', version: 'v2' }, { model: mock(JSON.stringify({ items })) });
  for (const it of r.items) assert.equal(it.knowledge, lease.items.find((i) => i.id === it.itemId)!.knowledge);
});

test('missing key raises 503 with env name', () => {
  assert.throws(() => getModel({ LLM_PROVIDER: 'gemini' }), (e: unknown) => e instanceof CheckError && e.status === 503 && e.message.includes('GEMINI_API_KEY'));
  assert.throws(() => getModel({ LLM_PROVIDER: 'openai' }), (e: unknown) => e instanceof CheckError && e.message.includes('OPENAI_API_KEY'));
});

test('pii is never sent', async () => {
  const seen: string[] = [];
  const items = lease.items.map((i) => ({ itemId: i.id, verdict: '언급 없음', quote: '' }));
  for (const v of ['v0', 'v1', 'v2'] as const) await check({ text, pack: 'lease', version: v }, { model: mock(JSON.stringify({ items }), seen) });
  assert.ok(seen.length >= 3);
  for (const s of seen) {
    assert.ok(!s.includes('900101-1234567'), '주민번호가 AI로 나갔다');
    assert.ok(s.includes('[주민번호]'));
  }
});

test('unknown pack is reference only', async () => {
  const r = await check({ text: '자동차 리스 계약 약관: 중도 해지 시 잔여 리스료 전액을 위약금으로 청구한다.', pack: 'car' }, { model: mock('잔여 리스료 전액 청구는 불리할 수 있어요.') });
  assert.equal(r.referenceOnly, true);
  assert.equal(r.items.length, 0);
  assert.ok(r.note && r.note.length > 0);
});

test('empty input is rejected before any AI call', async () => {
  const seen: string[] = [];
  await assert.rejects(check({ text: '  ', pack: 'lease' }, { model: mock('{}', seen) }), (e: unknown) => e instanceof CheckError && e.status === 400);
  assert.equal(seen.length, 0);
});
