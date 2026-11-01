import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PACKS, getPack, openKnowledge, searchKnowledge } from './packs.js';

test('every item points at an existing knowledge section', () => {
  for (const pack of PACKS) {
    for (const item of pack.items) {
      const opened = openKnowledge(item.knowledge);
      assert.ok(opened, `${pack.id}/${item.id}: ${item.knowledge} 절이 없다`);
      assert.ok(opened.text.length > 20, `${item.knowledge} 절이 비었다`);
    }
  }
});

test('item counts', () => {
  assert.ok(getPack('lease'));
  assert.ok(getPack('gym'));
  const lease = getPack('lease')!.items.length;
  const gym = getPack('gym')!.items.length;
  assert.ok(lease >= 10 && lease <= 12, `lease ${lease}`);
  assert.ok(gym >= 6 && gym <= 8, `gym ${gym}`);
});

test('ids are unique and every item has question and fix text', () => {
  for (const pack of PACKS) {
    const ids = pack.items.map((i) => i.id);
    assert.equal(new Set(ids).size, ids.length, `${pack.id} id 중복`);
    for (const item of pack.items) {
      assert.ok(item.question.length > 5 && item.fixText.length > 5, `${item.id} 질문·대안 문구`);
      for (const re of [...item.riskHints, ...item.protectHints]) new RegExp(re);
    }
  }
});

test('search finds sections by words within a pack', () => {
  const hits = searchKnowledge('위약금', 'gym');
  assert.ok(hits.length > 0);
  assert.ok(hits.every((h) => h.source.startsWith('knowledge/gym/')));
});

test('unknown pack is undefined', () => {
  assert.equal(getPack('car'), undefined);
});
