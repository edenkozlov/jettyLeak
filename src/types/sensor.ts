import type { Building } from './building'
import type { Report } from './report'

export type SensorMappings = Record<string, string>

export interface Sensor {
  id: number
  created_at: string
  building_id: number | null
  name: string | null
  location: string | null
  mappings: SensorMappings | null
  building?: Building
  reports?: Report[]
}
