"use client";

import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Bell } from "lucide-react";
import Link from "next/link";
import { useReducedMotion, staggerContainerCustom, staggerItem, slideUp, stagger } from "@/lib/motion";
import HonestyNote from "@/components/HonestyNote";
import { LocalKeys, readLocal, writeLocal } from "@/lib/local";

interface Pref {
  id: string;
  title: string;
  description: string;
  link: string;
  linkLabel: string;
}

const PREFS: Pref[] = [
  { id: "horoscope", title: "Daily Horoscope Reminder", description: "A nudge to read your daily horoscope with love, career, and health ratings.", link: "/horoscope", linkLabel: "Open Horoscope" },
  { id: "transit", title: "Transit Alerts", description: "Heads-up on major planetary transits and their influence on your chart.", link: "/transit", linkLabel: "Open Transit" },
  { id: "remedy", title: "Remedy Reminders", description: "Weekly reminders from your custom remedy plan based on selected concerns.", link: "/remedies", linkLabel: "Open Planner" },
  { id: "festival", title: "Festival Alerts", description: "Upcoming Hindu festivals with dates and significance.", link: "/festivals", linkLabel: "Open Calendar" },
  { id: "lakshan", title: "Daily Lakshan Tip", description: "One traditional tip each day — rituals, remedies, and observances.", link: "/lakshan", linkLabel: "Open Tips" },
  { id: "learning", title: "Learning Progress", description: "Encouragement to continue academy lessons and finish exams.", link: "/academy", linkLabel: "Open Academy" },
];

function load(): Record<string, boolean> {
  return readLocal<Record<string, boolean>>(LocalKeys.notifPrefs, {});
}

export default function NotificationsPage() {
  const [prefs, setPrefs] = useState<Record<string, boolean>>(() => load());
  const reduced = useReducedMotion();

  useEffect(() => {
    document.title = "Notification Preferences | AstroSeva";
  }, []);

  const toggle = (id: string) => {
    const next = { ...prefs, [id]: !prefs[id] };
    setPrefs(next);
    writeLocal(LocalKeys.notifPrefs, next);
  };

  const enabled = PREFS.filter((p) => prefs[p.id]).length;

  return (
    <div className="max-w-3xl mx-auto px-5 py-10">
      <motion.div variants={slideUp} initial={reduced ? false : "hidden"} animate="visible" className="text-center mb-8">
        <p className="heading-section mb-3">PREFERENCES</p>
        <h1 className="heading-display font-bold mb-4" style={{ fontSize: "clamp(1.8rem, 4vw, 2.6rem)" }}>
          NOTIFICATION <span className="text-gradient-gold">PREFERENCES</span>
        </h1>
        <p className="max-w-lg mx-auto text-sm" style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}>
          {enabled} of {PREFS.length} reminder types enabled. Preferences are stored on this device.
        </p>
          <HonestyNote>These toggles record intent on this device. No messages are delivered anywhere yet.</HonestyNote>
      </motion.div>

      <motion.div
        className="space-y-3"
        variants={staggerContainerCustom(stagger.normal, 0.06)}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
      >
        {PREFS.map((p) => (
          <motion.div key={p.id} className="glass-card p-5 flex items-start gap-4" variants={staggerItem}>
            <button
              onClick={() => toggle(p.id)}
              role="switch"
              aria-checked={!!prefs[p.id]}
              aria-label={p.title}
              className="w-11 h-6 rounded-full relative shrink-0 mt-0.5"
              style={{
                background: prefs[p.id] ? "#C8956D" : "var(--border)",
                transition: "background 0.2s",
              }}
            >
              <span
                className="absolute top-0.5 w-5 h-5 rounded-full"
                style={{
                  left: prefs[p.id] ? "22px" : "2px",
                  background: "#fff",
                  transition: "left 0.2s",
                }}
              />
            </button>
            <div className="grow">
              <div className="flex items-center gap-2 mb-1">
                <Bell size={14} style={{ color: "#C8956D" }} />
                <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{p.title}</h3>
              </div>
              <p className="text-xs mb-2" style={{ color: "var(--text-secondary)", lineHeight: 1.6 }}>{p.description}</p>
              <Link href={p.link} className="text-xs font-medium" style={{ color: "#C8956D" }}>
                {p.linkLabel} →
              </Link>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}
