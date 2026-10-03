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
// A few bright stars get cross flares; kept deterministic for the same reason.
const BRIGHT = [7, 23, 41, 66, 88, 101].map((i) => star(i, 640, 600));

/**
 * The hero sky, composed as an environment rather than a diagram:
 *
 *   sky (deep gradient + nebula blooms) -> far stars -> orbital paths ->
 *   zodiac wheel (one object among several, upper right) -> planets ->
 *   blurred far range -> mist -> near range with temples -> haze -> vignette
 *
 * Far things are dimmer and softer, near things crisp: that gradient of
 * sharpness is what reads as depth. Pure vector -- there are no raster assets
 * in the project, so atmosphere comes from layered gradients, opacity and two
 * blurs. Decorative only.
 */
export default function CelestialScene() {
  // Wheel geometry in its own coordinates; the group transform below places
  // it at (400, 238) with radius ~100 -- part of the scene, not the scene.
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
          <stop offset="0%" stopColor="#070918" />
          <stop offset="52%" stopColor="#11143A" />
          <stop offset="80%" stopColor="#2B2148" />
          <stop offset="100%" stopColor="#3D2C46" />
        </linearGradient>
        <radialGradient id="cs-nebula-ind" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="#3D3F8F" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#3D3F8F" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="cs-nebula-plum" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="#6B3A6E" stopOpacity="0.42" />
          <stop offset="100%" stopColor="#6B3A6E" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="cs-horizon" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="#C9A227" stopOpacity="0.16" />
          <stop offset="100%" stopColor="#C9A227" stopOpacity="0" />
        </radialGradient>
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
        <linearGradient id="cs-ground" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#070912" stopOpacity="0" />
          <stop offset="100%" stopColor="#070912" stopOpacity="0.55" />
        </linearGradient>
        <filter id="cs-blur" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="16" />
        </filter>
        <filter id="cs-soft" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2.5" />
        </filter>
      </defs>

      {/* sky */}
      <rect x="0" y="0" width="640" height="600" fill="url(#cs-sky)" />

      {/* nebulae: the atmosphere behind everything */}
      <g className="cs-breathe">
        <ellipse cx="120" cy="110" rx="190" ry="130" fill="url(#cs-nebula-ind)" />
        <ellipse cx="560" cy="220" rx="150" ry="170" fill="url(#cs-nebula-plum)" />
        <ellipse cx="330" cy="470" rx="330" ry="110" fill="url(#cs-horizon)" />
      </g>

      {/* stars: most hold still, every fourth one twinkles on its own clock */}
      <g className="cs-drift-far">
        {STARS.map((s, i) =>
          i % 4 === 2 ? null : i % 4 === 0 ? null : (
            <circle key={i} cx={s.x} cy={s.y} r={s.r} fill={s.fill} opacity={s.opacity} />
          ),
        )}
        <g className="cs-twinkle-a">
          {STARS.map((s, i) =>
            i % 4 === 0 ? (
              <circle key={i} cx={s.x} cy={s.y} r={s.r} fill={s.fill} />
            ) : null,
          )}
        </g>
        <g className="cs-twinkle-b">
          {STARS.map((s, i) =>
            i % 4 === 2 ? (
              <circle key={i} cx={s.x} cy={s.y} r={s.r} fill={s.fill} />
            ) : null,
          )}
        </g>
      </g>
      {/* a few bright ones with flares */}
      {BRIGHT.map((s, i) => (
        <g key={`b${i}`} stroke="#F5F1E8" strokeWidth="1" opacity="0.75">
          <line x1={s.x - 5} y1={s.y} x2={s.x + 5} y2={s.y} />
          <line x1={s.x} y1={s.y - 5} x2={s.x} y2={s.y + 5} />
          <circle cx={s.x} cy={s.y} r="1.6" fill="#FFFFFF" stroke="none" />
        </g>
      ))}

      {/* orbital paths: one dotted, one hairline, drifting almost imperceptibly */}
      <g className="cs-drift">
        <ellipse cx={cx} cy={cy} rx="296" ry="118" fill="none" stroke="#F5F1E8" strokeOpacity="0.08" strokeWidth="1" strokeDasharray="2 7" transform={`rotate(-16 ${cx} ${cy})`} />
        <ellipse cx={cx} cy={cy} rx="252" ry="196" fill="none" stroke="#C9A227" strokeOpacity="0.08" strokeWidth="1" transform={`rotate(10 ${cx} ${cy})`} />
        <circle cx={cx - 248} cy={cy + 62} r="2.4" fill="#E3C76B" opacity="0.9" />
        <circle cx={cx + 212} cy={cy - 96} r="1.8" fill="#F5F1E8" opacity="0.8" />
      </g>

      {/* zodiac wheel: one object among several, upper right of the sky.
          The outer group places it; the inner group turns it, one revolution
          per four minutes. */}
      <g transform="translate(182,60) scale(0.68)">
      <g className="cs-spin">
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
      </g>
      </g>

      {/* slate planet, high and distant */}
      <circle cx="548" cy="92" r="34" fill="url(#cs-glow)" />
      <circle cx="548" cy="92" r="20" fill="url(#cs-slate)" />
      <circle cx="542" cy="86" r="4" fill="#B9C4DE" opacity="0.5" />

      {/* amber giant low over the ridge, its base tucked behind it */}
      <g className="cs-bob">
        <circle cx="205" cy="395" r="66" fill="url(#cs-glow)" />
        <circle cx="205" cy="395" r="40" fill="url(#cs-amber)" />
        <path d="M167 385 Q205 395 243 385" stroke="#7A5F16" strokeWidth="3" fill="none" opacity="0.6" />
        <path d="M167 402 Q205 412 243 402" stroke="#7A5F16" strokeWidth="2.5" fill="none" opacity="0.45" />
        <path d="M175 416 Q205 423 235 416" stroke="#7A5F16" strokeWidth="2" fill="none" opacity="0.35" />
        <ellipse cx="205" cy="395" rx="60" ry="13" fill="none" stroke="#E3C76B" strokeOpacity="0.35" strokeWidth="1.5" transform="rotate(-14 205 395)" />
      </g>

      {/* small rust planet near the wheel */}
      <circle cx="545" cy="352" r="20" fill="url(#cs-glow)" />
      <circle cx="545" cy="352" r="11" fill="url(#cs-rust)" />

      {/* small moon, clear of the copy */}
      <circle cx="40" cy="472" r="7" fill="#D8DCEC" opacity="0.85" />
      <circle cx="38" cy="470" r="2.2" fill="#9AA3C0" opacity="0.6" />

      {/* far range, softened with distance */}
      <g filter="url(#cs-soft)">
        <path
          d="M0,522 L70,448 L140,498 L215,428 L295,500 L370,442 L450,505 L530,452 L640,510 L640,600 L0,600 Z"
          fill="#252847"
          opacity="0.85"
        />
      </g>
      {/* a distant shrine cluster on the far ridge */}
      <g fill="#1A1D3A" opacity="0.9">
        <rect x="138" y="470" width="26" height="10" />
        <path d="M138 470 A13 9 0 0 1 164 470 Z" />
        <rect x="118" y="478" width="12" height="8" />
        <path d="M118 478 A6 5 0 0 1 130 478 Z" />
      </g>

      {/* mist between the ranges */}
      <ellipse cx="320" cy="508" rx="330" ry="30" fill="#8E93B8" opacity="0.10" filter="url(#cs-blur)" />

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

      {/* grounding gradient + cinematic vignette */}
      <rect x="0" y="380" width="640" height="220" fill="url(#cs-ground)" />
      <rect x="0" y="0" width="640" height="600" fill="url(#cs-vignette)" />
    </svg>
  );
}
