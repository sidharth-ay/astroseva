"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

interface RevealProps {
  children: ReactNode;
  /** Stagger offset for groups; parent passes index * step. */
  delay?: number;
  className?: string;
}

/**
 * The single scroll-reveal primitive. Content starts translated 24px down at
 * zero opacity and settles in over 600ms once it enters the viewport; the
 * observer disconnects after the first reveal so scrolling back never
 * replays it.
 *
 * Reduced motion renders the content immediately with no observer and no
 * transition -- the global CSS rule also zeroes transitions, and this keeps
 * the two in agreement for readers that never fire IntersectionObserver.
 */
export default function Reveal({ children, delay = 0, className = "" }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const prefersReduced =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) {
      // Reduced motion renders the content immediately: no observer, no
      // transition, in agreement with the CSS rule that zeroes both.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setVisible(true);
      return;
    }
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          io.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -48px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`reveal${visible ? " is-visible" : ""}${className ? ` ${className}` : ""}`}
      style={{ "--reveal-delay": `${delay}ms` } as CSSProperties}
    >
      {children}
    </div>
  );
}
