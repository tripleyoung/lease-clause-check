import { useEffect, useMemo, useRef, useState } from 'react';
import { Mascot, type Mood } from './Mascot';
import { RichText } from './RichText';
import { SpeechBubble } from './SpeechBubble';
import { useElementSize } from './useElementSize';

function sentences(text: string): string[] {
  const out: string[] = [];
  for (const para of text.trim().split(/\n{2,}/)) {
    const p = para.trim();
    if (!p) continue;
    if (/^\s*(?:[-•*]|\d+[.)])\s+/m.test(p)) {
      const lines = p.split('\n').filter((l) => l.trim());
      for (let i = 0; i < lines.length; i += 2) {
        out.push(lines.slice(i, i + 2).join('\n'));
      }
      continue;
    }
    const parts = p
      .split(/(?<=[.!?])\s+(?=[가-힣A-Z"“‘(\[])/u)
      .map((s) => s.trim())
      .filter(Boolean);
    out.push(...(parts.length ? parts : [p]));
  }
  return out;
}

export function paginateSpeech(text: string, maxChars: number, maxUnits = 2): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [];
  const units = sentences(trimmed);
  const pages: string[] = [];
  let cur = '';
  let count = 0;
  for (const raw of units) {
    const u = raw.replace(/^\s*#{1,6}\s+/gm, '');
    const sep = cur ? '\n\n' : '';
    if (cur && (cur.length + sep.length + u.length > maxChars || count >= maxUnits)) {
      pages.push(cur);
      cur = u;
      count = 1;
    } else {
      cur = cur ? `${cur}${sep}${u}` : u;
      count += 1;
    }
  }
  if (cur) pages.push(cur);
  return pages;
}

export function Narrator({
  mood,
  line,
  text,
  streaming,
  messageId,
}: {
  mood: Mood;
  line: string;
  text: string;
  streaming: boolean;
  messageId: string;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [stageEl, setStageEl] = useState<HTMLElement | null>(null);
  useEffect(() => {
    setStageEl((rootRef.current?.closest('.stage') as HTMLElement | null) ?? rootRef.current);
  }, []);
  const stage = useElementSize(stageEl);
  const wide = stage.height > 320;
  const maxChars = useMemo(() => {
    if (!stage.width) return 110;
    if (wide) {
      const availH = Math.max(120, stage.height - 230);
      const cols = Math.max(18, Math.floor((stage.width - 36) / 15));
      const lines = Math.max(3, Math.min(8, Math.floor(availH / 28)));
      return Math.max(80, Math.floor(cols * lines * 0.58));
    }
    const cols = Math.max(14, Math.floor((stage.width - 96) / 14));
    return Math.max(60, Math.min(125, cols * 3));
  }, [stage.width, stage.height, wide]);

  const pages = useMemo(
    () => paginateSpeech(text || line, maxChars, wide ? 3 : 2),
    [text, line, maxChars, wide],
  );
  const [page, setPage] = useState(0);
  const [followStream, setFollowStream] = useState(true);

  const prevPagesLen = useRef(0);
  useEffect(() => {
    setPage(0);
    setFollowStream(true);
    prevPagesLen.current = pages.length;
  }, [messageId]);

  useEffect(() => {
    if (streaming && followStream && pages.length > prevPagesLen.current && prevPagesLen.current > 0) {
      setPage(pages.length - 1);
    }
    prevPagesLen.current = pages.length;
  }, [streaming, followStream, pages.length]);

  const idx = Math.min(page, Math.max(0, pages.length - 1));
  const current = pages[idx] ?? line;
  const multi = pages.length > 1;
  const atEnd = idx >= pages.length - 1;
  const speaking = streaming;

  const go = (next: number) => {
    setFollowStream(false);
    setPage(next);
  };

  return (
    <div ref={rootRef} className={wide ? 'narrator narrator--wide' : 'narrator'} data-testid="narrator">
      <div className={speaking ? 'narrator__figure is-speaking' : 'narrator__figure'} data-mood={mood}>
        <span className="narrator__moon" aria-hidden="true" />
        <span className="narrator__ring" aria-hidden="true" />
        <Mascot mood={mood} compact speaking={speaking} />
      </div>
      <SpeechBubble
        className="narrator__bubble"
        tail={wide ? 'top' : 'left'}
        length="passage"
        aria-live="polite"
      >
        <div
          className="narrator__page"
          onClick={multi && !atEnd ? () => go(idx + 1) : undefined}
          role={multi && !atEnd ? 'button' : undefined}
          tabIndex={multi && !atEnd ? 0 : undefined}
          onKeyDown={
            multi && !atEnd
              ? (e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    go(idx + 1);
                  }
                }
              : undefined
          }
        >
          <RichText text={current} />
          {speaking && <span className="narrator__caret" aria-hidden="true" />}
        </div>
        {multi && (
          <div className="narrator__nav" role="group" aria-label="말풍선 쪽 넘김">
            <button type="button" onClick={() => go(idx - 1)} disabled={idx === 0} aria-label="이전 쪽">
              ◀
            </button>
            <span>
              {idx + 1} / {pages.length}
            </span>
            <button
              type="button"
              className={!atEnd ? 'is-next' : undefined}
              onClick={() => go(idx + 1)}
              disabled={atEnd}
              aria-label="다음 쪽"
            >
              {!atEnd ? '다음 ▶' : '▶'}
            </button>
          </div>
        )}
      </SpeechBubble>
    </div>
  );
}
