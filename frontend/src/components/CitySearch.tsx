"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import citiesData from "@/lib/cities.json";

interface City {
  name: string;
  lat: number;
  lng: number;
  tz: number;
  state?: string;
}

interface CitySearchProps {
  value: string;
  onChange: (city: { name: string; lat: number; lng: number; tz: number }) => void;
  placeholder?: string;
  className?: string;
}

const MAX_RESULTS = 12;

export default function CitySearch({ value, onChange, placeholder = "Search city...", className = "" }: CitySearchProps) {
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<City[]>([]);
  const [show, setShow] = useState(false);
  const [active, setActive] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => setQuery(value), [value]);

  const search = useCallback((q: string) => {
    if (q.length < 1) { setResults([]); return; }
    const lower = q.toLowerCase();
    const found: City[] = [];
    for (let i = 0; i < citiesData.length && found.length < MAX_RESULTS; i++) {
      const c = citiesData[i] as City;
      if (c.name.toLowerCase().startsWith(lower)) found.push(c);
    }
    if (found.length < MAX_RESULTS) {
      for (let i = 0; i < citiesData.length && found.length < MAX_RESULTS; i++) {
        const c = citiesData[i] as City;
        if (!found.includes(c) && c.name.toLowerCase().includes(lower)) found.push(c);
      }
    }
    setResults(found);
    setActive(-1);
  }, []);

  const handleInput = (val: string) => {
    setQuery(val);
    setShow(true);
    search(val);
  };

  const handleSelect = (city: City) => {
    setQuery(city.name);
    setShow(false);
    setResults([]);
    onChange({ name: city.name, lat: city.lat, lng: city.lng, tz: city.tz });
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setActive(a => Math.min(a + 1, results.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive(a => Math.max(a - 1, 0)); }
    else if (e.key === "Enter" && active >= 0) { e.preventDefault(); handleSelect(results[active]); }
    else if (e.key === "Escape") { setShow(false); }
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (listRef.current && !listRef.current.contains(e.target as Node) && inputRef.current && !inputRef.current.contains(e.target as Node)) {
        setShow(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (active >= 0 && listRef.current) {
      const el = listRef.current.children[active] as HTMLElement;
      el?.scrollIntoView({ block: "nearest" });
    }
  }, [active]);

  return (
    <div className={`relative ${className}`}>
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={e => handleInput(e.target.value)}
        onFocus={() => { setShow(true); search(query); }}
        onKeyDown={handleKey}
        placeholder={placeholder}
        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 bg-white"
        autoComplete="off"
      />
      {show && results.length > 0 && (
        <div ref={listRef} className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
          {results.map((city, i) => (
            <button
              key={`${city.name}-${city.lat}`}
              type="button"
              className={`w-full text-left px-4 py-2 text-sm hover:bg-purple-50 ${i === active ? "bg-purple-100" : ""}`}
              onMouseDown={() => handleSelect(city)}
              onMouseEnter={() => setActive(i)}
            >
              <span className="text-gray-900">{city.name}</span>
              {city.state && <span className="text-gray-500 ml-2">({city.state})</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
