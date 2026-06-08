/**
 * Beluga × Jetty — realistic fake magnetometer + flow simulator.
 * Generates physically plausible waveforms for flush / slow-leak demos.
 */

import type { MagReport } from '@/types/magReport'

export type SimulatorMode = 'idle' | 'flush_pending' | 'flush' | 'leak_pending' | 'leak'

export interface XYZReading {
  x: number
  y: number
  z: number
  timestamp: number
}

export interface SimulatorState {
  mode: SimulatorMode
  leakIntensity: number
  flushElapsedMs: number
  flushDurationMs: number
  flushPeakHz: number
  flushPhase: number
  flushAsymmetry: number
  flushCount: number
  flushTargetLiters: number
  pendingUntilMs: number
  leakStartMs: number
  leakLpm: number
  tickCount: number
}

/** Canonical toilet flush — ~6.5s, ~6L, recognizably similar each time. */
const FLUSH_DURATION_MS = 6_500
const FLUSH_DELAY_MS = 1_400 // pipe fill before sensor registers
const LEAK_DELAY_MS = 2_800 // drip takes a moment to show
const FLUSH_PEAK_HZ = 3.35
const FLUSH_ASYMMETRY = 0.68
const FLUSH_WAVE_AMP = 15.5
const FLUSH_LITERS_MIN = 5.5
const FLUSH_LITERS_MAX = 6.5

const X_BIAS = -18.2
const Y_BIAS = 31.7
const Z_BIAS = -56.8

function noise(magnitude: number, rand: () => number): number {
  // Slightly skewed — avoids mirror-symmetric noise
  const u = rand()
  const skew = u < 0.45 ? -1.1 : u > 0.82 ? 1.25 : 1
  return (rand() - 0.5) * 2 * magnitude * skew
}

function gauss(rand: () => number): number {
  return (rand() + rand() + rand() + rand() - 2) / 2
}

export function createSimulatorState(seed = 42): SimulatorState {
  return {
    mode: 'idle',
    leakIntensity: 0,
    flushElapsedMs: 0,
    flushDurationMs: 0,
    flushPeakHz: FLUSH_PEAK_HZ,
    flushPhase: 0,
    flushAsymmetry: FLUSH_ASYMMETRY,
    flushCount: 0,
    flushTargetLiters: 6,
    pendingUntilMs: 0,
    leakStartMs: 0,
    leakLpm: 0,
    tickCount: seed,
  }
}

export function triggerFlush(state: SimulatorState, now: number, rand: () => number): void {
  state.mode = 'flush_pending'
  state.pendingUntilMs = now + FLUSH_DELAY_MS
  state.flushElapsedMs = 0
  state.flushDurationMs = FLUSH_DURATION_MS + (rand() - 0.5) * 400
  state.flushTargetLiters = FLUSH_LITERS_MIN + rand() * (FLUSH_LITERS_MAX - FLUSH_LITERS_MIN)
  state.flushPeakHz = FLUSH_PEAK_HZ + (rand() - 0.5) * 0.08
  state.flushAsymmetry = FLUSH_ASYMMETRY + (rand() - 0.5) * 0.03
  state.flushPhase = state.flushCount * 0.35
  state.flushCount++
}

export function triggerLeak(state: SimulatorState, now: number, rand: () => number): void {
  state.mode = 'leak_pending'
  state.pendingUntilMs = now + LEAK_DELAY_MS
  state.leakIntensity = 0
  state.leakLpm = 0.06 + rand() * 0.04
  state.leakStartMs = 0
}

export function stopLeak(state: SimulatorState): void {
  state.mode = 'idle'
  state.leakIntensity = 0
  state.leakLpm = 0
  state.leakStartMs = 0
  state.pendingUntilMs = 0
}

function activatePending(state: SimulatorState, now: number): void {
  if (state.mode === 'flush_pending' && now >= state.pendingUntilMs) {
    state.mode = 'flush'
    state.flushElapsedMs = 0
  } else if (state.mode === 'leak_pending' && now >= state.pendingUntilMs) {
    state.mode = 'leak'
    state.leakStartMs = now
  }
}

/** Asymmetric flush envelope — quick rise, slower tail with small rebound dip. */
function flushEnvelope(progress: number, asymmetry: number): number {
  if (progress >= 1) return 0
  const peakAt = asymmetry
  if (progress < peakAt) {
    const t = progress / peakAt
    return Math.pow(t, 0.65 + asymmetry * 0.2)
  }
  const t = (progress - peakAt) / (1 - peakAt)
  const decay = Math.pow(1 - t, 1.35)
  const dip = t > 0.35 && t < 0.55 ? 0.08 * Math.sin((t - 0.35) * Math.PI / 0.2) : 0
  return Math.max(0, decay - dip)
}

export function getReading(
  state: SimulatorState,
  now: number,
  rand: () => number,
  deltaMs: number,
): XYZReading {
  state.tickCount++
  activatePending(state, now)

  let pulseStrength = 0
  let freqHz = 0

  if (state.mode === 'flush') {
    state.flushElapsedMs += deltaMs
    const progress = state.flushElapsedMs / state.flushDurationMs
    if (progress < 1) {
      const env = flushEnvelope(progress, state.flushAsymmetry)
      const tSec = state.flushElapsedMs / 1000
      const carrier = Math.sin(2 * Math.PI * state.flushPeakHz * tSec + state.flushPhase)
      const harmonic = 0.3 * Math.sin(2 * Math.PI * state.flushPeakHz * 2.02 * tSec + state.flushPhase * 0.6)
      const ripple = 0.07 * Math.sin(2 * Math.PI * 0.38 * tSec + 0.9)
      pulseStrength = env * (0.92 + ripple) * (0.86 + 0.14 * Math.abs(carrier + harmonic))
      freqHz = state.flushPeakHz + gauss(rand) * 0.03
    } else {
      state.mode = 'idle'
      state.flushElapsedMs = 0
    }
  } else if (state.mode === 'leak') {
    const elapsedSec = (now - state.leakStartMs) / 1000
    // Creep over ~90s; never hits a clean plateau
    const growth = 1 - Math.exp(-elapsedSec / 38)
    state.leakIntensity = Math.min(0.55, 0.05 + growth * 0.48 + gauss(rand) * 0.015)
    const drift = 0.75 + elapsedSec * 0.004
    freqHz = drift + gauss(rand) * 0.06
    const phase = now / 900 + state.leakStartMs * 0.001
    pulseStrength = state.leakIntensity * (0.78 + 0.22 * Math.abs(Math.sin(phase * freqHz)))
  }

  let osc = 0
  if (pulseStrength > 0) {
    const tSec = now / 1000
    const wave =
      Math.sin(2 * Math.PI * freqHz * tSec + state.flushPhase) +
      0.3 * Math.sin(2 * Math.PI * freqHz * 2.02 * tSec + state.flushPhase * 0.6) +
      0.08 * Math.sin(2 * Math.PI * freqHz * 3.1 * tSec + 0.4)
    const ampScale = state.mode === 'flush' ? FLUSH_WAVE_AMP : 12 + rand() * 3
    const jitter = state.mode === 'flush' ? gauss(rand) * 0.35 : gauss(rand) * 1.2
    osc = pulseStrength * ampScale * wave + jitter
  }

  const x = X_BIAS + osc + noise(state.mode === 'flush' ? 0.85 : 1.15, rand)
  const y = Y_BIAS + osc * (state.mode === 'flush' ? 0.41 : 0.38 + rand() * 0.08) + noise(1.05, rand)
  const z = Z_BIAS + osc * (state.mode === 'flush' ? -0.12 : -0.14 + rand() * 0.04) + noise(0.95, rand)

  return { x, y, z, timestamp: now }
}

/** Litres delivered this sample — drives bar chart volume/rate. */
export function getLitersDelta(
  state: SimulatorState,
  now: number,
  deltaMs: number,
): { liters: number; lpm: number } {
  activatePending(state, now)

  if (state.mode === 'flush' && state.flushDurationMs > 0) {
    const progress = state.flushElapsedMs / state.flushDurationMs
    if (progress < 1) {
      const env = flushEnvelope(progress, state.flushAsymmetry)
      const meanLpm = state.flushTargetLiters / (state.flushDurationMs / 60_000)
      // Volume totals exactly flushTargetLiters; rate follows envelope shape.
      const liters = state.flushTargetLiters * (deltaMs / state.flushDurationMs)
      const lpm = meanLpm * env
      return { liters, lpm }
    }
  }

  if (state.mode === 'leak' && state.leakStartMs > 0) {
    const elapsedSec = (now - state.leakStartMs) / 1000
    const growth = 1 - Math.exp(-elapsedSec / 45)
    const lpm = Math.min(0.28, state.leakLpm + growth * 0.16)
    return { liters: lpm * (deltaMs / 60_000), lpm }
  }

  return { liters: 0, lpm: 0 }
}

/** Convert XYZ reading into a mag_report-shaped row. */
export function readingToMagReport(
  reading: XYZReading,
  id: number,
  sensorId: number,
  bandState: { be10: number; be60: number; be5m: number },
  pulseStrength: number,
  freqHz: number,
  rand: () => number,
): MagReport {
  const { x, y, z, timestamp } = reading
  const total = Math.sqrt(x * x + y * y + z * z)
  const instantEnergy = pulseStrength > 0.02 ? pulseStrength * (28 + rand() * 14) : gauss(rand) * 0.4

  bandState.be10 += (instantEnergy - bandState.be10) * 0.14
  bandState.be60 += (instantEnergy - bandState.be60) * 0.028
  bandState.be5m += (instantEnergy - bandState.be5m) * 0.005

  const active = pulseStrength > 0.025

  return {
    id,
    created_at: new Date(timestamp).toISOString(),
    x_axis_reading: round(x, 3),
    y_axis_reading: round(y, 3),
    z_axis_reading: round(z, 3),
    total_magnitude: round(total, 3),
    sensor_id: sensorId,
    band_energy_10s: round(Math.max(0, bandState.be10), 3),
    band_energy_60s: round(Math.max(0, bandState.be60), 3),
    band_energy_5m: round(Math.max(0, bandState.be5m), 3),
    dominant_freq_hz: active ? round(Math.max(0, freqHz + gauss(rand) * 0.08), 3) : 0,
    vibration_rpm: active ? round(Math.max(0, freqHz) * 60, 1) : 0,
  }
}

function round(v: number, dp: number): number {
  const f = 10 ** dp
  return Math.round(v * f) / f
}

/** Mulberry32 PRNG */
export function rng(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Pre-fill rolling buffer with quiet baseline (slightly uneven, not symmetric). */
export function seedIdleHistory(
  count: number,
  intervalMs: number,
  sensorId: number,
  seed: number,
  samplesPerTick = 3,
): MagReport[] {
  const rand = rng(seed)
  const state = createSimulatorState(seed)
  const bandState = { be10: 0.3, be60: 0.2, be5m: 0.15 }
  const now = Date.now()
  const subDelta = intervalMs / samplesPerTick
  const start = now - count * intervalMs
  const rows: MagReport[] = []
  let id = 1

  for (let i = 0; i < count; i++) {
    const tickStart = start + i * intervalMs
    for (let s = 0; s < samplesPerTick; s++) {
      const ts = tickStart + s * subDelta
      const reading = getReading(state, ts, rand, subDelta)
      rows.push(readingToMagReport(reading, id++, sensorId, bandState, 0, 0, rand))
    }
  }
  return rows
}

export function getPulseStrength(state: SimulatorState, now: number, _deltaMs: number): number {
  activatePending(state, now)
  if (state.mode === 'flush') {
    const progress = state.flushElapsedMs / Math.max(state.flushDurationMs, 1)
    if (progress < 1) return flushEnvelope(progress, state.flushAsymmetry)
  }
  if (state.mode === 'leak' && state.leakStartMs > 0) {
    const elapsedSec = (now - state.leakStartMs) / 1000
    const growth = 1 - Math.exp(-elapsedSec / 45)
    return Math.min(0.55, 0.04 + growth * 0.42)
  }
  return 0
}

export function getFreqHz(state: SimulatorState, now = Date.now()): number {
  activatePending(state, now)
  if (state.mode === 'flush') return state.flushPeakHz
  if (state.mode === 'leak' && state.leakStartMs > 0) {
    const elapsedSec = (now - state.leakStartMs) / 1000
    return 0.75 + elapsedSec * 0.004
  }
  return 0
}

export function isPending(state: SimulatorState): boolean {
  return state.mode === 'flush_pending' || state.mode === 'leak_pending'
}
