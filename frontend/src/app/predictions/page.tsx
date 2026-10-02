"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useReducedMotion, slideUp } from "@/lib/motion";
import { Brain, ChevronRight, User, Calendar, Clock, MapPin } from "lucide-react";
import CitySearch from "@/components/CitySearch";
import { api, pickLocationFields, type BirthData, type CityEntry, locationFromCity } from "@/lib/api";

const categories = [
  { key: "all", label: "All Areas", icon: "✦", color: "var(--champagne)" },
  { key: "career", label: "Career", icon: "◆", color: "#B0BEC5" },
  { key: "marriage", label: "Marriage", icon: "♥", color: "#E8B88A" },
  { key: "health", label: "Health", icon: "✚", color: "#5DC88F" },
  { key: "finance", label: "Finance", icon: "◇", color: "var(--champagne)" },
  { key: "education", label: "Education", icon: "△", color: "var(--accent)" },
];

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
  const reduced = useReducedMotion();
  const fetchedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    document.title = "AI Predictions | AstroSeva";
  }, []);

  const handleCityChange = (city: CityEntry) => {
    setForm((prev) => ({
      ...prev,
      // This form's field is named `city`, not `birth_place`, so the shared
      // helper's `birth_place` is dropped rather than shipped to a model that
      // has no such field.
      ...pickLocationFields(locationFromCity(city)),
      city: city.name,
    }));
  };

  const handleGenerate = async () => {
    if (!form.name) { setError("Please enter your name"); return; }
    setLoading(true); setError(""); setPredictions({}); fetchedRef.current.clear();
    try {
      await api.generateKundli({
        name: form.name, birth_date: form.birth_date, birth_time: form.birth_time,
        birth_place: form.city, latitude: form.latitude, longitude: form.longitude, timezone_offset: form.timezone_offset,
      });
      const bd: BirthData = {
        name: form.name, birth_date: form.birth_date, birth_time: form.birth_time,
        birth_place: form.city, latitude: form.latitude, longitude: form.longitude, timezone_offset: form.timezone_offset,
      };
      setBirthData(bd);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Failed"); }
    finally { setLoading(false); }
  };

  const fetchPrediction = async (category: string, bd: BirthData) => {
    if (fetchedRef.current.has(category)) return;
    fetchedRef.current.add(category);
    try {
      const resp = await api.generatePrediction(bd, category === "all" ? "general" : category);
      setPredictions((prev) => ({ ...prev, [category]: resp.content }));
  } catch {
    setPredictions((prev) => ({ ...prev, [category]: "Prediction unavailable. Please try again." }));
    }
  };

  // Pre-fetch all categories when birthData is set
  useEffect(() => {
    if (!birthData) return;
    setGenerating(true);
    const tasks = categories.map((cat) => fetchPrediction(cat.key, birthData));
    Promise.all(tasks).finally(() => setGenerating(false));
  }, [birthData]);

  const handleCategoryClick = (key: string) => {
    setActiveCategory(key);
    if (!predictions[key] && birthData && !fetchedRef.current.has(key)) {
      setGenerating(true);
      fetchPrediction(key, birthData).finally(() => setGenerating(false));
    }
  };

  const activeCat = categories.find((c) => c.key === activeCategory);

  return (
    <div className="max-w-5xl mx-auto px-5 py-10">
      <motion.div variants={slideUp} initial="hidden" animate={reduced ? false : "visible"}>
        <h1 className="text-2xl md:text-3xl font-display font-bold mb-1 heading-display">
          AI <span className="text-gradient-gold">Predictions</span>
        </h1>
        <p className="text-sm mb-8" style={{ color: "var(--text-secondary)" }}>Generate your birth chart, then get AI-powered predictions</p>
      </motion.div>

      {/* Form */}
      <motion.div className="glass-card p-6 mb-8" variants={slideUp} initial="hidden" animate={reduced ? false : "visible"}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="input-label" htmlFor="pred-name"><User size={12} className="inline mr-1" />Name</label>
            <input id="pred-name" type="text" value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} className="input-field" placeholder="Enter your name" />
          </div>
          <div>
            <label className="input-label" htmlFor="pred-date"><Calendar size={12} className="inline mr-1" />Birth Date</label>
            <input id="pred-date" type="date" value={form.birth_date} onChange={(e) => setForm((prev) => ({ ...prev, birth_date: e.target.value }))} className="input-field" style={{ colorScheme: "dark" }} />
          </div>
          <div>
            <label className="input-label" htmlFor="pred-time"><Clock size={12} className="inline mr-1" />Birth Time</label>
            <input id="pred-time" type="time" value={form.birth_time} onChange={(e) => setForm((prev) => ({ ...prev, birth_time: e.target.value }))} className="input-field" style={{ colorScheme: "dark" }} />
          </div>
          <div>
            <label className="input-label" htmlFor="pred-city"><MapPin size={12} className="inline mr-1" />Birth City</label>
            <CitySearch id="pred-city" value={form.city} onChange={handleCityChange} placeholder="Search city..." />
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
              <button key={cat.key} onClick={() => handleCategoryClick(cat.key)}
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
          <p className="text-xs mt-3" style={{ color: "var(--text-tertiary)" }}>Generating predictions...</p>
        </div>
      )}

      {!generating && birthData && (
        <AnimatePresence mode="wait">
          {predictions[activeCategory] ? (
            <motion.div key={activeCategory} className="max-w-3xl mx-auto" variants={slideUp} initial="hidden" animate={reduced ? false : "visible"} exit="exit">
              <div className="glass-card p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ background: `${activeCat?.color}10`, color: activeCat?.color }}>
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
          ) : (
            <div className="glass-card p-8 text-center">
              <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>
                Click a category above to view predictions
              </p>
            </div>
          )}
        </AnimatePresence>
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
