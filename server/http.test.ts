import { test } from 'node:test';
import assert from 'node:assert/strict';
import { handleCheck, handlePacks, handleToken } from './http.js';

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
  assert.ok(body.graphRag.subgraph.nodes.length >= 2);
  assert.equal(body.graphRag.writeback.recorded, true);
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
  assert.equal(body.graphRag.writeback.recorded, true);
});

test('api graph_stats returns GraphRAG node, edge, and learned case counts', async () => {
  const res = await handleCheck(post({ action: 'graph_stats' }));
  assert.equal(res.status, 200);
  const stats = await res.json();
  assert.ok(stats.nodeCount >= 20);
  assert.ok(stats.edgeCount >= 20);
  assert.ok(stats.casebookCount >= 6);
});

test('api response cache returns HIT on repeated law and consult requests', async () => {
  const payload = {
    action: 'consult',
    pack: 'lease',
    question: '전입신고 다음 날 집주인이 근저당을 설정하면 대항력 순위는 어떻게 되나요?',
  };
  const first = await handleCheck(post(payload));
  assert.equal(first.status, 200);
  const second = await handleCheck(post(payload));
  assert.equal(second.status, 200);
  assert.equal(second.headers.get('x-onyul-cache'), 'HIT');
  const secondBody = await second.json();
  assert.equal(secondBody.cached, true);
  assert.ok(secondBody.cacheKey);
});

test('api personalization account, profiles, and conversation history round-trip', async () => {
  const authHeaders = {
    'content-type': 'application/json',
    authorization: 'Bearer quick:testuser:%EA%B9%80%EC%9C%A8:kim%40onyul.kr',
  };
  const postAuthed = (body: unknown) =>
    new Request('http://x/api/check', {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify(body),
    });

  // 1. Account & default profiles
  const accRes = await handleCheck(postAuthed({ action: 'account' }));
  assert.equal(accRes.status, 200);
  const accBody = await accRes.json();
  assert.equal(accBody.account.name, '김율');
  assert.ok(accBody.profiles.length >= 3);

  // 2. Save custom profile
  const saveProfRes = await handleCheck(
    postAuthed({
      action: 'profiles_save',
      profile: {
        name: '마포 오피스텔 계약',
        topic: 'lease',
        filerType: 'wage_earner',
        memo: '보증금 5,000만 / 월세 65만',
      },
    }),
  );
  assert.equal(saveProfRes.status, 200);
  const savedProfBody = await saveProfRes.json();
  assert.equal(savedProfBody.saved.name, '마포 오피스텔 계약');

  // 3. Save & retrieve conversation history
  const saveConvRes = await handleCheck(
    postAuthed({
      action: 'conversations_save',
      conversation: {
        id: 'conv-test-101',
        profileId: savedProfBody.saved.id,
        profileName: '마포 오피스텔 계약',
        topic: 'lease',
        title: '퇴실 시 도배·장판비 40만원 공제 특약 점검',
        updatedAt: new Date().toISOString(),
        turns: [
          {
            id: 'turn-1',
            question: '퇴실 시 도배·장판비 40만원 공제 특약 점검',
            speech: '주의가 필요한 위험 특약이 발견되었어요.',
            mood: 'worry',
            mode: 'check',
            followups: ['수정 요청 문자 초안 써줘'],
          },
        ],
      },
    }),
  );
  assert.equal(saveConvRes.status, 200);

  const getConvRes = await handleCheck(
    postAuthed({ action: 'conversations_get', conversationId: 'conv-test-101' }),
  );
  assert.equal(getConvRes.status, 200);
  const getConvBody = await getConvRes.json();
  assert.equal(getConvBody.conversation.title, '퇴실 시 도배·장판비 40만원 공제 특약 점검');
  assert.equal(getConvBody.conversation.turns.length, 1);
});

test('api token validates client_id and grant_type', async () => {
  const badClient = await handleToken(
    new Request('http://x/api/token', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ client_id: 'wrong-client', grant_type: 'authorization_code' }),
    }),
  );
  assert.equal(badClient.status, 400);
  assert.equal((await badClient.json()).error, 'invalid_request');

  const badGoogleExchange = await handleToken(
    new Request('http://x/api/token', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: 'saju-ai',
        grant_type: 'urn:ietf:params:oauth:grant-type:token-exchange',
        subject_token_type: 'wrong_type',
      }),
    }),
  );
  assert.equal(badGoogleExchange.status, 400);
  assert.equal((await badGoogleExchange.json()).error, 'invalid_request');
});
