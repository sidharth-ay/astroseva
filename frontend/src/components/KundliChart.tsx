"use client";

import { planetColors } from "@/components/icons/PlanetIcons";

interface KundliChartProps {
  chart: Record<string, { sign: number; planets: string[] }>;
  ascSign: number;
}

const SIGN_NAMES = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"];

const GRID = [
  { house: "1", row: "row-start-1 col-start-2", empty: false },
  { house: "2", row: "row-start-1 col-start-3", empty: false },
  { house: "3", row: "row-start-1 col-start-4", empty: false },
  { house: "12", row: "row-start-2 col-start-1", empty: false },
  { house: null, row: "row-start-2 col-start-2", empty: true },
  { house: null, row: "row-start-2 col-start-3", empty: true },
  { house: "4", row: "row-start-2 col-start-4", empty: false },
  { house: "11", row: "row-start-3 col-start-1", empty: false },
  { house: null, row: "row-start-3 col-start-2", empty: true },
  { house: null, row: "row-start-3 col-start-3", empty: true },
  { house: "5", row: "row-start-3 col-start-4", empty: false },
  { house: "10", row: "row-start-4 col-start-1", empty: false },
  { house: "9", row: "row-start-4 col-start-2", empty: false },
  { house: "8", row: "row-start-4 col-start-3", empty: false },
  { house: "7", row: "row-start-4 col-start-4", empty: false },
  { house: "6", row: "row-start-5 col-start-1", empty: false },
  { house: null, row: "row-start-5 col-start-2", empty: true },
  { house: null, row: "row-start-5 col-start-3", empty: true },
  { house: null, row: "row-start-5 col-start-4", empty: true },
];

export default function KundliChart({ chart, ascSign }: KundliChartProps) {
  return (
    <div className="w-full max-w-[380px] mx-auto">
      <div className="grid grid-cols-4 gap-px" style={{ background: "var(--border)" }}>
        {GRID.map((cell, i) => {
          if (cell.empty) {
            return <div key={i} className={`${cell.row} aspect-square`} style={{ background: "var(--bg-primary)" }} />;
          }
          const houseNum = cell.house!;
          const signIdx = chart[houseNum]?.sign ?? 0;
          const planets = chart[houseNum]?.planets ?? [];
          const isAsc = signIdx === ascSign;

          return (
            <div key={i}
              className={`${cell.row} aspect-square p-2 flex flex-col justify-between`}
              style={{ background: isAsc ? "rgba(181, 164, 244, 0.06)" : "var(--deep-indigo)" }}
            >
              <div className="text-[10px] font-medium" style={{ color: "var(--text-tertiary)" }}>
                {houseNum}
                {isAsc && <span className="ml-1" style={{ color: "var(--champagne)" }}>Asc</span>}
              </div>
              <div className="text-[9px] font-medium mb-0.5" style={{ color: "var(--text-secondary)" }}>
                {SIGN_NAMES[signIdx]}
              </div>
              <div className="flex flex-wrap gap-0.5">
                {planets.map((p) => (
                  <span key={p} className="text-[8px] font-semibold px-1 py-0.5 rounded"
                    style={{
                      background: `${planetColors[p] || "var(--silver)"}15`,
                      color: planetColors[p] || "var(--silver)",
                    }}>
                    {p.substring(0, 3)}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
