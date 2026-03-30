export const IS_PRODUCTION = import.meta.env.PROD
export const IS_STAGING = !IS_PRODUCTION

export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? ''
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY ?? ''
export const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN ?? ''
export const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN ?? ''
