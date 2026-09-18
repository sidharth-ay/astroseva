"use client";

import Link from "next/link";
import { useScrollReveal } from "@/lib/useScrollReveal";

const showcases = [
  {
    title: "Generate Your Kundli",
    description: "Instantly generate a detailed Vedic birth chart with precise planetary positions, house placements, and comprehensive analysis — all based on Skyfield ephemeris data.",
    href: "/kundli",
    icon: "\u{1F52E}",
    color: "#f97316",
    gradient: "linear-gradient(135deg, rgba(249,115,22,0.08), rgba(251,191,36,0.04))",
    borderColor: "rgba(249,115,22,0.2)",
    cta: "Create Your Kundli",
    stats: [
      { value: "10+", label: "Planets" },
      { value: "12", label: "Houses" },
      { value: "27", label: "Nakshatras" },
    ],
  },
  {
    title: "Marriage Compatibility",
    description: "Ashtakoot gun milan analysis with detailed koota-by-koota scoring. Check Nadi dosha, Bhakoot dosha, and get a clear compatibility recommendation.",
    href: "/matching",
    icon: "\u{1F492}",
    color: "#ec4899",
    gradient: "linear-gradient(135deg, rgba(236,72,153,0.08), rgba(244,114,182,0.04))",
    borderColor: "rgba(236,72,153,0.2)",
    cta: "Check Compatibility",
    stats: [
      { value: "36", label: "Max Guns" },
      { value: "8", label: "Kootas" },
      { value: "AI", label: "Analysis" },
    ],
  },
  {
    title: "AI-Powered Predictions",
    description: "Get personalized life predictions powered by Gemini AI. Career, marriage, health, education, and finance — all tailored to your unique birth chart.",
    href: "/predictions",
    icon: "\u2728",
    color: "#b48eff",
    gradient: "linear-gradient(135deg, rgba(180,142,255,0.08), rgba(124,58,237,0.04))",
    borderColor: "rgba(180,142,255,0.2)",
    cta: "Get Predictions",
    stats: [
      { value: "5+", label: "Categories" },
      { value: "Vedic", label: "Basis" },
      { value: "Free", label: "Always" },
    ],
  },
];

export default function FeatureShowcase() {
  const [ref1, ref2, ref3] = [useScrollReveal(), useScrollReveal(), useScrollReveal()];
  const refs = [ref1, ref2, ref3];

  return (
    <section className="py-16 space-y-24">
      {showcases.map((s, i) => (
        <div
          key={s.title}
          ref={refs[i]}
          className={`scroll-reveal max-w-6xl mx-auto px-4 flex flex-col ${i % 2 === 0 ? "md:flex-row" : "md:flex-row-reverse"} items-center gap-10 md:gap-16`}
          style={{ transitionDelay: `${i * 100}ms` }}
        >
          {/* Icon block */}
          <div className="flex-shrink-0 w-48 h-48 rounded-3xl flex items-center justify-center relative"
            style={{
              background: s.gradient,
              border: `1px solid ${s.borderColor}`,
            }}
          >
            <div className="text-7xl" style={{ filter: `drop-shadow(0 0 20px ${s.color}40)` }}>
              {s.icon}
            </div>
            {/* Decorative corner dots */}
            <div className="absolute top-3 right-3 w-1.5 h-1.5 rounded-full" style={{ background: s.color, opacity: 0.4 }} />
            <div className="absolute bottom-3 left-3 w-1 h-1 rounded-full" style={{ background: s.color, opacity: 0.3 }} />
          </div>

          {/* Text block */}
          <div className="flex-1 text-center md:text-left">
            <h3 className="text-2xl md:text-3xl font-bold font-display mb-4" style={{ color: "var(--text-primary)" }}>
              {s.title}
            </h3>
            <p className="text-base leading-relaxed mb-6" style={{ color: "var(--text-secondary)" }}>
              {s.description}
            </p>

            {/* Stats row */}
            <div className="flex flex-wrap justify-center md:justify-start gap-4 mb-6">
              {s.stats.map((st) => (
                <div key={st.label} className="text-center px-4 py-2 rounded-lg" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)" }}>
                  <div className="text-lg font-bold" style={{ color: s.color }}>{st.value}</div>
                  <div className="text-[10px] uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>{st.label}</div>
                </div>
              ))}
            </div>

            <Link href={s.href}
              className="inline-block px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-300"
              style={{
                background: `linear-gradient(135deg, ${s.color}20, ${s.color}10)`,
                border: `1px solid ${s.color}40`,
                color: s.color,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = `linear-gradient(135deg, ${s.color}35, ${s.color}20)`;
                e.currentTarget.style.boxShadow = `0 0 25px ${s.color}25`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = `linear-gradient(135deg, ${s.color}20, ${s.color}10)`;
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              {s.cta} &rarr;
            </Link>
          </div>
        </div>
      ))}
    </section>
  );
}
