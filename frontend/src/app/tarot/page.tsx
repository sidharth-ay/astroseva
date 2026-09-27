"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { RotateCcw } from "lucide-react";
import { api } from "@/lib/api";
import {
  useReducedMotion,
  staggerContainer,
  staggerItem,
  duration,
  ease,
} from "@/lib/motion";

const MAJOR_ARCANA = [
  { name: "The Fool", symbol: "0" },
  { name: "The Magician", symbol: "I" },
  { name: "The High Priestess", symbol: "II" },
  { name: "The Empress", symbol: "III" },
  { name: "The Emperor", symbol: "IV" },
  { name: "The Hierophant", symbol: "V" },
  { name: "The Lovers", symbol: "VI" },
  { name: "The Chariot", symbol: "VII" },
  { name: "Strength", symbol: "VIII" },
  { name: "The Hermit", symbol: "IX" },
  { name: "Wheel of Fortune", symbol: "X" },
  { name: "Justice", symbol: "XI" },
  { name: "The Hanged Man", symbol: "XII" },
  { name: "Death", symbol: "XIII" },
  { name: "Temperance", symbol: "XIV" },
  { name: "The Devil", symbol: "XV" },
  { name: "The Tower", symbol: "XVI" },
  { name: "The Star", symbol: "XVII" },
  { name: "The Moon", symbol: "XVIII" },
  { name: "The Sun", symbol: "XIX" },
  { name: "Judgement", symbol: "XX" },
  { name: "The World", symbol: "XXI" },
];

interface DrawnCard {
  index: number;
  name: string;
  symbol: string;
  position: "past" | "present" | "future";
  revealed: boolean;
}

export default function TarotPage() {
  const [deck] = useState(() => {
    const cards: { index: number; name: string; symbol: string }[] = [];
    for (let i = 0; i < 78; i++) {
      if (i < 22) {
        cards.push({ index: i, name: MAJOR_ARCANA[i].name, symbol: MAJOR_ARCANA[i].symbol });
      } else {
        const suits = ["Wands", "Cups", "Swords", "Pentacles"];
        const suit = suits[Math.floor((i - 22) / 14)];
        const num = ((i - 22) % 14) + 1;
        const numLabels = ["Ace", "2", "3", "4", "5", "6", "7", "8", "9", "10", "Page", "Knight", "Queen", "King"];
        cards.push({ index: i, name: `${numLabels[num - 1]} of ${suit}`, symbol: "" });
      }
    }
    return cards;
  });

  const [drawn, setDrawn] = useState<DrawnCard[]>([]);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [interpretation, setInterpretation] = useState("");
  const [loadingInterp, setLoadingInterp] = useState(false);
  const [error, setError] = useState("");
  const reduced = useReducedMotion();

  useEffect(() => {
    document.title = "Tarot Reading | AstroSeva";
  }, []);

  const drawCard = useCallback((index: number) => {
    if (selectedIndices.has(index) || drawn.length >= 3) return;
    const card = deck[index];
    const positions: ("past" | "present" | "future")[] = ["past", "present", "future"];
    const newDrawn: DrawnCard = {
      index,
      name: card.name,
      symbol: card.symbol,
      position: positions[drawn.length],
      revealed: false,
    };
    const newSelected = new Set(selectedIndices);
    newSelected.add(index);
    setSelectedIndices(newSelected);
    setDrawn((prev) => [...prev, newDrawn]);

    setTimeout(() => {
      setDrawn((prev) => prev.map((c) => c.index === index ? { ...c, revealed: true } : c));
    }, 600);
  }, [selectedIndices, drawn.length, deck]);

  useEffect(() => {
    if (drawn.length === 3 && drawn.every((c) => c.revealed) && !interpretation) {
      const fetchInterpretation = async () => {
        setLoadingInterp(true); setError("");
        try {
          const cardDesc = drawn.map((c) => `${c.position}: ${c.name}`).join(", ");
          const res = await api.chatSend(
            `You are an expert tarot reader. The user drew three cards:\n${cardDesc}\n\nProvide a detailed tarot reading interpretation covering past, present, and future aspects. Be insightful and empowering.`,
            [], "en"
          );
          setInterpretation(res.response);
        } catch (e) { setError(e instanceof Error ? e.message : "Failed to get interpretation."); }
        finally { setLoadingInterp(false); }
      };
      fetchInterpretation();
    }
  }, [drawn, interpretation]);

  const reset = () => {
    setDrawn([]);
    setSelectedIndices(new Set());
    setInterpretation("");
    setError("");
  };

  const positionLabels = { past: "Past", present: "Present", future: "Future" };

  return (
    <div className="max-w-5xl mx-auto px-5 py-10">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <h1 className="heading-display text-2xl md:text-3xl mb-1">
          Tarot <span className="text-gradient-gold">Reading</span>
        </h1>
        <p className="text-sm mb-2" style={{ color: "var(--text-secondary)" }}>
          Draw three cards to reveal your past, present, and future
        </p>
        <p className="text-xs mb-8" style={{ color: "var(--text-tertiary)" }}>
          {drawn.length}/3 cards drawn
        </p>
      </motion.div>

      {/* Drawn Cards Display */}
      {drawn.length > 0 && (
        <motion.div
          className="flex justify-center gap-4 md:gap-6 mb-8"
          variants={staggerContainer}
          initial={reduced ? false : "hidden"}
          animate="visible"
        >
          {drawn.map((card) => (
            <motion.div key={card.index} variants={staggerItem} className="text-center">
              <div className="text-[10px] uppercase tracking-wider mb-2 font-semibold" style={{ color: "#C8956D" }}>
                {positionLabels[card.position]}
              </div>
              <div className="relative w-28 h-44 md:w-36 md:h-52" style={{ perspective: "800px" }}>
                <AnimatePresence mode="wait">
                  {!card.revealed ? (
                    <motion.div
                      key="back"
                      className="absolute inset-0 rounded-xl flex items-center justify-center"
                      style={{
                        background: "linear-gradient(135deg, #C8956D 0%, #a07450 50%, #C8956D 100%)",
                        border: "2px solid rgba(200, 149, 109, 0.5)",
                        boxShadow: "0 4px 20px rgba(200, 149, 109, 0.3)",
                      }}
                      initial={{ rotateY: 0 }}
                      exit={{ rotateY: 90 }}
                      transition={{ duration: 0.3 }}
                    >
                      <div className="text-center">
                        <div className="text-3xl md:text-4xl opacity-30">✦</div>
                        <div className="text-[9px] mt-1 opacity-40 font-medium" style={{ color: "#fff" }}>TAROT</div>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="front"
                      className="absolute inset-0 rounded-xl p-3 flex flex-col items-center justify-center"
                      style={{
                        background: "var(--bg-surface)",
                        border: "1px solid var(--border)",
                        boxShadow: "0 4px 20px rgba(200, 149, 109, 0.15)",
                      }}
                      initial={{ rotateY: -90 }}
                      animate={{ rotateY: 0 }}
                      transition={{ duration: 0.4, ease: ease.cinematic }}
                    >
                      <div className="text-xl md:text-2xl mb-2" style={{ color: "#C8956D" }}>{card.symbol || "✦"}</div>
                      <div className="text-[10px] md:text-xs font-medium text-center leading-tight" style={{ color: "var(--text-primary)" }}>
                        {card.name}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Deck Grid */}
      {drawn.length < 3 && (
        <motion.div
          className="mb-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <p className="text-xs text-center mb-4" style={{ color: "var(--text-tertiary)" }}>
            Click a card to draw it
          </p>
          <div className="grid grid-cols-6 sm:grid-cols-9 md:grid-cols-13 gap-2">
            {deck.map((card, i) => {
              const isSelected = selectedIndices.has(i);
              return (
                <motion.button
                  key={i}
                  className="aspect-[2/3] rounded-lg flex items-center justify-center relative overflow-hidden"
                  style={{
                    background: isSelected
                      ? "var(--bg-surface)"
                      : "linear-gradient(135deg, #C8956D 0%, #a07450 50%, #C8956D 100%)",
                    border: `1px solid ${isSelected ? "var(--border)" : "rgba(200, 149, 109, 0.4)"}`,
                    opacity: isSelected ? 0.3 : 1,
                    cursor: isSelected ? "default" : "pointer",
                  }}
                  whileHover={isSelected ? {} : { y: -4, transition: { duration: 0.15 } }}
                  whileTap={isSelected ? {} : { scale: 0.95 }}
                  onClick={() => drawCard(i)}
                  disabled={isSelected || drawn.length >= 3}
                >
                  {!isSelected && (
                    <div className="text-center">
                      <div className="text-sm md:text-lg opacity-30">✦</div>
                    </div>
                  )}
                </motion.button>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Reset */}
      {drawn.length > 0 && (
        <div className="text-center mb-8">
          <button className="btn-ghost" onClick={reset}>
            <RotateCcw size={13} /> Draw Again
          </button>
        </div>
      )}

      {/* Loading */}
      {loadingInterp && (
        <div className="glass-card p-5 animate-pulse">
          <div className="h-4 rounded mb-3" style={{ background: "var(--border-subtle)", width: "35%" }} />
          <div className="space-y-2">
            <div className="h-3 rounded" style={{ background: "var(--border-subtle)" }} />
            <div className="h-3 rounded" style={{ background: "var(--border-subtle)", width: "88%" }} />
            <div className="h-3 rounded" style={{ background: "var(--border-subtle)", width: "72%" }} />
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="glass-card p-4 text-center">
          <p className="text-xs" style={{ color: "var(--danger)" }}>{error}</p>
          <button className="btn-ghost mt-2" onClick={() => { setError(""); setInterpretation(""); }}>
            <RotateCcw size={12} /> Retry
          </button>
        </div>
      )}

      {/* Interpretation */}
      {interpretation && !loadingInterp && (
        <motion.div
          variants={staggerContainer}
          initial={reduced ? false : "hidden"}
          animate="visible"
          className="space-y-4"
        >
          <motion.div className="glass-card p-5" variants={staggerItem}>
            <h3 className="text-xs font-semibold mb-3 uppercase tracking-wider" style={{ color: "#C8956D" }}>Your Reading</h3>
            <div className="prose prose-sm max-w-none">
              {interpretation.split("\n").map((para, i) => (
                para.trim() ? (
                  <p key={i} className="text-xs leading-relaxed mb-3" style={{ color: "var(--text-secondary)" }}>
                    {para}
                  </p>
                ) : null
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}
