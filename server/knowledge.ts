/**
 * 근거 문서(knowledge/*.md) 읽기. 다온 사주의 위키 읽기(server/wiki.ts)와 같은 방식이다:
 * 문서를 '## 제목' 단위 절로 나누고, 절 열기(ref)와 낱말 찾기(query) 두 길만 둔다.
 * 인용 형식은 'knowledge/<팩>/<문서>.md#<절 제목>' 하나다.
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

function resolveKnowledgeRoot(): string {
  const fromCwd = join(process.cwd(), 'knowledge');
  if (existsSync(fromCwd)) return fromCwd;
  const fromMeta = fileURLToPath(new URL('../knowledge/', import.meta.url));
  if (existsSync(fromMeta)) return fromMeta;
  return fromCwd;
}

const ROOT = resolveKnowledgeRoot();

export type Section = { source: string; heading: string; text: string };

let cache: Section[] | null = null;

function load(): Section[] {
  if (cache) return cache;
  const sections: Section[] = [];
  if (!existsSync(ROOT)) return (cache = sections);
  for (const pack of readdirSync(ROOT)) {
    const dir = join(ROOT, pack);
    if (!existsSync(dir) || !readdirSync(ROOT, { withFileTypes: true }).find((d) => d.name === pack)?.isDirectory()) continue;
    for (const file of readdirSync(dir).filter((f) => f.endsWith('.md')).sort()) {
      const raw = readFileSync(join(dir, file), 'utf8');
      const parts = raw.split(/^## /m).slice(1);
      for (const part of parts) {
        const nl = part.indexOf('\n');
        const heading = part.slice(0, nl).trim();
        const text = part.slice(nl + 1).trim();
        sections.push({ source: `knowledge/${pack}/${file}#${heading}`, heading, text });
      }
    }
  }
  return (cache = sections);
}

export function openKnowledge(ref: string): Section | undefined {
  return load().find((s) => s.source === ref);
}

/** 낱말이 모두 들어 있는 절을 찾는다(팩 안에서만). */
export function searchKnowledge(query: string, packId: string): Section[] {
  const words = query.split(/\s+/).filter(Boolean);
  return load()
    .filter((s) => s.source.startsWith(`knowledge/${packId}/`))
    .filter((s) => words.every((w) => s.heading.includes(w) || s.text.includes(w)))
    .slice(0, 5);
}

export function knowledgeOf(packId: string): Section[] {
  return load().filter((s) => s.source.startsWith(`knowledge/${packId}/`));
}
