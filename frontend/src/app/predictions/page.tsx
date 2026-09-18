"use client";

import { useState } from "react";
import { api, BirthData } from "@/lib/api";
import CitySearch from "@/components/CitySearch";
import { useScrollReveal } from "@/lib/useScrollReveal";

const categories = [
  { key: "all", label: "All Areas", icon: "\u2728" },
  { key: "career", label: "Career", icon: "\uD83D\uDCBC" },
  { key: "marriage", label: "Marriage", icon: "\uD83D\uDC92" },
  { key: "health", label: "Health", icon: "\uD83D\uDCAA" },
  { key: "finance", label: "Finance", icon: "\uD83D\uDCB0" },
  { key: "education", label: "Education", icon: "\uD83C\uDF93" },
];

export default function PredictionsPage() {
  const headerRef = useScrollReveal();
  const formRef = useScrollReveal();
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

  const handleCityChange = (city: { name: string; lat: number; lng: number; tz: number }) => {
    setForm({ ...form, city: city.name, latitude: city.lat, longitude: city.lng, timezone_offset: city.tz });
  };

  const handleGenerate = async () => {
    if (!form.name) { setError("Please enter your name"); return; }
    setLoading(true); setError(""); setPredictions({});
    try {
      await api.generateKundli({
        name: form.name, birth_date: form.birth_date, birth_time: form.birth_time,
        birth_place: form.city, latitude: form.latitude, longitude: form.longitude,
        timezone_offset: form.timezone_offset,
      });
      setBirthData({
        name: form.name, birth_date: form.birth_date, birth_time: form.birth_time,
        birth_place: form.city, latitude: form.latitude, longitude: form.longitude,
        timezone_offset: form.timezone_offset,
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
    <div className="max-w-7xl mx-auto px-4 py-10">
      <div ref={headerRef} className="scroll-reveal">
        <h1 className="text-3xl md:text-4xl font-bold mb-2">AI <span className="text-gradient-purple">Predictions</span></h1>
        <p className="mb-8" style={{ color: "var(--text-secondary)" }}>Generate your birth chart, then get AI-powered predictions</p>
      </div>

      {/* Form */}
      <div ref={formRef} className="glass-card p-6 mb-8 scroll-reveal" style={{ transitionDelay: "100ms" }}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: "var(--text-secondary)" }}>Name</label>
            <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="cosmic-input" placeholder="Enter your name" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: "var(--text-secondary)" }}>Birth Date</label>
            <input type="date" value={form.birth_date} onChange={(e) => setForm({ ...form, birth_date: e.target.value })}
              className="cosmic-input" style={{ colorScheme: "dark" }} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: "var(--text-secondary)" }}>Birth Time</label>
            <input type="time" value={form.birth_time} onChange={(e) => setForm({ ...form, birth_time: e.target.value })}
              className="cosmic-input" style={{ colorScheme: "dark" }} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: "var(--text-secondary)" }}>Birth City</label>
            <CitySearch value={form.city} onChange={handleCityChange} placeholder="Search city..." />
          </div>
          <div className="flex items-end">
            <button onClick={handleGenerate} disabled={loading} className="glow-btn-purple">
              {loading ? "Generating..." : "Generate Chart"}
            </button>
          </div>
        </div>
        {error && (
          <div className="mt-4 p-3 rounded-lg text-sm" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "var(--danger)" }}>
            {error}
          </div>
        )}
      </div>

      {/* Chart summary */}
      {birthData && (
        <div className="glass-card p-6 mb-8 animate-fade-in-up">
          <h2 className="text-xl font-bold mb-3">Your Details</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div><span style={{ color: "var(--text-secondary)" }}>Name:</span> <strong>{birthData.name}</strong></div>
            <div><span style={{ color: "var(--text-secondary)" }}>Date:</span> <strong>{birthData.birth_date}</strong></div>
            <div><span style={{ color: "var(--text-secondary)" }}>Time:</span> <strong>{birthData.birth_time}</strong></div>
            <div><span style={{ color: "var(--text-secondary)" }}>Place:</span> <strong>{birthData.birth_place}</strong></div>
          </div>
        </div>
      )}

      {/* Category Selector */}
      {birthData && (
        <div className="mb-8 animate-fade-in-up">
          <h2 className="text-xl font-bold mb-4 text-center">Get Predictions For</h2>
          <div className="flex flex-wrap justify-center gap-3">
            {categories.map((cat) => (
              <button key={cat.key} onClick={() => { setActiveCategory(cat.key); if (!predictions[cat.key]) handleGetPrediction(cat.key); }}
                className="px-5 py-3 rounded-xl font-medium transition-all duration-200"
                style={{
                  background: activeCategory === cat.key ? "linear-gradient(135deg, var(--accent-deep), #6d28d9)" : "rgba(255,255,255,0.04)",
                  border: `1px solid ${activeCategory === cat.key ? "var(--border-active)" : "var(--border)"}`,
                  boxShadow: activeCategory === cat.key ? "0 0 20px var(--accent-glow)" : "none",
                  color: activeCategory === cat.key ? "white" : "var(--text-secondary)",
                }}>
                {cat.icon} {cat.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Prediction Display */}
      {generating && (
        <div className="glass-card-static p-8 text-center animate-fade-in">
          <div className="text-4xl mb-3 animate-glow-pulse">\u2728</div>
          <p style={{ color: "var(--text-secondary)" }}>Generating prediction...</p>
        </div>
      )}

      {!generating && predictions[activeCategory] && (
        <div className="max-w-3xl mx-auto animate-fade-in-up">
          <div className="glass-card p-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: "rgba(147,51,234,0.15)" }}>
                {categories.find((c) => c.key === activeCategory)?.icon}
              </div>
              <h3 className="text-xl font-bold capitalize">
                {activeCategory === "all" ? "Complete Life Overview" : activeCategory} Prediction
              </h3>
            </div>
            <div className="text-base leading-relaxed whitespace-pre-line" style={{ color: "var(--text-primary)" }}>
              {predictions[activeCategory]}
            </div>
          </div>
        </div>
      )}

      {/* Quick links */}
      <div className="flex justify-center gap-4 mt-8 animate-fade-in-up">
        <a href="/kundli" className="glow-btn-outline py-2 px-4 text-sm">View Full Kundli</a>
      </div>
    </div>
  );
}
