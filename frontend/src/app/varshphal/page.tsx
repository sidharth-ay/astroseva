"use client";

import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Calendar, Clock, MapPin, User, ChevronRight, RefreshCw } from "lucide-react";
import CitySearch from "@/components/CitySearch";

import {
  api,
  type BirthData,
  type CityEntry,
  type VarshphalResponse,
} from "@/lib/api";
import {
  useReducedMotion,
  staggerContainer,
  staggerItem,
} from "@/lib/motion";

const PLANET_META: Record<string, string> = {
  Sun: "☉", Moon: "☽", Mars: "♂", Mercury: "☿",
  Jupiter: "♃", Venus: "♀", Saturn: "♄",
};

const currentYear = new Date().getFullYear();

export default function VarshphalPage() {
  const [form, setForm] = useState<BirthData>({
    name: "",
    birth_date: "1990-05-15",
    birth_time: "10:30",
    birth_place: "New Delhi",
    latitude: 28.6139,
    longitude: 77.209,
    timezone_offset: 5.5,
  });
  const [year, setYear] = useState(currentYear);
  const [result, setResult] = useState<VarshphalResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const reduced = useReducedMotion();

  useEffect(() => {
    document.title = "Varshphal - Annual Horoscope | AstroSeva";
  }, []);

  const handleCity = (city: CityEntry) => {
    setForm({ ...form, birth_place: city.name, latitude: city.lat, longitude: city.lng, timezone_offset: city.tz });
  };

  const generate = async () => {
    if (!form.name.trim()) {
      setError("Please enter your name.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      setResult(await api.getVarshphal(form, year));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to generate varshphal.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-5 py-10">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <h1 className="heading-display text-2xl md:text-3xl mb-1">
          Varshphal <span className="text-gradient-gold">Generator</span>
        </h1>
        <p className="text-sm mb-8" style={{ color: "var(--text-secondary)" }}>
          Annual horoscope based on your birth chart
        </p>
      </motion.div>

      {/* Form */}
      <motion.div className="glass-card p-5 mb-8" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="input-label" htmlFor="varshphal-name">
              <User size={11} className="inline mr-1" />Name
            </label>
            <input
              id="varshphal-name"
              className="input-field"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Enter name"
            />
          </div>
          <div>
            <label className="input-label" htmlFor="varshphal-date">
              <Calendar size={11} className="inline mr-1" />Birth Date
            </label>
            <input
              id="varshphal-date"
              type="date"
              className="input-field"
              value={form.birth_date}
              onChange={(e) => setForm({ ...form, birth_date: e.target.value })}
              style={{ colorScheme: "dark" }}
            />
          </div>
          <div>
            <label className="input-label" htmlFor="varshphal-time">
              <Clock size={11} className="inline mr-1" />Birth Time
            </label>
            <input
              id="varshphal-time"
              type="time"
              className="input-field"
              value={form.birth_time}
              onChange={(e) => setForm({ ...form, birth_time: e.target.value })}
              style={{ colorScheme: "dark" }}
            />
          </div>
          <div>
            <label className="input-label" htmlFor="varshphal-city">
              <MapPin size={11} className="inline mr-1" />Birth City
            </label>
            <CitySearch value={form.birth_place} onChange={handleCity} />
          </div>
          <div>
            <label className="input-label" htmlFor="varshphal-year">
              <Calendar size={11} className="inline mr-1" />Year
            </label>
            <select
              id="varshphal-year"
              className="input-field"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              style={{ colorScheme: "dark" }}
            >
              <option value={currentYear}>{currentYear} (Current Year)</option>
              <option value={currentYear + 1}>{currentYear + 1} (Next Year)</option>
            </select>
          </div>
        </div>
        {error && <p className="text-xs mt-3" style={{ color: "var(--danger)" }}>{error}</p>}
        <div className="flex flex-wrap gap-2 mt-4">
          <button className="btn-primary" onClick={generate} disabled={loading}>
            {loading ? "Generating..." : "Generate Annual Horoscope"} <ChevronRight size={15} />
          </button>
          {result && (
            <button className="btn-ghost" onClick={generate} disabled={loading}>
              <RefreshCw size={13} /> Regenerate
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
          {/* Birth Details & Year Summary */}
          <motion.div className="glass-card p-4" variants={staggerItem}>
            <h3 className="text-xs font-semibold mb-3 uppercase tracking-wider" style={{ color: "#C8956D" }}>
              Birth Details &amp; Year {result.year}
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              {[
                ["Name", form.name],
                ["Date", form.birth_date],
                ["Time", form.birth_time],
                ["Place", form.birth_place],
                ["Year", String(result.year)],
              ].map(([label, val]) => (
                <div key={label}>
                  <div className="text-[10px] uppercase tracking-wider mb-0.5" style={{ color: "var(--text-tertiary)" }}>{label}</div>
                  <div className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>{val}</div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Dasha running through the year */}
          <motion.div className="glass-card p-4" variants={staggerItem}>
            <h3 className="text-xs font-semibold mb-3 uppercase tracking-wider" style={{ color: "#C8956D" }}>
              Dasha running through {result.year}
            </h3>
            <dl className="space-y-2 text-xs">
              {result.annual_chart.dasha_lord && (
                <div className="flex justify-between gap-4">
                  <dt style={{ color: "var(--text-tertiary)" }}>Mahadasha</dt>
                  <dd style={{ color: "var(--text-primary)" }}>
                    {result.annual_chart.dasha_lord}
                    {result.annual_chart.dasha_period && (
                      <span style={{ color: "var(--text-tertiary)" }}>
                        {" "}({result.annual_chart.dasha_period})
                      </span>
                    )}
                  </dd>
                </div>
              )}
              {result.annual_chart.antardasha_lord && (
                <div className="flex justify-between gap-4">
                  <dt style={{ color: "var(--text-tertiary)" }}>Antardasha</dt>
                  <dd style={{ color: "var(--text-primary)" }}>
                    {result.annual_chart.antardasha_lord}
                    {result.annual_chart.antardasha_period && (
                      <span style={{ color: "var(--text-tertiary)" }}>
                        {" "}({result.annual_chart.antardasha_period})
                      </span>
                    )}
                  </dd>
                </div>
              )}
            </dl>
          </motion.div>

          {/* Solar transits at the midpoint of the year */}
          <motion.div className="glass-card p-4" variants={staggerItem}>
            <h3 className="text-xs font-semibold mb-1 uppercase tracking-wider" style={{ color: "#C8956D" }}>
              Planetary positions in {result.year}
            </h3>
            <p className="text-[11px] mb-3" style={{ color: "var(--text-tertiary)" }}>
              Sampled at the midpoint of the year. A graha that changes sign
              during the year is shown only where it stood in July.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border)" }}>
                    {["Graha", "Sign", "Longitude", "Retrograde"].map((h) => (
                      <th key={h} className="text-left py-2 px-2 font-medium" style={{ color: "var(--text-tertiary)" }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(result.annual_chart.solar_transits).map(([name, t]) => (
                    <tr key={name} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                      <td className="py-2 px-2 font-medium" style={{ color: "var(--text-primary)" }}>
                        <span style={{ color: "#C8956D" }}>{PLANET_META[name] ?? ""}</span> {name}
                      </td>
                      <td className="py-2 px-2" style={{ color: "var(--text-secondary)" }}>{t.sign}</td>
                      <td className="py-2 px-2" style={{ color: "var(--text-secondary)" }}>
                        {t.longitude.toFixed(2)}°
                      </td>
                      <td className="py-2 px-2" style={{ color: "var(--text-secondary)" }}>
                        {t.retrograde ? "Yes" : "No"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>

          {/* What this endpoint does and does not do */}
          <motion.div className="glass-card p-4" variants={staggerItem}>
            <h3 className="text-xs font-semibold mb-2 uppercase tracking-wider" style={{ color: "#C8956D" }}>
              About this result
            </h3>
            <p className="text-xs leading-relaxed mb-2" style={{ color: "var(--text-secondary)" }}>
              {result.method}
            </p>
            <ul className="space-y-1.5 list-disc pl-4">
              {result.limitations.map((l) => (
                <li key={l} className="text-xs leading-relaxed" style={{ color: "var(--text-tertiary)" }}>
                  {l}
                </li>
              ))}
            </ul>
          </motion.div>
        </motion.div>
      )}

      {/* Loading State */}
      {loading && !result && (
        <div className="glass-card p-10 text-center">
          <div className="inline-block w-6 h-6 border-2 rounded-full animate-spin mb-3" style={{ borderColor: "var(--border)", borderTopColor: "#C8956D" }} />
          <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>Calculating your annual horoscope...</p>
        </div>
      )}

      {/* Error State */}
      {error && !result && (
        <div className="glass-card p-8 text-center">
          <p className="text-sm mb-3" style={{ color: "var(--text-secondary)" }}>Something went wrong</p>
          <button className="btn-primary" onClick={generate} disabled={loading}>
            <RefreshCw size={13} className="inline mr-1" /> Try Again
          </button>
        </div>
      )}
    </div>
  );
}
