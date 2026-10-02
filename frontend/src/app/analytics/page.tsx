"use client";

import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { BarChart3 } from "lucide-react";
import { useReducedMotion, staggerContainerCustom, staggerItem, slideUp, stagger } from "@/lib/motion";
import { LocalKeys, readLocal } from "@/lib/local";

interface Stat {
  label: string;
  value: number;
  hint: string;
}

// Storage keys live in lib/local; this keeps the literal strings here so the
// mapping from key to expected shape stays next to the code that consumes it.
function read(key: string): unknown {
  return readLocal<unknown>(key, null);
}

interface AnalyticsSnapshot {
  stats: Stat[];
  topPages: { page: string; visits: number }[];
  week: { day: string; visits: number }[];
}

/** Everything the page shows, computed from this device's stored data. */
function computeAnalytics(): AnalyticsSnapshot {
  const visits = (read(LocalKeys.visits) || {}) as { total?: number; pages?: Record<string, number>; days?: Record<string, number> };
  const academy = (read(LocalKeys.academy) || { lessonsDone: {}, quizPassed: {} }) as { lessonsDone: Record<string, string[]>; quizPassed: Record<string, boolean> };
  const remedyAll = (read(LocalKeys.remedyDone) || {}) as Record<string, Record<string, boolean>>;
  const moles = (read(LocalKeys.moles) || []) as unknown[];
  const consults = (read(LocalKeys.photoConsults) || []) as unknown[];

  const lessonsDone = Object.values(academy.lessonsDone || {}).flat().length;
  const certs = Object.keys(academy.quizPassed || {}).length;
  const remediesDone = Object.values(remedyAll).reduce((s, w) => s + Object.values(w).filter(Boolean).length, 0);

  const stats = [
    { label: "Page Visits", value: visits.total || 0, hint: "Your total visits on this device" },
    { label: "Lessons Completed", value: lessonsDone, hint: "Academy lessons finished" },
    { label: "Certificates Earned", value: certs, hint: "Academy exams passed" },
    { label: "Remedies Completed", value: remediesDone, hint: "Remedy planner check-offs" },
    { label: "Moles Tracked", value: Array.isArray(moles) ? moles.length : 0, hint: "Entries in your mole diary" },
    { label: "Consult Requests", value: Array.isArray(consults) ? consults.length : 0, hint: "Photo consultation queue" },
  ];

  const topPages = Object.entries(visits.pages || {})
    .map(([page, v]) => ({ page: page === "/" ? "Home" : page, visits: v as number }))
    .sort((x, y) => y.visits - x.visits)
    .slice(0, 6);

  const week: { day: string; visits: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    week.push({ day: key.slice(5), visits: (visits.days || {})[key] || 0 });
  }

  return { stats, topPages, week };
}

export default function AnalyticsPage() {
  // Computed on first render rather than in an effect: `read` already guards
  // the server case, so the server renders the empty snapshot -- exactly what
  // it rendered before -- and the client shows the stored numbers immediately
  // instead of flashing empty cards first. Each slice reads once.
  const [stats] = useState<Stat[]>(() => computeAnalytics().stats);
  const [topPages] = useState<{ page: string; visits: number }[]>(() => computeAnalytics().topPages);
  const [week] = useState<{ day: string; visits: number }[]>(() => computeAnalytics().week);
  const reduced = useReducedMotion();

  useEffect(() => {
    document.title = "My Analytics | AstroSeva";
  }, []);

  const maxDay = Math.max(1, ...week.map((d) => d.visits));

  return (
    <div className="max-w-5xl mx-auto px-5 py-10">
      <motion.div variants={slideUp} initial={reduced ? false : "hidden"} animate="visible" className="text-center mb-8">
        <p className="heading-section mb-3">PERSONAL INSIGHTS</p>
        <h1 className="heading-display font-bold mb-4" style={{ fontSize: "clamp(1.8rem, 4vw, 2.6rem)" }}>
          MY <span className="text-gradient-gold">ANALYTICS</span>
        </h1>
        <p className="max-w-lg mx-auto text-sm" style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}>
          Your AstroSeva journey on this device — visits, learning, remedies, and tracking.
          All data stays in your browser.
        </p>
      </motion.div>

      <motion.div
        className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8"
        variants={staggerContainerCustom(stagger.normal, 0.06)}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
      >
        {stats.map((s) => (
          <motion.div key={s.label} className="glass-card p-5 text-center" variants={staggerItem}>
            <BarChart3 size={16} style={{ color: "#C8956D" }} className="mx-auto mb-2" />
            <p className="text-3xl font-bold" style={{ color: "var(--text-primary)" }}>{s.value}</p>
            <p className="text-xs font-semibold mt-1" style={{ color: "var(--text-primary)" }}>{s.label}</p>
            <p className="text-[11px]" style={{ color: "var(--text-secondary)" }}>{s.hint}</p>
          </motion.div>
        ))}
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--text-primary)" }}>Last 7 Days</h3>
          <div className="flex items-end gap-2 h-28">
            {week.map((d) => (
              <div key={d.day} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className="w-full rounded-t"
                  style={{
                    height: `${Math.max(4, (d.visits / maxDay) * 90)}px`,
                    background: "linear-gradient(180deg, #E8B88A, #C8956D)",
                  }}
                  title={`${d.visits} visits`}
                />
                <span className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>{d.day}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--text-primary)" }}>Top Pages</h3>
          <div className="space-y-2">
            {topPages.length === 0 && (
              <p className="text-xs" style={{ color: "var(--text-secondary)" }}>Visit pages to build this ranking.</p>
            )}
            {topPages.map((p) => (
              <div key={p.page} className="flex items-center gap-2">
                <span className="text-xs w-32 truncate" style={{ color: "var(--text-secondary)" }}>{p.page}</span>
                <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "var(--border)" }}>
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${(p.visits / Math.max(1, topPages[0].visits)) * 100}%`, background: "#C8956D" }}
                  />
                </div>
                <span className="text-xs font-semibold w-8 text-right" style={{ color: "var(--champagne)" }}>{p.visits}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
