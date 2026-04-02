import { useEffect, useRef, useState } from 'react'

import { GET_VOLUME_BUCKETS, type VolumeBucket } from '@/queries/getVolumeBuckets'

const EMPTY_BUCKETS: VolumeBucket[] = [
  { label: '15 min', volumeL: 0, cycles: 0 },
  { label: '1 hr', volumeL: 0, cycles: 0 },
  { label: '12 hr', volumeL: 0, cycles: 0 },
  { label: '24 hr', volumeL: 0, cycles: 0 },
  { label: 'Today', volumeL: 0, cycles: 0 },
]

export { type VolumeBucket }

export function useVolumeSummary(
  magSensorIds: number[],
  sensorMultiplier: number | null,
) {
  const [buckets, setBuckets] = useState<VolumeBucket[]>(EMPTY_BUCKETS)
  const mountedRef = useRef(true)
  const magSensorIdsKey = magSensorIds.join(',')

  useEffect(() => {
    mountedRef.current = true
    if (magSensorIds.length === 0) {
      setBuckets(EMPTY_BUCKETS)
      return
    }

    const fetchBuckets = () => {
      GET_VOLUME_BUCKETS(magSensorIds)
        .then((result) => {
          if (!mountedRef.current) return
          setBuckets(result)
        })
        .catch(() => {
          if (mountedRef.current) setBuckets(EMPTY_BUCKETS)
        })
    }

    fetchBuckets()
    const interval = setInterval(fetchBuckets, 30_000) // refresh every 30s

    return () => {
      mountedRef.current = false
      clearInterval(interval)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [magSensorIdsKey])

  return { buckets, hasSensor: magSensorIds.length > 0, hasMultiplier: (sensorMultiplier ?? 0) > 0 }
}
