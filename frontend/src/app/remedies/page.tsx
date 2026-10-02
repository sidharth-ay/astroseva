"use client";

import { useState, useEffect, useMemo } from "react";
import { motion } from "motion/react";
import { Check } from "lucide-react";
import Link from "next/link";
import { useReducedMotion, staggerContainerCustom, staggerItem, slideUp, stagger } from "@/lib/motion";
import HonestyNote from "@/components/HonestyNote";
import { LocalKeys, readLocal, writeLocal } from "@/lib/local";

interface Remedy {
  id: string;
  title: string;
  detail: string;
  day: string;
  planet: string;
  tags: string[];
}

const REMEDIES: Remedy[] = [
  { id: "r1", title: "Surya Arghya", detail: "Offer water to the rising Sun, chant Om Suryaya Namah 7×.", day: "Sunday", planet: "Sun", tags: ["health", "confidence", "pitru"] },
  { id: "r2", title: "Shiva Abhishek Mindset", detail: "Chant Om Namah Shivaya 108× on Mondays for mental peace.", day: "Monday", planet: "Moon", tags: ["peace", "mind", "sade-sati"] },
  { id: "r3", title: "Hanuman Chalisa", detail: "Recite Hanuman Chalisa on Tuesdays for Mars afflictions.", day: "Tuesday", planet: "Mars", tags: ["manglik", "courage", "protection"] },
  { id: "r4", title: "Donate Red Lentils", detail: "Donate masoor dal on Tuesday mornings for Manglik Dosha.", day: "Tuesday", planet: "Mars", tags: ["manglik", "marriage"] },
  { id: "r5", title: "Green Donation", detail: "Donate green moong or feed birds on Wednesdays for Mercury.", day: "Wednesday", planet: "Mercury", tags: ["career", "speech", "business"] },
  { id: "r6", title: "Vishnu Sahasranama", detail: "Listen or chant on Wednesdays for overall protection.", day: "Wednesday", planet: "Mercury", tags: ["protection", "peace"] },
  { id: "r7", title: "Turmeric & Yellow", detail: "Donate turmeric, wear yellow on Thursdays for Jupiter.", day: "Thursday", planet: "Jupiter", tags: ["wisdom", "wealth", "marriage"] },
  { id: "r8", title: "Guru Blessings", detail: "Seek elders' blessings every Thursday morning.", day: "Thursday", planet: "Jupiter", tags: ["wisdom", "career"] },
  { id: "r9", title: "Lakshmi Lamp", detail: "Light a ghee lamp Friday evenings; keep finances tidy.", day: "Friday", planet: "Venus", tags: ["wealth", "love", "luxury"] },
  { id: "r10", title: "White Donation", detail: "Donate rice, milk, or white cloth on Fridays.", day: "Friday", planet: "Venus", tags: ["love", "marriage"] },
  { id: "r11", title: "Shani Sesame Donation", detail: "Donate black sesame or iron on Saturdays; feed crows.", day: "Saturday", planet: "Saturn", tags: ["sade-sati", "career"] },
  { id: "r12", title: "Peepal Water", detail: "Offer water at a Peepal tree Saturday mornings.", day: "Saturday", planet: "Saturn", tags: ["sade-sati", "pitru"] },
  { id: "r13", title: "Rahu Coconut", detail: "Float a coconut in flowing water on Saturdays for Rahu afflictions.", day: "Saturday", planet: "Rahu", tags: ["rahu", "protection"] },
  { id: "r14", title: "Ketu Dog Feeding", detail: "Feed dogs regularly; donate blankets for Ketu balance.", day: "Sunday", planet: "Ketu", tags: ["ketu", "peace"] },
  { id: "r15", title: "Pitru Tarpanam", detail: "Offer water with black sesame facing south on Amavasya for ancestors.", day: "Amavasya", planet: "Sun", tags: ["pitru", "peace"] },
  { id: "r16", title: "Gayatri at Dawn", detail: "11× Gayatri Mantra at dawn for intellect and clarity.", day: "Daily", planet: "Sun", tags: ["health", "wisdom", "career"] },
];

const CONCERNS = ["manglik", "sade-sati", "pitru", "marriage", "career", "wealth", "health", "peace", "love"];
function weekKey(): string {
  const d = new Date();
  const onejan = new Date(d.getFullYear(), 0, 1);
  const week = Math.ceil(((d.getTime() - onejan.getTime()) / 86400000 + onejan.getDay() + 1) / 7);
  return `${d.getFullYear()}-W${week}`;
}

function loadDone(): Record<string, boolean> {
  const all = readLocal<Record<string, Record<string, boolean>>>(LocalKeys.remedyDone, {});
  return all[weekKey()] || {};
}

export default function RemediesPage() {
  const [selected, setSelected] = useState<string[]>(["peace"]);
  const [done, setDone] = useState<Record<string, boolean>>(() => loadDone());
  const reduced = useReducedMotion();

  useEffect(() => {
    document.title = "Remedy Planner | AstroSeva";
  }, []);

  const toggleConcern = (c: string) =>
    setSelected((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));

  const plan = useMemo(
    () => REMEDIES.filter((r) => r.tags.some((t) => selected.includes(t))),
    [selected]
  );

  const toggleDone = (id: string) => {
    const next = { ...done, [id]: !done[id] };
    setDone(next);
    const all = readLocal<Record<string, Record<string, boolean>>>(LocalKeys.remedyDone, {});
    all[weekKey()] = next;
    writeLocal(LocalKeys.remedyDone, all);
  };

  const doneCount = plan.filter((r) => done[r.id]).length;

  return (
    <div className="max-w-5xl mx-auto px-5 py-10">
      <motion.div variants={slideUp} initial={reduced ? false : "hidden"} animate="visible" className="text-center mb-8">
        <p className="heading-section mb-3">REMEDY PLANNER</p>
        <h1 className="heading-display font-bold mb-4" style={{ fontSize: "clamp(1.8rem, 4vw, 2.6rem)" }}>
          CUSTOM REMEDY <span className="text-gradient-gold">PLAN</span>
        </h1>
        <p className="max-w-lg mx-auto text-sm" style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}>
          Pick your concerns — get a weekly remedy schedule with day-wise actions and progress tracking.
          For a personal dosha check, visit <Link href="/doshas" style={{ color: "#C8956D" }}>Dosha Analysis</Link>.
        </p>
          <HonestyNote>A static offline reference. For remedies computed from your own chart, see Dosha Analysis.</HonestyNote>
      </motion.div>

      <div className="flex gap-2 flex-wrap justify-center mb-6">
        {CONCERNS.map((c) => (
          <button
            key={c}
            onClick={() => toggleConcern(c)}
            className={selected.includes(c) ? "btn-primary text-xs" : "btn-ghost text-xs"}
          >
            {c}
          </button>
        ))}
      </div>

      {plan.length > 0 && (
        <div className="glass-card p-4 mb-6 text-center text-sm" style={{ color: "var(--text-secondary)" }}>
          This week: <strong style={{ color: "var(--champagne)" }}>{doneCount}/{plan.length}</strong> remedies completed
          <div className="h-1.5 rounded-full overflow-hidden mt-2" style={{ background: "var(--border)" }}>
            <div
              className="h-full rounded-full"
              style={{ width: `${plan.length ? (doneCount / plan.length) * 100 : 0}%`, background: "#C8956D", transition: "width 0.3s" }}
            />
          </div>
        </div>
      )}

      <motion.div
        className="grid grid-cols-1 sm:grid-cols-2 gap-4"
        variants={staggerContainerCustom(stagger.normal, 0.05)}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
      >
        {plan.map((r) => (
          <motion.div key={r.id} className="glass-card p-5" variants={staggerItem}
            style={{ opacity: done[r.id] ? 0.65 : 1 }}>
            <div className="flex items-start justify-between gap-3 mb-2">
              <div>
                <h3 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>{r.title}</h3>
                <p className="text-xs" style={{ color: "#C8956D" }}>{r.day} · {r.planet}</p>
              </div>
              <button
                onClick={() => toggleDone(r.id)}
                aria-label={done[r.id] ? "Mark not done" : "Mark done"}
                className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                style={{
                  border: "1.5px solid #C8956D",
                  background: done[r.id] ? "#C8956D" : "transparent",
                  color: done[r.id] ? "#060610" : "#C8956D",
                }}
              >
                {done[r.id] && <Check size={14} />}
              </button>
            </div>
            <p className="text-sm" style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}>{r.detail}</p>
          </motion.div>
        ))}
      </motion.div>

      {plan.length === 0 && (
        <div className="glass-card p-8 text-center text-sm" style={{ color: "var(--text-secondary)" }}>
          Select at least one concern above to build your plan.
        </div>
      )}
    </div>
  );
}
