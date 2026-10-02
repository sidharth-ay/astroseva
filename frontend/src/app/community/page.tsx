"use client";

import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { ArrowBigUp, MessageCircle } from "lucide-react";
import { useReducedMotion, staggerContainerCustom, staggerItem, slideUp, stagger } from "@/lib/motion";
import HonestyNote from "@/components/HonestyNote";
import { LocalKeys, readLocal, writeLocal } from "@/lib/local";

interface Answer {
  id: string;
  text: string;
  author: string;
  date: string;
  votes: number;
}

interface Question {
  id: string;
  title: string;
  detail: string;
  author: string;
  date: string;
  votes: number;
  answers: Answer[];
}

const SEED: Question[] = [
  {
    id: "seed-1",
    title: "What does Manglik Dosha actually affect?",
    detail: "I was told I am Manglik. Does it only relate to marriage, or does it influence career too?",
    author: "Curious Seeker",
    date: "2026-09-20",
    votes: 12,
    answers: [
      { id: "seed-1-a1", text: "Primarily marriage timing and harmony, since Mars aspects the 7th house and Venus. Career effects are secondary — Mars gives drive wherever it sits.", author: "AstroSeva Guide", date: "2026-09-21", votes: 9 },
    ],
  },
  {
    id: "seed-2",
    title: "How accurate are online kundlis vs a pandit-made one?",
    detail: "Do the calculations match what a traditional astrologer would compute by hand?",
    author: "Student",
    date: "2026-09-18",
    votes: 8,
    answers: [
      { id: "seed-2-a1", text: "The math (planets, houses, dashas) matches when the same ayanamsa is used. Interpretation depth is where human experience still leads.", author: "AstroSeva Guide", date: "2026-09-19", votes: 7 },
    ],
  },
];

const KEY = "astroseva_community";

function load(): Question[] {
  try {
    const extra = readLocal<Question[]>(LocalKeys.community, []);
    const seen = new Set(extra.map((q: Question) => q.id));
    return [...extra, ...SEED.filter((s) => !seen.has(s.id))];
  } catch {
    return SEED;
  }
}

export default function CommunityPage() {
  const [questions, setQuestions] = useState<Question[]>(() => {
    try {
      return load();
    } catch {
      return [];
    }
  });
  const [title, setTitle] = useState("");
  const [detail, setDetail] = useState("");
  const [name, setName] = useState("");
  const [answerText, setAnswerText] = useState<Record<string, string>>({});
  const [answerName, setAnswerName] = useState<Record<string, string>>({});
  const [open, setOpen] = useState<string | null>(null);
  const [formMsg, setFormMsg] = useState("");
  const reduced = useReducedMotion();

  useEffect(() => {
    document.title = "Community Q&A | AstroSeva";
  }, []);

  const persistUser = (list: Question[]) => {
    setQuestions(list);
    writeLocal(LocalKeys.community, list.filter((q) => !q.id.startsWith("seed-")));
  };

  const ask = () => {
    if (!title.trim()) {
      setFormMsg("Please write a question title before posting.");
      return;
    }
    setFormMsg("");
    const q: Question = {
      id: `${Date.now()}`,
      title: title.trim(),
      detail: detail.trim(),
      author: name.trim() || "Anonymous",
      date: new Date().toISOString().slice(0, 10),
      votes: 0,
      answers: [],
    };
    persistUser([q, ...questions]);
    setTitle("");
    setDetail("");
  };

  const vote = (qid: string, aid?: string) => {
    persistUser(
      questions.map((q) =>
        q.id !== qid
          ? q
          : aid
            ? { ...q, answers: q.answers.map((a) => (a.id === aid ? { ...a, votes: a.votes + 1 } : a)) }
            : { ...q, votes: q.votes + 1 }
      )
    );
  };

  const answer = (qid: string) => {
    const text = (answerText[qid] || "").trim();
    if (!text) return;
    persistUser(
      questions.map((q) =>
        q.id !== qid
          ? q
          : {
              ...q,
              answers: [
                ...q.answers,
                {
                  id: `${Date.now()}`,
                  text,
                  author: (answerName[qid] || "").trim() || "Anonymous",
                  date: new Date().toISOString().slice(0, 10),
                  votes: 0,
                },
              ],
            }
      )
    );
    setAnswerText((prev) => ({ ...prev, [qid]: "" }));
  };

  return (
    <div className="max-w-4xl mx-auto px-5 py-10">
      <motion.div variants={slideUp} initial={reduced ? false : "hidden"} animate="visible" className="text-center mb-8">
        <p className="heading-section mb-3">COMMUNITY</p>
        <h1 className="heading-display font-bold mb-4" style={{ fontSize: "clamp(1.8rem, 4vw, 2.6rem)" }}>
          COMMUNITY <span className="text-gradient-gold">Q&A</span>
        </h1>
        <p className="max-w-lg mx-auto text-sm" style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}>
          Ask astrology questions, share knowledge, and upvote helpful answers. Be kind — no medical, legal, or financial advice.
        </p>
          <HonestyNote>Sample discussions below are illustrative. Your own posts are stored only in this browser.</HonestyNote>
      </motion.div>

      {/* Ask */}
      <div className="glass-card p-5 mb-8">
        <h3 className="text-sm font-semibold mb-3" style={{ color: "var(--text-primary)" }}>Ask a Question</h3>
        <input
          className="input-field mb-3"
          placeholder="Question title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <textarea
          className="input-field mb-3"
          rows={2}
          placeholder="Details (optional)"
          value={detail}
          onChange={(e) => setDetail(e.target.value)}
        />
        <div className="flex gap-2">
          <input
            className="input-field"
            placeholder="Your name (optional)"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <button onClick={ask} className="btn-primary text-sm shrink-0">Post</button>
        </div>
        {formMsg && (
          <p className="text-xs mt-2" style={{ color: "var(--champagne)" }}>{formMsg}</p>
        )}
      </div>

      {/* List */}
      <motion.div
        className="space-y-4"
        variants={staggerContainerCustom(stagger.normal, 0.05)}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
      >
        {questions.map((q) => (
          <motion.div key={q.id} className="glass-card p-5" variants={staggerItem}>
            <div className="flex gap-3">
              <button
                onClick={() => vote(q.id)}
                className="flex flex-col items-center gap-0.5 shrink-0"
                aria-label="Upvote question"
              >
                <ArrowBigUp size={18} style={{ color: "#C8956D" }} />
                <span className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>{q.votes}</span>
              </button>
              <div className="grow">
                <button onClick={() => setOpen(open === q.id ? null : q.id)} className="text-left w-full">
                  <h3 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>{q.title}</h3>
                </button>
                <p className="text-xs mb-2" style={{ color: "var(--text-secondary)" }}>
                  by {q.author} · {q.date} · {q.answers.length} answer{q.answers.length === 1 ? "" : "s"}
                </p>
                {q.detail && (
                  <p className="text-sm mb-3" style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}>{q.detail}</p>
                )}
                {open === q.id && (
                  <div className="space-y-3 mt-3">
                    {q.answers.map((a) => (
                      <div key={a.id} className="p-3 rounded-xl" style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)" }}>
                        <div className="flex gap-2">
                          <button onClick={() => vote(q.id, a.id)} aria-label="Upvote answer" className="shrink-0">
                            <ArrowBigUp size={15} style={{ color: "#C8956D" }} />
                          </button>
                          <div>
                            <p className="text-sm" style={{ color: "var(--text-primary)", lineHeight: 1.7 }}>{a.text}</p>
                            <p className="text-[11px] mt-1" style={{ color: "var(--text-secondary)" }}>
                              {a.author} · {a.date} · {a.votes} votes
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                    <div className="flex gap-2">
                      <input
                        className="input-field text-xs"
                        placeholder="Write an answer…"
                        value={answerText[q.id] || ""}
                        onChange={(e) => setAnswerText((prev) => ({ ...prev, [q.id]: e.target.value }))}
                      />
                      <input
                        className="input-field text-xs max-w-32"
                        placeholder="Name"
                        value={answerName[q.id] || ""}
                        onChange={(e) => setAnswerName((prev) => ({ ...prev, [q.id]: e.target.value }))}
                      />
                      <button onClick={() => answer(q.id)} className="btn-ghost text-xs shrink-0">
                        <MessageCircle size={13} /> Reply
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}
