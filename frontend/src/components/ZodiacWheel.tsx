"use client";

import { useRef, useState, useCallback } from "react";

const SIGNS = [
  { symbol: "♈", name: "Aries" }, { symbol: "♉", name: "Taurus" },
  { symbol: "♊", name: "Gemini" }, { symbol: "♋", name: "Cancer" },
  { symbol: "♌", name: "Leo" }, { symbol: "♍", name: "Virgo" },
  { symbol: "♎", name: "Libra" }, { symbol: "♏", name: "Scorpio" },
  { symbol: "♐", name: "Sagittarius" }, { symbol: "♑", name: "Capricorn" },
  { symbol: "♒", name: "Aquarius" }, { symbol: "♓", name: "Pisces" },
];

const ELEMENT_COLORS: Record<string, string> = {
  fire: "#E85D5D", earth: "#5DC88F", air: "#8AA8F4", water: "#5DC4C8",
};

const ELEMENTS: Record<string, string> = {
  aries: "fire", leo: "fire", sagittarius: "fire",
  taurus: "earth", virgo: "earth", capricorn: "earth",
  gemini: "air", libra: "air", aquarius: "air",
  cancer: "water", scorpio: "water", pisces: "water",
};

const OPPOSITES = [[0, 6], [1, 7], [2, 8], [3, 9], [4, 10], [5, 11]];
const RADIUS = 150;
const CENTER = 170;

export default function ZodiacWheel() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mouseNear, setMouseNear] = useState<number | null>(null);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    let closest = -1;
    let minDist = 70;
    SIGNS.forEach((_, i) => {
      const angle = (i * 30 - 90) * (Math.PI / 180);
      const sx = CENTER + RADIUS * Math.cos(angle);
      const sy = CENTER + RADIUS * Math.sin(angle);
      const d = Math.sqrt((mx - sx) ** 2 + (my - sy) ** 2);
      if (d < minDist) { minDist = d; closest = i; }
    });
    setMouseNear(closest >= 0 ? closest : null);
  }, []);

  const handleMouseLeave = useCallback(() => { setMouseNear(null); }, []);

  return (
    <div
      ref={containerRef}
      className="zodiac-wheel-container"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {/* SVG Connection Lines */}
      <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }} viewBox="0 0 340 340">
        {OPPOSITES.map(([a, b], li) => {
          const angleA = (a * 30 - 90) * (Math.PI / 180);
          const angleB = (b * 30 - 90) * (Math.PI / 180);
          const isHighlighted = mouseNear === a || mouseNear === b;
          return (
            <line key={li}
              x1={CENTER + RADIUS * Math.cos(angleA)} y1={CENTER + RADIUS * Math.sin(angleA)}
              x2={CENTER + RADIUS * Math.cos(angleB)} y2={CENTER + RADIUS * Math.sin(angleB)}
              stroke="var(--border)" strokeWidth={isHighlighted ? 1 : 0.5}
              opacity={isHighlighted ? 0.4 : 0.15}
              style={{ transition: "opacity 0.3s, stroke-width 0.3s" }}
            />
          );
        })}
      </svg>

      {/* Outer ring */}
      <div className="zodiac-wheel-outer">
        {SIGNS.map((s, i) => {
          const angle = (i * 30) - 90;
          const isNear = mouseNear === i;
          return (
            <div key={s.name}
              className={`zodiac-wheel-symbol ${isNear ? "near" : ""}`}
              style={{
                transform: `rotate(${angle}deg) translateX(${RADIUS}px) rotate(-${angle}deg) scale(${isNear ? 1.15 : 1})`,
                color: ELEMENT_COLORS[ELEMENTS[s.name.toLowerCase()]] || "var(--silver)",
              }}
            >
              <span className="zodiac-wheel-glyph">{s.symbol}</span>
            </div>
          );
        })}
      </div>

      {/* Inner ring */}
      <div className="zodiac-wheel-inner" />

      {/* Center */}
      <div className="zodiac-wheel-center">
        <span className="zodiac-wheel-emoji">✦</span>
      </div>
    </div>
  );
}
