import { test } from 'node:test';
import assert from 'node:assert/strict';
import { handleCheck, handlePacks } from './http.js';

const post = (body: unknown) => new Request('http://x/api/check', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });

test('api rejects empty (400)', async () => {
  const res = await handleCheck(post({ action: 'check', pack: 'lease', text: ' ' }));
  assert.equal(res.status, 400);
  assert.ok((await res.json()).error);
});

test('api returns key message (503, env name)', async () => {
  const saved = { ...process.env };
  delete process.env.GEMINI_API_KEY;
  process.env.LLM_PROVIDER = 'gemini';
  try {
    const res = await handleCheck(post({ action: 'check', pack: 'lease', text: '특약 1. 보증금은 다음 임차인이 들어오면 반환한다.' }));
    assert.equal(res.status, 503);
    assert.ok((await res.json()).error.includes('GEMINI_API_KEY'));
  } finally {
    process.env = saved;
  }
});

test('api mask returns preview', async () => {
  const res = await handleCheck(post({ action: 'mask', pack: 'lease', text: '특약 임대인 900101-1234567 연락처 010-1234-5678' }));
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.ok(body.masked.includes('[주민번호]'));
  assert.equal(body.found.length, 2);
});

test('api packs lists two packs', async () => {
  const body = await handlePacks().json();
  assert.deepEqual(body.packs.map((p: { id: string }) => p.id), ['lease', 'gym']);
});

test('api rejects bad json and unknown action', async () => {
  assert.equal((await handleCheck(new Request('http://x', { method: 'POST', body: '{' }))).status, 400);
  assert.equal((await handleCheck(post({ action: 'x', text: '특약 보증금 반환' }))).status, 400);
});

test('api rejects ocr without image (400)', async () => {
  const res = await handleCheck(post({ action: 'ocr' }));
  assert.equal(res.status, 400);
  assert.ok((await res.json()).error.includes('사진'));
});

test('api law lookup returns statute and precedents from open.law.go.kr', async () => {
  const res = await handleCheck(post({ action: 'law', itemId: 'repair_duty' }));
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.itemId, 'repair_duty');
  assert.equal(body.statute.lawName, '민법');
  assert.ok(body.statute.article.includes('제623조'));
});

test('api consult returns grounded legal advice, messageDraft, and 3 followups', async () => {
  const res = await handleCheck(
    post({
      action: 'consult',
      pack: 'lease',
      question: '집주인(010-1234-5678)이 다음 세입자가 들어와야 보증금을 돌려준다고 합니다.',
    }),
  );
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.itemId, 'deposit_return');
  assert.ok(body.maskedQuestion.includes('[전화번호]'));
  assert.ok(body.headline.length > 10);
  assert.ok(body.messageDraft.length > 10);
  assert.equal(body.followups.length, 3);
  assert.equal(body.law.statute.lawName, '주택임대차보호법');
});

test('api tax returns statutory tax verdict, evidence check, hometax guide, and 3 followups', async () => {
  const res = await handleCheck(
    post({
      action: 'tax',
      filerType: 'wage_earner',
      text: '무주택 직장인인데 매달 월세 85만원을 계좌이체하고 있습니다.',
    }),
  );
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.taxLawItemId, 'tax_rent_credit');
  assert.equal(body.law.statute.lawName, '조세특례제한법');
  assert.ok(body.law.statute.article.includes('제95조의2'));
  assert.equal(body.followups.length, 3);
  assert.ok(body.hometaxGuide.includes('홈택스'));
});
