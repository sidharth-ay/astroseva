"use client";

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

export default function ZodiacWheel() {
  return (
    <div className="zodiac-wheel-container">
      {/* Outer rotating ring */}
      <div className="zodiac-wheel-outer">
        {SIGNS.map((s, i) => {
          const angle = (i * 30) - 90;
          return (
            <div
              key={s.name}
              className="zodiac-wheel-symbol"
              style={{
                transform: `rotate(${angle}deg) translateX(170px) rotate(-${angle}deg)`,
                color: ELEMENT_COLORS[ELEMENTS[s.name.toLowerCase()]] || "var(--accent)",
              }}
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
