import * as Sentry from '@sentry/react'

import { IS_PRODUCTION, SENTRY_DSN } from '@/globals/constants'

export function initSentry() {
  if (!SENTRY_DSN) return

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: IS_PRODUCTION ? 'production' : 'staging',
    tracesSampleRate: IS_PRODUCTION ? 0.2 : 1.0,
  })
}
