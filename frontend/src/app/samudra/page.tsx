"use client";

import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Eye } from "lucide-react";
import { useReducedMotion, staggerContainerCustom, staggerItem, slideUp, stagger } from "@/lib/motion";

interface PartReading {
  part: string;
  readings: { sign: string; meaning: string }[];
}

const PARTS: PartReading[] = [
  {
    part: "Forehead",
    readings: [
      { sign: "Broad and high", meaning: "Intelligence, good fortune, and a philosophical nature." },
      { sign: "Narrow or low", meaning: "Practical mindset; success through persistence rather than speculation." },
      { sign: "Prominent lines", meaning: "Early responsibilities; deep thinking and life experience." },
    ],
  },
  {
    part: "Eyes",
    readings: [
      { sign: "Large, bright eyes", meaning: "Sun strength — leadership, clarity, and generosity." },
      { sign: "Deep-set eyes", meaning: "Analytical mind, research ability, Saturnine patience." },
      { sign: "Restless gaze", meaning: "Active Mercury — quick thinking but scattered focus." },
    ],
  },
  {
    part: "Nose",
    readings: [
      { sign: "Straight, well-formed", meaning: "Balanced ego, steady career growth, self-respect." },
      { sign: "Prominent bridge", meaning: "Authority and ambition; strong Mars influence." },
      { sign: "Soft, rounded tip", meaning: "Venusian kindness, artistic taste, love of comfort." },
    ],
  },
  {
    part: "Lips & Mouth",
    readings: [
      { sign: "Full lips", meaning: "Venus strength — affectionate nature and love of beauty." },
      { sign: "Thin, firm lips", meaning: "Discipline, reserve, and careful speech." },
      { sign: "Upward curve", meaning: "Optimism and a naturally encouraging temperament." },
    ],
  },
  {
    part: "Face Shape",
    readings: [
      { sign: "Round face", meaning: "Jupiterian — warmth, wisdom, and family orientation." },
      { sign: "Long face", meaning: "Saturnine — patience, planning, late-blooming success." },
      { sign: "Square jaw", meaning: "Martian — determination, courage, and executive ability." },
      { sign: "Oval face", meaning: "Balanced planets — adaptability and social grace." },
    ],
  },
  {
    part: "Hands & Fingers",
    readings: [
      { sign: "Long fingers", meaning: "Detail orientation, craftsmanship, Mercury agility." },
      { sign: "Square palms", meaning: "Practicality and reliability in work and finance." },
      { sign: "Mount of Venus prominent", meaning: "Vitality, passion, and love of life's pleasures." },
      { sign: "Clear head line", meaning: "Strong intellect and decision-making ability." },
    ],
  },
  {
    part: "Gait & Posture",
    readings: [
      { sign: "Steady, upright walk", meaning: "Sun-Saturn balance — confidence with discipline." },
      { sign: "Quick, light steps", meaning: "Mercury dominance — agility of mind and body." },
      { sign: "Slow, deliberate pace", meaning: "Saturnine care — thinking before acting." },
    ],
  },
];

export default function SamudraPage() {
  const [active, setActive] = useState(PARTS[0].part);
  const reduced = useReducedMotion();

  useEffect(() => {
    document.title = "Samudra Sastra | AstroSeva";
  }, []);

  const current = PARTS.find((p) => p.part === active)!;

  return (
    <div className="max-w-5xl mx-auto px-5 py-10">
      <motion.div variants={slideUp} initial={reduced ? false : "hidden"} animate="visible" className="text-center mb-8">
        <p className="heading-section mb-3">SAMUDRA SASTRA</p>
        <h1 className="heading-display font-bold mb-4" style={{ fontSize: "clamp(1.8rem, 4vw, 2.6rem)" }}>
          FACE & BODY <span className="text-gradient-gold">READING</span>
        </h1>
        <p className="max-w-lg mx-auto text-sm" style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}>
          The ancient science of reading character and fortune from physical features.
          Select a body part to explore its traditional interpretations.
        </p>
      </motion.div>

      <div className="flex gap-2 flex-wrap justify-center mb-6">
        {PARTS.map((p) => (
          <button
            key={p.part}
            onClick={() => setActive(p.part)}
            className={active === p.part ? "btn-primary text-xs" : "btn-ghost text-xs"}
          >
            {p.part}
          </button>
        ))}
      </div>

      <motion.div
        key={active}
        className="glass-card p-6"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center gap-2 mb-4">
          <Eye size={18} style={{ color: "#C8956D" }} />
          <h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>{current.part}</h2>
        </div>
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 gap-3"
          variants={staggerContainerCustom(stagger.normal, 0.06)}
          initial="hidden"
          animate="visible"
        >
          {current.readings.map((r) => (
            <motion.div key={r.sign} className="p-4 rounded-xl" variants={staggerItem}
              style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)" }}>
              <p className="text-sm font-semibold mb-1" style={{ color: "#E8B88A" }}>{r.sign}</p>
              <p className="text-xs" style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}>{r.meaning}</p>
            </motion.div>
          ))}
        </motion.div>
      </motion.div>

      <p className="text-xs text-center mt-6" style={{ color: "var(--text-tertiary)" }}>
        Educational reference from classical Samudra Sastra texts — not a substitute for personal consultation.
      </p>
    </div>
  );
}
