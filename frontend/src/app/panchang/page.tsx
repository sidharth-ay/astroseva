"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useReducedMotion, staggerContainer, staggerItem, slideUp } from "@/lib/motion";
import { MapPin } from "lucide-react";
import { api, type PanchangResponse } from "@/lib/api";
import CitySearch from "@/components/CitySearch";

const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export default function PanchangPage() {
  const [lat, setLat] = useState(28.6139);
  const [lng, setLng] = useState(77.209);
  const [city, setCity] = useState("Delhi");
  const [result, setResult] = useState<PanchangResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const reduced = useReducedMotion();

  const handleCityChange = (c: { name: string; lat: number; lng: number; tz: number }) => {
    setCity(c.name); setLat(c.lat); setLng(c.lng);
  };

  const handleFetch = async () => {
    setLoading(true); setError("");
    try { setResult(await api.getPanchang(lat, lng)); }
    catch (e: unknown) { setError(e instanceof Error ? e.message : "Failed"); }
    finally { setLoading(false); }
  };

  const formatDate = (d: string) => {
    const dt = new Date(d + "T00:00:00");
    return `${dayNames[dt.getDay()]}, ${dt.getDate()} ${monthNames[dt.getMonth()]} ${dt.getFullYear()}`;
  };

  return (
    <div className="max-w-5xl mx-auto px-5 py-10">
      <motion.div variants={slideUp} initial={reduced ? false : "hidden"} animate="visible">
        <h1 className="text-2xl md:text-3xl font-display font-bold mb-1">
          <span className="text-gradient-gold">Panchang</span>
        </h1>
        <p className="text-sm mb-8" style={{ color: "var(--text-secondary)" }}>Daily Hindu calendar with tithi, nakshatra, yoga & auspicious timings</p>
      </motion.div>

      {/* Form */}
      <motion.div className="glass-card p-6 mb-8" variants={slideUp}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="input-label"><MapPin size={12} className="inline mr-1" />City</label>
            <CitySearch value={city} onChange={handleCityChange} placeholder="Search city..." />
          </div>
          <div className="flex items-end">
            <button onClick={handleFetch} disabled={loading} className="btn-primary">
              {loading ? "Fetching..." : "Get Panchang"}
            </button>
          </div>
        </div>
        {error && <p className="text-xs mt-3" style={{ color: "var(--danger)" }}>{error}</p>}
      </motion.div>

      {result && (
        <motion.div className="space-y-6" variants={staggerContainer} initial={reduced ? false : "hidden"} animate="visible">
          {/* Header */}
          <motion.div variants={staggerItem} className="glass-card p-6 text-center">
            <h2 className="text-xl font-display font-bold mb-1">{formatDate(result.date)}</h2>
            <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>{city} &bull; {lat.toFixed(2)}°N, {lng.toFixed(2)}°E</p>
          </motion.div>

          {/* Main grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { label: "Tithi", value: result.tithi.tithi_name, sub: `Day ${result.tithi.tithi_number} • ${result.tithi.paksha}` },
              { label: "Nakshatra", value: result.nakshatra.nakshatra_name, sub: `Pada ${result.nakshatra.pada}` },
              { label: "Yoga", value: result.yoga.yoga_name, sub: "" },
              { label: "Karana", value: result.karana.karana_name, sub: "" },
            ].map((item) => (
              <motion.div key={item.label} variants={staggerItem} className="glass-card p-5">
                <div className="text-[10px] uppercase tracking-wider mb-2 font-medium" style={{ color: "var(--champagne)" }}>{item.label}</div>
                <div className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>{item.value}</div>
                {item.sub && <div className="text-sm mt-1" style={{ color: "var(--text-tertiary)" }}>{item.sub}</div>}
              </motion.div>
            ))}
          </div>

          {/* Var */}
          <motion.div variants={staggerItem} className="glass-card p-5 text-center">
            <div className="text-xs uppercase tracking-wider mb-1" style={{ color: "var(--text-tertiary)" }}>Vara (Day)</div>
            <div className="font-bold" style={{ color: "var(--champagne)" }}>{result.vara.vara_name} — Lord: {result.vara.vara_lord}</div>
          </motion.div>

          {/* Rahu Kaal */}
          <motion.div variants={staggerItem} className="glass-card p-6">
            <h3 className="font-semibold mb-4 text-sm" style={{ color: "var(--champagne)" }}>Rahu Kaal & Gulika Kaal</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-xl p-4 text-center" style={{ background: "rgba(232, 93, 93, 0.06)", border: "1px solid rgba(232, 93, 93, 0.12)" }}>
                <div className="text-[10px] uppercase tracking-wider mb-1" style={{ color: "var(--danger)" }}>Rahu Kaal</div>
                <div className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>{result.rahu_kaal.start} — {result.rahu_kaal.end}</div>
              </div>
              <div className="rounded-xl p-4 text-center" style={{ background: "rgba(214, 184, 117, 0.06)", border: "1px solid rgba(214, 184, 117, 0.12)" }}>
                <div className="text-[10px] uppercase tracking-wider mb-1" style={{ color: "var(--champagne)" }}>Gulika Kaal</div>
                <div className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>{result.gulika_kaal.start} — {result.gulika_kaal.end}</div>
              </div>
            </div>
          </motion.div>

          {/* Sun times */}
          <motion.div variants={staggerItem} className="glass-card p-6">
            <h3 className="font-semibold mb-4 text-sm" style={{ color: "var(--champagne)" }}>Sunrise & Sunset</h3>
            <div className="flex justify-center gap-8">
              <div className="text-center">
                <div className="text-2xl mb-1">☀</div>
                <div className="text-xs" style={{ color: "var(--text-tertiary)" }}>Sunrise</div>
                <div className="font-bold" style={{ color: "var(--text-primary)" }}>{result.sunrise}</div>
              </div>
              <div className="text-center">
                <div className="text-2xl mb-1">☾</div>
                <div className="text-xs" style={{ color: "var(--text-tertiary)" }}>Sunset</div>
                <div className="font-bold" style={{ color: "var(--text-primary)" }}>{result.sunset}</div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}
