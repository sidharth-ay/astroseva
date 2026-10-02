'use client';
/* eslint-disable react-hooks/static-components -- motionFor() returns a cached, stable component (see motion-component.ts), so nothing here is actually recreated per render; the rule cannot see through the cache lookup. */
import { type ElementType, type JSX, useCallback, useEffect, useState, useRef } from 'react';
import { MotionProps } from 'motion/react';
import { motionFor } from './motion-component';

export type TextScrambleProps = {
  children: string;
  duration?: number;
  speed?: number;
  characterSet?: string;
  as?: ElementType;
  className?: string;
  trigger?: boolean;
  onScrambleComplete?: () => void;
} & MotionProps;

const defaultChars =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

export function TextScramble({
  children,
  duration = 0.8,
  speed = 0.04,
  characterSet = defaultChars,
  className,
  as: Component = 'p',
  trigger = true,
  onScrambleComplete,
  ...props
}: TextScrambleProps) {
  // See motion-component.ts: cached and stable, so not recreated per render.
  const MotionComponent = motionFor(Component as keyof JSX.IntrinsicElements);
  const [scrambledText, setScrambledText] = useState<string | null>(null);
  const isAnimating = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const text = children;
  const displayText = scrambledText ?? children;

  // Memoized so the trigger effect below can depend on it without re-running
  // on every render -- which would restart the animation in a loop.
  const scramble = useCallback(async () => {
    if (isAnimating.current) return;
    isAnimating.current = true;

    const steps = duration / speed;
    let step = 0;

    intervalRef.current = setInterval(() => {
      let scrambled = '';
      const progress = step / steps;

      for (let i = 0; i < text.length; i++) {
        if (text[i] === ' ') {
          scrambled += ' ';
          continue;
        }

        if (progress * text.length > i) {
          scrambled += text[i];
        } else {
          scrambled +=
            characterSet[Math.floor(Math.random() * characterSet.length)];
        }
      }

      setScrambledText(scrambled);
      step++;

      if (step > steps) {
        clearInterval(intervalRef.current ?? undefined);
        intervalRef.current = null;
        setScrambledText(null);
        isAnimating.current = false;
        onScrambleComplete?.();
      }
    }, speed * 1000);
  }, [characterSet, duration, onScrambleComplete, speed, text]);

  // A navigation mid-animation must not leave a live interval calling
  // setState on an unmounted component.
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  useEffect(() => {
    if (!trigger) return;

    // Starting the animation in response to the trigger prop is what this
    // effect is for. No disable needed: every setState here runs inside the
    // interval callback or a promise continuation, never synchronously.
    scramble();
  }, [trigger, scramble]);

  return (
    <MotionComponent className={className} {...props}>
      {displayText}
    </MotionComponent>
  );
}
