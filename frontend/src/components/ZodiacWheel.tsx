"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { useTilt } from "@/lib/useTilt";

const SIGNS = [
  { symbol: "\u2648", name: "Aries" },
  { symbol: "\u2649", name: "Taurus" },
  { symbol: "\u264A", name: "Gemini" },
  { symbol: "\u264B", name: "Cancer" },
  { symbol: "\u264C", name: "Leo" },
  { symbol: "\u264D", name: "Virgo" },
  { symbol: "\u264E", name: "Libra" },
  { symbol: "\u264F", name: "Scorpio" },
  { symbol: "\u2650", name: "Sagittarius" },
  { symbol: "\u2651", name: "Capricorn" },
  { symbol: "\u2652", name: "Aquarius" },
  { symbol: "\u2653", name: "Pisces" },
];

const ELEMENT_COLORS: Record<string, string> = {
  fire: "#ef4444",
  earth: "#22c55e",
  air: "#60a5fa",
  water: "#06b6d4",
};

const ELEMENTS: Record<string, string> = {
  aries: "fire", leo: "fire", sagittarius: "fire",
  taurus: "earth", virgo: "earth", capricorn: "earth",
  gemini: "air", libra: "air", aquarius: "air",
  cancer: "water", scorpio: "water", pisces: "water",
};

const OPPOSITES = [
  [0, 6], [1, 7], [2, 8], [3, 9], [4, 10], [5, 11],
];

export default function ZodiacWheel() {
  const { ref: tiltRef, onMouseMove, onMouseLeave } = useTilt<HTMLDivElement>(12);
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [mouseNear, setMouseNear] = useState<number | null>(null);

  const RADIUS = 170;
  const CENTER = 190;

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    onMouseMove(e);
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    let closest = -1;
    let minDist = 80;
    SIGNS.forEach((_, i) => {
      const angle = (i * 30 - 90) * (Math.PI / 180);
      const sx = CENTER + RADIUS * Math.cos(angle);
      const sy = CENTER + RADIUS * Math.sin(angle);
      const d = Math.sqrt((mx - sx) ** 2 + (my - sy) ** 2);
      if (d < minDist) { minDist = d; closest = i; }
    });
    setMouseNear(closest >= 0 ? closest : null);
  }, [onMouseMove]);

  const handleMouseLeave = useCallback(() => {
    onMouseLeave();
    setMouseNear(null);
    setHoveredIdx(null);
  }, [onMouseLeave]);

  return (
    <div
      ref={(el) => {
        (tiltRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
        (containerRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
      }}
      className="zodiac-wheel-container"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ transformStyle: "preserve-3d" }}
    >
      {/* SVG Connection Lines */}
      <svg
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}
        viewBox="0 0 380 380"
      >
        <defs>
          <linearGradient id="line-grad-0" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ef4444" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#60a5fa" stopOpacity="0.12" />
          </linearGradient>
          <linearGradient id="line-grad-1" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#22c55e" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#ec4899" stopOpacity="0.12" />
          </linearGradient>
          <linearGradient id="line-grad-2" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#ef4444" stopOpacity="0.12" />
          </linearGradient>
          <linearGradient id="line-grad-3" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#22c55e" stopOpacity="0.12" />
          </linearGradient>
          <linearGradient id="line-grad-4" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ef4444" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.12" />
          </linearGradient>
          <linearGradient id="line-grad-5" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#22c55e" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#ec4899" stopOpacity="0.12" />
          </linearGradient>
        </defs>
        {OPPOSITES.map(([a, b], li) => {
          const angleA = (a * 30 - 90) * (Math.PI / 180);
          const angleB = (b * 30 - 90) * (Math.PI / 180);
          const isHighlighted = mouseNear === a || mouseNear === b;
          return (
            <line
              key={li}
              x1={CENTER + RADIUS * Math.cos(angleA)}
              y1={CENTER + RADIUS * Math.sin(angleA)}
              x2={CENTER + RADIUS * Math.cos(angleB)}
              y2={CENTER + RADIUS * Math.sin(angleB)}
              stroke={`url(#line-grad-${li})`}
              strokeWidth={isHighlighted ? 1.5 : 0.5}
              opacity={isHighlighted ? 0.6 : 0.3}
              className="zodiac-connection-line"
              style={{ transition: "opacity 0.3s, stroke-width 0.3s" }}
            />
          );
        })}
      </svg>

      {/* Outer rotating ring */}
      <div className="zodiac-wheel-outer">
        {SIGNS.map((s, i) => {
          const angle = (i * 30) - 90;
          const isNear = mouseNear === i;
          return (
            <div
              key={s.name}
              className={`zodiac-wheel-symbol ${isNear ? "near" : ""}`}
              style={{
                transform: `rotate(${angle}deg) translateX(${RADIUS}px) rotate(-${angle}deg)`,
                color: ELEMENT_COLORS[ELEMENTS[s.name.toLowerCase()]] || "var(--accent)",
              }}
              onMouseEnter={() => setHoveredIdx(i)}
              onMouseLeave={() => setHoveredIdx(null)}
              title={s.name}
            >
              <span className="zodiac-wheel-glyph">{s.symbol}</span>
            </div>
          );
        })}
      </div>

      {/* Inner glow ring */}
      <div className="zodiac-wheel-inner" />

      {/* Center orb */}
      <div className="zodiac-wheel-center">
        <span className="zodiac-wheel-emoji">{'\u2728'}</span>
      </div>

      {/* Connecting lines (decorative) */}
      <div className="zodiac-wheel-lines" />
    </div>
  );
}
