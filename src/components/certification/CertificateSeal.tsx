/**
 * SVG seal / medallion rendered inline. Accepts `tier` to vary the accent colour
 * between Certified (indigo), Gold, and Platinum.
 */

const TIER_COLOURS = {
  certified: { outer: '#0369a1', inner: '#0ea5e9', text: '#075985' },
  gold: { outer: '#92400e', inner: '#d97706', text: '#78350f' },
  platinum: { outer: '#1e293b', inner: '#475569', text: '#0f172a' },
} as const

interface Props {
  tier: keyof typeof TIER_COLOURS
  size?: number
  className?: string
}

export default function CertificateSeal({ tier, size = 140, className }: Props) {
  const c = TIER_COLOURS[tier]
  const cx = size / 2
  const cy = size / 2
  const teeth = 28
  const outerR = size * 0.48
  const innerR = size * 0.40

  const points: string[] = []
  for (let i = 0; i < teeth * 2; i++) {
    const angle = (Math.PI * 2 * i) / (teeth * 2) - Math.PI / 2
    const r = i % 2 === 0 ? outerR : innerR
    points.push(`${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`)
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={className}
      aria-hidden
    >
      {/* Starburst */}
      <polygon points={points.join(' ')} fill={c.outer} opacity={0.12} />
      <polygon
        points={points.join(' ')}
        fill="none"
        stroke={c.outer}
        strokeWidth={1.2}
        opacity={0.5}
      />

      {/* Inner disc */}
      <circle cx={cx} cy={cy} r={size * 0.34} fill="none" stroke={c.outer} strokeWidth={1.5} opacity={0.45} />
      <circle cx={cx} cy={cy} r={size * 0.30} fill="none" stroke={c.outer} strokeWidth={0.8} opacity={0.30} />

      {/* Centre ring with text */}
      <circle cx={cx} cy={cy} r={size * 0.26} fill={c.outer} opacity={0.08} />

      {/* Beluga B monogram */}
      <text
        x={cx}
        y={cy - size * 0.04}
        textAnchor="middle"
        dominantBaseline="central"
        fill={c.text}
        fontSize={size * 0.22}
        fontWeight="700"
        fontFamily="Montserrat, sans-serif"
      >
        B
      </text>

      {/* CERTIFIED arc text (simulated with individual chars) */}
      <text
        x={cx}
        y={cy + size * 0.16}
        textAnchor="middle"
        fill={c.text}
        fontSize={size * 0.065}
        fontWeight="600"
        fontFamily="Montserrat, sans-serif"
        letterSpacing={size * 0.025}
      >
        CERTIFIED
      </text>
    </svg>
  )
}
