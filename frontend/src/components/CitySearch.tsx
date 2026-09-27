"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Search, MapPin, X } from "lucide-react";
import type { CityEntry } from "@/lib/api";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

interface CitySearchProps {
  id?: string;
  value: string;
  onChange: (city: CityEntry) => void;
  placeholder?: string;
}

export default function CitySearch({ id, value, onChange, placeholder = "Search city..." }: CitySearchProps) {
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<CityEntry[]>([]);
  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { setQuery(value); }, [value]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const search = useCallback((q: string) => {
    setQuery(q);
    setHighlightedIndex(-1);
    if (q.length < 2) {
      setResults([]);
      setOpen(false);
      setSearching(false);
      return;
    }

    if (timerRef.current) clearTimeout(timerRef.current);
    abortRef.current?.abort();
    setSearching(true);

    timerRef.current = setTimeout(async () => {
      const controller = new AbortController();
      abortRef.current = controller;
      try {
        const res = await fetch(
          `${API_BASE}/api/v1/cities?q=${encodeURIComponent(q)}`,
          { signal: controller.signal }
        );
        const data = await res.json();
        setResults(data.cities || []);
        setOpen(true);
      } catch {
        setResults([]);
        setOpen(false);
      } finally {
        setSearching(false);
      }
    }, 300);
  }, []);

  const select = (city: CityEntry) => {
    setQuery(city.name);
    setOpen(false);
    setHighlightedIndex(-1);
    onChange(city);
  };

  const clear = () => {
    setQuery("");
    setResults([]);
    setOpen(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open || results.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev <= 0 ? results.length - 1 : prev));
    } else if (e.key === "Enter" && highlightedIndex >= 0) {
      e.preventDefault();
      select(results[highlightedIndex]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div ref={ref} className="relative">
      <div className="relative">
        <MapPin size={14} aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "var(--text-tertiary)" }} />
        <input
          ref={inputRef}
          id={id}
          type="text"
          value={query}
          onChange={(e) => search(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="input-field input-field-with-icon"
          role="combobox"
          aria-expanded={open}
          aria-autocomplete="list"
        />
        {query && (
          <button
            onClick={clear}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded transition-colors"
            style={{ color: "var(--text-tertiary)" }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "var(--text-secondary)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-tertiary)"; }}
            aria-label="Clear search"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {open && (
        <div
          className="absolute z-50 mt-1 w-full max-h-56 overflow-y-auto"
          style={{
            background: "var(--deep-indigo)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-md)",
            boxShadow: "var(--shadow-lg)",
          }}
          role="listbox"
        >
          {searching && (
            <div className="px-4 py-3 text-xs text-center" style={{ color: "var(--text-tertiary)" }}>
              Searching...
            </div>
          )}
          {!searching && results.length === 0 && (
            <div className="px-4 py-3 text-xs text-center" style={{ color: "var(--text-tertiary)" }}>
              No cities found
            </div>
          )}
          {!searching && results.map((c, i) => (
            <button
              key={`${c.name}-${c.lat}-${i}`}
              className="w-full text-left px-3 py-2 text-sm transition-colors flex items-center gap-2"
              style={{
                color: highlightedIndex === i ? "var(--text-primary)" : "var(--text-secondary)",
                background: highlightedIndex === i ? "rgba(200, 149, 109, 0.08)" : "transparent",
              }}
              onMouseEnter={(e) => {
                setHighlightedIndex(i);
                e.currentTarget.style.background = "rgba(200, 149, 109, 0.08)";
                e.currentTarget.style.color = "var(--text-primary)";
              }}
              onMouseLeave={(e) => {
                if (highlightedIndex === i) setHighlightedIndex(-1);
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = "var(--text-secondary)";
              }}
              onClick={() => select(c)}
              role="option"
              aria-selected={highlightedIndex === i}
            >
              <Search size={12} style={{ color: "var(--text-tertiary)", flexShrink: 0 }} />
              <span className="font-medium">{c.name}</span>
              {c.state && <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>{c.state}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
