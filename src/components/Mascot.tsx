import { motion, useReducedMotion, type TargetAndTransition, type Transition } from 'motion/react';
import { useEffect, useState } from 'react';
import { SpeechBubble } from './SpeechBubble';

export type Mood = 'calm' | 'thinking' | 'joy' | 'worry' | 'surprise' | 'mystic';

const MOOD_ALT: Record<Mood, string> = {
  calm: '차분한 법률·세무 파트너 한결',
  thinking: '법령과 판례를 살피는 한결',
  joy: '환하게 미소 짓는 한결',
  worry: '위험 조항을 짚어주는 한결',
  surprise: '중요 포인트를 발견한 한결',
  mystic: '계약서와 법전을 꼼꼼히 읽는 한결',
};

const MOOD_MOTION: Record<Mood, { animate: TargetAndTransition; transition: Transition }> = {
  calm: {
    animate: { y: [0, -6, 0], rotate: [0, 0.8, 0] },
    transition: { duration: 3.6, repeat: Infinity, ease: 'easeInOut' },
  },
  thinking: {
    animate: { y: [0, -4, 0], rotate: [-2.5, 2.5, -2.5] },
    transition: { duration: 2.8, repeat: Infinity, ease: 'easeInOut' },
  },
  joy: {
    animate: { y: [0, -10, 0], scale: [1, 1.03, 1] },
    transition: { duration: 1.8, repeat: Infinity, ease: 'easeInOut' },
  },
  worry: {
    animate: { y: [0, 2, 0], rotate: [-1.5, 1.5, -1.5] },
    transition: { duration: 3.2, repeat: Infinity, ease: 'easeInOut' },
  },
  surprise: {
    animate: { y: [0, -12, -3, 0], scale: [1, 1.05, 0.99, 1] },
    transition: { duration: 2.2, repeat: Infinity, ease: 'easeOut' },
  },
  mystic: {
    animate: { y: [0, -8, 0], scale: [1, 1.02, 1], rotate: [-1, 1, -1] },
    transition: { duration: 4.2, repeat: Infinity, ease: 'easeInOut' },
  },
};

type Step = readonly [string, number];

const F = (dir: string, i: number) => `/mascot/frames/${dir}-${i}.webp`;

const TALK: readonly Step[] = [
  [F('talk', 0), 170],
  [F('talk', 1), 140],
  [F('talk', 2), 180],
  [F('talk', 1), 130],
  [F('talk', 0), 220],
  [F('talk', 3), 120],
];

const THINK: readonly Step[] = [
  [F('thinking', 0), 900],
  [F('thinking', 1), 420],
  [F('thinking', 2), 1100],
  [F('thinking', 3), 130],
  [F('thinking', 1), 380],
];

const SCROLL: readonly Step[] = [
  [F('scroll', 0), 500],
  [F('scroll', 1), 900],
  [F('scroll', 2), 900],
  [F('scroll', 3), 130],
  [F('scroll', 1), 600],
];

const JOY: readonly Step[] = [
  [F('joy', 0), 520],
  [F('joy', 1), 160],
  [F('joy', 2), 260],
  [F('joy', 3), 240],
  [F('joy', 0), 700],
];

const MYSTIC: readonly Step[] = [
  [F('mystic', 0), 320],
  [F('mystic', 1), 320],
  [F('mystic', 2), 320],
  [F('mystic', 3), 320],
];

const SURPRISE: readonly Step[] = [
  [F('surprise', 0), 180],
  [F('surprise', 1), 320],
  [F('surprise', 2), 380],
  [F('surprise', 3), 900],
];

const WORRY: readonly Step[] = [
  [F('worry', 0), 900],
  [F('worry', 1), 800],
  [F('worry', 2), 900],
  [F('worry', 3), 130],
];

const WAVE: readonly Step[] = [
  [F('wave', 0), 180],
  [F('wave', 1), 180],
  [F('wave', 2), 180],
  [F('wave', 1), 180],
  [F('wave', 3), 240],
];

const BOW: readonly Step[] = [
  [F('bow', 0), 260],
  [F('bow', 1), 220],
  [F('bow', 2), 520],
  [F('bow', 3), 280],
];

const BLINK: readonly Step[] = [
  ['/mascot/calm.webp', 1600],
  [F('talk', 3), 120],
  ['/mascot/calm.webp', 1400],
];

const IDLE_POOL: readonly (readonly Step[])[] = [
  WAVE,
  BOW,
  THINK,
  SCROLL,
  JOY,
  SURPRISE,
];

function pickIdleSteps(prev: number): [number, readonly Step[]] {
  let idx = Math.floor(Math.random() * IDLE_POOL.length);
  if (idx === prev) idx = (idx + 1) % IDLE_POOL.length;
  return [idx, [...BLINK, ...IDLE_POOL[idx]]];
}

const FIRST_PAINT_FRAMES = [0, 1, 2, 3].flatMap((i) => [
  F('wave', i),
  F('talk', i),
  F('thinking', i),
  F('scroll', i),
]);
const LATER_FRAMES = ['bow', 'joy', 'mystic', 'surprise', 'worry'].flatMap((d) =>
  [0, 1, 2, 3].map((i) => F(d, i)),
);
let preloaded = false;
function preloadFrames() {
  if (preloaded || typeof Image === 'undefined') return;
  preloaded = true;
  const load = (src: string) => {
    const img = new Image();
    img.src = src;
  };
  FIRST_PAINT_FRAMES.forEach(load);
  setTimeout(() => LATER_FRAMES.forEach(load), 1200);
}

function useSprite(mood: Mood, speaking: boolean, still: boolean): string {
  const base = `/mascot/${mood}.webp`;
  const [frame, setFrame] = useState(base);

  useEffect(() => {
    preloadFrames();
    if (still) {
      setFrame(base);
      return;
    }
    let steps: readonly Step[];
    let prev = -1;
    let thinkAlt = false;
    if (speaking) {
      steps = TALK;
    } else if (mood === 'joy') {
      steps = JOY;
    } else if (mood === 'mystic') {
      steps = SCROLL;
    } else if (mood === 'thinking') {
      steps = SCROLL;
    } else if (mood === 'surprise') {
      steps = SURPRISE;
    } else if (mood === 'worry') {
      steps = WORRY;
    } else {
      steps = [...WAVE, ...BLINK, ...BOW];
    }

    let i = 0;
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      const [src, ms] = steps[i];
      setFrame(src);
      i += 1;
      if (i >= steps.length) {
        i = 0;
        if (!speaking && mood === 'calm') {
          [prev, steps] = pickIdleSteps(prev);
        } else if (!speaking && mood === 'thinking') {
          thinkAlt = !thinkAlt;
          steps = thinkAlt ? THINK : SCROLL;
        }
      }
      timer = setTimeout(tick, ms);
    };
    tick();
    return () => clearTimeout(timer);
  }, [mood, speaking, still, base]);

  return frame;
}

export function Mascot({
  mood = 'calm',
  line,
  compact = false,
  speaking = false,
}: {
  mood?: Mood;
  line?: string;
  compact?: boolean;
  speaking?: boolean;
}) {
  const reduce = useReducedMotion();
  const m = MOOD_MOTION[mood];
  const src = useSprite(mood, speaking, Boolean(reduce));
  return (
    <div className={compact ? 'mascot mascot--compact' : 'mascot'}>
      <motion.div
        key={mood}
        className="mascot__body"
        initial={{ scale: 0.94, opacity: 0.85 }}
        animate={reduce ? { scale: 1, opacity: 1 } : { scale: 1, opacity: 1, ...m.animate }}
        transition={reduce ? { duration: 0 } : m.transition}
      >
        <img
          className="mascot__img"
          src={src}
          alt={MOOD_ALT[mood]}
          width={compact ? 112 : 180}
          height={compact ? 112 : 180}
          decoding="async"
        />
      </motion.div>
      {line && (
        <SpeechBubble key={line} className="mascot__bubble" tail="top">
          {line}
        </SpeechBubble>
      )}
    </div>
  );
}
