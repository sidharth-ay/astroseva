"use client";

import { KundliResponse } from "@/lib/api";

const SIGN_NAMES = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"];

interface Props {
  chart: KundliResponse["chart"];
  ascSign: number;
}

export default function KundliChart({ chart, ascSign }: Props) {
  const getHousePlanets = (n: number) => {
    const entry = chart[String(n)];
    return entry?.planets || [];
  };
  const houseNums = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  const grid = [
    getHousePlanets(10), getHousePlanets(11), getHousePlanets(12), getHousePlanets(1),
    getHousePlanets(9), [], [], getHousePlanets(2),
    getHousePlanets(8), [], [], getHousePlanets(3),
    getHousePlanets(7), getHousePlanets(6), getHousePlanets(5), getHousePlanets(4),
  ];
  const gridLabels = [10, 11, 12, 1, 9, 0, 0, 2, 8, 0, 0, 3, 7, 6, 5, 4];

  const planetColor = (p: string) => {
    const colors: Record<string, string> = {
      Sun: "#f59e0b", Moon: "#94a3b8", Mars: "#ef4444", Mercury: "#22c55e",
      Jupiter: "#a78bfa", Venus: "#ec4899", Saturn: "#6366f1",
      Rahu: "#64748b", Ketu: "#78716c",
    };
    return colors[p] || "var(--text-primary)";
  };

  return (
    <div className="glass-card p-6 animate-fade-in-up">
      <h2 className="text-xl font-bold mb-4">Kundli Chart</h2>
      <div className="max-w-[420px] mx-auto">
        <div className="grid grid-cols-4 gap-0" style={{ border: "2px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
          {grid.map((planets, idx) => {
            const num = gridLabels[idx];
            const isCenter = idx === 5 || idx === 6 || idx === 9 || idx === 10;
            return (
              <div key={idx} className="aspect-square p-1.5 flex flex-col justify-between relative"
                style={{
                  border: "1px solid var(--border)",
                  background: isCenter ? "rgba(147,51,234,0.04)" : "transparent",
                }}>
                {num > 0 && (
                  <div className="text-[10px] font-medium" style={{ color: "var(--accent)" }}>
                    {num === 1 ? "Asc" : num}
                    <span className="hidden sm:inline text-[9px] ml-1" style={{ color: "var(--text-secondary)" }}>
                      {SIGN_NAMES[(ascSign + num - 1) % 12]}
                    </span>
                  </div>
                )}
                <div className="flex flex-wrap gap-0.5 justify-center items-center mt-auto">
                  {planets.map((p: string) => (
                    <span key={p} className="text-[10px] font-bold px-1 rounded" style={{ color: planetColor(p), background: `${planetColor(p)}15` }}>
                      {p}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
