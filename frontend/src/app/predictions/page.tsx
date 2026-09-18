"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Brain, ChevronRight, User, Calendar, Clock, MapPin } from "lucide-react";
import CitySearch from "@/components/CitySearch";
import { api, type BirthData, type CityEntry } from "@/lib/api";

const categories = [
  { key: "all", label: "All Areas", icon: "✦", color: "var(--champagne)" },
  { key: "career", label: "Career", icon: "◆", color: "#8AA8F4" },
  { key: "marriage", label: "Marriage", icon: "♥", color: "#E8A0BF" },
  { key: "health", label: "Health", icon: "✚", color: "#5DC88F" },
  { key: "finance", label: "Finance", icon: "◇", color: "var(--champagne)" },
  { key: "education", label: "Education", icon: "△", color: "var(--lavender)" },
];

const fadeUp = { hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } } };

export default function PredictionsPage() {
  const [form, setForm] = useState({
    name: "", birth_date: "1990-05-15", birth_time: "10:30",
    city: "Delhi", latitude: 28.6139, longitude: 77.209, timezone_offset: 5.5,
  });
  const [birthData, setBirthData] = useState<BirthData | null>(null);
  const [predictions, setPredictions] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");

  const handleCityChange = (city: CityEntry) => {
    setForm({ ...form, city: city.name, latitude: city.lat, longitude: city.lng, timezone_offset: city.tz });
  };

  const handleGenerate = async () => {
    if (!form.name) { setError("Please enter your name"); return; }
    setLoading(true); setError(""); setPredictions({});
    try {
      await api.generateKundli({
        name: form.name, birth_date: form.birth_date, birth_time: form.birth_time,
        birth_place: form.city, latitude: form.latitude, longitude: form.longitude, timezone_offset: form.timezone_offset,
      });
      setBirthData({
        name: form.name, birth_date: form.birth_date, birth_time: form.birth_time,
        birth_place: form.city, latitude: form.latitude, longitude: form.longitude, timezone_offset: form.timezone_offset,
      });
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Failed"); }
    finally { setLoading(false); }
  };

  const handleGetPrediction = async (category: string) => {
    if (!birthData) return;
    setGenerating(true); setError("");
    try {
      const resp = await api.generatePrediction(birthData, category === "all" ? "general" : category);
      setPredictions((prev) => ({ ...prev, [category]: resp.content }));
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Failed to get prediction"); }
    finally { setGenerating(false); }
  };

  return (
    <div className="max-w-5xl mx-auto px-5 py-10">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl md:text-3xl font-display font-bold mb-1">
          AI <span className="text-gradient-gold">Predictions</span>
        </h1>
        <p className="text-sm mb-8" style={{ color: "var(--text-secondary)" }}>Generate your birth chart, then get AI-powered predictions</p>
      </motion.div>

      {/* Form */}
      <motion.div className="glass-card p-6 mb-8" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="input-label"><User size={12} className="inline mr-1" />Name</label>
            <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input-field" placeholder="Enter your name" />
          </div>
          <div>
            <label className="input-label"><Calendar size={12} className="inline mr-1" />Birth Date</label>
            <input type="date" value={form.birth_date} onChange={(e) => setForm({ ...form, birth_date: e.target.value })} className="input-field" style={{ colorScheme: "dark" }} />
          </div>
          <div>
            <label className="input-label"><Clock size={12} className="inline mr-1" />Birth Time</label>
            <input type="time" value={form.birth_time} onChange={(e) => setForm({ ...form, birth_time: e.target.value })} className="input-field" style={{ colorScheme: "dark" }} />
          </div>
          <div>
            <label className="input-label"><MapPin size={12} className="inline mr-1" />Birth City</label>
            <CitySearch value={form.city} onChange={handleCityChange} placeholder="Search city..." />
          </div>
          <div className="flex items-end">
            <button onClick={handleGenerate} disabled={loading} className="btn-primary">
              {loading ? "Generating..." : "Generate Chart"} <ChevronRight size={16} />
            </button>
          </div>
        </div>
        {error && <p className="text-xs mt-3" style={{ color: "var(--danger)" }}>{error}</p>}
      </motion.div>

      {/* Chart summary */}
      {birthData && (
        <motion.div className="glass-card p-5 mb-8" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <h3 className="text-sm font-semibold mb-3" style={{ color: "var(--champagne)" }}>Your Details</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            {[
              ["Name", birthData.name],
              ["Date", birthData.birth_date],
              ["Time", birthData.birth_time],
              ["Place", birthData.birth_place],
            ].map(([label, val]) => (
              <div key={label}>
                <div className="text-[10px] uppercase tracking-wider mb-0.5" style={{ color: "var(--text-tertiary)" }}>{label}</div>
                <div className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>{val}</div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Category Selector */}
      {birthData && (
        <motion.div className="mb-8" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <h3 className="text-sm font-semibold mb-4 text-center" style={{ color: "var(--champagne)" }}>Get Predictions For</h3>
          <div className="flex flex-wrap justify-center gap-2">
            {categories.map((cat) => (
              <button key={cat.key} onClick={() => { setActiveCategory(cat.key); if (!predictions[cat.key]) handleGetPrediction(cat.key); }}
                className="px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200"
                style={{
                  background: activeCategory === cat.key ? `${cat.color}10` : "transparent",
                  border: `1px solid ${activeCategory === cat.key ? `${cat.color}30` : "var(--border-subtle)"}`,
                  color: activeCategory === cat.key ? cat.color : "var(--text-secondary)",
                }}>
                {cat.icon} {cat.label}
              </button>
            ))}
          </div>
        </motion.div>
      )}

      {/* Prediction Display */}
      {generating && (
        <div className="glass-card p-8 text-center">
          <div className="shimmer h-32 w-full rounded-xl" />
        </div>
      )}

      {!generating && predictions[activeCategory] && (
        <motion.div className="max-w-3xl mx-auto" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <div className="glass-card p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: `${categories.find((c) => c.key === activeCategory)?.color}10`, color: categories.find((c) => c.key === activeCategory)?.color }}>
                <Brain size={18} />
              </div>
              <h3 className="text-base font-semibold capitalize" style={{ color: "var(--text-primary)" }}>
                {activeCategory === "all" ? "Complete Life Overview" : activeCategory} Prediction
              </h3>
            </div>
            <div className="text-sm leading-relaxed whitespace-pre-line" style={{ color: "var(--text-secondary)" }}>
              {predictions[activeCategory]}
            </div>
          </div>
        </motion.div>
      )}

      {/* Quick links */}
      {birthData && (
        <div className="flex justify-center gap-4 mt-8">
          <a href="/kundli" className="btn-secondary text-xs px-4 py-2">View Full Kundli</a>
        </div>
      )}
    </div>
  );
}
