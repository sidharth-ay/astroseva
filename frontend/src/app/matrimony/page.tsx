"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import {
  Heart,
  Star,
  Check,
  ChevronDown,
  ChevronRight,
  Users,
  Sparkles,
  BookOpen,
  Shield,
  Clock,
  Zap,
  ArrowRight,
} from "lucide-react";
import {
  useReducedMotion,
  staggerContainerCustom,
  staggerItem,
  slideUp,
  stagger,
} from "@/lib/motion";

const features = [
  {
    title: "Kundli Matching",
    description:
      "Complete Ashtakoot gun milan analysis with 36 points scoring. Evaluate mental compatibility, health, family harmony, and progeny prospects.",
    icon: BookOpen,
    color: "#C8956D",
  },
  {
    title: "Horoscope Compatibility",
    description:
      "Detailed birth chart comparison covering Moon sign, Ascendant, planetary aspects, and house positions for deep relationship insights.",
    icon: Star,
    color: "#E8B88A",
  },
  {
    title: "Manglik Check",
    description:
      "Comprehensive Manglik dosha analysis with severity levels and effective remedies to ensure a harmonious married life.",
    icon: Shield,
    color: "#D4A574",
  },
  {
    title: "Nakshatra Matching",
    description:
      "Star-based compatibility analysis using the 27 Nakshatras. Understand emotional bonding, communication, and intimate compatibility.",
    icon: Sparkles,
    color: "#C8956D",
  },
  {
    title: "Dasha Analysis",
    description:
      "Planetary period timing to identify the most auspicious window for marriage and understand relationship phases ahead.",
    icon: Clock,
    color: "#E8B88A",
  },
  {
    title: "Remedies for Delays",
    description:
      "Personalized Vedic remedies, gemstone suggestions, and rituals to overcome obstacles and delays in finding your life partner.",
    icon: Zap,
    color: "#D4A574",
  },
];

const steps = [
  {
    number: "01",
    title: "Enter Your Details",
    description:
      "Provide your birth details — date, time, and place of birth. Both partners' information for comprehensive matching.",
  },
  {
    number: "02",
    title: "Get Compatibility Report",
    description:
      "Our AI-powered engine analyzes 100+ parameters and generates a detailed Kundli matching report with gun milan scores.",
  },
  {
    number: "03",
    title: "Start Your Journey",
    description:
      "Review the report, consult our AI astrologer for deeper insights, and take the first step toward a blissful union.",
  },
];

const testimonials = [
  {
    name: "Priya & Rahul",
    location: "Mumbai",
    text: "AstroSeva's Kundli matching gave us a detailed 34/36 score report. The compatibility analysis was spot-on and helped our families feel confident about the match.",
    rating: 5,
  },
  {
    name: "Ananya & Vikram",
    location: "Delhi",
    text: "The Manglik check was very thorough. The remedies suggested were practical and the dasha analysis helped us pick the perfect wedding date.",
    rating: 5,
  },
  {
    name: "Sneha & Arjun",
    location: "Bangalore",
    text: "We loved the Nakshatra matching report. It explained our emotional compatibility perfectly. The AI astrologer session was a bonus!",
    rating: 5,
  },
];

const faqs = [
  {
    question: "What is Kundli Matching or Gun Milan?",
    answer:
      "Kundli Matching, also known as Gun Milan, is a traditional Vedic method of checking marriage compatibility between two individuals. It analyzes 8 aspects (Ashtakoot) of both partners' birth charts and assigns a total of 36 points. A score of 18 or above is generally considered favorable for marriage.",
  },
  {
    question: "How accurate is online Kundli matching?",
    answer:
      "Online Kundli matching uses precise astronomical calculations based on the birth details provided. Our AI engine calculates planetary positions with high accuracy. However, for critical life decisions, we recommend consulting with a qualified Vedic astrologer who can provide nuanced interpretation beyond automated reports.",
  },
  {
    question: "What is Manglik Dosha and should I be worried?",
    answer:
      "Manglik Dosha occurs when Mars (Mangal) is placed in the 1st, 2nd, 4th, 7th, 8th, or 12th house of the birth chart. It can create challenges in married life. However, many remedies exist, and its severity depends on multiple factors. Both partners' charts should be checked — if both have it, the dosha is often cancelled.",
  },
  {
    question: "Can I match horoscopes if I don't have exact birth time?",
    answer:
      "While exact birth time provides the most accurate Ascendant and house analysis, our system can still perform Moon-based Nakshatra matching and planetary compatibility analysis using just date and place of birth. For detailed house-based analysis, accurate birth time is recommended.",
  },
  {
    question: "What are the 36 Gunas in Ashtakoot matching?",
    answer:
      "The 36 Gunas are divided across 8 categories: Varna (1 point), Vashya (2 points), Tara (3 points), Yoni (4 points), Graha Maitri (5 points), Gana (6 points), Bhakoot (7 points), and Nadi (8 points). Each category evaluates different aspects of compatibility — from spiritual harmony to physical and emotional bonding.",
  },
  {
    question: "Is this service free?",
    answer:
      "Basic Kundli matching and horoscope compatibility reports are available for free. Premium detailed reports, AI astrologer consultations, and personalized remedy suggestions will be available as paid services soon.",
  },
];

export default function MatrimonyPage() {
  const reduced = useReducedMotion();
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  useEffect(() => {
    document.title = "Matrimony Portal | AstroSeva";
  }, []);

  return (
    <div
      className="min-h-screen"
      style={{ background: "#1a0f0a" }}
    >
      {/* Hero Section */}
      <section className="relative py-20 px-5 overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse at center top, #C8956D10 0%, transparent 60%)",
          }}
        />
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <motion.div
            variants={slideUp}
            initial={reduced ? false : "hidden"}
            animate="visible"
          >
            <div
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6"
              style={{
                background: "#C8956D15",
                border: "1px solid #C8956D30",
              }}
            >
              <Heart size={14} style={{ color: "#C8956D" }} />
              <span
                className="text-xs font-medium tracking-wider uppercase"
                style={{ color: "#C8956D" }}
              >
                Vedic Marriage Compatibility
              </span>
            </div>

            <h1
              className="font-bold mb-4"
              style={{
                fontSize: "clamp(2rem, 5vw, 3.5rem)",
                background:
                  "linear-gradient(135deg, #C8956D, #E8B88A, #D4A574)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              AstroSeva Matrimony
            </h1>

            <p
              className="text-lg max-w-xl mx-auto mb-8"
              style={{
                color: "#B8A090",
                lineHeight: 1.7,
              }}
            >
              Find Your Perfect Match Through the Stars
            </p>

            <div className="flex flex-wrap justify-center gap-3">
              <Link
                href="/matching"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-medium transition-all duration-200"
                style={{
                  background: "linear-gradient(135deg, #C8956D, #D4A574)",
                  color: "#1a0f0a",
                }}
              >
                Marriage Matching
                <ArrowRight size={16} />
              </Link>
              <Link
                href="/love-match"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-medium transition-all duration-200"
                style={{
                  background: "#C8956D15",
                  border: "1px solid #C8956D30",
                  color: "#C8956D",
                }}
              >
                Love Compatibility
                <ArrowRight size={16} />
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 px-5">
        <div className="max-w-6xl mx-auto">
          <motion.div
            className="text-center mb-12"
            variants={slideUp}
            initial={reduced ? false : "hidden"}
            whileInView="visible"
            viewport={{ once: true }}
          >
            <p
              className="text-sm font-bold tracking-[0.2em] uppercase mb-3"
              style={{ color: "#C8956D" }}
            >
              MATRIMONY FEATURES
            </p>
            <h2
              className="font-bold mb-4"
              style={{
                fontSize: "clamp(1.5rem, 3vw, 2.2rem)",
                color: "#E8B88A",
              }}
            >
              Comprehensive Vedic Compatibility Analysis
            </h2>
            <p
              className="max-w-lg mx-auto"
              style={{ color: "#B8A090", lineHeight: 1.7 }}
            >
              Our AI-powered engine analyzes every aspect of Vedic
              compatibility to help you find your ideal life partner.
            </p>
          </motion.div>

          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
            variants={staggerContainerCustom(stagger.normal, 0.05)}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-40px" }}
          >
            {features.map((feature) => (
              <motion.div key={feature.title} variants={staggerItem}>
                <div
                  className="p-6 h-full rounded-xl"
                  style={{
                    background: "#1a0f0a",
                    border: "1px solid #C8956D20",
                  }}
                >
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                    style={{
                      background: `${feature.color}12`,
                      color: feature.color,
                    }}
                  >
                    <feature.icon size={22} />
                  </div>
                  <h3
                    className="text-base font-semibold mb-2"
                    style={{ color: "#E8B88A" }}
                  >
                    {feature.title}
                  </h3>
                  <p
                    className="text-sm leading-relaxed"
                    style={{ color: "#B8A090" }}
                  >
                    {feature.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 px-5">
        <div className="max-w-4xl mx-auto">
          <motion.div
            className="text-center mb-12"
            variants={slideUp}
            initial={reduced ? false : "hidden"}
            whileInView="visible"
            viewport={{ once: true }}
          >
            <p
              className="text-sm font-bold tracking-[0.2em] uppercase mb-3"
              style={{ color: "#C8956D" }}
            >
              HOW IT WORKS
            </p>
            <h2
              className="font-bold mb-4"
              style={{
                fontSize: "clamp(1.5rem, 3vw, 2.2rem)",
                color: "#E8B88A",
              }}
            >
              Three Simple Steps
            </h2>
          </motion.div>

          <motion.div
            className="grid grid-cols-1 md:grid-cols-3 gap-6"
            variants={staggerContainerCustom(stagger.normal, 0.1)}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-40px" }}
          >
            {steps.map((step) => (
              <motion.div
                key={step.number}
                variants={staggerItem}
                className="text-center"
              >
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold"
                  style={{
                    background: "#C8956D15",
                    border: "2px solid #C8956D40",
                    color: "#C8956D",
                  }}
                >
                  {step.number}
                </div>
                <h3
                  className="text-lg font-semibold mb-2"
                  style={{ color: "#E8B88A" }}
                >
                  {step.title}
                </h3>
                <p
                  className="text-sm leading-relaxed"
                  style={{ color: "#B8A090" }}
                >
                  {step.description}
                </p>
              </motion.div>
            ))}
          </motion.div>

          <div className="text-center mt-10">
            <Link
              href="/matching"
              className="inline-flex items-center gap-2 px-8 py-3 rounded-xl text-sm font-medium transition-all duration-200"
              style={{
                background: "linear-gradient(135deg, #C8956D, #D4A574)",
                color: "#1a0f0a",
              }}
            >
              Start Matching Now
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-16 px-5">
        <div className="max-w-6xl mx-auto">
          <motion.div
            className="text-center mb-12"
            variants={slideUp}
            initial={reduced ? false : "hidden"}
            whileInView="visible"
            viewport={{ once: true }}
          >
            <p
              className="text-sm font-bold tracking-[0.2em] uppercase mb-3"
              style={{ color: "#C8956D" }}
            >
              TRUSTED BY COUPLES
            </p>
            <h2
              className="font-bold mb-4"
              style={{
                fontSize: "clamp(1.5rem, 3vw, 2.2rem)",
                color: "#E8B88A",
              }}
            >
              What Our Users Say
            </h2>
          </motion.div>

          <motion.div
            className="grid grid-cols-1 md:grid-cols-3 gap-4"
            variants={staggerContainerCustom(stagger.normal, 0.1)}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-40px" }}
          >
            {testimonials.map((t) => (
              <motion.div
                key={t.name}
                variants={staggerItem}
                className="p-6 rounded-xl"
                style={{
                  background: "#1a0f0a",
                  border: "1px solid #C8956D20",
                }}
              >
                <div className="flex gap-1 mb-3">
                  {Array.from({ length: t.rating }).map((_, i) => (
                    <Star
                      key={i}
                      size={14}
                      fill="#C8956D"
                      color="#C8956D"
                    />
                  ))}
                </div>
                <p
                  className="text-sm leading-relaxed mb-4"
                  style={{ color: "#B8A090" }}
                >
                  &ldquo;{t.text}&rdquo;
                </p>
                <div>
                  <p
                    className="text-sm font-semibold"
                    style={{ color: "#E8B88A" }}
                  >
                    {t.name}
                  </p>
                  <p className="text-xs" style={{ color: "#8A7060" }}>
                    {t.location}
                  </p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 px-5">
        <div className="max-w-3xl mx-auto">
          <motion.div
            className="text-center mb-12"
            variants={slideUp}
            initial={reduced ? false : "hidden"}
            whileInView="visible"
            viewport={{ once: true }}
          >
            <p
              className="text-sm font-bold tracking-[0.2em] uppercase mb-3"
              style={{ color: "#C8956D" }}
            >
              COMMON QUESTIONS
            </p>
            <h2
              className="font-bold mb-4"
              style={{
                fontSize: "clamp(1.5rem, 3vw, 2.2rem)",
                color: "#E8B88A",
              }}
            >
              Frequently Asked Questions
            </h2>
          </motion.div>

          <motion.div
            className="space-y-3"
            variants={staggerContainerCustom(stagger.normal, 0.05)}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-40px" }}
          >
            {faqs.map((faq, i) => (
              <motion.div
                key={i}
                variants={staggerItem}
                className="rounded-xl overflow-hidden"
                style={{
                  background: "#1a0f0a",
                  border: "1px solid #C8956D20",
                }}
              >
                <button
                  className="w-full text-left px-5 py-4 flex items-center justify-between gap-3"
                  onClick={() =>
                    setOpenFaq(openFaq === i ? null : i)
                  }
                  style={{ color: "#E8B88A" }}
                >
                  <span className="text-sm font-medium">
                    {faq.question}
                  </span>
                  <ChevronDown
                    size={16}
                    className="shrink-0 transition-transform duration-200"
                    style={{
                      transform:
                        openFaq === i
                          ? "rotate(180deg)"
                          : "rotate(0deg)",
                    }}
                  />
                </button>
                {openFaq === i && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    transition={{ duration: 0.2 }}
                    className="px-5 pb-4"
                  >
                    <p
                      className="text-sm leading-relaxed"
                      style={{ color: "#B8A090" }}
                    >
                      {faq.answer}
                    </p>
                  </motion.div>
                )}
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Footer Disclaimer */}
      <section
        className="py-12 px-5"
        style={{ borderTop: "1px solid #C8956D15" }}
      >
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            variants={slideUp}
            initial={reduced ? false : "hidden"}
            whileInView="visible"
            viewport={{ once: true }}
          >
            <Users
              size={28}
              className="mx-auto mb-4"
              style={{ color: "#C8956D" }}
            />
            <p
              className="text-sm leading-relaxed mb-4"
              style={{ color: "#8A7060" }}
            >
              AstroSeva Matrimony uses Vedic astrological principles to
              provide compatibility insights. Results are based on
              traditional Ashtakoot gun milan and should be used as a
              guide alongside personal judgment.
            </p>
            <p
              className="text-xs"
              style={{ color: "#6A5A4A" }}
            >
              Paid premium reports and personalized consultations will be
              available soon. Basic matching features are currently free.
            </p>
            <div className="flex justify-center gap-4 mt-6">
              <Link
                href="/matching"
                className="text-xs font-medium transition-colors"
                style={{ color: "#C8956D" }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = "#E8B88A";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = "#C8956D";
                }}
              >
                Marriage Matching
              </Link>
              <span style={{ color: "#3A2A1A" }}>|</span>
              <Link
                href="/love-match"
                className="text-xs font-medium transition-colors"
                style={{ color: "#C8956D" }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = "#E8B88A";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = "#C8956D";
                }}
              >
                Love Match
              </Link>
              <span style={{ color: "#3A2A1A" }}>|</span>
              <Link
                href="/kundli"
                className="text-xs font-medium transition-colors"
                style={{ color: "#C8956D" }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = "#E8B88A";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = "#C8956D";
                }}
              >
                Kundli Generator
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
