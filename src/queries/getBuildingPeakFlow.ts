import { GET_MAG_DOWNSAMPLED, type DownsampledMagRow } from '@/queries/getFlowAnalytics'

export interface PeakFlowStats {
  /** Peak instantaneous flow rate in L/min across the window. */
  peakLpm: number
  /** Median non-zero instantaneous flow rate (a "busy but not peak" reading). */
  medianLpm: number
  /** Timestamp of the peak sample. */
  peakAt: string | null
  /** Sensor that produced the peak. */
  peakSensorId: number | null
  /** Number of samples considered. */
  sampleCount: number
}

/**
 * Compute instantaneous peak flow from `mag_report.dominant_freq_hz`.
 *
 * Why dominant_freq_hz: the sensor's waveform goes through one full cycle per
 * litre / `multiplier`. `dominant_freq_hz` is the instantaneous frequency of
 * that waveform, so:
 *
 *     L/s   = dominant_freq_hz / multiplier
 *     L/min = dominant_freq_hz × 60 / multiplier
 *
 * This is a real instantaneous rate — not a 15-minute bucket average — because
 * it comes from a single sample's cycle frequency.
 *
 * The 1500-point downsampler is max-preserving, so the peak across a day is
 * captured without pulling 900k raw rows.
 */
export async function getBuildingPeakFlow(
  sensors: Array<{ id: number; multiplier: number | null }>,
  sinceMs: number,
  untilMs: number = Date.now(),
): Promise<PeakFlowStats> {
  const withMultiplier = sensors.filter(
    (s): s is { id: number; multiplier: number } =>
      s.multiplier != null && s.multiplier > 0,
  )
  if (withMultiplier.length === 0) {
    return {
      peakLpm: 0,
      medianLpm: 0,
      peakAt: null,
      peakSensorId: null,
      sampleCount: 0,
    }
  }

  const sensorIds = withMultiplier.map((s) => s.id)
  const multiplierById = new Map(withMultiplier.map((s) => [s.id, s.multiplier]))

  const res = await GET_MAG_DOWNSAMPLED({
    sensorIds,
    since: new Date(sinceMs).toISOString(),
    until: new Date(untilMs).toISOString(),
    maxPoints: 1500,
  })

  const rows = (res.mag_report ?? []) as DownsampledMagRow[]
  const lpmValues: number[] = []
  let peakLpm = 0
  let peakAt: string | null = null
  let peakSensorId: number | null = null

  for (const r of rows) {
    if (r.dominant_freq_hz == null || !Number.isFinite(r.dominant_freq_hz)) continue
    const mult = multiplierById.get(r.sensor_id)
    if (!mult) continue
    // L/min = cycles/sec × 60 / (cycles/litre)
    const lpm = (r.dominant_freq_hz * 60) / mult
    if (!Number.isFinite(lpm) || lpm <= 0) continue
    lpmValues.push(lpm)
    if (lpm > peakLpm) {
      peakLpm = lpm
      peakAt = r.created_at
      peakSensorId = r.sensor_id
    }
  }

  let medianLpm = 0
  if (lpmValues.length > 0) {
    lpmValues.sort((a, b) => a - b)
    const mid = Math.floor(lpmValues.length / 2)
    medianLpm =
      lpmValues.length % 2 === 0
        ? ((lpmValues[mid - 1] ?? 0) + (lpmValues[mid] ?? 0)) / 2
        : lpmValues[mid] ?? 0
  }

  return {
    peakLpm,
    medianLpm,
    peakAt,
    peakSensorId,
    sampleCount: lpmValues.length,
  }
}
