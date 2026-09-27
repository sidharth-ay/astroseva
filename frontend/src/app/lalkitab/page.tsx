"use client";

import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Calendar, Clock, MapPin, User, ChevronRight, RotateCcw } from "lucide-react";
import CitySearch from "@/components/CitySearch";
import { api, type BirthData, type CityEntry } from "@/lib/api";
import {
  useReducedMotion,
  staggerContainer,
  staggerItem,
  slideUp,
  duration,
  ease,
} from "@/lib/motion";

interface PlanetRemedy {
  planet: string;
  house: number;
  sign: string;
  remedy: string;
  gemstone?: string;
  mantra?: string;
}

interface LalKitabResponse {
  name: string;
  birth_date: string;
  birth_time: string;
  birth_place: string;
  houses: Record<string, { planet: string; sign: string; degree: number }[]>;
  planets: { planet: string; house: number; sign: string; degree: number }[];
  remedies: PlanetRemedy[];
}

const HOUSE_LABELS = [
  "1st House", "2nd House", "3rd House", "4th House", "5th House", "6th House",
  "7th House", "8th House", "9th House", "10th House", "11th House", "12th House",
];

export default function LalKitabPage() {
  const [form, setForm] = useState<BirthData>({
    name: "", birth_date: "1990-05-15", birth_time: "10:30",
    birth_place: "New Delhi", latitude: 28.6139, longitude: 77.209, timezone_offset: 5.5,
  });
  const [result, setResult] = useState<LalKitabResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const reduced = useReducedMotion();

  useEffect(() => {
    document.title = "Lal Kitab | AstroSeva";
  }, []);

  const handleCity = (city: CityEntry) => {
    setForm({ ...form, birth_place: city.name, latitude: city.lat, longitude: city.lng, timezone_offset: city.tz });
  };

  const generate = async () => {
    if (!form.name.trim()) { setError("Please enter your name."); return; }
    setLoading(true); setError("");
    try {
      setResult(await api.getLalKitabChart(form));
    } catch (e) { setError(e instanceof Error ? e.message : "Failed to generate chart."); }
    finally { setLoading(false); }
  };

  return (
    <div className="max-w-5xl mx-auto px-5 py-10">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <h1 className="heading-display text-2xl md:text-3xl mb-1">
          Lal Kitab <span className="text-gradient-gold">Chart</span>
        </h1>
        <p className="text-sm mb-8" style={{ color: "var(--text-secondary)" }}>
          Lal Kitab astrological chart with remedies for each planet
        </p>
      </motion.div>

      {/* Form */}
      <motion.div className="glass-card p-5 mb-8" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="input-label" htmlFor="lk-name"><User size={11} className="inline mr-1" />Name</label>
            <input id="lk-name" className="input-field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Enter name" />
          </div>
          <div>
            <label className="input-label" htmlFor="lk-date"><Calendar size={11} className="inline mr-1" />Birth Date</label>
            <input id="lk-date" type="date" className="input-field" value={form.birth_date} onChange={(e) => setForm({ ...form, birth_date: e.target.value })} style={{ colorScheme: "dark" }} />
          </div>
          <div>
            <label className="input-label" htmlFor="lk-time"><Clock size={11} className="inline mr-1" />Birth Time</label>
            <input id="lk-time" type="time" className="input-field" value={form.birth_time} onChange={(e) => setForm({ ...form, birth_time: e.target.value })} style={{ colorScheme: "dark" }} />
          </div>
          <div>
            <label className="input-label" htmlFor="lk-city"><MapPin size={11} className="inline mr-1" />Birth City</label>
            <CitySearch value={form.birth_place} onChange={handleCity} />
          </div>
        </div>
        {error && <p className="text-xs mt-3" style={{ color: "var(--danger)" }}>{error}</p>}
        <div className="flex flex-wrap gap-2 mt-4">
          <button className="btn-primary" onClick={generate} disabled={loading}>
            {loading ? "Generating..." : "Generate Chart"} <ChevronRight size={15} />
          </button>
          {result && (
            <button className="btn-ghost" onClick={() => setResult(null)}>
              <RotateCcw size={13} /> Reset
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
            <h3 className="text-xs font-semibold mb-3 uppercase tracking-wider" style={{ color: "#C8956D" }}>Birth Details</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              {[
                ["Name", result.name || "—"],
                ["Date", result.birth_date],
                ["Time", result.birth_time],
                ["Place", result.birth_place],
              ].map(([label, val]) => (
                <div key={label}>
                  <div className="text-[10px] uppercase tracking-wider mb-0.5" style={{ color: "var(--text-tertiary)" }}>{label}</div>
                  <div className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>{val}</div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* 12-House Grid */}
          <motion.div className="glass-card p-5" variants={staggerItem}>
            <h3 className="text-xs font-semibold mb-4 uppercase tracking-wider" style={{ color: "#C8956D" }}>12-House Chart</h3>
            <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
              {Array.from({ length: 12 }, (_, i) => {
                const houseNum = i + 1;
                const occupants = result.houses[String(houseNum)] || [];
                return (
                  <div
                    key={houseNum}
                    className="p-3 rounded-lg text-center"
                    style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)" }}
                  >
                    <div className="text-[10px] font-semibold mb-1.5 uppercase tracking-wider" style={{ color: "#C8956D" }}>
                      {HOUSE_LABELS[i]}
                    </div>
                    {occupants.length > 0 ? (
                      <div className="space-y-1">
                        {occupants.map((occ) => (
                          <div key={occ.planet} className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>
                            {occ.planet}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-xs" style={{ color: "var(--text-tertiary)" }}>Empty</div>
                    )}
                  </div>
                );
              })}
            </div>
          </motion.div>

          {/* Planet Placements */}
          <motion.div className="glass-card p-4" variants={staggerItem}>
            <h3 className="text-xs font-semibold mb-3 uppercase tracking-wider" style={{ color: "#C8956D" }}>Planet Placements</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border)" }}>
                    {["Planet", "House", "Sign", "Degree"].map((h) => (
                      <th key={h} className="text-left py-2 px-2 font-medium" style={{ color: "var(--text-tertiary)" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.planets.map((p) => (
                    <tr key={p.planet} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                      <td className="py-2 px-2 font-medium" style={{ color: "var(--text-primary)" }}>{p.planet}</td>
                      <td className="py-2 px-2" style={{ color: "var(--text-secondary)" }}>{p.house}</td>
                      <td className="py-2 px-2" style={{ color: "var(--text-secondary)" }}>{p.sign}</td>
                      <td className="py-2 px-2" style={{ color: "var(--text-secondary)" }}>{p.degree.toFixed(1)}°</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>

          {/* Remedies */}
          <motion.div className="glass-card p-4" variants={staggerItem}>
            <h3 className="text-xs font-semibold mb-3 uppercase tracking-wider" style={{ color: "#C8956D" }}>Remedies</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {result.remedies.map((r, i) => (
                <div
                  key={i}
                  className="p-4 rounded-lg"
                  style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)" }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded" style={{ background: "rgba(200, 149, 109, 0.1)", color: "#C8956D" }}>
                      House {r.house}
                    </span>
                    <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{r.planet}</span>
                    <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>in {r.sign}</span>
                  </div>
                  <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>{r.remedy}</p>
                  {r.gemstone && (
                    <p className="text-xs mt-2" style={{ color: "var(--text-tertiary)" }}>
                      <span className="font-medium" style={{ color: "#C8956D" }}>Gemstone:</span> {r.gemstone}
                    </p>
                  )}
                  {r.mantra && (
                    <p className="text-xs mt-1" style={{ color: "var(--text-tertiary)" }}>
                      <span className="font-medium" style={{ color: "#C8956D" }}>Mantra:</span> {r.mantra}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}
