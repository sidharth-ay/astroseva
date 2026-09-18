"use client";

import { useState, useEffect } from "react";

export default function LoadCurtain() {
  const [visible, setVisible] = useState(true);
  const [sliding, setSliding] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setSliding(true), 1600);
    const t2 = setTimeout(() => setVisible(false), 2300);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  if (!visible) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9998,
        background: "var(--bg-primary)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        transition: "transform 0.65s cubic-bezier(0.76, 0, 0.24, 1), opacity 0.4s ease 0.3s",
        transform: sliding ? "translateY(-100%)" : "translateY(0)",
        opacity: sliding ? 0 : 1,
      }}
    >
      <div style={{
        width: 64,
        height: 64,
        borderRadius: 16,
        background: "linear-gradient(135deg, var(--accent-deep), var(--accent))",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 28,
        marginBottom: 20,
        boxShadow: "0 0 40px rgba(100,85,180,0.3)",
        animation: "curtain-logo-pulse 1.2s ease-in-out infinite",
      }}>
        {'\u2728'}
      </div>
      <div style={{
        fontSize: 36,
        fontWeight: 700,
        letterSpacing: "0.02em",
        background: "linear-gradient(135deg, #c9a96e, #d4b87a, #b8944e, #a07c3a, #c9a96e)",
        backgroundSize: "200% auto",
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent",
        backgroundClip: "text",
        animation: "gradient-shift 3s ease-in-out infinite",
      }}>
        AstroSeva
      </div>
    </div>
  );
}
