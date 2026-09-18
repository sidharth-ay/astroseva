"use client";

import { useState, useRef, useEffect } from "react";
import citiesData from "@/lib/cities.json";

interface City { name: string; lat: number; lng: number; tz: number; state?: string; country?: string; }

interface Props {
  value: string;
  onChange: (city: City) => void;
  placeholder?: string;
}

const cities = citiesData as City[];

export default function CitySearch({ value, onChange, placeholder = "Search city..." }: Props) {
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const [filtered, setFiltered] = useState<City[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => { setQuery(value); }, [value]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSearch = (q: string) => {
    setQuery(q);
    if (q.length >= 2) {
      const lower = q.toLowerCase();
      setFiltered(cities.filter((c) => c.name.toLowerCase().includes(lower)).slice(0, 15));
      setOpen(true);
    } else {
      setFiltered([]);
      setOpen(false);
    }
  };

  const handleSelect = (city: City) => {
    setQuery(city.name);
    onChange(city);
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative">
      <input type="text" value={query} onChange={(e) => handleSearch(e.target.value)}
        onFocus={() => query.length >= 2 && filtered.length > 0 && setOpen(true)}
        placeholder={placeholder}
        className="cosmic-input w-full" />
      {open && filtered.length > 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-xl max-h-60 overflow-auto"
          style={{ background: "rgba(10,10,30,0.98)", border: "1px solid var(--border)", backdropFilter: "blur(10px)" }}>
          {filtered.map((city, i) => (
            <button key={`${city.name}-${city.country}-${i}`}
              onClick={() => handleSelect(city)}
              className="w-full text-left px-4 py-2.5 text-sm transition-colors hover:bg-white/[0.06]"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
              <span>{city.name}</span>
              <span className="ml-2 text-xs" style={{ color: "var(--text-secondary)" }}>{city.country}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
