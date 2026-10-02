"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "motion/react";
import { Check } from "lucide-react";
import { api } from "@/lib/api";
import { useReducedMotion, slideUp } from "@/lib/motion";

function ResetPasswordForm() {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const reduced = useReducedMotion();
  const router = useRouter();
  const search = useSearchParams();
  const token = search.get("token");

  useEffect(() => {
    document.title = "Choose New Password | AstroSeva";
  }, []);

  const submit = async () => {
    if (!token) {
      setError("Reset token is missing from the URL.");
      return;
    }
    if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/\d/.test(password) || password.length < 8) {
      setError("Password does not meet requirements.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      await api.resetPassword(token, password);
      setSuccess(true);
    } catch (e) {
      const err = e as Error;
      setError(err.message || "Failed to reset password.");
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="max-w-md mx-auto px-5 py-14 text-center">
        <p className="mb-4" style={{ color: "var(--danger)" }}>Reset token is missing or invalid.</p>
        <button onClick={() => router.push("/forgot-password")} className="btn-primary">
          Request new link
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-5 py-14">
      <motion.div
        className="glass-card p-6"
        variants={slideUp}
        initial={reduced ? false : "hidden"}
        animate="visible"
      >
        <h1 className="heading-display text-2xl font-bold text-center mb-1">
          Choose New Password
        </h1>
        
        {success ? (
          <div className="text-center mt-6">
            <p className="text-sm mb-6" style={{ color: "var(--success)" }}>
              Password updated successfully.
            </p>
            <button onClick={() => router.push("/login")} className="btn-primary w-full">
              Log In
            </button>
          </div>
        ) : (
          <div className="mt-6">
            <div className="mb-4">
              <label className="input-label" htmlFor="reset-password">New Password</label>
              <input
                id="reset-password"
                type="password"
                className="input-field"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
              />
              <ul className="mt-2 space-y-0.5 text-[11px]" style={{ color: "var(--text-tertiary)" }}>
                {[
                  { label: "At least 8 characters", ok: password.length >= 8 },
                  { label: "One uppercase letter", ok: /[A-Z]/.test(password) },
                  { label: "One lowercase letter", ok: /[a-z]/.test(password) },
                  { label: "One number", ok: /\d/.test(password) },
                ].map((r) => (
                  <li
                    key={r.label}
                    className="flex items-center gap-1.5"
                    style={{ color: r.ok ? "var(--success)" : "var(--text-tertiary)" }}
                  >
                    {r.ok ? <Check className="w-3 h-3" /> : <span className="w-3 h-3 rounded-full border" style={{ borderColor: "currentColor" }} />}
                    {r.label}
                  </li>
                ))}
              </ul>
            </div>

            {error && (
              <p className="text-sm mb-4 text-center" style={{ color: "var(--danger)" }}>{error}</p>
            )}

            <button onClick={submit} disabled={loading} className="btn-primary w-full">
              {loading ? "Updating..." : "Update Password"}
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center">Loading...</div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}