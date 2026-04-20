import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import type { ScoreBand } from '@/lib/scoring'

interface OverallScoreDialProps {
  score: number
  band: ScoreBand
  /** 0..1 confidence for the tagline under the number. */
  confidence: number
}

const BAND_COLORS: Record<ScoreBand, { stroke: string; text: string }> = {
  action: { stroke: '#f43f5e', text: '#e11d48' },
  watch: { stroke: '#f59e0b', text: '#d97706' },
  good: { stroke: '#0ea5e9', text: '#0284c7' },
  excellent: { stroke: '#10b981', text: '#059669' },
}

export function OverallScoreDial({ score, band, confidence }: OverallScoreDialProps) {
  const { t } = useTranslation('landing')
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    setProgress(0)
    const frame = requestAnimationFrame(() => setProgress(score))
    return () => cancelAnimationFrame(frame)
  }, [score])

  const cx = 160
  const cy = 160
  const r = 128
  const sw = 18
  const circumference = 2 * Math.PI * r
  const pct = progress / 10
  const dash = circumference * pct
  const color = BAND_COLORS[band]

  return (
    <div className="relative mx-auto flex w-full max-w-[340px] flex-col items-center">
      <svg viewBox="0 0 320 320" className="block w-full" aria-hidden>
        <defs>
          <linearGradient id="dial-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={color.stroke} stopOpacity="0.85" />
            <stop offset="100%" stopColor={color.stroke} stopOpacity="1" />
          </linearGradient>
          <filter id="dial-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Outer faint ring */}
        <circle cx={cx} cy={cy} r={r + 16} fill="none" stroke="#e5e7eb" strokeOpacity="0.35" strokeWidth={1} />
        {/* Track */}
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f1f5f9" strokeWidth={sw} />
        {/* Tick marks around the dial */}
        {Array.from({ length: 40 }).map((_, i) => {
          const a = (i / 40) * Math.PI * 2 - Math.PI / 2
          const inner = r + sw / 2 + 4
          const outer = inner + (i % 4 === 0 ? 8 : 4)
          const x1 = cx + inner * Math.cos(a)
          const y1 = cy + inner * Math.sin(a)
          const x2 = cx + outer * Math.cos(a)
          const y2 = cy + outer * Math.sin(a)
          return (
            <line
              key={i}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="#cbd5e1"
              strokeOpacity={i % 4 === 0 ? 0.6 : 0.3}
              strokeWidth={1}
            />
          )
        })}
        {/* Progress */}
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke="url(#dial-grad)"
          strokeWidth={sw}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference}`}
          style={{
            transform: `rotate(-90deg)`,
            transformOrigin: `${cx}px ${cy}px`,
            transition: 'stroke-dasharray 1.4s cubic-bezier(0.2, 0.8, 0.2, 1)',
          }}
          filter="url(#dial-glow)"
        />
      </svg>

      {/* Center content */}
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
        <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-gray-400">
          {t('intelligence.results.overall')}
        </p>
        <div className="mt-1 flex items-baseline gap-1 font-sans">
          <span
            className="text-[84px] font-bold leading-none tracking-tight tabular-nums"
            style={{ color: color.text }}
          >
            {progress}
          </span>
          <span className="text-[24px] font-semibold text-gray-400">/10</span>
        </div>
        <p
          className="mt-1.5 text-[11px] font-bold uppercase tracking-[0.22em]"
          style={{ color: color.text }}
        >
          {t(`intelligence.bands.${band}`)}
        </p>
        <p className="mt-2 text-[11px] text-gray-500">
          {t('intelligence.results.confidencePct', { pct: Math.round(confidence * 100) })}
        </p>
      </div>
    </div>
  )
}
