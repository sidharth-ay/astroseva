"use client";

import { useState } from "react";
import { LogOut } from "lucide-react";

/**
 * Logout behind a confirmation, shared by the desktop nav bar and the drawer.
 *
 * Signing out is destructive and unrecoverable from the user's side (the token
 * is discarded), so it is never one stray tap -- especially on a phone, where a
 * mis-tap near the bottom of the drawer would otherwise end the session.
 *
 * `children` renders the trigger, so each surface keeps its own styling (a nav
 * link on desktop, a full-width drawer row on mobile).
 */
export function LogoutButton({
  onLogout,
  busy,
  className,
  children,
}: {
  onLogout: () => void;
  busy: boolean;
  className?: string;
  children?: React.ReactNode;
}) {
  const [armed, setArmed] = useState(false);

  if (!armed) {
    return (
      <button type="button" onClick={() => setArmed(true)} disabled={busy} className={className}>
        {children ?? (busy ? "..." : "Logout")}
      </button>
    );
  }

  return (
    <span className="inline-flex items-center gap-2">
      <span className="text-sm" style={{ color: "var(--text-primary)" }}>
        Log out?
      </span>
      <button
        type="button"
        onClick={() => setArmed(false)}
        disabled={busy}
        className="drawer-confirm-btn"
      >
        Cancel
      </button>
      <button
        type="button"
        onClick={onLogout}
        disabled={busy}
        className="drawer-confirm-btn danger"
      >
        {busy ? "Logging out…" : "Logout"}
      </button>
    </span>
  );
}

/** Drawer row variant: icon plus label, matching the other drawer links. */
export function DrawerLogoutButton({
  onLogout,
  busy,
  className,
}: {
  onLogout: () => void;
  busy: boolean;
  className: string;
}) {
  const [armed, setArmed] = useState(false);

  if (!armed) {
    return (
      <button
        type="button"
        onClick={() => setArmed(true)}
        disabled={busy}
        className={className}
      >
        <LogOut size={18} aria-hidden="true" /> Logout
      </button>
    );
  }

  return (
    <div className="px-3 py-2" role="group" aria-label="Confirm logout">
      <p className="text-sm" style={{ color: "var(--text-primary)" }}>
        Log out of AstroSeva?
      </p>
      <div className="flex gap-2 mt-2.5">
        <button
          type="button"
          onClick={() => setArmed(false)}
          disabled={busy}
          className="drawer-confirm-btn"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onLogout}
          disabled={busy}
          className="drawer-confirm-btn danger"
        >
          {busy ? "Logging out…" : "Logout"}
        </button>
      </div>
    </div>
  );
}