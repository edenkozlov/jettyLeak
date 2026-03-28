/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  readonly VITE_GRAPHQL_ENDPOINT: string
  readonly VITE_HASURA_ADMIN_SECRET: string
  readonly VITE_SENTRY_DSN: string
  readonly VITE_MAPBOX_TOKEN: string
  readonly VITE_BLE_WIFI_SERVICE_UUID: string
  readonly VITE_BLE_WIFI_SSID_CHAR_UUID: string
  readonly VITE_BLE_WIFI_PASS_CHAR_UUID: string
  readonly VITE_BLE_WIFI_STATUS_CHAR_UUID: string
  readonly VITE_BLE_WIFI_COMMAND_CHAR_UUID: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
