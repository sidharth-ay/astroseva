"use client";

import { useState } from "react";
import { api, PanchangResponse } from "@/lib/api";
import CitySearch from "@/components/CitySearch";
import { useScrollReveal } from "@/lib/useScrollReveal";

const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export default function PanchangPage() {
  const headerRef = useScrollReveal();
  const formRef = useScrollReveal();
  const [lat, setLat] = useState(28.6139);
  const [lng, setLng] = useState(77.209);
  const [city, setCity] = useState("Delhi");
  const [result, setResult] = useState<PanchangResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleCityChange = (c: { name: string; lat: number; lng: number; tz: number }) => {
    setCity(c.name); setLat(c.lat); setLng(c.lng);
  };

  const handleFetch = async () => {
    setLoading(true); setError("");
    try {
      const data = await api.getPanchang(lat, lng);
      setResult(data);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Failed"); }
    finally { setLoading(false); }
  };

  const formatDate = (d: string) => {
    const dt = new Date(d + "T00:00:00");
    return `${dayNames[dt.getDay()]}, ${dt.getDate()} ${monthNames[dt.getMonth()]} ${dt.getFullYear()}`;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      <div ref={headerRef} className="scroll-reveal">
        <h1 className="text-3xl md:text-4xl font-bold mb-2"><span className="text-gradient-gold">Panchang</span></h1>
        <p className="mb-8" style={{ color: "var(--text-secondary)" }}>Daily Hindu calendar with tithi, nakshatra, yoga &amp; auspicious timings</p>
      </div>

      {/* Form */}
      <div ref={formRef} className="glass-card p-6 mb-8 scroll-reveal" style={{ transitionDelay: "100ms" }}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: "var(--text-secondary)" }}>City</label>
            <CitySearch value={city} onChange={handleCityChange} placeholder="Search city..." />
          </div>
          <div className="flex items-end">
            <button onClick={handleFetch} disabled={loading} className="glow-btn-purple">
              {loading ? "Fetching..." : "Get Panchang"}
            </button>
          </div>
        </div>
        {error && (
          <div className="mt-4 p-3 rounded-lg text-sm" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "var(--danger)" }}>
            {error}
          </div>
        )}
      </div>

      {result && (
        <div className="space-y-6 animate-fade-in-up">
          {/* Header */}
          <div className="glass-card p-6 text-center">
            <h2 className="text-2xl font-bold mb-1">{formatDate(result.date)}</h2>
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{city} &bull; {lat.toFixed(2)}\u00B0N, {lng.toFixed(2)}\u00B0E</p>
          </div>

          {/* Main grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="glass-card p-5">
              <div className="text-xs font-medium mb-2" style={{ color: "var(--accent)" }}>Tithi</div>
              <div className="text-lg font-bold mb-1">{result.tithi.tithi_name}</div>
              <div className="text-sm" style={{ color: "var(--text-secondary)" }}>Day {result.tithi.tithi_number} &bull; {result.tithi.paksha}</div>
            </div>
            <div className="glass-card p-5">
              <div className="text-xs font-medium mb-2" style={{ color: "var(--accent)" }}>Nakshatra</div>
              <div className="text-lg font-bold mb-1">{result.nakshatra.nakshatra_name}</div>
              <div className="text-sm" style={{ color: "var(--text-secondary)" }}>Pada {result.nakshatra.pada}</div>
            </div>
            <div className="glass-card p-5">
              <div className="text-xs font-medium mb-2" style={{ color: "var(--accent)" }}>Yoga</div>
              <div className="text-lg font-bold mb-1">{result.yoga.yoga_name}</div>
            </div>
            <div className="glass-card p-5">
              <div className="text-xs font-medium mb-2" style={{ color: "var(--accent)" }}>Karana</div>
              <div className="text-lg font-bold mb-1">{result.karana.karana_name}</div>
            </div>
          </div>

          {/* Var */}
          <div className="glass-card p-5 text-center">
            <div className="text-sm" style={{ color: "var(--text-secondary)" }}>Vara (Day)</div>
            <div className="font-bold">{result.vara.vara_name} &mdash; Lord: {result.vara.vara_lord}</div>
          </div>

          {/* Rahu Kaal - highlighted red */}
          <div className="glass-card p-6">
            <h3 className="font-semibold mb-4" style={{ color: "var(--accent)" }}>Rahu Kaal &amp; Gulika Kaal</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-xl p-4 text-center" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
                <div className="text-xs font-medium mb-1" style={{ color: "var(--danger)" }}>Rahu Kaal</div>
                <div className="text-sm font-bold">{result.rahu_kaal.start} \u2014 {result.rahu_kaal.end}</div>
              </div>
              <div className="rounded-xl p-4 text-center" style={{ background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.2)" }}>
                <div className="text-xs font-medium mb-1" style={{ color: "var(--gold)" }}>Gulika Kaal</div>
                <div className="text-sm font-bold">{result.gulika_kaal.start} \u2014 {result.gulika_kaal.end}</div>
              </div>
            </div>
          </div>

          {/* Sun times */}
          <div className="glass-card p-6">
            <h3 className="font-semibold mb-4" style={{ color: "var(--accent)" }}>Sunrise &amp; Sunset</h3>
            <div className="flex justify-center gap-8">
              <div className="text-center">
                <div className="text-2xl mb-1">{'\u{1F305}'}</div>
                <div className="text-sm" style={{ color: "var(--text-secondary)" }}>Sunrise</div>
                <div className="font-bold">{result.sunrise}</div>
              </div>
              <div className="text-center">
                <div className="text-2xl mb-1">{'\u{1F307}'}</div>
                <div className="text-sm" style={{ color: "var(--text-secondary)" }}>Sunset</div>
                <div className="font-bold">{result.sunset}</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
