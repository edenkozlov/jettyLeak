export interface SignalClassification {
  type: string
  name: string
  distance: number
}

export interface SignalValue {
  source: string
  method?: string
  signal_type: string | number
  fixture_name?: string
  cosine_distance?: number
  mass_distance?: number
  confidence?: number
  status?: string
  classifications?: SignalClassification[]
  readings: number
  duration_s?: number
  /** Total litres consumed during this session. When the backend populates
   * this field (by integrating dominant_freq_hz / multiplier across the
   * session's mag_report rows at emission time), the client uses it directly
   * — no client-side attribution, no averaging. Recommended backend change. */
  volume_l?: number
  /** Average L/min during the session. Optional — can be derived from volume_l / duration_s. */
  avg_flow_lpm?: number
}

export interface Signal {
  id: number
  created_at: string
  value: string
  time: string
  sensor_id: number
  start_time: string
  end_time: string
}

/**
 * Parse `signal.value` JSON into a typed SignalValue.
 *
 * The field is stored as `text` in Postgres and occasionally contains values
 * that aren't strictly valid JSON — most commonly `Infinity` / `-Infinity` /
 * `NaN` on `cosine_distance` when the classifier emits those. We sanitize
 * them before parsing so we don't silently drop rows that are otherwise fine.
 */
export function parseSignalValue(raw: string): SignalValue | null {
  if (!raw) return null
  try {
    return JSON.parse(raw) as SignalValue
  } catch {
    // Fallback: strip non-JSON numeric literals that Postgres' json cast also
    // chokes on, then retry. `-?Infinity` and `NaN` become `null` in-place.
    try {
      const sanitized = raw.replace(/-?Infinity|NaN/g, 'null')
      return JSON.parse(sanitized) as SignalValue
    } catch {
      return null
    }
  }
}
