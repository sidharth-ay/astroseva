"use client";

import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { useReducedMotion, slideUp } from "@/lib/motion";

interface Stage {
  range: [number, number];
  title: string;
  lines: { line: string; focus: string }[];
  guidance: string;
}

const STAGES: Stage[] = [
  {
    range: [0, 14],
    title: "Childhood — Formation",
    lines: [
      { line: "Life Line", focus: "Vitality foundation and early health patterns take shape." },
      { line: "Head Line", focus: "Learning style emerges — observe curiosity and focus." },
    ],
    guidance: "Lines are still forming. Focus on nurturing health, routine, and learning habits.",
  },
  {
    range: [15, 28],
    title: "Youth — Education & Identity",
    lines: [
      { line: "Head Line", focus: "Dominant — education choices, intellect, and mental direction." },
      { line: "Fate Line", focus: "Begins to surface — early career experiments and direction." },
      { line: "Heart Line", focus: "First deep attachments and emotional patterns form." },
    ],
    guidance: "The head and fate lines deserve attention — skill-building years decide the trajectory.",
  },
  {
    range: [29, 45],
    title: "Prime — Career & Family",
    lines: [
      { line: "Fate Line", focus: "Dominant — career peaks, breaks, and changes show here." },
      { line: "Heart Line", focus: "Marriage, long partnerships, and emotional maturity." },
      { line: "Life Line", focus: "Energy management — stamina meets responsibility." },
      { line: "Sun Line", focus: "Recognition and creative success, if present deepens now." },
    ],
    guidance: "Read fate-line breaks with dasha periods. This is the action phase — remedies work fastest.",
  },
  {
    range: [46, 60],
    title: "Maturity — Consolidation",
    lines: [
      { line: "Life Line", focus: "Health vigilance — inner lines and breaks need care." },
      { line: "Fate Line", focus: "Legacy phase — mentoring, authority, second careers." },
      { line: "Heart Line", focus: "Depth over novelty in relationships." },
    ],
    guidance: "Consolidate gains. Health lines and family harmony take priority over expansion.",
  },
  {
    range: [61, 100],
    title: "Wisdom — Reflection",
    lines: [
      { line: "Life Line", focus: "Longevity and life-force reserves." },
      { line: "Heart Line", focus: "Compassion, detachment, and spiritual love." },
      { line: "Head Line", focus: "Wisdom transmission — teaching and guiding." },
    ],
    guidance: "Spiritual lines (intuition crescents, mystic cross) gain prominence. Share what was learned.",
  },
];

export default function AgePalmPage() {
  const [age, setAge] = useState(30);
  const reduced = useReducedMotion();

  useEffect(() => {
    document.title = "Age Progression Palmistry | AstroSeva";
  }, []);

  const stage = STAGES.find((s) => age >= s.range[0] && age <= s.range[1])!;

  return (
    <div className="max-w-4xl mx-auto px-5 py-10">
      <motion.div variants={slideUp} initial={reduced ? false : "hidden"} animate="visible" className="text-center mb-8">
        <p className="heading-section mb-3">PALMISTRY</p>
        <h1 className="heading-display font-bold mb-4" style={{ fontSize: "clamp(1.8rem, 4vw, 2.6rem)" }}>
          AGE PROGRESSION <span className="text-gradient-gold">PALMISTRY</span>
        </h1>
        <p className="max-w-lg mx-auto text-sm" style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}>
          Palm lines evolve through life. Move the age slider to see which lines dominate each life stage.
        </p>
      </motion.div>

      <div className="glass-card p-6 mb-6">
        <div className="flex items-center justify-between mb-2">
          <label className="input-label" htmlFor="age-slider">Age</label>
          <span className="text-3xl font-bold" style={{ color: "#C8956D" }}>{age}</span>
        </div>
        <input
          id="age-slider"
          type="range"
          min={1}
          max={90}
          value={age}
          onChange={(e) => setAge(Number(e.target.value))}
          className="w-full"
          style={{ accentColor: "#C8956D" }}
        />
        <div className="flex justify-between text-xs mt-1" style={{ color: "var(--text-tertiary)" }}>
          <span>1</span><span>30</span><span>60</span><span>90</span>
        </div>
      </div>

      <motion.div
        key={stage.title}
        className="glass-card p-6"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ borderColor: "rgba(200,149,109,0.35)" }}
      >
        <p className="text-xs font-bold tracking-[0.2em] uppercase mb-1" style={{ color: "#C8956D" }}>
          Ages {stage.range[0]}–{stage.range[1]}
        </p>
        <h2 className="text-xl font-semibold mb-4" style={{ color: "var(--text-primary)" }}>{stage.title}</h2>
        <div className="space-y-3 mb-4">
          {stage.lines.map((l) => (
            <div key={l.line} className="p-3 rounded-xl" style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)" }}>
              <p className="text-sm font-semibold" style={{ color: "#E8B88A" }}>{l.line}</p>
              <p className="text-xs" style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}>{l.focus}</p>
            </div>
          ))}
        </div>
        <p className="text-sm" style={{ color: "var(--text-secondary)", lineHeight: 1.8 }}>{stage.guidance}</p>
      </motion.div>

      <p className="text-xs text-center mt-6" style={{ color: "var(--text-tertiary)" }}>
        Educational model of how palmists weight different lines across life stages.
      </p>
    </div>
  );
}
