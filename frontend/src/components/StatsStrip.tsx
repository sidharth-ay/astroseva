"use client";

import { useRef, useEffect, useState, useCallback } from "react";

interface Stat {
  value: number;
  suffix: string;
  label: string;
  color: string;
}

const stats: Stat[] = [
  { value: 10, suffix: "+", label: "Planets", color: "#f97316" },
  { value: 12, suffix: "", label: "Houses", color: "#ec4899" },
  { value: 27, suffix: "", label: "Nakshatras", color: "#b48eff" },
  { value: 100, suffix: "%", label: "Free", color: "#fbbf24" },
];

function AnimatedNumber({ value, suffix, color }: { value: number; suffix: string; color: string }) {
  const [display, setDisplay] = useState(0);
  const [started, setStarted] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started) {
          setStarted(true);
        }
      },
      { threshold: 0.5 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [started]);

  useEffect(() => {
    if (!started) return;
    const duration = 1200;
    const startTime = performance.now();
    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(eased * value));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [started, value]);

  return (
    <div ref={ref} className="stat-number" style={{ color }}>
      {display}{suffix}
    </div>
  );
}

export default function StatsStrip() {
  const stripRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  const setRef = useCallback((node: HTMLDivElement | null) => {
    if (!node) return;
    stripRef.current = node;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.3 }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={setRef} className={`stats-strip ${visible ? "stats-strip-visible" : ""}`}>
      <div className="stats-strip-inner">
        {stats.map((s, i) => (
          <div key={s.label} className="stat-item" style={{ transitionDelay: `${i * 100}ms` }}>
            <AnimatedNumber value={s.value} suffix={s.suffix} color={s.color} />
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
