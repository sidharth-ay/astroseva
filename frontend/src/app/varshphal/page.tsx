"use client";

import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Calendar, Clock, MapPin, User, ChevronRight, RefreshCw } from "lucide-react";
import CitySearch from "@/components/CitySearch";

import { api, type BirthData, type CityEntry } from "@/lib/api";
import {
  useReducedMotion,
  staggerContainer,
  staggerItem,
} from "@/lib/motion";

interface VarshphalResult {
  birth_data: Record<string, unknown>;
  year: number;
  varshphal_chart: Record<string, unknown>;
  predictions: Record<string, string>;
  auspicious_months: string[];
  challenging_months: string[];
}

const CATEGORY_META: Record<string, { icon: string; label: string }> = {
  career: { icon: "💼", label: "Career" },
  finance: { icon: "💰", label: "Finance" },
  health: { icon: "🏥", label: "Health" },
  marriage: { icon: "💍", label: "Marriage" },
  education: { icon: "📚", label: "Education" },
  travel: { icon: "✈️", label: "Travel" },
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
  const [result, setResult] = useState<VarshphalResult | null>(null);
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

          {/* Auspicious Months */}
          {result.auspicious_months.length > 0 && (
            <motion.div className="glass-card p-4" variants={staggerItem}>
              <h3 className="text-xs font-semibold mb-3 uppercase tracking-wider" style={{ color: "#C8956D" }}>
                Auspicious Months
              </h3>
              <div className="flex flex-wrap gap-2">
                {result.auspicious_months.map((month) => (
                  <span
                    key={month}
                    className="px-3 py-1 rounded-full text-xs font-medium"
                    style={{ background: "rgba(34, 197, 94, 0.1)", color: "#22c55e", border: "1px solid rgba(34, 197, 94, 0.2)" }}
                  >
                    {month}
                  </span>
                ))}
              </div>
            </motion.div>
          )}

          {/* Challenging Months */}
          {result.challenging_months.length > 0 && (
            <motion.div className="glass-card p-4" variants={staggerItem}>
              <h3 className="text-xs font-semibold mb-3 uppercase tracking-wider" style={{ color: "#C8956D" }}>
                Challenging Months
              </h3>
              <div className="flex flex-wrap gap-2">
                {result.challenging_months.map((month) => (
                  <span
                    key={month}
                    className="px-3 py-1 rounded-full text-xs font-medium"
                    style={{ background: "rgba(239, 68, 68, 0.1)", color: "#ef4444", border: "1px solid rgba(239, 68, 68, 0.2)" }}
                  >
                    {month}
                  </span>
                ))}
              </div>
            </motion.div>
          )}

          {/* Predictions Grid */}
          <motion.div variants={staggerItem}>
            <h3 className="text-xs font-semibold mb-3 uppercase tracking-wider" style={{ color: "#C8956D" }}>
              Annual Predictions
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(result.predictions).map(([key, text]) => {
                const meta = CATEGORY_META[key] || { icon: "🔮", label: key.charAt(0).toUpperCase() + key.slice(1) };
                return (
                  <motion.div
                    key={key}
                    className="glass-card p-4"
                    variants={staggerItem}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-base">{meta.icon}</span>
                      <h4 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{meta.label}</h4>
                    </div>
                    <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>{text}</p>
                  </motion.div>
                );
              })}
            </div>
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
