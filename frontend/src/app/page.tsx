"use client";

import { useRef, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import ZodiacWheel from "@/components/ZodiacWheel";
import HoroscopePopup from "@/components/HoroscopePopup";
import FeatureShowcase from "@/components/FeatureShowcase";
import MarqueeStrip from "@/components/MarqueeStrip";
import { useScrollReveal } from "@/lib/useScrollReveal";
import { useTilt } from "@/lib/useTilt";
import { useMagnetic } from "@/lib/useMagnetic";

const features = [
  { title: "Kundli Generator", description: "Generate your Vedic birth chart with planetary positions, houses, and analysis.", href: "/kundli", icon: "\u{1F52E}", color: "#f97316", element: "fire" },
  { title: "Marriage Matching", description: "Ashtakoot gun milan for marriage compatibility analysis.", href: "/matching", icon: "\u{1F492}", color: "#ec4899", element: "water" },
  { title: "AI Predictions", description: "Get personalized predictions powered by AI for career, marriage, health, and more.", href: "/predictions", icon: "\u2728", color: "#b48eff", element: "air" },
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

function FeatureCard({ f, index }: { f: typeof features[0]; index: number }) {
  const { ref: tiltRef, onMouseMove, onMouseLeave } = useTilt(6);
  const iconDelays = ["", "icon-idle-pulse-delay-1", "icon-idle-pulse-delay-2", "icon-idle-pulse-delay-3", "icon-idle-pulse-delay-4", "icon-idle-pulse-delay-5"];

  return (
    <div
      ref={tiltRef}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      style={{ transformStyle: "preserve-3d" }}
    >
      <Link href={f.href}
        className="glass-card p-8 group scroll-reveal block"
        style={{ textDecoration: "none", transitionDelay: `${index * 80}ms` }}>
        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-2xl mb-5 icon-idle-pulse ${iconDelays[index]}`}
          style={{ background: `${f.color}15`, color: f.color }}>
          {f.icon}
        </div>
        <h3 className="text-xl font-bold mb-3 group-hover:text-white transition-colors" style={{ color: "var(--text-primary)" }}>{f.title}</h3>
        <p className="text-sm leading-relaxed mb-4" style={{ color: "var(--text-secondary)" }}>{f.description}</p>
        <div className="text-xs font-medium flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          style={{ color: elementColors[f.element] }}>
          Learn more <span className="transition-transform group-hover:translate-x-1">&rarr;</span>
        </div>
      </Link>
    </div>
  );
}

function RippleButton({ children, className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { children: React.ReactNode }) {
  const btnRef = useRef<HTMLButtonElement>(null);

  const handleClick = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    const btn = btnRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const ripple = document.createElement("span");
    ripple.className = "ripple";
    const size = Math.max(rect.width, rect.height);
    ripple.style.width = ripple.style.height = `${size}px`;
    ripple.style.left = `${e.clientX - rect.left - size / 2}px`;
    ripple.style.top = `${e.clientY - rect.top - size / 2}px`;
    btn.appendChild(ripple);
    setTimeout(() => ripple.remove(), 600);
    props.onClick?.(e);
  }, [props]);

  return (
    <button ref={btnRef} className={`${className} ripple-container`} onClick={handleClick} {...props}>
      {children}
    </button>
  );
}

export default function HomePage() {
  const heroRef = useScrollReveal();
  const featuresHeaderRef = useScrollReveal();
  const featuresGridRef = useScrollReveal();
  const zodiacHeaderRef = useScrollReveal();
  const zodiacGridRef = useScrollReveal();
  const aboutRef = useScrollReveal();

  const mag1 = useMagnetic<HTMLDivElement>(0.25, 120);
  const mag2 = useMagnetic<HTMLDivElement>(0.2, 100);

  const [scrollY, setScrollY] = useState(0);
  const [popupSign, setPopupSign] = useState<string | null>(null);

  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div>
      {/* Horoscope Popup */}
      {popupSign && <HoroscopePopup sign={popupSign} onClose={() => setPopupSign(null)} />}

      {/* Hero */}
      <section className="relative py-20 md:py-28 overflow-hidden">
        {/* Floating background orbs */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="hero-orb hero-orb-1" />
          <div className="hero-orb hero-orb-2" />
          <div className="hero-orb hero-orb-3" />
        </div>

        {/* Background layers */}
        <div className="absolute inset-0"
          style={{ background: "radial-gradient(ellipse at 50% 30%, rgba(120,60,220,0.15) 0%, rgba(124,58,237,0.05) 40%, transparent 70%)" }} />
        <div className="absolute inset-0"
          style={{ background: "radial-gradient(ellipse at 80% 60%, rgba(251,191,36,0.04) 0%, transparent 50%)" }} />

        <div className="max-w-7xl mx-auto px-4 text-center relative">
          <div ref={heroRef} className="scroll-reveal" style={{ transform: `translateY(${scrollY * 0.15}px)` }}>
            <div className="hero-wheel-enter">
              <ZodiacWheel />
            </div>

            <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold font-display mt-8 mb-6 tracking-tight text-glow-gold">
              <span className="text-gradient-gold heading-underline">AstroSeva</span>
            </h1>

            <p className="text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed hero-subtitle" style={{ color: "var(--text-secondary)" }}>
              Free <span className="text-gradient-purple" style={{ WebkitTextFillColor: "unset" }}>Vedic Astrology</span> Platform
              <br className="hidden md:block" />
              Kundli &middot; Marriage Matching &middot; AI Predictions &middot; and more
            </p>
          </div>

          <div ref={featuresHeaderRef} className="flex flex-wrap justify-center gap-4 scroll-reveal hero-buttons" style={{ transitionDelay: "200ms" }}>
            <div ref={mag1.ref} onMouseMove={mag1.onMouseMove} onMouseLeave={mag1.onMouseLeave}>
              <RippleButton className="glow-btn text-lg">Generate Kundli</RippleButton>
            </div>
            <div ref={mag2.ref} onMouseMove={mag2.onMouseMove} onMouseLeave={mag2.onMouseLeave}>
              <Link href="/matching" className="glow-btn-outline text-lg inline-block">Marriage Matching</Link>
            </div>
          </div>
        </div>
      </section>

      <div className="section-divider" />

      {/* Features Grid */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4">
          <div ref={featuresGridRef} className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold font-display mb-4 scroll-reveal">
              Our <span className="text-gradient-purple text-glow">Services</span>
            </h2>
            <p className="max-w-lg mx-auto scroll-reveal" style={{ color: "var(--text-secondary)", transitionDelay: "100ms" }}>
              Ancient wisdom meets modern technology. Explore our suite of Vedic astrology tools.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 scroll-stagger">
            {features.map((f, i) => (
              <FeatureCard key={f.href} f={f} index={i} />
            ))}
          </div>
        </div>
      </section>

      <div className="section-divider" />

      {/* Marquee Strip */}
      <MarqueeStrip />

      <div className="section-divider" />

      {/* Feature Showcase — full-width alternating sections */}
      <FeatureShowcase />

      <div className="section-divider" />

      {/* Zodiac Signs — tap for horoscope popup */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4">
          <div ref={zodiacHeaderRef} className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold font-display mb-4 scroll-reveal">
              Daily <span className="text-gradient-gold text-glow-gold">Horoscope</span>
            </h2>
            <p className="max-w-lg mx-auto scroll-reveal" style={{ color: "var(--text-secondary)", transitionDelay: "100ms" }}>
              Tap your zodiac sign to view today&apos;s prediction
            </p>
          </div>

          <div ref={zodiacGridRef} className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4 scroll-stagger">
            {zodiacSigns.map((z, i) => (
              <button key={z.sign} onClick={() => setPopupSign(z.sign)}
                className="text-center p-5 rounded-xl scroll-reveal group zodiac-sign-card cursor-pointer"
                style={{ border: "1px solid transparent", background: "transparent", transition: "all 0.35s cubic-bezier(0.16, 1, 0.3, 1)", animationDelay: `${i * 60}ms` }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = `${elementColors[z.element]}40`;
                  e.currentTarget.style.background = `${elementColors[z.element]}08`;
                  e.currentTarget.style.boxShadow = `0 0 30px ${elementColors[z.element]}20`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "transparent";
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.boxShadow = "none";
                }}>
                <div className="text-4xl mb-2 transition-all duration-300 group-hover:scale-125 zodiac-sign-float"
                  style={{
                    filter: `drop-shadow(0 0 8px ${elementColors[z.element]}60)`,
                    animationDelay: `${i * 0.3}s`,
                  }}>
                  {z.symbol}
                </div>
                <div className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>{z.name}</div>
                <div className="text-[10px] mt-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  style={{ color: elementColors[z.element] }}>
                  tap for horoscope
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      <div className="section-divider" />

      {/* About */}
      <section className="py-20">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <div ref={aboutRef} className="scroll-reveal">
            <h2 className="text-3xl md:text-4xl font-bold font-display mb-6">
              About <span className="text-gradient-gold text-glow-gold">AstroSeva</span>
            </h2>
            <p className="text-lg mb-4 leading-relaxed" style={{ color: "var(--text-secondary)" }}>
              AstroSeva is a free Vedic Astrology platform that provides accurate birth chart generation,
              marriage matching, AI-powered predictions, and all essential astrology tools.
            </p>
            <p className="text-lg mb-10 leading-relaxed" style={{ color: "var(--text-secondary)" }}>
              Our calculations are based on the ancient Vedic astrology system with <span className="text-gradient-purple" style={{ WebkitTextFillColor: "unset" }}>Lahiri ayanamsa</span>.
            </p>
            <RippleButton className="glow-btn text-lg">Get Your Kundli Now</RippleButton>
          </div>
        </div>
      </section>
    </div>
  );
}
