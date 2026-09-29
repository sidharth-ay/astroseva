"use client";

import { motion } from "motion/react";
import { useReducedMotion } from "@/lib/motion";

export type KundliTabId =
  | "chart" | "planets" | "dasha" | "divisional"
  | "strength" | "nakshatra" | "relationships" | "karma";

export interface TabDef {
  id: KundliTabId;
  label: string;
}

export const KUNDLI_TABS: TabDef[] = [
  { id: "chart", label: "Chart" },
  { id: "planets", label: "Planets" },
  { id: "dasha", label: "Dasha" },
  { id: "divisional", label: "Divisional" },
  { id: "strength", label: "Strength" },
  { id: "nakshatra", label: "Nakshatra" },
  { id: "relationships", label: "Relationships" },
  { id: "karma", label: "Karma & Dosha" },
];

/** Neutral empty state for a section with no data. Deliberately says nothing
 *  about the feature being "in progress" — every tab either renders real data
 *  or shows this plain message. */
export function ComingSoon({ what }: { what: string }) {
  return (
    <div
      className="glass-card p-8 text-center"
      role="status"
      aria-live="polite"
    >
      <p className="text-sm font-medium mb-1" style={{ color: "var(--text-primary)" }}>
        {what}
      </p>
      <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
        No data for this chart.
      </p>
    </div>
  );
}

export function SubHeading({ children, count }: { children: React.ReactNode; count?: number }) {
  return (
    <h3
      className="text-xs font-semibold mb-3 uppercase tracking-wider"
      style={{ color: "#C8956D" }}
    >
      {children}
      {count !== undefined ? ` (${count})` : ""}
    </h3>
  );
}

export function Field({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div>
      <div
        className="text-[10px] uppercase tracking-wider mb-0.5"
        style={{ color: "var(--text-tertiary)" }}
      >
        {label}
      </div>
      <div className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>
        {value}
      </div>
    </div>
  );
}

export function Pill({
  children,
  color,
  small,
}: {
  children: React.ReactNode;
  color?: string;
  small?: boolean;
}) {
  return (
    <span
      className={small ? "text-[11px] px-2 py-0.5 rounded-lg" : "text-xs px-2 py-1 rounded-lg"}
      style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border-subtle)",
        color: color || "var(--text-secondary)",
      }}
    >
      {children}
    </span>
  );
}

export function Box({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`p-3 rounded-lg ${className}`}
      style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)" }}
    >
      {children}
    </div>
  );
}

export function BoxLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="text-[10px] uppercase tracking-wider mb-1"
      style={{ color: "var(--text-tertiary)" }}
    >
      {children}
    </div>
  );
}

export function Value({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-sm font-medium" style={{ color: "var(--champagne)" }}>
      {children}
    </div>
  );
}

/** Tab bar: bottom rule, gold active state, animated underline. */
export function TabBar({
  active,
  onChange,
}: {
  active: KundliTabId;
  onChange: (id: KundliTabId) => void;
}) {
  const reduced = useReducedMotion();
  return (
    <div
      className="flex gap-1 mb-6 overflow-x-auto"
      style={{ borderBottom: "1px solid var(--border-subtle)" }}
      role="tablist"
      aria-label="Kundali sections"
    >
      {KUNDLI_TABS.map((tab) => (
        <button
          key={tab.id}
          role="tab"
          aria-selected={active === tab.id}
          onClick={() => onChange(tab.id)}
          className="relative px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors"
          style={{
            color: active === tab.id ? "#C8956D" : "var(--text-tertiary)",
          }}
        >
          {tab.label}
          {active === tab.id && (
            <motion.div
              layoutId="kundali-tab-indicator"
              className="absolute bottom-0 left-0 right-0 h-[2px] rounded-full"
              style={{ background: "#C8956D" }}
              transition={
                reduced
                  ? { duration: 0 }
                  : { type: "spring", stiffness: 380, damping: 30 }
              }
            />
          )}
        </button>
      ))}
    </div>
  );
}

export function StaggerWrap({
  children,
  tabKey,
}: {
  children: React.ReactNode;
  tabKey: string;
}) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      key={tabKey}
      initial={reduced ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}
