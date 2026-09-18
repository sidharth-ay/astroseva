"use client";

import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Send, Trash2, ChevronDown, Sparkles } from "lucide-react";
import { api } from "@/lib/api";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface KundliProfile {
  name: string;
  birth_date: string;
  birth_time: string;
  birth_place: string;
  asc_sign_name: string;
  birth_year: number;
  birth_month: number;
  birth_day: number;
  birth_hour: number;
  birth_minute: number;
  latitude: number;
  longitude: number;
  timezone_offset: number;
  saved_at: string;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Namaste! I am AstroSeva AI, your Vedic astrology assistant. I can analyze your birth chart, explain planetary positions, check doshas, suggest remedies, and answer any astrology question.\n\nTo get personalized readings, select your birth profile below, or generate your Kundli first at /kundli.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [language, setLanguage] = useState<"en" | "hi">("en");
  const [profiles, setProfiles] = useState<KundliProfile[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<KundliProfile | null>(null);
  const [showProfiles, setShowProfiles] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("kundli_history") || "[]");
      setProfiles(saved.slice(0, 10));
      if (saved.length > 0) setSelectedProfile(saved[0]);
    } catch { setProfiles([]); }
  }, []);

  useEffect(() => {
    api.chatSuggestions()
      .then((data) => setSuggestions(data.suggestions || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (text?: string) => {
    const message = text || input.trim();
    if (!message) return;

    const userMsg: Message = { role: "user", content: message };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      let birthDetails: Record<string, unknown> | undefined;
      if (selectedProfile) {
        birthDetails = {
          name: selectedProfile.name,
          birth_date: selectedProfile.birth_date,
          birth_time: selectedProfile.birth_time,
          birth_place: selectedProfile.birth_place,
          birth_year: Number(selectedProfile.birth_date?.split("-")[0]) || 0,
          birth_month: Number(selectedProfile.birth_date?.split("-")[1]) || 0,
          birth_day: Number(selectedProfile.birth_date?.split("-")[2]) || 0,
          birth_hour: Number(selectedProfile.birth_time?.split(":")[0]) || 12,
          birth_minute: Number(selectedProfile.birth_time?.split(":")[1]) || 0,
          latitude: selectedProfile.latitude,
          longitude: selectedProfile.longitude,
          timezone_offset: selectedProfile.timezone_offset,
        };
      }
      const data = await api.chatSend(message, messages.slice(-5), language, birthDetails);
      setMessages((prev) => [...prev, { role: "assistant", content: data.response }]);
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "Sorry, I encountered an error. Please try again." }]);
    } finally { setLoading(false); }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 h-[calc(100vh-4rem)] flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-center py-3 shrink-0">
        <h1 className="text-xl font-display font-bold">
          <span className="text-gradient-gold">Chat</span> with AstroSeva AI
        </h1>
        <div className="flex items-center gap-3">
          {/* Language Toggle */}
          <div className="flex rounded-lg p-0.5" style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)" }}>
            <button onClick={() => setLanguage("en")}
              className="px-3 py-1 text-xs font-medium rounded-md transition-colors"
              style={{ background: language === "en" ? "var(--lavender)" : "transparent", color: language === "en" ? "#0B0B19" : "var(--text-secondary)" }}>
              English
            </button>
            <button onClick={() => setLanguage("hi")}
              className="px-3 py-1 text-xs font-medium rounded-md transition-colors"
              style={{ background: language === "hi" ? "var(--lavender)" : "transparent", color: language === "hi" ? "#0B0B19" : "var(--text-secondary)" }}>
              हिन्दी
            </button>
          </div>
          {messages.length > 1 && (
            <button onClick={() => setMessages([messages[0]])}
              className="p-1.5 rounded-lg transition-colors" style={{ color: "var(--text-tertiary)" }}
              onMouseEnter={(e) => { e.currentTarget.style.color = "var(--danger)"; e.currentTarget.style.background = "rgba(232, 93, 93, 0.08)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-tertiary)"; e.currentTarget.style.background = "transparent"; }}>
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Profile Selector */}
      {profiles.length > 0 && (
        <div className="shrink-0 mb-3">
          <button onClick={() => setShowProfiles(!showProfiles)}
            className="flex items-center gap-2 text-xs font-medium mb-2"
            style={{ color: "var(--text-tertiary)" }}>
            <ChevronDown size={14} className={`transition-transform ${showProfiles ? "rotate-90" : ""}`} />
            Birth Profiles ({profiles.length})
          </button>
          {showProfiles && (
            <div className="flex flex-wrap gap-2">
              {profiles.map((p, i) => (
                <button key={i}
                  onClick={() => setSelectedProfile(selectedProfile?.name === p.name && selectedProfile?.birth_date === p.birth_date ? null : p)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs transition-colors"
                  style={{
                    background: selectedProfile?.name === p.name && selectedProfile?.birth_date === p.birth_date ? "rgba(181, 164, 244, 0.15)" : "transparent",
                    border: `1px solid ${selectedProfile?.name === p.name && selectedProfile?.birth_date === p.birth_date ? "var(--lavender)" : "var(--border-subtle)"}`,
                    color: selectedProfile?.name === p.name && selectedProfile?.birth_date === p.birth_date ? "var(--lavender)" : "var(--text-secondary)",
                  }}>
                  <span className="font-medium">{p.name}</span>
                  <span style={{ opacity: 0.6 }}>{p.asc_sign_name}</span>
                  <span style={{ opacity: 0.4 }}>{p.birth_date}</span>
                </button>
              ))}
            </div>
          )}
          {selectedProfile && (
            <div className="mt-2 flex items-center gap-2 text-xs" style={{ color: "var(--lavender)" }}>
              <span className="w-2 h-2 rounded-full" style={{ background: "var(--success)" }} />
              Analyzing as: {selectedProfile.name} ({selectedProfile.asc_sign_name} Ascendant)
            </div>
          )}
        </div>
      )}

      {profiles.length === 0 && (
        <div className="shrink-0 mb-3 p-3 rounded-xl text-xs"
          style={{ background: "rgba(214, 184, 117, 0.06)", border: "1px solid rgba(214, 184, 117, 0.12)", color: "var(--champagne)" }}>
          No birth profiles found. <a href="/kundli" className="underline font-medium">Generate your Kundli first</a> to get personalized readings.
        </div>
      )}

      {/* Chat Messages */}
      <div className="flex-1 min-h-0 overflow-y-auto rounded-xl p-4 mb-4 space-y-4"
        style={{ background: "var(--bg-primary)", border: "1px solid var(--border-subtle)" }}>
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className="max-w-[85%] rounded-xl px-4 py-3"
              style={{
                background: msg.role === "user" ? "rgba(181, 164, 244, 0.12)" : "var(--bg-surface)",
                border: `1px solid ${msg.role === "user" ? "rgba(181, 164, 244, 0.2)" : "var(--border-subtle)"}`,
                color: "var(--text-primary)",
              }}>
              <div className="text-[10px] font-medium mb-1" style={{ color: msg.role === "user" ? "var(--lavender)" : "var(--champagne)" }}>
                {msg.role === "user" ? "You" : "AstroSeva AI"}
              </div>
              <div className="whitespace-pre-wrap text-sm leading-relaxed">{msg.content}</div>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="rounded-xl px-4 py-3" style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)" }}>
              <div className="text-[10px] font-medium mb-1" style={{ color: "var(--champagne)" }}>AstroSeva AI</div>
              <div className="flex items-center gap-2">
                {[0, 1, 2].map((i) => (
                  <span key={i} className="inline-block w-2 h-2 rounded-full" style={{ background: "var(--champagne)", animation: `bounce 1s infinite ${i * 150}ms` }} />
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggestions */}
      {messages.length <= 1 && suggestions.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {suggestions.map((s, i) => (
            <button key={i} onClick={() => handleSend(s)}
              className="text-xs px-3 py-2 rounded-xl transition-colors"
              style={{ background: "rgba(181, 164, 244, 0.06)", border: "1px solid rgba(181, 164, 244, 0.15)", color: "var(--lavender)" }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(181, 164, 244, 0.12)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(181, 164, 244, 0.06)"; }}>
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="flex gap-2 shrink-0 pb-4">
        <input type="text" value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) handleSend(); }}
          placeholder={language === "hi" ? "ज्योतिष, उपाय, भविष्यवाणी के बारे में पूछें..." : "Ask about your chart, doshas, career, marriage..."}
          className="flex-1 input-field"
          disabled={loading} />
        <button onClick={() => handleSend()} disabled={loading || !input.trim()}
          className="btn-primary px-4">
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}
