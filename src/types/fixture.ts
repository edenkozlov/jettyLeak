export type FixtureType = 'bathroom' | 'kitchen_sink' | 'toilet_sink' | 'dishwasher' | 'urinal' | 'water_hose'

export interface Fixture {
  id: number
  created_at: string
  building_id: number | null
  floor_number: number | null
  type: FixtureType | null
  location_on_floor: { x: number; y: number } | null
  sensor_id: number | null
}

export const FIXTURE_COLORS: Record<FixtureType, { fill: string; stroke: string; label: string }> = {
  bathroom: { fill: '#3b82f6', stroke: '#1d4ed8', label: 'Bathroom' },
  kitchen_sink: { fill: '#f59e0b', stroke: '#d97706', label: 'Kitchen Sink' },
  toilet_sink: { fill: '#8b5cf6', stroke: '#6d28d9', label: 'Toilet Sink' },
  dishwasher: { fill: '#ec4899', stroke: '#db2777', label: 'Dishwasher' },
  urinal: { fill: '#14b8a6', stroke: '#0d9488', label: 'Urinal' },
  water_hose: { fill: '#06b6d4', stroke: '#0891b2', label: 'Water Hose' },
}
