"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { planetColors } from "@/components/icons/PlanetIcons";

interface KundliChartProps {
  chart: Record<string, { sign: number; planets: string[] }>;
  ascSign: number;
}

const SIGN_NAMES = ["Aries","Taurus","Gemini","Cancer","Leo","Virgo","Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces"];
const SIGN_SHORT = ["Ar","Ta","Ge","Cn","Le","Vi","Li","Sc","Sg","Cp","Aq","Pi"];

// North Indian chart: fixed house positions, signs rotate from ascendant.
// Outer square (0,0)-(400,400). Diamond midpoints: top(200,0), right(400,200), bottom(200,400), left(0,200).
// Center: (200,200). Lines from center to each corner of the square.
// 12 triangular house regions:
const HOUSES: { house: number; points: string; labelX: number; labelY: number; textAnchor: "start" | "middle" | "end" }[] = [
  // Top (House 1 — Ascendant)
  { house: 1, points: "200,0 300,100 100,100", labelX: 200, labelY: 58, textAnchor: "middle" },
  // Upper-right (House 2)
  { house: 2, points: "300,100 400,0 400,200", labelX: 365, labelY: 100, textAnchor: "end" },
  // Right-upper (House 3)
  { house: 3, points: "300,100 400,200 300,300", labelX: 355, labelY: 200, textAnchor: "end" },
  // Right (House 4)
  { house: 4, points: "400,200 300,300 400,400", labelX: 365, labelY: 310, textAnchor: "end" },
  // Lower-right (House 5)
  { house: 5, points: "300,300 200,400 400,400", labelX: 310, labelY: 365, textAnchor: "end" },
  // Bottom (House 6)
  { house: 6, points: "200,400 300,300 100,300", labelX: 200, labelY: 358, textAnchor: "middle" },
  // Lower-left (House 7 — Descendant)
  { house: 7, points: "200,400 100,300 0,400", labelX: 100, labelY: 365, textAnchor: "start" },
  // Left-lower (House 8)
  { house: 8, points: "100,300 0,400 0,200", labelX: 50, labelY: 310, textAnchor: "start" },
  // Left-upper (House 9)
  { house: 9, points: "100,300 0,200 100,100", labelX: 50, labelY: 200, textAnchor: "start" },
  // Left (House 10 — MC)
  { house: 10, points: "0,200 100,100 0,0", labelX: 50, labelY: 100, textAnchor: "start" },
  // Upper-left (House 11)
  { house: 11, points: "100,100 0,0 200,0", labelX: 100, labelY: 58, textAnchor: "start" },
  // Top-left (House 12)
  { house: 12, points: "100,100 200,0 0,0", labelX: 55, labelY: 58, textAnchor: "start" },
];

// Center diamond lines
const DIAMOND = "200,0 400,200 200,400 0,200";
// Center cross lines
const CENTER_LINES = [
  "200,0 200,400",   // vertical
  "0,200 400,200",   // horizontal
  "0,0 400,400",     // diagonal top-left to bottom-right
  "400,0 0,400",     // diagonal top-right to bottom-left
];

export default function KundliChart({ chart, ascSign }: KundliChartProps) {
  const [mounted, setMounted] = useState(false);
  const reduced = useReducedMotion();

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 100);
    return () => clearTimeout(t);
  }, []);

  const lineDur = reduced ? 0 : 0.8;
  const labelDur = reduced ? 0 : 0.3;

  return (
    <div className="w-full max-w-[400px] mx-auto">
      <svg viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto">
        {/* Background */}
        <rect x="0" y="0" width="400" height="400" fill="#0F0E1A" rx="4" />

        {/* House triangles */}
        {HOUSES.map((h) => {
          const signIdx = chart[String(h.house)]?.sign ?? 0;
          const planets = chart[String(h.house)]?.planets ?? [];
          const isAsc = signIdx === ascSign && h.house === 1;

          return (
            <g key={h.house}>
              <motion.polygon
                points={h.points}
                fill={isAsc ? "rgba(214, 184, 117, 0.06)" : "transparent"}
                stroke="rgba(166, 165, 184, 0.12)"
                strokeWidth="0.8"
                initial={reduced ? undefined : { opacity: 0 }}
                animate={mounted ? { opacity: 1 } : undefined}
                transition={{ duration: 0.4, delay: h.house * 0.03 }}
              />

              {/* House number */}
              <motion.text
                x={h.labelX}
                y={h.labelY}
                textAnchor={h.textAnchor}
                fontSize="8"
                fill="rgba(166, 165, 184, 0.35)"
                fontFamily="inherit"
                initial={reduced ? undefined : { opacity: 0 }}
                animate={mounted ? { opacity: 1 } : undefined}
                transition={{ duration: labelDur, delay: 0.6 + h.house * 0.04 }}
              >
                {h.house}{isAsc ? " Asc" : ""}
              </motion.text>

              {/* Sign abbreviation */}
              <motion.text
                x={h.labelX}
                y={h.labelY + 12}
                textAnchor={h.textAnchor}
                fontSize="9"
                fill="rgba(166, 165, 184, 0.55)"
                fontFamily="inherit"
                fontWeight="500"
                initial={reduced ? undefined : { opacity: 0 }}
                animate={mounted ? { opacity: 1 } : undefined}
                transition={{ duration: labelDur, delay: 0.7 + h.house * 0.04 }}
              >
                {SIGN_SHORT[signIdx]}
              </motion.text>

              {/* Planets */}
              {planets.map((p, pi) => (
                <motion.text
                  key={p}
                  x={h.labelX}
                  y={h.labelY + 24 + pi * 11}
                  textAnchor={h.textAnchor}
                  fontSize="8.5"
                  fill={planetColors[p] || "#A6A5B8"}
                  fontFamily="inherit"
                  fontWeight="600"
                  initial={reduced ? undefined : { opacity: 0 }}
                  animate={mounted ? { opacity: 1 } : undefined}
                  transition={{ duration: labelDur, delay: 0.9 + h.house * 0.04 + pi * 0.05 }}
                >
                  {p.substring(0, 3)}
                </motion.text>
              ))}
            </g>
          );
        })}

        {/* Center diamond — animated line drawing */}
        <motion.polygon
          points={DIAMOND}
          fill="none"
          stroke="rgba(166, 165, 184, 0.15)"
          strokeWidth="1"
          initial={reduced ? undefined : { pathLength: 0, opacity: 0 }}
          animate={mounted ? { pathLength: 1, opacity: 1 } : undefined}
          transition={{ duration: lineDur, ease: [0.16, 1, 0.3, 1] }}
        />

        {/* Center cross lines — animated line drawing */}
        {CENTER_LINES.map((line, i) => {
          const [x1, y1, x2, y2] = line.split(" ").join(",").split(",").map(Number);
          return (
            <motion.line
              key={i}
              x1={x1} y1={y1} x2={x2} y2={y2}
              stroke="rgba(166, 165, 184, 0.10)"
              strokeWidth="0.6"
              initial={reduced ? undefined : { pathLength: 0, opacity: 0 }}
              animate={mounted ? { pathLength: 1, opacity: 1 } : undefined}
              transition={{ duration: lineDur * 0.6, delay: 0.3 + i * 0.1, ease: [0.16, 1, 0.3, 1] }}
            />
          );
        })}

        {/* Outer frame — animated line drawing */}
        <motion.rect
          x="0.5" y="0.5" width="399" height="399"
          fill="none"
          stroke="rgba(166, 165, 184, 0.15)"
          strokeWidth="1"
          rx="4"
          initial={reduced ? undefined : { pathLength: 0, opacity: 0 }}
          animate={mounted ? { pathLength: 1, opacity: 1 } : undefined}
          transition={{ duration: lineDur * 1.2, ease: [0.16, 1, 0.3, 1] }}
        />
      </svg>
    </div>
  );
}
