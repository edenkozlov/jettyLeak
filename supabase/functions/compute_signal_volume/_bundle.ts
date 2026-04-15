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


/**
 * Flow Computation Utilities
 *
 * Converts raw magnetometer waveform data into flow rate measurements.
 *
 * ## How It Works
 *
 * A magnetometer sensor is mounted on or near a water pipe. As water flows,
 * a mechanical component (e.g. a spinning turbine or oscillating element)
 * creates periodic disturbances in the magnetic field. Each full rotation/cycle
 * corresponds to a fixed volume of water passing through.
 *
 * ### Sensor Multiplier (cycles per litre)
 *
 * The sensor's `multiplier` field stores **cycles per litre** — the number of
 * complete waveform cycles that correspond to 1 litre of water. This is
 * determined during calibration. The inverse gives **litres per cycle**:
 *
 *     litresPerCycle = 1 / multiplier
 *
 * ### From Waveform to Flow Rate
 *
 * 1. **Peak Detection**: We detect peaks in the total magnitude signal using
 *    a sliding window approach. Each window runs Savitzky-Golay smoothing
 *    followed by prominence-based peak detection (via `detectCycles`).
 *
 * 2. **Variance Gating**: Windows where the signal variance is below 20 are
 *    skipped — low variance means no flow (just sensor noise).
 *
 * 3. **Peak Deduplication**: Peaks from overlapping windows are merged.
 *    Any two peaks within 500ms of each other are treated as the same peak.
 *
 * 4. **Flow Rate Calculation**: For each consecutive pair of peaks, the flow
 *    rate in litres per hour (L/h) is:
 *
 *        flowRateLph = litresPerCycle / (intervalMs / 3,600,000)
 *
 *    Where `intervalMs` is the time between the two peaks in milliseconds.
 *    Dividing by 3,600,000 converts ms to hours. So if peaks are 500ms apart
 *    and litresPerCycle = 0.1, the flow rate is 0.1 / (0.5/3600) = 720 L/h.
 *
 * ### Vibration Intensity Threshold
 *
 * The sensor also reports band energy values (vibration intensity over 10s
 * and 60s windows). When the vibration intensity is below a threshold
 * (default: 5), we assume zero flow regardless of detected peaks — the peaks
 * are likely noise, not actual flow cycles.
 *
 * ### Bucketed Flow (Bar Chart)
 *
 * For the bar chart display, flow data is aggregated into clock-aligned time
 * buckets. Each bucket spans a "nice" interval (e.g. 1 minute for a 15-minute
 * view). The bucket boundaries are aligned to epoch multiples of the interval
 * so they never shift — only the last (current) bucket is partial.
 *
 * ### Per-Peak Flow (Line Chart)
 *
 * For the line chart, each point is placed at the exact timestamp of a detected
 * peak, with the Y value being the instantaneous flow rate derived from the
 * interval to the previous peak. Zero-flow points are inserted during quiet
 * periods (low vibration, no peaks) to keep the line grounded.
 */


// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Minimal mag data point — matches MagChartPoint from the hooks. */
export interface MagDataPoint {
  timestamp: number
  x: number | null
  total: number | null
  bandEnergy10s: number | null
  bandEnergy60s: number | null
}

/** A single flow rate measurement at a point in time. */
export interface FlowPoint {
  timestamp: number
  /** Flow rate in litres per hour. */
  flowRateLph: number
  /** Cumulative volume in litres since the start of the dataset. */
  accumulatedL: number
}

/** A bucketed (aggregated) flow rate for the bar chart. */
export interface BucketedFlowPoint {
  /** Midpoint timestamp of the bucket. */
  timestamp: number
  /** True average flow in L/h (0 when there is no flow in this bucket). */
  flowRateLph: number
  /**
   * Bar chart Y value only: same as `flowRateLph`, except zero-flow buckets use a
   * small floor so the bar is still visible. Do not use for labels — use `flowRateLph`.
   */
  flowRateBarVisual: number
  /** True if this bucket is the current (incomplete) time slot. */
  partial: boolean
  /**
   * Estimated litres in this bucket: `flowRateLph` × effective duration (full `bucketMs`,
   * or elapsed time in-slot when `partial`).
   */
  bucketVolumeL: number
  /** Volume breakdown by signal type (sink, toilet, etc.). */
  volumeByType?: Record<string, number>
}

export interface SignalTimeRange {
  startMs: number
  endMs: number
  signalType: string
}

/** A per-peak flow rate measurement for the line chart. */
export interface PeakFlowPoint {
  timestamp: number
  /** Instantaneous flow rate in L/h at this peak (0 if below vibration threshold). */
  flowRateLph: number
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Minimum signal variance within a detection window for it to be considered
 * as containing flow. Below this threshold the signal is treated as baseline
 * noise. Value of 20 was determined empirically from field sensor data.
 */
const MIN_VARIANCE = 20

/**
 * Minimum prominence for peak detection. Peaks below this prominence relative
 * to their surrounding valleys are ignored. Prevents false positives from
 * minor signal fluctuations.
 */
const MIN_PROMINENCE = 0.5

/**
 * Minimum time gap (ms) between two peaks for them to be considered distinct.
 * Peaks from overlapping sliding windows that fall within this gap are merged
 * into a single peak.
 */
const PEAK_DEDUP_MS = 500

/**
 * Default minimum vibration intensity (band energy) required to count flow.
 * When the vibration intensity at a given time is below this threshold, any
 * detected peaks are assumed to be noise and flow is set to zero.
 */
const DEFAULT_MIN_VIBRATION = 5

/**
 * Minimum data points required per sliding window for peak detection.
 * Windows with fewer points are skipped. This is used to compute the
 * density-based minimum window size: avgSpacing * MIN_POINTS_PER_WINDOW.
 */
const MIN_POINTS_PER_WINDOW = 10

/**
 * Default minimum bar height (L/h) for zero-flow buckets in the bar chart.
 * Ensures every time slot shows a visible sliver even when flow is zero,
 * making the chart easier to read.
 */
const DEFAULT_MIN_BAR = 2

// ---------------------------------------------------------------------------
// Internal Helpers
// ---------------------------------------------------------------------------

/**
 * Extracts the total magnitude time series from mag data points.
 * Filters out null values and returns sorted {timestamp, value} pairs.
 */
function extractTotalMagnitude(
  data: MagDataPoint[],
): { timestamp: number; value: number }[] {
  return data
    .filter((p) => p.total != null)
    .map((p) => ({ timestamp: p.timestamp, value: p.total! }))
}

/**
 * Binary search: returns the index of the first element whose timestamp >= target.
 */
function lowerBound(
  data: { timestamp: number }[],
  target: number,
): number {
  let lo = 0
  let hi = data.length
  while (lo < hi) {
    const mid = (lo + hi) >>> 1
    if (data[mid]!.timestamp < target) lo = mid + 1
    else hi = mid
  }
  return lo
}

/**
 * Binary search: returns the index of the first element whose timestamp > target.
 */
function upperBound(
  data: { timestamp: number }[],
  target: number,
): number {
  let lo = 0
  let hi = data.length
  while (lo < hi) {
    const mid = (lo + hi) >>> 1
    if (data[mid]!.timestamp <= target) lo = mid + 1
    else hi = mid
  }
  return lo
}

/**
 * Detects peaks in the total magnitude signal using a sliding window approach.
 *
 * Uses binary search to extract window slices instead of filtering the full
 * array on every hop, reducing complexity from O(windows * N) to O(windows * W).
 *
 * @param totalData - Time series of total magnitude values.
 * @param _visibleRangeMs - Deprecated, ignored. Kept for call-site compat.
 * @returns Sorted, deduplicated array of peak timestamps.
 */
export function detectFlowPeaks(
  totalData: { timestamp: number; value: number }[],
  _visibleRangeMs?: number,
): number[] {
  if (totalData.length < 5) return []

  const dataSpan =
    totalData[totalData.length - 1]!.timestamp - totalData[0]!.timestamp
  const avgSpacingMs = dataSpan / (totalData.length - 1)
  const densityMin = avgSpacingMs * MIN_POINTS_PER_WINDOW
  const windowMs = Math.max(densityMin, 10_000)
  const hopMs = windowMs / 2

  const allPeakSet = new Set<number>()
  const startTs = totalData[0]!.timestamp
  const endTs = totalData[totalData.length - 1]!.timestamp

  for (let winStart = startTs; winStart < endTs; winStart += hopMs) {
    const winEnd = winStart + windowMs
    const lo = lowerBound(totalData, winStart)
    const hi = upperBound(totalData, winEnd)
    if (hi - lo < 5) continue

    const windowData = totalData.slice(lo, hi)

    let sum = 0
    for (let i = 0; i < windowData.length; i++) sum += windowData[i]!.value
    const mean = sum / windowData.length
    let variance = 0
    for (let i = 0; i < windowData.length; i++) {
      const diff = windowData[i]!.value - mean
      variance += diff * diff
    }
    variance /= windowData.length
    if (variance < MIN_VARIANCE) continue

    const result = detectCycles(windowData, { minProminence: MIN_PROMINENCE })
    for (const peak of result.peaks) allPeakSet.add(peak.timestamp)
  }

  const sortedPeaks = [...allPeakSet].sort((a, b) => a - b)
  const dedupedPeaks: number[] = []
  for (const ts of sortedPeaks) {
    if (
      dedupedPeaks.length === 0 ||
      ts - dedupedPeaks[dedupedPeaks.length - 1]! > PEAK_DEDUP_MS
    ) {
      dedupedPeaks.push(ts)
    }
  }

  return dedupedPeaks
}

/** Rolling 5s stddev of X-axis — same metric as the vibration intensity chart. */
const VIBRATION_WINDOW_MS = 5000

/**
 * Minimum average sample spacing (ms) to use X-axis stddev.
 * Below this threshold (data is dense enough) we compute rolling stddev.
 * Above it (sparse/downsampled data) we fall back to bandEnergy10s from the DB.
 */
const MAX_SPARSE_SPACING_MS = 5000

/**
 * Check whether the data is dense enough for the rolling X-axis stddev.
 * Returns true if average spacing <= MAX_SPARSE_SPACING_MS.
 */
function isDenseEnough(data: MagDataPoint[]): boolean {
  if (data.length < 5) return false
  const span = data[data.length - 1]!.timestamp - data[0]!.timestamp
  return span / data.length <= MAX_SPARSE_SPACING_MS
}

/**
 * Precompute rolling X-axis stddev for every data point.
 * Returns a Map from timestamp → activity (stddev).
 */
function buildVibrationMap(data: MagDataPoint[]): Map<number, number> {
  const map = new Map<number, number>()

  // Sparse data — fall back to bandEnergy10s from the DB
  if (!isDenseEnough(data)) {
    for (const p of data) {
      map.set(p.timestamp, p.bandEnergy10s ?? 0)
    }
    return map
  }

  // Dense data — rolling 5s X-axis stddev
  let windowStart = 0
  for (let i = 0; i < data.length; i++) {
    const x = data[i]!.x
    if (x == null) { map.set(data[i]!.timestamp, 0); continue }

    const cutoff = data[i]!.timestamp - VIBRATION_WINDOW_MS
    while (windowStart < i && data[windowStart]!.timestamp < cutoff) windowStart++

    let count = 0, sum = 0
    for (let j = windowStart; j <= i; j++) {
      const v = data[j]!.x
      if (v != null) { sum += v; count++ }
    }
    if (count < 3) { map.set(data[i]!.timestamp, 0); continue }

    const mean = sum / count
    let variance = 0
    for (let j = windowStart; j <= i; j++) {
      const v = data[j]!.x
      if (v != null) { const diff = v - mean; variance += diff * diff }
    }
    variance /= count
    map.set(data[i]!.timestamp, Math.sqrt(variance))
  }

  return map
}

/**
 * Returns the vibration intensity of the data point closest to the given timestamp.
 * Uses binary search for O(log n) instead of linear scan.
 */
function getVibrationAtTime(vibMap: Map<number, number>, sortedTimestamps: number[], ts: number): number {
  const n = sortedTimestamps.length
  if (n === 0) return 0

  let lo = 0
  let hi = n
  while (lo < hi) {
    const mid = (lo + hi) >>> 1
    if (sortedTimestamps[mid]! < ts) lo = mid + 1
    else hi = mid
  }

  let closest: number
  if (lo >= n) {
    closest = sortedTimestamps[n - 1]!
  } else if (lo === 0) {
    closest = sortedTimestamps[0]!
  } else {
    const before = sortedTimestamps[lo - 1]!
    const after = sortedTimestamps[lo]!
    closest = (ts - before <= after - ts) ? before : after
  }
  return vibMap.get(closest) ?? 0
}

/** Litres per waveform cycle: `1 / multiplier` when multiplier is cycles per litre. */
export function litresPerCycleFromMultiplier(multiplier: number): number {
  if (multiplier <= 0) return 0
  return 1 / multiplier
}

/**
 * Peak timestamps (total magnitude) for the same detection used by flow rate.
 */
export function getFlowPeakTimestamps(
  magData: MagDataPoint[],
): number[] {
  const totalData = extractTotalMagnitude(magData)
  return detectFlowPeaks(totalData)
}

/**
 * Volume from complete cycles whose peak-to-peak interval lies fully inside the window.
 * Each such interval contributes one cycle = `litresPerCycle` litres.
 */
export function volumeFromFullCyclesInWindow(
  peakTimestamps: number[],
  windowStartMs: number,
  windowEndMs: number,
  litresPerCycle: number,
): { fullCycles: number; volumeL: number } {
  let fullCycles = 0
  for (let i = 1; i < peakTimestamps.length; i++) {
    const a = peakTimestamps[i - 1]!
    const b = peakTimestamps[i]!
    if (a >= windowStartMs && b <= windowEndMs) fullCycles++
  }
  return {
    fullCycles,
    volumeL: Math.round(fullCycles * litresPerCycle * 10000) / 10000,
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Computes flow rate data from magnetometer waveform peaks.
 *
 * This is the core conversion from waveform → flow. It detects peaks in the
 * total magnitude signal, computes the flow rate between consecutive peaks,
 * and fills gaps during sustained flow periods.
 *
 * ## Gap Filling
 *
 * When the gap between two peaks exceeds 1.5x the median peak interval but
 * is still within the "sustained flow" threshold (3x median), interpolated
 * points are inserted at regular intervals with the average flow rate of the
 * two bounding peaks. This smooths out the flow curve when the sensor
 * occasionally misses a cycle.
 *
 * When the gap exceeds the sustained threshold (or 2 seconds), no
 * interpolation is done — this represents a genuine pause in flow.
 *
 * @param magData - Raw magnetometer data points (must have `total` field).
 * @param sensorMultiplier - Cycles per litre from sensor calibration.
 * @returns Array of FlowPoint sorted chronologically.
 */
export function computeFlowFromPeaks(
  magData: MagDataPoint[],
  sensorMultiplier: number,
): FlowPoint[] {
  if (sensorMultiplier <= 0 || magData.length < 5) return []

  const totalData = extractTotalMagnitude(magData)
  if (totalData.length < 5) return []

  const litresPerCycle = 1 / sensorMultiplier
  const peaks = detectFlowPeaks(totalData)
  if (peaks.length < 2) return []

  // Compute median peak interval for sustained flow detection
  const peakIntervals: number[] = []
  for (let i = 1; i < peaks.length; i++) {
    const gap = peaks[i]! - peaks[i - 1]!
    if (gap > 0) peakIntervals.push(gap)
  }
  if (peakIntervals.length === 0) return []
  const sortedIntervals = [...peakIntervals].sort((a, b) => a - b)
  const medianInterval = sortedIntervals[Math.floor(sortedIntervals.length / 2)]!
  const sustainedGapThreshold = medianInterval * 3

  // Build raw flow points from inter-peak intervals
  const rawPoints: FlowPoint[] = []
  for (let i = 1; i < peaks.length; i++) {
    const intervalMs = peaks[i]! - peaks[i - 1]!
    if (intervalMs <= 0) continue
    const flowRateLph = litresPerCycle / (intervalMs / 3_600_000)
    if (!Number.isFinite(flowRateLph)) continue
    rawPoints.push({
      timestamp: peaks[i]!,
      flowRateLph: Math.round(flowRateLph * 100) / 100,
      accumulatedL: Math.round(i * litresPerCycle * 10000) / 10000,
    })
  }
  if (rawPoints.length === 0) return []

  // Fill gaps during sustained flow
  const flowPoints: FlowPoint[] = [rawPoints[0]!]
  for (let i = 1; i < rawPoints.length; i++) {
    const prev = rawPoints[i - 1]!
    const curr = rawPoints[i]!
    const gap = curr.timestamp - prev.timestamp

    if (gap > sustainedGapThreshold && gap > 2000) {
      flowPoints.push(curr)
    } else if (gap > medianInterval * 1.5) {
      const avgRate = (prev.flowRateLph + curr.flowRateLph) / 2
      const numFill = Math.floor(gap / medianInterval) - 1
      for (let j = 1; j <= numFill; j++) {
        flowPoints.push({
          timestamp: prev.timestamp + j * (gap / (numFill + 1)),
          flowRateLph: Math.round(avgRate * 100) / 100,
          accumulatedL: prev.accumulatedL,
        })
      }
      flowPoints.push(curr)
    } else {
      flowPoints.push(curr)
    }
  }

  return flowPoints
}

/**
 * Aggregates flow data into clock-aligned time buckets for bar chart display.
 *
 * ## Bucketing Strategy
 *
 * Buckets are aligned to epoch multiples of `bucketMs` so their boundaries
 * are deterministic and never shift as new data arrives. For example, with
 * 1-minute buckets on a 15-minute view, boundaries are always at :00, :01,
 * :02, etc. Only the last bucket (the current time slot) is partial.
 *
 * ## Volume Calculation
 *
 * Volume per bucket is calculated by counting complete peak-to-peak cycles
 * (both peaks within the bucket boundaries) and multiplying by litresPerCycle.
 * This matches the cycle-counting approach used everywhere else and gives
 * correct discrete volume rather than the over-estimated rate × time approach.
 *
 * ## Vibration Gating
 *
 * For each bucket, the maximum vibration intensity across all mag data points
 * in that bucket is checked. If it's below the threshold, the bucket's flow
 * is forced to zero regardless of detected peaks — the peaks are noise.
 *
 * ## Zero-Flow Minimum Bar
 *
 * Zero-flow buckets keep `flowRateLph === 0` for tooltips and stats. The field
 * `flowRateBarVisual` uses a small floor (`minBar`, default 2 L/h) so the bar
 * still renders as a tiny sliver (time slot exists vs. missing data).
 *
 * @param magData - Raw mag data points (for vibration intensity lookup).
 * @param flowData - Pre-computed flow points from `computeFlowFromPeaks`.
 * @param peakTimestamps - Sorted peak timestamps from `detectFlowPeaks`.
 * @param litresPerCycle - Volume per cycle (1 / sensorMultiplier).
 * @param bucketMs - Width of each bucket in milliseconds.
 * @param chartWindowStart - Start of the display window (epoch ms).
 * @param numBuckets - Number of buckets to generate.
 * @param minVibration - Vibration threshold (default 5).
 * @param minBar - Minimum bar value for zero-flow buckets (default 2 L/h).
 * @param now - Current time in ms (default Date.now()), used to mark partial bucket.
 * @returns Array of BucketedFlowPoint, one per bucket.
 */
export function computeBucketedFlow(
  magData: MagDataPoint[],
  flowData: FlowPoint[],
  peakTimestamps: number[],
  litresPerCycle: number,
  bucketMs: number,
  chartWindowStart: number,
  numBuckets: number,
  minVibration = DEFAULT_MIN_VIBRATION,
  minBar = DEFAULT_MIN_BAR,
  now = Date.now(),
  signals: SignalTimeRange[] = [],
): BucketedFlowPoint[] {
  const vibMap = buildVibrationMap(magData)
  const buckets: BucketedFlowPoint[] = []

  // Pre-compute bucket index for each data point to avoid repeated linear scans.
  // magData, flowData, and peakTimestamps are assumed sorted by timestamp.
  const magBucketVib = new Float64Array(numBuckets)
  for (const p of magData) {
    const bi = Math.floor((p.timestamp - chartWindowStart) / bucketMs)
    if (bi < 0 || bi >= numBuckets) continue
    const v = vibMap.get(p.timestamp) ?? 0
    if (v > magBucketVib[bi]!) magBucketVib[bi] = v
  }

  const flowBucketSum = new Float64Array(numBuckets)
  const flowBucketCount = new Uint32Array(numBuckets)
  for (const p of flowData) {
    const bi = Math.floor((p.timestamp - chartWindowStart) / bucketMs)
    if (bi < 0 || bi >= numBuckets) continue
    flowBucketSum[bi]! += p.flowRateLph
    flowBucketCount[bi]!++
  }

  // Per-bucket cycle counts: total + per signal type
  const cycleBucketCount = new Uint32Array(numBuckets)
  const cycleBucketByType: Map<string, Uint32Array> = new Map()
  for (let j = 1; j < peakTimestamps.length; j++) {
    const a = peakTimestamps[j - 1]!
    const b = peakTimestamps[j]!
    if (a < chartWindowStart) continue
    const biB = Math.floor((b - chartWindowStart) / bucketMs)
    if (biB >= 0 && biB < numBuckets) {
      cycleBucketCount[biB]!++
      const sigType = getSignalTypeAt(b, signals)
      let arr = cycleBucketByType.get(sigType)
      if (!arr) {
        arr = new Uint32Array(numBuckets)
        cycleBucketByType.set(sigType, arr)
      }
      arr[biB]!++
    }
  }

  for (let i = 0; i < numBuckets; i++) {
    const bStart = chartWindowStart + i * bucketMs
    const bEnd = bStart + bucketMs
    const bMid = bStart + bucketMs / 2
    const isPartial = bStart <= now && now < bEnd

    const maxVibration = magBucketVib[i]!
    let flowRateLph = 0
    let cyclesInBucket = 0

    if (maxVibration >= minVibration) {
      const count = flowBucketCount[i]!
      flowRateLph = count > 0 ? Math.round((flowBucketSum[i]! / count) * 100) / 100 : 0
      cyclesInBucket = cycleBucketCount[i]!
    }

    const bucketVolumeL =
      Math.round(cyclesInBucket * litresPerCycle * 10000) / 10000

    const volumeByType: Record<string, number> = {}
    if (cyclesInBucket > 0) {
      for (const [type, arr] of cycleBucketByType) {
        const tc = arr[i]!
        if (tc > 0) {
          volumeByType[type] = Math.round(tc * litresPerCycle * 10000) / 10000
        }
      }
    }

    buckets.push({
      timestamp: bMid,
      flowRateLph,
      flowRateBarVisual: flowRateLph === 0 ? minBar : flowRateLph,
      partial: isPartial,
      bucketVolumeL,
      volumeByType,
    })
  }

  return buckets
}

function getSignalTypeAt(timestampMs: number, signals: SignalTimeRange[]): string {
  for (const s of signals) {
    if (timestampMs >= s.startMs && timestampMs <= s.endMs) {
      return s.signalType
    }
  }
  return 'unknown'
}

/**
 * Computes per-peak instantaneous flow rates for line chart display.
 *
 * Unlike the bucketed version which averages flow over time slots, this
 * places a data point at the exact timestamp of each detected waveform peak.
 * The Y value is the instantaneous flow rate derived from the time interval
 * to the previous peak:
 *
 *     flowRateLph = litresPerCycle / (intervalMs / 3,600,000)
 *
 * ## Vibration Gating
 *
 * At each peak, the nearest vibration intensity reading is checked. If it's
 * below the threshold, the flow rate is forced to zero — the peak is noise.
 *
 * ## Zero-Flow Sampling
 *
 * During quiet periods (no peaks detected), zero-flow points are inserted
 * at regular intervals so the line chart stays grounded at zero rather than
 * showing gaps. The sampling interval is half the bucket size (or 5 seconds,
 * whichever is larger). Points are not inserted near existing peak points
 * to avoid clutter.
 *
 * @param magData - Raw mag data points.
 * @param sensorMultiplier - Cycles per litre from sensor calibration.
 * @param sampleIntervalMs - Interval for zero-flow sampling points.
 * @param chartWindowStart - Start of the display window (epoch ms).
 * @param chartWindowEnd - End of the display window (epoch ms).
 * @param minVibration - Vibration threshold (default 5).
 * @returns Array of PeakFlowPoint sorted chronologically.
 */
export function computePeakFlow(
  magData: MagDataPoint[],
  sensorMultiplier: number,
  sampleIntervalMs: number,
  chartWindowStart: number,
  chartWindowEnd: number,
  minVibration = DEFAULT_MIN_VIBRATION,
): PeakFlowPoint[] {
  if (sensorMultiplier <= 0 || magData.length < 5) return []

  const totalData = extractTotalMagnitude(magData)
  if (totalData.length < 5) return []

  const litresPerCycle = 1 / sensorMultiplier
  const peaks = detectFlowPeaks(totalData)
  if (peaks.length < 2) return []

  const vibMap = buildVibrationMap(magData)
  const sortedTs = magData.map(p => p.timestamp)
  const points: PeakFlowPoint[] = []

  for (let i = 1; i < peaks.length; i++) {
    const ts = peaks[i]!
    const intervalMs = ts - peaks[i - 1]!
    if (intervalMs <= 0) continue

    const vibration = getVibrationAtTime(vibMap, sortedTs, ts)
    if (vibration < minVibration) {
      points.push({ timestamp: ts, flowRateLph: 0 })
    } else {
      const flowRateLph = litresPerCycle / (intervalMs / 3_600_000)
      if (!Number.isFinite(flowRateLph)) continue
      points.push({
        timestamp: ts,
        flowRateLph: Math.round(flowRateLph * 100) / 100,
      })
    }
  }

  // Insert zero-flow points during quiet periods.
  // Pre-sort peak points and use a pointer to avoid O(n*m) .some() scans.
  points.sort((a, b) => a.timestamp - b.timestamp)
  const threshold = sampleIntervalMs * 0.4
  const zeroPoints: PeakFlowPoint[] = []
  let peakIdx = 0
  for (let t = chartWindowStart; t <= chartWindowEnd; t += sampleIntervalMs) {
    while (peakIdx < points.length && points[peakIdx]!.timestamp < t - threshold) peakIdx++
    const nearPeak =
      peakIdx < points.length && Math.abs(points[peakIdx]!.timestamp - t) < threshold
    if (nearPeak) continue
    const vibration = getVibrationAtTime(vibMap, sortedTs, t)
    if (vibration < minVibration) {
      zeroPoints.push({ timestamp: t, flowRateLph: 0 })
    }
  }

  if (zeroPoints.length > 0) {
    points.push(...zeroPoints)
    points.sort((a, b) => a.timestamp - b.timestamp)
  }

  return points
}


// ============================================================================
// compute_signal_volume edge function
//
// Computes signal.volume_l and signal.avg_flow_lpm from raw mag_report peaks,
// using the same TypeScript pipeline (computeFlowFromPeaks) that the admin
// Segment Detail view runs client-side. Invoked:
//
//   - Asynchronously from a BEFORE INSERT → AFTER INSERT trigger via pg_net
//     (one row at a time, right after the signal lands).
//   - From the client or a cron task in backfill mode to (re)compute rows in
//     bulk: { backfill: true, limit: N, force: false }.
//
// This exists so there is a single source of truth for flow math. The DB
// trigger in migration 005 used a simpler plpgsql peak detector, which drifted
// from the client's Savitzky-Golay + prominence pipeline (admin showed 340 L/h
// where DB-stored values were 510 L/h). Now both sides import the same module.
// ============================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.0";

// Padding applied to the mag_report fetch window so the sliding-variance peak
// detector has enough context at the boundaries for short sessions. Matches
// the 2.5s extension in the old plpgsql function.
const WINDOW_PADDING_MS = 2500;

// Max rows we'll ever pull for a single signal. A signal with > this many
// samples is almost certainly spanning hours and should be treated as
// pathological — we return null and let the operator investigate.
const MAX_MAG_ROWS = 20_000;

interface SignalRow {
  id: number;
  sensor_id: number;
  start_time: string;
  end_time: string | null;
}

interface MagRow {
  created_at: string;
  x_axis_reading: number | null;
  total_magnitude: number | null;
  band_energy_10s: number | null;
  band_energy_60s: number | null;
}

interface ComputedStats {
  volume_l: number | null;
  avg_flow_lpm: number | null;
}

function serviceClient() {
  const url = Deno.env.get("SUPABASE_URL")!;
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  return createClient(url, key, { auth: { persistSession: false } });
}

async function fetchSensorMultiplier(
  sb: ReturnType<typeof serviceClient>,
  sensorId: number,
): Promise<number | null> {
  const { data, error } = await sb
    .from("sensor")
    .select("multiplier")
    .eq("id", sensorId)
    .maybeSingle();
  if (error) throw error;
  const m = data?.multiplier != null ? Number(data.multiplier) : 0;
  return Number.isFinite(m) && m > 0 ? m : null;
}

async function fetchMagRows(
  sb: ReturnType<typeof serviceClient>,
  sensorId: number,
  startMs: number,
  endMs: number,
): Promise<MagRow[]> {
  const sinceIso = new Date(startMs - WINDOW_PADDING_MS).toISOString();
  const untilIso = new Date(endMs + WINDOW_PADDING_MS).toISOString();

  // Paginated fetch because PostgREST caps a single response at ~1000 rows.
  // A high-rate signal of a few minutes can easily exceed that.
  const pageSize = 1000;
  const out: MagRow[] = [];
  let from = 0;
  while (out.length < MAX_MAG_ROWS) {
    const { data, error } = await sb
      .from("mag_report")
      .select(
        "created_at, x_axis_reading, total_magnitude, band_energy_10s, band_energy_60s",
      )
      .eq("sensor_id", sensorId)
      .gte("created_at", sinceIso)
      .lte("created_at", untilIso)
      .order("created_at", { ascending: true })
      .range(from, from + pageSize - 1);
    if (error) throw error;
    const rows = (data ?? []) as MagRow[];
    out.push(...rows);
    if (rows.length < pageSize) break;
    from += pageSize;
  }
  return out;
}

function computeStatsForSignal(
  magRows: MagRow[],
  multiplier: number,
  signalStartMs: number,
  signalEndMs: number,
): ComputedStats {
  if (magRows.length < 5) return { volume_l: 0, avg_flow_lpm: 0 };

  const magPoints: MagDataPoint[] = magRows.map((r) => ({
    timestamp: new Date(r.created_at).getTime(),
    x: r.x_axis_reading,
    total: r.total_magnitude,
    bandEnergy10s: r.band_energy_10s,
    bandEnergy60s: r.band_energy_60s,
  }));

  const flowPoints = computeFlowFromPeaks(magPoints, multiplier);
  if (flowPoints.length === 0) return { volume_l: 0, avg_flow_lpm: 0 };

  // Restrict attribution to peaks that fall inside the signal window. The
  // padding context is only there to stabilize peak detection at the edges.
  const inWindow = flowPoints.filter(
    (p) => p.timestamp >= signalStartMs && p.timestamp <= signalEndMs,
  );
  if (inWindow.length === 0) return { volume_l: 0, avg_flow_lpm: 0 };

  // Accumulated L is monotonically increasing over the full peak stream; take
  // the delta between the first and last peak inside the window.
  const firstAccum = inWindow[0]!.accumulatedL;
  const lastAccum = inWindow[inWindow.length - 1]!.accumulatedL;
  const volumeL = Math.max(0, lastAccum - firstAccum);

  const durationS = Math.max(0.001, (signalEndMs - signalStartMs) / 1000);
  const avgFlowLpm = (volumeL / durationS) * 60;

  return {
    volume_l: Math.round(volumeL * 10000) / 10000,
    avg_flow_lpm: Math.round(avgFlowLpm * 10000) / 10000,
  };
}

async function processSignal(
  sb: ReturnType<typeof serviceClient>,
  signal: SignalRow,
): Promise<ComputedStats> {
  const multiplier = await fetchSensorMultiplier(sb, signal.sensor_id);
  if (multiplier == null) return { volume_l: null, avg_flow_lpm: null };

  const startMs = new Date(signal.start_time).getTime();
  const endMs = signal.end_time ? new Date(signal.end_time).getTime() : startMs;
  if (!Number.isFinite(startMs) || endMs < startMs) {
    return { volume_l: null, avg_flow_lpm: null };
  }

  const magRows = await fetchMagRows(sb, signal.sensor_id, startMs, endMs);
  const stats = computeStatsForSignal(magRows, multiplier, startMs, endMs);

  const { error } = await sb
    .from("signal")
    .update({ volume_l: stats.volume_l, avg_flow_lpm: stats.avg_flow_lpm })
    .eq("id", signal.id);
  if (error) throw error;

  return stats;
}

async function handleSingle(
  sb: ReturnType<typeof serviceClient>,
  signalId: number,
): Promise<Response> {
  const { data, error } = await sb
    .from("signal")
    .select("id, sensor_id, start_time, end_time")
    .eq("id", signalId)
    .maybeSingle();
  if (error) return jsonError(error.message, 500);
  if (!data) return jsonError(`signal ${signalId} not found`, 404);

  try {
    const stats = await processSignal(sb, data as SignalRow);
    return json({ ok: true, signalId, ...stats });
  } catch (err) {
    return jsonError((err as Error).message, 500);
  }
}

async function handleBackfill(
  sb: ReturnType<typeof serviceClient>,
  limit: number,
  force: boolean,
): Promise<Response> {
  let query = sb
    .from("signal")
    .select("id, sensor_id, start_time, end_time")
    .not("sensor_id", "is", null)
    .not("start_time", "is", null)
    .order("start_time", { ascending: false })
    .limit(limit);
  if (!force) query = query.is("volume_l", null);

  const { data, error } = await query;
  if (error) return jsonError(error.message, 500);

  const rows = (data ?? []) as SignalRow[];
  let ok = 0;
  let failed = 0;
  for (const row of rows) {
    try {
      await processSignal(sb, row);
      ok++;
    } catch {
      failed++;
    }
  }
  return json({ ok: true, processed: ok, failed, scanned: rows.length });
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function jsonError(message: string, status: number): Response {
  return json({ ok: false, error: message }, status);
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return jsonError("POST required", 405);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return jsonError("invalid JSON body", 400);
  }

  const sb = serviceClient();

  if (body.backfill === true) {
    const limit = Math.min(Number(body.limit ?? 100), 500);
    const force = body.force === true;
    return handleBackfill(sb, limit, force);
  }

  const signalId = Number(body.signalId ?? body.signal_id);
  if (!Number.isFinite(signalId) || signalId <= 0) {
    return jsonError("signalId required", 400);
  }
  return handleSingle(sb, signalId);
});
