"use client";

import { useRef, useCallback } from "react";

export function useMagnetic<T extends HTMLElement = HTMLElement>(strength = 0.3, radius = 100) {
  const ref = useRef<T>(null);
  const frameRef = useRef<number>(0);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    cancelAnimationFrame(frameRef.current);
    frameRef.current = requestAnimationFrame(() => {
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < radius) {
        const pull = 1 - dist / radius;
        el.style.transform = `translate(${dx * strength * pull}px, ${dy * strength * pull}px)`;
      }
    });
  }, [strength, radius]);

  const onMouseLeave = useCallback(() => {
    cancelAnimationFrame(frameRef.current);
    const el = ref.current;
    if (el) el.style.transform = "translate(0px, 0px)";
  }, []);

  return { ref, onMouseMove, onMouseLeave };
}
