// Bubbly, candy-colored "Qrator Kids" wordmark + palette mascot icon — one
// combined SVG (scalable, crisp, no DOM text-shadow hacks), matching the
// reference style the user supplied: rainbow-ringed palette icon, puffy
// 3D multi-color letters with a navy outline and drop shadow.

const LETTERS = [
  { ch: 'Q', color: '#F6C445' },
  { ch: 'r', color: '#EB5757' },
  { ch: 'a', color: '#4CAF7D' },
  { ch: 't', color: '#4F93E0' },
  { ch: 'o', color: '#F2994A' },
  { ch: 'r', color: '#9B6FE0' },
  { ch: ' ', color: 'transparent' },
  { ch: 'K', color: '#F2669C' },
  { ch: 'i', color: '#F6C445' },
  { ch: 'd', color: '#4F93E0' },
  { ch: 's', color: '#6FCF97' },
];

const NAVY = '#2B2140';

export function Logo({ height = 56, showWordmark = true }: { height?: number; showWordmark?: boolean }) {
  // Design canvas: 64px tall icon, wordmark baseline tuned to match.
  const vbW = showWordmark ? 560 : 64;
  const vbH = 64;
  const scale = height / vbH;

  return (
    <svg
      role="img"
      aria-label="Q Rator Kids"
      width={vbW * scale}
      height={height}
      viewBox={`0 0 ${vbW} ${vbH}`}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Icon: rainbow ring + white tile + palette mascot */}
      <defs>
        <linearGradient id="qrkRing" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#F2669C" />
          <stop offset="0.33" stopColor="#F6C445" />
          <stop offset="0.66" stopColor="#6FCF97" />
          <stop offset="1" stopColor="#4F93E0" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="20" fill="url(#qrkRing)" />
      <rect x="4" y="4" width="56" height="56" rx="16" fill="#fff" />
      <g>
        <path
          d="M32 12c-11.6 0-21 7.6-21 17 0 6.4 5.1 10.1 10.5 10.1 1.9 0 3-1.1 3-2.6 0-1.3-1-2-1.9-2.7-1-.9-1.8-1.8-1.8-3.3 0-2.6 2.1-4.5 4.6-4.5h5.9c8.5 0 14.7-5.3 14.7-11.8C46 15.9 40 12 32 12z"
          fill="#F3B169"
          stroke={NAVY}
          strokeWidth="2"
        />
        <circle cx="24.5" cy="25" r="2.8" fill="#EB5757" />
        <circle cx="33" cy="20.5" r="2.8" fill="#6FCF97" />
        <circle cx="40" cy="25.5" r="2.8" fill="#F2994A" />
        <circle cx="26" cy="32.5" r="2.8" fill="#56CCF2" />
        <circle cx="35.5" cy="31.5" r="2.8" fill="#9B6FE0" />
        <circle cx="25" cy="29" r="1.4" fill={NAVY} />
        <circle cx="33" cy="29" r="1.4" fill={NAVY} />
        <path d="M27 33.5c1.4 1.3 4.4 1.3 5.8 0" stroke={NAVY} strokeWidth="1.8" strokeLinecap="round" fill="none" />
        <path d="M49 12l1.4 3.1L53.5 16.5l-3.1 1.4L49 21l-1.4-3.1L44.5 16.5l3.1-1.4z" fill="#F6C445" />
        <path d="M16 34l.9 2 2 .9-2 .9-.9 2-.9-2-2-.9 2-.9z" fill="#F6C445" />
      </g>

      {showWordmark && (
        <>
          {/* Shadow layer (offset down-right, solid navy) for puffy 3D depth */}
          <text
            x="78"
            y="46"
            fontFamily="'Baloo 2', sans-serif"
            fontWeight={800}
            fontSize="38"
            fill={NAVY}
            opacity={0.28}
            transform="translate(2.5 3.5)"
          >
            {LETTERS.map((l) => l.ch).join('')}
          </text>

          {/* Front layer: per-letter color fill, navy outline, stroke behind fill */}
          <text
            x="78"
            y="46"
            fontFamily="'Baloo 2', sans-serif"
            fontWeight={800}
            fontSize="38"
            style={{ paintOrder: 'stroke fill' }}
          >
            {LETTERS.map((l, i) => (
              <tspan key={i} fill={l.color} stroke={l.ch === ' ' ? 'none' : NAVY} strokeWidth={2.2}>
                {l.ch}
              </tspan>
            ))}
          </text>
        </>
      )}
    </svg>
  );
}

export function LogoIcon({ size = 56 }: { size?: number }) {
  return <Logo height={size} showWordmark={false} />;
}
