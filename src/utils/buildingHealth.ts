/**
 * Building Health Index (BHI) — plumbing-oriented pillars:
 * Data Trust (gate), Leak/idle (quiet windows), Hydraulic stress (percentiles),
 * Mechanical (band energy). Consumption is not a health signal here.
 */

import type { FlowPoint, MagDataPoint } from '@/utils/flowComputation'

// --- Tunable constants ---

export const HEALTH_DATA_BIN_MS = 5 * 60_000
export const HEALTH_MAX_GAP_ACCEPTABLE_MIN = 30
export const HEALTH_MIN_COVERAGE_FOR_FULL_SCORE = 0.15
export const HEALTH_MIN_SAMPLES_TODAY = 8

/** Days of magnetometer history before we treat baselines as calibrated */
export const HEALTH_CALIBRATION_TARGET_DAYS = 28

/** Minimum quiet-window samples to compare recent vs prior periods */
export const HEALTH_LEAK_MIN_QUIET_SAMPLES = 5

/** Local hours [start, end) for “quiet” leak analysis (1–5 AM) */
export const HEALTH_QUIET_HOUR_START = 1
export const HEALTH_QUIET_HOUR_END = 5

export const HEALTH_HYDRO_ABSOLUTE_MAX_LPH = 10_000
export const HEALTH_HYDRO_MULTIPLIER_LPH_FACTOR = 200
export const HEALTH_STUCK_YESTERDAY_MIN_L = 5

export const HEALTH_MECH_MIN_POINTS_PER_WINDOW = 12
export const HEALTH_MECH_SPIKE_RATIO_START = 1.5

/** Weights: Trust + Leak + Hydraulic + Mechanical = 1 */
const W_TRUST = 0.15
const W_LEAK = 0.35
const W_HYDRO = 0.35
const W_MECH = 0.15

export type BuildingHealthLabel =
  | 'healthy'
  | 'watch'
  | 'investigate'
  | 'critical'

export interface HealthSubScore {
  score: number
  summary: string
  formula: string
}

export type CalibrationStatus = 'calibrated' | 'estimate'

export interface BuildingCalibration {
  /** Calendar span from first mag sample to now */
  daysOfHistory: number
  targetDays: number
  /** Days until HEALTH_CALIBRATION_TARGET_DAYS of history (0 when met) */
  daysRemaining: number
  status: CalibrationStatus
  /** One-line explanation for the card */
  summary: string
}

export interface BuildingHealth {
  bhi: number
  label: BuildingHealthLabel
  insufficientData: boolean
  /** True when baselines are still forming */
  isEstimate: boolean
  calibration: BuildingCalibration
  subScores: {
    trust: HealthSubScore
    leak: HealthSubScore
    hydraulic: HealthSubScore
    mechanical: HealthSubScore
  }
  overallFormula: string
}

export interface ComputeBuildingHealthInput {
  allMagData: MagDataPoint[]
  /** Flow points for the full fetched history (e.g. up to 28 days) */
  historyFlowPoints: FlowPoint[]
  todayFlowPoints: FlowPoint[]
  todayStartMs: number
  nowMs: number
  todayLitres: number
  yesterdayLitres: number
  multiplier: number
}

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x))
}

function scoreToLabel(score: number, insufficient: boolean): BuildingHealthLabel {
  if (insufficient) return 'investigate'
  if (score >= 85) return 'healthy'
  if (score >= 70) return 'watch'
  if (score >= 50) return 'investigate'
  return 'critical'
}

function median(arr: number[]): number {
  if (arr.length === 0) return 0
  const s = [...arr].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2
}

function percentile(arr: number[], p: number): number {
  if (arr.length === 0) return 0
  const s = [...arr].sort((a, b) => a - b)
  const idx = Math.ceil(p * s.length) - 1
  return s[Math.max(0, Math.min(s.length - 1, idx))]!
}

function isQuietHourLocal(ts: number): boolean {
  const h = new Date(ts).getHours()
  return h >= HEALTH_QUIET_HOUR_START && h < HEALTH_QUIET_HOUR_END
}

function computeCalibration(
  allMagData: MagDataPoint[],
  nowMs: number,
): BuildingCalibration {
  if (allMagData.length === 0) {
    return {
      daysOfHistory: 0,
      targetDays: HEALTH_CALIBRATION_TARGET_DAYS,
      daysRemaining: HEALTH_CALIBRATION_TARGET_DAYS,
      status: 'estimate',
      summary: `No magnetometer history yet — BHI needs data. Full calibration is estimated after ${HEALTH_CALIBRATION_TARGET_DAYS} days of continuous samples.`,
    }
  }

  let first = allMagData[0]!.timestamp
  for (const p of allMagData) {
    if (p.timestamp < first) first = p.timestamp
  }

  const spanMs = Math.max(0, nowMs - first)
  const daysOfHistory = spanMs / 86_400_000
  const targetDays = HEALTH_CALIBRATION_TARGET_DAYS
  const short = Math.max(0, targetDays - daysOfHistory)
  const daysRemaining = Math.ceil(short)
  const status: CalibrationStatus =
    daysOfHistory >= targetDays ? 'calibrated' : 'estimate'

  const summary =
    status === 'calibrated'
      ? `Baselines use ${daysOfHistory.toFixed(0)}+ days of building history.`
      : `BHI needs about ${daysRemaining} more day${daysRemaining === 1 ? '' : 's'} of data to reach full calibration — current figure is an estimate.`

  return {
    daysOfHistory,
    targetDays,
    daysRemaining: status === 'calibrated' ? 0 : daysRemaining,
    status,
    summary,
  }
}

function computeTrustScore(
  allMagData: MagDataPoint[],
  todayStartMs: number,
  nowMs: number,
): { score: number; coverage: number; maxGapMin: number; sampleCount: number } {
  const samples = allMagData.filter(
    (p) => p.timestamp >= todayStartMs && p.timestamp <= nowMs,
  )
  const sampleCount = samples.length
  const spanMs = nowMs - todayStartMs
  if (spanMs <= 0 || sampleCount === 0) {
    return { score: 0, coverage: 0, maxGapMin: Infinity, sampleCount: 0 }
  }

  const binCount = Math.max(1, Math.ceil(spanMs / HEALTH_DATA_BIN_MS))
  const binsWithData = new Set<number>()
  for (const p of samples) {
    const idx = Math.floor((p.timestamp - todayStartMs) / HEALTH_DATA_BIN_MS)
    binsWithData.add(Math.max(0, Math.min(idx, binCount - 1)))
  }
  const coverage = binsWithData.size / binCount

  let maxGapMs = 0
  for (let i = 1; i < samples.length; i++) {
    const g = samples[i]!.timestamp - samples[i - 1]!.timestamp
    if (g > maxGapMs) maxGapMs = g
  }
  const maxGapMin = maxGapMs / 60_000

  const gapFactor =
    maxGapMin <= HEALTH_MAX_GAP_ACCEPTABLE_MIN
      ? 1
      : Math.max(
          0,
          1 -
            (maxGapMin - HEALTH_MAX_GAP_ACCEPTABLE_MIN) /
              (HEALTH_MAX_GAP_ACCEPTABLE_MIN * 2),
        )

  const score = 100 * clamp01(0.65 * coverage + 0.35 * gapFactor)
  return { score, coverage, maxGapMin, sampleCount }
}

function computeLeakScore(
  historyFlowPoints: FlowPoint[],
  nowMs: number,
  daysOfHistory: number,
): {
  score: number
  summary: string
  recentQuietMedian: number | null
  priorQuietMedian: number | null
  ratio: number | null
} {
  const dayMs = 86_400_000
  const recentStart = nowMs - 7 * dayMs
  const priorStart = nowMs - 28 * dayMs

  const quiet = historyFlowPoints.filter(
    (p) => isQuietHourLocal(p.timestamp) && p.flowRateLph > 0,
  )
  const recentQuiet = quiet.filter((p) => p.timestamp >= recentStart)
  const priorQuiet = quiet.filter(
    (p) => p.timestamp >= priorStart && p.timestamp < recentStart,
  )

  const mr = median(recentQuiet.map((p) => p.flowRateLph))
  const mp = median(priorQuiet.map((p) => p.flowRateLph))

  if (quiet.length < 3 || daysOfHistory < 2) {
    return {
      score: 72,
      summary: 'Not enough quiet-window (night) flow data yet',
      recentQuietMedian: recentQuiet.length ? mr : null,
      priorQuietMedian: priorQuiet.length ? mp : null,
      ratio: null,
    }
  }

  if (
    priorQuiet.length >= HEALTH_LEAK_MIN_QUIET_SAMPLES &&
    recentQuiet.length >= 3
  ) {
    const ratio = mr / Math.max(mp, 0.5)
    let score = 100
    if (ratio > 1.5) {
      score -= Math.min(55, (ratio - 1.5) * 45)
    } else if (ratio > 1.25) {
      score -= (ratio - 1.25) * 60
    }
    score = Math.max(0, Math.min(100, score))
    return {
      score: Math.round(score * 10) / 10,
      summary:
        ratio > 1.35
          ? `Night flow ~${ratio.toFixed(2)}× prior baseline — possible leak or idle use`
          : `Night flow vs prior baseline OK (ratio ${ratio.toFixed(2)})`,
      recentQuietMedian: mr,
      priorQuietMedian: mp,
      ratio,
    }
  }

  // Early install: only recent quiet samples — absolute heuristic
  let score = 100
  if (recentQuiet.length >= 3 && mr > 45) {
    score -= Math.min(50, (mr - 45) * 0.8)
  } else if (recentQuiet.length >= 3 && mr > 25) {
    score -= Math.min(25, (mr - 25) * 0.5)
  }
  score = Math.max(0, Math.min(100, score))
  return {
    score: Math.round(score * 10) / 10,
    summary:
      daysOfHistory < 14
        ? `Early baseline — night median ${mr.toFixed(0)} L/h (estimate)`
        : `Night median ${mr.toFixed(0)} L/h (limited prior comparison)`,
    recentQuietMedian: recentQuiet.length ? mr : null,
    priorQuietMedian: null,
    ratio: null,
  }
}

function computeHydraulicStressScore(
  historyFlowPoints: FlowPoint[],
  todayFlowPoints: FlowPoint[],
  todayLitres: number,
  yesterdayLitres: number,
  dataCoverage: number,
  multiplier: number,
  nowMs: number,
): { score: number; maxLph: number; stuckHint: boolean; p95: number | null } {
  const dayMs = 86_400_000
  const sevenAgo = nowMs - 7 * dayMs
  const rates7d = historyFlowPoints
    .filter((p) => p.timestamp >= sevenAgo && p.flowRateLph > 0)
    .map((p) => p.flowRateLph)

  const todayRates = todayFlowPoints.map((p) => p.flowRateLph).filter((r) => r > 0)
  const maxLph = todayRates.length ? Math.max(...todayRates) : 0

  const cap = Math.min(
    HEALTH_HYDRO_ABSOLUTE_MAX_LPH,
    HEALTH_HYDRO_MULTIPLIER_LPH_FACTOR * Math.max(multiplier, 1),
  )

  let score = 100

  if (maxLph > cap) {
    const over = (maxLph - cap) / cap
    score -= Math.min(80, over * 40)
  }

  const stuckHint =
    dataCoverage >= HEALTH_MIN_COVERAGE_FOR_FULL_SCORE &&
    todayLitres < 0.5 &&
    yesterdayLitres >= HEALTH_STUCK_YESTERDAY_MIN_L

  if (stuckHint) score -= 22

  let p95: number | null = null
  if (rates7d.length >= 12) {
    const p95Val = percentile(rates7d, 0.95)
    p95 = p95Val
    const fracHigh =
      todayRates.length > 0
        ? todayRates.filter((r) => r > p95Val * 1.05).length / todayRates.length
        : 0
    score -= Math.min(45, fracHigh * 90)
  }

  score = Math.max(0, Math.min(100, score))
  return {
    score: Math.round(score * 10) / 10,
    maxLph,
    stuckHint,
    p95,
  }
}

function computeMechanicalScore(
  allMagData: MagDataPoint[],
  nowMs: number,
): { score: number; ratio: number | null; skipped: boolean } {
  const dayMs = 24 * 60 * 60_000
  const t24 = nowMs - dayMs
  const t7 = nowMs - 7 * dayMs

  const withBand = allMagData.filter(
    (p) =>
      p.bandEnergy10s != null &&
      Number.isFinite(p.bandEnergy10s) &&
      p.timestamp <= nowMs,
  )

  const last24 = withBand.filter((p) => p.timestamp >= t24)
  const prev6d = withBand.filter((p) => p.timestamp >= t7 && p.timestamp < t24)

  if (
    last24.length < HEALTH_MECH_MIN_POINTS_PER_WINDOW ||
    prev6d.length < HEALTH_MECH_MIN_POINTS_PER_WINDOW
  ) {
    return { score: 88, ratio: null, skipped: true }
  }

  const med = (arr: number[]) => {
    const s = [...arr].sort((a, b) => a - b)
    const m = Math.floor(s.length / 2)
    return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2
  }

  const med24 = med(last24.map((p) => p.bandEnergy10s!))
  const med6 = med(prev6d.map((p) => p.bandEnergy10s!))

  if (med6 <= 0) {
    return { score: 85, ratio: med24 > 0 ? null : 1, skipped: false }
  }

  const ratio = med24 / med6
  let score = 100
  if (ratio > HEALTH_MECH_SPIKE_RATIO_START) {
    const excess = ratio - HEALTH_MECH_SPIKE_RATIO_START
    score = Math.max(0, 100 - excess * 35)
  }
  return { score: Math.round(score * 10) / 10, ratio, skipped: false }
}

export function computeBuildingHealth(input: ComputeBuildingHealthInput): BuildingHealth {
  const {
    allMagData,
    historyFlowPoints,
    todayFlowPoints,
    todayStartMs,
    nowMs,
    todayLitres,
    yesterdayLitres,
    multiplier,
  } = input

  const calibration = computeCalibration(allMagData, nowMs)
  const isEstimate =
    calibration.status === 'estimate' ||
    calibration.daysOfHistory < HEALTH_CALIBRATION_TARGET_DAYS

  const trustStats = computeTrustScore(allMagData, todayStartMs, nowMs)
  const insufficientData =
    trustStats.sampleCount < HEALTH_MIN_SAMPLES_TODAY ||
    trustStats.coverage < HEALTH_MIN_COVERAGE_FOR_FULL_SCORE

  let sTrust = trustStats.score
  const leakDetail = computeLeakScore(
    historyFlowPoints,
    nowMs,
    calibration.daysOfHistory,
  )
  let sLeak = leakDetail.score
  const hydroStats = computeHydraulicStressScore(
    historyFlowPoints,
    todayFlowPoints,
    todayLitres,
    yesterdayLitres,
    trustStats.coverage,
    multiplier,
    nowMs,
  )
  let sHydro = hydroStats.score
  const mechStats = computeMechanicalScore(allMagData, nowMs)
  const sMech = mechStats.score

  if (insufficientData) {
    sTrust = Math.min(sTrust, 45)
    sHydro = Math.min(sHydro, 55)
  }

  const trustGate =
    sTrust < 28 ? 0.42 : sTrust < 48 ? 0.78 : 1

  let bhiRaw =
    W_TRUST * sTrust + W_LEAK * sLeak + W_HYDRO * sHydro + W_MECH * sMech
  let bhi = Math.round(bhiRaw * trustGate)

  if (insufficientData) {
    bhi = Math.min(bhi, 65)
  }
  if (calibration.daysOfHistory < 4) {
    bhi = Math.min(bhi, 62)
  }
  if (calibration.daysOfHistory < 7) {
    bhi = Math.min(bhi, 75)
  }

  const label = scoreToLabel(bhi, insufficientData)

  const trustSub: HealthSubScore = {
    score: Math.round(sTrust * 10) / 10,
    summary: insufficientData
      ? 'Low sample coverage today'
      : `${(trustStats.coverage * 100).toFixed(0)}% of today’s time bins have samples`,
    formula: `Weight in BHI: ${(W_TRUST * 100).toFixed(0)}%. Data Trust combines (1) coverage: share of today’s ${HEALTH_DATA_BIN_MS / 60_000}-minute windows with at least one reading, and (2) gap penalty for longest silence vs ${HEALTH_MAX_GAP_ACCEPTABLE_MIN} min. Acts as a confidence gate on the headline score. Sparse today caps reliability.`,
  }

  const leakSub: HealthSubScore = {
    score: Math.round(sLeak * 10) / 10,
    summary: leakDetail.summary,
    formula: `Weight in BHI: ${(W_LEAK * 100).toFixed(0)}%. Leak / idle uses inferred flow in local quiet hours (${HEALTH_QUIET_HOUR_START}:00–${HEALTH_QUIET_HOUR_END}:00). When ${HEALTH_LEAK_MIN_QUIET_SAMPLES}+ night samples exist in both the last 7 days and the prior 3 weeks, recent vs prior medians flag sustained idle flow. With little history, only coarse night medians are used — estimate.`,
  }

  const hydraulicSub: HealthSubScore = {
    score: Math.round(sHydro * 10) / 10,
    summary: hydroStats.stuckHint
      ? 'Possible stuck meter / zero flow vs yesterday'
      : hydroStats.p95 != null
        ? `Peak ${hydroStats.maxLph.toFixed(0)} L/h vs ~${hydroStats.p95.toFixed(0)} L/h (7d P95)`
        : `Peak inferred rate ${hydroStats.maxLph.toFixed(0)} L/h`,
    formula: `Weight in BHI: ${(W_HYDRO * 100).toFixed(0)}%. Hydraulic stress: penalties for peak rate above min(${HEALTH_HYDRO_ABSOLUTE_MAX_LPH} L/h, ${HEALTH_HYDRO_MULTIPLIER_LPH_FACTOR}× multiplier), fraction of today’s flow above ~7d P95, and a stuck hint when today ≈0 L but yesterday was high with good coverage.`,
  }

  const mechSub: HealthSubScore = {
    score: Math.round(sMech * 10) / 10,
    summary: mechStats.skipped
      ? 'Not enough band-energy history — neutral'
      : mechStats.ratio != null
        ? `24h vs prior 6d median ratio ${mechStats.ratio.toFixed(2)}`
        : 'Vibration band energy (10s)',
    formula: `Weight in BHI: ${(W_MECH * 100).toFixed(0)}%. Median band_energy_10s last 24h vs prior 6d; fewer than ${HEALTH_MECH_MIN_POINTS_PER_WINDOW} points per window → neutral ~88. Spikes above ${HEALTH_MECH_SPIKE_RATIO_START}× baseline reduce the score.`,
  }

  const overallFormula = `BHI = ${(W_TRUST * 100).toFixed(0)}%×Trust + ${(W_LEAK * 100).toFixed(0)}%×Leak/idle + ${(W_HYDRO * 100).toFixed(0)}%×Hydraulic + ${(W_MECH * 100).toFixed(0)}%×Mechanical, scaled by a trust gate when Data Trust is low. Labels: ≥85 healthy, ≥70 watch, ≥50 investigate. Until ~${HEALTH_CALIBRATION_TARGET_DAYS} days of history, the index is explicitly an estimate.`

  return {
    bhi,
    label,
    insufficientData,
    isEstimate,
    calibration,
    subScores: {
      trust: trustSub,
      leak: leakSub,
      hydraulic: hydraulicSub,
      mechanical: mechSub,
    },
    overallFormula,
  }
}
