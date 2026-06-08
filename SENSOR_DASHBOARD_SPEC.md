# Sensor Data & Charts — Implementation Brief

> Hand this file to the AI/agent in the other project. It describes **how the
> water-flow sensor data should look and feel**, so the mocked dashboard matches
> our production app (Beluga/flomo). Build to this spec.

---

## 1. What we're building

A read-only dashboard that shows a single water sensor's **raw magnetometer
waveform** and the **flow rate (L/h) + accumulated volume (L)** derived from it.

The data is **mocked** (no real device), but it must look physically believable:
quiet baseline noise punctuated by a few "flow sessions" (someone running a
faucet/toilet), with flow numbers computed from the waveform — never random.

The vibe: a clean, technical, real-time **engineering telemetry** view. Think
oscilloscope traces + a flow readout. Dense line charts, thin strokes, dark mode
first, tabular numbers, muted grid. Not a flashy marketing page.

---

## 2. Tech stack

- **React 19 + TypeScript** (strict)
- **recharts** for all charts (`npm i recharts`)
- **Tailwind** for layout/cards (charts work without it; cards need it)
- No backend required — data is generated client-side

---

## 3. Data shapes (use these exactly)

```ts
// One raw row from the device (matches our DB `mag_report` table)
interface MagReport {
  id: number
  created_at: string            // ISO timestamp
  x_axis_reading: number | null // magnetometer axes (microtesla-ish, biased)
  y_axis_reading: number | null
  z_axis_reading: number | null
  total_magnitude: number | null // sqrt(x^2+y^2+z^2)
  sensor_id: number | null
  band_energy_10s: number | null // vibration intensity, fast window
  band_energy_60s: number | null // vibration intensity, slow window
  band_energy_5m: number | null  // vibration intensity, slowest window
  dominant_freq_hz: number | null // oscillation freq while flowing
  vibration_rpm: number | null    // dominant_freq_hz * 60
}

// Computed flow point (for the flow chart)
interface FlowPoint {
  timestamp: number    // epoch ms
  flowRateLph: number  // litres per hour
  accumulatedL: number // cumulative litres since dataset start
}
```

---

## 4. How the mock data must behave

A magnetometer sits on a water pipe. A spinning meter element disturbs the
magnetic field. Each full cycle = a fixed volume of water.

**Generate data like this:**

- Sample every **~100ms** over a **5-minute** window (dense enough that peaks
  are visible; ~3000 rows).
- Each axis has a **DC bias** (mounting offset), e.g. x≈-18, y≈32, z≈-57, plus
  light Gaussian noise (~±1.2). `total_magnitude = sqrt(x²+y²+z²)`.
- Insert **2–4 flow sessions** at random spots in the window. Each session:
  - lasts ~15–40s
  - oscillates `total_magnitude` (and mostly the X axis) at a fixed
    **frequency 1.5–5 Hz** with a softer 2× harmonic (organic, not a pure sine)
  - **band energy ramps up**: `band_energy_10s` reacts fast, `60s` slower, `5m`
    slowest (exponential smoothing toward the session's energy)
  - `dominant_freq_hz` ≈ the session frequency; `vibration_rpm = freq * 60`
- **Outside sessions:** oscillation = 0, band energies decay toward 0,
  `dominant_freq_hz = 0`, `vibration_rpm = 0`.
- Use a **seeded PRNG** so a given seed always produces the same data (good for
  repeatable demos / screenshots). A "Regenerate" button bumps the seed.

---

## 5. Flow math (raw waveform → L/h → litres)

This is the important part — flow must be **derived from the waveform**, using
the same logic as production:

1. **Calibration:** sensor `multiplier` = **cycles per litre** (use `11.5`).
   `litresPerCycle = 1 / multiplier`.
2. **Peak detection** on the `total_magnitude` series:
   - Slide a window (≈ max(10× avg sample spacing, 10s), hop = half window).
   - **Variance gate:** skip windows whose variance < **20** (no flow, just noise).
   - Within a live window, take **local maxima above the window mean**, but only
     if `band_energy_10s >= 5` at that point (else it's noise → ignore).
   - **Dedup** peaks within **500ms** of each other.
3. **Flow rate** between consecutive peaks:
   ```
   flowRateLph = litresPerCycle / (intervalMs / 3_600_000)
   ```
   (e.g. peaks 500ms apart, litresPerCycle 0.087 → ~626 L/h)
4. **Accumulated volume** = running count of cycles × litresPerCycle.
5. Round flow to 2 dp, accumulated to 4 dp.

Result: during sessions you get a burst of L/h points climbing the accumulated
curve; quiet periods are flat. Numbers stay physically consistent.

---

## 6. Charts (5 of them, in this order)

All are recharts `<LineChart>` with `<ResponsiveContainer>`, thin strokes
(`strokeWidth={1.5}`), `dot={false}`, numeric time X axis formatted as
`HH:MM:SS` (24h), `CartesianGrid strokeDasharray="3 3"`.

| # | Title | Lines (dataKey → color) | Height |
|---|-------|--------------------------|--------|
| 1 | **Magnetometer X / Y / Z** | x→`#ef4444`, y→`#22c55e`, z→`#3b82f6` | 200 |
| 2 | **Total Magnitude** | total→`#8b5cf6` | 160 |
| 3 | **Band Energy** | bandEnergy10s→`#f97316`, bandEnergy60s→`#06b6d4` | 160 |
| 4 | **Dominant Frequency (Hz)** | dominantFreqHz→`#ec4899` | 160 |
| 5 | **Flow Rate (L/h) & Accumulated (L)** | flowRateLph→`#3b82f6` (left axis, label "L/h"), accumulatedL→`#10b981` (right axis, label "L") | 180 |

Chart 5 is **dual Y axis**: left = L/h (blue), right = cumulative L (green).

X axis: `type="number"`, `domain={['dataMin','dataMax']}`, tick font size 10.

---

## 7. Theme & styling

Dark mode first, light mode supported. Chart palette:

```ts
const CHART_COLORS = {
  light: { grid: '#e5e7eb', axis: '#6b7280', tooltipBg: '#fff',     tooltipBorder: '#e5e7eb', tooltipText: '#111827' },
  dark:  { grid: '#374151', axis: '#9ca3af', tooltipBg: '#1f2937', tooltipBorder: '#374151', tooltipText: '#f3f4f6' },
}
```

- Cards: `rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800`
- Chart titles: `text-xs font-semibold text-gray-600 dark:text-gray-300`
- Numbers: `tabular-nums`, bold for values
- Tooltip: rounded 8px, 1px border, 12px font, themed bg/text

---

## 8. Page layout

```
┌─ Header: "Sensor #1 — Raw Data" + subtitle ───── [Regenerate] [Light/Dark] ─┐
├─ Stat cards (3): Total Volume (L) · Peak Flow (L/h) · Avg Flow (L/h) ────────┤
├─ Card containing the 5 stacked charts (section 6), ~16px gaps ──────────────┤
└─────────────────────────────────────────────────────────────────────────────┘
```

- **Total Volume** = last `accumulatedL`
- **Peak Flow** = max `flowRateLph`
- **Avg Flow** = mean `flowRateLph`
- **Regenerate** = new seed → fresh believable data
- Max content width ~`max-w-4xl`, centered, page padding `p-4 sm:p-6`

---

## 9. Feel checklist (what "good" looks like)

- [ ] Charts read like real telemetry: dense, thin lines, quiet stretches + bursts
- [ ] Flow chart spikes **align in time** with the oscillation bursts in charts 1–2
- [ ] Band energy visibly rises/falls around each session (not flat)
- [ ] Dominant frequency is 0 except during sessions
- [ ] L/h and accumulated L are plausible (hundreds of L/h peaks, volume creeps up)
- [ ] Dark mode looks like an engineering console; light mode is clean/white
- [ ] Regenerate gives a different-but-still-realistic dataset every time
- [ ] No layout shift; numbers use tabular figures

---

## 10. Reference implementation

A complete working `MockSensorDashboard.tsx` already exists that implements all
of the above (generator + flow math + the 5 charts). Use it as the source of
truth; this doc explains the intent and the knobs.
