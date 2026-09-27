"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "motion/react";
import { AlertTriangle, CheckCircle, User, Calendar, Clock, MapPin } from "lucide-react";
import CitySearch from "@/components/CitySearch";
import { api, type BirthData, type CityEntry, type DoshaResponse } from "@/lib/api";
import {
  useReducedMotion,
  staggerContainerCustom,
  staggerItem,
  slideUp,
  stagger,
} from "@/lib/motion";

function ordinalSuffix(n: number): string {
  if (n === 1) return "st";
  if (n === 2) return "nd";
  if (n === 3) return "rd";
  return "th";
}

export default function DoshasPage() {
  const [form, setForm] = useState<BirthData>({
    name: "",
    birth_date: "1990-01-15",
    birth_time: "10:30",
    birth_place: "New Delhi",
    latitude: 28.6139,
    longitude: 77.209,
    timezone_offset: 5.5,
  });
  const [result, setResult] = useState<DoshaResponse | null>(null);
  const [remedies, setRemedies] = useState<string>("");
  const [remedyError, setRemedyError] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const reduced = useReducedMotion();
  const abortRef = useRef<AbortController | null>(null);
  const seqRef = useRef(0);

  useEffect(() => {
    document.title = "Dosha Analysis | AstroSeva";
  }, []);

  const update = (patch: Partial<BirthData>) => setForm((p) => ({ ...p, ...patch }));
  const handleCity = (c: CityEntry) =>
    update({ birth_place: c.name, latitude: c.lat, longitude: c.lng, timezone_offset: c.tz });

  const analyze = async () => {
    if (!form.name.trim()) {
      setError("Please enter your name.");
      setResult(null);
      return;
    }
    if (!form.birth_date || !form.birth_time) {
      setError("Please enter a valid birth date and time.");
      setResult(null);
      return;
    }
    if (!form.birth_place.trim()) {
      setError("Please select your birth city from the suggestions.");
      setResult(null);
      return;
    }
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const seq = ++seqRef.current;
    setLoading(true);
    setError("");
    setRemedyError("");
    setRemedies("");
    setResult(null);
    try {
      const res = await api.detectDoshas(form, controller.signal);
      if (seq !== seqRef.current) return;
      setResult(res);
      const total = res.total_doshas ?? 0;
      const mitigated = !res.manglik?.is_manglik && !!res.manglik?.has_placement;
      if (total > 0 || mitigated) {
        try {
          const rem = await api.getDoshaRemedies(form, "en", controller.signal);
          if (seq !== seqRef.current) return;
          const r = rem.remedies;
          setRemedies(
            typeof r === "string" ? r : typeof r === "object" && r !== null && "content" in (r as object)
              ? String((r as { content: unknown }).content)
              : JSON.stringify(r, null, 2)
          );
        } catch (e) {
          if (seq !== seqRef.current) return;
          if (e instanceof DOMException && e.name === "AbortError") return;
          setRemedies("");
          setRemedyError(e instanceof Error ? e.message : "Failed to load remedies.");
        }
      }
    } catch (e) {
      if (seq !== seqRef.current) return;
      if (e instanceof DOMException && e.name === "AbortError") return;
      setResult(null);
      setError(e instanceof Error ? e.message : "Failed to detect doshas.");
    } finally {
      if (seq === seqRef.current) setLoading(false);
    }
  };

  const clearAll = () => {
    abortRef.current?.abort();
    seqRef.current += 1;
    setResult(null);
    setRemedies("");
    setRemedyError("");
    setError("");
  };

  const totalDoshas = result?.total_doshas ?? 0;
  const manglikMitigated =
    !result?.manglik?.is_manglik && !!result?.manglik?.has_placement;
  const needsRemedies = totalDoshas > 0 || manglikMitigated;

  const cards = result
    ? [
        {
          title: "Manglik Dosha",
          active: result.manglik?.is_manglik,
          mitigated: manglikMitigated,
          badge: result.manglik?.is_manglik
            ? (result.manglik?.severity || "Present")
            : manglikMitigated
              ? "Mitigated"
              : "Absent",
          description:
            result.manglik?.description ||
            "Caused by Mars in houses 1, 2, 4, 7, 8, or 12. Affects marriage timing and harmony.",
          extra: manglikMitigated
            ? [
                result.manglik?.cancellation_reason || "",
                (result.manglik?.positions || [])
                  .map((p: { house?: number; chart?: string }) =>
                    p.house ? `Mars in ${p.house}${ordinalSuffix(p.house)} house${p.chart ? ` (${p.chart} chart)` : ""}` : ""
                  )
                  .filter(Boolean)
                  .join(" · "),
              ]
              .filter(Boolean)
              .join(" — ")
            : "",
        },
        {
          title: "Sade Sati",
          active: result.sade_sati?.is_active,
          badge: result.sade_sati?.is_active
            ? (result.sade_sati?.phase || "Active")
            : "Inactive",
          description:
            result.sade_sati?.description ||
            "Saturn's 7.5-year transit over and around your Moon sign. A period of testing and growth.",
        },
        {
          title: "Pitru Dosha",
          active: result.pitru_dosha?.has_dosha,
          badge: result.pitru_dosha?.has_dosha ? "Present" : "Absent",
          description:
            result.pitru_dosha?.description ||
            "Ancestral affliction indicated by Sun-Rahu or specific 9th-house combinations.",
          conditions: result.pitru_dosha?.conditions || [],
        },
      ]
    : [];

  return (
    <div className="max-w-5xl mx-auto px-5 py-10">
      <motion.div
        className="text-center mb-8"
        variants={slideUp}
        initial={reduced ? false : "hidden"}
        animate="visible"
      >
        <p className="heading-section mb-3">DOSHA ANALYSIS</p>
        <h1
          className="heading-display font-bold mb-4"
          style={{ fontSize: "clamp(1.8rem, 4vw, 2.6rem)" }}
        >
          CHECK YOUR <span className="text-gradient-gold">DOSHAS</span>
        </h1>
        <p className="max-w-lg mx-auto" style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}>
          Detect Manglik, Sade Sati, and Pitru Dosha from your birth chart with remedies.
        </p>
      </motion.div>

      {/* Form */}
      <div className="glass-card p-5 mb-8">
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="input-label" htmlFor="dosha-name">
              <User size={12} className="inline mr-1" /> Name
            </label>
            <input
              id="dosha-name"
              className="input-field"
              value={form.name}
              onChange={(e) => update({ name: e.target.value })}
              placeholder="Your name"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="input-label" htmlFor="dosha-date">
                <Calendar size={12} className="inline mr-1" /> Date
              </label>
              <input
                id="dosha-date"
                type="date"
                className="input-field"
                value={form.birth_date}
                onChange={(e) => update({ birth_date: e.target.value })}
              />
            </div>
            <div>
              <label className="input-label" htmlFor="dosha-time">
                <Clock size={12} className="inline mr-1" /> Time
              </label>
              <input
                id="dosha-time"
                type="time"
                className="input-field"
                value={form.birth_time}
                onChange={(e) => update({ birth_time: e.target.value })}
              />
            </div>
          </div>
        </div>
        <div className="mt-4">
          <label className="input-label" htmlFor="dosha-city">
            <MapPin size={12} className="inline mr-1" /> Birth Place
          </label>
          <CitySearch value={form.birth_place} onChange={handleCity} />
        </div>
        <div className="mt-5 flex gap-3">
          <button onClick={analyze} disabled={loading} className="btn-primary">
            {loading ? "Analyzing…" : "Detect Doshas"}
          </button>
          <button
            onClick={clearAll}
            className="btn-ghost"
          >
            Clear
          </button>
        </div>
      </div>

      {error && (
        <div className="glass-card p-4 mb-6 text-center text-sm" style={{ color: "var(--danger)" }}>
          {error}
        </div>
      )}

      {/* Results */}
      {result && !loading && (
        <motion.div
          variants={staggerContainerCustom(stagger.normal, 0.08)}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-30px" }}
        >
          <div
            className="glass-card p-5 mb-5 text-center"
            style={{
              borderColor: totalDoshas > 0 || manglikMitigated ? "rgba(229,93,93,0.35)" : "rgba(93,200,143,0.35)",
            }}
          >
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              {totalDoshas > 0 ? (
                <>
                  <AlertTriangle size={15} className="inline mr-1" style={{ color: "var(--danger)" }} />
                  <strong style={{ color: "var(--text-primary)" }}>{totalDoshas}</strong> dosha
                  {totalDoshas > 1 ? "s" : ""} detected in your chart
                  {manglikMitigated && " (plus one mitigated placement below)"}
                </>
              ) : manglikMitigated ? (
                <>
                  <AlertTriangle size={15} className="inline mr-1" style={{ color: "var(--champagne)" }} />
                  No active doshas — but a <strong style={{ color: "var(--text-primary)" }}>mitigated Manglik placement</strong> was
                  found and is shown below with its remedy note
                </>
              ) : (
                <>
                  <CheckCircle size={15} className="inline mr-1" style={{ color: "var(--success)" }} />
                  No major doshas detected — your chart is clear
                </>
              )}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
            {cards.map((c) => (
              <motion.div key={c.title} className="glass-card p-5" variants={staggerItem}>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>
                    {c.title}
                  </h3>
                  <span
                    className="text-[11px] px-2 py-0.5 rounded-full font-medium"
                    style={
                      c.active
                        ? { background: "rgba(229,93,93,0.12)", color: "var(--danger)" }
                        : "mitigated" in c && (c as { mitigated?: boolean }).mitigated
                          ? { background: "rgba(232,184,138,0.12)", color: "var(--champagne)" }
                          : { background: "rgba(93,200,143,0.12)", color: "var(--success)" }
                    }
                  >
                    {c.badge}
                  </span>
                </div>
                <p className="text-sm" style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}>
                  {c.description}
                </p>
                {"extra" in c && typeof (c as { extra?: string }).extra === "string" && (c as { extra: string }).extra && (
                  <p className="text-xs mt-2" style={{ color: "var(--champagne)", lineHeight: 1.7 }}>
                    {(c as { extra: string }).extra}
                  </p>
                )}
                {"conditions" in c && Array.isArray((c as { conditions?: string[] }).conditions) &&
                  (c as { conditions: string[] }).conditions.length > 0 && (
                    <ul className="mt-2 space-y-1">
                      {(c as { conditions: string[] }).conditions.map((cond, i) => (
                        <li key={i} className="text-xs flex items-start gap-1.5" style={{ color: "var(--text-secondary)" }}>
                          <span style={{ color: "#C8956D" }}>·</span>
                          {cond}
                        </li>
                      ))}
                    </ul>
                  )}
              </motion.div>
            ))}
          </div>

          {remedyError && (
            <div className="glass-card p-4 mb-5 text-center">
              <p className="text-xs mb-2" style={{ color: "var(--champagne)" }}>
                Doshas detected, but remedies failed to load: {remedyError}
              </p>
              <button onClick={analyze} disabled={loading} className="btn-ghost text-xs">
                Retry Remedies
              </button>
            </div>
          )}

          {remedies && (
            <div className="glass-card p-5">
              <h3 className="text-base font-semibold mb-3" style={{ color: "var(--text-primary)" }}>
                Recommended Remedies
              </h3>
              <div className="text-sm whitespace-pre-line" style={{ color: "var(--text-secondary)", lineHeight: 1.8 }}>
                {remedies}
              </div>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
