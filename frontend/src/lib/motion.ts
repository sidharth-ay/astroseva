"use client";

import { useEffect, useState } from "react";
import type { Variants, Transition } from "framer-motion";

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return reduced;
}

// ---------------------------------------------------------------------------
// Motion Tokens
// ---------------------------------------------------------------------------

export const duration = {
  instant: 0.05,
  fast: 0.15,
  normal: 0.3,
  slow: 0.5,
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
  fast: 0.05,
  normal: 0.08,
  slow: 0.12,
  child: 0.06,
} as const;

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
  return {
    hidden: { opacity: 1 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: staggerAmount, delayChildren },
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
