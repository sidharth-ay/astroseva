"use client";

import Link from "next/link";
import { useEffect } from "react";
import { motion } from "framer-motion";
import {
  Sparkles,
  Heart,
  Star,
  Brain,
  Hash,
  BookOpen,
  Bot,
  MessageCircle,
  ChevronRight,
} from "lucide-react";
import {
  useReducedMotion,
  staggerContainerCustom,
  staggerItem,
  slideUp,
  stagger,
} from "@/lib/motion";

const services = [
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
    title: "Daily Horoscope",
    description:
      "Your daily horoscope with love, career, and health ratings to guide your day.",
    href: "/horoscope",
    icon: Star,
    color: "#D4A574",
  },
  {
    title: "AI Predictions",
    description:
      "Personalized predictions powered by AI for career, marriage, health, and life guidance.",
    href: "/predictions",
    icon: Brain,
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
  {
    title: "AI Astrologer",
    description:
      "Chat with our AI-powered astrologer for instant, personalized guidance on any life question.",
    href: "/ai",
    icon: Bot,
    color: "#C8956D",
  },
  {
    title: "AI Chat",
    description:
      "Have a conversation about astrology, numerology, and Vedic wisdom with our intelligent assistant.",
    href: "/chat",
    icon: MessageCircle,
    color: "#E8B88A",
  },
];

export default function ServicesPage() {
  const reduced = useReducedMotion();

  useEffect(() => {
    document.title = "Services | AstroSeva";
  }, []);

  return (
    <div className="py-20 px-5">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <motion.div
          className="text-center mb-16"
          variants={slideUp}
          initial={reduced ? false : "hidden"}
          animate="visible"
        >
          <p className="heading-section mb-3">WHAT WE OFFER</p>
          <h1
            className="heading-display font-bold mb-4"
            style={{ fontSize: "clamp(1.8rem, 4vw, 3rem)" }}
          >
            OUR{" "}
            <span
              style={{
                background: "linear-gradient(135deg, #C8956D, #E8B88A, #D4A574)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              SERVICES
            </span>
          </h1>
          <p
            className="max-w-lg mx-auto"
            style={{
              color: "var(--text-secondary)",
              lineHeight: 1.7,
              fontSize: "1rem",
            }}
          >
            Explore our complete suite of Vedic astrology tools, all powered by
            AI and completely free to use.
          </p>
        </motion.div>

        {/* Services Grid */}
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5"
          variants={staggerContainerCustom(stagger.normal, 0.06)}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-40px" }}
        >
          {services.map((service) => (
            <motion.div key={service.href} variants={staggerItem}>
              <Link
                href={service.href}
                className="glass-card block p-6 h-full group"
                style={{ textDecoration: "none" }}
              >
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center mb-5"
                  style={{
                    background: `${service.color}12`,
                    color: service.color,
                  }}
                >
                  <service.icon size={22} />
                </div>
                <h3
                  className="text-base font-semibold mb-2"
                  style={{ color: "var(--text-primary)" }}
                >
                  {service.title}
                </h3>
                <p
                  className="text-sm leading-relaxed mb-5"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {service.description}
                </p>
                <span
                  className="text-sm font-medium flex items-center gap-1 transition-all duration-150"
                  style={{ color: service.color, opacity: 0.6 }}
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
              </Link>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
