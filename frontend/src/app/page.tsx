"use client";

import Link from "next/link";

const features = [
  { title: "Kundli Generator", description: "Generate your Vedic birth chart with planetary positions, houses, and analysis.", href: "/kundli", icon: "\u{1F52E}", color: "#f97316" },
  { title: "Marriage Matching", description: "Ashtakoot gun milan for marriage compatibility analysis.", href: "/matching", icon: "\u{1F492}", color: "#ec4899" },
  { title: "AI Predictions", description: "Get personalized predictions powered by AI for career, marriage, health, and more.", href: "/predictions", icon: "\u{1F52E}", color: "#a78bfa" },
  { title: "Daily Horoscope", description: "Your daily horoscope with love, career, and health ratings.", href: "/horoscope", icon: "\u2B50", color: "#60a5fa" },
  { title: "Numerology", description: "Calculate your life path, destiny, and soul urge numbers.", href: "/numerology", icon: "\u{1F522}", color: "#facc15" },
  { title: "Panchang", description: "Daily panchang with tithi, nakshatra, yoga, and auspicious timings.", href: "/panchang", icon: "\u{1F570}\uFE0F", color: "#34d399" },
];

const zodiacSigns = [
  { name: "Aries", symbol: "\u2648", sign: "aries" },
  { name: "Taurus", symbol: "\u2649", sign: "taurus" },
  { name: "Gemini", symbol: "\u264A", sign: "gemini" },
  { name: "Cancer", symbol: "\u264B", sign: "cancer" },
  { name: "Leo", symbol: "\u264C", sign: "leo" },
  { name: "Virgo", symbol: "\u264D", sign: "virgo" },
  { name: "Libra", symbol: "\u264E", sign: "libra" },
  { name: "Scorpio", symbol: "\u264F", sign: "scorpio" },
  { name: "Sagittarius", symbol: "\u2650", sign: "sagittarius" },
  { name: "Capricorn", symbol: "\u2651", sign: "capricorn" },
  { name: "Aquarius", symbol: "\u2652", sign: "aquarius" },
  { name: "Pisces", symbol: "\u2653", sign: "pisces" },
];

export default function HomePage() {
  return (
    <div>
      {/* Hero */}
      <section className="relative py-24 overflow-hidden">
        <div className="absolute inset-0"
          style={{ background: "radial-gradient(ellipse at 50% 20%, rgba(147,51,234,0.15) 0%, transparent 60%)" }} />
        <div className="max-w-7xl mx-auto px-4 text-center relative">
          <div className="animate-fade-in-up">
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl flex items-center justify-center text-3xl animate-glow-pulse"
              style={{ background: "linear-gradient(135deg, var(--accent-deep), #6d28d9)" }}>
              &#x2728;
            </div>
            <h1 className="text-5xl md:text-7xl font-bold mb-6">
              <span style={{ color: "var(--gold)" }}>AstroSeva</span>
            </h1>
            <p className="text-xl md:text-2xl max-w-2xl mx-auto mb-10" style={{ color: "var(--text-secondary)" }}>
              Free Vedic Astrology Platform &mdash; Kundli, Marriage Matching, AI Predictions &amp; more
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-4 animate-fade-in-up" style={{ animationDelay: "200ms" }}>
            <Link href="/kundli" className="glow-btn text-lg">Generate Kundli</Link>
            <Link href="/matching" className="glow-btn-outline text-lg">Marriage Matching</Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12 animate-fade-in-up">Our Services</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 stagger-children">
            {features.map((f) => (
              <Link key={f.href} href={f.href}
                className="glass-card p-6 group animate-fade-in-up hover:scale-[1.02]"
                style={{ transition: "all 0.3s ease" }}>
                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl mb-4"
                  style={{ background: `${f.color}20`, color: f.color }}>
                  {f.icon}
                </div>
                <h3 className="text-lg font-bold mb-2" style={{ color: "var(--text-primary)" }}>{f.title}</h3>
                <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{f.description}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Zodiac Signs */}
      <section className="py-20 glass-card-static mx-4 mb-20" style={{ borderRadius: 24 }}>
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Daily Horoscope</h2>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4 stagger-children">
            {zodiacSigns.map((z) => (
              <Link key={z.sign} href={`/horoscope?sign=${z.sign}`}
                className="text-center p-4 rounded-xl transition-all duration-300 hover:bg-white/5 group animate-fade-in-up"
                style={{ border: "1px solid transparent" }}
                onMouseEnter={(e) => e.currentTarget.style.borderColor = "var(--border)"}
                onMouseLeave={(e) => e.currentTarget.style.borderColor = "transparent"}>
                <div className="text-4xl mb-2 group-hover:scale-110 transition-transform duration-300">
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
          <h2 className="text-3xl font-bold mb-6">About AstroSeva</h2>
          <p className="text-lg mb-4" style={{ color: "var(--text-secondary)" }}>
            AstroSeva is a free Vedic Astrology platform that provides accurate birth chart generation,
            marriage matching, AI-powered predictions, and all essential astrology tools.
          </p>
          <p className="text-lg mb-8" style={{ color: "var(--text-secondary)" }}>
            Our calculations are based on the ancient Vedic astrology system with Lahiri ayanamsa.
          </p>
          <Link href="/kundli" className="glow-btn inline-block">Get Your Kundli Now</Link>
        </div>
      </section>
    </div>
  );
}
