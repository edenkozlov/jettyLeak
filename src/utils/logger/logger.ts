import * as Sentry from '@sentry/react'

type LogSource = 'GRAPHQL' | 'AUTH' | 'NAVIGATION' | 'APP'

class Logger {
  info(source: LogSource, message: string, data?: unknown) {
    if (import.meta.env.DEV) {
      console.log(`[${source}] ${message}`, data ?? '')
    }
  }

  warn(source: LogSource, message: string, data?: unknown) {
    if (import.meta.env.DEV) {
      console.warn(`[${source}] ${message}`, data ?? '')
    }
    Sentry.addBreadcrumb({
      category: source,
      message,
      level: 'warning',
    })
  }

  error(source: LogSource, message: string, error?: unknown) {
    if (import.meta.env.DEV) {
      console.error(`[${source}] ${message}`, error ?? '')
    }
    Sentry.captureException(
      error instanceof Error ? error : new Error(message),
      { tags: { source } },
    )
  }
}

export const logger = new Logger()
