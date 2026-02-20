import { createClient } from 'graphql-ws'

import {
  GRAPHQL_WS_ENDPOINT,
  HASURA_ADMIN_SECRET,
} from '@/globals/constants'

export const subscriptionClient = createClient({
  url: GRAPHQL_WS_ENDPOINT,
  connectionParams: () => ({
    headers: {
      ...(HASURA_ADMIN_SECRET && {
        'x-hasura-admin-secret': HASURA_ADMIN_SECRET,
      }),
    },
  }),
  shouldRetry: () => true,
  retryAttempts: Infinity,
  retryWait: (retries) =>
    new Promise((resolve) =>
      setTimeout(resolve, Math.min(1000 * 2 ** retries, 30_000)),
    ),
})
