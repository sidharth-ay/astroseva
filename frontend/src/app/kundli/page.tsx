"use client";

import { useState } from "react";
import { api, KundliResponse } from "@/lib/api";
import KundliChart from "@/components/KundliChart";
import CitySearch from "@/components/CitySearch";
import { useScrollReveal } from "@/lib/useScrollReveal";

const zodiacMap: Record<number, { en: string; hi: string }> = {
  0: { en: "Aries", hi: "\u092E\u0947\u0937" }, 1: { en: "Taurus", hi: "\u0935\u0943\u0937\u092D" },
  2: { en: "Gemini", hi: "\u092E\u093F\u0925\u0941\u0928" }, 3: { en: "Cancer", hi: "\u0915\u0930\u094D\u0915" },
  4: { en: "Leo", hi: "\u0938\u093F\u0902\u0939" }, 5: { en: "Virgo", hi: "\u0915\u0928\u094D\u092F\u093E" },
  6: { en: "Libra", hi: "\u0924\u0941\u0932\u093E" }, 7: { en: "Scorpio", hi: "\u0935\u0943\u0936\u094D\u091A\u093F\u0915" },
  8: { en: "Sagittarius", hi: "\u0927\u0928\u0941" }, 9: { en: "Capricorn", hi: "\u092E\u0915\u0930" },
  10: { en: "Aquarius", hi: "\u0915\u0941\u092E\u094D\u092D" }, 11: { en: "Pisces", hi: "\u092E\u0940\u0928" },
};

export default function KundliPage() {
  const headerRef = useScrollReveal();
  const formRef = useScrollReveal();
  const [form, setForm] = useState({
    name: "",
    birth_date: "1990-05-15",
    birth_time: "10:30",
    city: "Delhi",
    latitude: 28.6139,
    longitude: 77.209,
    timezone_offset: 5.5,
  });
  const [result, setResult] = useState<KundliResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [exportingPdf, setExportingPdf] = useState(false);

  const handleCityChange = (city: { name: string; lat: number; lng: number; tz: number }) => {
    setForm({ ...form, city: city.name, latitude: city.lat, longitude: city.lng, timezone_offset: city.tz });
  };

  const handleGenerate = async () => {
    if (!form.name) { setError("Please enter your name"); return; }
    setLoading(true); setError("");
    try {
      const data = await api.generateKundli({
        name: form.name, birth_date: form.birth_date, birth_time: form.birth_time,
        birth_place: form.city, latitude: form.latitude, longitude: form.longitude,
        timezone_offset: form.timezone_offset,
      });
      setResult(data);
      const saved = JSON.parse(localStorage.getItem("kundli_history") || "[]");
      saved.unshift({ ...data, saved_at: new Date().toISOString() });
      localStorage.setItem("kundli_history", JSON.stringify(saved.slice(0, 10)));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to generate kundli");
    } finally { setLoading(false); }
  };

  const handleSample = async () => {
    setLoading(true); setError("");
    try { const data = await api.getSampleKundli(); setResult(data); }
    catch (e: unknown) { setError(e instanceof Error ? e.message : "Failed"); }
    finally { setLoading(false); }
  };

  const handleExportPdf = async () => {
    if (!result) return;
    setExportingPdf(true);
    try {
      const blob = await api.exportKundliPdf({
        name: result.name, birth_date: result.birth_date, birth_time: result.birth_time,
        birth_place: result.birth_place, latitude: result.latitude, longitude: result.longitude,
        timezone_offset: form.timezone_offset,
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `kundli_${result.name.replace(/\s+/g, "_")}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "PDF export failed");
    } finally { setExportingPdf(false); }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      <div ref={headerRef} className="scroll-reveal">
        <h1 className="text-3xl md:text-4xl font-bold mb-2">Kundli <span className="text-gradient-purple">Generator</span></h1>
        <p className="mb-8" style={{ color: "var(--text-secondary)" }}>
          Generate your Vedic birth chart with planetary positions
        </p>
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
            <CitySearch value={form.city} onChange={handleCityChange} placeholder="Search your city..." />
          </div>
          <div className="flex items-end gap-3">
            <button onClick={handleGenerate} disabled={loading} className="glow-btn-purple">
              {loading ? "Generating..." : "Generate Kundli"}
            </button>
            <button onClick={handleSample} className="glow-btn-outline text-sm py-2 px-4">
              Load Sample
            </button>
          </div>
        </div>
        {error && (
          <div className="mt-4 p-3 rounded-lg text-sm" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "var(--danger)" }}>
            {error}
          </div>
        )}
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-6">
          <div className="glass-card-static p-6"><div className="shimmer h-8 w-48 mb-4" /><div className="grid grid-cols-4 gap-4">{Array(8).fill(0).map((_, i) => <div key={i} className="shimmer h-6" />)}</div></div>
          <div className="glass-card-static p-6"><div className="shimmer h-80 w-full" /></div>
        </div>
      )}

      {/* Results */}
      {result && !loading && (
        <div className="space-y-6 animate-fade-in-up">
          {/* Basic Info */}
          <div className="glass-card p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Birth Chart Details</h2>
              <button onClick={handleExportPdf} disabled={exportingPdf}
                className="glow-btn-purple text-sm py-2 px-4">
                {exportingPdf ? "Exporting..." : "\uD83D\uDCC4 Export PDF"}
              </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              {[
                { label: "Name", value: result.name },
                { label: "Date", value: result.birth_date },
                { label: "Time", value: result.birth_time },
                { label: "Place", value: result.birth_place },
                { label: "Ascendant", value: `${zodiacMap[result.asc_sign]?.en} ${result.asc_sign_degree.toFixed(2)}\u00B0` },
                { label: "Ayanamsa", value: `${result.ayanamsa.toFixed(4)}\u00B0 (Lahiri)` },
                { label: "Retrograde", value: result.retrograde_planets.join(", ") || "None", color: "var(--danger)" },
                { label: "Exalted", value: result.exalted_planets.join(", ") || "None", color: "var(--success)" },
              ].map((item) => (
                <div key={item.label}>
                  <span style={{ color: "var(--text-secondary)" }}>{item.label}:</span>{" "}
                  <strong style={{ color: item.color || "var(--text-primary)" }}>{item.value}</strong>
                </div>
              ))}
            </div>
          </div>

          {/* Chart */}
          <KundliChart chart={result.chart} ascSign={result.asc_sign} />

          {/* Planetary Positions */}
          <div className="glass-card p-6">
            <h2 className="text-xl font-bold mb-4">Planetary Positions (Graha Sthiti)</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border)" }}>
                    {["Planet", "Sign", "Degree", "Retrograde", "Dignity"].map((h) => (
                      <th key={h} className="px-4 py-3 text-left font-semibold" style={{ color: "var(--accent)" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.planets.map((p) => (
                    <tr key={p.planet} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
                      className="transition-colors hover:bg-white/[0.02]">
                      <td className="px-4 py-3 font-semibold">{p.planet}</td>
                      <td className="px-4 py-3" style={{ color: "var(--text-secondary)" }}>{p.sign_name}</td>
                      <td className="px-4 py-3">{p.sign_degree.toFixed(2)}\u00B0</td>
                      <td className="px-4 py-3">{p.retrograde ? <span className="font-bold" style={{ color: "var(--danger)" }}>Yes (R)</span> : "No"}</td>
                      <td className="px-4 py-3" style={{ color: "var(--text-secondary)" }}>{p.dignity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Houses */}
          <div className="glass-card p-6">
            <h2 className="text-xl font-bold mb-4">House Placements (Bhava)</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {Object.entries(result.houses).map(([house, planets]) => (
                <div key={house} className="rounded-xl p-4 transition-all"
                  style={{
                    background: planets.length > 0 ? "rgba(147,51,234,0.08)" : "rgba(255,255,255,0.02)",
                    border: `1px solid ${planets.length > 0 ? "rgba(147,51,234,0.2)" : "var(--border)"}`,
                  }}>
                  <div className="text-xs mb-1" style={{ color: "var(--text-secondary)" }}>House {house}</div>
                  <div className="font-semibold text-sm">
                    {planets.length > 0 ? planets.join(", ") : <span style={{ color: "var(--text-secondary)" }}>Empty</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Vimshottari Dasha */}
          {result.dasha_info && (
            <div className="glass-card p-6">
              <h2 className="text-xl font-bold mb-4">Vimshottari Dasha</h2>
              <p className="text-sm mb-4" style={{ color: "var(--text-secondary)" }}>
                Birth Nakshatra: {result.dasha_info.birth_nakshatra.name} (Pada {result.dasha_info.birth_nakshatra.pada})
                {" "}&mdash; Dasha Lord: {result.dasha_info.birth_nakshatra.lord}
              </p>
              {result.dasha_info.current_dasha && (
                <div className="rounded-xl p-4 mb-4" style={{ background: "rgba(147,51,234,0.08)", border: "1px solid rgba(147,51,234,0.2)" }}>
                  <h3 className="font-semibold mb-2">Current Dasha Period</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span style={{ color: "var(--text-secondary)" }}>Mahadasha:</span>{" "}
                      <strong>{result.dasha_info.current_dasha.mahadasha}</strong>
                      <div className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>
                        {new Date(result.dasha_info.current_dasha.mahadasha_start).toLocaleDateString()} &mdash;{" "}
                        {new Date(result.dasha_info.current_dasha.mahadasha_end).toLocaleDateString()}
                        <br />({result.dasha_info.current_dasha.mahadasha_remaining_years} yrs remaining)
                      </div>
                    </div>
                    {result.dasha_info.current_dasha.antardasha && (
                      <div>
                        <span style={{ color: "var(--text-secondary)" }}>Antardasha:</span>{" "}
                        <strong>{result.dasha_info.current_dasha.antardasha}</strong>
                        <div className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>
                          {new Date(result.dasha_info.current_dasha.antardasha_start!).toLocaleDateString()} &mdash;{" "}
                          {new Date(result.dasha_info.current_dasha.antardasha_end!).toLocaleDateString()}
                        </div>
                      </div>
                    )}
                    {result.dasha_info.current_dasha.pratyantardasha && (
                      <div>
                        <span style={{ color: "var(--text-secondary)" }}>Pratyantardasha:</span>{" "}
                        <strong>{result.dasha_info.current_dasha.pratyantardasha}</strong>
                        <div className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>
                          {new Date(result.dasha_info.current_dasha.pratyantardasha_start!).toLocaleDateString()} &mdash;{" "}
                          {new Date(result.dasha_info.current_dasha.pratyantardasha_end!).toLocaleDateString()}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
              <h3 className="font-semibold mb-3">All Mahadashas</h3>
              <div className="flex flex-wrap gap-2">
                {result.dasha_info.all_mahadashas.slice(0, 9).map((d, i) => {
                  const isCurrent = result.dasha_info?.current_dasha?.mahadasha === d.lord;
                  return (
                    <div key={`${d.lord}-${i}`} className="text-center px-4 py-3 rounded-xl transition-all"
                      style={{
                        background: isCurrent ? "linear-gradient(135deg, var(--accent-deep), #6d28d9)" : "rgba(255,255,255,0.04)",
                        border: `1px solid ${isCurrent ? "var(--border-active)" : "var(--border)"}`,
                        boxShadow: isCurrent ? "0 0 20px var(--accent-glow)" : "none",
                        color: isCurrent ? "white" : "var(--text-primary)",
                      }}>
                      <div className="text-sm font-semibold">{d.lord}</div>
                      <div className="text-xs" style={{ color: isCurrent ? "rgba(255,255,255,0.7)" : "var(--text-secondary)" }}>{d.duration_years} yrs</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
