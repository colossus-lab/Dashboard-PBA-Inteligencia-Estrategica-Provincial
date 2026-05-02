import { useEffect, useRef, useState } from 'react';

function useReducedMotion() {
  const [r, setR] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setR(mq.matches);
    const h = () => setR(mq.matches);
    mq.addEventListener?.('change', h);
    return () => mq.removeEventListener?.('change', h);
  }, []);
  return r;
}

type Props = {
  text: string;
  delayPerChar?: number;
  startDelay?: number;
  onDone?: () => void;
  className?: string;
  cursor?: boolean;
  resetKey?: string | number;
};

export default function TypingTitle({
  text,
  delayPerChar = 32,
  startDelay = 0,
  onDone,
  className = '',
  cursor = true,
  resetKey,
}: Props) {
  const reduced = useReducedMotion();
  const [idx, setIdx] = useState(0);
  const [done, setDone] = useState(false);
  const onDoneRef = useRef(onDone);
  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);

  useEffect(() => {
    setIdx(0);
    setDone(false);

    if (reduced) {
      setIdx(text.length);
      setDone(true);
      onDoneRef.current?.();
      return;
    }

    let interval: ReturnType<typeof setInterval> | null = null;
    const startTimer = setTimeout(() => {
      interval = setInterval(() => {
        setIdx((i) => {
          const next = i + 1;
          if (next >= text.length) {
            if (interval) clearInterval(interval);
            setDone(true);
            onDoneRef.current?.();
            return text.length;
          }
          return next;
        });
      }, delayPerChar);
    }, startDelay);

    return () => {
      clearTimeout(startTimer);
      if (interval) clearInterval(interval);
    };
  }, [text, delayPerChar, startDelay, reduced, resetKey]);

  const shown = text.slice(0, idx);
  return (
    <span className={className} aria-label={text}>
      {shown}
      {cursor && !done && (
        <span
          style={{
            display: 'inline-block',
            width: '0.08em',
            transform: 'translateY(0.08em)',
            background: 'currentColor',
            height: '0.9em',
            animation: 'pulse 1.2s ease-in-out infinite',
          }}
        >
          &nbsp;
        </span>
      )}
    </span>
  );
}
