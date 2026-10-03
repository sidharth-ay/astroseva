"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, Sun, X, User as UserIcon } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useAuth } from "@/hooks/useAuth";

// Seven primary destinations. Home is the logo mark itself, which keeps the
// bar uncrowded at every width; the review queue appends for staff roles.
const navLinks = [
  { href: "/kundli", label: "Kundli" },
  { href: "/horoscope", label: "Horoscope" },
  { href: "/panchang", label: "Panchang" },
  { href: "/doshas", label: "Dosha" },
  { href: "/remedies", label: "Remedies" },
  { href: "/astrologers", label: "Consultation" },
  { href: "/academy", label: "Learn" },
];

// Role-gated entries. Only the review queue appears here, and only to
// reviewers and admins.
//
// The applicant dashboard used to be shown to every logged-in user, which meant
// the marketplace was one click away for anyone. The entry point is now a
// single card on /services, which relabels itself once someone has applied, so
// there is no need to advertise the dashboard to people with no application.
function roleLinks(role?: string) {
  if (role === "reviewer" || role === "admin") {
    return [{ href: "/admin/astrologers", label: "Review Queue" }];
  }
  return [];
}

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    setBusy(true);
    await logout();
    setOpen(false);
    window.location.replace("/login");
    setBusy(false);
  };

  return (
    <nav
      className="navbar-dark sticky top-0 z-50"
      style={{
        /* No bottom border: the bar is the same midnight as the hero it sits
           on, so the two read as one continuous band rather than a chrome
           strip bolted above the page. */
        background: "var(--midnight)",
      }}
    >
      <div className="max-w-6xl mx-auto px-5">
        <div className="flex items-center justify-between h-14">
          <Link href="/" className="flex items-center gap-2 group" aria-label="AstroSeva home">
            <span
              className="flex items-center justify-center w-7 h-7 rounded-full transition-transform duration-200 group-hover:scale-105"
              style={{ background: "var(--gold)" }}
            >
              <Sun size={15} style={{ color: "var(--midnight)" }} />
            </span>
            <span className="text-lg font-display font-semibold" style={{ color: "var(--gold)" }}>
              AstroSeva
            </span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-0.5">
            {navLinks.map((link) => {
              const active = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
              return (
                <Link key={link.href} href={link.href} className={`nav-link ${active ? "active" : ""}`}>
                  {link.label}
                </Link>
              );
            })}
            {user &&
              roleLinks(user.role).map((link) => {
                const active = pathname.startsWith(link.href);
                return (
                  <Link key={link.href} href={link.href} className={`nav-link ${active ? "active" : ""}`}>
                    {link.label}
                  </Link>
                );
              })}
          </div>

          {/* Sign in + Get Started */}
          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-2">
                <Link href="/profile" className="nav-link inline-flex items-center gap-1.5" title="My Profile">
                  <UserIcon size={14} />
                  Profile
                </Link>
                <button
                  onClick={handleLogout}
                  disabled={busy}
                  className="nav-link"
                  title="Logout"
                >
                  {busy ? "..." : "Logout"}
                </button>
              </div>
            ) : (
              <Link href="/login" className="nav-link">
                Sign in
              </Link>
            )}
            <Link href="/kundli" className="btn-gold-pill">
              Get Started
            </Link>
          </div>

          {/* Mobile toggle */}
          <button
            onClick={() => setOpen(!open)}
            className="md:hidden p-2 rounded-lg transition-colors"
            style={{ color: "var(--on-dark-dim)" }}
            aria-label="Toggle navigation"
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile nav */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="md:hidden overflow-hidden"
            style={{ borderTop: "1px solid rgba(245, 241, 232, 0.12)" }}
          >
            <div className="mobile-panel px-4 py-2 space-y-0.5">
              {navLinks.map((link) => {
                const active = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
                return (
                  <Link key={link.href} href={link.href} onClick={() => setOpen(false)}
                    className={`nav-link block ${active ? "active" : ""}`}>
                    {link.label}
                  </Link>
                );
              })}
              {user &&
                roleLinks(user.role).map((link) => {
                  const active = pathname.startsWith(link.href);
                  return (
                    <Link key={link.href} href={link.href} onClick={() => setOpen(false)}
                      className={`nav-link block ${active ? "active" : ""}`}>
                      {link.label}
                    </Link>
                  );
                })}
              <div className="pt-2 pb-1 space-y-2">
                {user ? (
                  <>
                    <Link
                      href="/profile"
                      onClick={() => setOpen(false)}
                      className="btn-gold-pill block text-center w-full"
                    >
                      My Profile
                    </Link>
                    <button
                      onClick={handleLogout}
                      disabled={busy}
                      className="nav-link block text-center w-full"
                    >
                      {busy ? "Logging out…" : `Logout (${user.name || user.email})`}
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      href="/login"
                      onClick={() => setOpen(false)}
                      className="nav-link block text-center"
                    >
                      Sign in
                    </Link>
                    <Link
                      href="/kundli"
                      onClick={() => setOpen(false)}
                      className="btn-gold-pill block text-center"
                    >
                      Get Started
                    </Link>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
