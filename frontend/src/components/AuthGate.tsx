"use client";

import { useState, useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { api, getToken, clearSession } from "@/lib/api";

// Routes usable WITHOUT logging in. Everything else requires a session.
const PUBLIC_PATHS = new Set(["/", "/login", "/terms", "/privacy", "/refund", "/grievance"]);

// The exact token string last validated via /me. Comparing fingerprints
// (instead of a boolean) keeps login/logout working with no extra wiring:
// a fresh token after login always revalidates; a cleared token redirects.
let validatedToken: string | null | undefined = undefined;

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const pathname = usePathname();
  const router = useRouter();
  const checking = useRef(false);

  useEffect(() => {
    if (PUBLIC_PATHS.has(pathname)) {
      setAllowed(true);
      return;
    }
    const tok = getToken();
    if (!tok) {
      validatedToken = null;
      setAllowed(false);
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
      return;
    }
    if (validatedToken === tok) {
      setAllowed(true);
      return;
    }
    if (checking.current) return;
    checking.current = true;
    setAllowed(null);
    api
      .getMe()
      .then(() => {
        validatedToken = getToken();
        setAllowed(true);
      })
      .catch(() => {
        validatedToken = null;
        clearSession();
        setAllowed(false);
        router.replace(`/login?next=${encodeURIComponent(pathname)}`);
      })
      .finally(() => {
        checking.current = false;
      });
  }, [pathname, router]);

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
