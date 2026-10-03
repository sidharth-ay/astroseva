"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  Bell,
  Bookmark,
  Brain,
  Briefcase,
  Calendar,
  CalendarClock,
  CalendarDays,
  CalendarRange,
  ChevronDown,
  Clock,
  Compass,
  FileText,
  GraduationCap,
  Heart,
  HeartHandshake,
  Hourglass,
  Leaf,
  LifeBuoy,
  Lock,
  LogIn,
  LogOut,
  MessagesSquare,
  Newspaper,
  Orbit,
  PenTool,
  Search,
  Settings,
  ShieldAlert,
  Sparkles,
  Star,
  Sun,
  Sunrise,
  User,
  UserPlus,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { useReducedMotion } from "@/lib/motion";
import type { AuthUser } from "@/lib/api";

export interface DrawerLink {
  href: string;
  label: string;
  Icon: LucideIcon;
  badge?: string;
}

export interface DrawerSection {
  id: string;
  title: string;
  links: DrawerLink[];
}

/**
 * The complete astrology index. Every href below must resolve to a real page
 * -- `nav-structure.test.ts` walks the route tree and fails the suite if one
 * does not. Items with no honest destination (notes, birth-time rectification,
 * FAQs, a consultation split the data does not have) are omitted on purpose
 * rather than linked at the nearest page; see the commit message.
 */
export const NAV_SECTIONS: DrawerSection[] = [
  {
    id: "mine",
    title: "My Astrology",
    links: [
      { href: "/profile", label: "My Profile", Icon: User },
      { href: "/saved-charts", label: "My Saved Kundlis", Icon: Bookmark },
      { href: "/reports", label: "My Reports", Icon: FileText },
      { href: "/remedies", label: "My Remedies", Icon: Leaf },
    ],
  },
  {
    id: "astrology",
    title: "Astrology",
    links: [
      { href: "/kundli", label: "Kundli", Icon: Sparkles },
      { href: "/horoscope", label: "Horoscope", Icon: Sun },
      { href: "/matching", label: "Kundli Matching", Icon: Heart },
      { href: "/panchang", label: "Panchang", Icon: CalendarDays },
      { href: "/panchang", label: "Muhurat", Icon: Clock },
      { href: "/doshas", label: "Dosha Check", Icon: ShieldAlert },
      { href: "/kundli", label: "Dasha", Icon: Hourglass },
      { href: "/kundli", label: "Nakshatra", Icon: Star },
      { href: "/transit", label: "Planetary Analysis", Icon: Orbit },
      { href: "/remedies", label: "Remedies", Icon: Leaf },
    ],
  },
  {
    id: "predictions",
    title: "Predictions",
    links: [
      { href: "/horoscope?tab=Daily", label: "Daily Horoscope", Icon: Sunrise },
      { href: "/horoscope?tab=Weekly", label: "Weekly Horoscope", Icon: CalendarRange },
      { href: "/horoscope?tab=Monthly", label: "Monthly Horoscope", Icon: Calendar },
      { href: "/horoscope?tab=Yearly", label: "Yearly Horoscope", Icon: CalendarClock },
      { href: "/predictions", label: "Life Predictions", Icon: Compass },
      { href: "/predictions?category=career", label: "Career", Icon: Briefcase },
      { href: "/love-match", label: "Love & Relationships", Icon: HeartHandshake },
      { href: "/predictions?category=finance", label: "Finance", Icon: Wallet },
    ],
  },
  {
    id: "tools",
    title: "Astrology Tools",
    links: [
      { href: "/kundli", label: "Kundli Generator", Icon: PenTool },
      { href: "/matching", label: "Kundli Matching", Icon: Heart },
      { href: "/doshas", label: "Dosha Analysis", Icon: ShieldAlert },
      { href: "/kundli", label: "Dasha Analysis", Icon: Hourglass },
      { href: "/love-match", label: "Compatibility", Icon: Users },
      { href: "/ai", label: "AI Astrology", Icon: Brain, badge: "AI" },
    ],
  },
  {
    id: "consult",
    title: "Consultation",
    links: [
      { href: "/astrologers", label: "Find an Astrologer", Icon: Search },
      { href: "/photo-consult", label: "My Consultations", Icon: MessagesSquare },
    ],
  },
  {
    id: "resources",
    title: "Resources",
    links: [
      { href: "/academy", label: "Learning Center", Icon: GraduationCap },
      { href: "/academy", label: "Astrology Articles", Icon: Newspaper },
    ],
  },
];

export function isActiveLink(pathname: string, href: string): boolean {
  // Query strings (?tab=, ?category=) select state on the destination page;
  // the active trail follows the path beneath them.
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

export default function NavDrawer({ open, onClose, user, onLogout, logoutBusy }: NavDrawerProps) {
  const pathname = usePathname();
  const reduced = useReducedMotion();
  const panelRef = useRef<HTMLElement | null>(null);

  // Desktop opens with every section expanded. On a phone the drawer is a
  // full-width overlay, so six expanded sections would bury the footer --
  // there only the active trail (or the first section) starts open.
  const [openSections, setOpenSections] = useState<Set<string>>(
    () => new Set(NAV_SECTIONS.map((s) => s.id)),
  );

  useEffect(() => {
    if (window.innerWidth < 768) {
      const active = NAV_SECTIONS.filter((s) =>
        s.links.some((l) => isActiveLink(pathname, l.href)),
      ).map((s) => s.id);
      // Collapsing on small screens on mount is what effects are for; the
      // server and the first client render agree (all open), so hydration
      // stays clean and the collapse lands before paint.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOpenSections(new Set(active.length > 0 ? active : [NAV_SECTIONS[0].id]));
    }
  }, [pathname]);

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

  const toggleSection = (id: string) =>
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

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
              <p className="text-xs mt-1.5" style={{ color: "var(--text-tertiary)" }}>
                Your personal astrology workspace
              </p>
              {user && (
                <Link
                  href="/profile"
                  onClick={close()}
                  className="flex items-center gap-3 mt-4 rounded-lg"
                >
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
                  <span className="text-xs font-semibold shrink-0" style={{ color: "var(--accent-text)" }}>
                    View Profile →
                  </span>
                </Link>
              )}
            </div>

            <div className="drawer-divider" />

            <div className="drawer-scroll px-2 py-2">
              {NAV_SECTIONS.map((section) => {
                const expanded = openSections.has(section.id);
                return (
                  <div key={section.id}>
                    <button
                      type="button"
                      className="drawer-sec-btn"
                      aria-expanded={expanded}
                      aria-controls={`drawer-sec-${section.id}`}
                      onClick={() => toggleSection(section.id)}
                    >
                      {section.title}
                      <ChevronDown size={16} aria-hidden="true" />
                    </button>
                    <div
                      id={`drawer-sec-${section.id}`}
                      className={`drawer-sub${expanded ? " open" : ""}`}
                    >
                      <div>
                        {section.links.map((link) => {
                          const active = isActiveLink(pathname, link.href);
                          return (
                            <Link
                              key={`${section.id}-${link.label}`}
                              href={link.href}
                              onClick={close()}
                              aria-current={active ? "page" : undefined}
                              className={`drawer-link${active ? " active" : ""}`}
                            >
                              <link.Icon size={17} aria-hidden="true" />
                              {link.label}
                              {link.badge && (
                                <span className="drawer-badge-ai">{link.badge}</span>
                              )}
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="drawer-footer px-2 py-2">
              {user ? (
                <>
                  <Link href="/profile" onClick={close()} className="drawer-link">
                    <User size={17} aria-hidden="true" /> Profile
                  </Link>
                  <Link href="/settings" onClick={close()} className="drawer-link">
                    <Settings size={17} aria-hidden="true" /> Settings
                  </Link>
                  <button
                    type="button"
                    onClick={onLogout}
                    disabled={logoutBusy}
                    className="drawer-link w-full text-left"
                  >
                    <LogOut size={17} aria-hidden="true" /> {logoutBusy ? "Logging out…" : "Logout"}
                  </button>
                </>
              ) : (
                <>
                  <Link href="/login" onClick={close()} className="drawer-link">
                    <LogIn size={17} aria-hidden="true" /> Login
                  </Link>
                  <Link href="/login?mode=register" onClick={close()} className="drawer-link">
                    <UserPlus size={17} aria-hidden="true" /> Create Account
                  </Link>
                </>
              )}
              <div className="drawer-divider my-1" />
              <Link href="/notifications" onClick={close()} className="drawer-link">
                <Bell size={17} aria-hidden="true" /> Notifications
              </Link>
              <Link href="/grievance" onClick={close()} className="drawer-link">
                <LifeBuoy size={17} aria-hidden="true" /> Help &amp; Support
              </Link>
              <Link href="/privacy" onClick={close()} className="drawer-link">
                <Lock size={17} aria-hidden="true" /> Privacy
              </Link>
            </div>
          </motion.nav>
        </>
      )}
    </AnimatePresence>
  );
}
