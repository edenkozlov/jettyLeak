// ---------------------------------------------------------------------------
// Signal-processing utilities: Savitzky-Golay smoothing, prominence-based
// peak/trough detection, inflection-point detection, and cycle counting.
// ---------------------------------------------------------------------------

// ---- Matrix helpers (small matrices only – used by SG coefficient calc) ----

function matTranspose(A: number[][]): number[][] {
  const rows = A.length
  const cols = A[0]!.length
  const R: number[][] = []
  for (let j = 0; j < cols; j++) {
    const row: number[] = []
    for (let i = 0; i < rows; i++) row.push(A[i]![j]!)
    R.push(row)
  }
  return R
}

function matMul(A: number[][], B: number[][]): number[][] {
  const m = A.length
  const n = B[0]!.length
  const p = B.length
  const R: number[][] = []
  for (let i = 0; i < m; i++) {
    const row = new Array<number>(n).fill(0)
    for (let k = 0; k < p; k++) {
      const a = A[i]![k]!
      for (let j = 0; j < n; j++) row[j]! += a * B[k]![j]!
    }
    R.push(row)
  }
  return R
}

function matInvert(A: number[][]): number[][] {
  const n = A.length
  const aug = A.map((row, i) => {
    const r = [...row]
    for (let j = 0; j < n; j++) r.push(i === j ? 1 : 0)
    return r
  })
  for (let col = 0; col < n; col++) {
    let best = col
    for (let row = col + 1; row < n; row++)
      if (Math.abs(aug[row]![col]!) > Math.abs(aug[best]![col]!)) best = row
    ;[aug[col], aug[best]] = [aug[best]!, aug[col]!]
    const pivot = aug[col]![col]!
    if (Math.abs(pivot) < 1e-14) throw new Error('Singular matrix in SG coefficient calculation')
    for (let j = col; j < 2 * n; j++) aug[col]![j]! /= pivot
    for (let row = 0; row < n; row++) {
      if (row === col) continue
      const f = aug[row]![col]!
      for (let j = col; j < 2 * n; j++) aug[row]![j]! -= f * aug[col]![j]!
    }
  }
  return aug.map((row) => row.slice(n))
}

// ---- Savitzky-Golay filter ------------------------------------------------

const sgCache = new Map<string, number[]>()

function sgCoeffs(windowSize: number, polyOrder: number): number[] {
  const key = `${windowSize}-${polyOrder}`
  const cached = sgCache.get(key)
  if (cached) return cached

  const m = (windowSize - 1) / 2
  const A: number[][] = []
  for (let i = 0; i < windowSize; i++) {
    const row: number[] = []
    const x = i - m
    for (let j = 0; j <= polyOrder; j++) row.push(Math.pow(x, j))
    A.push(row)
  }
  const AT = matTranspose(A)
  const coeffs = matMul(matInvert(matMul(AT, A)), AT)[0]!
  sgCache.set(key, coeffs)
  return coeffs
}

export function savitzkyGolaySmooth(
  values: number[],
  windowSize = 7,
  polyOrder = 3,
): number[] {
  if (values.length < 5) return [...values]
  const ws = windowSize % 2 === 0 ? windowSize + 1 : windowSize
  const clampedWs = Math.min(ws, values.length % 2 === 0 ? values.length - 1 : values.length)
  if (clampedWs < 3) return [...values]
  const po = Math.min(polyOrder, clampedWs - 1)
  const coeffs = sgCoeffs(clampedWs, po)
  const halfW = (clampedWs - 1) / 2
  const result = new Array<number>(values.length)
  for (let i = 0; i < values.length; i++) {
    let sum = 0
    for (let j = -halfW; j <= halfW; j++) {
      const idx = Math.max(0, Math.min(values.length - 1, i + j))
      sum += coeffs[j + halfW]! * values[idx]!
    }
    result[i] = sum
  }
  return result
}

// ---- Local extrema detection ----------------------------------------------

function findLocalMaxima(values: number[]): number[] {
  const peaks: number[] = []
  for (let i = 1; i < values.length - 1; i++)
    if (values[i]! > values[i - 1]! && values[i]! > values[i + 1]!) peaks.push(i)
  return peaks
}

function findLocalMinima(values: number[]): number[] {
  const troughs: number[] = []
  for (let i = 1; i < values.length - 1; i++)
    if (values[i]! < values[i - 1]! && values[i]! < values[i + 1]!) troughs.push(i)
  return troughs
}

// ---- Prominence (matches scipy.signal.peak_prominences logic) -------------

function computeProminences(
  values: number[],
  indices: number[],
  isPeak: boolean,
): number[] {
  const n = values.length
  return indices.map((idx) => {
    const val = values[idx]!

    // Walk left until a higher (for peaks) / lower (for troughs) value or boundary
    let leftRef = val
    for (let i = idx - 1; i >= 0; i--) {
      if (isPeak ? values[i]! > val : values[i]! < val) break
      if (isPeak ? values[i]! < leftRef : values[i]! > leftRef) leftRef = values[i]!
    }

    // Walk right
    let rightRef = val
    for (let i = idx + 1; i < n; i++) {
      if (isPeak ? values[i]! > val : values[i]! < val) break
      if (isPeak ? values[i]! < rightRef : values[i]! > rightRef) rightRef = values[i]!
    }

    const ref = isPeak ? Math.max(leftRef, rightRef) : Math.min(leftRef, rightRef)
    return Math.abs(val - ref)
  })
}

// ---- Inflection-point detection via 2nd derivative zero-crossings ---------

export interface InflectionPoint {
  index: number
  timestamp: number
  value: number
  direction: 'concave-up-to-down' | 'concave-down-to-up'
}

function numericalSecondDerivative(values: number[], timestamps: number[]): number[] {
  const n = values.length
  const d2 = new Array<number>(n).fill(0)
  for (let i = 1; i < n - 1; i++) {
    const dt1 = timestamps[i]! - timestamps[i - 1]!
    const dt2 = timestamps[i + 1]! - timestamps[i]!
    if (dt1 <= 0 || dt2 <= 0) continue
    const dtAvg = (dt1 + dt2) / 2
    d2[i] =
      ((values[i + 1]! - values[i]!) / dt2 - (values[i]! - values[i - 1]!) / dt1) / dtAvg
  }
  return d2
}

export function findInflectionPoints(
  values: number[],
  timestamps: number[],
): InflectionPoint[] {
  const d2 = numericalSecondDerivative(values, timestamps)
  const result: InflectionPoint[] = []
  for (let i = 1; i < d2.length; i++) {
    const prev = d2[i - 1]!
    const curr = d2[i]!
    if (prev * curr < 0) {
      result.push({
        index: i,
        timestamp: timestamps[i]!,
        value: values[i]!,
        direction: prev > 0 ? 'concave-up-to-down' : 'concave-down-to-up',
      })
    }
  }
  return result
}

// ---- Public types ---------------------------------------------------------

export interface SignalPeak {
  index: number
  timestamp: number
  value: number
  smoothedValue: number
  type: 'peak' | 'trough'
  prominence: number
}

export interface DetectedCycle {
  peak: SignalPeak
  trough: SignalPeak
  amplitude: number
  periodMs: number | null
}

export interface CycleDetectionOptions {
  smoothWindow?: number // Savitzky-Golay window size (odd, ≥3, default 7)
  polyOrder?: number // polynomial order (default 3)
  minProminence?: number // 0–1, fraction of data range (default 0.1)
  minDistanceMs?: number // minimum ms between peaks (default 0)
}

export interface CycleDetectionResult {
  smoothedValues: number[]
  peaks: SignalPeak[]
  troughs: SignalPeak[]
  alternating: SignalPeak[]
  inflectionPoints: InflectionPoint[]
  cycles: DetectedCycle[]
  halfCycleCount: number
  fullCycleCount: number
  avgAmplitude: number
  maxAmplitude: number
  avgFrequencyHz: number | null
  avgPeriodMs: number | null
  dataRange: number
}

// ---- Main entry point -----------------------------------------------------

const EMPTY: CycleDetectionResult = {
  smoothedValues: [],
  peaks: [],
  troughs: [],
  alternating: [],
  inflectionPoints: [],
  cycles: [],
  halfCycleCount: 0,
  fullCycleCount: 0,
  avgAmplitude: 0,
  maxAmplitude: 0,
  avgFrequencyHz: null,
  avgPeriodMs: null,
  dataRange: 0,
}

export function detectCycles(
  data: { timestamp: number; value: number }[],
  options: CycleDetectionOptions = {},
): CycleDetectionResult {
  const { smoothWindow = 7, polyOrder = 3, minProminence = 0.1, minDistanceMs = 0 } = options

  if (data.length < 5) return { ...EMPTY, smoothedValues: data.map((d) => d.value) }

  const rawValues = data.map((d) => d.value)
  const timestamps = data.map((d) => d.timestamp)

  // 1. Smooth with Savitzky-Golay
  const smoothed =
    smoothWindow >= 3 ? savitzkyGolaySmooth(rawValues, smoothWindow, polyOrder) : [...rawValues]

  // Data range for prominence threshold
  let sMin = smoothed[0]!
  let sMax = smoothed[0]!
  for (const v of smoothed) {
    if (v < sMin) sMin = v
    if (v > sMax) sMax = v
  }
  const dataRange = sMax - sMin
  if (dataRange === 0) return { ...EMPTY, smoothedValues: smoothed }

  const promThreshold = minProminence * dataRange

  // 2. Find local extrema on smoothed signal
  const peakIndices = findLocalMaxima(smoothed)
  const troughIndices = findLocalMinima(smoothed)

  // 3. Compute prominences
  const peakProms = computeProminences(smoothed, peakIndices, true)
  const troughProms = computeProminences(smoothed, troughIndices, false)

  // 4. Filter by prominence + minimum distance
  const filterExtrema = (
    indices: number[],
    proms: number[],
    type: 'peak' | 'trough',
  ): SignalPeak[] => {
    const out: SignalPeak[] = []
    for (let i = 0; i < indices.length; i++) {
      if (proms[i]! < promThreshold) continue
      const idx = indices[i]!
      const ts = timestamps[idx]!

      if (minDistanceMs > 0 && out.length > 0) {
        const last = out[out.length - 1]!
        if (ts - last.timestamp < minDistanceMs) {
          if (proms[i]! > last.prominence)
            out[out.length - 1] = {
              index: idx,
              timestamp: ts,
              value: rawValues[idx]!,
              smoothedValue: smoothed[idx]!,
              type,
              prominence: proms[i]!,
            }
          continue
        }
      }

      out.push({
        index: idx,
        timestamp: ts,
        value: rawValues[idx]!,
        smoothedValue: smoothed[idx]!,
        type,
        prominence: proms[i]!,
      })
    }
    return out
  }

  const peaks = filterExtrema(peakIndices, peakProms, 'peak')
  const troughs = filterExtrema(troughIndices, troughProms, 'trough')

  // 5. Build strict alternating peak ↔ trough sequence
  const merged = [...peaks, ...troughs].sort((a, b) => a.timestamp - b.timestamp)
  const alternating: SignalPeak[] = []
  for (const e of merged) {
    if (alternating.length === 0) {
      alternating.push(e)
      continue
    }
    const last = alternating[alternating.length - 1]!
    if (last.type === e.type) {
      if (e.prominence > last.prominence) alternating[alternating.length - 1] = e
    } else {
      alternating.push(e)
    }
  }

  // 6. Pair adjacent extrema into half-cycles
  const cycles: DetectedCycle[] = []
  for (let i = 0; i < alternating.length - 1; i++) {
    const a = alternating[i]!
    const b = alternating[i + 1]!
    if (a.type === b.type) continue
    const peak = a.type === 'peak' ? a : b
    const trough = a.type === 'trough' ? a : b
    cycles.push({
      peak,
      trough,
      amplitude: Math.abs(peak.value - trough.value),
      periodMs: null,
    })
  }

  // 7. Compute periods between consecutive peaks → frequency
  const seqPeaks = alternating.filter((e) => e.type === 'peak')
  const periods: number[] = []
  for (let i = 1; i < seqPeaks.length; i++)
    periods.push(seqPeaks[i]!.timestamp - seqPeaks[i - 1]!.timestamp)

  // Assign periods to cycles starting with a peak
  let pIdx = 0
  for (const c of cycles) {
    if (pIdx < periods.length) {
      c.periodMs = periods[pIdx]!
      pIdx++
    }
  }

  // 8. Inflection points on smoothed signal
  const inflectionPoints = findInflectionPoints(smoothed, timestamps)

  // 9. Aggregate statistics
  const halfCycleCount = alternating.length > 1 ? alternating.length - 1 : 0
  const fullCycleCount = seqPeaks.length > 1 ? seqPeaks.length - 1 : 0
  const avgAmplitude =
    cycles.length > 0 ? cycles.reduce((s, c) => s + c.amplitude, 0) / cycles.length : 0
  const maxAmplitude =
    cycles.length > 0 ? Math.max(...cycles.map((c) => c.amplitude)) : 0
  const avgPeriodMs =
    periods.length > 0 ? periods.reduce((s, p) => s + p, 0) / periods.length : null
  const avgFrequencyHz =
    avgPeriodMs != null && avgPeriodMs > 0 ? 1000 / avgPeriodMs : null

  return {
    smoothedValues: smoothed,
    peaks: alternating.filter((e) => e.type === 'peak'),
    troughs: alternating.filter((e) => e.type === 'trough'),
    alternating,
    inflectionPoints,
    cycles,
    halfCycleCount,
    fullCycleCount,
    avgAmplitude,
    maxAmplitude,
    avgFrequencyHz,
    avgPeriodMs,
    dataRange,
  }
}

// ---- Auto cycle count (simple ~30s window, 50% prominence) ----------------

export interface AutoCycleCountResult {
  windowStartTs: number
  windowEndTs: number
  peakCount: number
  cycleCount: number
  frequencyHz: number | null
  periodMs: number | null
}

/**
 * Pick a ~30 s window, start from the first prominent peak, count peak-to-peak
 * cycles until the window expires. Uses 50 % prominence threshold.
 */
export function autoCycleCount(
  data: { timestamp: number; value: number }[],
  options?: { windowMs?: number; smoothWindow?: number; polyOrder?: number },
): AutoCycleCountResult | null {
  const { windowMs = 30_000, smoothWindow = 7, polyOrder = 3 } = options ?? {}
  if (data.length < 5) return null

  const raw = data.map((d) => d.value)
  const ts = data.map((d) => d.timestamp)

  const smoothed = smoothWindow >= 3 ? savitzkyGolaySmooth(raw, smoothWindow, polyOrder) : [...raw]

  let lo = smoothed[0]!
  let hi = smoothed[0]!
  for (const v of smoothed) {
    if (v < lo) lo = v
    if (v > hi) hi = v
  }
  const range = hi - lo
  if (range === 0) return null

  const threshold = 0.5 * range

  const peakIdx = findLocalMaxima(smoothed)
  const proms = computeProminences(smoothed, peakIdx, true)

  const peaks: number[] = []
  for (let i = 0; i < peakIdx.length; i++)
    if (proms[i]! >= threshold) peaks.push(ts[peakIdx[i]!]!)

  if (peaks.length < 2) return null

  const start = peaks[0]!
  const cutoff = start + windowMs
  const inWindow = peaks.filter((t) => t <= cutoff)
  if (inWindow.length < 2) return null

  const end = inWindow[inWindow.length - 1]!
  const cycles = inWindow.length - 1
  const span = end - start

  return {
    windowStartTs: start,
    windowEndTs: end,
    peakCount: inWindow.length,
    cycleCount: cycles,
    frequencyHz: span > 0 ? (cycles * 1000) / span : null,
    periodMs: cycles > 0 ? span / cycles : null,
  }
}
