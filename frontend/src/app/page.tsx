"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles, Heart, Brain, Star, Hash, Calendar, ChevronRight } from "lucide-react";
import HoroscopePopup from "@/components/HoroscopePopup";
import { zodiacSymbols } from "@/components/icons/ZodiacIcons";
import {
  useReducedMotion,
  staggerContainer,
  staggerContainerCustom,
  staggerItem,
  slideUp,
  hoverLift,
  tapScale,
  duration,
  ease,
  stagger,
} from "@/lib/motion";

const features = [
  { title: "Kundli Generator", description: "Generate your Vedic birth chart with precise planetary positions, houses, and analysis.", href: "/kundli", icon: Sparkles, color: "#D6B875" },
  { title: "Marriage Matching", description: "Ashtakoot gun milan for marriage compatibility analysis.", href: "/matching", icon: Heart, color: "#E8A0BF" },
  { title: "AI Predictions", description: "Personalized predictions powered by AI for career, marriage, health, and more.", href: "/predictions", icon: Brain, color: "#B5A4F4" },
  { title: "Daily Horoscope", description: "Your daily horoscope with love, career, and health ratings.", href: "/horoscope", icon: Star, color: "#D6B875" },
  { title: "Numerology", description: "Calculate your life path, destiny, and soul urge numbers.", href: "/numerology", icon: Hash, color: "#5DC88F" },
  { title: "Panchang", description: "Daily panchang with tithi, nakshatra, yoga, and auspicious timings.", href: "/panchang", icon: Calendar, color: "#A6A5B8" },
];

const zodiacSigns = [
  { name: "Aries", sign: "aries", element: "fire" },
  { name: "Taurus", sign: "taurus", element: "earth" },
  { name: "Gemini", sign: "gemini", element: "air" },
  { name: "Cancer", sign: "cancer", element: "water" },
  { name: "Leo", sign: "leo", element: "fire" },
  { name: "Virgo", sign: "virgo", element: "earth" },
  { name: "Libra", sign: "libra", element: "air" },
  { name: "Scorpio", sign: "scorpio", element: "water" },
  { name: "Sagittarius", sign: "sagittarius", element: "fire" },
  { name: "Capricorn", sign: "capricorn", element: "earth" },
  { name: "Aquarius", sign: "aquarius", element: "air" },
  { name: "Pisces", sign: "pisces", element: "water" },
];

const elementColors: Record<string, string> = {
  fire: "#E85D5D", earth: "#5DC88F", air: "#8AA8F4", water: "#5DC4C8",
};

export default function HomePage() {
  const [popupSign, setPopupSign] = useState<string | null>(null);
  const reduced = useReducedMotion();

  return (
    <div>
      {popupSign && <HoroscopePopup sign={popupSign} onClose={() => setPopupSign(null)} />}

      {/* HERO */}
      <section className="relative min-h-[85vh] min-h-[85dvh] flex items-center justify-center overflow-hidden px-5">
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse 60% 40% at 50% 40%, rgba(214, 184, 117, 0.04) 0%, transparent 70%)" }} />

        <motion.div
          className="relative z-10 flex flex-col items-center text-center max-w-2xl mx-auto"
          variants={staggerContainer}
          initial={reduced ? false : "hidden"}
          animate="visible"
        >
          <motion.h1
            className="font-display font-bold mb-5"
            style={{ fontSize: "clamp(2.25rem, 5vw, 3.5rem)", letterSpacing: "-0.02em", lineHeight: 1.05 }}
            variants={slideUp}
          >
            <span className="text-gradient-gold">AstroSeva</span>
          </motion.h1>

          <motion.p
            className="mb-8 max-w-md"
            style={{ fontSize: "clamp(0.9rem, 2vw, 1.05rem)", color: "var(--text-secondary)", lineHeight: 1.7, fontWeight: 300 }}
            variants={slideUp}
          >
            Free <span style={{ color: "var(--lavender)", fontWeight: 500 }}>Vedic Astrology</span> platform.
            Kundli, marriage matching, predictions, and more.
          </motion.p>

          <motion.div
            className="flex flex-wrap justify-center gap-3"
            variants={slideUp}
          >
            <Link href="/kundli" className="btn-primary">
              Generate Kundli <ArrowRight size={15} />
            </Link>
            <Link href="/matching" className="btn-secondary">
              Marriage Matching
            </Link>
          </motion.div>
        </motion.div>
      </section>

      {/* FEATURES */}
      <section className="py-20 px-5">
        <div className="max-w-5xl mx-auto">
          <motion.div
            className="text-center mb-12"
            variants={slideUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-40px" }}
          >
            <h2 className="text-2xl md:text-3xl font-display font-bold mb-3">
              Our <span style={{ color: "var(--lavender)" }}>Services</span>
            </h2>
            <p className="max-w-md mx-auto" style={{ color: "var(--text-secondary)", lineHeight: 1.6, fontSize: "0.9rem" }}>
              Ancient wisdom meets modern technology.
            </p>
          </motion.div>

          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
            variants={staggerContainerCustom(stagger.normal, 0.1)}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-30px" }}
          >
            {features.map((f) => (
              <motion.div key={f.href} variants={staggerItem}>
                <Link href={f.href} className="glass-card block p-5 group" style={{ textDecoration: "none" }}>
                  <motion.div
                    whileHover={reduced ? undefined : hoverLift}
                    whileTap={reduced ? undefined : tapScale}
                  >
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-3"
                      style={{ background: `${f.color}10`, color: f.color }}>
                      <f.icon size={18} />
                    </div>
                    <h3 className="text-sm font-semibold mb-1.5" style={{ color: "var(--text-primary)" }}>{f.title}</h3>
                    <p className="text-xs leading-relaxed mb-3" style={{ color: "var(--text-secondary)" }}>{f.description}</p>
                    <span className="text-xs font-medium flex items-center gap-1 transition-all duration-150"
                      style={{ color: f.color, opacity: 0.6 }}
                      onMouseEnter={(e) => { e.currentTarget.style.opacity = "1"; e.currentTarget.style.gap = "0.4rem"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.opacity = "0.6"; e.currentTarget.style.gap = "0.25rem"; }}
                    >
                      Learn more <ChevronRight size={12} />
                    </span>
                  </motion.div>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ZODIAC SIGNS — Daily Horoscope */}
      <section className="py-20 px-5" style={{ borderTop: "1px solid var(--border-subtle)" }}>
        <div className="max-w-4xl mx-auto">
          <motion.div
            className="text-center mb-10"
            variants={slideUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-40px" }}
          >
            <h2 className="text-2xl md:text-3xl font-display font-bold mb-3">
              Daily <span className="text-gradient-gold">Horoscope</span>
            </h2>
            <p className="max-w-sm mx-auto" style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
              Select your zodiac sign to view today&apos;s prediction
            </p>
          </motion.div>

          <motion.div
            className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2.5"
            variants={staggerContainerCustom(stagger.fast, 0.05)}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-20px" }}
          >
            {zodiacSigns.map((z) => (
              <motion.button
                key={z.sign}
                onClick={() => setPopupSign(z.sign)}
                className="text-center p-3.5 rounded-xl cursor-pointer transition-all duration-150"
                style={{
                  background: "transparent",
                  border: "1px solid var(--border-subtle)",
                }}
                variants={staggerItem}
                whileHover={reduced ? undefined : {
                  scale: 1.05,
                  borderColor: `${elementColors[z.element]}30`,
                  background: `${elementColors[z.element]}08`,
                  transition: { duration: 0.15, ease: ease.standard },
                }}
                whileTap={reduced ? undefined : { scale: 0.95 }}
                onMouseEnter={(e) => {
                  if (reduced) {
                    e.currentTarget.style.borderColor = `${elementColors[z.element]}25`;
                    e.currentTarget.style.background = `${elementColors[z.element]}05`;
                  }
                }}
                onMouseLeave={(e) => {
                  if (reduced) {
                    e.currentTarget.style.borderColor = "var(--border-subtle)";
                    e.currentTarget.style.background = "transparent";
                  }
                }}
              >
                <div className="text-2xl mb-1.5" style={{ color: elementColors[z.element] }}>
                  {zodiacSymbols[z.sign]}
                </div>
                <div className="text-[10px] font-medium" style={{ color: "var(--text-secondary)" }}>{z.name}</div>
              </motion.button>
            ))}
          </motion.div>
        </div>
      </section>
    </div>
  );
}
