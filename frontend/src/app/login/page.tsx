"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "motion/react";
import { Check } from "lucide-react";
import { Suspense } from "react";
import { api, setSession, getToken, clearSession } from "@/lib/api";
import { useReducedMotion, slideUp } from "@/lib/motion";

function LoginForm() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const reduced = useReducedMotion();
  const router = useRouter();
  const search = useSearchParams();
  const rawNext = search.get("next") || "/saved-charts";
  // Only allow same-origin relative redirects (open-redirect hygiene).
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/saved-charts";

  useEffect(() => {
    document.title = "Login | AstroSeva";
    // Validate any stored token server-side instead of trusting it.
    if (getToken()) {
      api.getMe().then(
        () => router.replace(next),
        () => clearSession()
      );
    }
  }, [router, next]);

  const submit = async () => {
    setError("");
    setNotice("");
    if (!email.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }
    if (mode === "register" && !name.trim()) {
      setError("Please enter your name.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    // Checked here so the rules are visible up front. The server enforces
    // exactly this, so without the check a user who followed the old
    // "8+ characters" hint got a 400 with no explanation.
    if (mode === "register" && !/[A-Z]/.test(password)) {
      setError("Password needs at least one uppercase letter.");
      return;
    }
    if (mode === "register" && !/[a-z]/.test(password)) {
      setError("Password needs at least one lowercase letter.");
      return;
    }
    if (mode === "register" && !/\d/.test(password)) {
      setError("Password needs at least one number.");
      return;
    }
    setLoading(true);
    try {
      if (mode === "login") {
        const res = await api.login(email, password);
        setSession(res.token, res.user, res.refresh_token);
        router.replace(next);
      } else {
        // Register returns a generic message (anti-enumeration) and no token.
        // We deliberately do NOT log in automatically: a new account must go
        // through the login form so every session is established explicitly.
        await api.register(email, name.trim(), password);
        setNotice("Account created. Please log in to continue.");
        setMode("login");
        setPassword("");
      }
    } catch (e) {
      const err = e as Error & { status?: number; retryAfter?: number };
      if (err.status === 429) {
        // A rate limit is temporary and self-explanatory. The backend sends
        // Retry-After; the message says how long, so the user waits instead of
        // assuming the site is broken.
        const secs = err.retryAfter ?? 60;
        setError(
          `Too many attempts. Please wait ${secs} second${secs === 1 ? "" : "s"} and try again.`
        );
      } else if (err.status === 400 && /password/i.test(err.message)) {
        setError(err.message);
      } else {
        setError(err.message || "Authentication failed.");
      }
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
          {mode === "login" ? "Welcome Back" : "Create Account"}
        </h1>
        <p className="text-sm text-center mb-6" style={{ color: "var(--text-secondary)" }}>
          {mode === "login"
            ? "Log in to access your saved charts."
            : "Register to save birth charts to your profile."}
        </p>

        <div className="flex gap-2 mb-5">
          <button
            onClick={() => { setMode("login"); setError(""); setNotice(""); }}
            className={mode === "login" ? "btn-primary flex-1" : "btn-ghost flex-1"}
          >
            Login
          </button>
          <button
            onClick={() => { setMode("register"); setError(""); setNotice(""); }}
            className={mode === "register" ? "btn-primary flex-1" : "btn-ghost flex-1"}
          >
            Register
          </button>
        </div>

        {mode === "register" && (
          <div className="mb-4">
            <label className="input-label" htmlFor="login-name">Name</label>
            <input
              id="login-name"
              className="input-field"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
            />
          </div>
        )}
        <div className="mb-4">
          <label className="input-label" htmlFor="login-email">Email</label>
          <input
            id="login-email"
            type="email"
            className="input-field"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
        </div>
        <div className="mb-5">
          <label className="input-label" htmlFor="login-password">Password</label>
          <input
            id="login-password"
            type="password"
            className="input-field"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={mode === "register" ? "At least 8 characters" : "Your password"}
            onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
          />
          {mode === "register" && (
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
                  {r.ok ? <Check className="w-3 h-3" /> : <span className="w-3 h-3 rounded-full border" style={{ borderColor: "var(--border-subtle)" }} />}
                  {r.label}
                </li>
              ))}
            </ul>
          )}
        </div>

        {notice && (
          <p className="text-sm mb-4 text-center" style={{ color: "var(--success)" }}>{notice}</p>
        )}

        {error && (
          <p className="text-sm mb-4 text-center" style={{ color: "var(--danger)" }}>{error}</p>
        )}

        <button onClick={submit} disabled={loading} className="btn-primary w-full">
          {loading ? "Please wait…" : mode === "login" ? "Login" : "Register"}
        </button>
      </motion.div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
