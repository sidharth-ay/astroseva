"use client";

import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Calendar, Clock, MapPin, User, Download, ChevronRight, Share2 } from "lucide-react";
import { useRouter } from "next/navigation";
import CitySearch from "@/components/CitySearch";
import KundliTabsPanel from "@/components/kundli/KundliTabsPanel";

import { api, downloadBlob, getToken, clearSession, type KundliResponse, type BirthData, type CityEntry } from "@/lib/api";

export default function KundliPage() {
  const [form, setForm] = useState<BirthData>({
    name: "", birth_date: "1990-05-15", birth_time: "10:30",
    birth_place: "New Delhi", latitude: 28.6139, longitude: 77.209, timezone_offset: 5.5,
  });
  const [result, setResult] = useState<KundliResponse | null>(null);
  const [chartStyle, setChartStyle] = useState<"north" | "south">("north");
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");

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
    if (!result) return;
    setExporting(true);
    setError("");
    try {
      const blob = await api.exportKundliPdf(form);
      if (blob.size === 0) throw new Error("The generated PDF was empty.");
      downloadBlob(blob, `kundli-${(form.name || "chart").replace(/\s+/g, "-").toLowerCase()}.pdf`);
      setSavedMsg("Kundli PDF downloaded.");
    } catch (e) {
      setError(
        e instanceof Error
          ? `PDF export failed: ${e.message}`
          : "PDF export failed. Please try again.",
      );
    } finally {
      setExporting(false);
    }
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
            <button className="btn-ghost" onClick={exportPdf} disabled={exporting}>
              <Download size={13} /> {exporting ? "Preparing PDF..." : "Export PDF"}
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

      {result && (
        <KundliTabsPanel
          result={result}
          chartStyle={chartStyle}
          setChartStyle={setChartStyle}
        />
      )}
    </div>
  );
}
