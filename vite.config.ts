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
      proxy: {
        ...(proxyTarget
          ? {
              '/v1/graphql': {
                target: proxyTarget.replace(/\/$/, ''),
                changeOrigin: true,
                secure: true,
                ws: true,
              },
            }
          : {}),
        '/api/montreal-feed': {
          target: 'https://donnees.montreal.ca',
          changeOrigin: true,
          rewrite: (p) =>
            p.replace(
              '/api/montreal-feed',
              '/dataset/556c84af-aebf-4ca9-9a9c-2f246601674c/resource/d249e452-46f5-422f-91ae-898c98eea6cc/download',
            ),
        },
      },
    },
  }
})
