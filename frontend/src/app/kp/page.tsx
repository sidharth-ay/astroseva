"use client";

import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Calendar, Clock, MapPin, User, ChevronRight } from "lucide-react";
import CitySearch from "@/components/CitySearch";
import { api, type BirthData, type CityEntry } from "@/lib/api";
import {
  useReducedMotion,
  staggerContainer,
  staggerItem,
} from "@/lib/motion";

interface KPPlanet {
  planet: string;
  sign: string;
  sign_lord: string;
  nakshatra: string;
  nak_lord: string;
  sub_lord: string;
  pada: number;
  degree: number;
  retrograde: boolean;
}

interface KPResponse {
  name: string;
  ascendant: { sign: string; nakshatra: string; nak_lord: string; sub_lord: string; pada: number; degree: number };
  planets: KPPlanet[];
  ruling_planet: string;
}

export default function KPPage() {
  const [form, setForm] = useState<BirthData>({
    name: "", birth_date: "1990-05-15", birth_time: "10:30",
    birth_place: "New Delhi", latitude: 28.6139, longitude: 77.209, timezone_offset: 5.5,
  });
  const [result, setResult] = useState<KPResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const reduced = useReducedMotion();

  useEffect(() => {
    document.title = "KP Astrology | AstroSeva";
  }, []);

  const handleCity = (city: CityEntry) => {
    setForm({ ...form, birth_place: city.name, latitude: city.lat, longitude: city.lng, timezone_offset: city.tz });
  };

  const generate = async () => {
    if (!form.name.trim()) { setError("Please enter your name."); return; }
    setLoading(true); setError("");
    try {
      setResult(await api.getKpChart(form));
    } catch (e) { setError(e instanceof Error ? e.message : "Failed to generate KP chart."); }
    finally { setLoading(false); }
  };

  return (
    <div className="max-w-5xl mx-auto px-5 py-10">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <h1 className="heading-display text-2xl md:text-3xl mb-1">
          KP <span className="text-gradient-gold">Astrology</span>
        </h1>
        <p className="text-sm mb-8" style={{ color: "var(--text-secondary)" }}>
          Krishnamurti Paddhati chart with nakshatra and sub-lord analysis
        </p>
      </motion.div>

      {/* Form */}
      <motion.div className="glass-card p-5 mb-8" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="input-label" htmlFor="kp-name"><User size={11} className="inline mr-1" />Name</label>
            <input id="kp-name" className="input-field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Enter name" />
          </div>
          <div>
            <label className="input-label" htmlFor="kp-date"><Calendar size={11} className="inline mr-1" />Birth Date</label>
            <input id="kp-date" type="date" className="input-field" value={form.birth_date} onChange={(e) => setForm({ ...form, birth_date: e.target.value })} style={{ colorScheme: "dark" }} />
          </div>
          <div>
            <label className="input-label" htmlFor="kp-time"><Clock size={11} className="inline mr-1" />Birth Time</label>
            <input id="kp-time" type="time" className="input-field" value={form.birth_time} onChange={(e) => setForm({ ...form, birth_time: e.target.value })} style={{ colorScheme: "dark" }} />
          </div>
          <div>
            <label className="input-label" htmlFor="kp-city"><MapPin size={11} className="inline mr-1" />Birth City</label>
            <CitySearch value={form.birth_place} onChange={handleCity} />
          </div>
        </div>
        {error && <p className="text-xs mt-3" style={{ color: "var(--danger)" }}>{error}</p>}
        <button className="btn-primary mt-4" onClick={generate} disabled={loading}>
          {loading ? "Generating..." : "Generate KP Chart"} <ChevronRight size={15} />
        </button>
      </motion.div>

      {/* Results */}
      {result && (
        <motion.div
          variants={staggerContainer}
          initial={reduced ? false : "hidden"}
          animate="visible"
          className="space-y-6"
        >
          {/* Ascendant & Ruling Planet */}
          <motion.div className="glass-card p-4" variants={staggerItem}>
            <h3 className="text-xs font-semibold mb-3 uppercase tracking-wider" style={{ color: "#C8956D" }}>Ascendant Details</h3>
            <div className="grid grid-cols-2 md:grid-cols-6 gap-3 text-sm">
              {[
                ["Sign", result.ascendant.sign],
                ["Nakshatra", result.ascendant.nakshatra],
                ["Nak Lord", result.ascendant.nak_lord],
                ["Sub Lord", result.ascendant.sub_lord],
                ["Pada", String(result.ascendant.pada)],
                ["Ruling Planet", result.ruling_planet],
              ].map(([label, val]) => (
                <div key={label}>
                  <div className="text-[10px] uppercase tracking-wider mb-0.5" style={{ color: "var(--text-tertiary)" }}>{label}</div>
                  <div className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>{val}</div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Planetary Table */}
          <motion.div className="glass-card p-4" variants={staggerItem}>
            <h3 className="text-xs font-semibold mb-3 uppercase tracking-wider" style={{ color: "#C8956D" }}>Planetary Positions</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border)" }}>
                    {["Planet", "Sign", "Sign Lord", "Nakshatra", "Pada", "Nak Lord", "Sub Lord", "Retro"].map((h) => (
                      <th key={h} className="text-left py-2 px-2 font-medium" style={{ color: "var(--text-tertiary)" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.planets.map((p) => (
                    <tr key={p.planet} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                      <td className="py-2 px-2 font-medium" style={{ color: "#C8956D" }}>{p.planet}</td>
                      <td className="py-2 px-2" style={{ color: "var(--text-secondary)" }}>{p.sign}</td>
                      <td className="py-2 px-2" style={{ color: "var(--text-secondary)" }}>{p.sign_lord}</td>
                      <td className="py-2 px-2" style={{ color: "var(--text-secondary)" }}>{p.nakshatra}</td>
                      <td className="py-2 px-2" style={{ color: "var(--text-secondary)" }}>{p.pada}</td>
                      <td className="py-2 px-2" style={{ color: "var(--text-primary)" }}>{p.nak_lord}</td>
                      <td className="py-2 px-2" style={{ color: "var(--text-primary)" }}>{p.sub_lord}</td>
                      <td className="py-2 px-2">
                        {p.retrograde && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-medium" style={{ background: "rgba(200, 149, 109, 0.08)", color: "var(--danger)" }}>R</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}
