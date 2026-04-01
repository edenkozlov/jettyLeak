import { supabase } from '@/lib/supabase'

export interface VolumeBucket {
  label: string
  volumeL: number
  cycles: number
}

interface VolumeBucketsResponse {
  buckets: VolumeBucket[]
}

/**
 * Single RPC returning pre-computed volume for 15min/1hr/12hr/24hr/today
 * from flow_hourly. Replaces fetching 24hrs of raw mag_report (~864K rows).
 */
export async function GET_VOLUME_BUCKETS(sensorIds: number[]): Promise<VolumeBucket[]> {
  if (sensorIds.length === 0) {
    return [
      { label: '15 min', volumeL: 0, cycles: 0 },
      { label: '1 hr', volumeL: 0, cycles: 0 },
      { label: '12 hr', volumeL: 0, cycles: 0 },
      { label: '24 hr', volumeL: 0, cycles: 0 },
      { label: 'Today', volumeL: 0, cycles: 0 },
    ]
  }

  const { data, error } = await supabase.rpc('get_volume_buckets', {
    p_sensor_ids: sensorIds,
  })
  if (error) throw error

  const response = data as VolumeBucketsResponse
  return response.buckets
}
