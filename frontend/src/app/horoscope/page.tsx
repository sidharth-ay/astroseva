"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { api, type HoroscopeResponse } from "@/lib/api";
import { zodiacSymbols } from "@/components/icons/ZodiacIcons";
import {
  useReducedMotion,
  staggerContainerCustom,
  staggerItem,
  slideUp,
  fadeIn,
  stagger,
} from "@/lib/motion";

const zodiacSigns = [
  { sign: "aries", name: "Aries", element: "fire" },
  { sign: "taurus", name: "Taurus", element: "earth" },
  { sign: "gemini", name: "Gemini", element: "air" },
  { sign: "cancer", name: "Cancer", element: "water" },
  { sign: "leo", name: "Leo", element: "fire" },
  { sign: "virgo", name: "Virgo", element: "earth" },
  { sign: "libra", name: "Libra", element: "air" },
  { sign: "scorpio", name: "Scorpio", element: "water" },
  { sign: "sagittarius", name: "Sagittarius", element: "fire" },
  { sign: "capricorn", name: "Capricorn", element: "earth" },
  { sign: "aquarius", name: "Aquarius", element: "air" },
  { sign: "pisces", name: "Pisces", element: "water" },
];

const elementColors: Record<string, string> = {
  fire: "#E85D5D", earth: "#5DC88F", air: "#8AA8F4", water: "#5DC4C8",
};

const ratingLabels = ["", "Poor", "Fair", "Good", "Very Good", "Excellent"];

export default function HoroscopePage() {
  const [sign, setSign] = useState("aries");
  const [result, setResult] = useState<HoroscopeResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const reduced = useReducedMotion();

  useEffect(() => {
    setLoading(true);
    api.getDailyHoroscope(sign)
      .then(setResult)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [sign]);

  const selected = zodiacSigns.find((z) => z.sign === sign);

  return (
    <div className="max-w-5xl mx-auto px-5 py-10">
      <motion.div initial={reduced ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl md:text-3xl font-display font-bold mb-1">
          Daily <span className="text-gradient-gold">Horoscope</span>
        </h1>
        <p className="text-sm mb-8" style={{ color: "var(--text-secondary)" }}>Select your zodiac sign for today&apos;s prediction</p>
      </motion.div>

      {/* Sign selector */}
      <motion.div
        className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 mb-8"
        variants={staggerContainerCustom(stagger.fast, 0.05)}
        initial="hidden"
        animate="visible"
      >
        {zodiacSigns.map((z) => (
          <motion.button key={z.sign} onClick={() => setSign(z.sign)}
            className="p-3 rounded-lg text-center transition-all duration-150"
            style={{
              background: sign === z.sign ? `${elementColors[z.element]}08` : "transparent",
              border: `1px solid ${sign === z.sign ? `${elementColors[z.element]}25` : "var(--border-subtle)"}`,
            }}
            variants={staggerItem}
            whileHover={reduced ? undefined : { scale: 1.04, transition: { duration: 0.15 } }}
            whileTap={reduced ? undefined : { scale: 0.95 }}
          >
            <div className="text-2xl mb-1" style={{ color: elementColors[z.element] }}>{zodiacSymbols[z.sign]}</div>
            <div className="text-[10px] font-medium" style={{ color: sign === z.sign ? "var(--text-primary)" : "var(--text-secondary)" }}>{z.name}</div>
          </motion.button>
        ))}
      </motion.div>

      {loading && (
        <div className="space-y-4">
          {Array(3).fill(0).map((_, i) => <div key={i} className="glass-card p-5"><div className="shimmer h-20 w-full rounded-lg" /></div>)}
        </div>
      )}

      <AnimatePresence mode="wait">
        {result && !loading && (
          <motion.div
            key={sign}
            className="max-w-3xl mx-auto space-y-5"
            initial={reduced ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduced ? undefined : { opacity: 0, y: -8 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* Summary */}
            <div className="glass-card p-6 text-center">
              <motion.div
                className="text-4xl mb-3"
                style={{ color: elementColors[selected?.element || "fire"] }}
                initial={reduced ? false : { scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              >
                {zodiacSymbols[sign]}
              </motion.div>
              <h2 className="text-xl font-display font-bold mb-1 capitalize" style={{ color: "var(--champagne)" }}>{result.zodiac_sign}</h2>
              <p className="text-xs mb-4" style={{ color: "var(--text-tertiary)" }}>{result.date}</p>
              <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>{result.prediction}</p>
            </div>

            {/* Rating Cards */}
            <motion.div
              className="grid grid-cols-1 md:grid-cols-3 gap-3"
              variants={staggerContainerCustom(stagger.normal, 0.1)}
              initial="hidden"
              animate="visible"
            >
              {([
                { label: "Love", val: result.love_rating, color: "#E8A0BF" },
                { label: "Career", val: result.career_rating, color: "var(--champagne)" },
                { label: "Health", val: result.health_rating, color: "#5DC88F" },
              ]).map((cat) => (
                <motion.div key={cat.label} className="glass-card p-4 text-center" variants={staggerItem}>
                  <h3 className="font-semibold mb-2 text-xs" style={{ color: "var(--text-primary)" }}>{cat.label}</h3>
                  <div className="flex justify-center gap-0.5 mb-1">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <span key={n} className="text-sm" style={{ color: n <= cat.val ? cat.color : "var(--border)" }}>
                        {n <= cat.val ? "★" : "☆"}
                      </span>
                    ))}
                  </div>
                  <div className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>{ratingLabels[cat.val]}</div>
                </motion.div>
              ))}
            </motion.div>

            {/* Lucky */}
            <motion.div
              className="glass-card p-4"
              initial={reduced ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <div className="flex flex-wrap justify-center gap-3">
                <span className="px-3 py-1.5 rounded-lg text-xs" style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", color: "var(--text-secondary)" }}>
                  Numbers: <span className="font-semibold" style={{ color: "var(--text-primary)" }}>{result.lucky_numbers.join(", ")}</span>
                </span>
                <span className="px-3 py-1.5 rounded-lg text-xs" style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", color: "var(--text-secondary)" }}>
                  Color: <span className="font-semibold" style={{ color: "var(--champagne)" }}>{result.lucky_color}</span>
                </span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
