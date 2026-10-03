"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { User, Settings, FolderHeart, Download, Trash2, ChevronRight, Check, MonitorSmartphone, Sparkles, HeartHandshake } from "lucide-react";
import Link from "next/link";
import { api, type BirthProfile, type KundliResponse } from "@/lib/api";
import { fetchLatestChart } from "@/lib/latest-chart";
import { useAuth } from "@/hooks/useAuth";
import { useReducedMotion, slideUp, staggerContainerCustom, staggerItem } from "@/lib/motion";

interface SavedChartSummary {
  id: number;
  name: string;
  birth_date: string;
  birth_place: string;
}

interface AstroSummary {
  lagna: string;
  rashi: string;
  nakshatra: string;
  sourceName: string;
}

/**
 * Read Lagna/Rashi/Nakshatra out of a stored chart. Every field is guarded:
 * a chart saved by an older build may carry a thinner shape, and a summary
 * that throws on it would blank the whole profile.
 */
function summarizeChart(chart: { name: string; chart_data?: KundliResponse }): AstroSummary | null {
  const data = chart.chart_data;
  if (!data || !Array.isArray(data.planets)) return null;
  const moon = data.planets.find((p) => p.planet === "Moon");
  if (!data.asc_sign_name || !moon?.sign_name) return null;
  const nakshatra =
    (data.dasha_info as { birth_nakshatra?: { name?: string } } | undefined)
      ?.birth_nakshatra?.name ?? "";
  if (!nakshatra) return null;
  return {
    lagna: data.asc_sign_name,
    rashi: moon.sign_name,
    nakshatra,
    sourceName: chart.name,
  };
}

interface SessionRow {
  id: number;
  user_agent: string | null;
  ip_address: string | null;
  created_at: string;
  last_used_at: string | null;
}

function deviceLabel(userAgent: string | null | undefined): string {
  if (!userAgent) return "Unknown device";
  if (/mobile|android|iphone/i.test(userAgent)) return "Mobile browser";
  if (/macintosh|mac os/i.test(userAgent)) return "Mac browser";
  if (/windows/i.test(userAgent)) return "Windows browser";
  if (/linux/i.test(userAgent)) return "Linux browser";
  return "Browser";
}

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const reduced = useReducedMotion();
  const [charts, setCharts] = useState<SavedChartSummary[]>([]);
  const [summary, setSummary] = useState<AstroSummary | null>(null);
  const [chartsError, setChartsError] = useState("");
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [sessionsError, setSessionsError] = useState("");
  const [revoking, setRevoking] = useState<number | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exported, setExported] = useState(false);
  const [deleteMode, setDeleteMode] = useState(false);
  const [password, setPassword] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  // The birth profile the account carries. Nulls are normal, not an error:
  // accounts created before this existed, or registered without it, have none.
  const [birth, setBirth] = useState<BirthProfile | null>(null);

  useEffect(() => {
    document.title = "My Profile | AstroSeva";
  }, []);

  const loadCharts = useCallback(async () => {
    try {
      const res = await api.listCharts();
      setCharts(res.charts.slice(0, 3));
      // The list carries metadata only; the summary needs the computed
      // payload, which lives behind GET /{id}. fetchLatestChart resolves the
      // two together -- reading chart_data off the list silently yields
      // nothing, which is how the summary once stayed empty forever.
      const found = await fetchLatestChart();
      if (found) setSummary(summarizeChart({ name: found.name, chart_data: found.data }));
    } catch (e) {
      setChartsError(e instanceof Error ? e.message : "Could not load saved charts.");
    }
  }, []);

  const loadSessions = useCallback(async () => {
    try {
      const res = await api.getSessions();
      setSessions(res.sessions);
    } catch (e) {
      setSessionsError(e instanceof Error ? e.message : "Could not load sessions.");
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    // Loading saved data on mount is what effects are for; the calls settle
    // asynchronously and flag errors rather than cascading renders.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadCharts();
    loadSessions();
    api.getMe().then((me) => setBirth(me), () => setBirth(null));
  }, [user, loadCharts, loadSessions]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const data = await api.exportData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `astroseva_export_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setExported(true);
      setTimeout(() => setExported(false), 3000);
    } catch (e) {
      console.error(e);
      alert("Failed to export data.");
    } finally {
      setExporting(false);
    }
  };

  const handleRevoke = async (id: number) => {
    setRevoking(id);
    try {
      await api.deleteSession(id);
      setSessions((prev) => prev.filter((s) => s.id !== id));
    } catch (e) {
      setSessionsError(e instanceof Error ? e.message : "Could not revoke session.");
    } finally {
      setRevoking(null);
    }
  };

  const handleDeleteAccount = async () => {
    if (!password) {
      setDeleteError("Please enter your current password.");
      return;
    }
    setDeleting(true);
    setDeleteError("");
    try {
      await api.deleteAccount(password);
      await logout();
      router.replace("/");
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : "Failed to delete account.");
    } finally {
      setDeleting(false);
    }
  };

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto px-5 py-20 text-center">
        <p style={{ color: "var(--text-secondary)" }}>Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-5 py-10">
      <motion.div variants={slideUp} initial={reduced ? false : "hidden"} animate="visible" className="text-center mb-10">
        <p className="heading-section mb-3">ACCOUNT DASHBOARD</p>
        <h1 className="heading-display font-bold mb-4" style={{ fontSize: "clamp(1.8rem, 4vw, 2.6rem)" }}>
          MY <span className="text-gradient-gold">PROFILE</span>
        </h1>
      </motion.div>

      <motion.div
        variants={staggerContainerCustom(0.1)}
        initial={reduced ? false : "hidden"}
        animate="visible"
        className="grid grid-cols-1 md:grid-cols-3 gap-6"
      >
        {/* Left Column: Identity, summary, account */}
        <div className="md:col-span-1 space-y-6">
          <motion.div variants={staggerItem} className="glass-card p-6 text-center">
            <div className="w-16 h-16 mx-auto rounded-full mb-4 flex items-center justify-center" style={{ background: "linear-gradient(135deg, #C8956D22, #D4A57411)", border: "1px solid var(--border)" }}>
              <User size={32} style={{ color: "var(--color-gold, #d4a017)" }} />
            </div>
            <h2 className="text-lg font-bold mb-1">{user.name}</h2>
            <p className="text-sm mb-2" style={{ color: "var(--text-secondary)" }}>{user.email}</p>
            <span className="inline-block px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider font-semibold" style={{ background: "var(--bg-elevated)", color: "var(--text-tertiary)", border: "1px solid var(--border-subtle)" }}>
              {user.role}
            </span>
          </motion.div>

          <motion.div variants={staggerItem} className="glass-card p-5">
            <h3 className="text-sm font-semibold mb-1 uppercase tracking-wider flex items-center gap-2" style={{ color: "var(--text-secondary)" }}>
              <Sparkles size={16} /> Astrology Summary
            </h3>
            {summary ? (
              <div>
                <dl className="text-sm space-y-2 mt-3">
                  <div className="flex justify-between">
                    <dt style={{ color: "var(--text-tertiary)" }}>Lagna</dt>
                    <dd className="font-medium">{summary.lagna}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt style={{ color: "var(--text-tertiary)" }}>Rashi</dt>
                    <dd className="font-medium">{summary.rashi}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt style={{ color: "var(--text-tertiary)" }}>Nakshatra</dt>
                    <dd className="font-medium">{summary.nakshatra}</dd>
                  </div>
                </dl>
                <p className="text-[11px] mt-3" style={{ color: "var(--text-tertiary)" }}>
                  From your latest saved chart (“{summary.sourceName}”).
                </p>
              </div>
            ) : (
              <div className="mt-3">
                <p className="text-sm mb-3" style={{ color: "var(--text-secondary)", lineHeight: 1.6 }}>
                  {chartsError
                    ? "Your chart summary could not be loaded."
                    : "No saved chart yet — generate one to see your Lagna, Rashi and Nakshatra here."}
                </p>
                <Link href="/kundli" className="btn-secondary text-sm inline-flex items-center gap-2">
                  Generate Kundli <ChevronRight size={14} />
                </Link>
              </div>
            )}
          </motion.div>

          <motion.div variants={staggerItem} className="glass-card p-5">
            <h3 className="text-sm font-semibold mb-1 uppercase tracking-wider flex items-center gap-2" style={{ color: "var(--text-secondary)" }}>
              <Sparkles size={16} /> Birth Profile
            </h3>
            {birth && birth.birth_date ? (
              <>
                <dl className="text-sm space-y-2 mt-3">
                  <div className="flex justify-between gap-3">
                    <dt style={{ color: "var(--text-tertiary)" }}>Born</dt>
                    <dd className="font-medium text-right">
                      {birth.birth_date}
                      {birth.birth_time ? ` at ${birth.birth_time}` : ""}
                    </dd>
                  </div>
                  {birth.birth_place && (
                    <div className="flex justify-between gap-3">
                      <dt style={{ color: "var(--text-tertiary)" }}>Place</dt>
                      <dd className="font-medium text-right">{birth.birth_place}</dd>
                    </div>
                  )}
                  {birth.gender && (
                    <div className="flex justify-between gap-3">
                      <dt style={{ color: "var(--text-tertiary)" }}>Gender</dt>
                      <dd className="font-medium capitalize">{birth.gender}</dd>
                    </div>
                  )}
                </dl>
                <p className="text-[11px] mt-3" style={{ color: "var(--text-tertiary)" }}>
                  Every chart here is calculated from these details.
                </p>
                <Link href="/settings" className="btn-secondary text-sm inline-flex items-center gap-2 mt-3">
                  Edit birth details <ChevronRight size={14} />
                </Link>
              </>
            ) : (
              <div className="mt-3">
                <p className="text-sm mb-3" style={{ color: "var(--text-secondary)", lineHeight: 1.6 }}>
                  No birth details on your account yet. Add them once and every
                  chart, horoscope and dosha reads them from here.
                </p>
                <Link href="/settings" className="btn-secondary text-sm inline-flex items-center gap-2">
                  Add birth details <ChevronRight size={14} />
                </Link>
              </div>
            )}
          </motion.div>

          <motion.div variants={staggerItem} className="glass-card p-5">
            <h3 className="text-sm font-semibold mb-1 uppercase tracking-wider flex items-center gap-2" style={{ color: "var(--text-secondary)" }}>
              <MonitorSmartphone size={16} /> Active Sessions
            </h3>
            {sessionsError ? (
              <p className="text-xs mt-3" style={{ color: "var(--color-error, #f87171)" }}>{sessionsError}</p>
            ) : sessions.length === 0 ? (
              <p className="text-sm mt-3" style={{ color: "var(--text-secondary)" }}>
                No other active sessions.
              </p>
            ) : (
              <ul className="mt-3 space-y-2">
                {sessions.map((s) => (
                  <li key={s.id} className="flex items-center justify-between gap-2 text-xs p-2 rounded-lg" style={{ background: "var(--surface-2)" }}>
                    <span style={{ color: "var(--text-secondary)" }}>
                      {deviceLabel(s.user_agent)}
                      {s.ip_address ? ` · ${s.ip_address}` : ""}
                    </span>
                    <button
                      type="button"
                      className="btn-ghost text-xs px-2 py-1"
                      disabled={revoking === s.id}
                      onClick={() => handleRevoke(s.id)}
                    >
                      {revoking === s.id ? "Revoking…" : "Revoke"}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </motion.div>

          <motion.div variants={staggerItem} className="glass-card p-5">
            <h3 className="text-sm font-semibold mb-4 uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>Data & Privacy</h3>
            <button onClick={handleExport} disabled={exporting} className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-white/5 transition-colors text-sm mb-2 text-left">
              <span className="flex items-center gap-2"><Download size={16} /> {exported ? "Exported!" : "Export My Data"}</span>
              {exported && <Check size={14} style={{ color: "var(--success)" }} />}
            </button>
            <button onClick={() => setDeleteMode(!deleteMode)} className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-white/5 transition-colors text-sm text-left" style={{ color: "var(--danger)" }}>
              <span className="flex items-center gap-2"><Trash2 size={16} /> Delete Account</span>
            </button>

            {deleteMode && (
              <div className="mt-4 p-4 rounded-lg" style={{ background: "rgba(248, 113, 113, 0.1)", border: "1px solid rgba(248, 113, 113, 0.2)" }}>
                <p className="text-xs mb-3" style={{ color: "var(--danger)" }}>
                  This action is permanent and cannot be undone. All your saved charts and settings will be anonymized or removed.
                </p>
                <input
                  type="password"
                  placeholder="Enter current password"
                  className="input-field text-xs mb-3"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                {deleteError && <p className="text-xs mb-3 font-semibold" style={{ color: "var(--danger)" }}>{deleteError}</p>}
                <div className="flex gap-2">
                  <button onClick={handleDeleteAccount} disabled={deleting || !password} className="flex-1 py-2 rounded text-xs font-semibold" style={{ background: "var(--danger)", color: "#fff" }}>
                    {deleting ? "Deleting..." : "Confirm Delete"}
                  </button>
                  <button onClick={() => { setDeleteMode(false); setPassword(""); setDeleteError(""); }} className="flex-1 py-2 rounded text-xs font-semibold btn-ghost">
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </div>

        {/* Right Column: Saved charts, remedies, settings */}
        <div className="md:col-span-2 space-y-6">
          <motion.div variants={staggerItem} className="glass-card p-0 overflow-hidden">
            <div className="p-5 border-b" style={{ borderColor: "var(--border)" }}>
              <h3 className="text-sm font-semibold uppercase tracking-wider flex items-center gap-2" style={{ color: "var(--text-secondary)" }}>
                <FolderHeart size={16} /> Saved Birth Profiles
              </h3>
            </div>
            <div className="p-5">
              {chartsError ? (
                <p className="text-sm" style={{ color: "var(--color-error, #f87171)" }}>{chartsError}</p>
              ) : charts.length === 0 ? (
                <div>
                  <p className="text-sm mb-4" style={{ color: "var(--text-secondary)", lineHeight: 1.6 }}>
                    No saved charts yet. Save a chart to keep birth profiles for yourself, family, and friends.
                  </p>
                  <Link href="/kundli" className="btn-secondary text-sm inline-flex items-center gap-2">
                    Generate Kundli <ChevronRight size={14} />
                  </Link>
                </div>
              ) : (
                <div>
                  <ul className="space-y-2 mb-4">
                    {charts.map((c) => (
                      <li key={c.id} className="flex items-center justify-between gap-2 text-sm p-2 rounded-lg" style={{ background: "var(--surface-2)" }}>
                        <span className="font-medium">{c.name}</span>
                        <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                          {c.birth_date} · {c.birth_place}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <Link href="/saved-charts" className="btn-secondary text-sm inline-flex items-center gap-2">
                    View All Saved Charts <ChevronRight size={14} />
                  </Link>
                </div>
              )}
            </div>
          </motion.div>

          <motion.div variants={staggerItem} className="glass-card p-0 overflow-hidden">
            <div className="p-5 border-b" style={{ borderColor: "var(--border)" }}>
              <h3 className="text-sm font-semibold uppercase tracking-wider flex items-center gap-2" style={{ color: "var(--text-secondary)" }}>
                <HeartHandshake size={16} /> Remedies
              </h3>
            </div>
            <div className="p-5">
              <p className="text-sm mb-4" style={{ color: "var(--text-secondary)", lineHeight: 1.6 }}>
                Detect doshas in your chart and get structured remedies, or plan a weekly remedy schedule.
              </p>
              <div className="flex flex-wrap gap-2">
                <Link href="/doshas" className="btn-secondary text-sm inline-flex items-center gap-2">
                  Check Doshas <ChevronRight size={14} />
                </Link>
                <Link href="/remedies" className="btn-secondary text-sm inline-flex items-center gap-2">
                  Remedy Planner <ChevronRight size={14} />
                </Link>
              </div>
            </div>
          </motion.div>

          <motion.div variants={staggerItem} className="glass-card p-0 overflow-hidden">
            <div className="p-5 border-b" style={{ borderColor: "var(--border)" }}>
              <h3 className="text-sm font-semibold uppercase tracking-wider flex items-center gap-2" style={{ color: "var(--text-secondary)" }}>
                <Settings size={16} /> Calculation Settings
              </h3>
            </div>
            <div className="p-5">
              <p className="text-sm mb-4" style={{ color: "var(--text-secondary)", lineHeight: 1.6 }}>
                Control how AstroSeva generates your charts. Choose between Whole Sign and Equal House
                systems. These settings apply to Kundli, Doshas, Gemstones, and more.
              </p>
              <Link href="/settings" className="btn-secondary text-sm inline-flex items-center gap-2">
                Manage Settings <ChevronRight size={14} />
              </Link>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
