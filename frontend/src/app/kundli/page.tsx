"use client";

import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Calendar, Clock, MapPin, User, Download, ChevronRight, Share2 } from "lucide-react";
import { useRouter } from "next/navigation";
import CitySearch from "@/components/CitySearch";
import KundliChart from "@/components/KundliChart";

import { api, getToken, clearSession, type KundliResponse, type BirthData, type CityEntry } from "@/lib/api";
import {
  useReducedMotion,
  staggerContainer,
  staggerItem,
  slideUp,
  fadeIn,
  duration,
  ease,
} from "@/lib/motion";

const SIGN_NAMES = ["Aries","Taurus","Gemini","Cancer","Leo","Virgo","Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces"];

function fmtHour(h: unknown): string {
  if (typeof h !== "number" || isNaN(h)) return "—";
  const hh = Math.floor(h);
  const mm = Math.round((h - hh) * 60);
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

export default function KundliPage() {
  const [form, setForm] = useState<BirthData>({
    name: "", birth_date: "1990-05-15", birth_time: "10:30",
    birth_place: "New Delhi", latitude: 28.6139, longitude: 77.209, timezone_offset: 5.5,
  });
  const [result, setResult] = useState<KundliResponse | null>(null);
  const [chartStyle, setChartStyle] = useState<"north" | "south">("north");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const reduced = useReducedMotion();

  useEffect(() => {
    document.title = "Kundli Generator | AstroSeva";
  }, []);

  const handleCity = (city: CityEntry) => {
    setForm({ ...form, birth_place: city.name, latitude: city.lat, longitude: city.lng, timezone_offset: city.tz });
  };

  const generate = async () => {
    if (!form.name.trim()) { setError("Please enter your name."); return; }
    setLoading(true); setError("");
    try { setResult(await api.generateKundli(form)); }
    catch (e) { setError(e instanceof Error ? e.message : "Failed to generate kundli."); }
    finally { setLoading(false); }
  };

  const loadSample = async () => {
    setLoading(true); setError("");
    try { setResult(await api.getSampleKundli()); }
    catch (e) { setError(e instanceof Error ? e.message : "Failed to load sample."); }
    finally { setLoading(false); }
  };

  const exportPdf = async () => {
    try {
      const blob = await api.exportKundliPdf(form);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = `kundli-${form.name || "chart"}.pdf`; a.click();
      URL.revokeObjectURL(url);
    } catch { /* ignore */ }
  };

  const shareImage = () => {
    try {
      const svg = document.querySelector("#kundli-chart-svg, #kundli-chart-svg-south");
      if (!(svg instanceof SVGSVGElement)) {
        setError("Chart image not ready yet.");
        return;
      }
      const xml = new XMLSerializer().serializeToString(svg);
      const img = new Image();
      const svgBlob = new Blob([xml], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(svgBlob);
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = 800;
        canvas.height = 800;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.fillStyle = "#060610";
        ctx.fillRect(0, 0, 800, 800);
        ctx.drawImage(img, 0, 0, 800, 800);
        URL.revokeObjectURL(url);
        canvas.toBlob((blob) => {
          if (!blob) return;
          const a = document.createElement("a");
          a.href = URL.createObjectURL(blob);
          a.download = `kundli-${form.name || "chart"}.png`;
          a.click();
        }, "image/png");
      };
      img.src = url;
      setSavedMsg("Chart image downloaded. Share it anywhere.");
    } catch {
      setError("Could not render chart image.");
    }
  };

  const [savedMsg, setSavedMsg] = useState("");
  const router = useRouter();
  const saveChart = async () => {
    if (!result) return;
    setSavedMsg("");
    try {
      if (!getToken()) {
        router.replace("/login?next=/kundli");
        return;
      }
      const res = await api.saveChart({
        name: form.name || result.name,
        birth_date: form.birth_date,
        birth_time: form.birth_time,
        birth_place: form.birth_place,
        latitude: form.latitude,
        longitude: form.longitude,
        timezone_offset: form.timezone_offset,
        chart_data: result as unknown as Record<string, unknown>,
      });
      setSavedMsg(`Saved (id ${res.chart_id}). View it in Saved Charts.`);
    } catch (e) {
      const status = (e as { status?: number })?.status;
      if (status === 401 || status === 403) {
        clearSession();
        router.replace("/login?next=/kundli");
        return;
      }
      setError(e instanceof Error ? e.message : "Failed to save chart.");
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-5 py-10">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <h1 className="heading-display text-2xl md:text-3xl mb-1">
          Kundli <span className="text-gradient-gold">Generator</span>
        </h1>
        <p className="text-sm mb-8" style={{ color: "var(--text-secondary)" }}>Enter birth details to generate your Vedic birth chart</p>
      </motion.div>

      {/* Form */}
      <motion.div className="glass-card p-5 mb-8" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="input-label" htmlFor="kundli-name"><User size={11} className="inline mr-1" />Name</label>
            <input id="kundli-name" className="input-field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Enter name" />
          </div>
          <div>
            <label className="input-label" htmlFor="kundli-date"><Calendar size={11} className="inline mr-1" />Birth Date</label>
            <input id="kundli-date" type="date" className="input-field" value={form.birth_date} onChange={(e) => setForm({ ...form, birth_date: e.target.value })} style={{ colorScheme: "dark" }} />
          </div>
          <div>
            <label className="input-label" htmlFor="kundli-time"><Clock size={11} className="inline mr-1" />Birth Time</label>
            <input id="kundli-time" type="time" className="input-field" value={form.birth_time} onChange={(e) => setForm({ ...form, birth_time: e.target.value })} style={{ colorScheme: "dark" }} />
          </div>
          <div>
            <label className="input-label" htmlFor="kundli-city"><MapPin size={11} className="inline mr-1" />Birth City</label>
            <CitySearch value={form.birth_place} onChange={handleCity} />
          </div>
        </div>
        {error && <p className="text-xs mt-3" style={{ color: "var(--danger)" }}>{error}</p>}
        <div className="flex flex-wrap gap-2 mt-4">
          <button className="btn-primary" onClick={generate} disabled={loading}>
            {loading ? "Generating..." : "Generate Kundli"} <ChevronRight size={15} />
          </button>
          <button className="btn-ghost" onClick={loadSample} disabled={loading}>
            Load Sample
          </button>
          {result && (
            <button className="btn-ghost" onClick={exportPdf}>
              <Download size={13} /> Export PDF
            </button>
          )}
          {result && (
            <button className="btn-ghost" onClick={saveChart}>
              Save to Profile
            </button>
          )}
          {result && (
            <button className="btn-ghost" onClick={shareImage}>
              <Share2 size={13} /> Share Image
            </button>
          )}
        </div>
        {savedMsg && <p className="text-xs mt-3" style={{ color: "var(--success)" }}>{savedMsg}</p>}
      </motion.div>

      {/* Results */}
      {result && (
        <motion.div
          variants={staggerContainer}
          initial={reduced ? false : "hidden"}
          animate="visible"
          className="space-y-6"
        >
          {/* Birth Details */}
          <motion.div className="glass-card p-4" variants={staggerItem}>
            <h3 className="text-xs font-semibold mb-3 uppercase tracking-wider" style={{ color: "#C8956D" }}>Birth Details</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              {[
                ["Name", result.name || "—"],
                ["Date", result.birth_date],
                ["Time", result.birth_time],
                ["Place", result.birth_place],
                ["Ascendant", `${SIGN_NAMES[result.asc_sign]} ${result.asc_sign_degree.toFixed(1)}°`],
                ["Ayanamsa", `${result.ayanamsa.toFixed(2)}°`],
              ].map(([label, val]) => (
                <div key={label}>
                  <div className="text-[10px] uppercase tracking-wider mb-0.5" style={{ color: "var(--text-tertiary)" }}>{label}</div>
                  <div className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>{val}</div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Chart */}
          <motion.div className="glass-card p-5" variants={staggerItem}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#C8956D" }}>
                Birth Chart — {chartStyle === "north" ? "North Indian" : "South Indian"} Style
              </h3>
              <div className="flex gap-1 p-0.5 rounded-lg" style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)" }}>
                {(["north", "south"] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setChartStyle(s)}
                    className="px-2.5 py-1 rounded-md text-[10px] font-medium transition-colors"
                    style={chartStyle === s
                      ? { background: "rgba(200, 149, 109, 0.15)", color: "#C8956D" }
                      : { color: "var(--text-tertiary)" }
                    }
                  >
                    {s === "north" ? "North" : "South"}
                  </button>
                ))}
              </div>
            </div>
            <KundliChart chart={result.chart} ascSign={result.asc_sign} chartStyle={chartStyle} />
          </motion.div>

          {/* Planetary Positions */}
          <motion.div className="glass-card p-4" variants={staggerItem}>
            <h3 className="text-xs font-semibold mb-3 uppercase tracking-wider" style={{ color: "#C8956D" }}>Planetary Positions</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border)" }}>
                    {["Planet", "Sign", "Degree", "Retro", "Dignity"].map((h) => (
                      <th key={h} className="text-left py-2 px-2 font-medium" style={{ color: "var(--text-tertiary)" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.planets.map((p) => (
                    <tr key={p.planet} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                      <td className="py-2 px-2 font-medium" style={{ color: "var(--text-primary)" }}>{p.planet}</td>
                      <td className="py-2 px-2" style={{ color: "var(--text-secondary)" }}>{p.sign_name}</td>
                      <td className="py-2 px-2" style={{ color: "var(--text-secondary)" }}>{p.sign_degree.toFixed(1)}°</td>
                      <td className="py-2 px-2">
                        {p.retrograde && <span className="px-1.5 py-0.5 rounded text-[9px] font-medium" style={{ background: "rgba(200, 149, 109, 0.08)", color: "var(--danger)" }}>R</span>}
                      </td>
                      <td className="py-2 px-2" style={{ color: "var(--text-secondary)" }}>{p.dignity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>

          {/* Dasha */}
          {result.dasha_info?.current_dasha && (
            <motion.div className="glass-card p-4" variants={staggerItem}>
              <h3 className="text-xs font-semibold mb-3 uppercase tracking-wider" style={{ color: "#C8956D" }}>Vimshottari Dasha</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {[
                  { label: "Mahadasha", value: result.dasha_info.current_dasha.mahadasha, period: `${result.dasha_info.current_dasha.mahadasha_start} — ${result.dasha_info.current_dasha.mahadasha_end}` },
                  { label: "Antardasha", value: result.dasha_info.current_dasha.antardasha || "—", period: result.dasha_info.current_dasha.antardasha ? `${result.dasha_info.current_dasha.antardasha_start} — ${result.dasha_info.current_dasha.antardasha_end}` : "" },
                  { label: "Pratyantardasha", value: result.dasha_info.current_dasha.pratyantardasha || "—", period: "" },
                  { label: "Sookshma", value: result.dasha_info.current_dasha.sookshma || "—", period: "" },
                  { label: "Prana", value: result.dasha_info.current_dasha.prana || "—", period: "" },
                ].map((d) => (
                  <div key={d.label} className="p-3 rounded-lg" style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)" }}>
                    <div className="text-[10px] uppercase tracking-wider mb-1" style={{ color: "var(--text-tertiary)" }}>{d.label}</div>
                    <div className="text-sm font-medium" style={{ color: "var(--champagne)" }}>{d.value}</div>
                    {d.period && <div className="text-[10px] mt-1" style={{ color: "var(--text-tertiary)" }}>{d.period}</div>}
                  </div>
                ))}
              </div>
              {(result.dasha_info.current_yogini || result.dasha_info.current_chara) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                  {result.dasha_info.current_yogini && (
                    <div className="p-3 rounded-lg" style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)" }}>
                      <div className="text-[10px] uppercase tracking-wider mb-1" style={{ color: "var(--text-tertiary)" }}>Yogini Dasha</div>
                      <div className="text-sm font-medium" style={{ color: "var(--champagne)" }}>{result.dasha_info.current_yogini.yogini}</div>
                    </div>
                  )}
                  {result.dasha_info.current_chara && (
                    <div className="p-3 rounded-lg" style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)" }}>
                      <div className="text-[10px] uppercase tracking-wider mb-1" style={{ color: "var(--text-tertiary)" }}>Chara Dasha (sign {result.dasha_info.current_chara.sign + 1})</div>
                      <div className="text-sm font-medium" style={{ color: "var(--champagne)" }}>{result.dasha_info.current_chara.lord}</div>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          )}

          {/* Yogas */}
          {(result.dasha_info?.yogas || []).length > 0 && (
            <motion.div className="glass-card p-4" variants={staggerItem}>
              <h3 className="text-xs font-semibold mb-3 uppercase tracking-wider" style={{ color: "#C8956D" }}>
                Yogas ({(result.dasha_info?.yogas || []).length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {(result.dasha_info?.yogas || []).map((y: { name: string; description: string; strength: string }) => (
                  <div key={y.name} className="p-3 rounded-lg" style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)" }}>
                    <div className="text-sm font-medium mb-1" style={{ color: "var(--champagne)" }}>{y.name}</div>
                    <div className="text-xs" style={{ color: "var(--text-secondary)", lineHeight: 1.6 }}>{y.description}</div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Navamsha */}
          {result.dasha_info?.navamsa && (
            <motion.div className="glass-card p-4" variants={staggerItem}>
              <h3 className="text-xs font-semibold mb-3 uppercase tracking-wider" style={{ color: "#C8956D" }}>Navamsha (D9)</h3>
              <div className="flex flex-wrap gap-2">
                {Object.entries(result.dasha_info.navamsa).map(([planet, sign]) => (
                  <span key={planet} className="text-xs px-2 py-1 rounded-lg" style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", color: "var(--text-secondary)" }}>
                    {planet}: {SIGN_NAMES[sign as number]}
                  </span>
                ))}
              </div>
            </motion.div>
          )}

          {/* Avakahada Chakra */}
          {result.extras?.avakahada && (
            <motion.div className="glass-card p-4" variants={staggerItem}>
              <h3 className="text-xs font-semibold mb-3 uppercase tracking-wider" style={{ color: "#C8956D" }}>Avakahada Chakra</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {Object.entries(result.extras.avakahada).map(([k, v]) => (
                  <div key={k}>
                    <div className="text-[10px] uppercase tracking-wider mb-0.5" style={{ color: "var(--text-tertiary)" }}>
                      {k.replace(/_/g, " ")}
                    </div>
                    <div className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>{String(v)}</div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Birth Panchang */}
          {result.extras?.birth_panchang && (
            <motion.div className="glass-card p-4" variants={staggerItem}>
              <h3 className="text-xs font-semibold mb-3 uppercase tracking-wider" style={{ color: "#C8956D" }}>
                Panchang at Birth · Sunrise {fmtHour(result.extras.sunrise)} · Sunset {fmtHour(result.extras.sunset)} · JD {result.extras.julian_day}
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {[
                  ["Tithi", `${result.extras.birth_panchang.tithi} (${result.extras.birth_panchang.paksha})`],
                  ["Nakshatra", `${result.extras.birth_panchang.nakshatra} · Pada ${result.extras.birth_panchang.pada}`],
                  ["Yoga", `${result.extras.birth_panchang.yoga}`],
                  ["Karana", `${result.extras.birth_panchang.karana}`],
                ].map(([label, val]) => (
                  <div key={label}>
                    <div className="text-[10px] uppercase tracking-wider mb-0.5" style={{ color: "var(--text-tertiary)" }}>{label}</div>
                    <div className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>{String(val)}</div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Ishta, Karakas, Avastha */}
          {result.extras && (
            <motion.div className="glass-card p-4" variants={staggerItem}>
              <h3 className="text-xs font-semibold mb-3 uppercase tracking-wider" style={{ color: "#C8956D" }}>Deity, Karakas & States</h3>
              {result.extras.ishta_devata?.deity && (
                <p className="text-xs mb-3" style={{ color: "var(--text-secondary)" }}>
                  Ishta Devata: <strong style={{ color: "var(--champagne)" }}>{result.extras.ishta_devata.deity}</strong>
                  {result.extras.ishta_devata.planet ? ` (Atmakaraka ${result.extras.ishta_devata.planet})` : ""}
                </p>
              )}
              {(result.extras?.chara_karakas || []).length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {(result.extras?.chara_karakas || []).map((k: { role: string; planet: string }) => (
                    <span key={k.role} className="text-xs px-2 py-1 rounded-lg" style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", color: "var(--text-secondary)" }}>
                      {k.role}: {k.planet}
                    </span>
                  ))}
                </div>
              )}
              {result.extras.avastha && (
                <div className="flex flex-wrap gap-2">
                  {Object.entries(result.extras.avastha).map(([planet, state]) => (
                    <span key={planet} className="text-[11px] px-2 py-0.5 rounded-lg" style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", color: "var(--text-tertiary)" }}>
                      {planet} · {String(state).split(" ")[0]}
                    </span>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </motion.div>
      )}


    </div>
  );
}
