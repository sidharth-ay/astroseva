"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useReducedMotion, staggerContainerCustom, staggerItem, slideUp, stagger, ease } from "@/lib/motion";

const lifePathExplanations: Record<number, string> = {
  1: "Natural-born leader with strong will and independence. Pioneering spirit, ambitious, confident, determined.",
  2: "Diplomatic, sensitive, and cooperative. Great mediator, intuitive, supportive, values harmony.",
  3: "Creative, expressive, and optimistic. Excellent communicator, artistic talent, social and charming.",
  4: "Practical, hardworking, and disciplined. Reliable builder, methodical, values stability and order.",
  5: "Adventurous, versatile, and freedom-loving. Dynamic, curious, adaptable, restless energy.",
  6: "Nurturing, responsible, and harmonious. Caring, family-oriented, seeks balance and beauty.",
  7: "Analytical, spiritual, and introspective. Deep thinker, seeker of truth, values knowledge.",
  8: "Ambitious, authoritative, and success-driven. Strong business sense, material mastery, powerful.",
  9: "Humanitarian, compassionate, and idealistic. Generous, wise, selfless, global perspective.",
};

export default function NumerologyPage() {
  const reduced = useReducedMotion();
  const [name, setName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [result, setResult] = useState<{ lifePath: number; destiny: number; soulUrge: number; personality: number } | null>(null);

  const reduceToSingle = (n: number): number => {
    while (n > 9 && n !== 11 && n !== 22 && n !== 33) {
      n = Math.floor(n / 10) + (n % 10);
    }
    return n;
  };

  const calculate = () => {
    if (!name || !birthDate) return;
    const nums = birthDate.replace(/-/g, "").split("").map(Number);
    const lifePath = reduceToSingle(nums.reduce((a, b) => a + b, 0));
    const destiny = reduceToSingle(name.toLowerCase().split("").filter((c) => c >= "a" && c <= "z").reduce((a, c) => a + (c.charCodeAt(0) - 96), 0));
    const vowels = "aeiou";
    const soulUrge = reduceToSingle(name.toLowerCase().split("").filter((c) => vowels.includes(c)).reduce((a, c) => a + (c.charCodeAt(0) - 96), 0));
    const consonants = name.toLowerCase().split("").filter((c) => c >= "a" && c <= "z" && !vowels.includes(c));
    const personality = reduceToSingle(consonants.reduce((a, c) => a + (c.charCodeAt(0) - 96), 0));
    setResult({ lifePath, destiny, soulUrge, personality });
  };

  return (
    <div className="max-w-5xl mx-auto px-5 py-10">
      <motion.div variants={slideUp} initial={reduced ? false : "hidden"} animate="visible">
        <h1 className="text-2xl md:text-3xl font-display font-bold mb-1">
          <span className="text-gradient-gold">Numerology</span> Calculator
        </h1>
        <p className="text-sm mb-8" style={{ color: "var(--text-secondary)" }}>Calculate your Life Path, Destiny, Soul Urge & Personality numbers</p>
      </motion.div>

      {/* Form */}
      <motion.div variants={staggerContainerCustom(stagger.normal, 0.1)}>
        <motion.div className="glass-card p-6 mb-10" variants={slideUp}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="input-label">Full Name</label>
            <input type="text" placeholder="Enter full name" value={name} onChange={(e) => setName(e.target.value)} className="input-field" />
          </div>
          <div>
            <label className="input-label">Birth Date</label>
            <input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} className="input-field" style={{ colorScheme: "dark" }} />
          </div>
          <div className="flex items-end">
            <button onClick={calculate} className="btn-primary">Calculate</button>
          </div>
        </div>
      </motion.div>
      </motion.div>

      {/* Result */}
      {result && (
        <motion.div variants={slideUp} initial={reduced ? false : "hidden"} animate="visible">
          {/* Number orbs */}
          <motion.div variants={staggerContainerCustom(stagger.normal, 0.1)} className="flex flex-wrap justify-center items-center gap-6 mb-10 py-8">
            {[
              { num: result.lifePath, label: "Life Path", color: "var(--lavender)", size: 120 },
              { num: result.destiny, label: "Destiny", color: "var(--champagne)", size: 100 },
              { num: result.soulUrge, label: "Soul Urge", color: "#E8A0BF", size: 90 },
              { num: result.personality, label: "Personality", color: "#8AA8F4", size: 80 },
            ].map((o) => (
              <motion.div
                key={o.label}
                variants={staggerItem}
                whileHover={reduced ? undefined : { scale: 1.08 }}
                whileTap={reduced ? undefined : { scale: 0.95 }}
                className="text-center"
                style={{ animationDelay: `${0 * 200}ms` }}
              >
                <div className="rounded-full flex items-center justify-center mx-auto mb-3"
                  style={{
                    width: o.size, height: o.size,
                    background: `radial-gradient(circle, ${o.color}20, transparent)`,
                    border: `2px solid ${o.color}40`,
                  }}>
                  <span className="text-3xl font-bold" style={{ color: o.color }}>{o.num}</span>
                </div>
                <div className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>{o.label}</div>
              </motion.div>
            ))}
          </motion.div>

          {/* Details */}
          <motion.div variants={staggerContainerCustom(stagger.normal, 0.1)} className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-4xl mx-auto">
            {[
              { num: result.lifePath, title: "Life Path Number", desc: "Your life purpose and journey path." },
              { num: result.destiny, title: "Destiny Number", desc: "Your life goal and what you're meant to achieve." },
              { num: result.soulUrge, title: "Soul Urge Number", desc: "Your inner self and deepest desires." },
              { num: result.personality, title: "Personality Number", desc: "How others perceive you." },
            ].map((item) => (
              <motion.div key={item.title} variants={staggerItem} className="glass-card p-6">
                <div className="text-3xl font-bold mb-1" style={{ color: "var(--champagne)" }}>{item.num}</div>
                <h3 className="font-bold mb-2 text-sm" style={{ color: "var(--text-primary)" }}>{item.title}</h3>
                <p className="text-sm mb-3" style={{ color: "var(--text-secondary)" }}>{item.desc}</p>
                <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>{lifePathExplanations[item.num] || `Number ${item.num} carries unique energy and significance.`}</p>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}
