import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateInput, MAX_CHARS } from './validate.ts';
import { maskPii } from './pii.ts';

test('empty is rejected', () => {
  const r = validateInput('   ');
  assert.equal(r.ok, false);
});

test('too long is rejected (message mentions 4000)', () => {
  const r = validateInput('보증금 특약 '.repeat(MAX_CHARS));
  assert.equal(r.ok, false);
  assert.ok(!r.ok && r.message.includes('4,000'));
});

test('non-contract text is rejected', () => {
  assert.equal(validateInput('오늘 날씨가 맑고 기온은 20도까지 오르겠습니다. 주말에는 비 소식이 있습니다.').ok, false);
  assert.equal(validateInput('The quick brown fox jumps over the lazy dog many times today.').ok, false);
});

test('contract text passes', () => {
  assert.equal(validateInput('특약사항 1. 보증금은 계약 종료일에 반환한다.').ok, true);
  assert.equal(validateInput('PT 20회 100만원. 중도 해지 시 위약금 10%를 공제합니다.').ok, true);
});

test('rrn masked', () => {
  const r = maskPii('임대인 김OO 900101-1234567');
  assert.ok(r.masked.includes('[주민번호]'));
  assert.ok(!r.masked.includes('1234567'));
  assert.equal(r.found[0].kind, '주민번호');
});

test('phone masked', () => {
  const r = maskPii('연락처 010-1234-5678, 01098765432');
  assert.ok(!/010-?\d{4}-?\d{4}/.test(r.masked));
  assert.equal(r.found.filter((f) => f.kind === '전화번호').length, 2);
});

test('account masked', () => {
  const r = maskPii('결제 신한 110-123-456789 / 입금 국민 123456-01-234567');
  assert.ok(!r.masked.includes('456789'));
  assert.equal(r.found.filter((f) => f.kind === '계좌번호').length, 2);
});

test('unit masked', () => {
  const r = maskPii('주소 101동 1203호');
  assert.ok(r.masked.includes('[동·호수]'));
});

test('amounts are not masked', () => {
  for (const s of ['보증금 120,000,000원', '보증금 1억 2천만원', '보증금 일억원', '월 55만원', '위약금 30%']) {
    const r = maskPii(s);
    assert.equal(r.masked, s, s);
    assert.equal(r.found.length, 0, s);
  }
});

test('masking does not touch a clean case', () => {
  const s = '특약사항\n1. 임대인은 잔금 지급일 다음 날까지 근저당을 설정하지 아니한다.';
  assert.equal(maskPii(s).masked, s);
});
