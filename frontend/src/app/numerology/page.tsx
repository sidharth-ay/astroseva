"use client";

import { useState } from "react";
import { useScrollReveal } from "@/lib/useScrollReveal";

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
  const headerRef = useScrollReveal();
  const formRef = useScrollReveal();
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

  const orbs = [
    { num: result?.lifePath, label: "Life Path", color: "var(--accent)", size: "120px" },
    { num: result?.destiny, label: "Destiny", color: "var(--gold)", size: "100px" },
    { num: result?.soulUrge, label: "Soul Urge", color: "#ec4899", size: "90px" },
    { num: result?.personality, label: "Personality", color: "#60a5fa", size: "80px" },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      <div ref={headerRef} className="scroll-reveal">
        <h1 className="text-3xl md:text-4xl font-bold mb-2"><span className="text-gradient-mixed">Numerology</span> Calculator</h1>
        <p className="mb-8" style={{ color: "var(--text-secondary)" }}>Calculate your Life Path, Destiny, Soul Urge &amp; Personality numbers</p>
      </div>

      {/* Form */}
      <div ref={formRef} className="glass-card p-6 mb-10 scroll-reveal" style={{ transitionDelay: "100ms" }}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: "var(--text-secondary)" }}>Full Name</label>
            <input type="text" placeholder="Enter full name" value={name} onChange={(e) => setName(e.target.value)} className="cosmic-input" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: "var(--text-secondary)" }}>Birth Date</label>
            <input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} className="cosmic-input" style={{ colorScheme: "dark" }} />
          </div>
          <div className="flex items-end">
            <button onClick={calculate} className="glow-btn-purple">Calculate</button>
          </div>
        </div>
      </div>

      {/* Result */}
      {result && (
        <div className="animate-fade-in-up">
          {/* Glowing orbs */}
          <div className="flex flex-wrap justify-center items-center gap-6 mb-10 py-8">
            {orbs.map((o) => o.num && (
              <div key={o.label} className="text-center animate-float" style={{ animationDelay: `${orbs.indexOf(o) * 200}ms` }}>
                <div className="rounded-full flex items-center justify-center mx-auto mb-3 animate-glow-pulse"
                  style={{
                    width: o.size, height: o.size,
                    background: `radial-gradient(circle, ${o.color}30, transparent)`,
                    border: `2px solid ${o.color}`,
                    boxShadow: `0 0 30px ${o.color}40`,
                  }}>
                  <span className="text-3xl font-bold" style={{ color: o.color }}>{o.num}</span>
                </div>
                <div className="text-sm font-medium">{o.label}</div>
              </div>
            ))}
          </div>

          {/* Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {[
              { num: result.lifePath, title: "Life Path Number", desc: "Your life purpose and journey path." },
              { num: result.destiny, title: "Destiny Number", desc: "Your life goal and what you're meant to achieve." },
              { num: result.soulUrge, title: "Soul Urge Number", desc: "Your inner self and deepest desires." },
              { num: result.personality, title: "Personality Number", desc: "How others perceive you." },
            ].map((item) => (
              <div key={item.title} className="glass-card p-6">
                <div className="text-3xl font-bold mb-1" style={{ color: "var(--gold)" }}>{item.num}</div>
                <h3 className="font-bold mb-2">{item.title}</h3>
                <p className="text-sm mb-3" style={{ color: "var(--text-secondary)" }}>{item.desc}</p>
                <p className="text-sm leading-relaxed">{lifePathExplanations[item.num] || `Number ${item.num} carries unique energy and significance.`}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
