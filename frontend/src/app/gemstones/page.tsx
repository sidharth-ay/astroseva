"use client";

import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Calendar, Clock, MapPin, User, ChevronRight, Gem, RotateCcw } from "lucide-react";
import CitySearch from "@/components/CitySearch";

import {
  api,
  type BirthData,
  type CityEntry,
  type GemstoneResponse,
} from "@/lib/api";
import {
  useReducedMotion,
  staggerContainer,
  staggerItem,
  slideUp,
  fadeIn,
} from "@/lib/motion";

/** One graha's standing in the chart, whether or not a stone is suggested. */
export default function GemstonesPage() {
  const [form, setForm] = useState<BirthData>({
    name: "",
    birth_date: "1990-05-15",
    birth_time: "10:30",
    birth_place: "New Delhi",
    latitude: 28.6139,
    longitude: 77.209,
    timezone_offset: 5.5,
    gender: "",
  });
  const [result, setResult] = useState<GemstoneResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const reduced = useReducedMotion();

  useEffect(() => {
    document.title = "Gemstone Recommendations | AstroSeva";
  }, []);

  const handleCity = (city: CityEntry) => {
    setForm({
      ...form,
      birth_place: city.name,
      latitude: city.lat,
      longitude: city.lng,
      timezone_offset: city.tz,
    });
  };

  const getRecommendations = async () => {
    if (!form.name.trim()) {
      setError("Please enter your name.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      setResult(await api.getGemstones(form));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to get recommendations.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-5 py-10">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h1 className="heading-display text-2xl md:text-3xl mb-1">
          <span className="text-gradient-gold">GEMSTONES</span>
        </h1>
        <p
          className="text-sm mb-8"
          style={{ color: "var(--text-secondary)" }}
        >
          Personalized gemstone recommendations based on your birth chart
        </p>
      </motion.div>

      {/* Form */}
      <motion.div
        className="glass-card p-5 mb-8"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08 }}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="input-label" htmlFor="gem-name">
              <User size={11} className="inline mr-1" />
              Name
            </label>
            <input
              id="gem-name"
              className="input-field"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Enter name"
            />
          </div>
          <div>
            <label className="input-label" htmlFor="gem-date">
              <Calendar size={11} className="inline mr-1" />
              Birth Date
            </label>
            <input
              id="gem-date"
              type="date"
              className="input-field"
              value={form.birth_date}
              onChange={(e) =>
                setForm({ ...form, birth_date: e.target.value })
              }
              style={{ colorScheme: "dark" }}
            />
          </div>
          <div>
            <label className="input-label" htmlFor="gem-time">
              <Clock size={11} className="inline mr-1" />
              Birth Time
            </label>
            <input
              id="gem-time"
              type="time"
              className="input-field"
              value={form.birth_time}
              onChange={(e) =>
                setForm({ ...form, birth_time: e.target.value })
              }
              style={{ colorScheme: "dark" }}
            />
          </div>
          <div>
            <label className="input-label" htmlFor="gem-city">
              <MapPin size={11} className="inline mr-1" />
              Birth City
            </label>
            <CitySearch value={form.birth_place} onChange={handleCity} />
          </div>
          <div>
            <label className="input-label" htmlFor="gem-gender">
              <User size={11} className="inline mr-1" />
              Gender <span className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>(optional)</span>
            </label>
            <select
              id="gem-gender"
              className="input-field"
              value={form.gender || ""}
              onChange={(e) =>
                setForm({ ...form, gender: e.target.value || undefined })
              }
            >
              <option value="">Select gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
          </div>
        </div>

        {error && (
          <p className="text-xs mt-3" style={{ color: "var(--danger)" }}>
            {error}
          </p>
        )}

        <div className="flex flex-wrap gap-2 mt-4">
          <button
            className="btn-primary"
            onClick={getRecommendations}
            disabled={loading}
          >
            {loading ? (
              "Getting Recommendations..."
            ) : (
              <>
                Get Recommendations <ChevronRight size={15} />
              </>
            )}
          </button>
          {result && (
            <button
              className="btn-ghost"
              onClick={() => {
                setResult(null);
                setError("");
              }}
            >
              <RotateCcw size={13} /> Clear
            </button>
          )}
        </div>
      </motion.div>

      {/* Loading Shimmer */}
      {loading && (
        <motion.div
          className="space-y-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="glass-card p-5">
            <div className="h-4 w-32 rounded mb-4 animate-pulse" style={{ background: "var(--border-subtle)" }} />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  className="rounded-lg p-4 animate-pulse"
                  style={{
                    background: "var(--bg-surface)",
                    border: "1px solid var(--border-subtle)",
                  }}
                >
                  <div className="h-4 w-20 rounded mb-3" style={{ background: "var(--border)" }} />
                  <div className="h-5 w-28 rounded mb-2" style={{ background: "var(--border)" }} />
                  <div className="space-y-2 mt-3">
                    <div className="h-3 w-full rounded" style={{ background: "var(--border-subtle)" }} />
                    <div className="h-3 w-3/4 rounded" style={{ background: "var(--border-subtle)" }} />
                    <div className="h-3 w-5/6 rounded" style={{ background: "var(--border-subtle)" }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* Error State */}
      {error && !loading && !result && (
        <motion.div
          className="glass-card p-6 text-center"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <p className="text-sm mb-3" style={{ color: "var(--danger)" }}>
            {error}
          </p>
          <button className="btn-ghost" onClick={getRecommendations}>
            <RotateCcw size={13} /> Try Again
          </button>
        </motion.div>
      )}

      {/* Results */}
      {result && !loading && (
        <motion.div
          variants={staggerContainer}
          initial={reduced ? false : "hidden"}
          animate="visible"
          className="space-y-6"
        >
          {/* Gemstone Grid */}
          <motion.div variants={staggerItem}>
            <h3
              className="text-xs font-semibold mb-3 uppercase tracking-wider"
              style={{ color: "#C8956D" }}
            >
              Your Gemstone Recommendations
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {result.gemstones.map((g) => (
                <motion.div
                  key={g.planet}
                  className="glass-card p-4"
                  variants={staggerItem}
                  whileHover={{ y: -2, transition: { duration: 0.15 } }}
                >
                  <div
                    className="text-[10px] uppercase tracking-wider mb-1 font-medium"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    {g.planet}
                  </div>
                  <div
                    className="text-base font-semibold mb-3"
                    style={{ color: "#C8956D" }}
                  >
                    <Gem size={13} className="inline mr-1.5 -mt-0.5" />
                    {g.gemstone}
                  </div>
                  <p
                    className="text-[11px] leading-relaxed mb-3"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {g.reason}
                  </p>
                  <div className="space-y-2">
                    {[
                      ["Weight", g.weight],
                      ["Metal", g.metal],
                      ["Finger", g.finger],
                      ["Best Day", g.day],
                      ["Alternative", g.alternative],
                    ].map(([label, value]) => (
                      <div
                        key={label}
                        className="flex justify-between text-xs"
                        style={{ borderBottom: "1px solid var(--border-subtle)" }}
                      >
                        <span style={{ color: "var(--text-tertiary)" }}>
                          {label}
                        </span>
                        <span
                          className="font-medium text-right"
                          style={{ color: "var(--text-secondary)" }}
                        >
                          {value}
                        </span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              ))}
            </div>
            {result.gemstones.length === 0 && (
              <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                No stone is indicated for this chart on the criteria below. That
                is a normal result, not an error &mdash; many charts warrant no
                gemstone at all.
              </p>
            )}
          </motion.div>

          {/* What the advice is based on, and every graha considered */}
          <motion.div className="glass-card p-4" variants={staggerItem}>
            <h3
              className="text-xs font-semibold mb-2 uppercase tracking-wider"
              style={{ color: "#C8956D" }}
            >
              How this was worked out
            </h3>
            <p
              className="text-xs leading-relaxed mb-3"
              style={{ color: "var(--text-secondary)" }}
            >
              {result.basis} Your ascendant is{" "}
              <strong style={{ color: "var(--text-primary)" }}>
                {result.ascendant}
              </strong>
              .
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border)" }}>
                    {["Graha", "Sign", "House", "Standing"].map((h) => (
                      <th
                        key={h}
                        className="text-left py-2 px-2 font-medium"
                        style={{ color: "var(--text-tertiary)" }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.considerations.map((c) => (
                    <tr
                      key={c.planet}
                      style={{ borderBottom: "1px solid var(--border-subtle)" }}
                    >
                      <td
                        className="py-2 px-2 font-medium"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {c.planet}
                      </td>
                      <td className="py-2 px-2" style={{ color: "var(--text-secondary)" }}>
                        {c.sign}
                      </td>
                      <td className="py-2 px-2" style={{ color: "var(--text-secondary)" }}>
                        {c.house}
                      </td>
                      <td className="py-2 px-2" style={{ color: "var(--text-secondary)" }}>
                        {c.combust ? `${c.dignity}, combust` : c.dignity}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>

          {/* General Recommendations */}
          {result.recommendations && (
            <motion.div className="glass-card p-4" variants={staggerItem}>
              <h3
                className="text-xs font-semibold mb-3 uppercase tracking-wider"
                style={{ color: "#C8956D" }}
              >
                General Recommendations
              </h3>
              <p
                className="text-sm leading-relaxed whitespace-pre-line"
                style={{ color: "var(--text-secondary)" }}
              >
                {result.recommendations}
              </p>
            </motion.div>
          )}

          {result.disclaimer && (
            <motion.div className="glass-card p-4" variants={staggerItem}>
              <p
                className="text-xs leading-relaxed"
                style={{ color: "var(--text-tertiary)" }}
              >
                {result.disclaimer}
              </p>
            </motion.div>
          )}
        </motion.div>
      )}
    </div>
  );
}
