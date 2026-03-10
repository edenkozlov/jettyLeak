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

// --- Real FFT (Cooley-Tukey radix-2) ---

export interface FFTPoint {
  /** Frequency in Hz */
  freq: number
  /** Magnitude (absolute value of complex bin) */
  magnitude: number
}

/**
 * In-place radix-2 Cooley-Tukey FFT.
 * `re` and `im` are real/imaginary arrays of length N (must be power of 2).
 */
function fftInPlace(re: Float64Array, im: Float64Array): void {
  const N = re.length
  // Bit-reversal permutation
  for (let i = 1, j = 0; i < N; i++) {
    let bit = N >> 1
    while (j & bit) {
      j ^= bit
      bit >>= 1
    }
    j ^= bit
    if (i < j) {
      let tmp = re[i]!; re[i] = re[j]!; re[j] = tmp
      tmp = im[i]!; im[i] = im[j]!; im[j] = tmp
    }
  }
  // Butterfly passes
  for (let len = 2; len <= N; len <<= 1) {
    const halfLen = len >> 1
    const angle = (-2 * Math.PI) / len
    const wRe = Math.cos(angle)
    const wIm = Math.sin(angle)
    for (let i = 0; i < N; i += len) {
      let curRe = 1
      let curIm = 0
      for (let j = 0; j < halfLen; j++) {
        const a = i + j
        const b = a + halfLen
        const tRe = curRe * re[b]! - curIm * im[b]!
        const tIm = curRe * im[b]! + curIm * re[b]!
        re[b] = re[a]! - tRe
        im[b] = im[a]! - tIm
        re[a] = re[a]! + tRe
        im[a] = im[a]! + tIm
        const nextRe = curRe * wRe - curIm * wIm
        curIm = curRe * wIm + curIm * wRe
        curRe = nextRe
      }
    }
  }
}

/**
 * Compute FFT spectrum of |B| magnitude signal.
 *
 * Recipe:
 * 1. Estimate sample rate from timestamps
 * 2. Subtract 1 s moving average (high-pass / detrend)
 * 3. Apply Hann window
 * 4. Zero-pad to next power of 2
 * 5. FFT → return magnitude spectrum for 0.5–25 Hz band
 *
 * @param samples  Time-sorted {timestamp (ms), value} pairs (e.g. |B|)
 * @param movingAvgMs  High-pass moving-average window in ms (default 1000)
 */
export function computeFFTSpectrum(
  samples: { timestamp: number; value: number }[],
  movingAvgMs = 1000,
): FFTPoint[] {
  if (samples.length < 8) return []

  // Estimate sample rate
  const totalMs =
    samples[samples.length - 1]!.timestamp - samples[0]!.timestamp
  if (totalMs <= 0) return []
  const fs = ((samples.length - 1) / totalMs) * 1000 // Hz

  // High-pass: subtract moving average
  const halfWin = movingAvgMs / 2
  const highPassed = new Float64Array(samples.length)
  let lo = 0
  let hi = 0
  let sum = 0
  let count = 0
  for (let i = 0; i < samples.length; i++) {
    const ts = samples[i]!.timestamp
    const minTs = ts - halfWin
    const maxTs = ts + halfWin
    while (hi < samples.length && samples[hi]!.timestamp <= maxTs) {
      sum += samples[hi]!.value
      count++
      hi++
    }
    while (lo < samples.length && samples[lo]!.timestamp < minTs) {
      sum -= samples[lo]!.value
      count--
      lo++
    }
    highPassed[i] = samples[i]!.value - (count > 0 ? sum / count : 0)
  }

  // Hann window
  const N = highPassed.length
  for (let i = 0; i < N; i++) {
    const w = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (N - 1)))
    highPassed[i] = highPassed[i]! * w
  }

  // Zero-pad to next power of 2
  let fftSize = 1
  while (fftSize < N) fftSize <<= 1

  const re = new Float64Array(fftSize)
  const im = new Float64Array(fftSize)
  re.set(highPassed)

  fftInPlace(re, im)

  // Build magnitude spectrum (only positive frequencies up to Nyquist)
  const result: FFTPoint[] = []
  const nyquist = Math.floor(fftSize / 2)
  for (let k = 1; k <= nyquist; k++) {
    const freq = (k * fs) / fftSize
    if (freq < 0.5 || freq > 25) continue
    const mag = Math.sqrt(re[k]! * re[k]! + im[k]! * im[k]!) / N
    result.push({ freq, magnitude: mag })
  }

  return result
}

// --- Sliding FFT (STFT) → dominant frequency over time ---

export interface DominantFreqPoint {
  /** Center timestamp of the window (ms) */
  timestamp: number
  /** Dominant frequency in Hz (peak bin) */
  freqHz: number
  /** RPM = freqHz * 60 */
  rpm: number
  /** Magnitude at the peak */
  peakMag: number
  /** Total band energy: sqrt(sum of mag²) across all bins in range — spikes when vibration increases */
  bandEnergy: number
}

/** High-pass a single channel by subtracting a moving average. */
function highPass(
  timestamps: Float64Array,
  values: Float64Array,
  halfWinMs: number,
): Float64Array {
  const N = values.length
  const out = new Float64Array(N)
  let lo = 0
  let hi = 0
  let sum = 0
  let count = 0
  for (let i = 0; i < N; i++) {
    const ts = timestamps[i]!
    while (hi < N && timestamps[hi]! <= ts + halfWinMs) {
      sum += values[hi]!
      count++
      hi++
    }
    while (lo < N && timestamps[lo]! < ts - halfWinMs) {
      sum -= values[lo]!
      count--
      lo++
    }
    out[i] = values[i]! - (count > 0 ? sum / count : 0)
  }
  return out
}

export interface MultiAxisSample {
  timestamp: number
  values: number[] // one per channel (e.g. [x, y, z])
}

/**
 * Sliding-window FFT across multiple channels (e.g. x, y, z axes).
 * For each window, runs FFT on every channel independently and keeps
 * the result from whichever channel has the strongest peak.
 *
 * @param samples     Time-sorted samples with a `values` array per channel
 * @param windowMs    FFT window length in ms (default 2000)
 * @param hopMs       Step between windows in ms (default 250)
 * @param minFreqHz   Ignore peaks below this (default 0.05)
 * @param maxFreqHz   Ignore peaks above this (default 25)
 * @param movingAvgMs High-pass detrend window in ms (default 4000)
 */
export function computeDominantFreqOverTime(
  samples: MultiAxisSample[],
  windowMs = 2000,
  hopMs = 250,
  minFreqHz = 0.05,
  maxFreqHz = 25,
  movingAvgMs = 4000,
): DominantFreqPoint[] {
  if (samples.length < 8) return []
  const numChannels = samples[0]!.values.length
  if (numChannels === 0) return []

  const startTs = samples[0]!.timestamp
  const endTs = samples[samples.length - 1]!.timestamp
  if (endTs - startTs < windowMs) return []

  const fs = ((samples.length - 1) / (endTs - startTs)) * 1000

  // Build typed arrays for timestamps and per-channel high-passed signals
  const timestamps = new Float64Array(samples.length)
  for (let i = 0; i < samples.length; i++) timestamps[i] = samples[i]!.timestamp

  const halfWin = movingAvgMs / 2
  const hpChannels: Float64Array[] = []
  for (let ch = 0; ch < numChannels; ch++) {
    const raw = new Float64Array(samples.length)
    for (let i = 0; i < samples.length; i++) raw[i] = samples[i]!.values[ch]!
    hpChannels.push(highPass(timestamps, raw, halfWin))
  }

  // FFT size
  const expectedSamples = Math.round((windowMs / 1000) * fs)
  let fftSize = 1
  while (fftSize < expectedSamples) fftSize <<= 1

  const re = new Float64Array(fftSize)
  const im = new Float64Array(fftSize)

  const results: DominantFreqPoint[] = []
  let sampleIdx = 0

  for (let winStart = startTs; winStart + windowMs <= endTs; winStart += hopMs) {
    const winEnd = winStart + windowMs
    const centerTs = winStart + windowMs / 2

    // Advance pointer to window start
    while (sampleIdx > 0 && samples[sampleIdx]!.timestamp > winStart) sampleIdx--
    while (sampleIdx < samples.length && samples[sampleIdx]!.timestamp < winStart) sampleIdx++

    // Find sample indices in this window
    let winEndIdx = sampleIdx
    while (winEndIdx < samples.length && samples[winEndIdx]!.timestamp <= winEnd) winEndIdx++
    const n = winEndIdx - sampleIdx
    if (n < 4) {
      results.push({ timestamp: centerTs, freqHz: 0, rpm: 0, peakMag: 0, bandEnergy: 0 })
      continue
    }

    // Precompute Hann weights for this window size
    const hann = new Float64Array(n)
    for (let i = 0; i < n; i++) {
      hann[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (n - 1)))
    }

    let bestPeakMagSq = -1
    let bestPeakFreq = 0
    let bestBandEnergySq = 0
    let bestN = n

    // Try each channel, keep the one with the strongest total energy
    for (let ch = 0; ch < numChannels; ch++) {
      re.fill(0)
      im.fill(0)
      const hp = hpChannels[ch]!
      for (let i = 0; i < n && i < fftSize; i++) {
        re[i] = hp[sampleIdx + i]! * hann[i]!
      }

      fftInPlace(re, im)

      const nyquist = fftSize >> 1
      let peakMagSq = -1
      let peakFreq = 0
      let bandEnergySq = 0
      for (let k = 1; k <= nyquist; k++) {
        const freq = (k * fs) / fftSize
        if (freq < minFreqHz || freq > maxFreqHz) continue
        const magSq = re[k]! * re[k]! + im[k]! * im[k]!
        bandEnergySq += magSq
        if (magSq > peakMagSq) {
          peakMagSq = magSq
          peakFreq = freq
        }
      }

      if (bandEnergySq > bestBandEnergySq) {
        bestPeakMagSq = peakMagSq
        bestPeakFreq = peakFreq
        bestBandEnergySq = bandEnergySq
        bestN = n
      }
    }

    const actualMag = bestPeakMagSq > 0 ? Math.sqrt(bestPeakMagSq) / bestN : 0
    const bandEnergy = bestBandEnergySq > 0 ? Math.sqrt(bestBandEnergySq) / bestN : 0
    results.push({
      timestamp: centerTs,
      freqHz: bestPeakFreq,
      rpm: bestPeakFreq * 60,
      peakMag: actualMag,
      bandEnergy,
    })
  }

  return results
}
