"use client";

import Link from "next/link";
import { useEffect } from "react";
import { motion } from "motion/react";
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
  Gem,
  Calendar,
  Baby,
  Compass,
  Activity,
  Eye,
  Flower2,
  Moon,
  Sun,
  Globe,
  Zap,
  AlertTriangle,
  Mic,
  Camera,
} from "lucide-react";
import {
  useReducedMotion,
  staggerContainerCustom,
  staggerItem,
  slideUp,
  stagger,
} from "@/lib/motion";
import { Tilt } from "@/components/motion-primitives/tilt";
import { TextShimmer } from "@/components/motion-primitives/text-shimmer";

const categories = [
  {
    title: "Core Tools",
    services: [
      { title: "Kundli Generator", description: "Generate your Vedic birth chart with precise planetary positions, houses, and detailed analysis.", href: "/kundli", icon: Sparkles, color: "#C8956D" },
      { title: "Marriage Matching", description: "Ashtakoot gun milan for marriage compatibility with detailed scoring.", href: "/matching", icon: Heart, color: "#E8B88A" },
      { title: "Love Match", description: "Romantic compatibility analysis with emotional, intellectual, and physical scoring.", href: "/love-match", icon: Heart, color: "#E8A0BF" },
      { title: "AI Predictions", description: "Personalized AI predictions for career, marriage, health, and life guidance.", href: "/predictions", icon: Brain, color: "#C8956D" },
      { title: "Numerology", description: "Life path, destiny, soul urge, and personality numbers from your birth date.", href: "/numerology", icon: Hash, color: "#E8B88A" },
      { title: "AI Astrologer", description: "Chat with AI-powered astrologer for instant, personalized guidance.", href: "/ai", icon: Bot, color: "#C8956D" },
      { title: "AI Chat", description: "Conversational astrology, numerology, and Vedic wisdom assistant.", href: "/chat", icon: MessageCircle, color: "#E8B88A" },
      { title: "Personalized Reports", description: "Detailed career, finance, health, marriage, and education reports.", href: "/reports", icon: Brain, color: "#DDA0DD" },
      { title: "Saved Charts", description: "Log in to save birth charts and revisit them anytime.", href: "/saved-charts", icon: BookOpen, color: "#87CEEB" },
    ],
  },
  {
    title: "Horoscopes",
    services: [
      { title: "Daily Horoscope", description: "Daily predictions with love, career, health ratings and lucky items.", href: "/horoscope", icon: Star, color: "#D4A574", badge: "Daily" },
      { title: "Transit Today", description: "Current planetary positions (Gochar) and their influence on your life.", href: "/transit", icon: Compass, color: "#87CEEB" },
    ],
  },
  {
    title: "Panchang & Muhurat",
    services: [
      { title: "Panchang", description: "Tithi, Nakshatra, Yoga, Karana, Rahu Kaal, Choghadiya, Hora, and more.", href: "/panchang", icon: BookOpen, color: "#D4A574" },
    ],
  },
  {
    title: "Astrology Systems",
    services: [
      { title: "Lal Kitab", description: "Lal Kitab chart with planet-house remedies and practical solutions.", href: "/lalkitab", icon: BookOpen, color: "#C8956D" },
      { title: "KP Astrology", description: "Krishnamurti Paddhati chart with sub-lords and nakshatra analysis.", href: "/kp", icon: Globe, color: "#87CEEB" },
      { title: "Varshphal", description: "Annual horoscope with monthly predictions and auspicious periods.", href: "/varshphal", icon: Calendar, color: "#C8956D" },
      { title: "Chinese Astrology", description: "Chinese zodiac animal, personality traits, and compatibility.", href: "/chinese-astrology", icon: Globe, color: "#E85D5D" },
    ],
  },
  {
    title: "Dosha Analysis",
    services: [
      { title: "Dosha Check", description: "Detect Manglik, Sade Sati, and Pitru Dosha with remedies.", href: "/doshas", icon: AlertTriangle, color: "#E85D5D" },
      { title: "Pitru Dosha", description: "Ancestral affliction detection with severity analysis and remedies.", href: "/pitru-dosha", icon: Activity, color: "#E85D5D" },
      { title: "Nadi Dosha", description: "Nadi compatibility check in marriage matching with remedies.", href: "/nadi-dosha", icon: Heart, color: "#DDA0DD" },
    ],
  },
  {
    title: "Reports & Tools",
    services: [
      { title: "Gemstones", description: "Personalized gemstone recommendations based on your birth chart.", href: "/gemstones", icon: Gem, color: "#DDA0DD" },
      { title: "Baby Names", description: "Meaningful Indian baby names with numerology insights.", href: "/baby-names", icon: Baby, color: "#E8B88A" },
      { title: "Festivals", description: "Hindu festival calendar with dates and significance.", href: "/festivals", icon: Flower2, color: "#5DC88F" },
      { title: "Remedy Planner", description: "Custom weekly remedy schedule with progress tracking.", href: "/remedies", icon: Sparkles, color: "#5DC88F" },
    ],
  },
  {
    title: "Samudra Sastra",
    services: [
      { title: "Face & Body Reading", description: "Samudra Sastra interpretations for face, eyes, nose, hands, and gait.", href: "/samudra", icon: Eye, color: "#E8B88A" },
      { title: "Voice Astrology", description: "Vocal traits from Mercury and the houses of speech and communication.", href: "/voice", icon: Mic, color: "#87CEEB" },
      { title: "Mole Tracker", description: "Record mole positions on a body map with a change diary.", href: "/moles", icon: Activity, color: "#DDA0DD" },
      { title: "Age Palmistry", description: "See which palm lines dominate each stage of life with an age slider.", href: "/age-palm", icon: Sun, color: "#E8B88A" },
      { title: "Feature Compatibility", description: "Compare facial features for harmony — no birth details needed.", href: "/face-match", icon: Heart, color: "#E8A0BF" },
      { title: "Photo Consultation", description: "Submit palm or face photos for expert review within 24–48 hours.", href: "/photo-consult", icon: Camera, color: "#C8956D" },
    ],
  },
  {
    title: "Learn & Engage",
    services: [
      { title: "Learning Academy", description: "Free structured courses with lessons, quizzes, and certificates.", href: "/academy", icon: BookOpen, color: "#87CEEB" },
      { title: "My Analytics", description: "Your personal journey — visits, learning, remedies, and tracking.", href: "/analytics", icon: Activity, color: "#5DC88F" },
      { title: "Community Q&A", description: "Ask questions, share knowledge, and upvote helpful answers.", href: "/community", icon: MessageCircle, color: "#E8B88A" },
      { title: "Notifications", description: "Manage reminder preferences for horoscopes, transits, and tips.", href: "/notifications", icon: Brain, color: "#DDA0DD" },
    ],
  },
  {
    title: "Divination & Consultation",
    services: [
      { title: "Palmistry", description: "AI-powered palm reading and hand analysis consultation.", href: "/palmistry", icon: Eye, color: "#E8B88A" },
      { title: "Tarot Reading", description: "Draw tarot cards for past, present, and future insights.", href: "/tarot", icon: Star, color: "#DDA0DD" },
      { title: "Vastu Shastra", description: "AI consultation for home and office Vastu guidance.", href: "/vastu", icon: Flower2, color: "#5DC88F" },
    ],
  },
  {
    title: "More Services",
    services: [
      { title: "Mantra & Chalisa", description: "Vedic mantras with meanings, full chalisa texts, and devotional aartis.", href: "/mantra", icon: BookOpen, color: "#E8B88A" },
      { title: "Celebrity Horoscopes", description: "Birth chart analysis of famous personalities across fields.", href: "/celebrities", icon: Star, color: "#C8956D" },
      { title: "Healing & Remedies", description: "Crystals, chakras, aromatherapy, and sound healing recommendations.", href: "/healing", icon: Flower2, color: "#5DC88F" },
      { title: "Matrimony", description: "Find your perfect match through Vedic compatibility analysis.", href: "/matrimony", icon: Heart, color: "#E8A0BF" },
      { title: "Astrology Shop", description: "Authentic gemstones, rudraksha, puja items, and consultation packages.", href: "/shop", icon: Gem, color: "#DDA0DD" },
      { title: "Astrology Software", description: "Professional Vedic astrology tools, API access, and chart software.", href: "/software", icon: Zap, color: "#87CEEB" },
      { title: "Daily Lakshan Tips", description: "Traditional signs, remedies, and daily Vedic observances.", href: "/lakshan", icon: Sun, color: "#E8B88A" },
    ],
  },
];

export default function ServicesPage() {
  const reduced = useReducedMotion();

  useEffect(() => {
    document.title = "Services | AstroSeva";
  }, []);

  return (
    <div className="py-20 px-5">
      <div className="max-w-6xl mx-auto">
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
            <TextShimmer
              as="span"
              className="inline-block"
              duration={3}
              spread={2}
            >
              SERVICES
            </TextShimmer>
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

        {/* Categories */}
        {categories.map((cat) => (
          <section key={cat.title} className="mb-14">
            <motion.h2
              className="text-sm font-bold tracking-[0.2em] uppercase mb-6"
              style={{ color: "#C8956D" }}
              initial={reduced ? false : { opacity: 0, x: -10 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              {cat.title}
            </motion.h2>
            <motion.div
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
              variants={staggerContainerCustom(stagger.normal, 0.05)}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-40px" }}
            >
              {cat.services.map((service) => (
                <motion.div key={service.href} variants={staggerItem}>
                  <Tilt rotationFactor={6} isRevese>
                    <Link
                      href={service.href}
                      className="glass-card block p-5 h-full group relative overflow-hidden"
                      style={{ textDecoration: "none" }}
                    >
                      <div className="relative z-10">
                        <div className="flex items-start gap-3 mb-3">
                          <div
                            className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                            style={{
                              background: `${service.color}12`,
                              color: service.color,
                            }}
                          >
                            <service.icon size={18} />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <h3
                                className="text-sm font-semibold truncate"
                                style={{ color: "var(--text-primary)" }}
                              >
                                {service.title}
                              </h3>
                              {"badge" in service && service.badge && (
                                <span
                                  className="text-[9px] px-1.5 py-0.5 rounded-full font-medium"
                                  style={{
                                    background: `${service.color}20`,
                                    color: service.color,
                                  }}
                                >
                                  {service.badge}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <p
                          className="text-xs leading-relaxed mb-4"
                          style={{ color: "var(--text-secondary)" }}
                        >
                          {service.description}
                        </p>
                        <span
                          className="text-xs font-medium flex items-center gap-1 transition-all duration-150"
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
                          Explore <ChevronRight size={12} />
                        </span>
                      </div>
                    </Link>
                  </Tilt>
                </motion.div>
              ))}
            </motion.div>
          </section>
        ))}
      </div>
    </div>
  );
}
