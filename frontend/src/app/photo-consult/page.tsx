"use client";

import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Camera, User } from "lucide-react";
import { useReducedMotion, staggerContainerCustom, staggerItem, slideUp, stagger } from "@/lib/motion";
import { LocalKeys, readLocal, writeLocal } from "@/lib/local";

interface ConsultRequest {
  id: string;
  name: string;
  topic: string;
  question: string;
  submitted: string;
  status: string;
}

const TOPICS = ["Palm Reading", "Face Reading", "Career Guidance", "Marriage & Compatibility", "Health Overview", "General Life Reading"];
const KEY = "astroseva_photo_consults";

function load(): ConsultRequest[] {
  return readLocal<ConsultRequest[]>(LocalKeys.photoConsults, []);
}

export default function PhotoConsultPage() {
  const [name, setName] = useState("");
  const [topic, setTopic] = useState(TOPICS[0]);
  const [question, setQuestion] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [requests, setRequests] = useState<ConsultRequest[]>(() => load());
  const [msg, setMsg] = useState("");
  const reduced = useReducedMotion();

  useEffect(() => {
    document.title = "Photo Consultation | AstroSeva";
  }, []);

  const onPhoto = (file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPhoto(String(reader.result));
    reader.readAsDataURL(file);
  };

  const submit = () => {
    setMsg("");
    if (!name.trim()) {
      setMsg("Please enter your name.");
      return;
    }
    if (!photo) {
      setMsg("Please attach a clear photo (palm or face).");
      return;
    }
    if (!question.trim()) {
      setMsg("Please write your question.");
      return;
    }
    const entry: ConsultRequest = {
      id: `${Date.now()}`,
      name: name.trim(),
      topic,
      question: question.trim(),
      submitted: new Date().toISOString().slice(0, 10),
      status: "Preview queued — expert review launches soon",
    };
    const next = [entry, ...requests];
    setRequests(next);
    writeLocal(LocalKeys.photoConsults, next);
    setName("");
    setQuestion("");
    setPhoto(null);
    setMsg("Request noted as a preview. Expert review with report delivery is launching soon.");
  };

  return (
    <div className="max-w-4xl mx-auto px-5 py-10">
      <motion.div variants={slideUp} initial={reduced ? false : "hidden"} animate="visible" className="text-center mb-8">
        <p className="heading-section mb-3">PREMIUM SERVICE</p>
        <h1 className="heading-display font-bold mb-4" style={{ fontSize: "clamp(1.8rem, 4vw, 2.6rem)" }}>
          PHOTO <span className="text-gradient-gold">CONSULTATION</span>
        </h1>
        <p className="max-w-lg mx-auto text-sm" style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}>
          Upload a clear palm or face photo with your question. Expert photo review with
          24–48 hour report delivery is launching soon — for now, queue your request below
          as a preview of the flow.
        </p>
      </motion.div>

      <div className="glass-card p-5 mb-8">
        <div className="grid md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="input-label" htmlFor="pc-name"><User size={12} className="inline mr-1" />Name</label>
            <input id="pc-name" className="input-field" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
          </div>
          <div>
            <label className="input-label" htmlFor="pc-topic">Topic</label>
            <select id="pc-topic" className="input-field" value={topic} onChange={(e) => setTopic(e.target.value)}>
              {TOPICS.map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>
        </div>
        <div className="mb-4">
          <label className="input-label" htmlFor="pc-photo"><Camera size={12} className="inline mr-1" />Photo (palm or face, well-lit)</label>
          <input
            id="pc-photo"
            type="file"
            accept="image/*"
            className="input-field"
            onChange={(e) => onPhoto(e.target.files?.[0])}
          />
          {photo && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photo} alt="Upload preview" className="mt-3 rounded-xl max-h-56" />
          )}
        </div>
        <div className="mb-4">
          <label className="input-label" htmlFor="pc-q">Your Question</label>
          <textarea
            id="pc-q"
            className="input-field"
            rows={3}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="What should the expert focus on?"
          />
        </div>
        {msg && <p className="text-xs mb-3" style={{ color: "var(--champagne)" }}>{msg}</p>}
        <button onClick={submit} className="btn-primary">Submit for Review</button>
        <p className="text-xs mt-3" style={{ color: "var(--text-tertiary)" }}>
          By submitting you consent to expert review of your photo. Photos never leave your device in this build.
        </p>
      </div>

      {requests.length > 0 && (
        <motion.div
          className="space-y-3"
          variants={staggerContainerCustom(stagger.normal, 0.06)}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          {requests.map((r) => (
            <motion.div key={r.id} className="glass-card p-4" variants={staggerItem}>
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                  {r.topic} — {r.name}
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: "rgba(200,149,109,0.12)", color: "#C8956D" }}>
                  {r.submitted}
                </span>
              </div>
              <p className="text-xs mb-1" style={{ color: "var(--text-secondary)" }}>{r.question}</p>
              <p className="text-xs" style={{ color: "var(--champagne)" }}>{r.status}</p>
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
}
