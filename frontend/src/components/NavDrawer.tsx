"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  Bell,
  LifeBuoy,
  LogIn,
  ShieldAlert,
  Sparkles,
  Sun,
  Settings,
  User,
  UserPlus,
  Leaf,
  type LucideIcon,
} from "lucide-react";
import { useReducedMotion } from "@/lib/motion";
import { DrawerLogoutButton } from "@/components/LogoutButton";
import type { AuthUser } from "@/lib/api";

export interface DrawerLink {
  href: string;
  label: string;
  Icon: LucideIcon;
}

export interface DrawerSection {
  id: string;
  title: string;
  links: DrawerLink[];
}

/**
 * The account menu: nine destinations, no accordions, no subsections.
 *
 * This replaced a six-section index that repeated the same pages under four
 * different names ("Kundli", "Kundli Generator", "Dasha" and "Nakshatra" all
 * pointed at /kundli), so a user could not tell which entry did what. Every
 * item below is a distinct destination and each href must resolve to a real
 * page -- `nav-structure.test.ts` walks the route tree and fails the suite if
 * one stops existing.
 *
 * Notifications carries no unread badge on purpose: there is no notification
 * data behind it yet, and a badge that counts nothing is worse than no badge.
 */
export const NAV_SECTIONS: DrawerSection[] = [
  {
    id: "astrology",
    title: "Astrology",
    links: [
      { href: "/kundli", label: "My Kundali", Icon: Sparkles },
      { href: "/profile", label: "Profile", Icon: User },
      { href: "/horoscope", label: "Horoscope", Icon: Sun },
      { href: "/doshas", label: "Dosha Check", Icon: ShieldAlert },
      { href: "/remedies", label: "Remedies", Icon: Leaf },
    ],
  },
  {
    id: "account",
    title: "Account",
    links: [
      { href: "/notifications", label: "Notifications", Icon: Bell },
      { href: "/help", label: "Help & Support", Icon: LifeBuoy },
      { href: "/settings", label: "Settings", Icon: Settings },
    ],
  },
];

/** The one action that is not navigation, kept apart from the nine links. */
export const LOGOUT_LABEL = "Logout";

/** Flat order the drawer renders, used by the structure test. */
export const NAV_ITEMS: string[] = NAV_SECTIONS.flatMap((s) => s.links.map((l) => l.label));

export function isActiveLink(pathname: string, href: string): boolean {
  const base = href.split("?")[0];
  return base === "/" ? pathname === "/" : pathname === base || pathname.startsWith(`${base}/`);
}

interface NavDrawerProps {
  open: boolean;
  onClose: (opts?: { refocus?: boolean }) => void;
  user: AuthUser | null;
  onLogout: () => void;
  logoutBusy: boolean;
}

/**
 * Logout, behind a confirmation. The state lives in this child of the drawer
 * panel, so it is destroyed the moment the drawer closes: reopening after a
 * cancelled logout can never come back already armed.
 */
function LogoutRow({ onLogout, logoutBusy }: { onLogout: () => void; logoutBusy: boolean }) {
  return (
    <DrawerLogoutButton
      onLogout={onLogout}
      busy={logoutBusy}
      className="drawer-link w-full text-left"
    />
  );
}

export default function NavDrawer({ open, onClose, user, onLogout, logoutBusy }: NavDrawerProps) {
  const pathname = usePathname();
  const reduced = useReducedMotion();
  const panelRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.querySelector<HTMLElement>("button, a[href]")?.focus();
    // `onClose` is a stable callback from the navbar, so this effect does not
    // re-subscribe on every render.
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose({ refocus: true });
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  const close = (refocus = false) => () => onClose(refocus ? { refocus: true } : undefined);
  const anim = (ms: number) => ({ duration: reduced ? 0 : ms / 1000, ease: [0.16, 1, 0.3, 1] as const });

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="drawer-backdrop"
            aria-hidden="true"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={anim(250)}
            onClick={() => onClose({ refocus: true })}
          />
          <motion.nav
            ref={panelRef}
            id="site-drawer"
            aria-label="Site navigation"
            className="drawer-panel"
            initial={{ x: "-102%" }}
            animate={{ x: 0 }}
            exit={{ x: "-102%" }}
            transition={anim(300)}
          >
            <div className="px-5 pt-5 pb-4">
              <div className="flex items-center gap-2">
                <span
                  className="flex items-center justify-center w-7 h-7 rounded-full"
                  style={{ background: "var(--gold)" }}
                >
                  <Sun size={15} style={{ color: "var(--midnight)" }} />
                </span>
                <span className="text-lg font-display font-semibold" style={{ color: "var(--gold)" }}>
                  AstroSeva
                </span>
              </div>
              {user && (
                <div className="flex items-center gap-3 mt-4">
                  <span
                    className="flex shrink-0 items-center justify-center w-10 h-10 rounded-full font-display text-base"
                    style={{ background: "rgba(201, 162, 39, 0.12)", color: "var(--accent-text)", fontWeight: 600 }}
                    aria-hidden="true"
                  >
                    {(user.name ?? user.email).trim().charAt(0).toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold truncate" style={{ color: "var(--text-primary)" }}>
                      {user.name || user.email}
                    </span>
                    <span className="block text-xs truncate" style={{ color: "var(--text-tertiary)" }}>
                      {user.email}
                    </span>
                  </span>
                </div>
              )}
            </div>

            <div className="drawer-divider" />

            <div className="drawer-scroll px-2 py-3">
              {NAV_SECTIONS.map((section) => (
                <div key={section.id} className="mb-1">
                  <p className="drawer-group-label">{section.title}</p>
                  {section.links.map((link) => {
                    const active = isActiveLink(pathname, link.href);
                    return (
                      <Link
                        key={link.href}
                        href={link.href}
                        onClick={close()}
                        aria-current={active ? "page" : undefined}
                        className={`drawer-link${active ? " active" : ""}`}
                      >
                        <link.Icon size={18} aria-hidden="true" />
                        {link.label}
                      </Link>
                    );
                  })}
                </div>
              ))}

              <div className="drawer-divider my-3" />

              {user ? (
                <LogoutRow onLogout={onLogout} logoutBusy={logoutBusy} />
              ) : (
                <>
                  <Link href="/login" onClick={close()} className="drawer-link">
                    <LogIn size={18} aria-hidden="true" /> Login
                  </Link>
                  <Link href="/login?mode=register" onClick={close()} className="drawer-link">
                    <UserPlus size={18} aria-hidden="true" /> Create Account
                  </Link>
                </>
              )}
            </div>
          </motion.nav>
        </>
      )}
    </AnimatePresence>
  );
}