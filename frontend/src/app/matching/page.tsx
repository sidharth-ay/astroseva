"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "motion/react";
import { Calendar, Clock, MapPin, User, Heart, Shield } from "lucide-react";
import CitySearch from "@/components/CitySearch";

import { api, downloadBlob, type MatchingResponse, type BirthData, type CityEntry, locationFromCity } from "@/lib/api";
import {
  useReducedMotion,
  staggerContainer,
  staggerItem,
  slideInLeft,
  slideInRight,
  duration,
  ease,
} from "@/lib/motion";

const defaultForm = (name: string, date: string, time: string): BirthData => ({
  name, birth_date: date, birth_time: time, birth_place: "New Delhi", latitude: 28.6139, longitude: 77.209, timezone_offset: 5.5,
});

function FormFields({ data, update, prefix }: { data: BirthData; update: (p: Partial<BirthData>) => void; prefix: string }) {
  return (
    <div className="space-y-3">
      <div>
        <label className="input-label" htmlFor={`${prefix}-name`}><User size={12} className="inline mr-1" />Name</label>
        <input id={`${prefix}-name`} className="input-field" value={data.name} onChange={(e) => update({ name: e.target.value })} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="input-label" htmlFor={`${prefix}-date`}><Calendar size={12} className="inline mr-1" />Date</label>
          <input id={`${prefix}-date`} type="date" className="input-field" value={data.birth_date} onChange={(e) => update({ birth_date: e.target.value })} />
        </div>
        <div>
          <label className="input-label" htmlFor={`${prefix}-time`}><Clock size={12} className="inline mr-1" />Time</label>
          <input id={`${prefix}-time`} type="time" className="input-field" value={data.birth_time} onChange={(e) => update({ birth_time: e.target.value })} />
        </div>
      </div>
      <div>
        <label className="input-label" htmlFor={`${prefix}-city`}><MapPin size={12} className="inline mr-1" />City</label>
        <CitySearch value={data.birth_place} onChange={(c: CityEntry) => update(locationFromCity(c))} />
      </div>
    </div>
  );
}

export default function MatchingPage() {
  const [boy, setBoy] = useState(defaultForm("Boy", "1990-01-01", "10:00"));
  const [girl, setGirl] = useState(defaultForm("Girl", "1992-05-15", "14:00"));
  const [result, setResult] = useState<MatchingResponse | null>(null);
  const [manglik, setManglik] = useState<{
    boy: { is_manglik: boolean; severity: string };
    girl: { is_manglik: boolean; severity: string };
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");
  const reduced = useReducedMotion();
  const [displayScore, setDisplayScore] = useState(0);
  const animFrame = useRef<number>(0);

  useEffect(() => {
    document.title = "Marriage Matching | AstroSeva";
  }, []);

  useEffect(() => {
    if (!result) { setDisplayScore(0); return; }
    const target = result.total_score;
    const start = performance.now();
    const durationMs = 1000;
    const step = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / durationMs, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayScore(Math.round(eased * target));
      if (progress < 1) animFrame.current = requestAnimationFrame(step);
    };
    animFrame.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animFrame.current);
  }, [result]);

  const updateBoy = (patch: Partial<BirthData>) => setBoy((prev) => ({ ...prev, ...patch }));
  const updateGirl = (patch: Partial<BirthData>) => setGirl((prev) => ({ ...prev, ...patch }));

  const analyze = async () => {
    setLoading(true); setError("");
    setManglik(null);
    try {
      setResult(await api.analyzeMatching(boy, girl));
      try {
        const [b, g] = await Promise.all([api.detectDoshas(boy), api.detectDoshas(girl)]);
        setManglik({ boy: b.manglik, girl: g.manglik });
      } catch { /* dosha check optional */ }
    }
    catch (e) { setError(e instanceof Error ? e.message : "Failed."); }
    finally { setLoading(false); }
  };

  const exportPdf = async () => {
    setExporting(true);
    setError("");
    try {
      const blob = await api.exportMatchingPdf(boy, girl);
      if (blob.size === 0) throw new Error("The generated PDF was empty.");
      downloadBlob(
        blob,
        `matching-${(boy.name || "boy").replace(/\s+/g, "-").toLowerCase()}-${(girl.name || "girl").replace(/\s+/g, "-").toLowerCase()}.pdf`,
      );
    } catch (e) {
      setError(e instanceof Error ? `PDF export failed: ${e.message}` : "PDF export failed.");
    } finally {
      setExporting(false);
    }
  };

  const scoreColor = (score: number, max: number) => {
    const pct = score / max;
    if (pct >= 0.75) return "var(--success)";
    if (pct >= 0.5) return "var(--champagne)";
    return "var(--danger)";
  };

  return (
    <div className="max-w-5xl mx-auto px-5 py-10">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl md:text-3xl heading-display font-bold mb-1">
          Marriage <span className="text-gradient-gold">Matching</span>
        </h1>
        <p className="text-sm mb-8" style={{ color: "var(--text-secondary)" }}>Ashtakoot gun milan compatibility analysis</p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <motion.div className="glass-card p-5" variants={slideInLeft} initial="hidden" animate="visible">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "rgba(200, 149, 109, 0.1)", color: "#C8956D" }}>
              <Heart size={14} />
            </div>
            <h3 className="text-sm font-semibold">Boy</h3>
          </div>
          <FormFields data={boy} update={updateBoy} prefix="boy" />
        </motion.div>
        <motion.div className="glass-card p-5" variants={slideInRight} initial="hidden" animate="visible">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "rgba(200, 149, 109, 0.08)", color: "#E8B88A" }}>
              <Heart size={14} />
            </div>
            <h3 className="text-sm font-semibold">Girl</h3>
          </div>
          <FormFields data={girl} update={updateGirl} prefix="girl" />
        </motion.div>
      </div>

      {error && <p className="text-xs mb-4" style={{ color: "var(--danger)" }}>{error}</p>}

      <button className="btn-primary mb-8" onClick={analyze} disabled={loading}>
        {loading ? "Analyzing..." : "Check Compatibility"}
      </button>
      {result && (
        <button className="btn-ghost mb-8 ml-2" onClick={exportPdf} disabled={exporting}>
          {exporting ? "Preparing PDF..." : "Export PDF"}
        </button>
      )}

      {result && (
        <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-6">
          {/* Score Card */}
          <motion.div variants={staggerItem} className="glass-card p-6 text-center">
            <div className="flex items-center justify-center gap-2 mb-3">
              <Shield size={16} style={{ color: "var(--champagne)" }} />
              <h3 className="text-sm font-semibold" style={{ color: "var(--champagne)" }}>Compatibility Score</h3>
            </div>
            <div className="text-5xl font-bold mb-1" style={{ color: "var(--champagne)" }}>
              {displayScore}<span className="text-lg font-normal" style={{ color: "var(--text-tertiary)" }}>/{result.max_score}</span>
            </div>
            <div className="text-sm font-medium mb-3" style={{ color: "var(--text-secondary)" }}>{result.compatibility_percentage}% Compatible</div>
            <p className="text-sm max-w-md mx-auto" style={{ color: "var(--text-secondary)" }}>{result.recommendation}</p>
            {result.nadi_dosha && (
              <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
                style={{ background: "rgba(232, 93, 93, 0.08)", color: "var(--danger)", border: "1px solid rgba(232, 93, 93, 0.15)" }}>
                Nadi Dosha Detected
              </div>
            )}
            {manglik && (
              <div className="mt-3 flex flex-wrap justify-center gap-2">
                {[
                  { label: result.boy_name, m: manglik.boy },
                  { label: result.girl_name, m: manglik.girl },
                ].map((p) => (
                  <span
                    key={p.label}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
                    style={
                      p.m.is_manglik
                        ? { background: "rgba(232, 184, 138, 0.1)", color: "var(--champagne)", border: "1px solid rgba(232, 184, 138, 0.2)" }
                        : { background: "rgba(93, 200, 143, 0.08)", color: "var(--success)", border: "1px solid rgba(93, 200, 143, 0.15)" }
                    }
                  >
                    {p.label}: {p.m.is_manglik ? `Manglik (${p.m.severity})` : "Non-Manglik"}
                  </span>
                ))}
              </div>
            )}
          </motion.div>

          {/* Kootas */}
          <motion.div variants={staggerItem} className="glass-card p-5">
            <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--champagne)" }}>Ashtakoot Analysis</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {Object.entries(result.kootas).map(([key, val]) => {
                const k = val as { koota: string; score: number; max_points: number; description?: string };
                const pct = (k.score / k.max_points) * 100;
                return (
                  <div key={key} className="p-3 rounded-xl" style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)" }}>
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>{k.koota}</span>
                      <span className="text-xs font-semibold" style={{ color: scoreColor(k.score, k.max_points) }}>{k.score}/{k.max_points}</span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--border)" }}>
                      <motion.div
                        className="h-full rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: duration.slow, ease: ease.decelerate }}
                        style={{ background: scoreColor(k.score, k.max_points) }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        </motion.div>
      )}

    </div>
  );
}
