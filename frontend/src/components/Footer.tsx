"use client";

import Link from "next/link";
import { Sparkles } from "lucide-react";

export default function Footer() {
  return (
    <footer className="mt-auto">
      <div
        className="h-[2px] w-full"
        style={{
          background:
            "linear-gradient(90deg, transparent, #C8956D, transparent)",
        }}
      />
      <div style={{ background: "rgba(10, 10, 15, 0.95)" }}>
        <div className="max-w-6xl mx-auto px-5 py-14">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
            {/* Logo + Tagline */}
            <div>
              <div className="flex items-center gap-2.5 mb-4">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ background: "#C8956D" }}
                >
                  <Sparkles size={14} color="var(--ivory)" />
                </div>
                <h3 className="font-bold text-lg font-display text-gradient-gold">
                  AstroSeva
                </h3>
              </div>
              <p
                className="text-sm leading-relaxed"
                style={{ color: "var(--text-secondary)" }}
              >
                Free Vedic Astrology platform. Accurate Kundli, matching,
                predictions, and more.
              </p>
            </div>

            {/* Services */}
            <div>
              <h4
                className="mb-4 text-xs font-bold uppercase tracking-widest"
                style={{ color: "var(--text-primary)" }}
              >
                Services
              </h4>
              <ul className="space-y-2.5 text-sm">
                {[
                  { href: "/kundli", label: "Kundli Generator" },
                  { href: "/matching", label: "Marriage Matching" },
                  { href: "/horoscope", label: "Daily Horoscope" },
                  { href: "/predictions", label: "AI Predictions" },
                ].map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      className="transition-colors duration-200"
                      style={{ color: "var(--text-secondary)" }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.color = "#C8956D")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.color = "var(--text-secondary)")
                      }
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Links */}
            <div>
              <h4
                className="mb-4 text-xs font-bold uppercase tracking-widest"
                style={{ color: "var(--text-primary)" }}
              >
                Links
              </h4>
              <ul className="space-y-2.5 text-sm">
                {[
                  { href: "/numerology", label: "Numerology" },
                  { href: "/panchang", label: "Panchang" },
                  { href: "/services", label: "All Services" },
                  { href: "/chat", label: "AI Astrologer" },
                ].map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      className="transition-colors duration-200"
                      style={{ color: "var(--text-secondary)" }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.color = "#C8956D")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.color = "var(--text-secondary)")
                      }
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Contact Us */}
            <div>
              <h4
                className="mb-4 text-xs font-bold uppercase tracking-widest"
                style={{ color: "var(--text-primary)" }}
              >
                Contact Us
              </h4>
              <ul className="space-y-2.5 text-sm">
                <li>
                  <Link
                    href="mailto:info@astroseva.com"
                    className="transition-colors duration-200"
                    style={{ color: "var(--text-secondary)" }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.color = "#C8956D")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.color = "var(--text-secondary)")
                    }
                  >
                    info@astroseva.com
                  </Link>
                </li>
                <li>
                  <Link
                    href="https://facebook.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="transition-colors duration-200"
                    style={{ color: "var(--text-secondary)" }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.color = "#C8956D")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.color = "var(--text-secondary)")
                    }
                  >
                    Facebook
                  </Link>
                </li>
                <li>
                  <Link
                    href="https://twitter.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="transition-colors duration-200"
                    style={{ color: "var(--text-secondary)" }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.color = "#C8956D")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.color = "var(--text-secondary)")
                    }
                  >
                    Twitter
                  </Link>
                </li>
                <li>
                  <Link
                    href="https://instagram.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="transition-colors duration-200"
                    style={{ color: "var(--text-secondary)" }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.color = "#C8956D")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.color = "var(--text-secondary)")
                    }
                  >
                    Instagram
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom bar */}
          <div
            className="mt-12 pt-6 text-center text-xs"
            style={{
              borderTop: "1px solid rgba(255,255,255,0.08)",
              color: "var(--text-tertiary)",
            }}
          >
            <p>
              AstroSeva &mdash; Vedic Astrology Platform. For educational
              purposes only. &copy; {new Date().getFullYear()}
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
