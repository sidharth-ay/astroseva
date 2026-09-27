"use client";

import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { useReducedMotion, slideUp } from "@/lib/motion";

const FEATURES = [
  { key: "face", label: "Face Shape", options: ["Round", "Oval", "Square", "Long", "Heart"] },
  { key: "eyes", label: "Eyes", options: ["Large & Bright", "Deep-set", "Almond", "Round", "Small"] },
  { key: "forehead", label: "Forehead", options: ["Broad & High", "Narrow", "Average", "Prominent Lines"] },
  { key: "nose", label: "Nose", options: ["Straight", "Prominent Bridge", "Rounded Tip", "Small"] },
  { key: "lips", label: "Lips", options: ["Full", "Thin & Firm", "Average", "Upward Curve"] },
] as const;

type FKey = (typeof FEATURES)[number]["key"];

const HARMONY: Record<string, Record<string, number>> = {
  face: { "Round-Oval": 85, "Square-Long": 80 },
  eyes: { "Large & Bright-Almond": 85 },
  nose: { "Straight-Straight": 90 },
  lips: { "Full-Upward Curve": 85 },
};

function pairScore(key: string, a: string, b: string): number {
  if (a === b) return 90;
  const k1 = `${a}-${b}`;
  const k2 = `${b}-${a}`;
  const table = HARMONY[key] || {};
  if (table[k1] !== undefined) return table[k1];
  if (table[k2] !== undefined) return table[k2]!;
  return 65;
}

const NOTES: Record<string, string> = {
  face: "Face shape reflects temperament — round/oval warmth blends well; square/long pairs share ambition.",
  eyes: "Eyes show emotional language — bright with almond is expressive; matched pairs communicate alike.",
  forehead: "Forehead shows thinking style — similar foreheads plan alike; broad with average balances vision and detail.",
  nose: "Nose reflects ego and drive — matched noses respect each other's ambition.",
  lips: "Lips show affection style — full and upturned are warm; thin and firm are reserved but loyal.",
};

export default function FaceMatchPage() {
  const [a, setA] = useState<Record<FKey, string>>({ face: "Oval", eyes: "Almond", forehead: "Average", nose: "Straight", lips: "Average" });
  const [b, setB] = useState<Record<FKey, string>>({ face: "Oval", eyes: "Almond", forehead: "Average", nose: "Straight", lips: "Average" });
  const [result, setResult] = useState<{ score: number; rows: { label: string; score: number }[] } | null>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    document.title = "Feature Compatibility | AstroSeva";
  }, []);

  const analyze = () => {
    const rows = FEATURES.map((f) => ({ label: f.label, score: pairScore(f.key, a[f.key], b[f.key]) }));
    const score = Math.round(rows.reduce((s, r) => s + r.score, 0) / rows.length);
    setResult({ score, rows });
  };

  const personForm = (
    data: Record<FKey, string>,
    set: (p: Partial<Record<FKey, string>>) => void,
    title: string,
    prefix: string
  ) => (
    <div className="glass-card p-5">
      <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--text-primary)" }}>{title}</h3>
      <div className="space-y-3">
        {FEATURES.map((f) => (
          <div key={f.key}>
            <label className="input-label" htmlFor={`${prefix}-${f.key}`}>{f.label}</label>
            <select
              id={`${prefix}-${f.key}`}
              className="input-field"
              value={data[f.key]}
              onChange={(e) => set({ [f.key]: e.target.value })}
            >
              {f.options.map((o) => <option key={o}>{o}</option>)}
            </select>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto px-5 py-10">
      <motion.div variants={slideUp} initial={reduced ? false : "hidden"} animate="visible" className="text-center mb-8">
        <p className="heading-section mb-3">SAMUDRA SASTRA</p>
        <h1 className="heading-display font-bold mb-4" style={{ fontSize: "clamp(1.8rem, 4vw, 2.6rem)" }}>
          FEATURE <span className="text-gradient-gold">COMPATIBILITY</span>
        </h1>
        <p className="max-w-lg mx-auto text-sm" style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}>
          No birth details needed — compare observable facial features using Samudra Sastra principles.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {personForm(a, (p) => setA((prev) => ({ ...prev, ...p })), "Person 1", "p1")}
        {personForm(b, (p) => setB((prev) => ({ ...prev, ...p })), "Person 2", "p2")}
      </div>

      <div className="text-center mb-8">
        <button onClick={analyze} className="btn-primary">Compare Features</button>
      </div>

      {result && (
        <motion.div
          className="glass-card p-6 text-center"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <p className="text-xs font-bold tracking-[0.2em] uppercase mb-1" style={{ color: "#C8956D" }}>
            Feature Harmony
          </p>
          <p className="text-5xl font-bold mb-2" style={{ color: "var(--champagne)" }}>{result.score}%</p>
          <p className="text-sm mb-5" style={{ color: "var(--text-secondary)" }}>
            {result.score >= 80
              ? "Highly harmonious features — natural understanding."
              : result.score >= 65
                ? "Good balance with complementary differences."
                : "Contrasting features — growth through patience."}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-left">
            {result.rows.map((r) => (
              <div key={r.label} className="p-3 rounded-xl" style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)" }}>
                <div className="flex justify-between text-xs mb-1">
                  <span style={{ color: "var(--text-primary)" }}>{r.label}</span>
                  <span className="font-semibold" style={{ color: r.score >= 80 ? "var(--success)" : "var(--champagne)" }}>{r.score}</span>
                </div>
                <p className="text-[11px]" style={{ color: "var(--text-secondary)" }}>
                  {NOTES[FEATURES.find((f) => f.label === r.label)!.key]}
                </p>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
