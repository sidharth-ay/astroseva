"use client";

import { useEffect, useState } from "react";

export default function ScrollProgress() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (docHeight > 0) {
        setProgress(scrollTop / docHeight);
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        height: 3,
        zIndex: 100,
        background: "linear-gradient(90deg, var(--accent-deep), var(--gold), var(--accent))",
        transformOrigin: "left",
        transform: `scaleX(${progress})`,
        transition: "transform 0.1s linear",
        opacity: progress > 0.01 ? 1 : 0,
        boxShadow: progress > 0.01 ? "0 0 10px rgba(180,142,255,0.4)" : "none",
      }}
    />
  );
}
