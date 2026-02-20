import type { Sensor } from './sensor'

export interface Report {
  id: number
  created_at: string
  sensor_id: number | null
  flow_value: number | null
  temp_value: number | null
  sensor?: Sensor
}
