"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X, Sparkles, User as UserIcon } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useAuth } from "@/hooks/useAuth";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/kundli", label: "Kundli" },
  { href: "/matching", label: "Matching" },
  { href: "/horoscope", label: "Horoscope" },
  { href: "/predictions", label: "Predictions" },
  { href: "/numerology", label: "Numerology" },
  { href: "/panchang", label: "Panchang" },
  { href: "/services", label: "Services" },
  { href: "/chat", label: "AI Chat" },
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
      className="sticky top-0 z-50"
      style={{
        background: "rgba(10, 10, 15, 0.92)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderBottom: "1px solid rgba(200, 149, 109, 0.12)",
      }}
    >
      <div className="max-w-6xl mx-auto px-5">
        <div className="flex items-center justify-between h-14">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="flex items-center justify-center transition-transform duration-200 group-hover:scale-105">
              <Sparkles size={20} color="#C8956D" />
            </div>
            <span className="text-lg font-display font-bold text-gradient-gold">AstroSeva</span>
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

          {/* CTA + logout */}
          <div className="hidden md:flex items-center gap-2">
            <Link href="/kundli" className="btn-primary inline-flex">
              Get Kundli
            </Link>
            {user && (
              <div className="flex items-center gap-2">
                <Link href="/profile" className="btn-ghost inline-flex items-center gap-1.5" title="My Profile">
                  <UserIcon size={14} />
                  Profile
                </Link>
                <button
                  onClick={handleLogout}
                  disabled={busy}
                  className="text-xs transition-colors hover:text-white"
                  style={{ color: "var(--text-tertiary)" }}
                  title="Logout"
                >
                  {busy ? "..." : "Logout"}
                </button>
              </div>
            )}
          </div>

          {/* Mobile toggle */}
          <button
            onClick={() => setOpen(!open)}
            className="md:hidden p-2 rounded-lg transition-colors"
            style={{ color: "var(--text-secondary)" }}
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
            style={{ borderTop: "1px solid rgba(200, 149, 109, 0.15)" }}
          >
            <div className="px-4 py-2 space-y-0.5" style={{ background: "rgba(10, 10, 15, 0.96)" }}>
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
              <div className="pt-2 pb-1">
                <Link
                  href="/kundli"
                  onClick={() => setOpen(false)}
                  className="btn-primary block text-center"
                >
                  Get Kundli
                </Link>
                {user && (
                  <div className="pt-2 pb-1 space-y-2">
                    <Link
                      href="/profile"
                      onClick={() => setOpen(false)}
                      className="btn-secondary block text-center w-full"
                    >
                      My Profile
                    </Link>
                    <button
                      onClick={handleLogout}
                      disabled={busy}
                      className="btn-ghost block text-center w-full"
                    >
                      {busy ? "Logging out…" : `Logout (${user.name || user.email})`}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
