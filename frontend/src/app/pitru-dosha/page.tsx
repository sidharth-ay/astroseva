"use client";

import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Calendar, Clock, MapPin, User, AlertTriangle, CheckCircle } from "lucide-react";
import CitySearch from "@/components/CitySearch";

import { api, type DoshaResponse, type BirthData, type CityEntry, locationFromCity } from "@/lib/api";
import {
  useReducedMotion,
  staggerContainer,
  staggerItem,
} from "@/lib/motion";

export default function PitruDoshaPage() {
  const [form, setForm] = useState<BirthData>({
    name: "", birth_date: "1990-05-15", birth_time: "10:30",
    birth_place: "New Delhi", latitude: 28.6139, longitude: 77.209, timezone_offset: 5.5,
  });
  const [result, setResult] = useState<DoshaResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const reduced = useReducedMotion();

  useEffect(() => {
    document.title = "Pitru Dosha | AstroSeva";
  }, []);

  const handleCity = (city: CityEntry) => {
    setForm({ ...form, ...locationFromCity(city) });
  };

  const detect = async () => {
    if (!form.name.trim()) { setError("Please enter your name."); return; }
    setLoading(true); setError("");
    try { setResult(await api.detectDoshas(form)); }
    catch (e) { setError(e instanceof Error ? e.message : "Failed to detect doshas."); }
    finally { setLoading(false); }
  };

  const pitru = result?.pitru_dosha;
  const hasDosha = pitru?.has_dosha ?? false;

  return (
    <div className="max-w-3xl mx-auto px-5 py-10">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <h1 className="heading-display text-2xl md:text-3xl mb-1">
          Pitru <span className="text-gradient-gold">Dosha</span>
        </h1>
        <p className="text-sm mb-8" style={{ color: "var(--text-secondary)" }}>Check for ancestral afflictions in your birth chart</p>
      </motion.div>

      {/* Form */}
      <motion.div className="glass-card p-5 mb-8" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="input-label" htmlFor="pd-name"><User size={11} className="inline mr-1" />Name</label>
            <input id="pd-name" className="input-field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Enter name" />
          </div>
          <div>
            <label className="input-label" htmlFor="pd-date"><Calendar size={11} className="inline mr-1" />Birth Date</label>
            <input id="pd-date" type="date" className="input-field" value={form.birth_date} onChange={(e) => setForm({ ...form, birth_date: e.target.value })} style={{ colorScheme: "dark" }} />
          </div>
          <div>
            <label className="input-label" htmlFor="pd-time"><Clock size={11} className="inline mr-1" />Birth Time</label>
            <input id="pd-time" type="time" className="input-field" value={form.birth_time} onChange={(e) => setForm({ ...form, birth_time: e.target.value })} style={{ colorScheme: "dark" }} />
          </div>
          <div>
            <label className="input-label" htmlFor="pd-city"><MapPin size={11} className="inline mr-1" />Birth City</label>
            <CitySearch value={form.birth_place} onChange={handleCity} />
          </div>
        </div>
        {error && <p className="text-xs mt-3" style={{ color: "var(--danger)" }}>{error}</p>}
        <div className="flex flex-wrap gap-2 mt-4">
          <button className="btn-primary" onClick={detect} disabled={loading}>
            {loading ? "Checking..." : "Check Pitru Dosha"}
          </button>
        </div>
      </motion.div>

      {/* Results */}
      {result && (
        <motion.div
          variants={staggerContainer}
          initial={reduced ? false : "hidden"}
          animate="visible"
          className="space-y-6"
        >
          {/* Status Card */}
          <motion.div className="glass-card p-6" variants={staggerItem}>
            <div className="flex items-center gap-3 mb-4">
              {hasDosha ? (
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: "rgba(232, 93, 93, 0.1)" }}>
                  <AlertTriangle size={20} style={{ color: "var(--danger)" }} />
                </div>
              ) : (
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: "rgba(106, 190, 136, 0.1)" }}>
                  <CheckCircle size={20} style={{ color: "var(--success)" }} />
                </div>
              )}
              <div>
                <h3 className="text-sm font-semibold" style={{ color: hasDosha ? "var(--danger)" : "var(--success)" }}>
                  {hasDosha ? "Pitru Dosha Detected" : "No Pitru Dosha"}
                </h3>
                <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                  {pitru?.description}
                </p>
              </div>
            </div>

            {/* Conditions */}
            {pitru?.conditions && pitru.conditions.length > 0 && (
              <div className="mt-4">
                <h4 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "#C8956D" }}>Conditions Found</h4>
                <ul className="space-y-1.5">
                  {pitru.conditions.map((cond, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs" style={{ color: "var(--text-secondary)" }}>
                      <span style={{ color: "var(--danger)" }}>&#x2022;</span>
                      {cond}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </motion.div>

          {/* Remedies */}
          {hasDosha && (
            <motion.div className="glass-card p-5" variants={staggerItem}>
              <h3 className="text-xs font-semibold mb-3 uppercase tracking-wider" style={{ color: "#C8956D" }}>Remedies</h3>
              <ul className="space-y-2 text-xs" style={{ color: "var(--text-secondary)" }}>
                <li className="flex items-start gap-2"><span style={{ color: "var(--champagne)" }}>&#x2022;</span>Perform Pitru Tarpanam (ancestor offering) on Amavasya (new moon) days</li>
                <li className="flex items-start gap-2"><span style={{ color: "var(--champagne)" }}>&#x2022;</span>Feed crows and cows regularly as acts of ancestral merit</li>
                <li className="flex items-start gap-2"><span style={{ color: "var(--champagne)" }}>&#x2022;</span>Visit Gaya or any sacred river for Pitru Karya rituals</li>
                <li className="flex items-start gap-2"><span style={{ color: "var(--champagne)" }}>&#x2022;</span>Chant &ldquo;Om Pitru Devaya Namaha&rdquo; 108 times daily</li>
                <li className="flex items-start gap-2"><span style={{ color: "var(--champagne)" }}>&#x2022;</span>Donate food, clothes, or sesame seeds on Saturdays</li>
                <li className="flex items-start gap-2"><span style={{ color: "var(--champagne)" }}>&#x2022;</span>Perform Shraddha ceremony during Pitru Paksha (fortnight of ancestors)</li>
              </ul>
            </motion.div>
          )}
        </motion.div>
      )}
    </div>
  );
}
