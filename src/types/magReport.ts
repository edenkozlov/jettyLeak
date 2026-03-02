export interface MagReport {
  id: number
  created_at: string
  x_axis_reading: number | null
  y_axis_reading: number | null
  z_axis_reading: number | null
  total_magnitude: number | null
  sensor_id: number | null
}
