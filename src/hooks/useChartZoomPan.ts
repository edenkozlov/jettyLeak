import { useCallback, useEffect, useRef, useState } from 'react'

export function useChartZoomPan(
  dataMin: number,
  dataMax: number,
  homeMin: number,
  homeMax: number,
  onClickTimestamp?: (timestamp: number) => void,
) {
  const [zoomDomain, setZoomDomain] = useState<{
    left: number
    right: number
  } | null>(null)
  const [refAreaLeft, setRefAreaLeft] = useState<number | null>(null)
  const [refAreaRight, setRefAreaRight] = useState<number | null>(null)
  const chartWrapperRef = useRef<HTMLDivElement>(null)

  const zoomRef = useRef(zoomDomain)
  zoomRef.current = zoomDomain
  const minRef = useRef(dataMin)
  minRef.current = dataMin
  const maxRef = useRef(dataMax)
  maxRef.current = dataMax
  const homeMinRef = useRef(homeMin)
  homeMinRef.current = homeMin
  const homeMaxRef = useRef(homeMax)
  homeMaxRef.current = homeMax
  const onClickRef = useRef(onClickTimestamp)
  onClickRef.current = onClickTimestamp

  const currentLeft = zoomDomain?.left ?? homeMin
  const currentRight = zoomDomain?.right ?? homeMax
  const domain: [number, number] = [currentLeft, currentRight]
  const visibleRangeMs = currentRight - currentLeft
  const isZoomed = zoomDomain !== null

  const resetZoom = useCallback(() => {
    setZoomDomain(null)
    setRefAreaLeft(null)
    setRefAreaRight(null)
  }, [])

  // --- Drag-to-zoom ---

  const onChartMouseDown = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (e: any) => {
      if (e?.activeLabel != null) {
        setRefAreaLeft(Number(e.activeLabel))
        setRefAreaRight(null)
      }
    },
    [],
  )

  const onChartMouseMove = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (e: any) => {
      if (refAreaLeft !== null && e?.activeLabel != null) {
        setRefAreaRight(Number(e.activeLabel))
      }
    },
    [refAreaLeft],
  )

  const onChartMouseUp = useCallback(() => {
    if (refAreaLeft !== null && refAreaRight === null) {
      onClickRef.current?.(refAreaLeft)
      setRefAreaLeft(null)
      return
    }

    if (refAreaLeft === null || refAreaRight === null) {
      setRefAreaLeft(null)
      setRefAreaRight(null)
      return
    }

    const left = Math.min(refAreaLeft, refAreaRight)
    const right = Math.max(refAreaLeft, refAreaRight)
    const totalRange = dataMax - dataMin

    if (totalRange > 0 && right - left < totalRange * 0.005) {
      onClickRef.current?.((refAreaLeft + refAreaRight) / 2)
      setRefAreaLeft(null)
      setRefAreaRight(null)
      return
    }

    setZoomDomain({ left, right })
    setRefAreaLeft(null)
    setRefAreaRight(null)
  }, [refAreaLeft, refAreaRight, dataMin, dataMax])

  const cancelSelection = useCallback(() => {
    if (refAreaLeft !== null) {
      setRefAreaLeft(null)
      setRefAreaRight(null)
    }
  }, [refAreaLeft])

  // --- Wheel: vertical scroll / pinch = zoom, horizontal swipe = pan ---

  useEffect(() => {
    const el = chartWrapperRef.current
    if (!el) return

    const handler = (e: WheelEvent) => {
      const dMin = minRef.current
      const dMax = maxRef.current
      if (dMin >= dMax) return

      const cur = zoomRef.current
      const hMin = homeMinRef.current
      const hMax = homeMaxRef.current
      const left = cur?.left ?? hMin
      const right = cur?.right ?? hMax
      const range = right - left
      const fullRange = dMax - dMin

      const isHorizontal = Math.abs(e.deltaX) > Math.abs(e.deltaY)

      if (isHorizontal && Math.abs(e.deltaX) > 0.5) {
        e.preventDefault()
        const panAmount = (e.deltaX / 400) * range
        setZoomDomain({ left: left + panAmount, right: right + panAmount })
        return
      }

      if (Math.abs(e.deltaY) < 0.5) return
      e.preventDefault()

      const factor = e.deltaY > 0 ? 1.3 : 1 / 1.3
      const newRange = range * factor

      if (newRange >= fullRange) {
        setZoomDomain({ left: dMin, right: dMax })
        return
      }
      if (newRange < fullRange * 0.0005) return

      const center = (left + right) / 2
      setZoomDomain({
        left: center - newRange / 2,
        right: center + newRange / 2,
      })
    }

    el.addEventListener('wheel', handler, { passive: false })
    return () => el.removeEventListener('wheel', handler)
  }, [])

  // --- Pan buttons ---

  const panLeft = useCallback(() => {
    const left = zoomDomain?.left ?? homeMin
    const right = zoomDomain?.right ?? homeMax
    const step = (right - left) * 0.3
    setZoomDomain({ left: left - step, right: right - step })
  }, [zoomDomain, homeMin, homeMax])

  const panRight = useCallback(() => {
    const left = zoomDomain?.left ?? homeMin
    const right = zoomDomain?.right ?? homeMax
    const step = (right - left) * 0.3
    setZoomDomain({ left: left + step, right: right + step })
  }, [zoomDomain, homeMin, homeMax])

  // --- Zoom buttons ---

  const zoomIn = useCallback(() => {
    const left = zoomDomain?.left ?? homeMin
    const right = zoomDomain?.right ?? homeMax
    const range = right - left
    const center = (left + right) / 2
    const fullRange = dataMax - dataMin
    const newRange = range / 1.3
    if (newRange < fullRange * 0.0005) return
    setZoomDomain({
      left: center - newRange / 2,
      right: center + newRange / 2,
    })
  }, [zoomDomain, homeMin, homeMax, dataMin, dataMax])

  const zoomOut = useCallback(() => {
    const left = zoomDomain?.left ?? homeMin
    const right = zoomDomain?.right ?? homeMax
    const range = right - left
    const center = (left + right) / 2
    const fullRange = dataMax - dataMin
    const newRange = range * 1.3
    if (newRange >= fullRange) {
      setZoomDomain({ left: dataMin, right: dataMax })
      return
    }
    setZoomDomain({
      left: center - newRange / 2,
      right: center + newRange / 2,
    })
  }, [zoomDomain, homeMin, homeMax, dataMin, dataMax])

  return {
    chartWrapperRef,
    domain,
    visibleRangeMs,
    isZoomed,
    refAreaLeft,
    refAreaRight,
    onChartMouseDown,
    onChartMouseMove,
    onChartMouseUp,
    cancelSelection,
    panLeft,
    panRight,
    zoomIn,
    zoomOut,
    resetZoom,
  }
}
