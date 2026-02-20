export interface SignalValue {
  signal_type: number
  confidence: number
  readings: number
  status: string
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
    const parsed = JSON.parse(raw)
    if (typeof parsed.signal_type === 'number') return parsed as SignalValue
    return null
  } catch {
    return null
  }
}
