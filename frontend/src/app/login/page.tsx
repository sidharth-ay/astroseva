"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "motion/react";
import { Check } from "lucide-react";
import { Suspense } from "react";
import { api, setSession, getToken, clearSession, locationFromCity, type CityEntry } from "@/lib/api";
import CitySearch from "@/components/CitySearch";
import { useReducedMotion, slideUp } from "@/lib/motion";

function LoginForm() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  // Birth profile captured at sign-up. The account is the single source of
  // truth for a chart, so the details are asked once here rather than retyped
  // on every tool.
  const [gender, setGender] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [birthTime, setBirthTime] = useState("");
  const [place, setPlace] = useState("");
  const [city, setCity] = useState<CityEntry | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const reduced = useReducedMotion();
  const router = useRouter();
  const search = useSearchParams();
  const rawNext = search.get("next") || "/saved-charts";
  // Only allow same-origin relative redirects (open-redirect hygiene).
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/saved-charts";

  useEffect(() => {
    document.title = "Login | AstroSeva";
    // Deep links (?mode=register) land on the registration form.
    if (search.get("mode") === "register") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMode("register");
    }
    // Validate any stored token server-side instead of trusting it.
    if (getToken()) {
      api.getMe().then(
        () => router.replace(next),
        () => clearSession()
      );
    }
  }, [router, next, search]);

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
    if (mode === "register") {
      if (!birthDate) {
        setError("Please enter your date of birth.");
        return;
      }
      if (!birthTime) {
        setError("Please enter your birth time. An approximate time is fine.");
        return;
      }
      if (!city) {
        setError("Please pick your birth city from the list.");
        return;
      }
    }
    setLoading(true);
    try {
      if (mode === "login") {
        const res = await api.login(email, password);
        setSession(res.token, res.user, res.refresh_token);
        router.replace(next);
        return;
      }

      // Register answers with the same generic message whether the account was
      // created or already existed, so that call alone reveals nothing about
      // which happened. We then log in with the password just submitted: a new
      // account always succeeds, so a first-time user lands signed in as asked,
      // while an existing address gets either their own session or an honest
      // "wrong password" -- never an enumeration signal.
      //
      // Validation and use of `city` sit in the same block on purpose: the null
      // check above narrows it, and a `city` read in the sibling `else` branch
      // would not be narrowed, so this reads as `CityEntry`, not `| null`.
      if (!city) {
        setError("Please pick your birth city from the list.");
        return;
      }
      await api.register(email, name.trim(), password, {
        gender: gender || undefined,
        birth_date: birthDate,
        birth_time: birthTime,
        ...locationFromCity(city),
      });
      const res = await api.login(email, password);
      setSession(res.token, res.user, res.refresh_token);
      router.replace(next);
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
            : "Tell us your birth details once — every chart on the site reads them."}
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
          <>
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
            {/* Birth details, asked once at sign-up because the account is the
                single source of truth every tool reads. */}
            <fieldset className="mb-4">
              <legend className="input-label" style={{ padding: 0 }}>
                Birth details
              </legend>
              <div className="grid grid-cols-2 gap-3 mt-2">
                <div>
                  <label className="input-label" htmlFor="reg-birth-date">Date of birth</label>
                  <input
                    id="reg-birth-date"
                    type="date"
                    className="input-field"
                    value={birthDate}
                    max={new Date().toISOString().slice(0, 10)}
                    onChange={(e) => setBirthDate(e.target.value)}
                  />
                </div>
                <div>
                  <label className="input-label" htmlFor="reg-birth-time">Time of birth</label>
                  <input
                    id="reg-birth-time"
                    type="time"
                    className="input-field"
                    value={birthTime}
                    onChange={(e) => setBirthTime(e.target.value)}
                  />
                </div>
              </div>
              <div className="mt-3">
                <label className="input-label" htmlFor="reg-gender">Gender</label>
                <select
                  id="reg-gender"
                  className="input-field"
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                >
                  <option value="">Prefer not to say</option>
                  <option value="female">Female</option>
                  <option value="male">Male</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="mt-3">
                <label className="input-label" htmlFor="reg-birth-place">Birth place</label>
                <CitySearch
                  id="reg-birth-place"
                  value={place}
                  onChange={(c) => { setCity(c); setPlace(c.name); }}
                  placeholder="Search your birth city"
                />
                <p className="mt-1.5 text-[11px]" style={{ color: "var(--text-tertiary)" }}>
                  Pick from the list so the coordinates and timezone are exact — a
                  chart is only as accurate as its place.
                </p>
              </div>
            </fieldset>
          </>
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
