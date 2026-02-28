export const IS_PRODUCTION = import.meta.env.PROD
export const IS_STAGING = !IS_PRODUCTION

export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? ''
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY ?? ''
export const GRAPHQL_ENDPOINT = import.meta.env.VITE_GRAPHQL_ENDPOINT ?? ''
export const GRAPHQL_WS_ENDPOINT = GRAPHQL_ENDPOINT.replace(
  /^http/,
  'ws',
)
export const HASURA_ADMIN_SECRET =
  import.meta.env.VITE_HASURA_ADMIN_SECRET ?? ''
export const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN ?? ''
export const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN ?? ''
