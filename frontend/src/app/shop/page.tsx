"use client";

import { useState } from "react";
import { useEffect } from "react";
import { motion } from "motion/react";
import {
  ShoppingCart,
  Gem,
  Flame,
  BookOpen,
  Package,
  Monitor,
  Star,
  ChevronDown,
  AlertCircle,
} from "lucide-react";
import {
  useReducedMotion,
  staggerContainerCustom,
  staggerItem,
  slideUp,
  stagger,
} from "@/lib/motion";

type ProductCategory =
  | "Gemstones & Rudraksha"
  | "Puja Items"
  | "Books & Charts"
  | "Ritual Kits"
  | "Astrology Software"
  | "Consultation Packages";

interface Product {
  id: number;
  name: string;
  category: ProductCategory;
  price: number;
  description: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}

const products: Product[] = [
  {
    id: 1,
    name: "Ruby (Manikya) Gemstone",
    category: "Gemstones & Rudraksha",
    price: 12999,
    description: "Authentic Ruby gemstone for Sun remedies. certified natural stone.",
    icon: Gem,
  },
  {
    id: 2,
    name: "Pearl (Moti) Gemstone",
    category: "Gemstones & Rudraksha",
    price: 4999,
    description: "Natural Pearl for Moon calming. Original sea pearl.",
    icon: Gem,
  },
  {
    id: 3,
    name: "Red Coral (Moonga)",
    category: "Gemstones & Rudraksha",
    price: 7999,
    description: "Genuine Red Coral for Mars energy. Italian origin.",
    icon: Gem,
  },
  {
    id: 4,
    name: "Emerald (Panna)",
    category: "Gemstones & Rudraksha",
    price: 15999,
    description: "Colombian Emerald for Mercury intelligence. Flawless grade.",
    icon: Gem,
  },
  {
    id: 5,
    name: "Yellow Sapphire (Pukhraj)",
    category: "Gemstones & Rudraksha",
    price: 9999,
    description: "Ceylon Yellow Sapphire for Jupiter blessings. Vedic certified.",
    icon: Gem,
  },
  {
    id: 6,
    name: "Blue Sapphire (Neelam)",
    category: "Gemstones & Rudraksha",
    price: 19999,
    description: "Sri Lankan Blue Sapphire for Saturn. Must be tested before wearing.",
    icon: Gem,
  },
  {
    id: 7,
    name: "Hessonite (Gomed)",
    category: "Gemstones & Rudraksha",
    price: 5999,
    description: "Cinnamon Hessonite for Rahu remedies. AAA grade.",
    icon: Gem,
  },
  {
    id: 8,
    name: "Cat's Eye (Lehsunia)",
    category: "Gemstones & Rudraksha",
    price: 6499,
    description: "Chrysoberyl Cat's Eye for Ketu protection. Strong chatoyancy.",
    icon: Gem,
  },
  {
    id: 9,
    name: "Diamond (Heera)",
    category: "Gemstones & Rudraksha",
    price: 29999,
    description: "Natural Diamond for Venus luxury. VVS clarity.",
    icon: Gem,
  },
  {
    id: 10,
    name: "Rudraksha - 1 to 21 Mukhi",
    category: "Gemstones & Rudraksha",
    price: 399,
    description: "Original Nepali Rudraksha beads. All mukhi sizes available.",
    icon: Gem,
  },
  {
    id: 11,
    name: "Brass Ganesh Idol",
    category: "Puja Items",
    price: 1299,
    description: "Handcrafted brass Lord Ganesh idol. 6 inch height.",
    icon: Flame,
  },
  {
    id: 12,
    name: "Navagraha Yantra",
    category: "Puja Items",
    price: 2499,
    description: "Silver-plated Navagraha Yantra for planetary peace.",
    icon: Flame,
  },
  {
    id: 13,
    name: "Premium Sandalwood Incense",
    category: "Puja Items",
    price: 349,
    description: "Pure sandalwood agarbatti. 12 sticks per pack.",
    icon: Flame,
  },
  {
    id: 14,
    name: "Kumkum (Premium)",
    category: "Puja Items",
    price: 199,
    description: "Vermillion kumkum for puja and tilak. Pure quality.",
    icon: Flame,
  },
  {
    id: 15,
    name: "Organic Haldi Powder",
    category: "Puja Items",
    price: 149,
    description: "Pure organic turmeric for puja rituals. 100g pack.",
    icon: Flame,
  },
  {
    id: 16,
    name: "Complete Vedic Astrology Guide",
    category: "Books & Charts",
    price: 899,
    description: "Comprehensive book covering all Vedic astrology concepts.",
    icon: BookOpen,
  },
  {
    id: 17,
    name: "Birth Chart Template Pack",
    category: "Books & Charts",
    price: 299,
    description: "Printable Kundli templates in North & South Indian styles.",
    icon: BookOpen,
  },
  {
    id: 18,
    name: "2026 Panchang Calendar",
    category: "Books & Charts",
    price: 499,
    description: "Yearly panchang with daily tithi, nakshatra, muhurat.",
    icon: BookOpen,
  },
  {
    id: 19,
    name: "Navagraha Shanti Kit",
    category: "Ritual Kits",
    price: 4999,
    description: "Complete kit for Navagraha Shanti puja. Includes all samagri.",
    icon: Package,
  },
  {
    id: 20,
    name: "Manglik Remedies Kit",
    category: "Ritual Kits",
    price: 3499,
    description: "Remedies kit for Manglik dosha cancellation. Expert curated.",
    icon: Package,
  },
  {
    id: 22,
    name: "AstroSage Desktop Software",
    category: "Astrology Software",
    price: 2499,
    description: "Professional Vedic astrology software with 50+ reports.",
    icon: Monitor,
  },
  {
    id: 23,
    name: "Kundli Pro Mobile App",
    category: "Astrology Software",
    price: 999,
    description: "Full-featured astrology app. Annual subscription.",
    icon: Monitor,
  },
  {
    id: 24,
    name: "Basic Consultation",
    category: "Consultation Packages",
    price: 1499,
    description: "30-min session with Vedic astrologer. Birth chart analysis.",
    icon: Star,
  },
  {
    id: 25,
    name: "Premium Consultation",
    category: "Consultation Packages",
    price: 3999,
    description: "60-min deep session with remedies & follow-up report.",
    icon: Star,
  },
  {
    id: 26,
    name: "Premium+ Consultation",
    category: "Consultation Packages",
    price: 7999,
    description: "90-min VIP session. Yearly guidance + 3 follow-ups included.",
    icon: Star,
  },
];

const categoryFilters: ProductCategory[] = [
  "Gemstones & Rudraksha",
  "Puja Items",
  "Books & Charts",
  "Ritual Kits",
  "Astrology Software",
  "Consultation Packages",
];

const sortOptions = [
  { label: "Price: Low to High", value: "price-asc" },
  { label: "Price: High to Low", value: "price-desc" },
  { label: "Name: A to Z", value: "name-asc" },
] as const;

type SortKey = (typeof sortOptions)[number]["value"];

function formatINR(n: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
}

export default function ShopPage() {
  const reduced = useReducedMotion();
  const [selectedCategory, setSelectedCategory] = useState<ProductCategory | "All">("All");
  const [sortKey, setSortKey] = useState<SortKey>("price-asc");
  const [sortOpen, setSortOpen] = useState(false);

  useEffect(() => {
    document.title = "Shop | AstroSeva";
  }, []);

  const filtered = products
    .filter((p) => selectedCategory === "All" || p.category === selectedCategory)
    .sort((a, b) => {
      switch (sortKey) {
        case "price-asc":
          return a.price - b.price;
        case "price-desc":
          return b.price - a.price;
        case "name-asc":
          return a.name.localeCompare(b.name);
      }
    });

  return (
    <div className="py-20 px-5" style={{ background: "#1a0f0a" }}>
      <div className="max-w-6xl mx-auto">
        {/* Coming Soon Banner */}
        <motion.div
          className="mb-10 p-4 rounded-xl text-center"
          style={{
            background: "linear-gradient(135deg, rgba(200,149,109,0.12), rgba(232,184,138,0.08))",
            border: "1px solid rgba(200,149,109,0.25)",
          }}
          variants={slideUp}
          initial={reduced ? false : "hidden"}
          animate="visible"
        >
          <div className="flex items-center justify-center gap-2 mb-1">
            <AlertCircle size={16} style={{ color: "#E8B88A" }} />
            <span
              className="text-xs font-bold tracking-[0.15em] uppercase"
              style={{ color: "#E8B88A" }}
            >
              Coming Soon
            </span>
          </div>
          <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
            Our shop is launching soon. Browse the catalogue below — orders will open shortly.
          </p>
        </motion.div>

        {/* Header */}
        <motion.div
          className="text-center mb-12"
          variants={slideUp}
          initial={reduced ? false : "hidden"}
          animate="visible"
        >
          <p className="heading-section mb-3">ASTROSEVA SHOP</p>
          <h1
            className="heading-display font-bold mb-4"
            style={{ fontSize: "clamp(1.8rem, 4vw, 3rem)" }}
          >
            <span
              style={{
                background: "linear-gradient(135deg, #C8956D, #E8B88A, #D4A574)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              ASTRO SEVA
            </span>{" "}
            SHOP
          </h1>
          <p
            className="max-w-lg mx-auto"
            style={{
              color: "var(--text-secondary)",
              lineHeight: 1.7,
              fontSize: "1rem",
            }}
          >
            Authentic Vedic Astrology Products — Gemstones, Puja Items, Books,
            Ritual Kits, Software & Consultations.
          </p>
        </motion.div>

        {/* Cart Icon (placeholder) */}
        <motion.div
          className="fixed top-5 right-5 z-50 glass-card p-3 cursor-pointer"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          style={{ borderRadius: "50%" }}
          title="Cart (Coming Soon)"
        >
          <ShoppingCart size={20} style={{ color: "#C8956D" }} />
        </motion.div>

        {/* Filters */}
        <motion.div
          className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-8"
          initial={reduced ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          {/* Category Filter */}
          <div className="flex flex-wrap gap-2">
            <button
              className="text-xs px-3 py-1.5 rounded-lg font-medium transition-all"
              style={{
                background:
                  selectedCategory === "All"
                    ? "linear-gradient(135deg, #C8956D, #B8854D)"
                    : "rgba(245,245,245,0.04)",
                color: selectedCategory === "All" ? "#060610" : "var(--text-secondary)",
                border: `1px solid ${selectedCategory === "All" ? "transparent" : "var(--border)"}`,
              }}
              onClick={() => setSelectedCategory("All")}
            >
              All
            </button>
            {categoryFilters.map((cat) => (
              <button
                key={cat}
                className="text-xs px-3 py-1.5 rounded-lg font-medium transition-all"
                style={{
                  background:
                    selectedCategory === cat
                      ? "linear-gradient(135deg, #C8956D, #B8854D)"
                      : "rgba(245,245,245,0.04)",
                  color: selectedCategory === cat ? "#060610" : "var(--text-secondary)",
                  border: `1px solid ${selectedCategory === cat ? "transparent" : "var(--border)"}`,
                }}
                onClick={() => setSelectedCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Sort Dropdown */}
          <div className="relative ml-auto">
            <button
              className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg font-medium"
              style={{
                background: "rgba(245,245,245,0.04)",
                border: "1px solid var(--border)",
                color: "var(--text-secondary)",
              }}
              onClick={() => setSortOpen(!sortOpen)}
            >
              {sortOptions.find((o) => o.value === sortKey)?.label}
              <ChevronDown size={12} />
            </button>
            {sortOpen && (
              <div
                className="absolute right-0 mt-1 w-48 rounded-lg overflow-hidden z-40"
                style={{
                  background: "var(--deep-indigo)",
                  border: "1px solid var(--border)",
                  boxShadow: "var(--shadow-lg)",
                }}
              >
                {sortOptions.map((opt) => (
                  <button
                    key={opt.value}
                    className="block w-full text-left text-xs px-3 py-2 transition-colors"
                    style={{
                      color: sortKey === opt.value ? "#C8956D" : "var(--text-secondary)",
                      background: sortKey === opt.value ? "rgba(200,149,109,0.08)" : "transparent",
                    }}
                    onClick={() => {
                      setSortKey(opt.value);
                      setSortOpen(false);
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </motion.div>

        {/* Products Grid */}
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
          variants={staggerContainerCustom(stagger.normal, 0.05)}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-40px" }}
        >
          {filtered.map((product) => {
            const Icon = product.icon;
            return (
              <motion.div key={product.id} variants={staggerItem}>
                <div className="glass-card p-5 h-full flex flex-col group">
                  {/* Image Placeholder */}
                  <div
                    className="w-full h-36 rounded-lg mb-4 flex items-center justify-center"
                    style={{
                      background: "linear-gradient(135deg, rgba(200,149,109,0.06), rgba(232,184,138,0.03))",
                      border: "1px dashed rgba(200,149,109,0.2)",
                    }}
                  >
                    <Icon size={32} className="text-[rgba(200,149,109,0.3)]" />
                  </div>

                  {/* Category Badge */}
                  <span
                    className="text-[9px] px-2 py-0.5 rounded-full font-medium self-start mb-2"
                    style={{
                      background: "rgba(200,149,109,0.12)",
                      color: "#C8956D",
                    }}
                  >
                    {product.category}
                  </span>

                  {/* Name */}
                  <h3
                    className="text-sm font-semibold mb-1"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {product.name}
                  </h3>

                  {/* Description */}
                  <p
                    className="text-xs leading-relaxed mb-4 flex-1"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {product.description}
                  </p>

                  {/* Price */}
                  <p
                    className="text-base font-bold mb-3"
                    style={{
                      background: "linear-gradient(135deg, #C8956D, #E8B88A)",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                    }}
                  >
                    {formatINR(product.price)}
                  </p>

                  {/* Add to Cart Button */}
                  <button
                    className="btn-primary w-full text-xs"
                    disabled
                    title="Coming Soon"
                  >
                    Coming Soon
                  </button>
                </div>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Empty State */}
        {filtered.length === 0 && (
          <motion.div
            className="text-center py-16"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              No products found in this category.
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
}
