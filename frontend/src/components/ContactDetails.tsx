"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle, KeyRound, ShieldCheck } from "lucide-react";

import { api, type BirthProfile } from "@/lib/api";

type Field = "email" | "phone";

/**
 * Email and phone changes, each gated behind the current password.
 *
 * The password prompt is a separate step from the edit, and the field being
 * changed stays hidden until it passes. Two reasons: it makes a change to a
 * login credential an explicit act rather than a form submission, and it means
 * a wrong password reveals nothing about the stored value. The backend enforces
 * the same rule independently -- this is convenience, not the security boundary.
 */
export default function ContactDetails() {
  const [current, setCurrent] = useState<({ email: string } & BirthProfile) | null>(null);
  const [field, setField] = useState<Field | null>(null);
  const [password, setPassword] = useState("");
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");

  useEffect(() => {
    // Reading the account on mount is what effects are for.
    api.getMe().then(
      (me) => setCurrent(me),
      () => setCurrent(null),
    );
  }, []);

  if (!current) {
    return <p style={{ color: "var(--text-secondary)" }}>Loading your contact details…</p>;
  }

  const close = () => {
    setField(null);
    setPassword("");
    setValue("");
    setError("");
  };

  const submit = async () => {
    setError("");
    if (!field) return;
    setBusy(true);
    try {
      // One request, verified: the backend checks the current password and
      // applies the change in the same call, so there is no window where the
      // field is unlocked. The two responses differ in shape, so the branch
      // that made the call is the one that reads it back.
      let message: string;
      let email = current.email;
      let phone = current.phone_number;
      if (field === "email") {
        const res = await api.changeEmail(password, value.trim());
        message = res.message;
        email = res.email;
      } else {
        const res = await api.changePhone(password, value.trim());
        message = res.message;
        phone = res.phone_number;
      }
      setCurrent((prev) => (prev ? { ...prev, email, phone_number: phone } : prev));
      setDone(
        field === "email"
          ? "Email updated. Check the new address to finish verifying it."
          : message,
      );
      close();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not make that change.");
    } finally {
      setBusy(false);
    }
  };

  const rows: { id: Field; label: string; value: string; hint?: string }[] = [
    { id: "email", label: "Email", value: current.email },
    {
      id: "phone",
      label: "Phone",
      value: current.phone_number ?? "",
      hint: "Optional, used for no more than account notices.",
    },
  ];

  return (
    <div>
      {rows.map((row) => (
        <div key={row.id} className="mb-4 last:mb-0">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="text-sm font-medium">{row.label}</p>
              <p style={{ color: "var(--text-secondary)" }}>{row.value || "Not set"}</p>
              {row.hint && (
                <p className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>
                  {row.hint}
                </p>
              )}
            </div>
            <button
              type="button"
              className="btn-secondary text-sm inline-flex items-center gap-2"
              onClick={() => {
                setField(row.id);
                setValue(row.value);
                setPassword("");
                setError("");
                setDone("");
              }}
            >
              <ShieldCheck size={14} /> Change {row.label.toLowerCase()}
            </button>
          </div>

          {field === row.id && (
            <div className="mt-3 p-4 rounded-lg" style={{ background: "var(--surface-2)" }}>
              <label className="input-label" htmlFor={`verify-${row.id}`}>
                <span className="inline-flex items-center gap-1.5">
                  <KeyRound size={13} /> Confirm your current password
                </span>
              </label>
              <input
                id={`verify-${row.id}`}
                type="password"
                className="input-field"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <label className="input-label mt-3" htmlFor={`new-${row.id}`}>
                New {row.label.toLowerCase()}
              </label>
              <input
                id={`new-${row.id}`}
                className="input-field"
                type={row.id === "email" ? "email" : "tel"}
                value={value}
                onChange={(e) => setValue(e.target.value)}
              />
              {error && (
                <p className="flex items-center gap-2 mt-3" style={{ color: "var(--color-error, #f87171)" }}>
                  <AlertTriangle size={16} /> {error}
                </p>
              )}
              <div className="flex gap-2 mt-3">
                <button type="button" className="btn-primary" onClick={submit} disabled={busy}>
                  {busy ? "Saving…" : "Save change"}
                </button>
                <button type="button" className="btn-secondary" onClick={close} disabled={busy}>
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      ))}

      {done && (
        <p className="flex items-center gap-2 mt-3" style={{ color: "var(--color-success, #4ade80)" }}>
          <CheckCircle size={16} /> {done}
        </p>
      )}
    </div>
  );
}