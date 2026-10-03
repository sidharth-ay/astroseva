"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import {
  ArrowRight,
  Sparkles,
  Heart,
  Star,
  Brain,
  Hash,
  BookOpen,
  ChevronRight,
} from "lucide-react";
import HoroscopePopup from "@/components/HoroscopePopup";
import StatsStrip from "@/components/StatsStrip";
import { } from "@/components/icons/ZodiacIcons";
import {
  useReducedMotion,
  staggerContainer,
  staggerContainerCustom,
  staggerItem,
  slideUp,
  slideInRight,
  stagger} from "@/lib/motion";
import { TextScramble } from "@/components/motion-primitives/text-scramble";
import { TextEffect } from "@/components/motion-primitives/text-effect";
import { Spotlight } from "@/components/motion-primitives/spotlight";
import { Magnetic } from "@/components/motion-primitives/magnetic";
import { Tilt } from "@/components/motion-primitives/tilt";

const zodiacSigns = [
  { name: "aries", symbol: "♈", angle: 0 },
  { name: "taurus", symbol: "♉", angle: 30 },
  { name: "gemini", symbol: "♊", angle: 60 },
  { name: "cancer", symbol: "♋", angle: 90 },
  { name: "leo", symbol: "♌", angle: 120 },
  { name: "virgo", symbol: "♍", angle: 150 },
  { name: "libra", symbol: "♎", angle: 180 },
  { name: "scorpio", symbol: "♏", angle: 210 },
  { name: "sagittarius", symbol: "♐", angle: 240 },
  { name: "capricorn", symbol: "♑", angle: 270 },
  { name: "aquarius", symbol: "♒", angle: 300 },
  { name: "pisces", symbol: "♓", angle: 330 },
];

const heroServices = [
  { label: "Kundli", icon: Sparkles },
  { label: "Matching", icon: Heart },
  { label: "Horoscope", icon: Star },
  { label: "Predictions", icon: Brain },
  { label: "Numerology", icon: Hash },
];

const servicesGrid = [
  {
    title: "Kundli Generator",
    description:
      "Generate your Vedic birth chart with precise planetary positions, houses, and detailed analysis.",
    href: "/kundli",
    icon: Sparkles,
    color: "#C8956D",
  },
  {
    title: "Marriage Matching",
    description:
      "Ashtakoot gun milan for marriage compatibility analysis with detailed scoring and recommendations.",
    href: "/matching",
    icon: Heart,
    color: "#E8B88A",
  },
  {
    title: "AI Predictions",
    description:
      "Personalized predictions powered by AI for career, marriage, health, and life guidance.",
    href: "/predictions",
    icon: Brain,
    color: "#D4A574",
  },
  {
    title: "Daily Horoscope",
    description:
      "Your daily horoscope with love, career, and health ratings to guide your day.",
    href: "/horoscope",
    icon: Star,
    color: "#C8956D",
  },
  {
    title: "Numerology",
    description:
      "Calculate your life path number, destiny number, and soul urge number from your birth date.",
    href: "/numerology",
    icon: Hash,
    color: "#E8B88A",
  },
  {
    title: "Panchang",
    description:
      "Access today's Panchang with Tithi, Nakshatra, Yoga, Karana, and auspicious muhurat timings.",
    href: "/panchang",
    icon: BookOpen,
    color: "#D4A574",
  },
];

const whyChooseUs = [
  {
    title: "AI Powered",
    icon: Brain,
    color: "#C8956D",
    description:
      "Advanced AI algorithms analyze your birth chart for accurate, personalized insights.",
  },
  {
    title: "100% Free",
    icon: Heart,
    color: "#E8B88A",
    description:
      "Access all astrology services completely free. No hidden charges or premium tiers.",
  },
  {
    title: "Expert Analysis",
    icon: Star,
    color: "#D4A574",
    description:
      "Traditional Vedic astrology principles combined with modern analytical precision.",
  },
];

function ZodiacWheel() {
  const outerR = 150;
  const midR = 115;
  const innerR = 80;
  const center = 190;
  const svgSize = 380;

  return (
    <div className="relative" style={{ width: svgSize, height: svgSize }}>
      <motion.div
        className="absolute inset-0"
        animate={{ rotate: 360 }}
        transition={{ duration: 120, repeat: Infinity, ease: "linear" }}
      >
        <svg
          viewBox={`0 0 ${svgSize} ${svgSize}`}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full"
        >
          <defs>
            <radialGradient id="wheelGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#C8956D" stopOpacity="0.15" />
              <stop offset="60%" stopColor="#C8956D" stopOpacity="0.05" />
              <stop offset="100%" stopColor="#C8956D" stopOpacity="0" />
            </radialGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Glow background */}
          <circle cx={center} cy={center} r={outerR + 30} fill="url(#wheelGlow)" />

          {/* Outer circle */}
          <circle
            cx={center}
            cy={center}
            r={outerR}
            stroke="#C8956D"
            strokeWidth="1"
            opacity="0.4"
          />
          {/* Middle circle */}
          <circle
            cx={center}
            cy={center}
            r={midR}
            stroke="#E8B88A"
            strokeWidth="0.6"
            opacity="0.25"
          />
          {/* Inner circle */}
          <circle
            cx={center}
            cy={center}
            r={innerR}
            stroke="#D4A574"
            strokeWidth="0.6"
            opacity="0.2"
          />

          {/* Radial lines for each sign */}
          {zodiacSigns.map((sign) => {
            const rad = (sign.angle * Math.PI) / 180;
            const x1 = center + innerR * Math.cos(rad);
            const y1 = center + innerR * Math.sin(rad);
            const x2 = center + outerR * Math.cos(rad);
            const y2 = center + outerR * Math.sin(rad);
            return (
              <line
                key={sign.name}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="#C8956D"
                strokeWidth="0.5"
                opacity="0.2"
              />
            );
          })}

          {/* Zodiac symbols around the wheel */}
          {zodiacSigns.map((sign) => {
            const symbolR = outerR + 22;
            const rad = (sign.angle * Math.PI) / 180;
            const x = center + symbolR * Math.cos(rad);
            const y = center + symbolR * Math.sin(rad);
            return (
              <text
                key={sign.name}
                x={x}
                y={y}
                textAnchor="middle"
                dominantBaseline="central"
                fill="#C8956D"
                fontSize="18"
                opacity="0.6"
                filter="url(#glow)"
              >
                {sign.symbol}
              </text>
            );
          })}

          {/* Center dot */}
          <circle cx={center} cy={center} r="3" fill="#C8956D" opacity="0.5" />
        </svg>
      </motion.div>

      {/* Non-rotating center symbol */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <span
          className="text-4xl font-bold"
          style={{ color: "#C8956D", opacity: 0.35 }}
        >
          ☉
        </span>
      </div>
    </div>
  );
}

export default function HomePage() {
  const [popupSign, setPopupSign] = useState<string | null>(null);
  const reduced = useReducedMotion();

  return (
    <div>
      {popupSign && (
        <HoroscopePopup
          sign={popupSign}
          onClose={() => setPopupSign(null)}
        />
      )}

      {/* ================================================================
          HERO SECTION
          ================================================================ */}
      <section className="relative min-h-[90vh] flex items-center overflow-hidden px-5">
        {/* Spotlight effect */}
        <Spotlight className="opacity-30" size={400} />

        {/* Background glow */}
        <div
          className="absolute top-1/2 right-1/4 -translate-y-1/2 w-[500px] h-[500px] rounded-full pointer-events-none"
          style={{
            background: "radial-gradient(circle, rgba(200,149,109,0.08) 0%, transparent 70%)",
          }}
        />

        <div className="max-w-6xl mx-auto w-full grid grid-cols-1 md:grid-cols-2 gap-12 items-center relative z-10">
          {/* Left: Text */}
          <motion.div
            className="flex flex-col"
            variants={staggerContainer}
            initial={reduced ? false : "hidden"}
            animate="visible"
          >
            <motion.h1
              className="heading-display text-gradient-white font-bold mb-6"
              style={{
                fontSize: "clamp(2.2rem, 5vw, 4rem)",
                letterSpacing: "-0.03em",
                lineHeight: 1.05,
              }}
              variants={slideUp}
            >
              <TextScramble as="span" duration={1.2} speed={0.03}>
                YOUR PATH TO UNDERSTANDING ZODIAC
              </TextScramble>
            </motion.h1>

            <motion.div className="mb-10 max-w-md" variants={slideUp}>
              <TextEffect
                as="p"
                preset="fade-in-blur"
                per="word"
                className="text-base"
                style={{
                  color: "var(--text-secondary)",
                  lineHeight: 1.7,
                  fontWeight: 300,
                }}
              >
                Free Vedic Astrology platform. Kundli, marriage matching, predictions, horoscope, and more.
              </TextEffect>
            </motion.div>

            <motion.div variants={slideUp}>
              <Magnetic intensity={0.3} range={80}>
                <Link href="/services" className="btn-primary">
                  Explore Now <ArrowRight size={15} />
                </Link>
              </Magnetic>
            </motion.div>
          </motion.div>

          {/* Right: Zodiac Wheel */}
          <motion.div
            className="flex items-center justify-center"
            variants={slideInRight}
            initial={reduced ? false : "hidden"}
            animate="visible"
          >
            <ZodiacWheel />
          </motion.div>
        </div>

        {/* Service Icons Row */}
        <motion.div
          className="absolute bottom-10 left-0 right-0 flex justify-center gap-6 sm:gap-8 px-5"
          variants={staggerContainerCustom(stagger.normal, 0.3)}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          {heroServices.map((s) => (
            <motion.div
              key={s.label}
              className="flex flex-col items-center gap-2"
              variants={staggerItem}
            >
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{
                  border: "1.5px solid #C8956D",
                  background: "rgba(200, 149, 109, 0.06)",
                  color: "#C8956D",
                }}
              >
                <s.icon size={16} />
              </div>
              <span
                className="text-[10px] font-medium"
                style={{ color: "var(--text-secondary)" }}
              >
                {s.label}
              </span>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ================================================================
          SERVICES GRID
          ================================================================ */}
      <section className="py-20 px-5" style={{ borderTop: "1px solid var(--border-subtle)" }}>
        <div className="max-w-5xl mx-auto">
          <motion.div
            className="text-center mb-14"
            variants={slideUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-40px" }}
          >
            <p className="heading-section mb-3">OUR SERVICES</p>
            <h2
              className="heading-display font-bold"
              style={{ fontSize: "clamp(1.5rem, 3.5vw, 2.4rem)" }}
            >
              WHAT WE <span className="text-gradient-gold">OFFER</span>
            </h2>
          </motion.div>

          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"
            variants={staggerContainerCustom(stagger.normal, 0.08)}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-30px" }}
          >
            {servicesGrid.map((s) => (
              <motion.div
                key={s.href}
                variants={staggerItem}
                /* Pressed feedback: these cards were the main way into each
                   feature and had no `whileTap`, so a tap on touch registered
                   only when the destination finally rendered. */
                whileTap={reduced ? undefined : { scale: 0.98 }}
              >
                <Tilt rotationFactor={8} isRevese>
                  <Link
                    href={s.href}
                    className="glass-card block p-6 group relative overflow-hidden"
                    style={{ textDecoration: "none" }}
                  >
                    <div className="relative z-10">
                      <div
                        className="w-11 h-11 rounded-xl flex items-center justify-center mb-4"
                        style={{ background: `${s.color}12`, color: s.color }}
                      >
                        <s.icon size={20} />
                      </div>
                      <h3
                        className="text-base font-semibold mb-2"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {s.title}
                      </h3>
                      <p
                        className="text-sm leading-relaxed mb-4"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        {s.description}
                      </p>
                      <span
                        className="text-sm font-medium flex items-center gap-1 transition-all duration-150"
                        style={{ color: s.color, opacity: 0.6 }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.opacity = "1";
                          e.currentTarget.style.gap = "0.5rem";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.opacity = "0.6";
                          e.currentTarget.style.gap = "0.25rem";
                        }}
                      >
                        Learn more <ChevronRight size={13} />
                      </span>
                    </div>
                  </Link>
                </Tilt>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ================================================================
          STATS STRIP
          ================================================================ */}
      <StatsStrip />

      {/* ================================================================
          WHY CHOOSE US
          ================================================================ */}
      <section className="py-20 px-5" style={{ borderTop: "1px solid var(--border-subtle)" }}>
        <div className="max-w-5xl mx-auto">
          <motion.div
            className="text-center mb-14"
            variants={slideUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-40px" }}
          >
            <p className="heading-section mb-3">WHY CHOOSE US</p>
            <h2
              className="heading-display font-bold"
              style={{ fontSize: "clamp(1.5rem, 3.5vw, 2.4rem)" }}
            >
              WHY CHOOSE <span className="text-gradient-gold">ASTROSEVA</span>
            </h2>
          </motion.div>

          <motion.div
            className="grid grid-cols-1 sm:grid-cols-3 gap-5"
            variants={staggerContainerCustom(stagger.normal, 0.1)}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-30px" }}
          >
            {whyChooseUs.map((f) => (
              <Tilt key={f.title} rotationFactor={6} isRevese>
                <motion.div
                  className="glass-card p-6 text-center relative overflow-hidden"
                  variants={staggerItem}
                >
                  <div className="relative z-10">
                    <div
                      className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-5"
                      style={{
                        background: `${f.color}12`,
                        color: f.color,
                        border: `1.5px solid ${f.color}30`,
                      }}
                    >
                      <f.icon size={24} />
                    </div>
                    <h3
                      className="text-base font-semibold mb-2"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {f.title}
                    </h3>
                    <p
                      className="text-sm leading-relaxed"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      {f.description}
                    </p>
                  </div>
                </motion.div>
              </Tilt>
            ))}
          </motion.div>
        </div>
      </section>
    </div>
  );
}
