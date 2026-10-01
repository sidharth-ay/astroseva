"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Calendar,
  Clock,
  MapPin,
  User,
  ChevronRight,
  Gem,
  RotateCcw,
  Sparkles,
  Music,
  Flower2,
  CircleDot,
  Zap,
  Filter,
  Play,
  Pause,
  ChevronDown,
  Star,
  Heart,
  Shield,
} from "lucide-react";
import CitySearch from "@/components/CitySearch";
import { api, type BirthData, type CityEntry, locationFromCity } from "@/lib/api";
import {
  playHealingTone,
  stopHealingTone,
  setHealingVolume,
  getHealingVolume,
} from "@/lib/soundHealing";
import {
  useReducedMotion,
  staggerContainer,
  staggerItem,
  slideUp,
  fadeIn,
} from "@/lib/motion";

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

const CRYSTALS = [
  {
    name: "Amethyst",
    color: "#9B59B6",
    properties: ["Calming", "Intuition", "Spiritual Growth"],
    zodiac: ["Pisces", "Aquarius", "Capricorn"],
    chakras: ["Third Eye", "Crown"],
    benefits: "Enhances intuition, promotes calm, aids meditation, supports sobriety and sleep.",
  },
  {
    name: "Clear Quartz",
    color: "#ECF0F1",
    properties: ["Amplification", "Clarity", "Healing"],
    zodiac: ["Aries", "Leo", "Gemini"],
    chakras: ["Crown", "All Chakras"],
    benefits: "Master healer, amplifies energy, thought, and the effects of other crystals.",
  },
  {
    name: "Rose Quartz",
    color: "#F8B4C8",
    properties: ["Love", "Compassion", "Self-Care"],
    zodiac: ["Libra", "Taurus", "Cancer"],
    chakras: ["Heart"],
    benefits: "Opens the heart chakra, attracts love, deepens self-love and emotional healing.",
  },
  {
    name: "Citrine",
    color: "#F1C40F",
    properties: ["Abundance", "Joy", "Creativity"],
    zodiac: ["Gemini", "Leo", "Virgo"],
    chakras: ["Solar Plexus", "Sacral"],
    benefits: "Manifests prosperity, boosts confidence, stimulates creativity and optimism.",
  },
  {
    name: "Black Tourmaline",
    color: "#1C1C1C",
    properties: ["Protection", "Grounding", "EMF Shield"],
    zodiac: ["Capricorn", "Libra"],
    chakras: ["Root"],
    benefits: "Powerful protection stone, grounds energy, absorbs negativity and EMF radiation.",
  },
  {
    name: "Lapis Lazuli",
    color: "#2E4A9E",
    properties: ["Truth", "Communication", "Wisdom"],
    zodiac: ["Sagittarius", "Libra"],
    chakras: ["Throat", "Third Eye"],
    benefits: "Activates throat and third eye chakras, enhances communication and inner truth.",
  },
  {
    name: "Tiger's Eye",
    color: "#B8860B",
    properties: ["Courage", "Willpower", "Confidence"],
    zodiac: ["Leo", "Capricorn", "Gemini"],
    chakras: ["Solar Plexus", "Sacral"],
    benefits: "Combines earth and sun energy, boosts willpower, attracts wealth and protection.",
  },
  {
    name: "Moonstone",
    color: "#D6E6F2",
    properties: ["Intuition", "New Beginnings", "Feminine Energy"],
    zodiac: ["Cancer", "Scorpio", "Libra"],
    chakras: ["Crown", "Third Eye"],
    benefits: "Stabilizes emotions, enhances intuition, supports new beginnings and cycles.",
  },
  {
    name: "Sodalite",
    color: "#2C3E6B",
    properties: ["Logic", "Communication", "Truth"],
    zodiac: ["Sagittarius"],
    chakras: ["Throat", "Third Eye"],
    benefits: "Bridges logic and intuition, promotes rational thinking and clear communication.",
  },
];

const CHAKRAS = [
  {
    name: "Root Chakra",
    sanskrit: "Muladhara",
    color: "#FF0000",
    planet: "Saturn",
    stone: "Red Jasper / Black Tourmaline",
    mantra: "LAM",
    description: "Foundation of the energy body. Governs survival, security, stability, and grounding.",
    methods: ["Grounding meditation", "Walking barefoot", "Root vegetables diet", "Red gemstone therapy"],
  },
  {
    name: "Sacral Chakra",
    sanskrit: "Svadhisthana",
    color: "#FF7F00",
    planet: "Jupiter / Moon",
    stone: "Carnelian / Orange Calcite",
    mantra: "VAM",
    description: "Center of creativity, pleasure, passion, and emotional flow.",
    methods: ["Hip-opening yoga", "Water therapy", "Creative expression", "Orange gemstone healing"],
  },
  {
    name: "Solar Plexus Chakra",
    sanskrit: "Manipura",
    color: "#FFFF00",
    planet: "Sun / Mars",
    stone: "Citrine / Tiger's Eye",
    mantra: "RAM",
    description: "Seat of personal power, confidence, self-esteem, and willpower.",
    methods: ["Core strengthening", "Sunlight exposure", "Breathing exercises", "Yellow gemstone therapy"],
  },
  {
    name: "Heart Chakra",
    sanskrit: "Anahata",
    color: "#00FF00",
    planet: "Venus",
    stone: "Rose Quartz / Emerald",
    mantra: "YAM",
    description: "Center of love, compassion, forgiveness, and emotional balance.",
    methods: ["Heart-opening meditation", "Gratitude practice", "Nature walks", "Green/pink gemstone healing"],
  },
  {
    name: "Throat Chakra",
    sanskrit: "Vishuddha",
    color: "#0000FF",
    planet: "Mercury / Jupiter",
    stone: "Lapis Lazuli / Aquamarine",
    mantra: "HAM",
    description: "Center of communication, self-expression, and truth.",
    methods: ["Chanting / singing", "Journaling", "Neck stretches", "Blue gemstone therapy"],
  },
  {
    name: "Third Eye Chakra",
    sanskrit: "Ajna",
    color: "#4B0082",
    planet: "Mercury / Ketu",
    stone: "Amethyst / Fluorite",
    mantra: "OM",
    description: "Center of intuition, insight, imagination, and inner wisdom.",
    methods: ["Meditation", "Visualization", "Dream journaling", "Indigo gemstone therapy"],
  },
  {
    name: "Crown Chakra",
    sanskrit: "Sahasrara",
    color: "#8B00FF",
    planet: "Ketu / Neptune",
    stone: "Clear Quartz / Selenite",
    mantra: "AUM / Silence",
    description: "Gateway to higher consciousness, spiritual connection, and divine wisdom.",
    methods: ["Silent meditation", "Prayer", "Fasting", "Violet/white gemstone therapy"],
  },
];

const AROMATHERAPY = [
  {
    name: "Lavender",
    planetary: "Mercury",
    zodiac: ["Virgo", "Gemini"],
    benefits: ["Calming", "Sleep aid", "Anxiety relief", "Pain management"],
    usage: ["Diffuser", "Topical (diluted)", "Bath soak", "Pillow spray"],
    color: "#9B59B6",
  },
  {
    name: "Frankincense",
    planetary: "Sun / Jupiter",
    zodiac: ["Leo", "Sagittarius"],
    benefits: ["Spiritual awakening", "Meditation aid", "Immune support", "Anti-aging"],
    usage: ["Diffuser", "Incense", "Topical", "Meditation ritual"],
    color: "#C8956D",
  },
  {
    name: "Sandalwood",
    planetary: "Venus / Moon",
    zodiac: ["Taurus", "Cancer"],
    benefits: ["Deep calm", "Mental clarity", "Aphrodisiac", "Skin healing"],
    usage: ["Diffuser", "Sachet", "Topical", "Puja offering"],
    color: "#D2691E",
  },
  {
    name: "Peppermint",
    planetary: "Mercury",
    zodiac: ["Gemini", "Virgo"],
    benefits: ["Energy boost", "Headache relief", "Digestive aid", "Mental focus"],
    usage: ["Inhalation", "Topical (diluted)", "Diffuser", "Oral (food grade)"],
    color: "#27AE60",
  },
  {
    name: "Rose",
    planetary: "Venus",
    zodiac: ["Libra", "Taurus"],
    benefits: ["Heart healing", "Emotional balance", "Skin radiance", "Love attraction"],
    usage: ["Diffuser", "Rose water spray", "Topical (diluted)", "Bath"],
    color: "#E74C8B",
  },
  {
    name: "Vetiver",
    planetary: "Saturn",
    zodiac: ["Capricorn", "Aquarius"],
    benefits: ["Grounding", "Deep sleep", "Scarring reduction", "Anxiety relief"],
    usage: ["Diffuser", "Topical (diluted)", "Inhaler", "Meditation aid"],
    color: "#5D4037",
  },
];

const SOUND_HEALING = [
  {
    name: "396 Hz",
    title: "Liberating Guilt & Fear",
    planet: "Saturn",
    benefits: ["Releases guilt", "Dissolves fear", "Empowerment", "Root chakra healing"],
    ragas: ["Raga Darbari Kanada", "Evening 6–9 PM"],
    frequency: 396,
    color: "#FF0000",
  },
  {
    name: "417 Hz",
    title: "Undoing Situations & Facilitating Change",
    planet: "Uranus / Jupiter",
    benefits: ["Cleanses negativity", "Facilitates change", "Sacral chakra", "Emotional healing"],
    ragas: ["Raga Bhairavi", "Sunrise 5–7 AM"],
    frequency: 417,
    color: "#FF7F00",
  },
  {
    name: "432 Hz",
    title: "Natural Harmony",
    planet: "Venus",
    benefits: ["Calms nerves", "Clarity & intuition", "Deepens meditation", "Nature resonance"],
    ragas: ["Raga Yaman", "Evening 7–10 PM"],
    frequency: 432,
    color: "#FFD700",
  },
  {
    name: "528 Hz",
    title: "Transformation & Miracles",
    planet: "Sun / Jupiter",
    benefits: ["DNA repair", "Transformation", "Solar plexus", "Love frequency"],
    ragas: ["Raga Bhimpalasi", "Afternoon 12–3 PM"],
    frequency: 528,
    color: "#FFFF00",
  },
  {
    name: "639 Hz",
    title: "Connecting & Relationships",
    planet: "Venus / Neptune",
    benefits: ["Heart healing", "Relationship harmony", "Heart chakra", "Compassion"],
    ragas: ["Raga Malkauns", "Midnight 10 PM–2 AM"],
    frequency: 639,
    color: "#00FF00",
  },
  {
    name: "741 Hz",
    title: "Expression & Solutions",
    planet: "Mercury / Neptune",
    benefits: ["Throat chakra", "Expression", "Cleansing", "Problem solving"],
    ragas: ["Raga Ahir Bhairav", "Early morning 4–7 AM"],
    frequency: 741,
    color: "#0000FF",
  },
  {
    name: "852 Hz",
    title: "Returning to Spiritual Order",
    planet: "Moon / Ketu",
    benefits: ["Third eye", "Intuition", "Spiritual awakening", "Inner vision"],
    ragas: ["Raga Marwa", "Sunrise 4:30–6 AM"],
    frequency: 852,
    color: "#4B0082",
  },
  {
    name: "963 Hz",
    title: "Divine Consciousness",
    planet: "Neptune / Ketu",
    benefits: ["Crown chakra", "Divine connection", "Higher self", "Awakening"],
    ragas: ["Raga Todi", "Sunrise 4–6 AM"],
    frequency: 963,
    color: "#8B00FF",
  },
];

const ZODIAC_SIGNS = [
  "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
  "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces",
];

type Tab = "crystals" | "chakras" | "aromatherapy" | "sound";

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

// Extract numeric Hz from strings like "528 Hz" (backend format).
function parseHz(value: string): number | null {
  const m = /(\d+(?:\.\d+)?)\s*hz/i.exec(value);
  if (!m) return null;
  const hz = Number(m[1]);
  return hz > 0 && hz <= 20000 ? hz : null;
}

function FrequencyWave({ color, frequency }: { color: string; frequency: number }) {  const points = Array.from({ length: 60 }, (_, i) => {
    const x = (i / 59) * 300;
    const amplitude = 16 + (frequency / 963) * 12;
    const y = 20 + Math.sin((i / 60) * Math.PI * frequency * 0.01) * amplitude;
    return `${x},${y}`;
  }).join(" ");

  return (
    <svg viewBox="0 0 300 40" className="w-full h-10 mt-2" preserveAspectRatio="none">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.7"
      />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function HealingPage() {
  const [activeTab, setActiveTab] = useState<Tab>("crystals");
  const [playingHz, setPlayingHz] = useState<number | null>(null);
  const [volume, setVolume] = useState(getHealingVolume());
  const [crystalFilter, setCrystalFilter] = useState({ zodiac: "", chakra: "" });
  const [expandedChakra, setExpandedChakra] = useState<number | null>(null);
  const [form, setForm] = useState<BirthData>({
    name: "",
    birth_date: "1990-05-15",
    birth_time: "10:30",
    birth_place: "New Delhi",
    latitude: 28.6139,
    longitude: 77.209,
    timezone_offset: 5.5,
    gender: "",
  });
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const reduced = useReducedMotion();

  useEffect(() => {
    document.title = "Healing & Remedies | AstroSeva";
    return () => {
      // Never leak audio across navigation.
      stopHealingTone();
    };
  }, []);

  // Stop playback when leaving the sound tab.
  const switchTab = (tab: Tab) => {
    if (tab !== "sound") {
      stopHealingTone();
      setPlayingHz(null);
    }
    setActiveTab(tab);
  };

  const togglePlay = (hz: number) => {
    if (playingHz === hz) {
      stopHealingTone();
      setPlayingHz(null);
      return;
    }
    if (playHealingTone(hz)) {
      setPlayingHz(hz);
    }
  };

  const changeVolume = (v: number) => {
    setVolume(v);
    setHealingVolume(v);
  };

  const handleCity = (city: CityEntry) => {
    setForm({ ...form, ...locationFromCity(city) });
  };

  const getRecommendations = async () => {
    if (!form.name.trim()) {
      setError("Please enter your name.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await api.getHealingRecommendation(form);
      const r = res.recommendation;
      const sound = (r.recommended_sound_healing || {}) as Record<string, string>;
      setResult({
        crystals: (r.recommended_crystals || []).map((name: string) => ({
          name,
          reason: `Aligned with your ${r.sun_sign} sun sign and ${r.dominant_chakra} chakra.`,
        })),
        chakras: (r.chakras_to_focus_on || []).map((name: string) => ({
          name,
          recommendation: `Focus meditation and breathwork on this chakra to balance your ${r.sun_sign} energy.`,
        })),
        aromatherapy: (r.recommended_aromatherapy || []).map((name: string) => ({
          name,
          reason: `Supports ${r.dominant_chakra} chakra healing for ${r.sun_sign} natives.`,
        })),
        sound_healing: sound && (sound.frequency || sound.name) ? [{
          frequency: sound.frequency,
          name: sound.name,
          reason: `${sound.benefits || ""} Recommended raga: ${sound.recommended_raga || "—"}, best time: ${sound.best_time || "—"}.`.trim(),
        }] : [],
        recommendations: `Your sun sign is ${r.sun_sign} with ${r.dominant_chakra} as the dominant chakra. Work with the crystals, oils, and sound frequency above for balanced healing.`,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to get recommendations.");
    } finally {
      setLoading(false);
    }
  };

  const filteredCrystals = CRYSTALS.filter((c) => {
    if (crystalFilter.zodiac && !c.zodiac.includes(crystalFilter.zodiac)) return false;
    if (crystalFilter.chakra && !c.chakras.includes(crystalFilter.chakra)) return false;
    return true;
  });

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: "crystals", label: "Crystals", icon: <Gem size={14} /> },
    { key: "chakras", label: "Chakras", icon: <CircleDot size={14} /> },
    { key: "aromatherapy", label: "Aromatherapy", icon: <Flower2 size={14} /> },
    { key: "sound", label: "Sound Healing", icon: <Music size={14} /> },
  ];

  return (
    <div className="max-w-5xl mx-auto px-5 py-10">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h1 className="heading-display text-2xl md:text-3xl mb-1">
          <span className="text-gradient-gold">HEALING & REMEDIES</span>
        </h1>
        <p
          className="text-sm mb-8"
          style={{ color: "var(--text-secondary)" }}
        >
          Explore cosmic healing through crystals, chakras, aromatherapy &amp; sound vibrations
        </p>
      </motion.div>

      {/* Tabs */}
      <motion.div
        className="flex gap-1 mb-6 p-1 rounded-lg overflow-x-auto"
        style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)" }}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        {tabs.map((tab) => (
          <button
            key={tab.key}
            className="flex items-center gap-1.5 px-4 py-2 rounded-md text-xs font-medium transition-all whitespace-nowrap"
            style={{
              background: activeTab === tab.key ? "#C8956D" : "transparent",
              color: activeTab === tab.key ? "#1a0f0a" : "var(--text-secondary)",
            }}
            onClick={() => switchTab(tab.key)}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </motion.div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        {/* ===== Crystals Tab ===== */}
        {activeTab === "crystals" && (
          <motion.div
            key="crystals"
            variants={fadeIn}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            {/* Filters */}
            <div className="glass-card p-4 mb-5">
              <div className="flex items-center gap-2 mb-3">
                <Filter size={13} style={{ color: "#C8956D" }} />
                <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#C8956D" }}>
                  Filter Crystals
                </span>
              </div>
              <div className="flex flex-wrap gap-3">
                <select
                  className="input-field text-xs"
                  value={crystalFilter.zodiac}
                  onChange={(e) => setCrystalFilter({ ...crystalFilter, zodiac: e.target.value })}
                >
                  <option value="">All Zodiac Signs</option>
                  {ZODIAC_SIGNS.map((z) => (
                    <option key={z} value={z}>{z}</option>
                  ))}
                </select>
                <select
                  className="input-field text-xs"
                  value={crystalFilter.chakra}
                  onChange={(e) => setCrystalFilter({ ...crystalFilter, chakra: e.target.value })}
                >
                  <option value="">All Chakras</option>
                  {CHAKRAS.map((ch) => (
                    <option key={ch.name} value={ch.name}>{ch.name}</option>
                  ))}
                </select>
                {(crystalFilter.zodiac || crystalFilter.chakra) && (
                  <button
                    className="btn-ghost text-xs"
                    onClick={() => setCrystalFilter({ zodiac: "", chakra: "" })}
                  >
                    <RotateCcw size={11} /> Clear
                  </button>
                )}
              </div>
            </div>

            {/* Crystal Grid */}
            <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCrystals.map((c) => (
                <motion.div
                  key={c.name}
                  className="glass-card p-4"
                  variants={staggerItem}
                  whileHover={{ y: -2, transition: { duration: 0.15 } }}
                >
                  {/* Gem Visual */}
                  <div className="flex items-center gap-3 mb-3">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center"
                      style={{
                        background: `radial-gradient(circle at 35% 35%, ${c.color}cc, ${c.color}66)`,
                        boxShadow: `0 0 16px ${c.color}44`,
                      }}
                    >
                      <Gem size={18} color="#fff" style={{ filter: "drop-shadow(0 0 4px rgba(255,255,255,0.5))" }} />
                    </div>
                    <div>
                      <div className="text-sm font-semibold" style={{ color: "#E8B88A" }}>
                        {c.name}
                      </div>
                      <div className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>
                        {c.properties.join(" · ")}
                      </div>
                    </div>
                  </div>

                  {/* Zodiac */}
                  <div className="mb-2">
                    <div className="text-[10px] uppercase tracking-wider mb-1" style={{ color: "var(--text-tertiary)" }}>
                      Zodiac
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {c.zodiac.map((z) => (
                        <span
                          key={z}
                          className="text-[10px] px-1.5 py-0.5 rounded"
                          style={{ background: "#C8956D22", color: "#E8B88A", border: "1px solid #C8956D44" }}
                        >
                          {z}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Chakras */}
                  <div className="mb-2">
                    <div className="text-[10px] uppercase tracking-wider mb-1" style={{ color: "var(--text-tertiary)" }}>
                      Chakras
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {c.chakras.map((ch) => (
                        <span
                          key={ch}
                          className="text-[10px] px-1.5 py-0.5 rounded"
                          style={{ background: "#E8B88A22", color: "#E8B88A", border: "1px solid #E8B88A44" }}
                        >
                          {ch}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Benefits */}
                  <p className="text-xs leading-relaxed mt-2" style={{ color: "var(--text-secondary)" }}>
                    {c.benefits}
                  </p>
                </motion.div>
              ))}
            </motion.div>

            {filteredCrystals.length === 0 && (
              <div className="glass-card p-6 text-center text-xs" style={{ color: "var(--text-tertiary)" }}>
                No crystals match the selected filters.
              </div>
            )}
          </motion.div>
        )}

        {/* ===== Chakras Tab ===== */}
        {activeTab === "chakras" && (
          <motion.div
            key="chakras"
            variants={fadeIn}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            <div className="flex flex-col md:flex-row gap-6">
              {/* Chakra Visual Column */}
              <div className="flex flex-row md:flex-col gap-2 md:gap-3 items-center md:items-stretch mx-auto md:mx-0">
                {CHAKRAS.map((ch, i) => (
                  <motion.button
                    key={ch.name}
                    className="group relative flex items-center gap-3"
                    onClick={() => setExpandedChakra(expandedChakra === i ? null : i)}
                    whileHover={{ x: 4 }}
                  >
                    <div
                      className="w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center shrink-0 transition-all"
                      style={{
                        background: `radial-gradient(circle at 35% 35%, ${ch.color}, ${ch.color}88)`,
                        boxShadow: expandedChakra === i ? `0 0 20px ${ch.color}66` : `0 0 8px ${ch.color}33`,
                        transform: expandedChakra === i ? "scale(1.15)" : "scale(1)",
                      }}
                    >
                      <span className="text-white text-[10px] font-bold">
                        {ch.mantra.charAt(0)}
                      </span>
                    </div>
                    <div className="hidden md:block text-left">
                      <div className="text-xs font-semibold" style={{ color: expandedChakra === i ? ch.color : "var(--text-secondary)" }}>
                        {ch.sanskrit}
                      </div>
                      <div className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>
                        {ch.name}
                      </div>
                    </div>
                    {i < CHAKRAS.length - 1 && (
                      <div className="hidden md:block absolute -bottom-3 left-1/2 -translate-x-1/2 w-px h-3" style={{ background: "var(--border-subtle)" }} />
                    )}
                  </motion.button>
                ))}
              </div>

              {/* Detail Panel */}
              <div className="flex-1">
                <AnimatePresence mode="wait">
                  {expandedChakra !== null ? (
                    <motion.div
                      key={expandedChakra}
                      className="glass-card p-5"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.25 }}
                    >
                      <div className="flex items-center gap-3 mb-4">
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center"
                          style={{
                            background: `radial-gradient(circle at 35% 35%, ${CHAKRAS[expandedChakra].color}, ${CHAKRAS[expandedChakra].color}88)`,
                          }}
                        >
                          <Sparkles size={18} color="#fff" />
                        </div>
                        <div>
                          <div className="text-base font-semibold" style={{ color: "#E8B88A" }}>
                            {CHAKRAS[expandedChakra].name}
                          </div>
                          <div className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                            {CHAKRAS[expandedChakra].sanskrit} · Mantra: {CHAKRAS[expandedChakra].mantra}
                          </div>
                        </div>
                      </div>

                      <p className="text-xs mb-4 leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                        {CHAKRAS[expandedChakra].description}
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                        <div className="rounded-lg p-3" style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)" }}>
                          <div className="text-[10px] uppercase tracking-wider mb-1" style={{ color: "var(--text-tertiary)" }}>
                            Planet
                          </div>
                          <div className="text-xs font-medium" style={{ color: "#E8B88A" }}>
                            <Star size={10} className="inline mr-1" />
                            {CHAKRAS[expandedChakra].planet}
                          </div>
                        </div>
                        <div className="rounded-lg p-3" style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)" }}>
                          <div className="text-[10px] uppercase tracking-wider mb-1" style={{ color: "var(--text-tertiary)" }}>
                            Stone
                          </div>
                          <div className="text-xs font-medium" style={{ color: "#E8B88A" }}>
                            <Gem size={10} className="inline mr-1" />
                            {CHAKRAS[expandedChakra].stone}
                          </div>
                        </div>
                      </div>

                      <div>
                        <div className="text-[10px] uppercase tracking-wider mb-2" style={{ color: "var(--text-tertiary)" }}>
                          Healing Methods
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {CHAKRAS[expandedChakra].methods.map((m) => (
                            <span
                              key={m}
                              className="text-[10px] px-2 py-1 rounded"
                              style={{ background: `${CHAKRAS[expandedChakra].color}22`, color: CHAKRAS[expandedChakra].color, border: `1px solid ${CHAKRAS[expandedChakra].color}44` }}
                            >
                              {m}
                            </span>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="empty"
                      className="glass-card p-6 text-center"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                    >
                      <CircleDot size={24} className="mx-auto mb-2" style={{ color: "var(--text-tertiary)" }} />
                      <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                        Click a chakra to explore its details
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        )}

        {/* ===== Aromatherapy Tab ===== */}
        {activeTab === "aromatherapy" && (
          <motion.div
            key="aromatherapy"
            variants={fadeIn}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {AROMATHERAPY.map((oil) => (
                <motion.div
                  key={oil.name}
                  className="glass-card p-4"
                  variants={staggerItem}
                  whileHover={{ y: -2, transition: { duration: 0.15 } }}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center"
                      style={{
                        background: `radial-gradient(circle at 35% 35%, ${oil.color}, ${oil.color}66)`,
                        boxShadow: `0 0 12px ${oil.color}33`,
                      }}
                    >
                      <Flower2 size={16} color="#fff" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold" style={{ color: "#E8B88A" }}>
                        {oil.name}
                      </div>
                      <div className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>
                        Planet: {oil.planetary} · {oil.zodiac.join(", ")}
                      </div>
                    </div>
                  </div>

                  <div className="mb-2">
                    <div className="text-[10px] uppercase tracking-wider mb-1" style={{ color: "var(--text-tertiary)" }}>
                      Benefits
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {oil.benefits.map((b) => (
                        <span
                          key={b}
                          className="text-[10px] px-1.5 py-0.5 rounded flex items-center gap-0.5"
                          style={{ background: "#C8956D22", color: "#E8B88A", border: "1px solid #C8956D44" }}
                        >
                          <Heart size={8} /> {b}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="text-[10px] uppercase tracking-wider mb-1" style={{ color: "var(--text-tertiary)" }}>
                      Usage Methods
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {oil.usage.map((u) => (
                        <span
                          key={u}
                          className="text-[10px] px-1.5 py-0.5 rounded"
                          style={{ background: "var(--bg-surface)", color: "var(--text-secondary)", border: "1px solid var(--border-subtle)" }}
                        >
                          {u}
                        </span>
                      ))}
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        )}

        {/* ===== Sound Healing Tab ===== */}
        {activeTab === "sound" && (
          <motion.div
            key="sound"
            variants={fadeIn}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            <motion.div variants={staggerContainer} initial="hidden" animate="visible">
              <div className="flex items-center justify-between gap-3 mb-4 px-1">
                <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                  {playingHz
                    ? `Now playing: pure ${playingHz} Hz sine tone`
                    : "Tap play on any frequency to hear its pure sine tone"}
                </p>
                <label className="flex items-center gap-2 text-xs shrink-0" style={{ color: "var(--text-secondary)" }}>
                  Volume
                  <input
                    type="range"
                    min={0.05}
                    max={0.5}
                    step={0.05}
                    value={volume}
                    onChange={(e) => changeVolume(Number(e.target.value))}
                    style={{ accentColor: "#C8956D", width: "90px" }}
                    aria-label="Healing tone volume"
                  />
                </label>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {SOUND_HEALING.map((s) => (
                <motion.div
                  key={s.name}
                  className="glass-card p-4"
                  variants={staggerItem}
                  whileHover={{ y: -2, transition: { duration: 0.15 } }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center"
                        style={{
                          background: `radial-gradient(circle at 35% 35%, ${s.color}, ${s.color}66)`,
                          boxShadow: `0 0 12px ${s.color}33`,
                        }}
                      >
                        <Zap size={14} color="#fff" />
                      </div>
                      <div>
                        <div className="text-sm font-semibold" style={{ color: "#E8B88A" }}>
                          {s.name}
                        </div>
                        <div className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>
                          {s.title}
                        </div>
                      </div>
                    </div>
                    <div className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: "#C8956D22", color: "#E8B88A", border: "1px solid #C8956D44" }}>
                      {s.planet}
                    </div>
                  </div>

                  {/* Waveform */}
                  <FrequencyWave color={s.color} frequency={s.frequency} />

                  {/* Benefits */}
                  <div className="mt-3 mb-2">
                    <div className="text-[10px] uppercase tracking-wider mb-1" style={{ color: "var(--text-tertiary)" }}>
                      Benefits
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {s.benefits.map((b) => (
                        <span
                          key={b}
                          className="text-[10px] px-1.5 py-0.5 rounded"
                          style={{ background: `${s.color}22`, color: s.color, border: `1px solid ${s.color}44` }}
                        >
                          {b}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Raga */}
                  <div>
                    <div className="text-[10px] uppercase tracking-wider mb-1" style={{ color: "var(--text-tertiary)" }}>
                      Recommended Raga / Time
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {s.ragas.map((r) => (
                        <span
                          key={r}
                          className="text-[10px] px-1.5 py-0.5 rounded"
                          style={{ background: "var(--bg-surface)", color: "var(--text-secondary)", border: "1px solid var(--border-subtle)" }}
                        >
                          <Music size={8} className="inline mr-1" />
                          {r}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Play button */}
                  <button
                    onClick={() => togglePlay(s.frequency)}
                    aria-label={playingHz === s.frequency ? `Stop ${s.name} tone` : `Play ${s.name} tone`}
                    aria-pressed={playingHz === s.frequency}
                    className="w-full mt-3 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-all"
                    style={
                      playingHz === s.frequency
                        ? { background: "linear-gradient(135deg, #C8956D, #E8B88A)", color: "#1a0f0a" }
                        : { background: "rgba(200,149,109,0.1)", color: "#C8956D", border: "1px solid rgba(200,149,109,0.35)" }
                    }
                  >
                    {playingHz === s.frequency ? <Pause size={14} /> : <Play size={14} />}
                    {playingHz === s.frequency ? `Stop ${s.frequency} Hz` : `Play ${s.frequency} Hz`}
                  </button>
                </motion.div>
              ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Personalized Recommendations */}
      <motion.div
        className="glass-card p-5 mt-10"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="flex items-center gap-2 mb-4">
          <Sparkles size={14} style={{ color: "#C8956D" }} />
          <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#C8956D" }}>
            Get Personalized Recommendations
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="input-label" htmlFor="h-name">
              <User size={11} className="inline mr-1" />
              Name
            </label>
            <input
              id="h-name"
              className="input-field"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Enter name"
            />
          </div>
          <div>
            <label className="input-label" htmlFor="h-date">
              <Calendar size={11} className="inline mr-1" />
              Birth Date
            </label>
            <input
              id="h-date"
              type="date"
              className="input-field"
              value={form.birth_date}
              onChange={(e) => setForm({ ...form, birth_date: e.target.value })}
              style={{ colorScheme: "dark" }}
            />
          </div>
          <div>
            <label className="input-label" htmlFor="h-time">
              <Clock size={11} className="inline mr-1" />
              Birth Time
            </label>
            <input
              id="h-time"
              type="time"
              className="input-field"
              value={form.birth_time}
              onChange={(e) => setForm({ ...form, birth_time: e.target.value })}
              style={{ colorScheme: "dark" }}
            />
          </div>
          <div>
            <label className="input-label" htmlFor="h-city">
              <MapPin size={11} className="inline mr-1" />
              Birth City
            </label>
            <CitySearch value={form.birth_place} onChange={handleCity} />
          </div>
          <div>
            <label className="input-label" htmlFor="h-gender">
              <User size={11} className="inline mr-1" />
              Gender <span className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>(optional)</span>
            </label>
            <select
              id="h-gender"
              className="input-field"
              value={form.gender || ""}
              onChange={(e) => setForm({ ...form, gender: e.target.value || undefined })}
            >
              <option value="">Select gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
          </div>
        </div>

        {error && (
          <p className="text-xs mt-3" style={{ color: "var(--danger)" }}>
            {error}
          </p>
        )}

        <div className="flex flex-wrap gap-2 mt-4">
          <button
            className="btn-primary"
            onClick={getRecommendations}
            disabled={loading}
          >
            {loading ? (
              "Getting Recommendations..."
            ) : (
              <>
                Get Personalized Recommendations <ChevronRight size={15} />
              </>
            )}
          </button>
          {result && (
            <button
              className="btn-ghost"
              onClick={() => {
                setResult(null);
                setError("");
              }}
            >
              <RotateCcw size={13} /> Clear
            </button>
          )}
        </div>
      </motion.div>

      {/* Loading Shimmer */}
      {loading && (
        <motion.div
          className="space-y-4 mt-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="glass-card p-5">
            <div className="h-4 w-40 rounded mb-4 animate-pulse" style={{ background: "var(--border-subtle)" }} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="rounded-lg p-4 animate-pulse"
                  style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)" }}
                >
                  <div className="h-4 w-24 rounded mb-3" style={{ background: "var(--border)" }} />
                  <div className="space-y-2">
                    <div className="h-3 w-full rounded" style={{ background: "var(--border-subtle)" }} />
                    <div className="h-3 w-3/4 rounded" style={{ background: "var(--border-subtle)" }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* Personalized Results */}
      {result && !loading && (
        <motion.div
          className="space-y-5 mt-6"
          variants={staggerContainer}
          initial={reduced ? false : "hidden"}
          animate="visible"
        >
          {/* Crystals */}
          {result.crystals && result.crystals.length > 0 && (
            <motion.div variants={staggerItem}>
              <h3 className="text-xs font-semibold mb-3 uppercase tracking-wider" style={{ color: "#C8956D" }}>
                Recommended Crystals
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {result.crystals.map((c: any, i: number) => (
                  <motion.div key={i} className="glass-card p-4" variants={staggerItem} whileHover={{ y: -2 }}>
                    <div className="text-sm font-semibold mb-1" style={{ color: "#E8B88A" }}>
                      <Gem size={13} className="inline mr-1.5 -mt-0.5" />
                      {c.name || c.gemstone}
                    </div>
                    {c.reason && (
                      <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                        {c.reason}
                      </p>
                    )}
                    {c.properties && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {c.properties.map((p: string, j: number) => (
                          <span key={j} className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: "#C8956D22", color: "#E8B88A", border: "1px solid #C8956D44" }}>
                            {p}
                          </span>
                        ))}
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Chakras */}
          {result.chakras && result.chakras.length > 0 && (
            <motion.div variants={staggerItem}>
              <h3 className="text-xs font-semibold mb-3 uppercase tracking-wider" style={{ color: "#C8956D" }}>
                Chakra Focus Areas
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {result.chakras.map((ch: any, i: number) => (
                  <motion.div key={i} className="glass-card p-4" variants={staggerItem} whileHover={{ y: -2 }}>
                    <div className="text-sm font-semibold mb-1" style={{ color: "#E8B88A" }}>
                      <CircleDot size={13} className="inline mr-1.5 -mt-0.5" />
                      {ch.name}
                    </div>
                    {ch.recommendation && (
                      <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                        {ch.recommendation}
                      </p>
                    )}
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Aromatherapy */}
          {result.aromatherapy && result.aromatherapy.length > 0 && (
            <motion.div variants={staggerItem}>
              <h3 className="text-xs font-semibold mb-3 uppercase tracking-wider" style={{ color: "#C8956D" }}>
                Recommended Essential Oils
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {result.aromatherapy.map((oil: any, i: number) => (
                  <motion.div key={i} className="glass-card p-4" variants={staggerItem} whileHover={{ y: -2 }}>
                    <div className="text-sm font-semibold mb-1" style={{ color: "#E8B88A" }}>
                      <Flower2 size={13} className="inline mr-1.5 -mt-0.5" />
                      {oil.name}
                    </div>
                    {oil.reason && (
                      <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                        {oil.reason}
                      </p>
                    )}
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Sound Healing */}
          {result.sound_healing && result.sound_healing.length > 0 && (
            <motion.div variants={staggerItem}>
              <h3 className="text-xs font-semibold mb-3 uppercase tracking-wider" style={{ color: "#C8956D" }}>
                Recommended Frequencies
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {result.sound_healing.map((s: any, i: number) => {
                  const hz = parseHz(s.frequency || s.name || "");
                  const isPlaying = hz !== null && playingHz === hz;
                  return (
                  <motion.div key={i} className="glass-card p-4" variants={staggerItem} whileHover={{ y: -2 }}>
                    <div className="text-sm font-semibold mb-1" style={{ color: "#E8B88A" }}>
                      <Music size={13} className="inline mr-1.5 -mt-0.5" />
                      {s.frequency || s.name}
                    </div>
                    {s.reason && (
                      <p className="text-xs leading-relaxed mb-2" style={{ color: "var(--text-secondary)" }}>
                        {s.reason}
                      </p>
                    )}
                    {hz !== null && (
                      <button
                        onClick={() => togglePlay(hz)}
                        aria-label={isPlaying ? `Stop ${hz} Hz tone` : `Play ${hz} Hz tone`}
                        aria-pressed={isPlaying}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                        style={
                          isPlaying
                            ? { background: "linear-gradient(135deg, #C8956D, #E8B88A)", color: "#1a0f0a" }
                            : { background: "rgba(200,149,109,0.1)", color: "#C8956D", border: "1px solid rgba(200,149,109,0.35)" }
                        }
                      >
                        {isPlaying ? <Pause size={12} /> : <Play size={12} />}
                        {isPlaying ? "Stop" : `Play ${hz} Hz`}
                      </button>
                    )}
                  </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* General */}
          {result.recommendations && (
            <motion.div className="glass-card p-4" variants={staggerItem}>
              <h3 className="text-xs font-semibold mb-3 uppercase tracking-wider" style={{ color: "#C8956D" }}>
                General Healing Guidance
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                {result.recommendations}
              </p>
            </motion.div>
          )}
        </motion.div>
      )}
    </div>
  );
}
