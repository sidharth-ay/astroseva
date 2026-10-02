"use client";

import { useState, useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { api, getToken, clearSession } from "@/lib/api";

// Routes usable WITHOUT logging in. Everything else requires a session.
const PUBLIC_PATHS = new Set(["/", "/login", "/terms", "/privacy", "/refund", "/grievance"]);

// The token last validated via /me, plus when it was validated. The TTL is
// essential, not an optimisation: a bare token fingerprint was trusted for the
// whole life of the page, so a long-expired session kept rendering protected
// pages without ever re-checking. 60s keeps the "don't re-hit /me on every
// nav click" win while bounding how stale the decision can get.
const VALIDATION_TTL_MS = 60_000;
let validated: { token: string; at: number } | null = null;

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const checking = useRef(false);

  // Everything the effect used to decide synchronously lives here instead, so
  // the effect below only performs the one thing effects are for: the async
  // validation request. `getToken` is safe to call during render -- it guards
  // the server case itself and returns null there, which decides "undecided".
  const decide = (path: string): boolean | null => {
    if (PUBLIC_PATHS.has(path)) return true;
    const tok = getToken();
    if (tok && validated && validated.token === tok && Date.now() - validated.at < VALIDATION_TTL_MS) {
      return true;
    }
    return null;
  };

  // Decided on first render and re-decided during render on navigation, rather
  // than after an effect round-trip. Public pages and recently validated
  // sessions render immediately with no shimmer flash; anything else starts
  // undecided and goes through the token check in the effect below.
  const [allowed, setAllowed] = useState<boolean | null>(() => decide(pathname));
  const [prevPath, setPrevPath] = useState(pathname);
  if (prevPath !== pathname) {
    setPrevPath(pathname);
    setAllowed(decide(pathname));
  }

  useEffect(() => {
    if (allowed !== null) return;
    const tok = getToken();
    if (!tok) {
      validated = null;
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
      return;
    }
    if (checking.current) return;
    checking.current = true;
    api
      .getMe()
      .then(() => {
        validated = { token: getToken() ?? "", at: Date.now() };
        setAllowed(true);
      })
      .catch(() => {
        validated = null;
        clearSession();
        setAllowed(false);
        router.replace(`/login?next=${encodeURIComponent(pathname)}`);
      })
      .finally(() => {
        checking.current = false;
      });
  }, [pathname, router, allowed]);

  if (!allowed) {
    return (
      <div className="max-w-5xl mx-auto px-5 py-16">
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass-card p-6">
              <div className="shimmer h-20 w-full rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
