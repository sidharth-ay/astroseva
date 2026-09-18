"use client";

import Link from "next/link";
import ZodiacWheel from "@/components/ZodiacWheel";
import { useScrollReveal } from "@/lib/useScrollReveal";

const features = [
  { title: "Kundli Generator", description: "Generate your Vedic birth chart with planetary positions, houses, and analysis.", href: "/kundli", icon: "\u{1F52E}", color: "#f97316", element: "fire" },
  { title: "Marriage Matching", description: "Ashtakoot gun milan for marriage compatibility analysis.", href: "/matching", icon: "\u{1F492}", color: "#ec4899", element: "water" },
  { title: "AI Predictions", description: "Get personalized predictions powered by AI for career, marriage, health, and more.", href: "/predictions", icon: "\u{1F52E}", color: "#b48eff", element: "air" },
  { title: "Daily Horoscope", description: "Your daily horoscope with love, career, and health ratings.", href: "/horoscope", icon: "\u2B50", color: "#fbbf24", element: "fire" },
  { title: "Numerology", description: "Calculate your life path, destiny, and soul urge numbers.", href: "/numerology", icon: "\u{1F522}", color: "#facc15", element: "earth" },
  { title: "Panchang", description: "Daily panchang with tithi, nakshatra, yoga, and auspicious timings.", href: "/panchang", icon: "\u{1F570}\uFE0F", color: "#34d399", element: "earth" },
];

const zodiacSigns = [
  { name: "Aries", symbol: "\u2648", sign: "aries", element: "fire" },
  { name: "Taurus", symbol: "\u2649", sign: "taurus", element: "earth" },
  { name: "Gemini", symbol: "\u264A", sign: "gemini", element: "air" },
  { name: "Cancer", symbol: "\u264B", sign: "cancer", element: "water" },
  { name: "Leo", symbol: "\u264C", sign: "leo", element: "fire" },
  { name: "Virgo", symbol: "\u264D", sign: "virgo", element: "earth" },
  { name: "Libra", symbol: "\u264E", sign: "libra", element: "air" },
  { name: "Scorpio", symbol: "\u264F", sign: "scorpio", element: "water" },
  { name: "Sagittarius", symbol: "\u2650", sign: "sagittarius", element: "fire" },
  { name: "Capricorn", symbol: "\u2651", sign: "capricorn", element: "earth" },
  { name: "Aquarius", symbol: "\u2652", sign: "aquarius", element: "air" },
  { name: "Pisces", symbol: "\u2653", sign: "pisces", element: "water" },
];

const elementColors: Record<string, string> = {
  fire: "#ef4444",
  earth: "#22c55e",
  air: "#60a5fa",
  water: "#06b6d4",
};

export default function HomePage() {
  const heroRef = useScrollReveal();
  const featuresRef = useScrollReveal();
  const zodiacRef = useScrollReveal();
  const aboutRef = useScrollReveal();

  return (
    <div>
      {/* Hero */}
      <section className="relative py-20 md:py-28 overflow-hidden">
        {/* Background layers */}
        <div className="absolute inset-0"
          style={{ background: "radial-gradient(ellipse at 50% 30%, rgba(120,60,220,0.15) 0%, rgba(124,58,237,0.05) 40%, transparent 70%)" }} />
        <div className="absolute inset-0"
          style={{ background: "radial-gradient(ellipse at 80% 60%, rgba(251,191,36,0.04) 0%, transparent 50%)" }} />

        <div className="max-w-7xl mx-auto px-4 text-center relative">
          <div ref={heroRef} className="scroll-reveal">
            <ZodiacWheel />

            <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold mt-8 mb-6 tracking-tight">
              <span className="text-gradient-gold">AstroSeva</span>
            </h1>

            <p className="text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed" style={{ color: "var(--text-secondary)" }}>
              Free <span className="text-gradient-purple" style={{ WebkitTextFillColor: "unset" }}>Vedic Astrology</span> Platform
              <br className="hidden md:block" />
              Kundli &middot; Marriage Matching &middot; AI Predictions &middot; and more
            </p>
          </div>

          <div ref={featuresRef} className="flex flex-wrap justify-center gap-4 scroll-reveal" style={{ transitionDelay: "150ms" }}>
            <Link href="/kundli" className="glow-btn text-lg">Generate Kundli</Link>
            <Link href="/matching" className="glow-btn-outline text-lg">Marriage Matching</Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
            Our <span className="text-gradient-purple">Services</span>
          </h2>
          <p className="text-center mb-14 max-w-lg mx-auto" style={{ color: "var(--text-secondary)" }}>
            Ancient wisdom meets modern technology. Explore our suite of Vedic astrology tools.
          </p>

          <div ref={zodiacRef} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 scroll-stagger">
            {features.map((f) => (
              <Link key={f.href} href={f.href}
                className="glass-card p-6 group scroll-reveal"
                style={{ textDecoration: "none" }}>
                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl mb-4 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3"
                  style={{ background: `${f.color}15`, color: f.color }}>
                  {f.icon}
                </div>
                <h3 className="text-lg font-bold mb-2 group-hover:text-white transition-colors" style={{ color: "var(--text-primary)" }}>{f.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>{f.description}</p>
                <div className="mt-4 text-xs font-medium flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  style={{ color: elementColors[f.element] }}>
                  Learn more <span className="transition-transform group-hover:translate-x-1">&rarr;</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Zodiac Signs */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
            Daily <span className="text-gradient-gold">Horoscope</span>
          </h2>
          <p className="text-center mb-14 max-w-lg mx-auto" style={{ color: "var(--text-secondary)" }}>
            Select your zodiac sign to view today&apos;s prediction
          </p>

          <div ref={aboutRef} className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4 scroll-stagger">
            {zodiacSigns.map((z) => (
              <Link key={z.sign} href={`/horoscope?sign=${z.sign}`}
                className="text-center p-5 rounded-xl scroll-reveal group"
                style={{ border: "1px solid transparent", transition: "all 0.35s cubic-bezier(0.16, 1, 0.3, 1)" }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = `${elementColors[z.element]}40`;
                  e.currentTarget.style.background = `${elementColors[z.element]}08`;
                  e.currentTarget.style.boxShadow = `0 0 25px ${elementColors[z.element]}15`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "transparent";
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.boxShadow = "none";
                }}>
                <div className="text-4xl mb-2 transition-transform duration-300 group-hover:scale-125"
                  style={{ filter: `drop-shadow(0 0 8px ${elementColors[z.element]}60)` }}>
                  {z.symbol}
                </div>
                <div className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>{z.name}</div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* About */}
      <section className="py-20">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            About <span className="text-gradient-gold">AstroSeva</span>
          </h2>
          <p className="text-lg mb-4 leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            AstroSeva is a free Vedic Astrology platform that provides accurate birth chart generation,
            marriage matching, AI-powered predictions, and all essential astrology tools.
          </p>
          <p className="text-lg mb-10 leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            Our calculations are based on the ancient Vedic astrology system with <span className="text-gradient-purple" style={{ WebkitTextFillColor: "unset" }}>Lahiri ayanamsa</span>.
          </p>
          <Link href="/kundli" className="glow-btn inline-block text-lg">Get Your Kundli Now</Link>
        </div>
      </section>
    </div>
  );
}
