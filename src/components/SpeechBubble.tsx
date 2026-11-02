import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';

export interface SpeechBubbleProps extends HTMLAttributes<HTMLDivElement> {
  tail?: 'top' | 'left' | 'bottom' | 'none';
  tone?: 'paper' | 'brand';
  length?: 'line' | 'passage';
  children?: ReactNode;
}

export const SpeechBubble = forwardRef<HTMLDivElement, SpeechBubbleProps>(
  ({ tail = 'top', tone = 'paper', length = 'line', className = '', children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        data-tail={tail}
        data-tone={tone}
        data-length={length}
        className={`speech-bubble ${className}`.trim()}
        {...props}
      >
        {children}
      </div>
    );
  },
);
SpeechBubble.displayName = 'SpeechBubble';
