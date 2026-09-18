"use client";

import { useEffect, useRef } from "react";

export default function CursorGlow() {
  const innerRef = useRef<HTMLDivElement>(null);
  const outerRef = useRef<HTMLDivElement>(null);
  const pos = useRef({ x: 0, y: 0 });
  const target = useRef({ x: 0, y: 0 });
  const frameRef = useRef<number>(0);
  const visibleRef = useRef(false);

  useEffect(() => {
    const mq = window.matchMedia("(hover: hover)");
    if (!mq.matches) return;

    const onMove = (e: MouseEvent) => {
      target.current = { x: e.clientX, y: e.clientY };
      if (!visibleRef.current) {
        visibleRef.current = true;
        if (innerRef.current) innerRef.current.style.opacity = "1";
        if (outerRef.current) outerRef.current.style.opacity = "1";
      }
    };

    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

    const animate = () => {
      pos.current.x = lerp(pos.current.x, target.current.x, 0.12);
      pos.current.y = lerp(pos.current.y, target.current.y, 0.12);
      if (innerRef.current) {
        innerRef.current.style.transform = `translate(${pos.current.x - 100}px, ${pos.current.y - 100}px)`;
      }
      if (outerRef.current) {
        outerRef.current.style.transform = `translate(${pos.current.x - 200}px, ${pos.current.y - 200}px)`;
      }
      frameRef.current = requestAnimationFrame(animate);
    };

    window.addEventListener("mousemove", onMove, { passive: true });
    frameRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener("mousemove", onMove);
      cancelAnimationFrame(frameRef.current);
    };
  }, []);

  return (
    <>
      <div
        ref={innerRef}
        style={{
          position: "fixed",
          width: 200,
          height: 200,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(180,142,255,0.07), transparent 70%)",
          pointerEvents: "none",
          zIndex: 9999,
          opacity: 0,
          transition: "opacity 0.4s ease",
          willChange: "transform",
        }}
      />
      <div
        ref={outerRef}
        style={{
          position: "fixed",
          width: 400,
          height: 400,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(120,60,220,0.03), transparent 70%)",
          pointerEvents: "none",
          zIndex: 9999,
          opacity: 0,
          transition: "opacity 0.4s ease",
          willChange: "transform",
        }}
      />
    </>
  );
}
