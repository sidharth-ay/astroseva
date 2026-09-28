"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import {
  api,
  AUTH_CHANGE_EVENT,
  clearSession,
  getStoredUser,
  getToken,
  type AuthUser,
} from "@/lib/api";

/**
 * Minimal auth state for components outside the AuthGate (e.g. the Navbar's
 * logout control). There is no auth context in this app, so the session is
 * read straight from localStorage and observed as an external store.
 */
function subscribe(callback: () => void) {
  // Same-tab login/logout.
  window.addEventListener(AUTH_CHANGE_EVENT, callback);
  // Other tabs, plus manual localStorage edits in DevTools.
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(AUTH_CHANGE_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

// A primitive snapshot (string) is used deliberately: useSyncExternalStore
// compares snapshots by identity, so returning a fresh object each call would
// loop forever. Strings compare by value, so this is both stable and cheap.
function getSnapshot(): string {
  const token = getToken();
  if (!token) return "";
  const user = getStoredUser();
  return user ? JSON.stringify(user) : "";
}

// localStorage does not exist during SSR, so the server always sees no user.
function getServerSnapshot(): string {
  return "";
}

export function useAuth() {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const user = useMemo(
    () => (snapshot ? (JSON.parse(snapshot) as AuthUser) : null),
    [snapshot]
  );

  const logout = useCallback(async () => {
    try {
      // Server-side revocation: bumps token_version so the JWT stops working
      // immediately instead of lingering until it expires.
      await api.logout();
    } catch {
      // Already invalid or offline -- clear locally regardless.
    }
    clearSession();
  }, []);

  return { user, logout };
}
