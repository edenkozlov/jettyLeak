import path from 'path'

import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

/**
 * Local dev: if the browser hits CORS when calling Hasura directly, point
 * VITE_GRAPHQL_ENDPOINT at this dev server and set VITE_GRAPHQL_DEV_PROXY_TARGET
 * to your Hasura origin (see .env.example).
 */
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const proxyTarget = env.VITE_GRAPHQL_DEV_PROXY_TARGET?.trim()

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      proxy: proxyTarget
        ? {
            '/v1/graphql': {
              target: proxyTarget.replace(/\/$/, ''),
              changeOrigin: true,
              secure: true,
              ws: true,
            },
          }
        : undefined,
    },
  }
})
