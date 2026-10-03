/**
 * A temple doorway in deep blue and gold: stepped arch frame, starlit
 * sanctum, hanging lamps and a meditating silhouette on the steps. Pure
 * vector, sized by its parent. Used wherever a section needs a visual anchor
 * with Indian architectural language (services, panchang) without raster art.
 * Decorative only.
 */
export default function TempleArch() {
  return (
    <svg
      viewBox="0 0 220 320"
      className="w-full h-full"
      role="img"
      aria-label="Temple doorway with meditating figure"
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <linearGradient id="ta-in" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1E1A47" />
          <stop offset="70%" stopColor="#14123A" />
          <stop offset="100%" stopColor="#0E1128" />
        </linearGradient>
        <radialGradient id="ta-glow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="#E3C76B" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#E3C76B" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* sanctum */}
      <path
        d="M40,300 L40,110 A70,70 0 0 1 180,110 L180,300 Z"
        fill="url(#ta-in)"
        stroke="#C9A227"
        strokeWidth="3"
      />
      {/* stepped arch moulding */}
      <path
        d="M52,300 L52,116 A58,58 0 0 1 168,116 L168,300"
        fill="none"
        stroke="#C9A227"
        strokeOpacity="0.5"
        strokeWidth="1.5"
      />
      {/* stars inside */}
      <g fill="#F5F1E8">
        <circle cx="90" cy="80" r="1.2" opacity="0.7" />
        <circle cx="130" cy="60" r="1" opacity="0.5" />
        <circle cx="150" cy="95" r="1.3" opacity="0.65" />
        <circle cx="75" cy="120" r="1" opacity="0.5" />
        <circle cx="110" cy="105" r="0.9" opacity="0.45" />
      </g>
      {/* hanging lamps */}
      <g stroke="#C9A227" strokeWidth="1" opacity="0.9">
        <line x1="85" y1="52" x2="85" y2="72" />
        <line x1="135" y1="48" x2="135" y2="68" />
      </g>
      <circle cx="85" cy="76" r="10" fill="url(#ta-glow)" />
      <circle cx="85" cy="76" r="3.4" fill="#F2C268" />
      <circle cx="135" cy="72" r="10" fill="url(#ta-glow)" />
      <circle cx="135" cy="72" r="3.4" fill="#F2C268" />
      {/* side pillars */}
      <rect x="22" y="120" width="10" height="180" fill="none" stroke="#C9A227" strokeOpacity="0.6" strokeWidth="1.5" />
      <rect x="188" y="120" width="10" height="180" fill="none" stroke="#C9A227" strokeOpacity="0.6" strokeWidth="1.5" />
      {/* meditating figure */}
      <g fill="#070912">
        <circle cx="110" cy="212" r="11" />
        <path d="M88,268 Q92,232 110,230 Q128,232 132,268 Z" />
        <ellipse cx="110" cy="268" rx="30" ry="9" />
      </g>
      <path
        d="M88,268 Q92,232 110,230 Q128,232 132,268"
        fill="none"
        stroke="#C9A227"
        strokeOpacity="0.5"
        strokeWidth="1"
      />
      {/* steps */}
      <g fill="#0B0D21">
        <rect x="66" y="278" width="88" height="8" rx="1" />
        <rect x="58" y="288" width="104" height="8" rx="1" />
        <rect x="50" y="298" width="120" height="8" rx="1" />
      </g>
      {/* diyas on the steps */}
      <g fill="#F2C268">
        <ellipse cx="76" cy="276" rx="3" ry="1.8" opacity="0.9" />
        <ellipse cx="144" cy="276" rx="3" ry="1.8" opacity="0.9" />
        <ellipse cx="110" cy="286" rx="3" ry="1.8" opacity="0.75" />
      </g>
    </svg>
  );
}
