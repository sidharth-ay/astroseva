"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Calendar, Clock, MapPin, User, Download, ChevronRight } from "lucide-react";
import CitySearch from "@/components/CitySearch";
import KundliChart from "@/components/KundliChart";
import { api, type KundliResponse, type BirthData, type CityEntry } from "@/lib/api";
import {
  useReducedMotion,
  staggerContainer,
  staggerItem,
  slideUp,
  fadeIn,
  duration,
  ease,
} from "@/lib/motion";

const SIGN_NAMES = ["Aries","Taurus","Gemini","Cancer","Leo","Virgo","Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces"];

export default function KundliPage() {
  const [form, setForm] = useState<BirthData>({
    name: "", birth_date: "1990-05-15", birth_time: "10:30",
    birth_place: "New Delhi", latitude: 28.6139, longitude: 77.209, timezone_offset: 5.5,
  });
  const [result, setResult] = useState<KundliResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const reduced = useReducedMotion();

  const handleCity = (city: CityEntry) => {
    setForm({ ...form, birth_place: city.name, latitude: city.lat, longitude: city.lng, timezone_offset: city.tz });
  };

  const generate = async () => {
    if (!form.name.trim()) { setError("Please enter your name."); return; }
    setLoading(true); setError("");
    try { setResult(await api.generateKundli(form)); }
    catch (e) { setError(e instanceof Error ? e.message : "Failed to generate kundli."); }
    finally { setLoading(false); }
  };

  const loadSample = async () => {
    setLoading(true); setError("");
    try { setResult(await api.getSampleKundli()); }
    catch (e) { setError(e instanceof Error ? e.message : "Failed to load sample."); }
    finally { setLoading(false); }
  };

  const exportPdf = async () => {
    try {
      const blob = await api.exportKundliPdf(form);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = `kundli-${form.name || "chart"}.pdf`; a.click();
      URL.revokeObjectURL(url);
    } catch { /* ignore */ }
  };

  return (
    <div className="max-w-5xl mx-auto px-5 py-10">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <h1 className="text-2xl md:text-3xl font-display font-bold mb-1">
          Kundli <span className="text-gradient-gold">Generator</span>
        </h1>
        <p className="text-sm mb-8" style={{ color: "var(--text-secondary)" }}>Enter birth details to generate your Vedic birth chart</p>
      </motion.div>

      {/* Form */}
      <motion.div className="glass-card p-5 mb-8" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="input-label"><User size={11} className="inline mr-1" />Name</label>
            <input className="input-field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Enter name" />
          </div>
          <div>
            <label className="input-label"><Calendar size={11} className="inline mr-1" />Birth Date</label>
            <input type="date" className="input-field" value={form.birth_date} onChange={(e) => setForm({ ...form, birth_date: e.target.value })} style={{ colorScheme: "dark" }} />
          </div>
          <div>
            <label className="input-label"><Clock size={11} className="inline mr-1" />Birth Time</label>
            <input type="time" className="input-field" value={form.birth_time} onChange={(e) => setForm({ ...form, birth_time: e.target.value })} style={{ colorScheme: "dark" }} />
          </div>
          <div>
            <label className="input-label"><MapPin size={11} className="inline mr-1" />Birth City</label>
            <CitySearch value={form.birth_place} onChange={handleCity} />
          </div>
        </div>
        {error && <p className="text-xs mt-3" style={{ color: "var(--danger)" }}>{error}</p>}
        <div className="flex flex-wrap gap-2 mt-4">
          <button className="btn-primary" onClick={generate} disabled={loading}>
            {loading ? "Generating..." : "Generate Kundli"} <ChevronRight size={15} />
          </button>
          <button className="btn-ghost" onClick={loadSample} disabled={loading}>
            Load Sample
          </button>
          {result && (
            <button className="btn-ghost" onClick={exportPdf}>
              <Download size={13} /> Export PDF
            </button>
          )}
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
          {/* Birth Details */}
          <motion.div className="glass-card p-4" variants={staggerItem}>
            <h3 className="text-xs font-semibold mb-3 uppercase tracking-wider" style={{ color: "var(--champagne)" }}>Birth Details</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              {[
                ["Name", result.name || "—"],
                ["Date", result.birth_date],
                ["Time", result.birth_time],
                ["Place", result.birth_place],
                ["Ascendant", `${SIGN_NAMES[result.asc_sign]} ${result.asc_sign_degree.toFixed(1)}°`],
                ["Ayanamsa", `${result.ayanamsa.toFixed(2)}°`],
              ].map(([label, val]) => (
                <div key={label}>
                  <div className="text-[10px] uppercase tracking-wider mb-0.5" style={{ color: "var(--text-tertiary)" }}>{label}</div>
                  <div className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>{val}</div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Chart */}
          <motion.div className="glass-card p-5" variants={staggerItem}>
            <h3 className="text-xs font-semibold mb-4 uppercase tracking-wider" style={{ color: "var(--champagne)" }}>Birth Chart — North Indian Style</h3>
            <KundliChart chart={result.chart} ascSign={result.asc_sign} />
          </motion.div>

          {/* Planetary Positions */}
          <motion.div className="glass-card p-4" variants={staggerItem}>
            <h3 className="text-xs font-semibold mb-3 uppercase tracking-wider" style={{ color: "var(--champagne)" }}>Planetary Positions</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border)" }}>
                    {["Planet", "Sign", "Degree", "Retro", "Dignity"].map((h) => (
                      <th key={h} className="text-left py-2 px-2 font-medium" style={{ color: "var(--text-tertiary)" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.planets.map((p) => (
                    <tr key={p.planet} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                      <td className="py-2 px-2 font-medium" style={{ color: "var(--text-primary)" }}>{p.planet}</td>
                      <td className="py-2 px-2" style={{ color: "var(--text-secondary)" }}>{p.sign_name}</td>
                      <td className="py-2 px-2" style={{ color: "var(--text-secondary)" }}>{p.sign_degree.toFixed(1)}°</td>
                      <td className="py-2 px-2">
                        {p.retrograde && <span className="px-1.5 py-0.5 rounded text-[9px] font-medium" style={{ background: "rgba(232, 93, 93, 0.08)", color: "var(--danger)" }}>R</span>}
                      </td>
                      <td className="py-2 px-2" style={{ color: "var(--text-secondary)" }}>{p.dignity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>

          {/* Dasha */}
          {result.dasha_info?.current_dasha && (
            <motion.div className="glass-card p-4" variants={staggerItem}>
              <h3 className="text-xs font-semibold mb-3 uppercase tracking-wider" style={{ color: "var(--champagne)" }}>Vimshottari Dasha</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {[
                  { label: "Mahadasha", value: result.dasha_info.current_dasha.mahadasha, period: `${result.dasha_info.current_dasha.mahadasha_start} — ${result.dasha_info.current_dasha.mahadasha_end}` },
                  { label: "Antardasha", value: result.dasha_info.current_dasha.antardasha || "—", period: result.dasha_info.current_dasha.antardasha ? `${result.dasha_info.current_dasha.antardasha_start} — ${result.dasha_info.current_dasha.antardasha_end}` : "" },
                  { label: "Pratyantardasha", value: result.dasha_info.current_dasha.pratyantardasha || "—", period: "" },
                ].map((d) => (
                  <div key={d.label} className="p-3 rounded-lg" style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)" }}>
                    <div className="text-[10px] uppercase tracking-wider mb-1" style={{ color: "var(--text-tertiary)" }}>{d.label}</div>
                    <div className="text-sm font-medium" style={{ color: "var(--champagne)" }}>{d.value}</div>
                    {d.period && <div className="text-[10px] mt-1" style={{ color: "var(--text-tertiary)" }}>{d.period}</div>}
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </motion.div>
      )}
    </div>
  );
}
