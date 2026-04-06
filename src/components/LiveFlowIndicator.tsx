import { useEffect, useState } from 'react'

import { useLiveFlow, type FlowStatus } from '@/hooks/useLiveFlow'

interface Props {
  buildingId: number | null | undefined
  fallbackMagSensorId?: number | null
  compact?: boolean
}

function StatusDot({ status }: { status: FlowStatus }) {
  if (status === 'loading') {
    return (
      <span className="inline-block h-2.5 w-2.5 animate-pulse rounded-full bg-gray-400" />
    )
  }
  if (status === 'flowing') {
    return (
      <span className="relative inline-block h-2.5 w-2.5">
        <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400 opacity-75" />
        <span className="relative block h-2.5 w-2.5 rounded-full bg-emerald-500" />
      </span>
    )
  }
  if (status === 'idle') {
    return (
      <span className="inline-block h-2.5 w-2.5 rounded-full bg-gray-300 dark:bg-gray-600" />
    )
  }
  if (status === 'stale') {
    return (
      <span className="inline-block h-2.5 w-2.5 animate-pulse rounded-full bg-amber-400" />
    )
  }
  if (status === 'error') {
    return (
      <span className="inline-block h-2.5 w-2.5 rounded-full bg-red-400" />
    )
  }
  if (status === 'needs-cal') {
    return (
      <span className="inline-block h-2.5 w-2.5 rounded-full bg-amber-400" />
    )
  }
  return (
    <span className="inline-block h-2.5 w-2.5 rounded-full bg-gray-300 dark:bg-gray-600" />
  )
}

function useRelativeTime(epochMs: number | null): string {
  const [, setTick] = useState(0)
  useEffect(() => {
    if (epochMs == null) return
    const id = setInterval(() => setTick((n) => n + 1), 5_000)
    return () => clearInterval(id)
  }, [epochMs])

  if (epochMs == null) return ''
  const ago = Math.max(0, Math.round((Date.now() - epochMs) / 1000))
  if (ago < 5) return 'just now'
  if (ago < 60) return `${ago}s ago`
  return `${Math.floor(ago / 60)}m ago`
}

function statusLabel(status: FlowStatus, flowRate: number | null): string {
  switch (status) {
    case 'loading':
      return 'Loading...'
    case 'flowing':
      return `${flowRate ?? 0} L/h`
    case 'idle':
      return '0 L/h'
    case 'stale':
      return flowRate != null ? `${flowRate} L/h` : 'Reconnecting...'
    case 'no-sensor':
      return 'No sensor'
    case 'needs-cal':
      return 'Needs calibration'
    case 'error':
      return 'Error'
  }
}

export default function LiveFlowIndicator({
  buildingId,
  fallbackMagSensorId,
  compact,
}: Props) {
  const { flowRate, status, lastUpdated } = useLiveFlow(buildingId, {
    fallbackMagSensorId,
  })
  const relTime = useRelativeTime(lastUpdated)

  if (compact) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs">
        <StatusDot status={status} />
        <span
          className={
            status === 'flowing'
              ? 'font-medium text-emerald-600 dark:text-emerald-400'
              : status === 'error'
                ? 'text-red-500'
                : status === 'stale'
                  ? 'text-amber-500'
                  : status === 'needs-cal'
                    ? 'text-amber-500'
                    : 'text-gray-500 dark:text-gray-400'
          }
        >
          {statusLabel(status, flowRate)}
        </span>
      </span>
    )
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-800 sm:p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
          Live Flow
        </p>
        {relTime && (
          <span
            className={`shrink-0 text-[10px] tabular-nums ${
              status === 'stale'
                ? 'text-amber-500'
                : 'text-gray-400 dark:text-gray-500'
            }`}
          >
            {relTime}
          </span>
        )}
      </div>
      <div className="flex items-center gap-2.5 sm:gap-3">
        <StatusDot status={status} />
        <span
          className={`text-xl font-bold tabular-nums sm:text-2xl ${
            status === 'flowing'
              ? 'text-emerald-600 dark:text-emerald-400'
              : status === 'error'
                ? 'text-red-500'
                : status === 'stale'
                  ? 'text-amber-500'
                  : status === 'needs-cal'
                    ? 'text-amber-500'
                    : 'text-gray-900 dark:text-white'
          }`}
        >
          {status === 'loading' || status === 'no-sensor' || status === 'needs-cal'
            ? '—'
            : status === 'error'
              ? '—'
              : `${flowRate ?? 0} L/h`}
        </span>
      </div>
      {status === 'stale' && (
        <p className="mt-1 text-xs text-amber-500">
          Data may be stale — retrying...
        </p>
      )}
      {(status === 'no-sensor' ||
        status === 'needs-cal' ||
        status === 'error') && (
        <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
          {status === 'no-sensor'
            ? 'No magnetometer sensor linked'
            : status === 'needs-cal'
              ? 'Sensor multiplier not configured'
              : 'Failed to fetch flow data — retrying...'}
        </p>
      )}
    </div>
  )
}
