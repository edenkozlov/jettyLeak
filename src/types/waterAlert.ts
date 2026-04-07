export type WaterAlertStatus = 'active' | 'upcoming' | 'expired' | 'unknown'

export interface WaterAlertGeometry {
  type: 'Point' | 'LineString' | 'MultiLineString' | 'Polygon' | 'MultiPolygon' | string
  coordinates: number[] | number[][] | number[][][] | number[][][][]
}

export interface WaterAlert {
  id: number
  source_slug: string
  source_url: string
  title: string
  category: string
  borough: string | null
  status: WaterAlertStatus
  published_at: string | null
  alert_start_at: string | null
  alert_end_at: string | null
  affected_area_text: string | null
  reason_text: string | null
  detail_text_raw: string | null
  geometry_json: WaterAlertGeometry | null
  geometry_type: string | null
  first_seen_at: string
  last_seen_at: string
  last_synced_at: string
  enrichment_status: string
  created_at: string
  updated_at: string
}

export interface WaterAlertFilters {
  status?: WaterAlertStatus | null
  borough?: string | null
  q?: string
  from?: string
  to?: string
}

export interface WaterAlertStats {
  active_count: number
  last_7_days_count: number
  boroughs_affected: number
  last_sync_at: string | null
}
