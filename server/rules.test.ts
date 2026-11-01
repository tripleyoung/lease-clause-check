import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ruleScan } from './rules.ts';
import { getPack } from './packs.ts';
import { loadCases } from './cases.ts';
import { maskPii } from './pii.ts';

const lease = getPack('lease')!;
const gym = getPack('gym')!;

test('negation is protect', () => {
  const r = ruleScan('임대인은 잔금 지급일 다음 날까지 근저당을 설정하지 아니한다.', lease);
  assert.equal(r.no_new_mortgage.verdict, '보호됨');
});

test('risk hint detected with quote', () => {
  const r = ruleScan('특약\n1. 보증금은 다음 임차인이 들어오면 반환한다.', lease);
  assert.equal(r.deposit_return.verdict, '위험');
  assert.ok(r.deposit_return.quote.includes('다음 임차인'));
});

test('unknown returns null', () => {
  const r = ruleScan('반려동물은 키우지 않는다.', lease);
  assert.equal(r.deposit_return.verdict, null);
});

test('gym penalty over the limit is risk, at the limit is protect', () => {
  assert.equal(ruleScan('위약금은 결제금액의 20%입니다.', gym).penalty_rate.verdict, '위험');
  assert.equal(ruleScan('중도 해지 시 위약금 10%를 공제합니다.', gym).penalty_rate.verdict, '보호됨');
});

test('rent increase over 5% is risk, within 5% is protect', () => {
  assert.equal(ruleScan('차임은 매년 10% 인상한다.', lease).rent_increase.verdict, '위험');
  assert.equal(ruleScan('차임과 보증금의 증액은 5% 이내로 한다.', lease).rent_increase.verdict, '보호됨');
});

test('rules are the same after masking', () => {
  for (const c of loadCases('dev')) {
    const pack = getPack(c.pack)!;
    const a = ruleScan(c.text, pack);
    const b = ruleScan(maskPii(c.text).masked, pack);
    for (const id of Object.keys(a)) assert.equal(a[id].verdict, b[id].verdict, `${c.id}/${id}`);
  }
});
