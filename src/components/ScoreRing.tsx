import { forwardRef, type HTMLAttributes } from 'react';

export interface ScoreRingProps extends HTMLAttributes<HTMLDivElement> {
  value: number;
  max?: number;
  label?: string;
  size?: 'small' | 'medium' | 'large';
  tone?: 'auto' | 'brand' | 'positive' | 'caution' | 'negative';
}

const SCORE_RING_SIZE: Record<NonNullable<ScoreRingProps['size']>, number> = {
  small: 64,
  medium: 96,
  large: 120,
};

function resolveColor(
  tone: NonNullable<ScoreRingProps['tone']>,
  value: number,
  max: number,
): string {
  const ratio = max > 0 ? value / max : 0;
  const resolved =
    tone === 'auto'
      ? ratio >= 0.75
        ? 'positive'
        : ratio >= 0.45
          ? 'caution'
          : 'negative'
      : tone;
  if (resolved === 'positive') return 'var(--semantic-ohaeng-wood-primary)';
  if (resolved === 'caution') return 'var(--semantic-ohaeng-earth-primary)';
  if (resolved === 'negative') return 'var(--dancheong)';
  return 'var(--indigo)';
}

export const ScoreRing = forwardRef<HTMLDivElement, ScoreRingProps>(
  ({ value, max = 100, label, size = 'medium', tone = 'auto', className = '', ...props }, ref) => {
    const clamped = Math.max(0, Math.min(max, value));
    const diameter = SCORE_RING_SIZE[size];
    const stroke = Math.max(5, Math.round(diameter * 0.075));
    const r = (diameter - stroke) / 2;
    const circumference = 2 * Math.PI * r;
    const color = resolveColor(tone, clamped, max);

    return (
      <div
        ref={ref}
        role="meter"
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={Math.round(clamped)}
        aria-label={label}
        className={`score-ring score-ring--${size} ${className}`.trim()}
        style={{ width: diameter, height: diameter }}
        {...props}
      >
        <svg viewBox={`0 0 ${diameter} ${diameter}`} aria-hidden="true">
          <circle
            className="score-ring__track"
            cx={diameter / 2}
            cy={diameter / 2}
            r={r}
            fill="none"
            strokeWidth={stroke}
          />
          <circle
            className="score-ring__arc"
            cx={diameter / 2}
            cy={diameter / 2}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - clamped / max)}
          />
        </svg>
        <span className="score-ring__center" aria-hidden="true">
          <span
            className="score-ring__value"
            style={{ fontSize: Math.round(diameter * 0.31) }}
          >
            {Math.round(clamped)}
          </span>
          {label && <span className="score-ring__label">{label}</span>}
        </span>
      </div>
    );
  },
);
ScoreRing.displayName = 'ScoreRing';
