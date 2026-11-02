import { useEffect, useRef, useState, type ReactNode } from 'react';
import { IconArrowLeft, IconArrowRight } from '@montage-ui/icon';

export interface DeckItem {
  key: string;
  label: string;
  node: ReactNode;
}

export function VisualDeck({ items }: { items: DeckItem[] }) {
  const [idx, setIdx] = useState(0);
  const startX = useRef<number | null>(null);
  const prevLen = useRef(0);

  useEffect(() => {
    if (items.length === 0) {
      setIdx(0);
    } else if (prevLen.current === 0) {
      setIdx(0);
    } else if (idx >= items.length) {
      setIdx(items.length - 1);
    }
    prevLen.current = items.length;
  }, [items.length, idx]);

  if (items.length === 0) return null;
  const safe = Math.min(idx, items.length - 1);
  const current = items[safe];
  const multi = items.length > 1;

  return (
    <div
      className="deck"
      role="region"
      aria-label="시각화 카드"
      data-testid="visual-deck"
      onPointerDown={(e) => {
        startX.current = e.clientX;
      }}
      onPointerUp={(e) => {
        if (startX.current === null || !multi) return;
        const dx = e.clientX - startX.current;
        startX.current = null;
        if (dx < -40 && safe < items.length - 1) setIdx(safe + 1);
        if (dx > 40 && safe > 0) setIdx(safe - 1);
      }}
    >
      <div key={current.key} className="deck__slide">
        {current.node}
      </div>
      <div className="deck__bar">
        <button
          type="button"
          className="deck__step wanted-icon-btn"
          onClick={() => setIdx(safe - 1)}
          disabled={!multi || safe === 0}
          aria-label="이전 카드"
          title="이전 카드"
        >
          <IconArrowLeft width={16} height={16} />
        </button>
        <div className="deck__dots" role="tablist" aria-label="카드 선택">
          <span className="deck__label">
            {multi ? `${safe + 1}/${items.length} · ${current.label}` : current.label}
          </span>
          {multi &&
            items.map((item, i) => (
              <button
                key={item.key}
                type="button"
                role="tab"
                aria-selected={i === safe}
                aria-label={`${i + 1}번째 카드: ${item.label}`}
                aria-current={i === safe}
                className="deck__dot"
                onClick={() => setIdx(i)}
              />
            ))}
        </div>
        <button
          type="button"
          className="deck__step wanted-icon-btn"
          onClick={() => setIdx(safe + 1)}
          disabled={!multi || safe >= items.length - 1}
          aria-label="다음 카드"
          title="다음 카드"
        >
          <IconArrowRight width={16} height={16} />
        </button>
      </div>
    </div>
  );
}
