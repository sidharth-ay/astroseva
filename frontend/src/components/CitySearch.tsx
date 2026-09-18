"use client";

import { useState, useRef, useEffect } from "react";
import { cities, type CityEntry } from "@/lib/api";
import { Search } from "lucide-react";

interface CitySearchProps {
  value: string;
  onChange: (city: CityEntry) => void;
  placeholder?: string;
}

export default function CitySearch({ value, onChange, placeholder = "Search city..." }: CitySearchProps) {
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<CityEntry[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => { setQuery(value); }, [value]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const search = (q: string) => {
    setQuery(q);
    if (q.length < 2) { setResults([]); setOpen(false); return; }
    const lower = q.toLowerCase();
    const matched = cities.filter((c) => c.name.toLowerCase().includes(lower)).slice(0, 12);
    setResults(matched);
    setOpen(matched.length > 0);
  };

  const select = (city: CityEntry) => {
    setQuery(city.name);
    setOpen(false);
    onChange(city);
  };

  return (
    <div ref={ref} className="relative">
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-tertiary)" }} />
        <input
          type="text"
          value={query}
          onChange={(e) => search(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder={placeholder}
          className="input-field pl-9"
        />
      </div>
      {open && results.length > 0 && (
        <div className="absolute z-50 mt-1 w-full max-h-60 overflow-y-auto rounded-xl"
          style={{ background: "var(--deep-indigo)", border: "1px solid var(--border)", boxShadow: "var(--shadow-lg)" }}>
          {results.map((c, i) => (
            <button key={`${c.name}-${i}`}
              className="w-full text-left px-3 py-2.5 text-sm transition-colors"
              style={{ color: "var(--text-secondary)" }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(244, 240, 232, 0.04)"; e.currentTarget.style.color = "var(--text-primary)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text-secondary)"; }}
              onClick={() => select(c)}>
              <span className="font-medium">{c.name}</span>
              {c.state && <span className="ml-1.5 text-xs" style={{ color: "var(--text-tertiary)" }}>{c.state}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
