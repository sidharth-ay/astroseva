"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { planetColors } from "@/components/icons/PlanetIcons";

interface ChartPlanet {
  planet: string;
  sign: number;
  sign_degree: number;
  retrograde: boolean;
  dignity?: string;
}

interface KundliChartProps {
  chart: Record<string, { sign: number; planets: string[] }>;
  ascSign: number;
  chartStyle?: "north" | "south";
  /** Full planet list, needed for degrees and retrograde marks. */
  planets?: ChartPlanet[];
}

const SIGN_NAMES = ["Aries","Taurus","Gemini","Cancer","Leo","Virgo","Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces"];

// AstroSage 2-letter graha codes. The chart shows these nine only; outer
// planets stay in the positions table where their data is actually useful.
const GRAHA_CODE: Record<string, string> = {
  Sun: "Su", Moon: "Mo", Mars: "Ma", Mercury: "Me",
  Jupiter: "Ju", Venus: "Ve", Saturn: "Sa", Rahu: "Ra", Ketu: "Ke",
};
const CHART_GRAHAS = Object.keys(GRAHA_CODE);

// North Indian chart: HOUSES ARE FIXED, SIGNS ROTATE.
// Outer square (0,0)-(400,400), the centre diamond joining the four side
// midpoints, and both corner-to-corner diagonals. The diagonals cut each
// diamond edge at its midpoint and cross at the centre (200,200), which is
// what splits the interior into 4 diamonds and the border into 8 triangles.
// Only the two diagonals are drawn - there is no vertical/horizontal cross.
//
// House 1 is always the top-centre diamond and counting runs ANTICLOCKWISE,
// so the 2nd house is the top-left triangle and the MC (10th) the right
// diamond. Verified by area: the 12 cells tile the 400x400 frame exactly.
const HOUSES: { house: number; points: string; labelX: number; labelY: number; textAnchor: "start" | "middle" | "end" }[] = [
  // Top-centre diamond — 1st house (Ascendant)
  { house: 1, points: "100,100 200,0 300,100 200,200", labelX: 200, labelY: 45, textAnchor: "middle" },
  // Top-left triangle — 2nd
  { house: 2, points: "0,0 200,0 100,100", labelX: 100, labelY: 33, textAnchor: "middle" },
  // Left-upper triangle — 3rd
  { house: 3, points: "0,0 0,200 100,100", labelX: 33, labelY: 105, textAnchor: "middle" },
  // Left-centre diamond — 4th (IC)
  { house: 4, points: "0,200 100,100 200,200 100,300", labelX: 100, labelY: 190, textAnchor: "middle" },
  // Left-lower triangle — 5th
  { house: 5, points: "0,200 0,400 100,300", labelX: 33, labelY: 300, textAnchor: "middle" },
  // Bottom-left triangle — 6th
  { house: 6, points: "0,400 200,400 100,300", labelX: 100, labelY: 368, textAnchor: "middle" },
  // Bottom-centre diamond — 7th (Descendant)
  { house: 7, points: "200,400 100,300 200,200 300,300", labelX: 200, labelY: 240, textAnchor: "middle" },
  // Bottom-right triangle — 8th
  { house: 8, points: "200,400 400,400 300,300", labelX: 300, labelY: 368, textAnchor: "middle" },
  // Right-lower triangle — 9th
  { house: 9, points: "400,400 400,200 300,300", labelX: 367, labelY: 300, textAnchor: "middle" },
  // Right-centre diamond — 10th (MC)
  { house: 10, points: "400,200 300,100 200,200 300,300", labelX: 300, labelY: 190, textAnchor: "middle" },
  // Right-upper triangle — 11th
  { house: 11, points: "400,200 400,0 300,100", labelX: 367, labelY: 105, textAnchor: "middle" },
  // Top-right triangle — 12th
  { house: 12, points: "400,0 200,0 300,100", labelX: 300, labelY: 33, textAnchor: "middle" },
];

// Center diamond lines
const DIAMOND = "200,0 400,200 200,400 0,200";
// Only the two corner-to-corner diagonals. A North Indian chart has no
// vertical/horizontal cross - the diagonals alone split the diamond into 4.
const CENTER_LINES = [
  "0,0 400,400",     // top-left to bottom-right
  "400,0 0,400",     // top-right to bottom-left
];

function detailBySign(planets: ChartPlanet[]): Map<number, ChartPlanet[]> {
  const m = new Map<number, ChartPlanet[]>();
  const order = (n: string) => (n === "Sun" ? 0 : n === "Moon" ? 1 : 2);
  for (const p of planets) {
    if (!CHART_GRAHAS.includes(p.planet)) continue;
    if (!m.has(p.sign)) m.set(p.sign, []);
    m.get(p.sign)!.push(p);
  }
  for (const list of m.values()) list.sort((a, b) => order(a.planet) - order(b.planet));
  return m;
}

export default function KundliChart({ chart, ascSign, chartStyle = "north", planets = [] }: KundliChartProps) {
  const [mounted, setMounted] = useState(false);
  const reducedRaw = useReducedMotion();
  const reduced = reducedRaw ?? false;

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 100);
    return () => clearTimeout(t);
  }, []);

  // Enrich the per-house planet-name list with degree + retrograde when the
  // full planet payload is supplied. AstroSage shows both in the cell.
  const detailByHouse = new Map<number, ChartPlanet[]>();
  for (const p of planets) {
    if (!CHART_GRAHAS.includes(p.planet)) continue;
    const house = (p.sign - ascSign + 12) % 12 + 1;
    if (!detailByHouse.has(house)) detailByHouse.set(house, []);
    detailByHouse.get(house)!.push(p);
  }
  // Sun first, then Moon, then the rest by sign — AstroSage's cell order.
  const order = (n: string) => (n === "Sun" ? 0 : n === "Moon" ? 1 : 2);
  for (const list of detailByHouse.values()) {
    list.sort((a, b) => order(a.planet) - order(b.planet));
  }

  if (chartStyle === "south") {
    return <SouthIndianChart chart={chart} ascSign={ascSign} mounted={mounted} reduced={reduced} detailBySign={detailBySign(planets)} />;
  }

  const lineDur = reduced ? 0 : 0.8;
  const labelDur = reduced ? 0 : 0.3;

  return (
    <div className="w-full max-w-[400px] mx-auto">
      <svg id="kundli-chart-svg" viewBox="0 0 400 400" width="400" height="400" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto">
        {/* Background */}
        <rect x="0" y="0" width="400" height="400" fill="#0F0E1A" rx="4" />

        {/* House cells */}
        {HOUSES.map((h) => {
          const signIdx = chart[String(h.house)]?.sign ?? 0;
          const names = chart[String(h.house)]?.planets ?? [];
          const details = detailByHouse.get(h.house) ?? [];
          const detailFor = (n: string) => details.find((d) => d.planet === n);
          // Fall back to names when no detail payload was passed.
          const cell = details.length
            ? details.map((d) => d.planet)
            : names;
          const isAsc = h.house === 1;

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

              {/* Sign number — AstroSage writes the sign number in each cell,
                  since the houses are fixed and the signs are what move. */}
              <motion.text
                x={h.labelX}
                y={h.labelY}
                textAnchor={h.textAnchor}
                fontSize="11"
                fill="rgba(230, 201, 160, 0.85)"
                fontFamily="inherit"
                fontWeight="700"
                initial={reduced ? undefined : { opacity: 0 }}
                animate={mounted ? { opacity: 1 } : undefined}
                transition={{ duration: labelDur, delay: 0.6 + h.house * 0.04 }}
              >
                {signIdx + 1}
              </motion.text>

              {/* House number, marked on the Ascendant */}
              <motion.text
                x={h.labelX}
                y={h.labelY + 11}
                textAnchor={h.textAnchor}
                fontSize="7.5"
                fill={isAsc ? "rgba(230, 201, 160, 0.9)" : "rgba(166, 165, 184, 0.35)"}
                fontFamily="inherit"
                initial={reduced ? undefined : { opacity: 0 }}
                animate={mounted ? { opacity: 1 } : undefined}
                transition={{ duration: labelDur, delay: 0.7 + h.house * 0.04 }}
              >
                {isAsc ? "As" : h.house}
              </motion.text>

              {/* Grahas: 2-letter AstroSage code, degree, retrograde mark */}
              {cell.map((p, pi) => {
                const d = detailFor(p);
                const code = GRAHA_CODE[p];
                if (!code) return null;
                return (
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
                    {code}
                    {d ? `${Math.floor(d.sign_degree)}°` : ""}
                    {d?.retrograde ? " ℞" : ""}
                  </motion.text>
                );
              })}
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

// South Indian chart: 4x4 grid with fixed sign positions.
// Grid cells [row][col] where row 0 = top, col 0 = left.
// Sign indices: 0=Aries, 1=Taurus, ... 11=Pisces
const SOUTH_GRID: (number | null)[][] = [
  [11, 0, 1, 2],   // Pisces, Aries, Taurus, Gemini
  [10, null, null, 3],  // Aquarius, (empty), (empty), Cancer
  [9, null, null, 4],   // Capricorn, (empty), (empty), Leo
  [8, 7, 6, 5],    // Sagittarius, Scorpio, Libra, Virgo
];

const SOUTH_CELL_SIZE = 100;
const SOUTH_PADDING = 20;

function SouthIndianChart({
  chart,
  ascSign,
  mounted,
  reduced,
  detailBySign,
}: {
  chart: Record<string, { sign: number; planets: string[] }>;
  ascSign: number;
  mounted: boolean;
  reduced: boolean;
  detailBySign: Map<number, ChartPlanet[]>;
}) {
  const labelDur = reduced ? 0 : 0.3;

  // Build a map: sign_index -> planets
  const signPlanets: Record<number, string[]> = {};
  for (const houseStr of Object.keys(chart)) {
    const entry = chart[houseStr];
    if (entry?.planets?.length) {
      signPlanets[entry.sign] = entry.planets;
    }
  }

  return (
    <div className="w-full max-w-[400px] mx-auto">
      <svg id="kundli-chart-svg-south" viewBox="0 0 440 440" width="440" height="440" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto">
        {/* Background */}
        <rect x="0" y="0" width="440" height="440" fill="#0F0E1A" rx="4" />

        {SOUTH_GRID.map((row, ri) =>
          row.map((signIdx, ci) => {
            if (signIdx === null) return null;
            const x = SOUTH_PADDING + ci * SOUTH_CELL_SIZE;
            const y = SOUTH_PADDING + ri * SOUTH_CELL_SIZE;
            const names = signPlanets[signIdx] ?? [];
            const details = detailBySign.get(signIdx) ?? [];
            const cell = details.length ? details.map((d) => d.planet) : names;
            const isAsc = signIdx === ascSign;

            return (
              <g key={`${ri}-${ci}`}>
                <motion.rect
                  x={x}
                  y={y}
                  width={SOUTH_CELL_SIZE}
                  height={SOUTH_CELL_SIZE}
                  fill={isAsc ? "rgba(214, 184, 117, 0.06)" : "transparent"}
                  stroke="rgba(166, 165, 184, 0.12)"
                  strokeWidth="0.8"
                  initial={reduced ? undefined : { opacity: 0 }}
                  animate={mounted ? { opacity: 1 } : undefined}
                  transition={{ duration: 0.4, delay: (ri * 4 + ci) * 0.02 }}
                />

                {/* Sign name label (top of cell), marked when ascendant */}
                <motion.text
                  x={x + 4}
                  y={y + 12}
                  fontSize="8"
                  fill={isAsc ? "rgba(230, 201, 160, 0.9)" : "rgba(166, 165, 184, 0.45)"}
                  fontFamily="inherit"
                  fontWeight={isAsc ? "700" : "400"}
                  initial={reduced ? undefined : { opacity: 0 }}
                  animate={mounted ? { opacity: 1 } : undefined}
                  transition={{ duration: labelDur, delay: 0.4 + (ri * 4 + ci) * 0.03 }}
                >
                  {SIGN_NAMES[signIdx]}{isAsc ? " (As)" : ""}
                </motion.text>

                {/* Grahas: 2-letter AstroSage code, degree, retrograde mark */}
                {cell.map((p, pi) => {
                  const d = (detailBySign.get(signIdx) ?? []).find((x) => x.planet === p);
                  const code = GRAHA_CODE[p];
                  if (!code) return null;
                  return (
                    <motion.text
                      key={p}
                      x={x + SOUTH_CELL_SIZE / 2}
                      y={y + SOUTH_CELL_SIZE / 2 + 4 + pi * 12}
                      textAnchor="middle"
                      fontSize="9"
                      fill={planetColors[p] || "#A6A5B8"}
                      fontFamily="inherit"
                      fontWeight="600"
                      initial={reduced ? undefined : { opacity: 0 }}
                      animate={mounted ? { opacity: 1 } : undefined}
                      transition={{ duration: labelDur, delay: 0.6 + (ri * 4 + ci) * 0.03 + pi * 0.04 }}
                    >
                      {code}
                      {d ? `${Math.floor(d.sign_degree)}°` : ""}
                      {d?.retrograde ? " ℞" : ""}
                    </motion.text>
                  );
                })}
              </g>
            );
          })
        )}

        {/* Outer frame */}
        <motion.rect
          x={SOUTH_PADDING - 0.5}
          y={SOUTH_PADDING - 0.5}
          width={SOUTH_CELL_SIZE * 4 + 1}
          height={SOUTH_CELL_SIZE * 4 + 1}
          fill="none"
          stroke="rgba(166, 165, 184, 0.15)"
          strokeWidth="1"
          rx="4"
          initial={reduced ? undefined : { pathLength: 0, opacity: 0 }}
          animate={mounted ? { pathLength: 1, opacity: 1 } : undefined}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        />
      </svg>
    </div>
  );
}
