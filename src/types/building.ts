import type { Client } from './client'
import type { Fixture } from './fixture'
import type { Sensor } from './sensor'

export interface Building {
  id: number
  created_at: string
  name: string | null
  full_address: string | null
  latitude: number | null
  longitude: number | null
  client_id: string | null
  footprint: Array<{ lat: number; lon: number }> | null
  number_of_floors: number | null
  bhi: number | null
  bhi_label: string | null
  bhi_updated_at: string | null
  sensors_aggregate?: {
    aggregate: { count: number }
  }
  client?: Client
  sensors?: Sensor[]
  fixtures?: Fixture[]
}
