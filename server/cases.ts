/**
 * 정답 표 읽기. 파일에는 '언급 없음'이 아닌 판정만 적고(data/README.md), 나머지는 여기서 '언급 없음'으로 채운다.
 * test 세트는 최종 숫자를 낼 때만 읽는다(scripts/eval.mjs --split test).
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { Verdict } from '../shared/types.ts';
import { getPack } from './packs.ts';

export type Case = { id: string; pack: string; kind: string; text: string; labels: Record<string, Verdict> };

export function loadCases(split: 'dev' | 'test'): Case[] {
  const path = fileURLToPath(new URL(`../data/cases_${split}.jsonl`, import.meta.url));
  return readFileSync(path, 'utf8')
    .split('\n')
    .filter((line) => line.trim())
    .map((line) => {
      const raw = JSON.parse(line) as Omit<Case, 'labels'> & { labels: Record<string, Verdict> };
      const pack = getPack(raw.pack);
      if (!pack) throw new Error(`${raw.id}: 알 수 없는 팩 ${raw.pack}`);
      for (const id of Object.keys(raw.labels)) {
        if (!pack.items.some((i) => i.id === id)) throw new Error(`${raw.id}: 팩에 없는 항목 ${id}`);
      }
      const labels = Object.fromEntries(pack.items.map((i) => [i.id, raw.labels[i.id] ?? '언급 없음'])) as Record<string, Verdict>;
      return { ...raw, labels };
    });
}
