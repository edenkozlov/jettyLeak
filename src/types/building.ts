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
  client?: Client
  sensors?: Sensor[]
  fixtures?: Fixture[]
}
