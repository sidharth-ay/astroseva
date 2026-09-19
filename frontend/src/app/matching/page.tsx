"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Calendar, Clock, MapPin, User, Heart, Shield } from "lucide-react";
import CitySearch from "@/components/CitySearch";
import { api, type MatchingResponse, type BirthData, type CityEntry } from "@/lib/api";

const defaultForm = (name: string, date: string, time: string): BirthData => ({
  name, birth_date: date, birth_time: time, birth_place: "New Delhi", latitude: 28.6139, longitude: 77.209, timezone_offset: 5.5,
});

export default function MatchingPage() {
  const [boy, setBoy] = useState(defaultForm("Groom", "1990-01-01", "10:00"));
  const [girl, setGirl] = useState(defaultForm("Bride", "1992-05-15", "14:00"));
  const [result, setResult] = useState<MatchingResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const updateBoy = (patch: Partial<BirthData>) => setBoy({ ...boy, ...patch });
  const updateGirl = (patch: Partial<BirthData>) => setGirl({ ...girl, ...patch });

  const analyze = async () => {
    setLoading(true); setError("");
    try { setResult(await api.analyzeMatching(boy, girl)); }
    catch (e) { setError(e instanceof Error ? e.message : "Failed."); }
    finally { setLoading(false); }
  };

  const scoreColor = (score: number, max: number) => {
    const pct = score / max;
    if (pct >= 0.75) return "var(--success)";
    if (pct >= 0.5) return "var(--champagne)";
    return "var(--danger)";
  };

  const FormFields = ({ data, update }: { data: BirthData; update: (p: Partial<BirthData>) => void }) => (
    <div className="space-y-3">
      <div>
        <label className="input-label"><User size={12} className="inline mr-1" />Name</label>
        <input className="input-field" value={data.name} onChange={(e) => update({ name: e.target.value })} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="input-label"><Calendar size={12} className="inline mr-1" />Date</label>
          <input type="date" className="input-field" value={data.birth_date} onChange={(e) => update({ birth_date: e.target.value })} />
        </div>
        <div>
          <label className="input-label"><Clock size={12} className="inline mr-1" />Time</label>
          <input type="time" className="input-field" value={data.birth_time} onChange={(e) => update({ birth_time: e.target.value })} />
        </div>
      </div>
      <div>
        <label className="input-label"><MapPin size={12} className="inline mr-1" />City</label>
        <CitySearch value={data.birth_place} onChange={(c: CityEntry) => update({ birth_place: c.name, latitude: c.lat, longitude: c.lng, timezone_offset: c.tz })} />
      </div>
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto px-5 py-10">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl md:text-3xl font-display font-bold mb-1">
          Marriage <span className="text-gradient-gold">Matching</span>
        </h1>
        <p className="text-sm mb-8" style={{ color: "var(--text-secondary)" }}>Ashtakoot gun milan compatibility analysis</p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <motion.div className="glass-card p-5" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "rgba(181, 164, 244, 0.1)", color: "var(--lavender)" }}>
              <Heart size={14} />
            </div>
            <h3 className="text-sm font-semibold">Groom</h3>
          </div>
          <FormFields data={boy} update={updateBoy} />
        </motion.div>
        <motion.div className="glass-card p-5" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "rgba(232, 160, 191, 0.1)", color: "#E8A0BF" }}>
              <Heart size={14} />
            </div>
            <h3 className="text-sm font-semibold">Bride</h3>
          </div>
          <FormFields data={girl} update={updateGirl} />
        </motion.div>
      </div>

      {error && <p className="text-xs mb-4" style={{ color: "var(--danger)" }}>{error}</p>}

      <button className="btn-primary mb-8" onClick={analyze} disabled={loading}>
        {loading ? "Analyzing..." : "Check Compatibility"}
      </button>

      {result && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          {/* Score Card */}
          <div className="glass-card p-6 text-center">
            <div className="flex items-center justify-center gap-2 mb-3">
              <Shield size={16} style={{ color: "var(--champagne)" }} />
              <h3 className="text-sm font-semibold" style={{ color: "var(--champagne)" }}>Compatibility Score</h3>
            </div>
            <div className="text-5xl font-bold mb-1" style={{ color: "var(--champagne)" }}>
              {result.total_score}<span className="text-lg font-normal" style={{ color: "var(--text-tertiary)" }}>/{result.max_score}</span>
            </div>
            <div className="text-sm font-medium mb-3" style={{ color: "var(--text-secondary)" }}>{result.compatibility_percentage}% Compatible</div>
            <p className="text-sm max-w-md mx-auto" style={{ color: "var(--text-secondary)" }}>{result.recommendation}</p>
            {result.nadi_dosha && (
              <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
                style={{ background: "rgba(232, 93, 93, 0.08)", color: "var(--danger)", border: "1px solid rgba(232, 93, 93, 0.15)" }}>
                ⚠ Nadi Dosha Detected
              </div>
            )}
          </div>

          {/* Kootas */}
          <div className="glass-card p-5">
            <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--champagne)" }}>Ashtakoot Analysis</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {Object.entries(result.kootas).map(([key, val]) => {
                const k = val as { name: string; score: number; max_points: number; description?: string };
                const pct = (k.score / k.max_points) * 100;
                return (
                  <div key={key} className="p-3 rounded-xl" style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)" }}>
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>{k.name}</span>
                      <span className="text-xs font-semibold" style={{ color: scoreColor(k.score, k.max_points) }}>{k.score}/{k.max_points}</span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--border)" }}>
                      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: scoreColor(k.score, k.max_points) }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
