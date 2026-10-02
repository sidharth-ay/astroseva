"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";

const KEY = "astroseva_age_ok";

export default function AgeGate() {
  const [show, setShow] = useState(false);

  // Deliberately NOT a lazy initializer: on the server there is no
  // localStorage, so an initializer would render the overlay into the
  // prerendered HTML and hydration would disagree with the client, leaving
  // AnimatePresence stuck showing the gate over a consented session. Reading
  // the stored choice after mount -- assuming no gate until proven otherwise
  // -- is the correct progressive enhancement here.
  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (!localStorage.getItem(KEY)) setShow(true);
    } catch {
      setShow(true);
    }
  }, []);

  const confirm = () => {
    try {
      localStorage.setItem(KEY, "1");
    } catch { /* ignore */ }
    setShow(false);
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-0 z-[200] flex items-center justify-center px-5"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)" }}
        >
          <motion.div
            className="glass-card p-6 max-w-sm w-full text-center"
            initial={{ scale: 0.95, y: 10 }}
            animate={{ scale: 1, y: 0 }}
          >
            <h2 className="heading-display text-xl font-bold mb-2">
              Welcome to <span className="text-gradient-gold">AstroSeva</span>
            </h2>
            <p className="text-sm mb-5" style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}>
              AstroSeva is intended for users aged 18 and above. Please confirm
              you meet this requirement to continue.
            </p>
            <button onClick={confirm} className="btn-primary w-full">
              I am 18 or older — Enter
            </button>
            <p className="text-xs mt-3" style={{ color: "var(--text-tertiary)" }}>
              Astrology content is for educational purposes only.
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
