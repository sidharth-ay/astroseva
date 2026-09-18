"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/kundli", label: "Kundli" },
  { href: "/matching", label: "Matching" },
  { href: "/horoscope", label: "Horoscope" },
  { href: "/predictions", label: "Predictions" },
  { href: "/numerology", label: "Numerology" },
  { href: "/panchang", label: "Panchang" },
  { href: "/ai", label: "AI Astrologer" },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <nav className="sticky top-0 z-50"
      style={{
        background: "rgba(3, 0, 20, 0.85)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        borderBottom: "1px solid var(--border)",
      }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg transition-transform duration-300 group-hover:scale-110"
              style={{ background: "linear-gradient(135deg, var(--accent-deep), #6d28d9)" }}>
              &#x2728;
            </div>
            <span className="text-xl font-bold text-gradient-gold">AstroSeva</span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const active = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
              return (
                <Link key={link.href} href={link.href}
                  className={`nav-link ${active ? "active" : ""}`}>
                  {link.label}
                </Link>
              );
            })}
          </div>

          {/* Mobile toggle */}
          <button onClick={() => setOpen(!open)}
            className="md:hidden text-white/60 hover:text-white p-2 rounded-lg transition-all duration-200 hover:bg-white/5"
            aria-label="Toggle navigation" aria-expanded={open}>
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {open ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile nav overlay */}
      <div className={`md:hidden overflow-hidden transition-all duration-300 ease-out ${open ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"}`}
        style={{ borderTop: open ? "1px solid var(--border)" : "none" }}>
        <div className="px-4 py-3 space-y-1" style={{ background: "rgba(3, 0, 20, 0.95)" }}>
          {navLinks.map((link) => {
            const active = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
            return (
              <Link key={link.href} href={link.href} onClick={() => setOpen(false)}
                className={`nav-link block ${active ? "active" : ""}`}>
                {link.label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
