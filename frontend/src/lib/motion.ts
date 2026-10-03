"use client";

import { useEffect, useState } from "react";
import type { Variants } from "motion/react";

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

export function useReducedMotion(): boolean {
  // Decided on first render rather than in an effect: on the server there is
  // no matchMedia, so this is false -- exactly what the server rendered
  // before -- and on the client the preference applies immediately instead of
  // flashing one animated frame first.
  const [reduced, setReduced] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return reduced;
}

// ---------------------------------------------------------------------------
// Motion Tokens
// ---------------------------------------------------------------------------

// `duration` and `stagger` are a perceived-latency budget, not a style choice.
// A page was interactive about 150 ms after the URL changed, but a stagger of
// 0.08-0.12 per child plus a 0.3s fade meant a ten-card grid was still fading in
// a second later -- which reads as "still loading" even though nothing is being
// waited on. The easing curves are untouched; only the clocks are shorter, and
// `motion.test.ts` pins the budget so it cannot creep back.
export const duration = {
  instant: 0.05,
  fast: 0.15,
  normal: 0.22,
  slow: 0.35,
  cinematic: 0.8,
} as const;

export const ease = {
  standard: [0.4, 0, 0.2, 1] as [number, number, number, number],
  decelerate: [0, 0, 0.2, 1] as [number, number, number, number],
  accelerate: [0.4, 0, 1, 1] as [number, number, number, number],
  cinematic: [0.16, 1, 0.3, 1] as [number, number, number, number],
  spring: { type: "spring" as const, stiffness: 300, damping: 24 },
  gentleSpring: { type: "spring" as const, stiffness: 120, damping: 20 },
} as const;

export const stagger = {
  fast: 0.03,
  normal: 0.04,
  slow: 0.05,
  child: 0.03,
} as const;

/**
 * Longest a staggered container may sit empty before its first child appears.
 *
 * Every page used to pass its own `delayChildren` of 0.04-0.3s, which is pure
 * waiting: nothing is painted until it elapses, so a page looked blank after the
 * route had already changed. The request is clamped in `staggerContainerCustom`
 * rather than fixed at the call sites, so a page can still ask for a small beat
 * but cannot buy a visible pause.
 */
export const MAX_STAGGER_DELAY = 0.05;

// ---------------------------------------------------------------------------
// Reusable Variants
// ---------------------------------------------------------------------------

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: duration.normal, ease: ease.standard } },
  exit: { opacity: 0, transition: { duration: duration.fast, ease: ease.accelerate } },
};

export const slideUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: duration.normal, ease: ease.decelerate } },
  exit: { opacity: 0, y: -8, transition: { duration: duration.fast, ease: ease.accelerate } },
};

export const slideInLeft: Variants = {
  hidden: { opacity: 0, x: -24 },
  visible: { opacity: 1, x: 0, transition: { duration: duration.slow, ease: ease.cinematic } },
  exit: { opacity: 0, x: -12, transition: { duration: duration.fast, ease: ease.accelerate } },
};

export const slideInRight: Variants = {
  hidden: { opacity: 0, x: 24 },
  visible: { opacity: 1, x: 0, transition: { duration: duration.slow, ease: ease.cinematic } },
  exit: { opacity: 0, x: 12, transition: { duration: duration.fast, ease: ease.accelerate } },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.92 },
  visible: { opacity: 1, scale: 1, transition: { duration: duration.normal, ease: ease.cinematic } },
  exit: { opacity: 0, scale: 0.95, transition: { duration: duration.fast, ease: ease.accelerate } },
};

// Stagger container — apply to parent
export const staggerContainer: Variants = {
  hidden: { opacity: 1 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: stagger.normal, delayChildren: 0.05 },
  },
};

// Stagger container with custom stagger
export function staggerContainerCustom(staggerAmount: number, delayChildren = 0): Variants {
  const delay = Math.min(Math.max(delayChildren, 0), MAX_STAGGER_DELAY);
  return {
    hidden: { opacity: 1 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: staggerAmount, delayChildren: delay },
    },
  };
}

// Child item for stagger — apply to each child
export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: duration.normal, ease: ease.decelerate },
  },
};

// ---------------------------------------------------------------------------
// Page Transition Variants
// ---------------------------------------------------------------------------

export const pageTransition: Variants = {
  initial: { opacity: 0, y: -6 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: duration.slow, ease: ease.cinematic },
  },
  exit: {
    opacity: 0,
    transition: { duration: duration.fast, ease: ease.accelerate },
  },
};

// ---------------------------------------------------------------------------
// Hover / Tap
// ---------------------------------------------------------------------------

export const hoverLift = {
  y: -2,
  transition: { duration: duration.fast, ease: ease.standard },
};

export const tapScale = {
  scale: 0.97,
  transition: { duration: duration.instant, ease: ease.standard },
};

// ---------------------------------------------------------------------------
// Reduced-motion helper: returns static variants if reduced motion is on
// ---------------------------------------------------------------------------

export function motionProps(
  variants: Variants,
  reduced: boolean
): { variants: Variants; initial?: string; animate?: string; exit?: string } {
  if (reduced) {
    return {
      variants: {
        hidden: { opacity: 1 },
        visible: { opacity: 1 },
        exit: { opacity: 1 },
        initial: { opacity: 1 },
        animate: { opacity: 1 },
      },
      initial: "visible",
      animate: "visible",
    };
  }
  return { variants, initial: "hidden", animate: "visible", exit: "exit" };
}
