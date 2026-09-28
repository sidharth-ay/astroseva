"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "motion/react";
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
  const reduced = useReducedMotion();
  const router = useRouter();
  const search = useSearchParams();
  const rawNext = search.get("next") || "/services";
  // Only allow same-origin relative redirects (open-redirect hygiene).
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/services";

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
    setLoading(true);
    try {
      if (mode === "login") {
        const res = await api.login(email, password);
        setSession(res.token, res.user);
      } else {
        // Register returns a generic message (anti-enumeration);
        // log in immediately afterwards to establish the session.
        await api.register(email, name.trim(), password);
        const res = await api.login(email, password);
        setSession(res.token, res.user);
      }
      router.replace(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Authentication failed.");
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
            onClick={() => { setMode("login"); setError(""); }}
            className={mode === "login" ? "btn-primary flex-1" : "btn-ghost flex-1"}
          >
            Login
          </button>
          <button
            onClick={() => { setMode("register"); setError(""); }}
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
            placeholder={mode === "register" ? "Uppercase + lowercase + number, 8+ chars" : "Your password"}
            onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
          />
        </div>

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
