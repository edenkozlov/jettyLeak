export interface MagReport {
  id: number
  created_at: string
  x_axis_reading: number | null
  y_axis_reading: number | null
  z_axis_reading: number | null
  total_magnitude: number | null
  sensor_id: number | null
  band_energy_10s: number | null
  band_energy_60s: number | null
  band_energy_5m: number | null
  dominant_freq_hz: number | null
  vibration_rpm: number | null
}
