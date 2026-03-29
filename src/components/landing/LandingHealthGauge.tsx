export function LandingHealthGauge() {
  const cx = 150
  const cy = 138
  const r = 108
  const sw = 20
  const score = 78

  const toAng = (s: number) => Math.PI * (1 - s / 100)
  const xy = (a: number, rad = r) => ({
    x: cx + rad * Math.cos(a),
    y: cy - rad * Math.sin(a),
  })
  const arcD = (s1: number, s2: number) => {
    const a1 = toAng(s1)
    const a2 = toAng(s2)
    const p1 = xy(a1)
    const p2 = xy(a2)
    return `M ${p1.x} ${p1.y} A ${r} ${r} 0 ${Math.abs(a1 - a2) > Math.PI ? 1 : 0} 1 ${p2.x} ${p2.y}`
  }

  const zones = [
    { from: 0, to: 49.6, color: '#dc2626' },
    { from: 50.4, to: 69.6, color: '#ea580c' },
    { from: 70.4, to: 84.6, color: '#d97706' },
    { from: 85.4, to: 100, color: '#16a34a' },
  ]

  const na = toAng(score)
  const tipR = r - sw / 2 - 2
  const tailR = 14
  const hw = 4
  const tip = xy(na, tipR)
  const tail = {
    x: cx + tailR * Math.cos(na + Math.PI),
    y: cy - tailR * Math.sin(na + Math.PI),
  }
  const b1 = {
    x: cx + hw * Math.cos(na + Math.PI / 2),
    y: cy - hw * Math.sin(na + Math.PI / 2),
  }
  const b2 = {
    x: cx + hw * Math.cos(na - Math.PI / 2),
    y: cy - hw * Math.sin(na - Math.PI / 2),
  }

  return (
    <svg
      viewBox="0 0 300 188"
      className="mx-auto w-full max-w-[192px] sm:max-w-[208px]"
      role="img"
      aria-label="Health score 78, Watch"
    >
      <defs>
        <filter id="landing-needle-shadow">
          <feDropShadow dx="0" dy="1" stdDeviation="2" floodColor="#000" floodOpacity="0.2" />
        </filter>
      </defs>

      <path d={arcD(0, 100)} fill="none" stroke="#f3f4f6" strokeWidth={sw + 6} strokeLinecap="round" />

      {zones.map((z) => (
        <path
          key={z.from}
          d={arcD(z.from, z.to)}
          fill="none"
          stroke={z.color}
          strokeWidth={sw}
          strokeLinecap="butt"
        />
      ))}
      <path d={arcD(0, 0.4)} fill="none" stroke={zones[0]!.color} strokeWidth={sw} strokeLinecap="round" />
      <path
        d={arcD(99.6, 100)}
        fill="none"
        stroke={zones[zones.length - 1]!.color}
        strokeWidth={sw}
        strokeLinecap="round"
      />

      <g filter="url(#landing-needle-shadow)">
        <path
          d={`M ${tip.x} ${tip.y} L ${b1.x} ${b1.y} L ${tail.x} ${tail.y} L ${b2.x} ${b2.y} Z`}
          fill="#1f2937"
        />
      </g>
      <circle cx={cx} cy={cy} r={8} fill="#e5e7eb" />
      <circle cx={cx} cy={cy} r={5} fill="#374151" />
      <circle cx={cx} cy={cy} r={2.5} fill="#fff" />

      <text
        x={cx}
        y={cy + 32}
        textAnchor="middle"
        fill="#111827"
        style={{ fontSize: 30, fontWeight: 800, fontFamily: 'system-ui, sans-serif', letterSpacing: '-0.02em' }}
      >
        78
      </text>
      <text
        x={cx}
        y={cy + 46}
        textAnchor="middle"
        fill="#d97706"
        style={{ fontSize: 10, fontWeight: 700, fontFamily: 'system-ui, sans-serif', letterSpacing: '0.14em' }}
      >
        WATCH
      </text>
    </svg>
  )
}
