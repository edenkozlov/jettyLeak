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

import { detectCycles } from '@/utils/signalProcessing'

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

  const cycleBucketCount = new Uint32Array(numBuckets)
  for (let j = 1; j < peakTimestamps.length; j++) {
    const a = peakTimestamps[j - 1]!
    const b = peakTimestamps[j]!
    // Skip cycles whose first peak is before the chart window (consistent
    // with volumeFromFullCyclesInWindow).  Assign the cycle to the bucket
    // where it completes (peak B) so boundary-straddling cycles aren't lost.
    if (a < chartWindowStart) continue
    const biB = Math.floor((b - chartWindowStart) / bucketMs)
    if (biB >= 0 && biB < numBuckets) {
      cycleBucketCount[biB]!++
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
    buckets.push({
      timestamp: bMid,
      flowRateLph,
      flowRateBarVisual: flowRateLph === 0 ? minBar : flowRateLph,
      partial: isPartial,
      bucketVolumeL,
    })
  }

  return buckets
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
