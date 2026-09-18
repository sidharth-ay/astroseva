"use client";

import { useState } from "react";
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
    <div className="max-w-4xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-bold mb-2 animate-fade-in-up">AI Astrologer</h1>
      <p className="mb-8 animate-fade-in-up" style={{ color: "var(--text-secondary)" }}>Ask questions about Vedic astrology, your chart, or predictions</p>

      {/* Quick Questions */}
      <div className="mb-6 animate-fade-in-up">
        <p className="text-sm font-medium mb-3" style={{ color: "var(--text-secondary)" }}>Quick questions:</p>
        <div className="flex flex-wrap gap-2">
          {quickQuestions.map((q, i) => (
            <button key={i} onClick={() => handleAsk(q)} disabled={loading}
              className="text-left text-sm px-4 py-2 rounded-xl transition-all duration-200 hover:bg-white/[0.06]"
              style={{ border: "1px solid var(--border)", color: "var(--text-secondary)" }}>
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* Input */}
      <div className="glass-card p-4 mb-6 animate-fade-in-up">
        <div className="flex gap-3">
          <input type="text" placeholder="Ask anything about Vedic astrology..." value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAsk()}
            className="flex-1 cosmic-input" />
          <button onClick={() => handleAsk()} disabled={loading || !question.trim()}
            className="glow-btn-purple whitespace-nowrap">
            {loading ? "Thinking..." : "Ask"}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-3 rounded-lg text-sm" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "var(--danger)" }}>
          {error}
        </div>
      )}

      {/* Answer */}
      {loading && (
        <div className="glass-card p-8 text-center animate-fade-in">
          <div className="text-4xl mb-3 animate-glow-pulse">{'\u2728'}</div>
          <p style={{ color: "var(--text-secondary)" }}>Thinking...</p>
        </div>
      )}

      {!loading && answer && (
        <div className="glass-card p-6 mb-8 animate-fade-in-up">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: "linear-gradient(135deg, var(--accent-deep), #6d28d9)" }}>
              {'\u2728'}
            </div>
            <div>
              <div className="text-xs font-medium mb-2" style={{ color: "var(--accent)" }}>AI Astrologer</div>
              <div className="text-sm leading-relaxed whitespace-pre-line">{answer}</div>
            </div>
          </div>
        </div>
      )}

      {/* History */}
      {history.length > 1 && (
        <div className="mt-8">
          <h3 className="text-sm font-medium mb-3" style={{ color: "var(--text-secondary)" }}>Recent questions</h3>
          <div className="space-y-2">
            {history.slice(1, 6).map((h, i) => (
              <button key={i} onClick={() => { setQuestion(h.q); setAnswer(h.a); }}
                className="w-full text-left p-3 rounded-lg text-sm transition-colors hover:bg-white/[0.04]"
                style={{ border: "1px solid var(--border)" }}>
                <span style={{ color: "var(--text-secondary)" }}>{h.q}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Disclaimer */}
      <div className="mt-8 p-4 rounded-lg text-xs text-center" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}>
        AstroSeva AI is for educational and entertainment purposes only. Always consult a qualified astrologer for important life decisions.
      </div>
    </div>
  );
}
