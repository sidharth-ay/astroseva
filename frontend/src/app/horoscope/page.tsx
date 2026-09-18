"use client";

import { useState, useEffect } from "react";
import { api, HoroscopeResponse } from "@/lib/api";
import { useScrollReveal } from "@/lib/useScrollReveal";

const zodiacSigns = [
  { sign: "aries", name: "Aries", symbol: "\u2648" }, { sign: "taurus", name: "Taurus", symbol: "\u2649" },
  { sign: "gemini", name: "Gemini", symbol: "\u264A" }, { sign: "cancer", name: "Cancer", symbol: "\u264B" },
  { sign: "leo", name: "Leo", symbol: "\u264C" }, { sign: "virgo", name: "Virgo", symbol: "\u264D" },
  { sign: "libra", name: "Libra", symbol: "\u264E" }, { sign: "scorpio", name: "Scorpio", symbol: "\u264F" },
  { sign: "sagittarius", name: "Sagittarius", symbol: "\u2650" }, { sign: "capricorn", name: "Capricorn", symbol: "\u2651" },
  { sign: "aquarius", name: "Aquarius", symbol: "\u2652" }, { sign: "pisces", name: "Pisces", symbol: "\u2653" },
];

const ratingLabels = ["", "Poor", "Fair", "Good", "Very Good", "Excellent"];

export default function HoroscopePage() {
  const headerRef = useScrollReveal();
  const selectorRef = useScrollReveal();
  const [sign, setSign] = useState("aries");
  const [result, setResult] = useState<HoroscopeResponse | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    api.getDailyHoroscope(sign)
      .then(setResult)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [sign]);

  const selected = zodiacSigns.find((z) => z.sign === sign);

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      <div ref={headerRef} className="scroll-reveal">
        <h1 className="text-3xl md:text-4xl font-bold mb-2">Daily <span className="text-gradient-gold">Horoscope</span></h1>
        <p className="mb-8" style={{ color: "var(--text-secondary)" }}>Select your zodiac sign for today&apos;s prediction</p>
      </div>

      {/* Sign selector */}
      <div ref={selectorRef} className="flex flex-wrap justify-center gap-3 mb-10 scroll-reveal" style={{ transitionDelay: "100ms" }}>
        {zodiacSigns.map((z) => (
          <button key={z.sign} onClick={() => setSign(z.sign)}
            className="px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200"
            style={{
              background: sign === z.sign ? "linear-gradient(135deg, var(--accent-deep), #6d28d9)" : "rgba(255,255,255,0.04)",
              border: `1px solid ${sign === z.sign ? "var(--border-active)" : "var(--border)"}`,
              boxShadow: sign === z.sign ? "0 0 20px var(--accent-glow)" : "none",
              color: sign === z.sign ? "white" : "var(--text-secondary)",
            }}>
            <span className="text-lg mr-1">{z.symbol}</span> {z.name}
          </button>
        ))}
      </div>

      {loading && (
        <div className="space-y-4">
          {Array(3).fill(0).map((_, i) => <div key={i} className="glass-card-static p-6"><div className="shimmer h-24 w-full" /></div>)}
        </div>
      )}

      {result && !loading && (
        <div className="max-w-4xl mx-auto space-y-6 animate-fade-in-up">
          {/* Summary */}
          <div className="glass-card p-8 text-center">
            <div className="text-5xl mb-4">{selected?.symbol}</div>
            <h2 className="text-2xl font-bold mb-2 capitalize" style={{ color: "var(--gold)" }}>{result.zodiac_sign}</h2>
            <p className="text-sm mb-4" style={{ color: "var(--text-secondary)" }}>
              {result.date} &bull; AI-powered prediction
            </p>
            <p className="text-lg leading-relaxed">{result.prediction}</p>
          </div>

          {/* Rating Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {([
              { key: "love" as const, label: "Love", icon: "\u2764\uFE0F", val: result.love_rating },
              { key: "career" as const, label: "Career", icon: "\uD83D\uDCBC", val: result.career_rating },
              { key: "health" as const, label: "Health", icon: "\uD83D\uDCAA", val: result.health_rating },
            ]).map((cat) => (
              <div key={cat.key} className="glass-card p-6 text-center">
                <div className="text-2xl mb-2">{cat.icon}</div>
                <h3 className="font-semibold mb-2">{cat.label}</h3>
                <div className="flex justify-center gap-1 mb-2">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <span key={n} className="text-lg" style={{ color: n <= cat.val ? "var(--gold)" : "rgba(255,255,255,0.1)" }}>
                      {n <= cat.val ? "\u2605" : "\u2606"}
                    </span>
                  ))}
                </div>
                <div className="text-sm" style={{ color: "var(--text-secondary)" }}>{ratingLabels[cat.val]}</div>
              </div>
            ))}
          </div>

          {/* Lucky */}
          <div className="glass-card p-6">
            <h3 className="font-semibold mb-4 text-center">Lucky Elements</h3>
            <div className="flex flex-wrap justify-center gap-3">
              <div className="px-4 py-2 rounded-lg text-sm"
                style={{ background: "rgba(147,51,234,0.08)", border: "1px solid rgba(147,51,234,0.2)" }}>
                <span style={{ color: "var(--text-secondary)" }}>Lucky Numbers: </span>
                <span className="font-semibold">{result.lucky_numbers.join(", ")}</span>
              </div>
              <div className="px-4 py-2 rounded-lg text-sm"
                style={{ background: "rgba(147,51,234,0.08)", border: "1px solid rgba(147,51,234,0.2)" }}>
                <span style={{ color: "var(--text-secondary)" }}>Lucky Color: </span>
                <span className="font-semibold">{result.lucky_color}</span>
              </div>
            </div>
          </div>

          {/* Model info */}
          <div className="text-center text-xs" style={{ color: "var(--text-secondary)" }}>
            Generated by: {result.ai_model}
          </div>
        </div>
      )}
    </div>
  );
}
