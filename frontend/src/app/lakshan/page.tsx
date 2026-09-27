"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { Sun } from "lucide-react";
import { useReducedMotion, staggerContainerCustom, staggerItem, slideUp, stagger } from "@/lib/motion";

interface Tip {
  title: string;
  text: string;
  category: string;
}

const TIPS: Tip[] = [
  { title: "Morning Sun Offering", text: "Offer water to the rising Sun (Surya Arghya) while chanting Om Suryaya Namah 7 times for vitality and confidence.", category: "Daily Ritual" },
  { title: "Tulsi Care", text: "Water the Tulsi plant in the morning and circumambulate it. A healthy Tulsi is said to invite positive energy into the home.", category: "Home" },
  { title: "Feed Crows on Saturday", text: "Offering food to crows on Saturdays is a traditional remedy associated with Saturn and ancestral peace.", category: "Remedy" },
  { title: "Light a Ghee Lamp", text: "Lighting a ghee lamp at dusk in the northeast direction supports clarity and calm in Vedic tradition.", category: "Daily Ritual" },
  { title: "Chant Before Sleep", text: "Chanting Om Namah Shivaya 11 times before sleep is believed to settle the mind and improve rest.", category: "Mantra" },
  { title: "Donate on Mondays", text: "Donating white items (rice, milk, white cloth) on Mondays is linked with strengthening the Moon.", category: "Remedy" },
  { title: "Keep the Entrance Clean", text: "A clean, well-lit entrance is considered the first Lakshan (sign) of a harmonious home.", category: "Home" },
  { title: "Tuesday Hanuman Remembrance", text: "Reciting the Hanuman Chalisa on Tuesdays is traditionally done for courage and protection from Mars afflictions.", category: "Mantra" },
  { title: "Respect Elders' Blessings", text: "Seeking elders' blessings daily is regarded as a living remedy for Jupiter-related obstacles.", category: "Conduct" },
  { title: "Avoid Harsh Speech", text: "Speech governed by Mercury — speaking kindly, especially on Wednesdays, supports smoother communication.", category: "Conduct" },
  { title: "Fast Awareness", text: "Those who fast (e.g., Ekadashi, Purnima) should keep it voluntary and health-first; tradition values intention over austerity.", category: "Daily Ritual" },
  { title: "Peepal Tree Respect", text: "Avoid harming Peepal trees; offering water on Saturdays is a traditional Saturn remedy.", category: "Remedy" },
  { title: "Wear Clean Colors Friday", text: "Fridays honor Venus — wearing clean, light-colored clothes is a simple traditional observance.", category: "Daily Ritual" },
  { title: "Help the Needy", text: "Anonymous donation (gupt daan) is considered the most sattvic form of charity across Vedic texts.", category: "Conduct" },
  { title: "Meditate at Brahma Muhurta", text: "Even 10 minutes of meditation before sunrise supports Moon (mind) balance.", category: "Mantra" },
  { title: "Iron and Black Sesame", text: "Donating black sesame or iron on Saturdays is a classic Shani remedy for those in Sade Sati.", category: "Remedy" },
  { title: "Keep Study Space East-Facing", text: "Students are traditionally advised to face east while studying, honoring Jupiter's wisdom.", category: "Home" },
  { title: "Gayatri at Dawn", text: "Chanting the Gayatri Mantra at dawn is said to sharpen intellect and focus.", category: "Mantra" },
  { title: "Feed Dogs", text: "Feeding dogs, especially black dogs, is associated with Ketu and Bhairava remedies.", category: "Remedy" },
  { title: "Silver for the Moon", text: "Wearing silver or keeping silver items clean is a gentle traditional support for emotional balance.", category: "Remedy" },
  { title: "Thursday Yellow", text: "Yellow clothes and turmeric donations on Thursdays honor Jupiter.", category: "Daily Ritual" },
  { title: "Forgive Before Festivals", text: "Clearing grudges before festivals is treated as inner Lakshan-shuddhi (purification of signs).", category: "Conduct" },
  { title: "Cow Service", text: "Serving or feeding cows (gau seva) is regarded as a remedy covering all nine planets.", category: "Remedy" },
  { title: "Keep Nails and Hair Tidy", text: "Samudra Sastra links personal grooming with Saturn discipline — small habits, steady effects.", category: "Conduct" },
  { title: "Evening Aarti", text: "A brief evening aarti or lamp-lighting marks the transition from day's activity to night's rest.", category: "Daily Ritual" },
  { title: "Water the Roots", text: "Pouring water at the base of sacred trees rather than leaves is the traditional method — intention with precision.", category: "Home" },
  { title: "Observe Silence Weekly", text: "An hour of voluntary silence (mauna) weekly calms Mercury and sharpens listening.", category: "Conduct" },
  { title: "Sandalwood Tilak", text: "Applying sandalwood tilak on the forehead is linked with cooling an aggravated Mars or Sun.", category: "Remedy" },
  { title: "Read One Verse Daily", text: "Reading one verse of the Bhagavad Gita daily builds steady Jupiter wisdom over time.", category: "Mantra" },
  { title: "Gratitude Before Meals", text: "Pausing in gratitude before meals honors Annapurna and supports Venusian contentment.", category: "Daily Ritual" },
];

function dayOfYear(d: Date): number {
  const start = new Date(d.getFullYear(), 0, 0);
  return Math.floor((d.getTime() - start.getTime()) / 86400000);
}

export default function LakshanPage() {
  const [category, setCategory] = useState("All");
  const reduced = useReducedMotion();

  useEffect(() => {
    document.title = "Daily Lakshan Tips | AstroSeva";
  }, []);

  const todayTip = useMemo(() => TIPS[dayOfYear(new Date()) % TIPS.length], []);
  const categories = useMemo(() => ["All", ...Array.from(new Set(TIPS.map((t) => t.category)))], []);
  const shown = category === "All" ? TIPS : TIPS.filter((t) => t.category === category);

  return (
    <div className="max-w-5xl mx-auto px-5 py-10">
      <motion.div variants={slideUp} initial={reduced ? false : "hidden"} animate="visible" className="text-center mb-8">
        <p className="heading-section mb-3">DAILY WISDOM</p>
        <h1 className="heading-display font-bold mb-4" style={{ fontSize: "clamp(1.8rem, 4vw, 2.6rem)" }}>
          DAILY LAKSHAN <span className="text-gradient-gold">TIPS</span>
        </h1>
        <p className="max-w-lg mx-auto text-sm" style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}>
          Traditional signs, remedies, and daily observances from Vedic wisdom — one for each day.
        </p>
      </motion.div>

      {/* Today's tip */}
      <motion.div className="glass-card p-6 mb-8" variants={slideUp} initial={reduced ? false : "hidden"} animate="visible"
        style={{ borderColor: "rgba(200,149,109,0.35)" }}>
        <div className="flex items-center gap-2 mb-2">
          <Sun size={18} style={{ color: "#C8956D" }} />
          <span className="text-xs font-bold tracking-[0.2em] uppercase" style={{ color: "#C8956D" }}>
            Today · {todayTip.category}
          </span>
        </div>
        <h2 className="text-xl font-semibold mb-2" style={{ color: "var(--text-primary)" }}>{todayTip.title}</h2>
        <p className="text-sm" style={{ color: "var(--text-secondary)", lineHeight: 1.8 }}>{todayTip.text}</p>
      </motion.div>

      {/* Filter */}
      <div className="flex gap-2 flex-wrap justify-center mb-6">
        {categories.map((c) => (
          <button key={c} onClick={() => setCategory(c)} className={category === c ? "btn-primary text-xs" : "btn-ghost text-xs"}>
            {c}
          </button>
        ))}
      </div>

      <motion.div
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
        variants={staggerContainerCustom(stagger.normal, 0.05)}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-40px" }}
      >
        {shown.map((t) => (
          <motion.div key={t.title} className="glass-card p-5" variants={staggerItem}>
            <p className="text-[10px] font-bold tracking-[0.2em] uppercase mb-1" style={{ color: "#C8956D" }}>
              {t.category}
            </p>
            <h3 className="text-base font-semibold mb-1" style={{ color: "var(--text-primary)" }}>{t.title}</h3>
            <p className="text-xs" style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}>{t.text}</p>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}
