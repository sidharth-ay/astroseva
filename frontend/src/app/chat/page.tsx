"use client";

import { useState, useRef, useEffect } from "react";
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
      content: "Namaste! I am AstroSeva AI, your friendly Vedic astrology assistant. I can analyze your birth chart, explain planetary positions, check doshas, suggest remedies, and answer any astrology question.\n\nTo get personalized readings, select your birth profile below, or generate your Kundli first at /kundli.",
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

  // Load profiles from localStorage
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("kundli_history") || "[]");
      setProfiles(saved.slice(0, 10));
      if (saved.length > 0) {
        setSelectedProfile(saved[0]);
      }
    } catch {
      setProfiles([]);
    }
  }, []);

  // Load suggestions
  useEffect(() => {
    api.chatSuggestions()
      .then((data) => setSuggestions(data.suggestions || []))
      .catch(console.error);
  }, []);

  // Auto-scroll
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
      // Build birth_details from selected profile
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

      const data = await api.chatSend(message, messages.slice(-5), language, birthDetails);
      const assistantMsg: Message = { role: "assistant", content: data.response };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, I encountered an error. Please try again." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 h-[calc(100vh-4rem)] flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-center py-3 shrink-0">
        <h1 className="text-xl font-bold text-gray-800">Chat with AstroSeva AI</h1>
        <div className="flex items-center gap-3">
          {/* Language Toggle */}
          <div className="flex bg-gray-100 rounded-lg p-0.5">
            <button
              onClick={() => setLanguage("en")}
              className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                language === "en"
                  ? "bg-purple-600 text-white"
                  : "text-gray-600 hover:text-gray-800"
              }`}
            >
              English
            </button>
            <button
              onClick={() => setLanguage("hi")}
              className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                language === "hi"
                  ? "bg-purple-600 text-white"
                  : "text-gray-600 hover:text-gray-800"
              }`}
            >
              हिन्दी
            </button>
          </div>
          {messages.length > 1 && (
            <button onClick={() => { setMessages([messages[0]]); }}
              className="text-sm text-gray-700 hover:text-purple-600 underline">
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Profile Selector */}
      {profiles.length > 0 && (
        <div className="shrink-0 mb-3">
          <button
            onClick={() => setShowProfiles(!showProfiles)}
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-purple-600 mb-2"
          >
            <svg className={`w-4 h-4 transition-transform ${showProfiles ? "rotate-90" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            Birth Profiles ({profiles.length})
          </button>
          {showProfiles && (
            <div className="flex flex-wrap gap-2">
              {profiles.map((p, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedProfile(selectedProfile?.name === p.name && selectedProfile?.birth_date === p.birth_date ? null : p)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm border transition-colors ${
                    selectedProfile?.name === p.name && selectedProfile?.birth_date === p.birth_date
                      ? "bg-purple-600 text-white border-purple-600"
                      : "bg-white text-gray-700 border-gray-300 hover:border-purple-400"
                  }`}
                >
                  <span className="font-medium">{p.name}</span>
                  <span className="opacity-70">{p.asc_sign_name}</span>
                  <span className="opacity-50 text-xs">{p.birth_date}</span>
                </button>
              ))}
            </div>
          )}
          {selectedProfile && (
            <div className="mt-2 flex items-center gap-2 text-xs text-purple-600">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              Analyzing as: {selectedProfile.name} ({selectedProfile.asc_sign_name} Ascendant)
            </div>
          )}
        </div>
      )}

      {profiles.length === 0 && (
        <div className="shrink-0 mb-3 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 text-sm text-amber-800">
          No birth profiles found. <a href="/kundli" className="underline font-medium">Generate your Kundli first</a> to get personalized readings.
        </div>
      )}

      {/* Chat Messages */}
      <div className="flex-1 min-h-0 overflow-y-auto bg-white rounded-xl shadow-md p-4 mb-4 space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] rounded-xl px-4 py-3 ${
              msg.role === "user"
                ? "bg-purple-600 text-white"
                : "bg-gray-100 text-gray-800"
            }`}>
              <div className="text-sm font-medium mb-1 opacity-70">
                {msg.role === "user" ? "You" : "AstroSeva AI"}
              </div>
              <div className="whitespace-pre-wrap text-base leading-relaxed">{msg.content}</div>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-xl px-4 py-3">
              <div className="text-sm font-medium mb-1 opacity-70">AstroSeva AI</div>
              <div className="text-base text-gray-700 flex items-center gap-2">
                <span className="inline-block w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="inline-block w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="inline-block w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
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
              className="bg-purple-50 text-purple-700 text-sm px-4 py-2 rounded-full hover:bg-purple-100 border border-purple-200">
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="flex gap-2 shrink-0 pb-4">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) handleSend();
          }}
          placeholder={language === "hi" ? "ज्योतिष, उपाय, भविष्यवाणी के बारे में पूछें..." : "Ask about your chart, doshas, career, marriage..."}
          className="flex-1 border border-gray-300 rounded-xl px-4 py-3 text-gray-900 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          disabled={loading}
        />
        <button
          onClick={() => handleSend()}
          disabled={loading || !input.trim()}
          className="bg-purple-600 hover:bg-purple-700 text-white font-bold px-6 py-3 rounded-xl disabled:opacity-50"
        >
          {language === "hi" ? "भेजें" : "Send"}
        </button>
      </div>
    </div>
  );
}
