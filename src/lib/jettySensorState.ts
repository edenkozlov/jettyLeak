const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined
const SENSOR_ID = Number(import.meta.env.VITE_JETTY_SENSOR_ID) || 1

/** Public URL Jetty Routine fetches (SENSOR_ENDPOINT in collection secrets). */
export function sensorStateUrl(sensorId = SENSOR_ID): string | null {
  if (!SUPABASE_URL) return null
  const base = SUPABASE_URL.replace(/\/$/, '')
  return `${base}/functions/v1/sensor-state?sensor_id=${sensorId}`
}

export const JETTY_COLLECTION = import.meta.env.VITE_JETTY_COLLECTION ?? 'beluga-demo'
export const JETTY_TASK = import.meta.env.VITE_JETTY_TASK ?? 'hourly-water-report'
export const JETTY_ROUTINE = import.meta.env.VITE_JETTY_ROUTINE ?? 'hourly-check'
