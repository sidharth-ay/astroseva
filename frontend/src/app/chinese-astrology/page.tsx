"use client";

import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Calendar, ChevronRight } from "lucide-react";
import {
  useReducedMotion,
  staggerContainer,
  staggerItem,
} from "@/lib/motion";

interface ZodiacAnimal {
  name: string;
  emoji: string;
  years: string;
  traits: string[];
  luckyElements: string[];
  compatibility: string[];
  element: string;
}

const ZODIAC_ANIMALS: ZodiacAnimal[] = [
  {
    name: "Rat", emoji: "🐀", years: "1924, 1936, 1948, 1960, 1972, 1984, 1996, 2008, 2020",
    traits: ["Quick-witted", "Resourceful", "Versatile", "Kind", "Smart"],
    luckyElements: ["Gold", "Blue", "Green"],
    compatibility: ["Dragon", "Monkey", "Ox"],
    element: "Water",
  },
  {
    name: "Ox", emoji: "🐂", years: "1925, 1937, 1949, 1961, 1973, 1985, 1997, 2009, 2021",
    traits: ["Dependent", "Industrious", "Stubborn", "Honest", "Calm"],
    luckyElements: ["Yellow", "Green", "White"],
    compatibility: ["Snake", "Rooster", "Rat"],
    element: "Earth",
  },
  {
    name: "Tiger", emoji: "🐅", years: "1926, 1938, 1950, 1962, 1974, 1986, 1998, 2010, 2022",
    traits: ["Brave", "Competitive", "Confident", "Charismatic", "Unpredictable"],
    luckyElements: ["Blue", "Gray", "Orange"],
    compatibility: ["Horse", "Dog", "Pig"],
    element: "Wood",
  },
  {
    name: "Rabbit", emoji: "🐇", years: "1927, 1939, 1951, 1963, 1975, 1987, 1999, 2011, 2023",
    traits: ["Quiet", "Elegant", "Kind", "Well-mannered", "Wise"],
    luckyElements: ["Pink", "Purple", "Blue"],
    compatibility: ["Goat", "Pig", "Dog"],
    element: "Wood",
  },
  {
    name: "Dragon", emoji: "🐉", years: "1928, 1940, 1952, 1964, 1976, 1988, 2000, 2012, 2024",
    traits: ["Confident", "Intelligent", "Enthusiastic", "Lucky", "Charismatic"],
    luckyElements: ["Gold", "Silver", "Gray"],
    compatibility: ["Rat", "Monkey", "Rooster"],
    element: "Earth",
  },
  {
    name: "Snake", emoji: "🐍", years: "1929, 1941, 1953, 1965, 1977, 1989, 2001, 2013, 2025",
    traits: ["Wise", "Intuitive", "Enigmatic", "Graceful", "Determined"],
    luckyElements: ["Red", "Light Yellow", "Black"],
    compatibility: ["Ox", "Rooster", "Dragon"],
    element: "Fire",
  },
  {
    name: "Horse", emoji: "🐴", years: "1930, 1942, 1954, 1966, 1978, 1990, 2002, 2014, 2026",
    traits: ["Animated", "Active", "Energetic", "Independent", "Impatient"],
    luckyElements: ["Yellow", "Green", "Red"],
    compatibility: ["Tiger", "Goat", "Dog"],
    element: "Fire",
  },
  {
    name: "Goat", emoji: "🐐", years: "1931, 1943, 1955, 1967, 1979, 1991, 2003, 2015, 2027",
    traits: ["Calm", "Gentle", "Sympathetic", "Kind", "Artistic"],
    luckyElements: ["Green", "Red", "Purple"],
    compatibility: ["Rabbit", "Horse", "Pig"],
    element: "Earth",
  },
  {
    name: "Monkey", emoji: "🐒", years: "1932, 1944, 1956, 1968, 1980, 1992, 2004, 2016, 2028",
    traits: ["Sharp", "Smart", "Curious", "Mischievous", "Inventive"],
    luckyElements: ["White", "Gold", "Blue"],
    compatibility: ["Rat", "Dragon", "Snake"],
    element: "Metal",
  },
  {
    name: "Rooster", emoji: "🐓", years: "1933, 1945, 1957, 1969, 1981, 1993, 2005, 2017, 2029",
    traits: ["Observant", "Hardworking", "Confident", "Honest", "Punctual"],
    luckyElements: ["Gold", "Brown", "Yellow"],
    compatibility: ["Ox", "Snake", "Dragon"],
    element: "Metal",
  },
  {
    name: "Dog", emoji: "🐕", years: "1934, 1946, 1958, 1970, 1982, 1994, 2006, 2018, 2030",
    traits: ["Loyal", "Honest", "Amiable", "Kind", "Reliable"],
    luckyElements: ["Red", "Green", "Purple"],
    compatibility: ["Tiger", "Rabbit", "Horse"],
    element: "Earth",
  },
  {
    name: "Pig", emoji: "🐖", years: "1935, 1947, 1959, 1971, 1983, 1995, 2007, 2019, 2031",
    traits: ["Generous", "Compassionate", "Diligent", "Gentle", "Optimistic"],
    luckyElements: ["Yellow", "Gray", "Brown"],
    compatibility: ["Tiger", "Rabbit", "Goat"],
    element: "Water",
  },
];

const ANIMAL_NAMES = ZODIAC_ANIMALS.map((a) => a.name);

function getChineseZodiac(year: number): ZodiacAnimal {
  const index = ((year - 4) % 12 + 12) % 12;
  return ZODIAC_ANIMALS[index];
}

function getChineseYear(year: number): number {
  return ((year - 4) % 60 + 60) % 60;
}

export default function ChineseAstrologyPage() {
  const [year, setYear] = useState("");
  const [result, setResult] = useState<ZodiacAnimal | null>(null);
  const [chineseYear, setChineseYear] = useState(0);
  const reduced = useReducedMotion();

  useEffect(() => {
    document.title = "Chinese Astrology | AstroSeva";
  }, []);

  const calculate = () => {
    const y = parseInt(year);
    if (!y || y < 1900 || y > 2100) return;
    setResult(getChineseZodiac(y));
    setChineseYear(getChineseYear(y));
  };

  return (
    <div className="max-w-5xl mx-auto px-5 py-10">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <h1 className="heading-display text-2xl md:text-3xl mb-1">
          Chinese <span className="text-gradient-gold">Astrology</span>
        </h1>
        <p className="text-sm mb-8" style={{ color: "var(--text-secondary)" }}>
          Discover your Chinese zodiac animal and its influence on your personality
        </p>
      </motion.div>

      {/* Year Input */}
      <motion.div className="glass-card p-5 mb-8" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
        <div className="flex flex-col sm:flex-row gap-3 items-end">
          <div className="flex-1">
            <label className="input-label" htmlFor="cn-year"><Calendar size={11} className="inline mr-1" />Year of Birth</label>
            <input
              id="cn-year"
              type="number"
              className="input-field"
              value={year}
              onChange={(e) => setYear(e.target.value)}
              placeholder="Enter year (e.g. 1990)"
              min={1900}
              max={2100}
            />
          </div>
          <button className="btn-primary" onClick={calculate} disabled={!year}>
            Calculate <ChevronRight size={15} />
          </button>
        </div>
      </motion.div>

      {/* Result */}
      {result && (
        <motion.div
          variants={staggerContainer}
          initial={reduced ? false : "hidden"}
          animate="visible"
          className="space-y-6"
        >
          {/* Animal Card */}
          <motion.div className="glass-card p-6 text-center" variants={staggerItem}>
            <div className="text-6xl mb-3">{result.emoji}</div>
            <h2 className="heading-display text-2xl mb-1" style={{ color: "#C8956D" }}>Year of the {result.name}</h2>
            <p className="text-xs mb-2" style={{ color: "var(--text-tertiary)" }}>
              Element: {result.element} | Cycle Year: {chineseYear}
            </p>
            <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
              Years: {result.years}
            </p>
          </motion.div>

          {/* Personality Traits */}
          <motion.div className="glass-card p-5" variants={staggerItem}>
            <h3 className="text-xs font-semibold mb-3 uppercase tracking-wider" style={{ color: "#C8956D" }}>Personality Traits</h3>
            <div className="flex flex-wrap gap-2">
              {result.traits.map((trait) => (
                <span
                  key={trait}
                  className="px-3 py-1.5 rounded-full text-xs font-medium"
                  style={{ background: "rgba(200, 149, 109, 0.1)", color: "#C8956D" }}
                >
                  {trait}
                </span>
              ))}
            </div>
          </motion.div>

          {/* Lucky Elements */}
          <motion.div className="glass-card p-5" variants={staggerItem}>
            <h3 className="text-xs font-semibold mb-3 uppercase tracking-wider" style={{ color: "#C8956D" }}>Lucky Elements</h3>
            <div className="flex flex-wrap gap-2">
              {result.luckyElements.map((el) => (
                <span
                  key={el}
                  className="px-3 py-1.5 rounded-full text-xs font-medium"
                  style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", color: "var(--text-secondary)" }}
                >
                  {el}
                </span>
              ))}
            </div>
          </motion.div>

          {/* Compatibility */}
          <motion.div className="glass-card p-5" variants={staggerItem}>
            <h3 className="text-xs font-semibold mb-3 uppercase tracking-wider" style={{ color: "#C8956D" }}>Best Compatibility</h3>
            <div className="flex flex-wrap gap-3">
              {result.compatibility.map((name) => {
                const animal = ZODIAC_ANIMALS.find((a) => a.name === name);
                return (
                  <div
                    key={name}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg"
                    style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)" }}
                  >
                    <span className="text-xl">{animal?.emoji}</span>
                    <span className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>{name}</span>
                  </div>
                );
              })}
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* All 12 Animals Grid */}
      <motion.div
        className="mt-12"
        variants={staggerContainer}
        initial={reduced ? false : "hidden"}
        animate="visible"
      >
        <h3 className="text-xs font-semibold mb-4 uppercase tracking-wider text-center" style={{ color: "#C8956D" }}>All 12 Zodiac Animals</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {ZODIAC_ANIMALS.map((animal) => (
            <motion.div
              key={animal.name}
              className="glass-card p-4 text-center cursor-pointer"
              variants={staggerItem}
              whileHover={{ y: -2, transition: { duration: 0.15 } }}
              onClick={() => {
                setYear(animal.years.split(", ")[3]);
                setResult(animal);
                setChineseYear(getChineseYear(parseInt(animal.years.split(", ")[3])));
              }}
            >
              <div className="text-3xl mb-2">{animal.emoji}</div>
              <div className="text-xs font-semibold mb-1" style={{ color: "var(--text-primary)" }}>{animal.name}</div>
              <div className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>{animal.element}</div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
