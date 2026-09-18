"use client";

import { useState, useEffect, useCallback } from "react";
import { api, HoroscopeResponse } from "@/lib/api";

const zodiacData: Record<string, { symbol: string; element: string }> = {
  aries: { symbol: "\u2648", element: "fire" },
  taurus: { symbol: "\u2649", element: "earth" },
  gemini: { symbol: "\u264A", element: "air" },
  cancer: { symbol: "\u264B", element: "water" },
  leo: { symbol: "\u264C", element: "fire" },
  virgo: { symbol: "\u264D", element: "earth" },
  libra: { symbol: "\u264E", element: "air" },
  scorpio: { symbol: "\u264F", element: "water" },
  sagittarius: { symbol: "\u2650", element: "fire" },
  capricorn: { symbol: "\u2651", element: "earth" },
  aquarius: { symbol: "\u2652", element: "air" },
  pisces: { symbol: "\u2653", element: "water" },
};

const elementGradients: Record<string, string> = {
  fire: "linear-gradient(135deg, rgba(239,68,68,0.12), rgba(251,191,36,0.08))",
  earth: "linear-gradient(135deg, rgba(34,197,94,0.12), rgba(132,204,22,0.08))",
  air: "linear-gradient(135deg, rgba(96,165,250,0.12), rgba(147,197,253,0.08))",
  water: "linear-gradient(135deg, rgba(6,182,212,0.12), rgba(34,211,238,0.08))",
};

const ratingLabels = ["", "Poor", "Fair", "Good", "Very Good", "Excellent"];

interface HoroscopePopupProps {
  sign: string;
  onClose: () => void;
}

export default function HoroscopePopup({ sign, onClose }: HoroscopePopupProps) {
  const [result, setResult] = useState<HoroscopeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const data = zodiacData[sign] || zodiacData.aries;

  useEffect(() => {
    setLoading(true);
    setError(false);
    api.getDailyHoroscope(sign)
      .then(setResult)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [sign]);

  const handleBackdrop = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  }, [onClose]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return (
    <div className="popup-overlay" onClick={handleBackdrop}>
      <div className="popup-content" onClick={(e) => e.stopPropagation()}>
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center transition-colors z-10"
          style={{ background: "rgba(255,255,255,0.06)", color: "var(--text-secondary)" }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.12)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; }}
        >
          &#x2715;
        </button>

        {/* Header */}
        <div className="text-center mb-6" style={{ background: elementGradients[data.element], borderRadius: "1rem", padding: "2rem 1.5rem" }}>
          <div className="text-6xl mb-3" style={{ filter: `drop-shadow(0 0 12px var(--accent-glow))` }}>
            {data.symbol}
          </div>
          <h2 className="text-2xl font-bold capitalize" style={{ color: "var(--gold)" }}>{sign}</h2>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
            {result?.date || "Today"} &bull; AI-powered
          </p>
        </div>

        {loading && (
          <div className="space-y-4">
            <div className="shimmer h-20 w-full" style={{ borderRadius: "0.75rem" }} />
            <div className="grid grid-cols-3 gap-3">
              {[0, 1, 2].map((i) => <div key={i} className="shimmer h-24 w-full" style={{ borderRadius: "0.75rem" }} />)}
            </div>
          </div>
        )}

        {error && (
          <div className="text-center py-8">
            <p className="text-lg mb-2">&#x26A0;&#xFE0F; Could not load horoscope</p>
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>Gemini API quota may be exhausted. Try again later.</p>
            <button onClick={onClose} className="glow-btn mt-4 text-sm px-4 py-2">Close</button>
          </div>
        )}

        {result && !loading && (
          <div className="animate-fade-in-up">
            {/* Prediction */}
            <p className="text-base leading-relaxed mb-6" style={{ color: "var(--text-primary)" }}>
              {result.prediction}
            </p>

            {/* Ratings */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              {([
                { label: "Love", icon: "\u2764\uFE0F", val: result.love_rating },
                { label: "Career", icon: "\uD83D\uDCBC", val: result.career_rating },
                { label: "Health", icon: "\uD83D\uDCAA", val: result.health_rating },
              ]).map((cat) => (
                <div key={cat.label} className="text-center p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)" }}>
                  <div className="text-lg mb-1">{cat.icon}</div>
                  <div className="text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>{cat.label}</div>
                  <div className="flex justify-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <span key={n} className="text-sm" style={{ color: n <= cat.val ? "var(--gold)" : "rgba(255,255,255,0.1)" }}>
                        {n <= cat.val ? "\u2605" : "\u2606"}
                      </span>
                    ))}
                  </div>
                  <div className="text-[10px] mt-1" style={{ color: "var(--text-secondary)" }}>{ratingLabels[cat.val]}</div>
                </div>
              ))}
            </div>

            {/* Lucky elements */}
            <div className="flex flex-wrap justify-center gap-2">
              <span className="px-3 py-1.5 rounded-lg text-xs" style={{ background: "rgba(180,142,255,0.08)", border: "1px solid rgba(180,142,255,0.15)" }}>
                <span style={{ color: "var(--text-secondary)" }}>Lucky Numbers: </span>
                <span className="font-semibold">{result.lucky_numbers.join(", ")}</span>
              </span>
              <span className="px-3 py-1.5 rounded-lg text-xs" style={{ background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.15)" }}>
                <span style={{ color: "var(--text-secondary)" }}>Lucky Color: </span>
                <span className="font-semibold" style={{ color: "var(--gold)" }}>{result.lucky_color}</span>
              </span>
            </div>

            {/* Full horoscope link */}
            <div className="text-center mt-6">
              <a href={`/horoscope?sign=${sign}`} className="text-sm font-medium transition-colors" style={{ color: "var(--accent)" }}
                onMouseEnter={(e) => { e.currentTarget.style.color = "var(--gold)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = "var(--accent)"; }}>
                View full horoscope page &rarr;
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
