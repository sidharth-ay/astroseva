"use client";

import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Calendar, Clock, MapPin, User, Send } from "lucide-react";
import CitySearch from "@/components/CitySearch";
import { api, type BirthData, type CityEntry, locationFromCity } from "@/lib/api";
import {
  useReducedMotion,
  staggerContainer,
  staggerItem} from "@/lib/motion";

export default function PalmistryPage() {
  const [form, setForm] = useState<BirthData>({
    name: "", birth_date: "1990-05-15", birth_time: "10:30",
    birth_place: "New Delhi", latitude: 28.6139, longitude: 77.209, timezone_offset: 5.5,
  });
  const [question, setQuestion] = useState("");
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const reduced = useReducedMotion();

  useEffect(() => {
    document.title = "Palmistry | AstroSeva";
  }, []);

  const handleCity = (city: CityEntry) => {
    setForm({ ...form, ...locationFromCity(city) });
  };

  const getReading = async () => {
    if (!question.trim()) { setError("Please enter your question."); return; }
    setLoading(true); setError("");
    try {
      const prompt = `You are an expert palmist. Based on the following context, provide a detailed palmistry reading.\n\nBirth Details: ${form.name || "Unknown"}, ${form.birth_date}, ${form.birth_time}, ${form.birth_place}\n\nQuestion: ${question}\n\nProvide insights about the person's palm lines, mounts, and what they indicate about personality, career, relationships, and life path. Be detailed and insightful.`;
      const res = await api.chatSend(prompt, [], "en", {
        name: form.name,
        birth_date: form.birth_date,
        birth_time: form.birth_time,
        birth_place: form.birth_place,
      });
      setResponse(res.response);
    } catch (e) { setError(e instanceof Error ? e.message : "Failed to get reading."); }
    finally { setLoading(false); }
  };

  return (
    <div className="max-w-3xl mx-auto px-5 py-10">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <h1 className="heading-display text-2xl md:text-3xl mb-1">
          <span className="text-gradient-gold">Palmistry</span>
        </h1>
        <p className="text-sm mb-8" style={{ color: "var(--text-secondary)" }}>
          Discover what your palm lines reveal about your destiny
        </p>
      </motion.div>

      <motion.div className="glass-card p-5 mb-8" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
        <p className="text-xs leading-relaxed mb-4" style={{ color: "var(--text-secondary)" }}>
          Palmistry, also known as chiromancy, is the art of reading the lines, mounts, and features of the hand to gain insights into a person&apos;s character, potential, and life path. Each line on your palm tells a unique story about your personality, relationships, and destiny.
        </p>
      </motion.div>

      {/* Birth Data Form */}
      <motion.div className="glass-card p-5 mb-6" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <h3 className="text-xs font-semibold mb-3 uppercase tracking-wider" style={{ color: "#C8956D" }}>Your Details (for context)</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="input-label" htmlFor="pm-name"><User size={11} className="inline mr-1" />Name</label>
            <input id="pm-name" className="input-field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Enter name" />
          </div>
          <div>
            <label className="input-label" htmlFor="pm-date"><Calendar size={11} className="inline mr-1" />Birth Date</label>
            <input id="pm-date" type="date" className="input-field" value={form.birth_date} onChange={(e) => setForm({ ...form, birth_date: e.target.value })} style={{ colorScheme: "dark" }} />
          </div>
          <div>
            <label className="input-label" htmlFor="pm-time"><Clock size={11} className="inline mr-1" />Birth Time</label>
            <input id="pm-time" type="time" className="input-field" value={form.birth_time} onChange={(e) => setForm({ ...form, birth_time: e.target.value })} style={{ colorScheme: "dark" }} />
          </div>
          <div>
            <label className="input-label" htmlFor="pm-city"><MapPin size={11} className="inline mr-1" />Birth City</label>
            <CitySearch value={form.birth_place} onChange={handleCity} />
          </div>
        </div>
      </motion.div>

      {/* Question */}
      <motion.div className="glass-card p-5 mb-6" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14 }}>
        <h3 className="text-xs font-semibold mb-3 uppercase tracking-wider" style={{ color: "#C8956D" }}>Your Question</h3>
        <textarea
          className="input-field min-h-[80px] resize-y"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="What would you like to know about your palm?"
          rows={3}
        />
        {error && <p className="text-xs mt-3" style={{ color: "var(--danger)" }}>{error}</p>}
        <button className="btn-primary mt-4" onClick={getReading} disabled={loading}>
          {loading ? "Reading..." : "Get Reading"} <Send size={14} />
        </button>
      </motion.div>

      {/* Loading */}
      {loading && (
        <div className="glass-card p-5 animate-pulse">
          <div className="h-4 rounded mb-3" style={{ background: "var(--border-subtle)", width: "40%" }} />
          <div className="space-y-2">
            <div className="h-3 rounded" style={{ background: "var(--border-subtle)" }} />
            <div className="h-3 rounded" style={{ background: "var(--border-subtle)", width: "90%" }} />
            <div className="h-3 rounded" style={{ background: "var(--border-subtle)", width: "75%" }} />
          </div>
        </div>
      )}

      {/* Response */}
      {response && !loading && (
        <motion.div
          variants={staggerContainer}
          initial={reduced ? false : "hidden"}
          animate="visible"
          className="space-y-4"
        >
          <motion.div className="glass-card p-5" variants={staggerItem}>
            <h3 className="text-xs font-semibold mb-3 uppercase tracking-wider" style={{ color: "#C8956D" }}>Palmistry Reading</h3>
            <div className="prose prose-sm max-w-none">
              {response.split("\n").map((para, i) => (
                para.trim() ? (
                  <p key={i} className="text-xs leading-relaxed mb-3" style={{ color: "var(--text-secondary)" }}>
                    {para}
                  </p>
                ) : null
              ))}
            </div>
          </motion.div>
          <motion.p className="text-[10px] text-center" style={{ color: "var(--text-tertiary)" }} variants={staggerItem}>
            This is an AI-powered palmistry consultation. For detailed analysis, consult a professional palmist.
          </motion.p>
        </motion.div>
      )}
    </div>
  );
}
