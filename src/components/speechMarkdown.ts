export type Inline = { kind: 'text' | 'strong' | 'em'; text: string };
export type Block =
  | { kind: 'para'; lines: Inline[][] }
  | { kind: 'heading'; line: Inline[] }
  | { kind: 'list'; ordered: boolean; items: Inline[][] };

const BOLD = /\*\*([^*\n]+?)\*\*/g;
const ITALIC = /(^|[^*\p{L}\p{N}])\*([^*\s][^*\n]*?)\*(?![*\p{L}\p{N}])/gu;
const BULLET = /^\s*[-•*]\s+/;
const ORDERED = /^\s*\d+[.)]\s+/;
const HEADING = /^\s*#{1,6}\s+/;

function italics(text: string): Inline[] {
  const out: Inline[] = [];
  let at = 0;
  for (const m of text.matchAll(ITALIC)) {
    const start = (m.index ?? 0) + m[1].length;
    if (start > at) out.push({ kind: 'text', text: text.slice(at, start) });
    out.push({ kind: 'em', text: m[2] });
    at = (m.index ?? 0) + m[0].length;
  }
  if (at < text.length) out.push({ kind: 'text', text: text.slice(at) });
  return out;
}

export function parseInline(line: string): Inline[] {
  const out: Inline[] = [];
  let at = 0;
  const plain = (s: string) => out.push(...italics(s.replace(/\*\*/g, '')));
  for (const m of line.matchAll(BOLD)) {
    const idx = m.index ?? 0;
    if (idx > at) plain(line.slice(at, idx));
    out.push({ kind: 'strong', text: m[1] });
    at = idx + m[0].length;
  }
  if (at < line.length) plain(line.slice(at));
  return out.filter((s) => s.text);
}

export function parseRich(text: string): Block[] {
  const blocks: Block[] = [];
  for (const chunk of text.split(/\n{2,}/)) {
    let para: Inline[][] = [];
    let list: { ordered: boolean; items: Inline[][] } | null = null;
    const flush = () => {
      if (para.length) blocks.push({ kind: 'para', lines: para });
      if (list) blocks.push({ kind: 'list', ...list });
      para = [];
      list = null;
    };
    for (const raw of chunk.split('\n')) {
      if (!raw.trim()) continue;
      const ordered = ORDERED.test(raw);
      if (ordered || BULLET.test(raw)) {
        if (para.length || (list && list.ordered !== ordered)) flush();
        list ??= { ordered, items: [] };
        list.items.push(parseInline(raw.replace(ordered ? ORDERED : BULLET, '')));
      } else if (HEADING.test(raw)) {
        flush();
        blocks.push({ kind: 'heading', line: parseInline(raw.replace(HEADING, '')) });
      } else {
        if (list) flush();
        para.push(parseInline(raw));
      }
    }
    flush();
  }
  return blocks;
}
