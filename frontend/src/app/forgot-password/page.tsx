"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { api } from "@/lib/api";
import { useReducedMotion, slideUp } from "@/lib/motion";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const reduced = useReducedMotion();
  const router = useRouter();

  useEffect(() => {
    document.title = "Forgot Password | AstroSeva";
  }, []);

  const submit = async () => {
    if (!email.trim() || !email.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      await api.forgotPassword(email.trim());
      setSuccess(true);
    } catch (e) {
      const err = e as Error;
      setError(err.message || "Failed to send reset link.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-5 py-14">
      <motion.div
        className="glass-card p-6"
        variants={slideUp}
        initial={reduced ? false : "hidden"}
        animate="visible"
      >
        <h1 className="heading-display text-2xl font-bold text-center mb-1">
          Reset Password
        </h1>
        <p className="text-sm text-center mb-6" style={{ color: "var(--text-secondary)" }}>
          Enter your email and we will send you a reset link.
        </p>

        {success ? (
          <div className="text-center">
            <p className="text-sm mb-6" style={{ color: "var(--success)" }}>
              If that email matches an account, a reset link has been sent.
            </p>
            <button
              onClick={() => router.push("/login")}
              className="btn-ghost w-full"
            >
              Return to Login
            </button>
          </div>
        ) : (
          <div>
            <div className="mb-4">
              <label className="input-label" htmlFor="forgot-email">Email</label>
              <input
                id="forgot-email"
                type="email"
                className="input-field"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
              />
            </div>

            {error && (
              <p className="text-sm mb-4 text-center" style={{ color: "var(--danger)" }}>{error}</p>
            )}

            <button onClick={submit} disabled={loading} className="btn-primary w-full mb-3">
              {loading ? "Sending..." : "Send Reset Link"}
            </button>
            <button
              onClick={() => router.push("/login")}
              className="btn-ghost w-full"
            >
              Cancel
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}