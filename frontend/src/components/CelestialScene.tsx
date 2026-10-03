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
 * Golden-hour hero sky: a warm luminous horizon behind temple rooftops on
 * still water, with the zodiac wheel, orbital paths and planets composed
 * into the light rather than pasted over darkness.
 *
 *   sky (indigo -> ember gradient + sun glow) -> far stars -> orbital paths
 *   -> zodiac wheel -> planets -> birds -> mountain ridges -> temple on the
 *   waterline -> sun glint + shimmer on the water -> haze -> vignette
 *
 * Pure vector -- there are no raster assets in the project, so light comes
 * from layered gradients, opacity and two blurs. Decorative only.
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
      aria-label="Golden sunset sky with zodiac wheel over temples on still water"
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <linearGradient id="cs-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0A0C20" />
          <stop offset="42%" stopColor="#23204E" />
          <stop offset="68%" stopColor="#5A2E4D" />
          <stop offset="86%" stopColor="#A85A30" />
          <stop offset="100%" stopColor="#D89A4A" />
        </linearGradient>
        <radialGradient id="cs-nebula-ind" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="#3D3F8F" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#3D3F8F" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="cs-nebula-plum" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="#8A3D5E" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#8A3D5E" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="cs-sunglow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="#FFE9B0" stopOpacity="0.95" />
          <stop offset="35%" stopColor="#F2B45C" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#F2B45C" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="cs-amber" cx="0.35" cy="0.35" r="0.9">
          <stop offset="0%" stopColor="#F2D98B" />
          <stop offset="45%" stopColor="#C9A227" />
          <stop offset="100%" stopColor="#7A5F16" />
        </radialGradient>
        <radialGradient id="cs-slate" cx="0.35" cy="0.35" r="0.9">
          <stop offset="0%" stopColor="#C6CFE8" />
          <stop offset="45%" stopColor="#6B7699" />
          <stop offset="100%" stopColor="#2A3050" />
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
        <linearGradient id="cs-water" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#4A2E3D" />
          <stop offset="35%" stopColor="#241B3D" />
          <stop offset="100%" stopColor="#0B0A20" />
        </linearGradient>
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
        <ellipse cx="560" cy="180" rx="150" ry="170" fill="url(#cs-nebula-plum)" />
      </g>

      {/* low sun pouring over the waterline */}
      <ellipse cx="430" cy="452" rx="150" ry="110" fill="url(#cs-sunglow)" />
      <circle cx="430" cy="452" r="34" fill="#FFE9B0" opacity="0.95" />
      <circle cx="430" cy="452" r="48" fill="none" stroke="#FFE9B0" strokeOpacity="0.35" strokeWidth="1.5" />

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
      {BRIGHT.map((s, i) => (
        <g key={`b${i}`} stroke="#F5F1E8" strokeWidth="1" opacity="0.75">
          <line x1={s.x - 5} y1={s.y} x2={s.x + 5} y2={s.y} />
          <line x1={s.x} y1={s.y - 5} x2={s.x} y2={s.y + 5} />
          <circle cx={s.x} cy={s.y} r="1.6" fill="#FFFFFF" stroke="none" />
        </g>
      ))}

      {/* distant birds */}
      <g stroke="#0B0D21" strokeWidth="2" fill="none" opacity="0.7" strokeLinecap="round">
        <path d="M118 168 q7 -7 14 0 q7 -7 14 0" />
        <path d="M158 186 q5 -5 10 0 q5 -5 10 0" />
        <path d="M88 196 q5 -5 10 0 q5 -5 10 0" />
      </g>

      {/* orbital paths: one dotted, one hairline, drifting almost imperceptibly */}
      <g className="cs-drift">
        <ellipse cx={cx} cy={cy} rx="296" ry="118" fill="none" stroke="#F5F1E8" strokeOpacity="0.10" strokeWidth="1" strokeDasharray="2 7" transform={`rotate(-16 ${cx} ${cy})`} />
        <ellipse cx={cx} cy={cy} rx="252" ry="196" fill="none" stroke="#C9A227" strokeOpacity="0.10" strokeWidth="1" transform={`rotate(10 ${cx} ${cy})`} />
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

      {/* amber giant sinking toward the ridge */}
      <g className="cs-bob">
        <circle cx="150" cy="360" r="62" fill="url(#cs-glow)" />
        <circle cx="150" cy="360" r="36" fill="url(#cs-amber)" />
        <path d="M116 351 Q150 359 184 351" stroke="#7A5F16" strokeWidth="3" fill="none" opacity="0.6" />
        <path d="M116 366 Q150 374 184 366" stroke="#7A5F16" strokeWidth="2.5" fill="none" opacity="0.45" />
        <ellipse cx="150" cy="360" rx="54" ry="12" fill="none" stroke="#E3C76B" strokeOpacity="0.35" strokeWidth="1.5" transform="rotate(-14 150 360)" />
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
          d="M0,470 L70,410 L140,458 L215,398 L295,462 L370,408 L450,465 L530,415 L640,468 L640,510 L0,510 Z"
          fill="#3A2450"
          opacity="0.9"
        />
      </g>
      {/* a distant shrine cluster on the far ridge */}
      <g fill="#241A3E" opacity="0.95">
        <rect x="138" y="428" width="26" height="10" />
        <path d="M138 428 A13 9 0 0 1 164 428 Z" />
        <rect x="118" y="436" width="12" height="8" />
        <path d="M118 436 A6 5 0 0 1 130 436 Z" />
      </g>

      {/* still water from the shoreline down */}
      <rect x="0" y="505" width="640" height="95" fill="url(#cs-water)" />
      {/* sun glint: a shimmering column under the low sun */}
      <g fill="#F2C268">
        <rect x="424" y="512" width="12" height="3" rx="1.5" opacity="0.85" />
        <rect x="418" y="520" width="24" height="3" rx="1.5" opacity="0.7" />
        <rect x="410" y="529" width="40" height="3" rx="1.5" opacity="0.55" />
        <rect x="402" y="539" width="56" height="3" rx="1.5" opacity="0.4" />
        <rect x="394" y="550" width="72" height="3" rx="1.5" opacity="0.3" />
        <rect x="388" y="562" width="84" height="3" rx="1.5" opacity="0.22" />
        <rect x="382" y="575" width="96" height="3" rx="1.5" opacity="0.15" />
      </g>
      {/* scattered shimmer */}
      <g fill="#F5F1E8">
        <rect x="120" y="524" width="34" height="2" rx="1" opacity="0.18" />
        <rect x="220" y="545" width="52" height="2" rx="1" opacity="0.14" />
        <rect x="520" y="530" width="44" height="2" rx="1" opacity="0.16" />
        <rect x="60" y="560" width="60" height="2" rx="1" opacity="0.1" />
        <rect x="300" y="572" width="38" height="2" rx="1" opacity="0.12" />
      </g>

      {/* near headland, left */}
      <path d="M0,540 L80,498 L170,540 L170,600 L0,600 Z" fill="#141127" />
      {/* temple silhouette at the waterline, right of the sun glint */}
      <g fill="#0B0D21">
        <rect x="478" y="478" width="64" height="14" />
        <rect x="484" y="466" width="52" height="12" />
        <rect x="490" y="454" width="40" height="12" />
        <rect x="496" y="442" width="28" height="12" />
        <rect x="501" y="432" width="18" height="10" />
        <path d="M504 432 A6 6 0 0 1 516 432 Z" />
        <rect x="508.5" y="420" width="3" height="12" />
        <circle cx="510" cy="418" r="2.4" />
        <path d="M511 414 L521 417 L511 420 Z" fill="#C9A227" opacity="0.9" />
        <rect x="450" y="484" width="20" height="12" />
        <path d="M450 484 A10 7 0 0 1 470 484 Z" />
        <rect x="550" y="484" width="20" height="12" />
        <path d="M550 484 A10 7 0 0 1 570 484 Z" />
      </g>
      {/* lamplit windows */}
      <rect x="504" y="470" width="4" height="6" fill="#E3C76B" opacity="0.85" />
      <rect x="512" y="470" width="4" height="6" fill="#E3C76B" opacity="0.7" />
      <rect x="504" y="482" width="4" height="6" fill="#E3C76B" opacity="0.6" />
      <rect x="512" y="482" width="4" height="6" fill="#E3C76B" opacity="0.75" />
      {/* temple reflection, rippled away */}
      <g fill="#E3C76B" opacity="0.28">
        <rect x="498" y="506" width="44" height="2.5" rx="1" />
        <rect x="504" y="514" width="32" height="2.5" rx="1" opacity="0.7" />
        <rect x="510" y="523" width="20" height="2.5" rx="1" opacity="0.5" />
      </g>

      {/* warm haze hanging over the water */}
      <ellipse cx="330" cy="492" rx="330" ry="40" fill="#E3C76B" opacity="0.06" filter="url(#cs-blur)" />

      {/* grounding gradient + cinematic vignette */}
      <rect x="0" y="380" width="640" height="220" fill="url(#cs-ground)" />
      <rect x="0" y="0" width="640" height="600" fill="url(#cs-vignette)" />
    </svg>
  );
}
