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
import HoroscopePreview from "@/components/HoroscopePreview";
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
          SERVICES -- editorial split, not a card grid. The lead story
          (Kundli) gets the weight; the other five read as an index below
          it, separated by hairlines. Same data, different hierarchy.
          ================================================================ */}
      <section className="py-20 md:py-24 px-5" style={{ borderTop: "1px solid var(--border-subtle)" }}>
        <div className="max-w-6xl mx-auto grid lg:grid-cols-[1fr_1.35fr] gap-12 lg:gap-16 items-start">
          <motion.div
            className="lg:sticky lg:top-24 min-w-0"
            variants={slideUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-40px" }}
          >
            <p className="heading-section mb-3">Our services</p>
            <h2
              className="font-display mb-4"
              style={{ fontSize: "clamp(1.7rem, 3.5vw, 2.5rem)", fontWeight: 600, lineHeight: 1.15, color: "var(--text-primary)" }}
            >
              One platform, every branch of the science
            </h2>
            <p className="text-sm mb-7 max-w-sm" style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}>
              Charts, compatibility, timing and remedies — each tool reads the
              same birth data, so nothing here asks twice or invents answers.
            </p>
            <Link href="/services" className="btn-secondary text-sm inline-flex items-center gap-2">
              Explore all services <ChevronRight size={14} />
            </Link>
          </motion.div>

          <motion.div
            className="min-w-0"
            variants={slideUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-40px" }}
          >
            {servicesGrid.slice(0, 1).map((s) => (
              <div key={s.href} className="relative mb-2">
                {/* Orbital dressing around the lead story: two slow ellipses
                    and a breathing glow, all transform/opacity only. */}
                <div className="absolute -inset-2 pointer-events-none" aria-hidden="true">
                  <svg viewBox="0 0 400 260" className="w-full h-full overflow-visible">
                    <g className="cs-drift">
                      <ellipse cx="200" cy="130" rx="190" ry="86" fill="none" stroke="var(--gold)" strokeOpacity="0.28" strokeWidth="1" strokeDasharray="3 8" />
                      <ellipse cx="200" cy="130" rx="150" ry="112" fill="none" stroke="var(--gold)" strokeOpacity="0.16" strokeWidth="1" />
                      <circle cx="358" cy="82" r="3" fill="var(--gold)" opacity="0.8" />
                      <circle cx="66" cy="188" r="2.2" fill="var(--gold)" opacity="0.6" />
                    </g>
                  </svg>
                </div>
                <div className="absolute -inset-2 pointer-events-none cs-breathe" aria-hidden="true"
                  style={{ background: "radial-gradient(ellipse 60% 55% at 30% 40%, rgba(201,162,39,0.10) 0%, transparent 70%)" }}
                />
              <Link
                href={s.href}
                className="relative block rounded-2xl p-7 transition-transform duration-100 active:scale-[0.99]"
                style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderLeft: "3px solid var(--gold)" }}
              >
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                  style={{ background: `${s.color}14`, color: s.color }}
                >
                  <s.icon size={22} />
                </div>
                <h3 className="font-display text-xl mb-2" style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                  {s.title}
                </h3>
                <p className="text-sm leading-relaxed mb-4" style={{ color: "var(--text-secondary)" }}>
                  {s.description}
                </p>
                <span className="text-sm font-semibold inline-flex items-center gap-1.5" style={{ color: "var(--accent-text)" }}>
                  Generate your chart <ChevronRight size={14} />
                </span>
              </Link>
              </div>
            ))}
            <motion.ul
              className="divide-y divide-[var(--border)]"
              variants={staggerContainer}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-40px" }}
            >
              {servicesGrid.slice(1).map((s) => (
                <motion.li key={s.href} variants={staggerItem}>
                  <Link
                    href={s.href}
                    className="group flex items-center gap-4 py-4 transition-transform duration-100 active:scale-[0.99]"
                  >
                    <span
                      className="flex shrink-0 w-10 h-10 rounded-full items-center justify-center"
                      style={{ border: "1px solid var(--border)", color: s.color, background: "var(--bg-card)" }}
                    >
                      <s.icon size={17} />
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-[15px] font-semibold" style={{ color: "var(--text-primary)" }}>
                        {s.title}
                      </span>
                      <span className="block text-[13px] truncate" style={{ color: "var(--text-tertiary)" }}>
                        {s.description}
                      </span>
                    </span>
                    <ChevronRight
                      size={16}
                      className="shrink-0 transition-transform duration-150 group-hover:translate-x-0.5"
                      style={{ color: "var(--accent-text)" }}
                    />
                  </Link>
                </motion.li>
              ))}
            </motion.ul>
          </motion.div>
        </div>
      </section>

      {/* ================================================================
          HOROSCOPE PREVIEW -- the first dark band after the hero. Live daily
          data for the chosen sign, same endpoint as /horoscope.
          ================================================================ */}
      <HoroscopePreview />

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
              Why choose <span className="text-gradient-gold">AstroSeva</span>
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
