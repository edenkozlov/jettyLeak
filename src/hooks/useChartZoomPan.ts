import { useCallback, useEffect, useRef, useState } from 'react'

function clampDomain(
  left: number,
  right: number,
  dMin: number,
  dMax: number,
): { left: number; right: number } {
  const range = right - left
  const fullRange = dMax - dMin
  if (range >= fullRange) return { left: dMin, right: dMax }
  let l = left
  let r = right
  if (l < dMin) {
    l = dMin
    r = dMin + range
  }
  if (r > dMax) {
    r = dMax
    l = dMax - range
  }
  return { left: Math.max(l, dMin), right: Math.min(r, dMax) }
}

export interface PendingSelection {
  left: number
  right: number
}

export interface UseChartZoomPanOptions {
  /** When true, releasing the mouse shows a pending selection instead of zooming immediately. */
  deferZoom?: boolean
}

export function useChartZoomPan(
  dataMin: number,
  dataMax: number,
  homeMin: number,
  homeMax: number,
  onClickTimestamp?: (timestamp: number) => void,
  options?: UseChartZoomPanOptions,
) {
  const deferZoom = options?.deferZoom ?? false
  const deferZoomRef = useRef(deferZoom)
  deferZoomRef.current = deferZoom

  const [zoomDomain, setZoomDomain] = useState<{
    left: number
    right: number
  } | null>(null)

  const [pendingSelection, setPendingSelection] =
    useState<PendingSelection | null>(null)

  // Drag overlay via refs + rAF throttle
  const refAreaLeftRef = useRef<number | null>(null)
  const refAreaRightRef = useRef<number | null>(null)
  const [selectionVersion, setSelectionVersion] = useState(0)
  const rafIdRef = useRef<number | null>(null)

  const scheduleSelectionRender = useCallback(() => {
    if (rafIdRef.current != null) return
    rafIdRef.current = requestAnimationFrame(() => {
      rafIdRef.current = null
      setSelectionVersion((v) => v + 1)
    })
  }, [])

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

  const refAreaLeft = refAreaLeftRef.current
  const refAreaRight = refAreaRightRef.current

  const resetZoom = useCallback(() => {
    setZoomDomain(null)
    setPendingSelection(null)
    refAreaLeftRef.current = null
    refAreaRightRef.current = null
  }, [])

  // --- Drag-to-zoom (ref-based, no re-render on move) ---

  const isDraggingRef = useRef(false)

  const onChartMouseDown = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (e: any) => {
      if (e?.activeLabel != null) {
        isDraggingRef.current = true
        refAreaLeftRef.current = Number(e.activeLabel)
        refAreaRightRef.current = null
        setPendingSelection(null)
      }
    },
    [],
  )

  const onChartMouseMove = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (e: any) => {
      if (!isDraggingRef.current) return
      if (refAreaLeftRef.current !== null && e?.activeLabel != null) {
        refAreaRightRef.current = Number(e.activeLabel)
        scheduleSelectionRender()
      }
    },
    [scheduleSelectionRender],
  )

  const onChartMouseUp = useCallback(() => {
    isDraggingRef.current = false
    if (rafIdRef.current != null) {
      cancelAnimationFrame(rafIdRef.current)
      rafIdRef.current = null
    }

    const left = refAreaLeftRef.current
    const right = refAreaRightRef.current

    if (left !== null && right === null) {
      onClickRef.current?.(left)
      refAreaLeftRef.current = null
      setSelectionVersion((v) => v + 1)
      return
    }

    if (left === null || right === null) {
      refAreaLeftRef.current = null
      refAreaRightRef.current = null
      setSelectionVersion((v) => v + 1)
      return
    }

    const lo = Math.min(left, right)
    const hi = Math.max(left, right)
    const totalRange = maxRef.current - minRef.current

    if (totalRange > 0 && hi - lo < totalRange * 0.005) {
      onClickRef.current?.((left + right) / 2)
      refAreaLeftRef.current = null
      refAreaRightRef.current = null
      setSelectionVersion((v) => v + 1)
      return
    }

    if (deferZoomRef.current) {
      // Keep the highlight visible and expose the selection for the parent to act on
      setPendingSelection({ left: lo, right: hi })
      setSelectionVersion((v) => v + 1)
    } else {
      refAreaLeftRef.current = null
      refAreaRightRef.current = null
      setZoomDomain(clampDomain(lo, hi, minRef.current, maxRef.current))
      setSelectionVersion((v) => v + 1)
    }
  }, [])

  /** Commit a pending (deferred) selection as a zoom. */
  const commitZoom = useCallback(() => {
    if (!pendingSelection) return
    const { left, right } = pendingSelection
    refAreaLeftRef.current = null
    refAreaRightRef.current = null
    setPendingSelection(null)
    setZoomDomain(clampDomain(left, right, minRef.current, maxRef.current))
    setSelectionVersion((v) => v + 1)
  }, [pendingSelection])

  /** Dismiss a pending selection without zooming. */
  const clearSelection = useCallback(() => {
    refAreaLeftRef.current = null
    refAreaRightRef.current = null
    setPendingSelection(null)
    setSelectionVersion((v) => v + 1)
  }, [])

  const cancelSelection = useCallback(() => {
    isDraggingRef.current = false
    refAreaLeftRef.current = null
    refAreaRightRef.current = null
    setPendingSelection(null)
    if (rafIdRef.current != null) {
      cancelAnimationFrame(rafIdRef.current)
      rafIdRef.current = null
    }
    setSelectionVersion((v) => v + 1)
  }, [])

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
        setZoomDomain(
          clampDomain(left + panAmount, right + panAmount, dMin, dMax),
        )
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
      setZoomDomain(
        clampDomain(center - newRange / 2, center + newRange / 2, dMin, dMax),
      )
    }

    el.addEventListener('wheel', handler, { passive: false })
    return () => el.removeEventListener('wheel', handler)
  }, [])

  // --- Pan buttons ---

  const panLeft = useCallback(() => {
    const left = zoomDomain?.left ?? homeMin
    const right = zoomDomain?.right ?? homeMax
    const step = (right - left) * 0.3
    setZoomDomain(clampDomain(left - step, right - step, dataMin, dataMax))
  }, [zoomDomain, homeMin, homeMax, dataMin, dataMax])

  const panRight = useCallback(() => {
    const left = zoomDomain?.left ?? homeMin
    const right = zoomDomain?.right ?? homeMax
    const step = (right - left) * 0.3
    setZoomDomain(clampDomain(left + step, right + step, dataMin, dataMax))
  }, [zoomDomain, homeMin, homeMax, dataMin, dataMax])

  // --- Zoom buttons ---

  const zoomIn = useCallback(() => {
    const left = zoomDomain?.left ?? homeMin
    const right = zoomDomain?.right ?? homeMax
    const range = right - left
    const center = (left + right) / 2
    const fullRange = dataMax - dataMin
    const newRange = range / 1.3
    if (newRange < fullRange * 0.0005) return
    setZoomDomain(
      clampDomain(center - newRange / 2, center + newRange / 2, dataMin, dataMax),
    )
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
    setZoomDomain(
      clampDomain(center - newRange / 2, center + newRange / 2, dataMin, dataMax),
    )
  }, [zoomDomain, homeMin, homeMax, dataMin, dataMax])

  // Force reads of selectionVersion so React knows about ref updates
  void selectionVersion

  return {
    chartWrapperRef,
    domain,
    visibleRangeMs,
    isZoomed,
    refAreaLeft,
    refAreaRight,
    pendingSelection,
    onChartMouseDown,
    onChartMouseMove,
    onChartMouseUp,
    cancelSelection,
    clearSelection,
    commitZoom,
    panLeft,
    panRight,
    zoomIn,
    zoomOut,
    resetZoom,
  }
}
