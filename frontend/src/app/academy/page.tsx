"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { BookOpen, Award, ChevronRight } from "lucide-react";
import { useReducedMotion, staggerContainerCustom, staggerItem, slideUp, stagger } from "@/lib/motion";
import { LocalKeys, readLocal, writeLocal } from "@/lib/local";

interface Quiz {
  q: string;
  options: string[];
  answer: number;
}

interface Lesson {
  title: string;
  minutes: number;
  content: string;
}

interface Course {
  id: string;
  title: string;
  level: string;
  duration: string;
  description: string;
  lessons: Lesson[];
  quiz: Quiz[];
}

const COURSES: Course[] = [
  {
    id: "foundations",
    title: "Vedic Astrology Foundations",
    level: "Beginner",
    duration: "4 lessons · 60 min",
    description: "Planets, signs, houses, and how a kundli is structured. No prior knowledge needed.",
    lessons: [
      { title: "The 9 Grahas", minutes: 15, content: "Sun (soul, vitality), Moon (mind, emotions), Mars (courage, action), Mercury (intellect, speech), Jupiter (wisdom, expansion), Venus (love, luxury), Saturn (discipline, karma), Rahu (ambition, illusion), Ketu (detachment, insight). Each planet owns signs and expresses through houses." },
      { title: "The 12 Rashis", minutes: 15, content: "Aries through Pisces. Each sign spans 30° and carries an element (fire, earth, air, water) and a mode (movable, fixed, dual). The Moon's sign is your Rashi; the rising sign is your Lagna." },
      { title: "The 12 Bhavas", minutes: 15, content: "Houses map life areas: 1st self, 2nd wealth/speech, 3rd courage/siblings, 4th home/mother, 5th creativity/children, 6th enemies/disease, 7th marriage/partnership, 8th longevity/transformation, 9th fortune/dharma, 10th career, 11th gains, 12th loss/liberation." },
      { title: "Reading Your First Chart", minutes: 15, content: "Start with Lagna (ascendant), then Moon sign, then check where Jupiter, Saturn, and the nodes sit. Generate your own kundli on AstroSeva and identify these three placements." },
    ],
    quiz: [
      { q: "Which planet signifies the mind and emotions?", options: ["Mars", "Moon", "Saturn", "Rahu"], answer: 1 },
      { q: "How many degrees does each Rashi span?", options: ["15°", "27°", "30°", "36°"], answer: 2 },
      { q: "Which house governs marriage and partnership?", options: ["5th", "7th", "9th", "11th"], answer: 1 },
    ],
  },
  {
    id: "nakshatra",
    title: "Nakshatras & Dashas",
    level: "Intermediate",
    duration: "3 lessons · 50 min",
    description: "The 27 lunar mansions and the Vimshottari dasha timing system.",
    lessons: [
      { title: "27 Lunar Mansions", minutes: 18, content: "The Moon's path is divided into 27 nakshatras of 13°20' each, from Ashwini to Revati. Your birth nakshatra (Janma Nakshatra) sets your Moon's deeper character and your dasha starting point." },
      { title: "Padas and Lords", minutes: 16, content: "Each nakshatra has 4 padas (quarters of 3°20'). Every nakshatra is ruled by a planet — e.g., Ashwini by Ketu, Rohini by Moon, Mrigashira by Mars. The pada determines subtle expression and the navamsha placement." },
      { title: "Vimshottari Dasha", minutes: 16, content: "A 120-year cycle: Ketu 7, Venus 20, Sun 6, Moon 10, Mars 7, Rahu 18, Jupiter 16, Saturn 19, Mercury 17. The balance at birth depends on how much of the birth nakshatra's arc the Moon had already crossed." },
    ],
    quiz: [
      { q: "How many nakshatras are there?", options: ["12", "27", "28", "36"], answer: 1 },
      { q: "Which dasha sequence planet rules 20 years?", options: ["Jupiter", "Saturn", "Venus", "Rahu"], answer: 2 },
      { q: "What determines your dasha balance at birth?", options: ["Sun sign", "Moon's nakshatra position", "Lagna lord", "Weekday"], answer: 1 },
    ],
  },
  {
    id: "matching",
    title: "Compatibility & Remedies",
    level: "Intermediate",
    duration: "3 lessons · 45 min",
    description: "Ashtakoot matching, dosha assessment, and the ethics of remedies.",
    lessons: [
      { title: "Ashtakoot Guna Milan", minutes: 15, content: "Eight kootas scored out of 36: Varna, Vashya, Tara, Yoni, Graha Maitri, Gana, Bhakoot, Nadi. Above 18 is traditionally acceptable; Nadi carries the heaviest single weight at 8 points." },
      { title: "Manglik & Nadi Dosha", minutes: 15, content: "Manglik Dosha arises from Mars in houses 1, 2, 4, 7, 8, or 12 (cancellations exist). Nadi Dosha occurs when both partners share the same Nadi — check it before finalizing matches." },
      { title: "Remedy Ethics", minutes: 15, content: "Remedies support effort; they never replace it. Avoid fear-based upsells, guaranteed-outcome claims, and medical/financial advice. Recommend charity, mantra, routine, and consultation in that order of cost." },
    ],
    quiz: [
      { q: "Total Ashtakoot points?", options: ["28", "32", "36", "40"], answer: 2 },
      { q: "Which koota carries 8 points?", options: ["Gana", "Bhakoot", "Nadi", "Tara"], answer: 2 },
      { q: "Ethical first-line remedy?", options: ["Expensive gemstone", "Charity and routine", "Guaranteed ritual", "Fear-based puja"], answer: 1 },
    ],
  },
];

interface Progress {
  lessonsDone: Record<string, string[]>;
  quizPassed: Record<string, boolean>;
}

function loadProgress(): Progress {
  return readLocal<Progress>(LocalKeys.academy, { lessonsDone: {}, quizPassed: {} });
}

export default function AcademyPage() {
  const [courseId, setCourseId] = useState<string | null>(null);
  const [lessonIdx, setLessonIdx] = useState(0);
  const [showQuiz, setShowQuiz] = useState(false);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [progress, setProgress] = useState<Progress>(() => {
    // Read on first render rather than in an effect: on the server this
    // throws (no localStorage) and falls back, which is exactly what the
    // server rendered before; on the client the saved value shows immediately
    // instead of flashing the empty state first.
    try {
      return loadProgress();
    } catch {
      return { lessonsDone: {}, quizPassed: {} };
    }
  });
  const [student, setStudent] = useState("");
  const reduced = useReducedMotion();

  useEffect(() => {
    document.title = "Learning Academy | AstroSeva";
  }, []);

  const persist = (p: Progress) => {
    setProgress(p);
    writeLocal(LocalKeys.academy, p);
  };

  const course = COURSES.find((c) => c.id === courseId) || null;
  const doneLessons = course ? progress.lessonsDone[course.id] || [] : [];
  const passed = course ? !!progress.quizPassed[course.id] : false;

  const completeLesson = () => {
    if (!course) return;
    const key = `${lessonIdx}`;
    if (!doneLessons.includes(key)) {
      persist({ ...progress, lessonsDone: { ...progress.lessonsDone, [course.id]: [...doneLessons, key] } });
    }
    if (lessonIdx < course.lessons.length - 1) {
      setLessonIdx(lessonIdx + 1);
    } else {
      setShowQuiz(true);
    }
  };

  const quizScore = course ? course.quiz.filter((q, i) => answers[i] === q.answer).length : 0;
  const submitQuiz = () => {
    if (!course) return;
    if (quizScore === course.quiz.length) {
      persist({ ...progress, quizPassed: { ...progress.quizPassed, [course.id]: true } });
    }
  };

  const totalLessons = COURSES.reduce((s, c) => s + c.lessons.length, 0);
  const doneCount = Object.values(progress.lessonsDone).flat().length;
  const certCount = Object.keys(progress.quizPassed).length;

  return (
    <div className="max-w-5xl mx-auto px-5 py-10">
      <motion.div variants={slideUp} initial={reduced ? false : "hidden"} animate="visible" className="text-center mb-8">
        <p className="heading-section mb-3">LEARNING ACADEMY</p>
        <h1 className="heading-display font-bold mb-4" style={{ fontSize: "clamp(1.8rem, 4vw, 2.6rem)" }}>
          LEARN VEDIC <span className="text-gradient-gold">ASTROLOGY</span>
        </h1>
        <p className="max-w-lg mx-auto text-sm" style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}>
          Free structured courses with lessons, quizzes, and certificates of completion.
          Progress: {doneCount}/{totalLessons} lessons · {certCount} certificate{certCount === 1 ? "" : "s"}
        </p>
      </motion.div>

      <AnimatePresence mode="wait">
        {!course ? (
          <motion.div
            key="catalog"
            className="grid grid-cols-1 md:grid-cols-3 gap-4"
            variants={staggerContainerCustom(stagger.normal, 0.06)}
            initial="hidden"
            animate="visible"
            exit={{ opacity: 0 }}
          >
            {COURSES.map((c) => {
              const done = (progress.lessonsDone[c.id] || []).length;
              return (
                <motion.div key={c.id} className="glass-card p-5 flex flex-col" variants={staggerItem}>
                  <div className="flex items-center gap-2 mb-2">
                    <BookOpen size={18} style={{ color: "#C8956D" }} />
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background: "rgba(200,149,109,0.12)", color: "#C8956D" }}>
                      {c.level}
                    </span>
                    {progress.quizPassed[c.id] && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background: "rgba(93,200,143,0.12)", color: "var(--success)" }}>
                        Certified
                      </span>
                    )}
                  </div>
                  <h3 className="text-base font-semibold mb-1" style={{ color: "var(--text-primary)" }}>{c.title}</h3>
                  <p className="text-xs mb-2" style={{ color: "var(--text-secondary)" }}>{c.duration}</p>
                  <p className="text-xs mb-4 grow" style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}>{c.description}</p>
                  <div className="h-1.5 rounded-full overflow-hidden mb-3" style={{ background: "var(--border)" }}>
                    <div className="h-full rounded-full" style={{ width: `${(done / c.lessons.length) * 100}%`, background: "#C8956D" }} />
                  </div>
                  <button onClick={() => { setCourseId(c.id); setLessonIdx(0); setShowQuiz(false); setAnswers({}); }} className="btn-primary text-sm">
                    {done > 0 ? "Continue" : "Start Course"} <ChevronRight size={14} />
                  </button>
                </motion.div>
              );
            })}
          </motion.div>
        ) : !showQuiz ? (
          <motion.div key="lesson" className="glass-card p-6 max-w-3xl mx-auto" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <button onClick={() => setCourseId(null)} className="btn-ghost text-xs mb-4">← All courses</button>
            <p className="text-xs mb-1" style={{ color: "#C8956D" }}>
              {course.title} · Lesson {lessonIdx + 1}/{course.lessons.length}
            </p>
            <h2 className="text-xl font-semibold mb-1" style={{ color: "var(--text-primary)" }}>
              {course.lessons[lessonIdx].title}
            </h2>
            <p className="text-xs mb-4" style={{ color: "var(--text-secondary)" }}>{course.lessons[lessonIdx].minutes} min read</p>
            <p className="text-sm mb-6" style={{ color: "var(--text-secondary)", lineHeight: 1.9 }}>
              {course.lessons[lessonIdx].content}
            </p>
            <div className="flex gap-2">
              {lessonIdx > 0 && (
                <button onClick={() => setLessonIdx(lessonIdx - 1)} className="btn-ghost text-sm">Previous</button>
              )}
              <button onClick={completeLesson} className="btn-primary text-sm">
                {lessonIdx < course.lessons.length - 1 ? "Complete & Next" : "Finish Lessons → Quiz"}
              </button>
            </div>
          </motion.div>
        ) : !passed ? (
          <motion.div key="quiz" className="glass-card p-6 max-w-3xl mx-auto" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <button onClick={() => setShowQuiz(false)} className="btn-ghost text-xs mb-4">← Back to lessons</button>
            <h2 className="text-xl font-semibold mb-1" style={{ color: "var(--text-primary)" }}>Final Exam — {course.title}</h2>
            <p className="text-xs mb-5" style={{ color: "var(--text-secondary)" }}>Answer all {course.quiz.length} correctly to earn your certificate.</p>
            <div className="space-y-5 mb-6">
              {course.quiz.map((q, i) => (
                <div key={i}>
                  <p className="text-sm font-medium mb-2" style={{ color: "var(--text-primary)" }}>{i + 1}. {q.q}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {q.options.map((o, j) => (
                      <button
                        key={j}
                        onClick={() => setAnswers((prev) => ({ ...prev, [i]: j }))}
                        className="text-xs text-left p-2.5 rounded-lg"
                        style={{
                          border: answers[i] === j ? "1.5px solid #C8956D" : "1px solid var(--border-subtle)",
                          background: answers[i] === j ? "rgba(200,149,109,0.1)" : "var(--bg-surface)",
                          color: "var(--text-primary)",
                        }}
                      >
                        {o}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <button onClick={submitQuiz} className="btn-primary text-sm">Submit Exam</button>
            {Object.keys(answers).length < course.quiz.length && (
              <p className="text-xs mt-3" style={{ color: "var(--champagne)" }}>
                Answer all {course.quiz.length} questions to submit ({Object.keys(answers).length}/{course.quiz.length} answered).
              </p>
            )}
            {Object.keys(answers).length === course.quiz.length && quizScore < course.quiz.length && (
              <p className="text-xs mt-3" style={{ color: "var(--danger)" }}>
                Score {quizScore}/{course.quiz.length} — review the lessons and retry.
              </p>
            )}
          </motion.div>
        ) : (
          <motion.div key="cert" className="glass-card p-8 max-w-2xl mx-auto text-center" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
            style={{ borderColor: "rgba(200,149,109,0.4)" }}>
            <Award size={40} style={{ color: "#C8956D" }} className="mx-auto mb-3" />
            <p className="text-xs tracking-[0.25em] uppercase mb-1" style={{ color: "#C8956D" }}>Certificate of Completion</p>
            <h2 className="text-2xl font-bold mb-1" style={{ color: "var(--text-primary)" }}>{course.title}</h2>
            <p className="text-sm mb-4" style={{ color: "var(--text-secondary)" }}>Awarded for completing all lessons and passing the final exam.</p>
            <input
              className="input-field text-center mb-4 max-w-xs mx-auto"
              placeholder="Your name for the certificate"
              value={student}
              onChange={(e) => setStudent(e.target.value)}
            />
            <p className="text-lg font-semibold" style={{ color: "var(--champagne)" }}>{student || "Your Name"}</p>
            <p className="text-xs mb-5" style={{ color: "var(--text-secondary)" }}>{new Date().toISOString().slice(0, 10)} · AstroSeva Academy</p>
            <button onClick={() => { setCourseId(null); setShowQuiz(false); }} className="btn-ghost text-sm">Back to catalog</button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
