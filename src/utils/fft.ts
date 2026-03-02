export interface WaveFreqPoint {
  timestamp: number
  /** Rolling standard deviation — spikes when signal goes from flat to bumpy */
  activity: number
}

/**
 * Compute rolling standard deviation of the signal over a look-back window.
 * Flat/smooth → ~0.  Bumpy/noisy → spike.
 *
 * @param samples  Time-sorted array with `timestamp` (ms) and `value`.
 * @param windowMs  Look-back window in milliseconds (default 5000 = 5 s).
 */
export function computeWaveFrequency(
  samples: { timestamp: number; value: number }[],
  windowMs = 5000,
): WaveFreqPoint[] {
  if (samples.length < 3) return []

  const results: WaveFreqPoint[] = []
  let windowStart = 0

  for (let i = 0; i < samples.length; i++) {
    const cutoff = samples[i]!.timestamp - windowMs

    while (windowStart < i && samples[windowStart]!.timestamp < cutoff) {
      windowStart++
    }

    const count = i - windowStart + 1
    if (count < 3) {
      results.push({ timestamp: samples[i]!.timestamp, activity: 0 })
      continue
    }

    // Mean
    let sum = 0
    for (let j = windowStart; j <= i; j++) {
      sum += samples[j]!.value
    }
    const mean = sum / count

    // Variance
    let variance = 0
    for (let j = windowStart; j <= i; j++) {
      const diff = samples[j]!.value - mean
      variance += diff * diff
    }
    variance /= count

    results.push({
      timestamp: samples[i]!.timestamp,
      activity: Math.sqrt(variance),
    })
  }

  return results
}
