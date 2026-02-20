import type { Building } from './building'
import type { Report } from './report'

export interface Sensor {
  id: number
  created_at: string
  building_id: number | null
  name: string | null
  location: string | null
  building?: Building
  reports?: Report[]
}
