"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { LocalKeys, readLocal, writeLocal } from "@/lib/local";

interface VisitRecord {
  total?: number;
  pages?: Record<string, number>;
  days?: Record<string, number>;
}

export default function VisitTracker() {
  const path = usePathname();

  useEffect(() => {
    const raw = readLocal<VisitRecord>(LocalKeys.visits, {});
    raw.total = (raw.total || 0) + 1;
    raw.pages = raw.pages || {};
    raw.pages[path] = (raw.pages[path] || 0) + 1;
    const today = new Date().toISOString().slice(0, 10);
    raw.days = raw.days || {};
    raw.days[today] = (raw.days[today] || 0) + 1;
    writeLocal(LocalKeys.visits, raw);
  }, [path]);

  return null;
}
