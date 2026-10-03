"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import {
  ArrowRight,
  BadgeCheck,
  Brain,
  Hash,
  Heart,
  Moon,
  Sparkles,
  Star,
  Sun,
  BookOpen,
  ChevronRight,
} from "lucide-react";
import HoroscopePopup from "@/components/HoroscopePopup";
import StatsStrip from "@/components/StatsStrip";
import CelestialScene from "@/components/CelestialScene";
import QuickAccess from "@/components/QuickAccess";
import {
  useReducedMotion,
  staggerContainer,
  staggerContainerCustom,
  staggerItem,
  slideUp,
  stagger} from "@/lib/motion";
import { Tilt } from "@/components/motion-primitives/tilt";

/* Trust row under the hero CTAs. These are properties of the product, not
   traffic figures: a fabricated "1M+ users" count was removed once before as
   false advertising and stays removed. Twelve signs, twenty-seven nakshatras,
   nine grahas and a free service are all checkable in the app itself. */
const heroStats = [
  { value: "12", label: "Zodiac Signs", icon: Star },
  { value: "27", label: "Nakshatras", icon: Moon },
  { value: "9", label: "Grahas", icon: Sun },
  { value: "100%", label: "Free Service", icon: BadgeCheck },
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
          HERO -- full-bleed dark cinematic band. The sky, wheel, planets and
          temple horizon are one composed SVG (CelestialScene); the copy sits
          left with a legibility gradient between art and text. The Quick
          Access band below is its own ivory section, never overlapped.
          ================================================================ */}
      <section className="relative overflow-hidden" style={{ background: "var(--midnight)" }}>
        {/* The sky fills the band; from the medium breakpoint the art is
            pushed right of the copy column so the wheel never sits behind
            the headline. `slice` crops the empty left of the scene. */}
        <div className="absolute inset-0 md:left-[24%] md:right-[-8%]" aria-hidden="true">
          <CelestialScene />
        </div>
        {/* Legibility gradient: text must read over the art at every width. */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "linear-gradient(100deg, rgba(10,12,30,0.9) 0%, rgba(10,12,30,0.62) 36%, rgba(10,12,30,0.08) 62%, rgba(10,12,30,0) 78%)",
          }}
          aria-hidden="true"
        />
        <div
          className="absolute inset-0 pointer-events-none md:hidden"
          style={{ background: "rgba(10, 12, 30, 0.45)" }}
          aria-hidden="true"
        />

        <div className="relative z-10 max-w-6xl mx-auto px-5 pt-16 pb-14 md:pt-24 md:pb-20 grid md:grid-cols-2 gap-10 items-center min-h-[88vh]">
          {/* Left: copy */}
          <motion.div
            className="flex flex-col items-start"
            variants={staggerContainer}
            initial={reduced ? false : "hidden"}
            animate="visible"
          >
            <motion.p
              className="heading-section mb-4"
              style={{ color: "var(--gold-bright)", fontSize: "0.72rem" }}
              variants={slideUp}
            >
              Ancient Wisdom · Modern Guidance
            </motion.p>
            <motion.h1
              className="font-display mb-5"
              style={{
                fontSize: "clamp(2.75rem, 6vw, 4.5rem)",
                lineHeight: 1.04,
                letterSpacing: "-0.015em",
                fontWeight: 600,
                color: "var(--on-dark)",
              }}
              variants={slideUp}
            >
              Discover Your Life&rsquo;s{" "}
              <span className="text-gradient-gold">True Path</span>
            </motion.h1>

            <motion.p
              className="mb-8 max-w-md text-base"
              style={{ color: "var(--on-dark-dim)", lineHeight: 1.7 }}
              variants={slideUp}
            >
              Personalized astrology insights powered by Vedic wisdom, AI and
              expert guidance.
            </motion.p>

            <motion.div className="flex flex-wrap items-center gap-3" variants={slideUp}>
              <Link href="/kundli" className="btn-gold-pill">
                Generate Your Kundli <ArrowRight size={15} />
              </Link>
              <Link href="/services" className="btn-outline-light">
                Explore Astrology
              </Link>
            </motion.div>

            <motion.dl
              className="grid grid-cols-2 sm:grid-cols-4 gap-x-8 gap-y-6 mt-12"
              variants={slideUp}
            >
              {heroStats.map((s) => (
                <div key={s.label} className="flex flex-col gap-1">
                  <dt className="order-2 text-[11px] font-medium uppercase" style={{ color: "var(--on-dark-faint)", letterSpacing: "0.08em" }}>
                    {s.label}
                  </dt>
                  <dd className="order-1 flex items-center gap-2 font-display" style={{ fontSize: "1.55rem", fontWeight: 600, color: "var(--on-dark)" }}>
                    <s.icon size={17} style={{ color: "var(--gold)" }} aria-hidden="true" />
                    {s.value}
                  </dd>
                </div>
              ))}
            </motion.dl>
          </motion.div>

          {/* Right: the artwork shows through here on desktop. */}
          <div className="hidden md:block" aria-hidden="true" />
        </div>
      </section>

      <QuickAccess />

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
