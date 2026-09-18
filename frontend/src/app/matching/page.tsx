"use client";

import { useState } from "react";
import { api, MatchingResponse } from "@/lib/api";
import CitySearch from "@/components/CitySearch";
import { useScrollReveal } from "@/lib/useScrollReveal";

export default function MatchingPage() {
  const headerRef = useScrollReveal();
  const formRef = useScrollReveal();
  const [boy, setBoy] = useState({ name: "", birth_date: "1990-01-01", birth_time: "10:00", birth_place: "Delhi", latitude: 28.6139, longitude: 77.209, timezone_offset: 5.5 });
  const [girl, setGirl] = useState({ name: "", birth_date: "1992-05-15", birth_time: "14:00", birth_place: "Delhi", latitude: 28.6139, longitude: 77.209, timezone_offset: 5.5 });
  const [result, setResult] = useState<MatchingResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleCity = (setter: typeof setBoy, city: { name: string; lat: number; lng: number; tz: number }) => {
    setter((prev) => ({ ...prev, birth_place: city.name, latitude: city.lat, longitude: city.lng, timezone_offset: city.tz }));
  };

  const handleAnalyze = async () => {
    if (!boy.name || !girl.name) { setError("Please enter both names"); return; }
    setLoading(true); setError("");
    try { const data = await api.analyzeMatching(boy, girl); setResult(data); }
    catch (e: unknown) { setError(e instanceof Error ? e.message : "Failed"); }
    finally { setLoading(false); }
  };

  const getScoreColor = (score: number, max: number) => {
    const pct = (score / max) * 100;
    if (pct >= 75) return "var(--success)";
    if (pct >= 50) return "var(--gold)";
    return "var(--danger)";
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      <div ref={headerRef} className="scroll-reveal">
        <h1 className="text-3xl md:text-4xl font-bold mb-2">Marriage <span className="text-gradient-purple">Matching</span></h1>
        <p className="mb-8" style={{ color: "var(--text-secondary)" }}>Ashtakoot Gun Milan for marriage compatibility</p>
      </div>

      <div ref={formRef} className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8 scroll-reveal" style={{ transitionDelay: "100ms" }}>
        {[
          { label: "Groom Details", data: boy, setter: setBoy, accent: "var(--accent)" },
          { label: "Bride Details", data: girl, setter: setGirl, accent: "#ec4899" },
        ].map(({ label, data, setter, accent }) => (
          <div key={label} className="glass-card p-6 animate-fade-in-up">
            <h2 className="text-lg font-bold mb-4" style={{ color: accent }}>{label}</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: "var(--text-secondary)" }}>Name</label>
                <input type="text" placeholder="Name" value={data.name} onChange={(e) => setter({ ...data, name: e.target.value })} className="cosmic-input" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: "var(--text-secondary)" }}>Birth Date</label>
                <input type="date" value={data.birth_date} onChange={(e) => setter({ ...data, birth_date: e.target.value })} className="cosmic-input" style={{ colorScheme: "dark" }} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: "var(--text-secondary)" }}>Birth Time</label>
                <input type="time" value={data.birth_time} onChange={(e) => setter({ ...data, birth_time: e.target.value })} className="cosmic-input" style={{ colorScheme: "dark" }} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: "var(--text-secondary)" }}>Birth City</label>
                <CitySearch value={data.birth_place} onChange={(c) => handleCity(setter, c)} placeholder="Search city..." />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-center mb-8">
        <button onClick={handleAnalyze} disabled={loading} className="glow-btn-purple px-10 py-3 text-lg">
          {loading ? "Analyzing..." : "Analyze Matching"}
        </button>
      </div>

      {error && (
        <div className="mb-6 p-3 rounded-lg text-sm text-center" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "var(--danger)" }}>
          {error}
        </div>
      )}

      {result && (
        <div className="space-y-6 animate-fade-in-up">
          {/* Score Card */}
          <div className="glass-card p-8 text-center">
            <h2 className="text-2xl font-bold mb-4">{result.boy_name} &amp; {result.girl_name}</h2>
            <div className="text-6xl font-bold mb-2" style={{ color: "var(--gold)" }}>
              {result.total_score}/{result.max_score}
            </div>
            <div className="text-xl mb-2" style={{ color: "var(--text-primary)" }}>
              {result.compatibility_percentage}% Compatible
            </div>
            <div className="text-lg font-semibold mb-4" style={{ color: getScoreColor(result.total_score, result.max_score) }}>
              {result.recommendation}
            </div>
            {result.nadi_dosha && (
              <div className="p-3 rounded-lg text-sm inline-block" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "var(--danger)" }}>
                Nadi Dosha Detected &mdash; Consult an astrologer
              </div>
            )}
          </div>

          {/* Koota Details */}
          <div className="glass-card p-6">
            <h2 className="text-xl font-bold mb-4">Ashtakoot Analysis</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(result.kootas).map(([key, koota]: [string, any]) => (
                <div key={key} className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--border)" }}>
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-semibold capitalize">{koota.koota}</span>
                    <span className="font-bold" style={{ color: getScoreColor(koota.score, koota.max_points) }}>
                      {koota.score}/{koota.max_points}
                    </span>
                  </div>
                  <div className="w-full rounded-full h-2" style={{ background: "rgba(255,255,255,0.06)" }}>
                    <div className="h-2 rounded-full transition-all duration-700"
                      style={{
                        width: `${(koota.score / koota.max_points) * 100}%`,
                        background: `linear-gradient(90deg, var(--accent-deep), ${getScoreColor(koota.score, koota.max_points)})`,
                      }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
