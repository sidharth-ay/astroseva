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
    <nav className="sticky top-0 z-50 border-b border-[var(--border)]"
      style={{
        background: "rgba(5, 5, 16, 0.8)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
      }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg"
              style={{ background: "linear-gradient(135deg, var(--accent-deep), #6d28d9)" }}>
              &#x2728;
            </div>
            <span className="text-xl font-bold" style={{ color: "var(--gold)" }}>AstroSeva</span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const active = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
              return (
                <Link key={link.href} href={link.href}
                  className={`px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                    active
                      ? "text-white bg-white/10"
                      : "text-white/50 hover:text-white hover:bg-white/5"
                  }`}
                  style={active ? { boxShadow: "0 0 15px rgba(147,51,234,0.2)" } : {}}>
                  {link.label}
                </Link>
              );
            })}
          </div>

          {/* Mobile toggle */}
          <button onClick={() => setOpen(!open)}
            className="md:hidden text-white/60 hover:text-white p-2 rounded-lg transition-colors"
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
      {open && (
        <div className="md:hidden border-t border-[var(--border)] animate-fade-in"
          style={{ background: "rgba(5, 5, 16, 0.95)" }}>
          <div className="px-4 py-3 space-y-1">
            {navLinks.map((link) => {
              const active = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
              return (
                <Link key={link.href} href={link.href} onClick={() => setOpen(false)}
                  className={`block px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                    active
                      ? "text-white bg-white/10"
                      : "text-white/50 hover:text-white hover:bg-white/5"
                  }`}>
                  {link.label}
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </nav>
  );
}
