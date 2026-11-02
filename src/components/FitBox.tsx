import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';

export function FitBox({ children }: { children: ReactNode }) {
  const outer = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    const o = outer.current;
    const i = inner.current;
    if (!o || !i) return;
    const fit = () => {
      const h = i.scrollHeight;
      setScale(h > 0 ? Math.min(1, o.clientHeight / h) : 1);
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(o);
    ro.observe(i);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={outer} className="fitbox">
      <div ref={inner} className="fitbox__inner" style={{ transform: `scale(${scale})` }}>
        {children}
      </div>
    </div>
  );
}
