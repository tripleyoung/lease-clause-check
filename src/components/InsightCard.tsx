import { forwardRef, type HTMLAttributes } from 'react';

export type InsightCardContent =
  | {
      kind: 'keywords';
      items: Array<{ label: string; detail?: string }>;
    }
  | {
      kind: 'compare';
      left: { label: string; points: string[] };
      right: { label: string; points: string[] };
    }
  | {
      kind: 'timeline';
      items: Array<{ when: string; text: string; tone?: 'good' | 'caution' | 'neutral' }>;
    }
  | {
      kind: 'checklist';
      items: string[];
    };

export interface InsightCardProps extends Omit<HTMLAttributes<HTMLElement>, 'content'> {
  eyebrow?: string;
  title: string;
  content: InsightCardContent;
}

export const InsightCard = forwardRef<HTMLElement, InsightCardProps>(
  ({ eyebrow, title, content, className = '', ...props }, ref) => {
    return (
      <section
        ref={ref}
        aria-label={title}
        data-kind-root={content.kind}
        className={`insight-card ${className}`.trim()}
        {...props}
      >
        <header>
          {eyebrow && <span data-role="insight-eyebrow">{eyebrow}</span>}
          <h3 data-role="insight-title">{title}</h3>
        </header>
        {content.kind === 'keywords' && (
          <ul data-kind="keywords">
            {content.items.map((k) => (
              <li key={k.label} data-role="keyword">
                <span data-role="keyword-label">{k.label}</span>
                {k.detail && <span data-role="keyword-detail">{k.detail}</span>}
              </li>
            ))}
          </ul>
        )}
        {content.kind === 'compare' && (
          <div data-kind="compare">
            {(['left', 'right'] as const).map((side) => (
              <section
                key={side}
                data-role="compare-side"
                data-side={side}
                aria-label={content[side].label}
              >
                <span data-role="compare-label">{content[side].label}</span>
                <ul>
                  {content[side].points.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
        {content.kind === 'timeline' && (
          <ol data-kind="timeline">
            {content.items.map((t) => (
              <li
                key={`${t.when}-${t.text}`}
                data-role="timeline-item"
                data-tone={t.tone ?? 'neutral'}
              >
                <span data-role="timeline-when">{t.when}</span>
                <span data-role="timeline-text">{t.text}</span>
              </li>
            ))}
          </ol>
        )}
        {content.kind === 'checklist' && (
          <ul data-kind="checklist">
            {content.items.map((c, i) => (
              <li key={`${i}-${c}`} data-role="check-item">
                <span data-role="check-mark" aria-hidden="true">
                  {i + 1}
                </span>
                <span>{c}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    );
  },
);
InsightCard.displayName = 'InsightCard';
