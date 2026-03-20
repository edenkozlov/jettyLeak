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
  /** Average flow rate in L/h for this bucket (or minBar if zero). */
  flowRateLph: number
  /** True if this bucket is the current (incomplete) time slot. */
  partial: boolean
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
 * Detects peaks in the total magnitude signal using a sliding window approach.
 *
 * ## Algorithm
 *
 * 1. Divide the signal into overlapping windows (50% overlap).
 *    Window size is clamped between 10s and 5 minutes, targeting ~1/10th
 *    of the visible time range for good local resolution.
 *
 * 2. For each window:
 *    - Compute the variance of the signal values.
 *    - Skip if variance < MIN_VARIANCE (no flow, just noise).
 *    - Run `detectCycles` (Savitzky-Golay smoothing + prominence-based
 *      peak detection) on the window data.
 *    - Collect all detected peak timestamps.
 *
 * 3. Sort all peaks chronologically and deduplicate: any two peaks within
 *    PEAK_DEDUP_MS (500ms) are treated as the same peak (keep the first).
 *
 * This sliding window approach ensures that peaks are detected with local
 * prominence — a small flow signal won't be drowned out by a much larger
 * flow event elsewhere in the dataset.
 *
 * @param totalData - Time series of total magnitude values.
 * @param visibleRangeMs - The visible time range in ms (used to size windows).
 * @returns Sorted, deduplicated array of peak timestamps.
 */
function detectFlowPeaks(
  totalData: { timestamp: number; value: number }[],
  visibleRangeMs: number,
): number[] {
  if (totalData.length < 5) return []

  const windowMs = Math.max(10_000, Math.min(visibleRangeMs / 10, 300_000))
  const hopMs = windowMs / 2

  const allPeakSet = new Set<number>()
  const startTs = totalData[0]!.timestamp
  const endTs = totalData[totalData.length - 1]!.timestamp

  for (let winStart = startTs; winStart < endTs; winStart += hopMs) {
    const winEnd = winStart + windowMs
    const windowData = totalData.filter(
      (d) => d.timestamp >= winStart && d.timestamp <= winEnd,
    )
    if (windowData.length < 5) continue

    const vals = windowData.map((d) => d.value)
    const mean = vals.reduce((s, v) => s + v, 0) / vals.length
    const variance = vals.reduce((s, v) => s + (v - mean) ** 2, 0) / vals.length
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

/**
 * Returns the vibration intensity (band energy) of the mag data point
 * closest to the given timestamp. Uses the 10-second band energy if
 * available, otherwise falls back to 60-second.
 *
 * Data is assumed to be sorted chronologically — the search breaks early
 * once it passes the target timestamp for efficiency.
 */
function getVibrationAtTime(data: MagDataPoint[], ts: number): number {
  let closest: MagDataPoint | null = null
  let closestDist = Infinity
  for (const p of data) {
    const dist = Math.abs(p.timestamp - ts)
    if (dist < closestDist) {
      closestDist = dist
      closest = p
    }
    if (p.timestamp > ts) break
  }
  if (!closest) return 0
  return closest.bandEnergy10s ?? closest.bandEnergy60s ?? 0
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
 * @param visibleRangeMs - Visible time range in ms (for window sizing).
 * @returns Array of FlowPoint sorted chronologically.
 */
export function computeFlowFromPeaks(
  magData: MagDataPoint[],
  sensorMultiplier: number,
  visibleRangeMs: number,
): FlowPoint[] {
  if (sensorMultiplier <= 0 || magData.length < 5) return []

  const totalData = extractTotalMagnitude(magData)
  if (totalData.length < 5) return []

  const litresPerCycle = 1 / sensorMultiplier
  const peaks = detectFlowPeaks(totalData, visibleRangeMs)
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
 * ## Vibration Gating
 *
 * For each bucket, the maximum vibration intensity across all mag data points
 * in that bucket is checked. If it's below the threshold, the bucket's flow
 * is forced to zero regardless of detected peaks — the peaks are noise.
 *
 * ## Zero-Flow Minimum Bar
 *
 * Zero-flow buckets are given a small minimum value (`minBar`, default 2 L/h)
 * so they render as a tiny sliver in the bar chart, indicating that the time
 * slot exists and has been evaluated (vs. missing data).
 *
 * @param magData - Raw mag data points (for vibration intensity lookup).
 * @param flowData - Pre-computed flow points from `computeFlowFromPeaks`.
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
  bucketMs: number,
  chartWindowStart: number,
  numBuckets: number,
  minVibration = DEFAULT_MIN_VIBRATION,
  minBar = DEFAULT_MIN_BAR,
  now = Date.now(),
): BucketedFlowPoint[] {
  const buckets: BucketedFlowPoint[] = []

  for (let i = 0; i < numBuckets; i++) {
    const bStart = chartWindowStart + i * bucketMs
    const bEnd = bStart + bucketMs
    const bMid = bStart + bucketMs / 2
    const isPartial = bStart <= now && now < bEnd

    // Check vibration intensity in this bucket
    let maxVibration = 0
    for (const p of magData) {
      if (p.timestamp >= bStart && p.timestamp < bEnd) {
        const v = p.bandEnergy10s ?? p.bandEnergy60s ?? 0
        if (v > maxVibration) maxVibration = v
      }
    }

    let sum = 0
    let count = 0
    if (maxVibration >= minVibration) {
      for (const p of flowData) {
        if (p.timestamp >= bStart && p.timestamp < bEnd) {
          sum += p.flowRateLph
          count++
        }
      }
    }

    buckets.push({
      timestamp: bMid,
      flowRateLph: count > 0 ? Math.round((sum / count) * 100) / 100 : 0,
      partial: isPartial,
    })
  }

  // Apply minimum bar for zero-flow buckets
  return buckets.map((b) => ({
    ...b,
    flowRateLph: b.flowRateLph === 0 ? minBar : b.flowRateLph,
  }))
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
 * @param visibleRangeMs - Visible time range in ms (for window sizing).
 * @param sampleIntervalMs - Interval for zero-flow sampling points.
 * @param chartWindowStart - Start of the display window (epoch ms).
 * @param chartWindowEnd - End of the display window (epoch ms).
 * @param minVibration - Vibration threshold (default 5).
 * @returns Array of PeakFlowPoint sorted chronologically.
 */
export function computePeakFlow(
  magData: MagDataPoint[],
  sensorMultiplier: number,
  visibleRangeMs: number,
  sampleIntervalMs: number,
  chartWindowStart: number,
  chartWindowEnd: number,
  minVibration = DEFAULT_MIN_VIBRATION,
): PeakFlowPoint[] {
  if (sensorMultiplier <= 0 || magData.length < 5) return []

  const totalData = extractTotalMagnitude(magData)
  if (totalData.length < 5) return []

  const litresPerCycle = 1 / sensorMultiplier
  const peaks = detectFlowPeaks(totalData, visibleRangeMs)
  if (peaks.length < 2) return []

  const points: PeakFlowPoint[] = []

  for (let i = 1; i < peaks.length; i++) {
    const ts = peaks[i]!
    const intervalMs = ts - peaks[i - 1]!
    if (intervalMs <= 0) continue

    const vibration = getVibrationAtTime(magData, ts)
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

  // Insert zero-flow points during quiet periods
  for (let t = chartWindowStart; t <= chartWindowEnd; t += sampleIntervalMs) {
    const nearPeak = points.some(
      (p) => Math.abs(p.timestamp - t) < sampleIntervalMs * 0.4,
    )
    if (nearPeak) continue
    const vibration = getVibrationAtTime(magData, t)
    if (vibration < minVibration) {
      points.push({ timestamp: t, flowRateLph: 0 })
    }
  }

  return points.sort((a, b) => a.timestamp - b.timestamp)
}
