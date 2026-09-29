"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Star,
  MapPin,
  Clock,
  ShieldCheck,
  AlertTriangle,
  RotateCcw,
} from "lucide-react";

import { api, type DirectoryEntry, type SpecialtyOptions } from "@/lib/api";

const ACCENT = "#C8956D";

export default function AstrologersPage() {
  const [rows, setRows] = useState<DirectoryEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [options, setOptions] = useState<SpecialtyOptions>({ specialties: [], languages: [] });

  const [search, setSearch] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [language, setLanguage] = useState("");
  const [minExperience, setMinExperience] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const query = useMemo(
    () => ({
      search: search.trim() || undefined,
      specialty: specialty || undefined,
      language: language || undefined,
      min_experience: minExperience ? Number(minExperience) : undefined,
      limit: 60,
    }),
    [search, specialty, language, minExperience]
  );

  const load = useCallback(async (signal?: AbortSignal) => {
    setError(null);
    try {
      const data = await api.listAstrologers(query, signal);
      setRows(data.astrologers);
      setTotal(data.total);
    } catch (e) {
      if (signal?.aborted) return;
      setError(e instanceof Error ? e.message : "Could not load the directory.");
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    // Filters come from the practitioners who are actually listed, so a stale
    // hard-coded list can never offer a value that returns nothing.
    api
      .getAstrologerFilters()
      .then(setOptions)
      .catch(() => setOptions({ specialties: [], languages: [] }));
  }, []);

  useEffect(() => {
    // Debounced so typing does not fire a request per keystroke. The AbortSignal
    // cancels the superseded request, so a slow earlier response cannot land
    // after a faster later one.
    const controller = new AbortController();
    const t = setTimeout(() => load(controller.signal), search ? 300 : 0);
    return () => {
      clearTimeout(t);
      controller.abort();
    };
  }, [load, search]);

  const reset = () => {
    setSearch("");
    setSpecialty("");
    setLanguage("");
    setMinExperience("");
  };

  const active =
    search || specialty || language || minExperience ? "var(--text-primary)" : "var(--text-tertiary)";

  return (
    <div className="max-w-6xl mx-auto px-5 py-10">
      <header className="mb-8">
        <h1 className="font-display text-3xl sm:text-4xl mb-2" style={{ color: "var(--text-primary)" }}>
          Our Astrologers
        </h1>
        <p className="text-sm max-w-2xl" style={{ color: "var(--text-secondary)" }}>
          Every practitioner listed here has passed our document review, a qualification
          assessment and a mock consultation. Accuracy below is calculated from those
          results, not self-reported.
        </p>
      </header>

      <div
        className="rounded-xl p-4 mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
        style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)" }}
      >
        <input
          className="input-field text-sm"
          placeholder="Search by name or keyword"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search astrologers"
        />
        <select
          className="input-field text-sm"
          value={specialty}
          onChange={(e) => setSpecialty(e.target.value)}
          aria-label="Filter by speciality"
        >
          <option value="">All specialities</option>
          {options.specialties.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select
          className="input-field text-sm"
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          aria-label="Filter by language"
        >
          <option value="">All languages</option>
          {options.languages.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </select>
        <select
          className="input-field text-sm"
          value={minExperience}
          onChange={(e) => setMinExperience(e.target.value)}
          aria-label="Minimum experience"
        >
          <option value="">Any experience</option>
          <option value="2">2+ years</option>
          <option value="5">5+ years</option>
          <option value="10">10+ years</option>
          <option value="20">20+ years</option>
        </select>
      </div>

      <div className="flex items-center justify-between mb-4">
        <p className="text-xs" style={{ color: "var(--text-tertiary)" }} role="status">
          {loading ? "Loading…" : `${total} astrologer${total === 1 ? "" : "s"} found`}
        </p>
        <button className="btn-ghost text-xs" onClick={reset} style={{ color: active }}>
          <RotateCcw className="w-3.5 h-3.5" /> Clear filters
        </button>
      </div>

      {error && (
        <div
          className="rounded-lg p-4 mb-6 flex items-start gap-2 text-sm"
          style={{ color: "var(--danger)", border: "1px solid var(--danger)" }}
          role="alert"
        >
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            {error}{" "}
            <button className="underline" onClick={() => load()}>
              Retry
            </button>
          </span>
        </div>
      )}

      {!loading && !error && rows.length === 0 && (
        <div
          className="rounded-xl p-10 text-center"
          style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)" }}
        >
          <p className="text-sm mb-1" style={{ color: "var(--text-primary)" }}>
            No astrologers match these filters.
          </p>
          <p className="text-xs mb-4" style={{ color: "var(--text-tertiary)" }}>
            Practitioners appear here only after full verification, so the list starts
            small and grows as applications are approved.
          </p>
          <button className="btn-secondary text-xs" onClick={reset}>
            Clear filters
          </button>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map((a) => (
          <Link
            key={a.id}
            href={`/astrologers/${a.slug}`}
            className="rounded-xl p-5 flex flex-col gap-3 transition-transform duration-200 hover:-translate-y-0.5"
            style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)" }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="font-medium truncate" style={{ color: "var(--text-primary)" }}>
                  {a.name ?? "AstroSeva Astrologer"}
                </h2>
                <p className="text-xs mt-0.5 line-clamp-2" style={{ color: "var(--text-secondary)" }}>
                  {a.headline}
                </p>
              </div>
              {a.is_on_probation ? (
                <span
                  className="text-[10px] px-2 py-1 rounded-full shrink-0"
                  style={{ background: "rgba(234,179,8,0.15)", color: "#EAB308" }}
                >
                  Probation
                </span>
              ) : (
                <span
                  className="text-[10px] px-2 py-1 rounded-full shrink-0 flex items-center gap-1"
                  style={{ background: "rgba(200,149,109,0.15)", color: ACCENT }}
                >
                  <ShieldCheck className="w-3 h-3" /> Verified
                </span>
              )}
            </div>

            <div className="flex items-center gap-3 text-xs" style={{ color: "var(--text-tertiary)" }}>
              {a.location && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> {a.location}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" /> {a.experience_years} yr
              </span>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {a.specialties.slice(0, 3).map((s) => (
                <span
                  key={s}
                  className="text-[10px] px-2 py-0.5 rounded"
                  style={{ background: "var(--border-subtle)", color: "var(--text-secondary)" }}
                >
                  {s}
                </span>
              ))}
            </div>

            <div
              className="mt-auto pt-3 flex items-center justify-between text-xs"
              style={{ borderTop: "1px solid var(--border-subtle)" }}
            >
              <span className="flex items-center gap-1" style={{ color: ACCENT }}>
                <Star className="w-3.5 h-3.5" />
                {a.accuracy_score.toFixed(1)}
                <span style={{ color: "var(--text-tertiary)" }}>/ 10</span>
              </span>
              <span style={{ color: "var(--text-tertiary)" }}>View profile →</span>
            </div>
          </Link>
        ))}
      </div>

      {rows.length > 0 && (
        <p className="text-[11px] mt-8 text-center" style={{ color: "var(--text-tertiary)" }}>
          Documents are self-declared and reviewed by a human. AstroSeva does not verify
          identity against any government register.
        </p>
      )}
    </div>
  );
}
