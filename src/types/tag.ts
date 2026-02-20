import type { Sensor } from './sensor'

export interface Tag {
  id: number
  created_at: string
  sensor_id: number | null
  tagged_at: string
  title: string
  description: string | null
  sensor?: Sensor
}
