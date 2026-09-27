"use client";

import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Send, Home } from "lucide-react";
import { api } from "@/lib/api";
import {
  useReducedMotion,
  staggerContainer,
  staggerItem,
} from "@/lib/motion";

const ROOM_TYPES = [
  "Bedroom", "Kitchen", "Living Room", "Bathroom", "Study Room",
  "Office", "Puja Room", "Children's Room", "Guest Room", "Dining Room",
  "Garage", "Garden", "Entrance", "Staircase",
];

const DIRECTIONS = [
  "North", "South", "East", "West",
  "North-East", "North-West", "South-East", "South-West",
];

export default function VastuPage() {
  const [roomType, setRoomType] = useState("");
  const [direction, setDirection] = useState("");
  const [concern, setConcern] = useState("");
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const reduced = useReducedMotion();

  useEffect(() => {
    document.title = "Vastu Shastra | AstroSeva";
  }, []);

  const getAdvice = async () => {
    if (!roomType) { setError("Please select a room type."); return; }
    setLoading(true); setError("");
    try {
      const prompt = `You are an expert Vastu Shastra consultant. Provide detailed Vastu advice for the following:\n\nRoom Type: ${roomType}\nFacing Direction: ${direction || "Not specified"}\nSpecific Concern: ${concern || "General Vastu compliance"}\n\nProvide:\n1. Ideal layout and positioning guidelines\n2. Recommended colors and materials\n3. Items to place and items to avoid\n4. Direction-specific tips\n5. Common Vastu defects and remedies\n\nBe practical and provide actionable advice. Format with clear sections.`;
      const res = await api.chatSend(prompt, [], "en");
      setResponse(res.response);
    } catch (e) { setError(e instanceof Error ? e.message : "Failed to get advice."); }
    finally { setLoading(false); }
  };

  return (
    <div className="max-w-3xl mx-auto px-5 py-10">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <h1 className="heading-display text-2xl md:text-3xl mb-1">
          Vastu <span className="text-gradient-gold">Shastra</span>
        </h1>
        <p className="text-sm mb-8" style={{ color: "var(--text-secondary)" }}>
          Ancient Indian science of architecture and spatial harmony
        </p>
      </motion.div>

      <motion.div className="glass-card p-5 mb-8" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
        <p className="text-xs leading-relaxed mb-4" style={{ color: "var(--text-secondary)" }}>
          Vastu Shastra is a traditional Indian system of architecture that integrates nature with the built environment through precise geometric and directional principles. It harmonizes the five elements — earth, water, fire, air, and space — to create spaces that promote health, wealth, and prosperity.
        </p>
      </motion.div>

      {/* Form */}
      <motion.div className="glass-card p-5 mb-6" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <h3 className="text-xs font-semibold mb-3 uppercase tracking-wider" style={{ color: "#C8956D" }}>Get Vastu Advice</h3>

        <div className="mb-4">
          <label className="input-label"><Home size={11} className="inline mr-1" />Room Type</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {ROOM_TYPES.map((room) => (
              <button
                key={room}
                className="p-2.5 rounded-lg text-xs font-medium transition-all text-left"
                style={{
                  background: roomType === room ? "rgba(200, 149, 109, 0.12)" : "var(--bg-surface)",
                  border: `1px solid ${roomType === room ? "#C8956D" : "var(--border-subtle)"}`,
                  color: roomType === room ? "#C8956D" : "var(--text-secondary)",
                }}
                onClick={() => setRoomType(room)}
              >
                {room}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-4">
          <label className="input-label">Facing Direction (optional)</label>
          <div className="flex flex-wrap gap-2">
            {DIRECTIONS.map((dir) => (
              <button
                key={dir}
                className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                style={{
                  background: direction === dir ? "rgba(200, 149, 109, 0.12)" : "var(--bg-surface)",
                  border: `1px solid ${direction === dir ? "#C8956D" : "var(--border-subtle)"}`,
                  color: direction === dir ? "#C8956D" : "var(--text-secondary)",
                }}
                onClick={() => setDirection(direction === dir ? "" : dir)}
              >
                {dir}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-4">
          <label className="input-label" htmlFor="vastu-concern">Specific Concern (optional)</label>
          <textarea
            id="vastu-concern"
            className="input-field min-h-[60px] resize-y"
            value={concern}
            onChange={(e) => setConcern(e.target.value)}
            placeholder="E.g., facing financial issues, health problems, want better sleep..."
            rows={2}
          />
        </div>

        {error && <p className="text-xs mb-3" style={{ color: "var(--danger)" }}>{error}</p>}
        <button className="btn-primary" onClick={getAdvice} disabled={loading}>
          {loading ? "Getting Advice..." : "Get Vastu Advice"} <Send size={14} />
        </button>
      </motion.div>

      {/* Loading */}
      {loading && (
        <div className="glass-card p-5 animate-pulse">
          <div className="h-4 rounded mb-3" style={{ background: "var(--border-subtle)", width: "40%" }} />
          <div className="space-y-2">
            <div className="h-3 rounded" style={{ background: "var(--border-subtle)" }} />
            <div className="h-3 rounded" style={{ background: "var(--border-subtle)", width: "90%" }} />
            <div className="h-3 rounded" style={{ background: "var(--border-subtle)", width: "70%" }} />
          </div>
        </div>
      )}

      {/* Response */}
      {response && !loading && (
        <motion.div
          variants={staggerContainer}
          initial={reduced ? false : "hidden"}
          animate="visible"
          className="space-y-4"
        >
          <motion.div className="glass-card p-5" variants={staggerItem}>
            <h3 className="text-xs font-semibold mb-3 uppercase tracking-wider" style={{ color: "#C8956D" }}>
              Vastu Advice — {roomType}
              {direction ? ` (${direction} facing)` : ""}
            </h3>
            <div className="prose prose-sm max-w-none">
              {response.split("\n").map((para, i) => (
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
