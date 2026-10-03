import { zodiacIcons } from "@/components/icons/ZodiacIcons";

const SIGNS = [
  "aries",
  "taurus",
  "gemini",
  "cancer",
  "leo",
  "virgo",
  "libra",
  "scorpio",
  "sagittarius",
  "capricorn",
  "aquarius",
  "pisces",
];

/** Deterministic starfield: positions derive from the index, so server and
 * client render the same sky and hydration never mismatches. */
function star(i: number, w: number, h: number) {
  const x = (i * 197.33 + 41) % w;
  const y = (i * 131.71 + 17) % h;
  const r = [0.7, 1, 1.4, 0.9, 1.2][i % 5];
  const gold = i % 9 === 0;
  const opacity = gold ? 0.5 + ((i * 7) % 30) / 100 : 0.18 + ((i * 13) % 45) / 100;
  return { x, y, r, opacity, fill: gold ? "#E3C76B" : "#FFFFFF" };
}

const STARS = Array.from({ length: 110 }, (_, i) => star(i, 640, 600));

/**
 * The hero sky: midnight gradient, three depths of stars, tilted orbital
 * rings, shaded planets, a zodiac wheel with a radiant sun, and a
 * mountain-and-temple horizon under atmospheric haze. Pure vector -- there are
 * no raster assets in the project, so depth comes from layered gradients,
 * opacity and one soft blur. Decorative only.
 */
export default function CelestialScene() {
  const cx = 320;
  const cy = 262;
  const wheelR = 148;

  return (
    <svg
      viewBox="0 0 640 600"
      className="w-full h-full"
      role="img"
      aria-label="Celestial sky with zodiac wheel over mountain temples"
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <linearGradient id="cs-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0B0D22" />
          <stop offset="55%" stopColor="#14173A" />
          <stop offset="82%" stopColor="#2A2145" />
          <stop offset="100%" stopColor="#3A2A44" />
        </linearGradient>
        <radialGradient id="cs-amber" cx="0.35" cy="0.35" r="0.9">
          <stop offset="0%" stopColor="#F2D98B" />
          <stop offset="45%" stopColor="#C9A227" />
          <stop offset="100%" stopColor="#7A5F16" />
        </radialGradient>
        <radialGradient id="cs-slate" cx="0.35" cy="0.35" r="0.9">
          <stop offset="0%" stopColor="#B9C4DE" />
          <stop offset="45%" stopColor="#5D6B94" />
          <stop offset="100%" stopColor="#232A45" />
        </radialGradient>
        <radialGradient id="cs-rust" cx="0.35" cy="0.35" r="0.9">
          <stop offset="0%" stopColor="#E8A07A" />
          <stop offset="45%" stopColor="#A85B38" />
          <stop offset="100%" stopColor="#4A2418" />
        </radialGradient>
        <radialGradient id="cs-sun" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="#F6E27A" />
          <stop offset="55%" stopColor="#E3B93C" />
          <stop offset="100%" stopColor="#9A7418" />
        </radialGradient>
        <radialGradient id="cs-glow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="#E3C76B" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#E3C76B" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="cs-vignette" cx="0.5" cy="0.46" r="0.75">
          <stop offset="55%" stopColor="#060818" stopOpacity="0" />
          <stop offset="100%" stopColor="#060818" stopOpacity="0.6" />
        </radialGradient>
        <filter id="cs-blur" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="16" />
        </filter>
      </defs>

      {/* sky */}
      <rect x="0" y="0" width="640" height="600" fill="url(#cs-sky)" />

      {/* stars */}
      {STARS.map((s, i) => (
        <circle key={i} cx={s.x} cy={s.y} r={s.r} fill={s.fill} opacity={s.opacity} />
      ))}

      {/* tilted orbital rings */}
      <ellipse cx={cx} cy={cy} rx="296" ry="118" fill="none" stroke="#F5F1E8" strokeOpacity="0.10" strokeWidth="1" transform={`rotate(-16 ${cx} ${cy})`} />
      <ellipse cx={cx} cy={cy} rx="252" ry="196" fill="none" stroke="#C9A227" strokeOpacity="0.10" strokeWidth="1" transform={`rotate(10 ${cx} ${cy})`} />
      <ellipse cx={cx} cy={cy} rx="210" ry="90" fill="none" stroke="#F5F1E8" strokeOpacity="0.07" strokeWidth="1" transform={`rotate(-16 ${cx} ${cy})`} />
      <circle cx={cx - 248} cy={cy + 62} r="2.4" fill="#E3C76B" opacity="0.9" />
      <circle cx={cx + 212} cy={cy - 96} r="1.8" fill="#F5F1E8" opacity="0.8" />

      {/* planets */}
      <circle cx="96" cy="128" r="52" fill="url(#cs-glow)" />
      <circle cx="96" cy="128" r="30" fill="url(#cs-amber)" />
      <path d="M68 120 Q96 128 124 120" stroke="#7A5F16" strokeWidth="2.5" fill="none" opacity="0.6" />
      <path d="M68 134 Q96 142 124 134" stroke="#7A5F16" strokeWidth="2" fill="none" opacity="0.45" />
      <ellipse cx="96" cy="128" rx="44" ry="10" fill="none" stroke="#E3C76B" strokeOpacity="0.35" strokeWidth="1.5" transform={`rotate(-14 96 128)`} />

      <circle cx="548" cy="92" r="34" fill="url(#cs-glow)" />
      <circle cx="548" cy="92" r="20" fill="url(#cs-slate)" />
      <circle cx="542" cy="86" r="4" fill="#B9C4DE" opacity="0.5" />

      <circle cx="576" cy="330" r="20" fill="url(#cs-glow)" />
      <circle cx="576" cy="330" r="11" fill="url(#cs-rust)" />

      <circle cx="40" cy="472" r="7" fill="#D8DCEC" opacity="0.85" />
      <circle cx="38" cy="470" r="2.2" fill="#9AA3C0" opacity="0.6" />

      {/* zodiac wheel */}
      <circle cx={cx} cy={cy} r={wheelR} fill="none" stroke="#C9A227" strokeOpacity="0.55" strokeWidth="1.5" />
      <circle cx={cx} cy={cy} r={wheelR - 10} fill="none" stroke="#F5F1E8" strokeOpacity="0.22" strokeWidth="0.75" />
      {SIGNS.map((sign, i) => {
        const a = ((i * 30 - 90) * Math.PI) / 180;
        const x1 = cx + (wheelR - 32) * Math.cos(a);
        const y1 = cy + (wheelR - 32) * Math.sin(a);
        const x2 = cx + (wheelR - 10) * Math.cos(a);
        const y2 = cy + (wheelR - 10) * Math.sin(a);
        const gx = cx + (wheelR - 21) * Math.cos(a + Math.PI / 12);
        const gy = cy + (wheelR - 21) * Math.sin(a + Math.PI / 12);
        const Glyph = zodiacIcons[sign];
        return (
          <g key={sign}>
            <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#C9A227" strokeOpacity="0.4" strokeWidth="1" />
            <g transform={`translate(${gx - 11}, ${gy - 11})`}>
              {Glyph ? <Glyph size={22} color="#C9A227" /> : null}
            </g>
          </g>
        );
      })}
      <circle cx={cx} cy={cy} r="98" fill="none" stroke="#F5F1E8" strokeOpacity="0.16" strokeWidth="0.75" />
      <circle cx={cx} cy={cy} r="62" fill="none" stroke="#C9A227" strokeOpacity="0.3" strokeWidth="0.75" />

      {/* radiant sun */}
      <circle cx={cx} cy={cy} r="56" fill="url(#cs-glow)" />
      {Array.from({ length: 12 }, (_, i) => {
        const a = ((i * 30) * Math.PI) / 180;
        return (
          <line
            key={i}
            x1={cx + 40 * Math.cos(a)}
            y1={cy + 40 * Math.sin(a)}
            x2={cx + 48 * Math.cos(a)}
            y2={cy + 48 * Math.sin(a)}
            stroke="#E3C76B"
            strokeOpacity="0.8"
            strokeWidth="2"
            strokeLinecap="round"
          />
        );
      })}
      <circle cx={cx} cy={cy} r="30" fill="url(#cs-sun)" />
      <circle cx={cx - 8} cy={cy - 9} r="7" fill="#FBEFC0" opacity="0.7" />

      {/* far mountain range in haze */}
      <path
        d="M0,522 L70,448 L140,498 L215,428 L295,500 L370,442 L450,505 L530,452 L640,510 L640,600 L0,600 Z"
        fill="#252847"
        opacity="0.85"
      />
      {/* near range */}
      <path
        d="M0,562 L105,492 L195,548 L315,482 L425,552 L535,502 L640,556 L640,600 L0,600 Z"
        fill="#12142C"
      />
      {/* temple silhouette on the near ridge */}
      <g fill="#0B0D21">
        <rect x="398" y="492" width="64" height="14" />
        <rect x="404" y="480" width="52" height="12" />
        <rect x="410" y="468" width="40" height="12" />
        <rect x="416" y="456" width="28" height="12" />
        <rect x="421" y="446" width="18" height="10" />
        <path d="M424 446 A6 6 0 0 1 436 446 Z" />
        <rect x="428.5" y="434" width="3" height="12" />
        <circle cx="430" cy="432" r="2.4" />
        <path d="M431 428 L441 431 L431 434 Z" fill="#C9A227" opacity="0.9" />
        <rect x="370" y="498" width="20" height="12" />
        <path d="M370 498 A10 7 0 0 1 390 498 Z" />
        <rect x="470" y="498" width="20" height="12" />
        <path d="M470 498 A10 7 0 0 1 490 498 Z" />
      </g>
      {/* lamplit windows */}
      <rect x="424" y="484" width="4" height="6" fill="#E3C76B" opacity="0.85" />
      <rect x="432" y="484" width="4" height="6" fill="#E3C76B" opacity="0.7" />
      <rect x="424" y="496" width="4" height="6" fill="#E3C76B" opacity="0.6" />
      <rect x="432" y="496" width="4" height="6" fill="#E3C76B" opacity="0.75" />

      {/* atmospheric haze over the ridges */}
      <ellipse cx="320" cy="500" rx="330" ry="46" fill="#E3C76B" opacity="0.05" filter="url(#cs-blur)" />
      <ellipse cx="150" cy="540" rx="200" ry="34" fill="#8E93B8" opacity="0.06" filter="url(#cs-blur)" />

      {/* cinematic vignette */}
      <rect x="0" y="0" width="640" height="600" fill="url(#cs-vignette)" />
    </svg>
  );
}
