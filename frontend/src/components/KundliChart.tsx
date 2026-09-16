'use client';

import { useMemo } from 'react';

const RASHI_NAMES = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'
];

const PLANET_ABBR: Record<string, string> = {
  Sun: 'Su', Moon: 'Mo', Mercury: 'Me', Venus: 'Ve', Mars: 'Ma',
  Jupiter: 'Ju', Saturn: 'Sa', Uranus: 'Ur', Neptune: 'Ne', Pluto: 'Pl',
  Rahu: 'Ra', Ketu: 'Ke'
};

// Anticlockwise house order from Lagna at top
// Each house: clip-path polygon vertices as [x%, y%]
const HOUSE_CLIP: Record<number, string> = {
  1: '50% 0%, 75% 25%, 50% 50%, 25% 25%',           // Top rhombus (Lagna)
  2: '0% 0%, 25% 25%, 50% 0%',                       // Upper-left triangle
  3: '0% 0%, 0% 50%, 25% 25%',                       // Left-upper triangle
  4: '0% 50%, 25% 25%, 50% 50%, 25% 75%',           // Left rhombus
  5: '0% 100%, 25% 75%, 0% 50%',                     // Left-lower triangle
  6: '0% 100%, 50% 100%, 25% 75%',                   // Bottom-left triangle
  7: '50% 100%, 25% 75%, 50% 50%, 75% 75%',         // Bottom rhombus
  8: '100% 100%, 75% 75%, 50% 100%',                 // Bottom-right triangle
  9: '100% 100%, 100% 50%, 75% 75%',                 // Right-lower triangle
  10: '100% 50%, 75% 75%, 50% 50%, 75% 25%',        // Right rhombus
  11: '100% 0%, 75% 25%, 100% 50%',                  // Right-upper triangle
  12: '100% 0%, 50% 0%, 75% 25%'                     // Upper-right triangle
};

// Centroid positions for text placement
const HOUSE_CENTROID: Record<number, [number, number]> = {
  1: [50.0, 25.0],   2: [25.0, 8.3],    3: [8.3, 25.0],
  4: [25.0, 50.0],   5: [8.3, 75.0],    6: [25.0, 91.7],
  7: [50.0, 75.0],   8: [75.0, 91.7],   9: [91.7, 75.0],
  10: [75.0, 50.0],  11: [91.7, 25.0],  12: [75.0, 8.3]
};

// Alternating house fill colours (dark theme)
const HOUSE_FILLS: Record<number, string> = {
  1: '#0d2040', 2: '#091628', 3: '#0d2040',
  4: '#091628', 5: '#0d2040', 6: '#091628',
  7: '#0d2040', 8: '#091628', 9: '#0d2040',
  10: '#091628', 11: '#0d2040', 12: '#091628'
};

interface KundliChartProps {
  chart: Record<string, { sign: number; planets: string[] }>;
  ascSign: number;
}

export default function KundliChart({ chart, ascSign }: KundliChartProps) {
  const houseContents = useMemo(() => {
    const ascSignIdx = ascSign; // 0-based index
    const contents: Array<{
      houseNum: number;
      rashiNum: number;
      rashiName: string;
      planets: string[];
      isAsc: boolean;
    }> = [];

    for (let h = 1; h <= 12; h++) {
      // Calculate which rashi (sign) falls in this house
      const rashiIdx = ((ascSignIdx + (h - 1)) % 12);
      const rashiNum = rashiIdx + 1; // 1-based
      const chartKey = String(h);
      const houseData = chart[chartKey];

      contents.push({
        houseNum: h,
        rashiNum,
        rashiName: RASHI_NAMES[rashiIdx],
        planets: houseData?.planets || [],
        isAsc: h === 1
      });
    }

    return contents;
  }, [chart, ascSign]);

  return (
    <div className="bg-white rounded-xl shadow-md p-6">
      <h2 className="text-xl font-bold text-gray-800 mb-4">Birth Chart (Kundli)</h2>
      <div className="flex flex-col items-center gap-4">
        {/* Chart */}
        <div
          className="relative border-2 border-amber-700 bg-[#07111f]"
          style={{ width: '100%', maxWidth: 360, aspectRatio: '1 / 1', containerType: 'inline-size' }}
        >
          {/* 1. House fill cells */}
          {houseContents.map((house) => (
            <div
              key={house.houseNum}
              className="absolute inset-0"
              style={{
                clipPath: `polygon(${HOUSE_CLIP[house.houseNum]})`,
                backgroundColor: HOUSE_FILLS[house.houseNum]
              }}
            />
          ))}

          {/* 2. SVG overlay: diamond + diagonals */}
          <svg
            viewBox="0 0 400 400"
            className="absolute inset-0 w-full h-full pointer-events-none"
            aria-hidden="true"
          >
            {/* Inner diamond */}
            <polygon
              points="200,0 400,200 200,400 0,200"
              fill="none"
              stroke="#c9a84c"
              strokeWidth="1.5"
            />
            {/* Diagonal TL → BR */}
            <line x1="0" y1="0" x2="400" y2="400" stroke="#c9a84c" strokeWidth="1.5" />
            {/* Diagonal TR → BL */}
            <line x1="400" y1="0" x2="0" y2="400" stroke="#c9a84c" strokeWidth="1.5" />
          </svg>

          {/* 3. Text labels in each house */}
          {houseContents.map((house) => {
            const [cx, cy] = HOUSE_CENTROID[house.houseNum];
            return (
              <div
                key={`text-${house.houseNum}`}
                className="absolute text-center pointer-events-none leading-tight"
                style={{
                  left: `${cx}%`,
                  top: `${cy}%`,
                  transform: 'translate(-50%, -50%)'
                }}
              >
                {/* Rashi number */}
                <div
                  className="text-white font-semibold"
                  style={{ fontSize: 'max(10px, 3.4cqi)', fontFamily: 'Inter, sans-serif', lineHeight: 1 }}
                >
                  {house.rashiNum}
                </div>

                {/* House number (small) */}
                <div
                  className="text-amber-600/60"
                  style={{ fontSize: 'max(6px, 1.5cqi)', fontFamily: 'Inter, sans-serif' }}
                >
                  H{house.houseNum}
                </div>

                {/* Ascendant label */}
                {house.isAsc && (
                  <div
                    className="text-amber-600 uppercase tracking-wider"
                    style={{ fontSize: 'max(5px, 1.5cqi)', fontFamily: 'Inter, sans-serif' }}
                  >
                    Lagna
                  </div>
                )}

                {/* Planets */}
                {house.planets.map((planet, i) => {
                  const abbr = PLANET_ABBR[planet] || planet.slice(0, 2);
                  return (
                    <div
                      key={i}
                      className="text-gray-100"
                      style={{ fontSize: 'max(7px, 2.5cqi)', fontFamily: 'Inter, sans-serif', whiteSpace: 'nowrap' }}
                    >
                      {abbr}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Planet legend */}
        <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 text-xs">
          {[
            { name: 'Sun', color: 'text-yellow-400' },
            { name: 'Moon', color: 'text-gray-300' },
            { name: 'Mars', color: 'text-red-400' },
            { name: 'Mercury', color: 'text-green-400' },
            { name: 'Jupiter', color: 'text-blue-400' },
            { name: 'Venus', color: 'text-pink-300' },
            { name: 'Saturn', color: 'text-gray-500' },
            { name: 'Rahu', color: 'text-slate-400' },
            { name: 'Ketu', color: 'text-amber-600' }
          ].map(p => (
            <span key={p.name} className={`flex items-center gap-1 ${p.color}`}>
              <span className="w-2 h-2 rounded-full bg-current inline-block" />
              {PLANET_ABBR[p.name]} = {p.name}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
