"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "motion/react";
import { Calendar, Clock, MapPin, User, ChevronRight, FileText } from "lucide-react";
import CitySearch from "@/components/CitySearch";
import { api, type BirthData, type CityEntry, locationFromCity } from "@/lib/api";
import {
  useReducedMotion,
  staggerContainer,
  staggerItem,
} from "@/lib/motion";

const REPORT_TYPES = [
  { id: "career", label: "Career", icon: "💼" },
  { id: "finance", label: "Finance", icon: "💰" },
  { id: "health", label: "Health", icon: "🏥" },
  { id: "marriage", label: "Marriage", icon: "💍" },
  { id: "love", label: "Love", icon: "❤️" },
  { id: "education", label: "Education", icon: "📚" },
  { id: "brihat_kundli", label: "Brihat Kundli", icon: "📖" },
] as const;

type ReportType = (typeof REPORT_TYPES)[number]["id"];

interface ReportResponse {
  report_type: string;
  content: string;
  sections?: { title: string; content: string }[];
  house_analysis?: Record<string, string>;
  ai_model: string;
}

export default function ReportsPage() {
  const [form, setForm] = useState<BirthData>({
    name: "", birth_date: "1990-05-15", birth_time: "10:30",
    birth_place: "New Delhi", latitude: 28.6139, longitude: 77.209, timezone_offset: 5.5,
  });
  const [reportType, setReportType] = useState<ReportType>("career");
  const [result, setResult] = useState<ReportResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const reduced = useReducedMotion();
  const seqRef = useRef(0);
  const firstRender = useRef(true);

  useEffect(() => {
    document.title = "Reports | AstroSeva";
  }, []);

  const handleCity = (city: CityEntry) => {
    setForm({ ...form, ...locationFromCity(city) });
  };

  const generate = async (forcedType?: ReportType) => {
    const activeType = forcedType || reportType;
    if (!form.name.trim()) { setError("Please enter your name."); return; }
    const seq = ++seqRef.current;
    setLoading(true); setError(""); setResult(null);
    try {
      const res = await api.generateReport(form, activeType);
      if (seq !== seqRef.current) return;
      setResult(res);
    } catch (e) {
      if (seq !== seqRef.current) return;
      setResult(null);
      setError(e instanceof Error ? e.message : "Failed to generate report.");
    }
    finally {
      if (seq === seqRef.current) setLoading(false);
    }
  };

  // Auto-regenerate when the report type changes (like horoscope tabs),
  // but only after the user has already generated once (name entered).
  // Skipped on first mount so the page doesn't fetch with an empty name.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    if (!form.name.trim()) return;
    generate(reportType);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportType]);

  return (
    <div className="max-w-5xl mx-auto px-5 py-10">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <h1 className="heading-display text-2xl md:text-3xl mb-1">
          Personalized <span className="text-gradient-gold">Reports</span>
        </h1>
        <p className="text-sm mb-8" style={{ color: "var(--text-secondary)" }}>
          Get detailed astrological reports based on your birth chart
        </p>
      </motion.div>

      {/* Form */}
      <motion.div className="glass-card p-5 mb-6" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="input-label" htmlFor="rpt-name"><User size={11} className="inline mr-1" />Name</label>
            <input id="rpt-name" className="input-field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Enter name" />
          </div>
          <div>
            <label className="input-label" htmlFor="rpt-date"><Calendar size={11} className="inline mr-1" />Birth Date</label>
            <input id="rpt-date" type="date" className="input-field" value={form.birth_date} onChange={(e) => setForm({ ...form, birth_date: e.target.value })} style={{ colorScheme: "dark" }} />
          </div>
          <div>
            <label className="input-label" htmlFor="rpt-time"><Clock size={11} className="inline mr-1" />Birth Time</label>
            <input id="rpt-time" type="time" className="input-field" value={form.birth_time} onChange={(e) => setForm({ ...form, birth_time: e.target.value })} style={{ colorScheme: "dark" }} />
          </div>
          <div>
            <label className="input-label" htmlFor="rpt-city"><MapPin size={11} className="inline mr-1" />Birth City</label>
            <CitySearch value={form.birth_place} onChange={handleCity} />
          </div>
        </div>
      </motion.div>

      {/* Report Type Selector */}
      <motion.div className="glass-card p-4 mb-6" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}>
        <h3 className="text-xs font-semibold mb-3 uppercase tracking-wider" style={{ color: "#C8956D" }}>Report Type</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
          {REPORT_TYPES.map((rt) => (
            <button
              key={rt.id}
              disabled={loading}
              className="p-3 rounded-lg text-center transition-all"
              style={{
                background: reportType === rt.id ? "rgba(200, 149, 109, 0.12)" : "var(--bg-surface)",
                border: `1px solid ${reportType === rt.id ? "#C8956D" : "var(--border-subtle)"}`,
                opacity: loading ? 0.6 : 1,
              }}
              onClick={() => setReportType(rt.id)}
            >
              <div className="text-lg mb-1">{rt.icon}</div>
              <div className="text-xs font-medium" style={{ color: reportType === rt.id ? "#C8956D" : "var(--text-secondary)" }}>{rt.label}</div>
            </button>
          ))}
        </div>
        {error && <p className="text-xs mt-3" style={{ color: "var(--danger)" }}>{error}</p>}
        <button className="btn-primary mt-4" onClick={() => generate()} disabled={loading}>
          {loading ? "Generating Report..." : "Generate Report"} <ChevronRight size={15} />
        </button>
      </motion.div>

      {/* Loading Shimmer */}
      {loading && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass-card p-4 animate-pulse">
              <div className="h-4 rounded mb-3" style={{ background: "var(--border-subtle)", width: "30%" }} />
              <div className="space-y-2">
                <div className="h-3 rounded" style={{ background: "var(--border-subtle)", width: "100%" }} />
                <div className="h-3 rounded" style={{ background: "var(--border-subtle)", width: "85%" }} />
                <div className="h-3 rounded" style={{ background: "var(--border-subtle)", width: "70%" }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Results */}
      {result && !loading && (
        <motion.div
          variants={staggerContainer}
          initial={reduced ? false : "hidden"}
          animate="visible"
          className="space-y-6"
        >
          {/* Report Header */}
          <motion.div className="glass-card p-4" variants={staggerItem}>
            <div className="flex items-center gap-2 mb-2">
              <FileText size={16} style={{ color: "#C8956D" }} />
              <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#C8956D" }}>
                {(REPORT_TYPES.find((r) => r.id === result.report_type)?.label || result.report_type)} Report
              </h3>
            </div>
            <div className="text-[10px] uppercase tracking-wider mb-1" style={{ color: "var(--text-tertiary)" }}>
              Generated by {result.ai_model}
            </div>
          </motion.div>

          {/* Brihat Kundli: Sections + House Analysis */}
          {result.report_type === "brihat_kundli" && result.sections && (
            <>
              {result.sections.map((section, i) => (
                <motion.div key={i} className="glass-card p-4" variants={staggerItem}>
                  <h4 className="text-sm font-semibold mb-2" style={{ color: "#C8956D" }}>{section.title || (section as { section?: string }).section || `Section ${i + 1}`}</h4>
                  <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>{typeof section.content === "string" ? section.content : JSON.stringify(section.content)}</p>
                </motion.div>
              ))}
              {result.house_analysis && (
                <motion.div className="glass-card p-4" variants={staggerItem}>
                  <h4 className="text-sm font-semibold mb-3" style={{ color: "#C8956D" }}>House Analysis</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    {Object.entries(result.house_analysis).map(([house, analysis]) => (
                      <div key={house} className="p-3 rounded-lg" style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)" }}>
                        <div className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: "#C8956D" }}>{house}</div>
                        <p className="text-xs" style={{ color: "var(--text-secondary)" }}>{typeof analysis === "string" ? analysis : JSON.stringify(analysis)}</p>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </>
          )}

          {/* Other report types: plain content */}
          {result.report_type !== "brihat_kundli" && (
            <motion.div className="glass-card p-5" variants={staggerItem}>
              <div className="prose prose-sm max-w-none">
                {(typeof result.content === "string" ? result.content : "").split("\n").map((para, i) => (
                  para.trim() ? (
                    <p key={i} className="text-xs leading-relaxed mb-3" style={{ color: "var(--text-secondary)" }}>
                      {para}
                    </p>
                  ) : null
                ))}
              </div>
            </motion.div>
          )}
        </motion.div>
      )}
    </div>
  );
}
