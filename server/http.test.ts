import { test } from 'node:test';
import assert from 'node:assert/strict';
import { handleCheck, handlePacks } from './http.ts';

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
