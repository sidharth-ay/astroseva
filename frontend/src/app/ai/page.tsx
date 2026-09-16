"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import AiChatMessage from "@/components/AiChatMessage";
import AiQuickActions from "@/components/AiQuickActions";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
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

const GREETING = "Namaste! I am AstroSeva AI, your personal Vedic astrology assistant.\n\nI can analyze your birth chart, explain planetary positions, check doshas, suggest remedies, and answer any astrology question.\n\nSelect your birth profile below, or generate your Kundli first to get personalized readings.";

export default function AiPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [profiles, setProfiles] = useState<KundliProfile[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<KundliProfile | null>(null);
  const [language, setLanguage] = useState<"en" | "hi">("en");
  const [initialized, setInitialized] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load profiles from localStorage
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("kundli_history") || "[]");
      setProfiles(saved.slice(0, 10));
      if (saved.length > 0) setSelectedProfile(saved[0]);
    } catch {
      setProfiles([]);
    }
  }, []);

  // Set greeting once
  useEffect(() => {
    if (!initialized) {
      setMessages([{
        role: "assistant",
        content: GREETING,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      }]);
      setInitialized(true);
    }
  }, [initialized]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (text?: string) => {
    const message = text || input.trim();
    if (!message) return;

    const userMsg: Message = {
      role: "user",
      content: message,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      let birthDetails: Record<string, any> | undefined;
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

      const data = await api.chatSend(
        message,
        messages.slice(-5).map(m => ({ role: m.role, content: m.content })),
        language,
        birthDetails
      );

      const assistantMsg: Message = {
        role: "assistant",
        content: data.response,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry, I encountered an error. Please try again.",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ai-page flex flex-col relative z-10">
      {/* Header */}
      <div className="ai-header px-4 py-3 shrink-0 relative z-20">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-yellow-400 font-bold text-lg">AstroSeva</Link>
            <span className="text-white/30">|</span>
            <span className="text-purple-400 font-medium text-sm">AI Astrologer</span>
          </div>
          <div className="flex items-center gap-3">
            {/* Language Toggle */}
            <div className="flex bg-white/5 rounded-lg p-0.5 border border-white/10">
              <button
                onClick={() => setLanguage("en")}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                  language === "en" ? "bg-purple-600 text-white" : "text-white/40 hover:text-white/70"
                }`}
              >
                EN
              </button>
              <button
                onClick={() => setLanguage("hi")}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                  language === "hi" ? "bg-purple-600 text-white" : "text-white/40 hover:text-white/70"
                }`}
              >
                HI
              </button>
            </div>
            {messages.length > 1 && (
              <button
                onClick={() => {
                  setMessages([{
                    role: "assistant",
                    content: GREETING,
                    timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                  }]);
                }}
                className="text-xs text-white/30 hover:text-purple-400 transition-colors"
              >
                New Chat
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Profile Bar */}
      <div className="ai-profile-bar px-4 py-2 shrink-0 relative z-20">
        <div className="max-w-4xl mx-auto flex items-center gap-3 overflow-x-auto scrollbar-hide">
          {profiles.length > 0 ? (
            <>
              <span className="text-xs text-white/30 shrink-0">Profile:</span>
              {profiles.map((p, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedProfile(
                    selectedProfile?.name === p.name && selectedProfile?.birth_date === p.birth_date ? null : p
                  )}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs border transition-all shrink-0 ${
                    selectedProfile?.name === p.name && selectedProfile?.birth_date === p.birth_date
                      ? "bg-purple-600/20 text-purple-300 border-purple-500/40 shadow-[0_0_12px_rgba(147,51,234,0.2)]"
                      : "bg-white/5 text-white/40 border-white/10 hover:border-purple-500/30 hover:text-white/60"
                  }`}
                >
                  <span className="font-medium">{p.name}</span>
                  <span className="opacity-60">{p.asc_sign_name}</span>
                </button>
              ))}
            </>
          ) : (
            <span className="text-xs text-white/20">
              No profiles yet. <Link href="/kundli" className="text-purple-400 underline hover:text-purple-300">Generate your Kundli</Link> to get started.
            </span>
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-6 relative z-10">
        <div className="max-w-3xl mx-auto space-y-5">
          {/* AI Orb - only show at start */}
          {messages.length <= 1 && (
            <div className="flex flex-col items-center py-6">
              <div className="ai-orb mb-4" />
              <div className="text-purple-400/60 text-xs font-medium tracking-widest uppercase">AstroSeva AI</div>
            </div>
          )}

          {messages.map((msg, i) => (
            <AiChatMessage
              key={i}
              role={msg.role}
              content={msg.content}
              timestamp={msg.timestamp}
            />
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="max-w-[80%]">
                <div className="flex items-center gap-2 mb-1.5 ml-1">
                  <div className="w-6 h-6 rounded-full bg-purple-600/30 flex items-center justify-center text-xs">
                    ✨
                  </div>
                  <span className="text-xs font-medium text-purple-400">AstroSeva AI</span>
                </div>
                <div className="ai-bubble-assistant px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="ai-dot" />
                    <div className="ai-dot" />
                    <div className="ai-dot" />
                  </div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-black/20 backdrop-blur-sm border-t border-white/5 px-4 py-2 shrink-0 relative z-20">
        <div className="max-w-3xl mx-auto">
          <AiQuickActions onAction={handleSend} />
        </div>
      </div>

      {/* Input Area */}
      <div className="bg-black/30 backdrop-blur-sm border-t border-white/5 px-4 py-3 shrink-0 relative z-20">
        <div className="max-w-3xl mx-auto flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) handleSend();
            }}
            placeholder="Ask AstroSeva AI anything..."
            className="ai-input flex-1 rounded-xl px-4 py-3 text-sm"
            disabled={loading}
          />
          <button
            onClick={() => handleSend()}
            disabled={loading || !input.trim()}
            className="ai-send-btn text-white font-bold px-5 py-3 rounded-xl text-sm disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
