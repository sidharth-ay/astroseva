"use client";

import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Mic, User, Calendar, Clock, MapPin } from "lucide-react";
import CitySearch from "@/components/CitySearch";
import { api, type BirthData, type CityEntry, type KundliResponse } from "@/lib/api";
import { useReducedMotion, staggerContainerCustom, staggerItem, slideUp, stagger } from "@/lib/motion";

const MERCURY_VOICE: Record<string, string> = {
  Aries: "Direct, fast, commanding speech. A voice that leads and motivates.",
  Taurus: "Deep, melodious, steady voice. Natural talent for singing and soothing speech.",
  Gemini: "Quick, witty, versatile voice. Excellent for teaching, writing, and debate.",
  Cancer: "Soft, emotional, nurturing tone that comforts listeners.",
  Leo: "Bold, dramatic, expressive delivery. A natural stage presence.",
  Virgo: "Precise, analytical speech. Clear explanations and attention to detail.",
  Libra: "Balanced, diplomatic, charming voice. Skilled at persuasion and harmony.",
  Scorpio: "Intense, magnetic, penetrating words. Few but powerful statements.",
  Sagittarius: "Philosophical, optimistic, expansive speech. Teaching and preaching gifts.",
  Capricorn: "Measured, authoritative, serious tone. Words carry weight and structure.",
  Aquarius: "Original, unconventional expression. A voice for new ideas and reform.",
  Pisces: "Dreamy, poetic, musical quality. Ideal for art, mantra, and healing sounds.",
};

export default function VoicePage() {
  const [form, setForm] = useState<BirthData>({
    name: "", birth_date: "1990-01-15", birth_time: "10:30",
    birth_place: "New Delhi", latitude: 28.6139, longitude: 77.209, timezone_offset: 5.5,
  });
  const [result, setResult] = useState<KundliResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const reduced = useReducedMotion();

  useEffect(() => {
    document.title = "Voice Astrology | AstroSeva";
  }, []);

  const update = (p: Partial<BirthData>) => setForm((f) => ({ ...f, ...p }));
  const handleCity = (c: CityEntry) =>
    update({ birth_place: c.name, latitude: c.lat, longitude: c.lng, timezone_offset: c.tz });

  const analyze = async () => {
    if (!form.name.trim()) {
      setError("Please enter your name.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      setResult(await api.generateKundli(form));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to analyze.");
    } finally {
      setLoading(false);
    }
  };

  const mercury = result?.planets.find((p) => p.planet === "Mercury");
  const secondHouse = result ? result.houses["2"] || [] : [];
  const thirdHouse = result ? result.houses["3"] || [] : [];

  return (
    <div className="max-w-5xl mx-auto px-5 py-10">
      <motion.div variants={slideUp} initial={reduced ? false : "hidden"} animate="visible" className="text-center mb-8">
        <p className="heading-section mb-3">VOICE ASTROLOGY</p>
        <h1 className="heading-display font-bold mb-4" style={{ fontSize: "clamp(1.8rem, 4vw, 2.6rem)" }}>
          YOUR VOICE, <span className="text-gradient-gold">BY THE STARS</span>
        </h1>
        <p className="max-w-lg mx-auto text-sm" style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}>
          Mercury (speech), the 2nd house (voice), and the 3rd house (communication) shape how you sound and persuade.
        </p>
      </motion.div>

      <div className="glass-card p-5 mb-8">
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="input-label" htmlFor="voice-name"><User size={12} className="inline mr-1" />Name</label>
            <input id="voice-name" className="input-field" value={form.name} onChange={(e) => update({ name: e.target.value })} placeholder="Your name" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="input-label" htmlFor="voice-date"><Calendar size={12} className="inline mr-1" />Date</label>
              <input id="voice-date" type="date" className="input-field" value={form.birth_date} onChange={(e) => update({ birth_date: e.target.value })} />
            </div>
            <div>
              <label className="input-label" htmlFor="voice-time"><Clock size={12} className="inline mr-1" />Time</label>
              <input id="voice-time" type="time" className="input-field" value={form.birth_time} onChange={(e) => update({ birth_time: e.target.value })} />
            </div>
          </div>
        </div>
        <div className="mt-4">
          <label className="input-label" htmlFor="voice-city"><MapPin size={12} className="inline mr-1" />Birth Place</label>
          <CitySearch value={form.birth_place} onChange={handleCity} />
        </div>
        <button onClick={analyze} disabled={loading} className="btn-primary mt-5">
          <Mic size={14} /> {loading ? "Analyzing…" : "Analyze My Voice"}
        </button>
      </div>

      {error && (
        <div className="glass-card p-4 mb-6 text-center text-sm" style={{ color: "var(--danger)" }}>{error}</div>
      )}

      {result && !mercury && !loading && !error && (
        <div className="glass-card p-6 text-center">
          <p className="text-sm mb-3" style={{ color: "var(--text-secondary)" }}>
            Chart computed, but Mercury's position is unavailable — voice analysis needs it.
          </p>
          <button onClick={analyze} className="btn-primary text-xs px-4 py-2">
            Retry
          </button>
        </div>
      )}

      {result && mercury && !loading && (
        <motion.div
          className="grid grid-cols-1 md:grid-cols-3 gap-4"
          variants={staggerContainerCustom(stagger.normal, 0.08)}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          <motion.div className="glass-card p-5" variants={staggerItem}>
            <h3 className="text-sm font-semibold mb-2" style={{ color: "#C8956D" }}>Mercury in {mercury.sign_name}</h3>
            <p className="text-sm" style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}>
              {MERCURY_VOICE[mercury.sign_name] || "A unique Mercurial expression style."}
            </p>
            {mercury.retrograde && (
              <p className="text-xs mt-2" style={{ color: "var(--champagne)" }}>
                Retrograde Mercury gives a reflective, inward communication style — think before speaking.
              </p>
            )}
          </motion.div>
          <motion.div className="glass-card p-5" variants={staggerItem}>
            <h3 className="text-sm font-semibold mb-2" style={{ color: "#C8956D" }}>2nd House — Voice</h3>
            <p className="text-sm" style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}>
              {secondHouse.length > 0
                ? `Planets in your house of speech: ${secondHouse.join(", ")}. They colour your tone and speech habits.`
                : "No planets in the 2nd house — your voice develops through conscious practice and the 2nd lord's placement."}
            </p>
          </motion.div>
          <motion.div className="glass-card p-5" variants={staggerItem}>
            <h3 className="text-sm font-semibold mb-2" style={{ color: "#C8956D" }}>3rd House — Communication</h3>
            <p className="text-sm" style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}>
              {thirdHouse.length > 0
                ? `Planets here: ${thirdHouse.join(", ")}. They shape courage in expression, writing, and media skills.`
                : "An empty 3rd house means communication style follows the 3rd lord — steady and adaptable."}
            </p>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}
