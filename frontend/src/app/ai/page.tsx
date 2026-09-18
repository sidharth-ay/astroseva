"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Brain, ChevronRight } from "lucide-react";
import { api } from "@/lib/api";

const quickQuestions = [
  "What does my birth chart say about my career?",
  "When is my next favorable period?",
  "What are my strengths based on Vedic astrology?",
  "Is there any dosha in my chart?",
  "What does my 7th house indicate about marriage?",
];

export default function AiPage() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [history, setHistory] = useState<{ q: string; a: string }[]>([]);

  const handleAsk = async (q?: string) => {
    const query = q || question;
    if (!query.trim()) return;
    setLoading(true); setError(""); setAnswer("");
    try {
      const resp = await api.chatSend(query, []);
      setAnswer(resp.response);
      setHistory((prev) => [{ q: query, a: resp.response }, ...prev].slice(0, 20));
      if (!q) setQuestion("");
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Failed to get response"); }
    finally { setLoading(false); }
  };

  return (
    <div className="max-w-4xl mx-auto px-5 py-10">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl md:text-3xl font-display font-bold mb-1">
          AI <span className="text-gradient-gold">Astrologer</span>
        </h1>
        <p className="text-sm mb-8" style={{ color: "var(--text-secondary)" }}>Ask questions about Vedic astrology, your chart, or predictions</p>
      </motion.div>

      {/* Quick Questions */}
      <div className="mb-6">
        <p className="text-xs font-medium mb-3" style={{ color: "var(--text-tertiary)" }}>Quick questions:</p>
        <div className="flex flex-wrap gap-2">
          {quickQuestions.map((q, i) => (
            <button key={i} onClick={() => handleAsk(q)} disabled={loading}
              className="text-left text-xs px-3 py-2 rounded-xl transition-all duration-200"
              style={{ border: "1px solid var(--border-subtle)", color: "var(--text-secondary)" }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--champagne)30"; e.currentTarget.style.background = "rgba(214, 184, 117, 0.04)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border-subtle)"; e.currentTarget.style.background = "transparent"; }}>
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* Input */}
      <motion.div className="glass-card p-4 mb-6" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <div className="flex gap-3">
          <input type="text" placeholder="Ask anything about Vedic astrology..." value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAsk()}
            className="flex-1 input-field" />
          <button onClick={() => handleAsk()} disabled={loading || !question.trim()}
            className="btn-primary whitespace-nowrap">
            {loading ? "Thinking..." : "Ask"} <ChevronRight size={16} />
          </button>
        </div>
      </motion.div>

      {error && <p className="text-xs mb-6" style={{ color: "var(--danger)" }}>{error}</p>}

      {/* Answer */}
      {loading && (
        <div className="glass-card p-8 text-center">
          <div className="shimmer h-24 w-full rounded-xl" />
        </div>
      )}

      {!loading && answer && (
        <motion.div className="glass-card p-6 mb-8" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: "rgba(214, 184, 117, 0.1)", color: "var(--champagne)" }}>
              <Brain size={18} />
            </div>
            <div>
              <div className="text-xs font-medium mb-2" style={{ color: "var(--champagne)" }}>AI Astrologer</div>
              <div className="text-sm leading-relaxed whitespace-pre-line" style={{ color: "var(--text-secondary)" }}>{answer}</div>
            </div>
          </div>
        </motion.div>
      )}

      {/* History */}
      {history.length > 1 && (
        <div className="mt-8">
          <h3 className="text-xs font-medium mb-3" style={{ color: "var(--text-tertiary)" }}>Recent questions</h3>
          <div className="space-y-2">
            {history.slice(1, 6).map((h, i) => (
              <button key={i} onClick={() => { setQuestion(h.q); setAnswer(h.a); }}
                className="w-full text-left p-3 rounded-xl text-sm transition-colors"
                style={{ border: "1px solid var(--border-subtle)" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(244, 240, 232, 0.03)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}>
                <span style={{ color: "var(--text-secondary)" }}>{h.q}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Disclaimer */}
      <div className="mt-8 p-4 rounded-xl text-xs text-center" style={{ background: "rgba(244, 240, 232, 0.02)", border: "1px solid var(--border-subtle)", color: "var(--text-tertiary)" }}>
        AstroSeva AI is for educational and entertainment purposes only. Always consult a qualified astrologer for important life decisions.
      </div>
    </div>
  );
}
