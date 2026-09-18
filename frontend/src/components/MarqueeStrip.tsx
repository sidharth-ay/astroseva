"use client";

const items = [
  { icon: "\u{1F52E}", label: "Kundli", color: "#f97316" },
  { icon: "\u{1F492}", label: "Matching", color: "#ec4899" },
  { icon: "\u2728", label: "Predictions", color: "#b48eff" },
  { icon: "\u2B50", label: "Horoscope", color: "#fbbf24" },
  { icon: "\u{1F522}", label: "Numerology", color: "#facc15" },
  { icon: "\u{1F570}\uFE0F", label: "Panchang", color: "#34d399" },
  { icon: "\u{1F52E}", label: "Doshas", color: "#ef4444" },
  { icon: "\uD83D\uDCAC", label: "AI Chat", color: "#60a5fa" },
];

export default function MarqueeStrip() {
  const doubled = [...items, ...items];

  return (
    <div className="py-10 overflow-hidden" style={{ borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)" }}>
      <div className="marquee-track">
        {doubled.map((item, i) => (
          <div key={`${item.label}-${i}`} className="marquee-item">
            <div className="marquee-item-inner" style={{ borderColor: `${item.color}25` }}>
              <span className="text-2xl" style={{ filter: `drop-shadow(0 0 8px ${item.color}40)` }}>{item.icon}</span>
              <span className="text-sm font-medium" style={{ color: item.color }}>{item.label}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
