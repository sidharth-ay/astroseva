"use client";

import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Calendar, Clock, MapPin, User, AlertTriangle, CheckCircle, Heart, Shield } from "lucide-react";
import CitySearch from "@/components/CitySearch";

import { api, type MatchingResponse, type BirthData, type CityEntry, locationFromCity } from "@/lib/api";
import {
  useReducedMotion,
  staggerContainer,
  staggerItem,
  slideInLeft,
  slideInRight,
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

export default function NadiDoshaPage() {
  const [boy, setBoy] = useState(defaultForm("Boy", "1990-01-01", "10:00"));
  const [girl, setGirl] = useState(defaultForm("Girl", "1992-05-15", "14:00"));
  const [result, setResult] = useState<MatchingResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const reduced = useReducedMotion();

  useEffect(() => {
    document.title = "Nadi Dosha | AstroSeva";
  }, []);

  const updateBoy = (patch: Partial<BirthData>) => setBoy((prev) => ({ ...prev, ...patch }));
  const updateGirl = (patch: Partial<BirthData>) => setGirl((prev) => ({ ...prev, ...patch }));

  const analyze = async () => {
    setLoading(true); setError("");
    try { setResult(await api.analyzeMatching(boy, girl)); }
    catch (e) { setError(e instanceof Error ? e.message : "Failed."); }
    finally { setLoading(false); }
  };

  const hasNadiDosha = result?.nadi_dosha ?? false;

  return (
    <div className="max-w-4xl mx-auto px-5 py-10">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <h1 className="heading-display text-2xl md:text-3xl mb-1">
          Nadi <span className="text-gradient-gold">Dosha</span>
        </h1>
        <p className="text-sm mb-8" style={{ color: "var(--text-secondary)" }}>Check Nadi Dosha compatibility between two birth charts</p>
      </motion.div>

      {/* Two birth forms */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <motion.div className="glass-card p-5" variants={slideInLeft} initial="hidden" animate="visible">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "rgba(200, 149, 109, 0.1)", color: "#C8956D" }}>
              <Heart size={14} />
            </div>
            <h3 className="text-sm font-semibold">Boy</h3>
          </div>
          <FormFields data={boy} update={updateBoy} prefix="nd-boy" />
        </motion.div>
        <motion.div className="glass-card p-5" variants={slideInRight} initial="hidden" animate="visible">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "rgba(200, 149, 109, 0.08)", color: "#E8B88A" }}>
              <Heart size={14} />
            </div>
            <h3 className="text-sm font-semibold">Girl</h3>
          </div>
          <FormFields data={girl} update={updateGirl} prefix="nd-girl" />
        </motion.div>
      </div>

      {error && <p className="text-xs mb-4" style={{ color: "var(--danger)" }}>{error}</p>}

      <button className="btn-primary mb-8" onClick={analyze} disabled={loading}>
        {loading ? "Analyzing..." : "Check Nadi Dosha"}
      </button>

      {/* Results */}
      {result && (
        <motion.div
          variants={staggerContainer}
          initial={reduced ? false : "hidden"}
          animate="visible"
          className="space-y-6"
        >
          {/* Nadi Dosha Status */}
          <motion.div className="glass-card p-6" variants={staggerItem}>
            <div className="flex items-center gap-3 mb-4">
              {hasNadiDosha ? (
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: "rgba(232, 93, 93, 0.1)" }}>
                  <AlertTriangle size={20} style={{ color: "var(--danger)" }} />
                </div>
              ) : (
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: "rgba(106, 190, 136, 0.1)" }}>
                  <CheckCircle size={20} style={{ color: "var(--success)" }} />
                </div>
              )}
              <div>
                <h3 className="text-sm font-semibold" style={{ color: hasNadiDosha ? "var(--danger)" : "var(--success)" }}>
                  {hasNadiDosha ? "Nadi Dosha Detected" : "No Nadi Dosha"}
                </h3>
                <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                  {hasNadiDosha
                    ? "Both partners share the same Nadi, which may affect health and progeny compatibility."
                    : "Partners have different Nadis — excellent for compatibility."}
                </p>
              </div>
            </div>

            {/* Nadi Details */}
            <div className="grid grid-cols-2 gap-3 mt-4">
              <div className="p-3 rounded-lg" style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)" }}>
                <div className="text-[10px] uppercase tracking-wider mb-1" style={{ color: "var(--text-tertiary)" }}>Boy&apos;s Nadi</div>
                <div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                  {(() => {
                    const nadiKoota = result.kootas?.nadi as { boy_nadi?: string } | undefined;
                    return nadiKoota?.boy_nadi ?? "—";
                  })()}
                </div>
              </div>
              <div className="p-3 rounded-lg" style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)" }}>
                <div className="text-[10px] uppercase tracking-wider mb-1" style={{ color: "var(--text-tertiary)" }}>Girl&apos;s Nadi</div>
                <div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                  {(() => {
                    const nadiKoota = result.kootas?.nadi as { girl_nadi?: string } | undefined;
                    return nadiKoota?.girl_nadi ?? "—";
                  })()}
                </div>
              </div>
            </div>

            {/* Impact on Score */}
            <div className="mt-4 p-3 rounded-lg" style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)" }}>
              <div className="text-[10px] uppercase tracking-wider mb-1" style={{ color: "var(--text-tertiary)" }}>Nadi Koota Score</div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold" style={{ color: hasNadiDosha ? "var(--danger)" : "var(--success)" }}>
                  {hasNadiDosha ? "0" : "8"}/8
                </span>
                <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
                  {hasNadiDosha ? "Nadi Dosha reduces Nadi score to zero" : "Full marks — different Nadis"}
                </span>
              </div>
            </div>
          </motion.div>

          {/* Overall Compatibility */}
          <motion.div className="glass-card p-5" variants={staggerItem}>
            <div className="flex items-center gap-2 mb-3">
              <Shield size={14} style={{ color: "var(--champagne)" }} />
              <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#C8956D" }}>Overall Compatibility</h3>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-3xl font-bold" style={{ color: "var(--champagne)" }}>
                {result.total_score}<span className="text-sm font-normal" style={{ color: "var(--text-tertiary)" }}>/{result.max_score}</span>
              </div>
              <div>
                <div className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>{result.compatibility_percentage}% Compatible</div>
                <div className="text-xs" style={{ color: "var(--text-tertiary)" }}>{result.recommendation}</div>
              </div>
            </div>
          </motion.div>

          {/* Remedies */}
          {hasNadiDosha && (
            <motion.div className="glass-card p-5" variants={staggerItem}>
              <h3 className="text-xs font-semibold mb-3 uppercase tracking-wider" style={{ color: "#C8956D" }}>Nadi Dosha Remedies</h3>
              <ul className="space-y-2 text-xs" style={{ color: "var(--text-secondary)" }}>
                <li className="flex items-start gap-2"><span style={{ color: "var(--champagne)" }}>&#x2022;</span>Perform Nadi Dosha Nivaran Puja at a recognized temple or with a qualified priest</li>
                <li className="flex items-start gap-2"><span style={{ color: "var(--champagne)" }}>&#x2022;</span>Donate to charity on behalf of both partners — food, clothing, or education materials</li>
                <li className="flex items-start gap-2"><span style={{ color: "var(--champagne)" }}>&#x2022;</span>Plant and nourish trees (especially Peepal or Banyan) as a symbolic remedy</li>
                <li className="flex items-start gap-2"><span style={{ color: "var(--champagne)" }}>&#x2022;</span>Chant Maha Mrityunjaya Mantra 108 times daily for 40 days</li>
                <li className="flex items-start gap-2"><span style={{ color: "var(--champagne)" }}>&#x2022;</span>Visit a sacred river and perform Jal Abhishek together</li>
                <li className="flex items-start gap-2"><span style={{ color: "var(--champagne)" }}>&#x2022;</span>Consult a qualified Vedic astrologer for personalized remedies based on complete chart analysis</li>
              </ul>
            </motion.div>
          )}
        </motion.div>
      )}
    </div>
  );
}
