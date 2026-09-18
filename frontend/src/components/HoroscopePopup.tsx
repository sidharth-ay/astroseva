"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { api, type HoroscopeResponse } from "@/lib/api";
import { zodiacSymbols } from "@/components/icons/ZodiacIcons";

const elementGradients: Record<string, string> = {
  fire: "linear-gradient(135deg, rgba(232, 93, 93, 0.08), rgba(214, 184, 117, 0.04))",
  earth: "linear-gradient(135deg, rgba(93, 200, 143, 0.08), rgba(93, 200, 143, 0.03))",
  air: "linear-gradient(135deg, rgba(138, 168, 244, 0.08), rgba(138, 168, 244, 0.03))",
  water: "linear-gradient(135deg, rgba(93, 196, 200, 0.08), rgba(93, 196, 200, 0.03))",
};

const elementMap: Record<string, string> = {
  aries: "fire", taurus: "earth", gemini: "air", cancer: "water",
  leo: "fire", virgo: "earth", libra: "air", scorpio: "water",
  sagittarius: "fire", capricorn: "earth", aquarius: "air", pisces: "water",
};

const ratingLabels = ["", "Poor", "Fair", "Good", "Very Good", "Excellent"];

interface Props { sign: string; onClose: () => void; }

export default function HoroscopePopup({ sign, onClose }: Props) {
  const [result, setResult] = useState<HoroscopeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const element = elementMap[sign] || "fire";

  useEffect(() => {
    setLoading(true); setError(false);
    api.getDailyHoroscope(sign).then(setResult).catch(() => setError(true)).finally(() => setLoading(false));
  }, [sign]);

  const handleBackdrop = useCallback((e: React.MouseEvent) => { if (e.target === e.currentTarget) onClose(); }, [onClose]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose]);

  return (
    <AnimatePresence>
      <motion.div className="popup-overlay" onClick={handleBackdrop}
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
        <motion.div className="popup-content" onClick={(e) => e.stopPropagation()}
          initial={{ opacity: 0, scale: 0.95, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 8 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        >
          <button onClick={onClose} className="absolute top-3 right-3 p-1.5 rounded-lg transition-colors"
            style={{ color: "var(--text-tertiary)" }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "var(--text-primary)"; e.currentTarget.style.background = "rgba(244,240,232,0.05)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-tertiary)"; e.currentTarget.style.background = "transparent"; }}>
            <X size={18} />
          </button>

          <div className="text-center mb-5 p-6 rounded-xl" style={{ background: elementGradients[element] }}>
            <div className="text-5xl mb-3" style={{ color: element === "fire" ? "#E85D5D" : element === "earth" ? "#5DC88F" : element === "air" ? "#8AA8F4" : "#5DC4C8" }}>
              {zodiacSymbols[sign]}
            </div>
            <h2 className="text-xl font-display font-bold capitalize" style={{ color: "var(--champagne)" }}>{sign}</h2>
            <p className="text-xs mt-1" style={{ color: "var(--text-tertiary)" }}>{result?.date || "Today"}</p>
          </div>

          {loading && (
            <div className="space-y-3">
              <div className="shimmer h-16 w-full rounded-xl" />
              <div className="grid grid-cols-3 gap-2">
                {[0, 1, 2].map((i) => <div key={i} className="shimmer h-20 rounded-xl" />)}
              </div>
            </div>
          )}

          {error && (
            <div className="text-center py-8">
              <p className="text-sm mb-3" style={{ color: "var(--text-secondary)" }}>Could not load horoscope.</p>
              <button onClick={onClose} className="btn-secondary text-xs px-4 py-2">Close</button>
            </div>
          )}

          {result && !loading && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
              <p className="text-sm leading-relaxed mb-5" style={{ color: "var(--text-primary)" }}>{result.prediction}</p>

              <div className="grid grid-cols-3 gap-2 mb-5">
                {([
                  { label: "Love", icon: "♥", val: result.love_rating },
                  { label: "Career", icon: "◆", val: result.career_rating },
                  { label: "Health", icon: "✚", val: result.health_rating },
                ]).map((cat) => (
                  <div key={cat.label} className="text-center p-3 rounded-xl" style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)" }}>
                    <div className="text-sm mb-1" style={{ color: "var(--champagne)" }}>{cat.icon}</div>
                    <div className="text-[10px] font-medium mb-1" style={{ color: "var(--text-tertiary)" }}>{cat.label}</div>
                    <div className="flex justify-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <span key={n} className="text-xs" style={{ color: n <= cat.val ? "var(--champagne)" : "var(--border)" }}>★</span>
                      ))}
                    </div>
                    <div className="text-[9px] mt-1" style={{ color: "var(--text-tertiary)" }}>{ratingLabels[cat.val]}</div>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap justify-center gap-2 mb-5">
                <span className="px-3 py-1.5 rounded-lg text-xs" style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", color: "var(--text-secondary)" }}>
                  Lucky Numbers: <span className="font-medium" style={{ color: "var(--text-primary)" }}>{result.lucky_numbers.join(", ")}</span>
                </span>
                <span className="px-3 py-1.5 rounded-lg text-xs" style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", color: "var(--text-secondary)" }}>
                  Color: <span className="font-medium" style={{ color: "var(--champagne)" }}>{result.lucky_color}</span>
                </span>
              </div>

              <div className="text-center">
                <a href={`/horoscope?sign=${sign}`} className="text-xs font-medium" style={{ color: "var(--lavender-dim)" }}>
                  View full horoscope →
                </a>
              </div>
            </motion.div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
