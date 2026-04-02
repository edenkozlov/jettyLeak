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

export function parseSignalValue(raw: string): SignalValue | null {
  try {
    return JSON.parse(raw) as SignalValue
  } catch {
    return null
  }
}
