export interface Client {
  id: string
  created_at: string
  email: string | null
  first_name: string | null
  last_name: string | null
  buildings_aggregate?: {
    aggregate: { count: number }
  }
  buildings?: {
    id: number
    bhi: number | null
    bhi_label: string | null
    sensors_aggregate?: {
      aggregate: { count: number }
    }
  }[]
}
