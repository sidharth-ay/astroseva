"use client";

import { useRef, useCallback } from "react";

export function useTilt<T extends HTMLElement = HTMLDivElement>(maxTilt = 8) {
  const ref = useRef<T>(null);
  const frameRef = useRef<number>(0);

  const onMouseMove = useCallback((e: React.MouseEvent<T>) => {
    cancelAnimationFrame(frameRef.current);
    frameRef.current = requestAnimationFrame(() => {
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const tiltX = ((y - centerY) / centerY) * -maxTilt;
      const tiltY = ((x - centerX) / centerX) * maxTilt;
      el.style.transform = `perspective(800px) rotateX(${tiltX}deg) rotateY(${tiltY}deg) scale3d(1.02,1.02,1.02)`;
    });
  }, [maxTilt]);

  const onMouseLeave = useCallback(() => {
    cancelAnimationFrame(frameRef.current);
    const el = ref.current;
    if (el) el.style.transform = "perspective(800px) rotateX(0deg) rotateY(0deg) scale3d(1,1,1)";
  }, []);

  return { ref, onMouseMove, onMouseLeave };
}
