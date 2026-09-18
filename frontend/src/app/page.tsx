"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles, Heart, Brain, Star, Hash, Calendar, ChevronRight } from "lucide-react";
import ZodiacWheel from "@/components/ZodiacWheel";
import HoroscopePopup from "@/components/HoroscopePopup";
import { zodiacSymbols } from "@/components/icons/ZodiacIcons";

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
  fire: "#E85D5D",
  earth: "#5DC88F",
  air: "#8AA8F4",
  water: "#5DC4C8",
};

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.5, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] } }),
};

export default function HomePage() {
  const [popupSign, setPopupSign] = useState<string | null>(null);

  return (
    <div>
      {popupSign && <HoroscopePopup sign={popupSign} onClose={() => setPopupSign(null)} />}

      {/* ===== HERO ===== */}
      <section className="relative min-h-[100vh] min-h-[100dvh] flex items-center justify-center overflow-hidden px-5">
        {/* Background gradient */}
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse 70% 50% at 50% 45%, rgba(107, 92, 231, 0.06) 0%, transparent 70%)" }} />

        <div className="relative z-10 flex flex-col items-center text-center max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          >
            <ZodiacWheel />
          </motion.div>

          <motion.h1
            className="font-display font-bold mt-10 mb-5"
            style={{ fontSize: "clamp(2.5rem, 5vw, 4rem)", letterSpacing: "-0.02em", lineHeight: 1.05 }}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          >
            <span className="text-gradient-gold">AstroSeva</span>
          </motion.h1>

          <motion.p
            className="mb-8 max-w-lg"
            style={{ fontSize: "clamp(0.95rem, 2vw, 1.15rem)", color: "var(--text-secondary)", lineHeight: 1.7, fontWeight: 300 }}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          >
            Free <span className="text-gradient-lavender" style={{ WebkitTextFillColor: "unset", fontWeight: 500 }}>Vedic Astrology</span> platform.
            Kundli, marriage matching, predictions, and more.
          </motion.p>

          <motion.div
            className="flex flex-wrap justify-center gap-3"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          >
            <Link href="/kundli" className="btn-primary">
              Generate Kundli <ArrowRight size={16} />
            </Link>
            <Link href="/matching" className="btn-secondary">
              Marriage Matching
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ===== STATS ===== */}
      <section style={{ padding: "4rem 1.25rem", borderTop: "1px solid var(--border-subtle)", borderBottom: "1px solid var(--border-subtle)" }}>
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { value: "10+", label: "Planets" },
            { value: "12", label: "Houses" },
            { value: "27", label: "Nakshatras" },
            { value: "100%", label: "Free" },
          ].map((s, i) => (
            <motion.div key={s.label} custom={i} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-40px" }} variants={fadeUp}>
              <div className="font-bold" style={{ fontSize: "clamp(2rem, 4vw, 2.75rem)", color: "var(--champagne)", letterSpacing: "-0.02em" }}>{s.value}</div>
              <div className="mt-1 text-xs font-medium" style={{ color: "var(--text-tertiary)", letterSpacing: "0.06em", textTransform: "uppercase" }}>{s.label}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ===== FEATURES ===== */}
      <section className="py-24 px-5">
        <div className="max-w-6xl mx-auto">
          <motion.div
            className="text-center mb-14"
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          >
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">
              Our <span className="text-gradient-lavender" style={{ WebkitTextFillColor: "unset" }}>Services</span>
            </h2>
            <p className="max-w-md mx-auto" style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}>
              Ancient wisdom meets modern technology. Explore our suite of Vedic astrology tools.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f, i) => (
              <motion.div key={f.href} custom={i} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-30px" }} variants={fadeUp}>
                <Link href={f.href}
                  className="glass-card block p-6 group"
                  style={{ textDecoration: "none" }}
                >
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4"
                    style={{ background: `${f.color}10`, color: f.color }}>
                    <f.icon size={20} />
                  </div>
                  <h3 className="text-base font-semibold mb-2" style={{ color: "var(--text-primary)" }}>{f.title}</h3>
                  <p className="text-sm leading-relaxed mb-4" style={{ color: "var(--text-secondary)" }}>{f.description}</p>
                  <span className="text-xs font-medium flex items-center gap-1 transition-all duration-200"
                    style={{ color: f.color, opacity: 0.7 }}
                    onMouseEnter={(e) => { e.currentTarget.style.opacity = "1"; e.currentTarget.style.gap = "0.5rem"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.opacity = "0.7"; e.currentTarget.style.gap = "0.25rem"; }}
                  >
                    Learn more <ChevronRight size={14} />
                  </span>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== ZODIAC SIGNS ===== */}
      <section className="py-24 px-5" style={{ background: "linear-gradient(180deg, var(--bg-primary) 0%, rgba(23, 23, 43, 0.3) 50%, var(--bg-primary) 100%)" }}>
        <div className="max-w-5xl mx-auto">
          <motion.div
            className="text-center mb-14"
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          >
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">
              Daily <span className="text-gradient-gold">Horoscope</span>
            </h2>
            <p className="max-w-md mx-auto" style={{ color: "var(--text-secondary)" }}>
              Select your zodiac sign to view today&apos;s prediction
            </p>
          </motion.div>

          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
            {zodiacSigns.map((z, i) => (
              <motion.button
                key={z.sign}
                onClick={() => setPopupSign(z.sign)}
                className="text-center p-4 rounded-xl cursor-pointer transition-colors duration-200"
                style={{
                  background: "transparent",
                  border: "1px solid var(--border-subtle)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = `${elementColors[z.element]}30`;
                  e.currentTarget.style.background = `${elementColors[z.element]}06`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "var(--border-subtle)";
                  e.currentTarget.style.background = "transparent";
                }}
                custom={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-20px" }}
                variants={fadeUp}
              >
                <div className="text-3xl mb-2" style={{ color: elementColors[z.element] }}>
                  {zodiacSymbols[z.sign]}
                </div>
                <div className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>{z.name}</div>
              </motion.button>
            ))}
          </div>
        </div>
      </section>

      {/* ===== ABOUT ===== */}
      <section className="py-24 px-5">
        <div className="max-w-2xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          >
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-6">
              About <span className="text-gradient-gold">AstroSeva</span>
            </h2>
            <p className="mb-4 leading-relaxed" style={{ color: "var(--text-secondary)", fontSize: "1.05rem" }}>
              AstroSeva is a free Vedic Astrology platform that provides accurate birth chart generation,
              marriage matching, AI-powered predictions, and all essential astrology tools.
            </p>
            <p className="mb-10 leading-relaxed" style={{ color: "var(--text-secondary)", fontSize: "1.05rem" }}>
              Calculations based on the ancient Vedic astrology system with <span className="text-gradient-lavender" style={{ WebkitTextFillColor: "unset", fontWeight: 500 }}>Lahiri ayanamsa</span>.
            </p>
            <Link href="/kundli" className="btn-primary">
              Get Your Kundli Now <ArrowRight size={16} />
            </Link>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
