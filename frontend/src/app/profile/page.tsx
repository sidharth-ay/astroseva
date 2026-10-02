"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { User, Settings, FolderHeart, Download, Trash2, ChevronRight, Check } from "lucide-react";
import Link from "next/link";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { useReducedMotion, slideUp, staggerContainerCustom, staggerItem } from "@/lib/motion";

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const reduced = useReducedMotion();
  const [exporting, setExporting] = useState(false);
  const [exported, setExported] = useState(false);
  const [deleteMode, setDeleteMode] = useState(false);
  const [password, setPassword] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  useEffect(() => {
    document.title = "My Profile | AstroSeva";
  }, []);

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
        {/* Left Column: User Info & Actions */}
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

        {/* Right Column: Features */}
        <div className="md:col-span-2 space-y-6">
          <motion.div variants={staggerItem} className="glass-card p-0 overflow-hidden">
            <div className="p-5 border-b" style={{ borderColor: "var(--border)" }}>
              <h3 className="text-sm font-semibold uppercase tracking-wider flex items-center gap-2" style={{ color: "var(--text-secondary)" }}>
                <FolderHeart size={16} /> My Saved Charts
              </h3>
            </div>
            <div className="p-5">
              <p className="text-sm mb-4" style={{ color: "var(--text-secondary)", lineHeight: 1.6 }}>
                View and manage birth charts you have saved for yourself, family, and friends. 
                Quickly pull them up for horoscope matching, dosha analysis, or predictions.
              </p>
              <Link href="/saved-charts" className="btn-secondary text-sm inline-flex items-center gap-2">
                View Saved Charts <ChevronRight size={14} />
              </Link>
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