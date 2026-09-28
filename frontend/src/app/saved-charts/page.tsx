"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "motion/react";
import { Trash2, Eye, LogOut } from "lucide-react";
import { api, getToken, getStoredUser, clearSession } from "@/lib/api";
import {
  useReducedMotion,
  staggerContainerCustom,
  staggerItem,
  slideUp,
  stagger,
} from "@/lib/motion";

interface SavedChart {
  id: number;
  name: string;
  birth_date: string;
  birth_time: string;
  birth_place: string;
  created_at: string;
}

export default function SavedChartsPage() {
  const [charts, setCharts] = useState<SavedChart[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [detail, setDetail] = useState<Record<string, unknown> | null>(null);
  const reduced = useReducedMotion();
  const router = useRouter();
  const user = getStoredUser();

  useEffect(() => {
    document.title = "Saved Charts | AstroSeva";
  }, []);

  const load = async () => {
    if (!getToken()) {
      router.replace("/login?next=/saved-charts");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await api.listCharts();
      setCharts(res.charts);
    } catch (e) {
      const status = (e as { status?: number })?.status;
      if (status === 401 || status === 403) {
        clearSession();
        router.replace("/login?next=/saved-charts");
        return;
      }
      const msg = e instanceof Error ? e.message : "Failed to load charts.";
      if (msg.toLowerCase().includes("log in")) {
        clearSession();
        router.replace("/login?next=/saved-charts");
        return;
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const viewChart = async (id: number) => {
    try {
      setDetail(await api.getChart(id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load chart.");
    }
  };

  const removeChart = async (id: number) => {
    if (!confirm("Delete this saved chart?")) return;
    try {
      await api.deleteChart(id);
      setCharts((prev) => prev.filter((c) => c.id !== id));
      if (detail && detail.id === id) setDetail(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete chart.");
    }
  };

  const logout = async () => {
    try {
      await api.logout();
    } catch { /* session cleared locally regardless */ }
    clearSession();
    router.replace("/login?next=/saved-charts");
  };

  const [pwCurrent, setPwCurrent] = useState("");
  const [pwNew, setPwNew] = useState("");
  const [pwMsg, setPwMsg] = useState("");
  const [pwLoading, setPwLoading] = useState(false);

  const changePw = async () => {
    setPwMsg("");
    if (pwNew.length < 8) {
      setPwMsg("New password must be at least 8 characters.");
      return;
    }
    setPwLoading(true);
    try {
      const res = await api.changePassword(pwCurrent, pwNew);
      setPwMsg(res.message + " You have been logged out everywhere.");
      setPwCurrent("");
      setPwNew("");
      clearSession();
      setTimeout(() => router.replace("/login?next=/saved-charts"), 1500);
    } catch (e) {
      setPwMsg(e instanceof Error ? e.message : "Password change failed.");
    } finally {
      setPwLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-5 py-10">
      <motion.div
        className="text-center mb-8"
        variants={slideUp}
        initial={reduced ? false : "hidden"}
        animate="visible"
      >
        <p className="heading-section mb-3">YOUR PROFILE</p>
        <h1
          className="heading-display font-bold mb-4"
          style={{ fontSize: "clamp(1.8rem, 4vw, 2.6rem)" }}
        >
          SAVED <span className="text-gradient-gold">CHARTS</span>
        </h1>
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          {user ? `Logged in as ${user.name} (${user.email})` : "Your birth chart library"}
          {user && (
            <button onClick={logout} className="btn-ghost text-xs ml-3">
              <LogOut size={12} /> Logout
            </button>
          )}
        </p>
      </motion.div>

      {error && (
        <div className="glass-card p-4 mb-6 text-center text-sm" style={{ color: "var(--danger)" }}>
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-center text-sm" style={{ color: "var(--text-secondary)" }}>Loading…</p>
      ) : charts.length === 0 ? (
        <div className="glass-card p-8 text-center">
          <p className="text-sm mb-4" style={{ color: "var(--text-secondary)" }}>
            No saved charts yet. Generate a kundli and save it to your profile.
          </p>
          <Link href="/kundli" className="btn-primary">Generate Kundli</Link>
        </div>
      ) : (
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6"
          variants={staggerContainerCustom(stagger.normal, 0.05)}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-40px" }}
        >
          {charts.map((c) => (
            <motion.div key={c.id} className="glass-card p-5" variants={staggerItem}>
              <h3 className="text-base font-semibold mb-1" style={{ color: "var(--text-primary)" }}>
                {c.name}
              </h3>
              <p className="text-xs mb-4" style={{ color: "var(--text-secondary)" }}>
                {c.birth_date} · {c.birth_time} · {c.birth_place}
              </p>
              <div className="flex gap-2">
                <button onClick={() => viewChart(c.id)} className="btn-ghost text-xs">
                  <Eye size={13} /> View
                </button>
                <button onClick={() => removeChart(c.id)} className="btn-ghost text-xs">
                  <Trash2 size={13} /> Delete
                </button>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}

      {detail && (
        <div className="glass-card p-5">
          <h3 className="text-base font-semibold mb-3" style={{ color: "var(--text-primary)" }}>
            {String(detail.name)} — chart data
          </h3>
          <pre
            className="text-xs overflow-x-auto p-3 rounded-lg"
            style={{ background: "rgba(0,0,0,0.3)", color: "var(--text-secondary)" }}
          >
            {JSON.stringify(detail.chart_data ?? detail, null, 2)}
          </pre>
          <button onClick={() => setDetail(null)} className="btn-ghost text-xs mt-3">
            Close
          </button>
        </div>
      )}

      <div className="glass-card p-5 mt-6">
        <h3 className="text-base font-semibold mb-1" style={{ color: "var(--text-primary)" }}>
          Change Password
        </h3>
        <p className="text-xs mb-4" style={{ color: "var(--text-secondary)" }}>
          Changing your password logs you out on all devices.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
          <input
            type="password"
            className="input-field"
            placeholder="Current password"
            value={pwCurrent}
            onChange={(e) => setPwCurrent(e.target.value)}
          />
          <input
            type="password"
            className="input-field"
            placeholder="New password (upper + lower + number, 8+ chars)"
            value={pwNew}
            onChange={(e) => setPwNew(e.target.value)}
          />
        </div>
        {pwMsg && (
          <p className="text-xs mb-3" style={{ color: "var(--champagne)" }}>{pwMsg}</p>
        )}
        <button onClick={changePw} disabled={pwLoading} className="btn-ghost text-xs">
          {pwLoading ? "Changing…" : "Change Password"}
        </button>
      </div>
    </div>
  );
}
