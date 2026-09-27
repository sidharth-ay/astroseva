"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const KEY = "astroseva_visits";

export default function VisitTracker() {
  const path = usePathname();

  useEffect(() => {
    try {
      const raw = JSON.parse(localStorage.getItem(KEY) || "{}");
      raw.total = (raw.total || 0) + 1;
      raw.pages = raw.pages || {};
      raw.pages[path] = (raw.pages[path] || 0) + 1;
      const today = new Date().toISOString().slice(0, 10);
      raw.days = raw.days || {};
      raw.days[today] = (raw.days[today] || 0) + 1;
      localStorage.setItem(KEY, JSON.stringify(raw));
    } catch { /* ignore */ }
  }, [path]);

  return null;
}
