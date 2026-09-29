"use client";

import Link from "next/link";
import { useEffect } from "react";
import { motion } from "motion/react";
import {
  Sparkles,
  Star,
  Brain,
  ChevronRight,
  Calendar,
  Compass,
  Activity,
  Globe,
  Zap,
  Code2,
  FileText,
  Layers,
  Download,
  Check,
  X,
  ArrowRight,
  Cpu,
  FileCode2,
  Blocks,
  Info,
} from "lucide-react";
import {
  useReducedMotion,
  staggerContainerCustom,
  staggerItem,
  slideUp,
  stagger,
} from "@/lib/motion";

const tiers = [
  {
    name: "Free",
    price: "₹0",
    period: "forever",
    description: "Everything you need to get started with Vedic astrology.",
    color: "#C8956D",
    features: [
      { text: "Basic Kundli Generation", included: true },
      { text: "Daily Horoscope", included: true },
      { text: "Marriage Matching (Ashtakoot)", included: true },
      { text: "Panchang & Muhurat", included: true },
      { text: "Numerology Calculator", included: true },
      { text: "AI Predictions", included: false },
      { text: "AI Consultations", included: false },
      { text: "Transit Alerts", included: false },
      { text: "API Access", included: false },
      { text: "White-Label Solutions", included: false },
    ],
    cta: { text: "Try Free Tools", href: "/services" },
  },
  {
    name: "Pro",
    price: "₹299",
    period: "/month",
    description: "Advanced predictions, AI consultations, and personalized reports.",
    color: "#E8B88A",
    badge: "Most Popular",
    features: [
      { text: "Everything in Free", included: true },
      { text: "Advanced AI Predictions", included: true },
      { text: "AI Consultations", included: true },
      { text: "Personalized PDF Reports", included: true },
      { text: "Transit Alerts & Notifications", included: true },
      { text: "Varshphal (Annual Horoscope)", included: true },
      { text: "Priority Support", included: true },
      { text: "Bulk Chart Generation", included: false },
      { text: "API Access", included: false },
      { text: "White-Label Solutions", included: false },
    ],
    // No checkout exists, so these point somewhere real rather than at "#",
    // which silently did nothing when clicked.
    cta: { text: "See what's free today", href: "/services" },
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "pricing",
    description: "API access, white-label solutions, and custom integrations.",
    color: "#D4A574",
    features: [
      { text: "Everything in Pro", included: true },
      { text: "REST API Access", included: true },
      { text: "White-Label Solutions", included: true },
      { text: "Bulk Chart Generation", included: true },
      { text: "Custom Integrations", included: true },
      { text: "Dedicated Support", included: true },
      { text: "SLA Guarantee", included: true },
      { text: "Custom Ayanamsa Support", included: true },
      { text: "Volume Discounts", included: true },
      { text: "On-Premise Deployment", included: true },
    ],
    cta: { text: "See what's free today", href: "/services" },
  },
];

const features = [
  {
    title: "Birth Chart Generation",
    description: "Lahiri, KP, B.V. Raman ayanamsa support with precise calculations.",
    icon: Sparkles,
    color: "#C8956D",
  },
  {
    title: "Transit Tracker",
    description: "Real-time planetary transits with Gochar analysis and predictions.",
    icon: Compass,
    color: "#87CEEB",
  },
  {
    title: "Dasha Calculator",
    description: "Vimshottari and other dasha systems with timeline predictions.",
    icon: Calendar,
    color: "#E8B88A",
  },
  {
    title: "Compatibility Engine",
    description: "Ashtakoot + South Indian matching with detailed scoring breakdown.",
    icon: Activity,
    color: "#DDA0DD",
  },
  {
    title: "Report Generator",
    description: "PDF birth reports, compatibility reports, and personalized insights.",
    icon: FileText,
    color: "#C8956D",
  },
  {
    title: "API Access",
    description: "REST API for developers with comprehensive documentation.",
    icon: Code2,
    color: "#E8B88A",
  },
  {
    title: "Multi-Chart Support",
    description: "North, South, East Indian chart styles with configurable layouts.",
    icon: Layers,
    color: "#87CEEB",
  },
  {
    title: "Export & Print",
    description: "PDF, PNG chart export with high-resolution printing support.",
    icon: Download,
    color: "#5DC88F",
  },
];

const codeExample = `// Generate a birth chart via API
const response = await fetch("http://127.0.0.1:8000/api/v1/kundli/generate?ayanamsa_type=lahiri", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    name: "Sample User",
    birth_date: "1990-01-15",
    birth_time: "10:30",
    birth_place: "New Delhi",
    latitude: 28.6139,
    longitude: 77.2090,
    timezone_offset: 5.5
  })
});
const chart = await response.json();
// => { ascendant, asc_sign_name, planets: [...], houses: {...}, ... }`;

export default function SoftwarePage() {
  const reduced = useReducedMotion();

  useEffect(() => {
    document.title = "Online Astrology Software | AstroSeva";
  }, []);

  return (
    <div className="py-20 px-5">
      <div className="max-w-6xl mx-auto">
        {/* Hero Section */}
        <motion.div
          className="text-center mb-16"
          variants={slideUp}
          initial={reduced ? false : "hidden"}
          animate="visible"
        >
          <motion.div
            initial={reduced ? false : { opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-6"
            style={{
              background: "rgba(200, 149, 109, 0.1)",
              border: "1px solid rgba(200, 149, 109, 0.2)",
            }}
          >
            <Cpu size={14} style={{ color: "#C8956D" }} />
            <span
              className="text-xs font-medium tracking-wide"
              style={{ color: "#C8956D" }}
            >
              PROFESSIONAL VEDIC ASTROLOGY TOOLS
            </span>
          </motion.div>
          <p className="heading-section mb-3">ASTROSEVA SOFTWARE</p>
          <h1
            className="heading-display font-bold mb-4"
            style={{ fontSize: "clamp(1.8rem, 4vw, 3rem)" }}
          >
           {" "}
            <span
              style={{
                background:
                  "linear-gradient(135deg, #C8956D, #E8B88A, #D4A574)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              ASTROLOGY SOFTWARE
            </span>{" "}
            PLATFORM
          </h1>
          <p
            className="max-w-2xl mx-auto"
            style={{
              color: "var(--text-secondary)",
              lineHeight: 1.7,
              fontSize: "1rem",
            }}
          >
            Professional-grade Vedic astrology tools for individuals,
            astrologers, and businesses. From birth charts to AI-powered
            predictions, everything you need in one platform.
          </p>
        </motion.div>

        {/* Live Demos */}
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-16"
          variants={staggerContainerCustom(stagger.normal, 0.05)}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-40px" }}
        >
          {[
            {
              title: "Kundli Generator",
              description: "Generate your birth chart now",
              href: "/kundli",
              icon: Sparkles,
            },
            {
              title: "Marriage Matching",
              description: "Check compatibility live",
              href: "/matching",
              icon: Activity,
            },
            {
              title: "AI Predictions",
              description: "Get personalized predictions",
              href: "/predictions",
              icon: Brain,
            },
          ].map((demo) => (
            <motion.div key={demo.href} variants={staggerItem}>
              <Link
                href={demo.href}
                className="glass-card block p-5 group text-center"
                style={{ textDecoration: "none" }}
              >
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3"
                  style={{
                    background: "rgba(200, 149, 109, 0.1)",
                    color: "#C8956D",
                  }}
                >
                  <demo.icon size={22} />
                </div>
                <h3
                  className="text-sm font-semibold mb-1"
                  style={{ color: "var(--text-primary)" }}
                >
                  {demo.title}
                </h3>
                <p
                  className="text-xs mb-3"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {demo.description}
                </p>
                <span
                  className="text-xs font-medium flex items-center justify-center gap-1 transition-all duration-150"
                  style={{ color: "#C8956D", opacity: 0.6 }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.opacity = "1";
                    e.currentTarget.style.gap = "0.5rem";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.opacity = "0.6";
                    e.currentTarget.style.gap = "0.25rem";
                  }}
                >
                  Try Live <ChevronRight size={12} />
                </span>
              </Link>
            </motion.div>
          ))}
        </motion.div>

        {/* Pricing Tiers */}
        <section className="mb-16">
          <motion.h2
            className="text-sm font-bold tracking-[0.2em] uppercase mb-2 text-center"
            style={{ color: "#C8956D" }}
            initial={reduced ? false : { opacity: 0, y: -10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            CHOOSE YOUR PLAN
          </motion.h2>
          <motion.p
            className="text-center mb-10 max-w-lg mx-auto"
            style={{
              color: "var(--text-secondary)",
              fontSize: "0.95rem",
              lineHeight: 1.6,
            }}
            initial={reduced ? false : { opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            The tiers below describe intended packaging. Paid plans are not
            on sale yet and nothing here takes a payment.
          </motion.p>
          <div
            className="max-w-2xl mx-auto mb-8 rounded-lg p-4 text-sm flex gap-2"
            style={{
              background: "var(--bg-surface)",
              border: "1px solid #C8956D40",
              color: "var(--text-secondary)",
              lineHeight: 1.6,
            }}
            role="note"
          >
            <Info className="w-4 h-4 shrink-0 mt-0.5" style={{ color: "#C8956D" }} />
            <span>
              Every astrological tool on this site is free to use today, and the
              API runs on the same engine. Paid tiers, API keys and invoicing are
              still to be built, so the buttons below will not take a payment.
            </span>
          </div>
          <motion.div
            className="grid grid-cols-1 md:grid-cols-3 gap-6"
            variants={staggerContainerCustom(stagger.normal, 0.08)}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-40px" }}
          >
            {tiers.map((tier) => (
              <motion.div
                key={tier.name}
                variants={staggerItem}
                className="glass-card p-6 flex flex-col relative overflow-hidden"
                style={{
                  border:
                    tier.badge
                      ? `1px solid ${tier.color}40`
                      : "1px solid rgba(255,255,255,0.05)",
                }}
              >
                {tier.badge && (
                  <div
                    className="absolute top-0 right-0 px-3 py-1 text-[10px] font-bold tracking-wider uppercase rounded-bl-lg"
                    style={{
                      background: tier.color,
                      color: "#1a0f0a",
                    }}
                  >
                    {tier.badge}
                  </div>
                )}
                <div className="mb-4">
                  <h3
                    className="text-lg font-bold mb-1"
                    style={{ color: tier.color }}
                  >
                    {tier.name}
                  </h3>
                  <div className="flex items-baseline gap-1 mb-2">
                    <span
                      className="text-3xl font-bold"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {tier.price}
                    </span>
                    <span
                      className="text-xs"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      {tier.period}
                    </span>
                  </div>
                  <p
                    className="text-xs leading-relaxed"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {tier.description}
                  </p>
                </div>
                <div className="flex-1 mb-6">
                  <div className="space-y-2.5">
                    {tier.features.map((feature) => (
                      <div
                        key={feature.text}
                        className="flex items-center gap-2"
                      >
                        {feature.included ? (
                          <Check
                            size={14}
                            style={{ color: "#5DC88F", flexShrink: 0 }}
                          />
                        ) : (
                          <X
                            size={14}
                            style={{
                              color: "var(--text-secondary)",
                              opacity: 0.3,
                              flexShrink: 0,
                            }}
                          />
                        )}
                        <span
                          className="text-xs"
                          style={{
                            color: feature.included
                              ? "var(--text-primary)"
                              : "var(--text-secondary)",
                            opacity: feature.included ? 1 : 0.4,
                          }}
                        >
                          {feature.text}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                <Link
                  href={tier.cta.href}
                  className="block text-center py-2.5 px-4 rounded-lg text-xs font-semibold transition-all duration-200"
                  style={{
                    background: tier.badge ? tier.color : "transparent",
                    color: tier.badge ? "#1a0f0a" : tier.color,
                    border: tier.badge ? "none" : `1px solid ${tier.color}40`,
                    textDecoration: "none",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.opacity = "0.85";
                    e.currentTarget.style.transform = "translateY(-1px)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.opacity = "1";
                    e.currentTarget.style.transform = "translateY(0)";
                  }}
                >
                  {tier.cta.text}
                </Link>
              </motion.div>
            ))}
          </motion.div>
        </section>

        {/* Key Features Grid */}
        <section className="mb-16">
          <motion.h2
            className="text-sm font-bold tracking-[0.2em] uppercase mb-2 text-center"
            style={{ color: "#C8956D" }}
            initial={reduced ? false : { opacity: 0, y: -10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            KEY SOFTWARE FEATURES
          </motion.h2>
          <motion.p
            className="text-center mb-10 max-w-lg mx-auto"
            style={{
              color: "var(--text-secondary)",
              fontSize: "0.95rem",
              lineHeight: 1.6,
            }}
            initial={reduced ? false : { opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            Built on authentic Vedic calculations with modern technology for
            accuracy and speed.
          </motion.p>
          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
            variants={staggerContainerCustom(stagger.normal, 0.05)}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-40px" }}
          >
            {features.map((feature) => (
              <motion.div
                key={feature.title}
                variants={staggerItem}
                className="glass-card p-5 group"
              >
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center mb-3"
                  style={{
                    background: `${feature.color}12`,
                    color: feature.color,
                  }}
                >
                  <feature.icon size={18} />
                </div>
                <h3
                  className="text-sm font-semibold mb-1.5"
                  style={{ color: "var(--text-primary)" }}
                >
                  {feature.title}
                </h3>
                <p
                  className="text-xs leading-relaxed"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </section>

        {/* For Developers Section */}
        <section className="mb-16">
          <motion.h2
            className="text-sm font-bold tracking-[0.2em] uppercase mb-2 text-center"
            style={{ color: "#C8956D" }}
            initial={reduced ? false : { opacity: 0, y: -10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            FOR DEVELOPERS
          </motion.h2>
          <motion.p
            className="text-center mb-10 max-w-lg mx-auto"
            style={{
              color: "var(--text-secondary)",
              fontSize: "0.95rem",
              lineHeight: 1.6,
            }}
            initial={reduced ? false : { opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            Integrate Vedic astrology into your applications with our REST API.
          </motion.p>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* API Features */}
            <motion.div
              variants={staggerContainerCustom(stagger.normal, 0.06)}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-40px" }}
              className="space-y-4"
            >
              {[
                {
                  icon: FileCode2,
                  title: "Comprehensive Documentation",
                  description:
                    "Detailed API docs with examples in JavaScript, Python, and more.",
                },
                {
                  icon: Zap,
                  title: "Ephemeral Calculations",
                  description:
                    "Chart calculations run server-side in one request, so there is no client-side engine to keep in step with the API.",
                },
                {
                  icon: Blocks,
                  title: "Versioned API",
                  description:
                    "Every feature endpoint sits behind a versioned path, so a breaking change is announced rather than silent.",
                },
                {
                  icon: Globe,
                  title: "Rate Limiting",
                  description:
                    "Per-endpoint limits are enforced server-side, and responses say how long to wait when one is hit.",
                },
              ].map((item) => (
                <motion.div
                  key={item.title}
                  variants={staggerItem}
                  className="glass-card p-4 flex items-start gap-3"
                >
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                    style={{
                      background: "rgba(200, 149, 109, 0.1)",
                      color: "#C8956D",
                    }}
                  >
                    <item.icon size={16} />
                  </div>
                  <div>
                    <h4
                      className="text-sm font-semibold mb-0.5"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {item.title}
                    </h4>
                    <p
                      className="text-xs leading-relaxed"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      {item.description}
                    </p>
                  </div>
                </motion.div>
              ))}
            </motion.div>

            {/* Code Preview */}
            <motion.div
              initial={reduced ? false : { opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.2 }}
              className="rounded-xl overflow-hidden"
              style={{
                background: "rgba(10, 6, 4, 0.6)",
                border: "1px solid rgba(200, 149, 109, 0.15)",
              }}
            >
              <div
                className="flex items-center gap-2 px-4 py-2.5"
                style={{
                  borderBottom: "1px solid rgba(200, 149, 109, 0.1)",
                }}
              >
                <div className="flex gap-1.5">
                  <div
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ background: "#E85D5D" }}
                  />
                  <div
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ background: "#E8B88A" }}
                  />
                  <div
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ background: "#5DC88F" }}
                  />
                </div>
                <span
                  className="text-[10px] ml-2 tracking-wide"
                  style={{ color: "var(--text-secondary)" }}
                >
                  api-example.js
                </span>
              </div>
              <pre
                className="p-4 text-xs leading-relaxed overflow-x-auto"
                style={{ color: "#D4A574" }}
              >
                <code>{codeExample}</code>
              </pre>
            </motion.div>
          </div>

          {/* Coming Soon Banner */}
          <motion.div
            className="mt-8 glass-card p-6 text-center"
            initial={reduced ? false : { opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <div className="flex items-center justify-center gap-2 mb-3">
              <Star size={16} style={{ color: "#E8B88A" }} />
              <span
                className="text-xs font-bold tracking-wider uppercase"
                style={{ color: "#E8B88A" }}
              >
                COMING SOON
              </span>
              <Star size={16} style={{ color: "#E8B88A" }} />
            </div>
            <p
              className="text-sm max-w-md mx-auto"
              style={{ color: "var(--text-secondary)", lineHeight: 1.6 }}
            >
              GraphQL API, real-time WebSocket subscriptions, custom dashboard
              builder, and multi-language support are all in development.
            </p>
          </motion.div>
        </section>

        {/* CTA Section */}
        <motion.div
          className="text-center"
          initial={reduced ? false : { opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <div
            className="glass-card p-10 rounded-2xl"
            style={{
              background:
                "linear-gradient(135deg, rgba(200,149,109,0.08) 0%, rgba(232,184,138,0.04) 100%)",
              border: "1px solid rgba(200,149,109,0.15)",
            }}
          >
            <h2
              className="text-xl font-bold mb-3"
              style={{ color: "var(--text-primary)" }}
            >
              Ready to Build with AstroSeva?
            </h2>
            <p
              className="text-sm mb-6 max-w-md mx-auto"
              style={{ color: "var(--text-secondary)", lineHeight: 1.6 }}
            >
              Start with our free tools or explore the API documentation to
              integrate astrology into your platform.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/services"
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200"
                style={{
                  background: "#C8956D",
                  color: "#1a0f0a",
                  textDecoration: "none",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.opacity = "0.85";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.opacity = "1";
                }}
              >
                Explore Free Tools
                <ArrowRight size={14} />
              </Link>
              <Link
                href="/services"
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200"
                style={{
                  background: "transparent",
                  color: "#C8956D",
                  border: "1px solid rgba(200,149,109,0.3)",
                  textDecoration: "none",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.opacity = "0.8";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.opacity = "1";
                }}
              >
                Browse all features
                <Code2 size={14} />
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
