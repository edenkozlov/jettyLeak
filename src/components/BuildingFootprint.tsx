import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router'

import type { BuildingFootprint as FootprintData } from '@/hooks/useBuildingFootprint'
import type { Fixture, FixtureType, Sensor } from '@/types'
import { FIXTURE_COLORS } from '@/types'

interface BuildingFootprintProps {
  footprints: FootprintData[]
  sensors?: Sensor[]
  numberOfFloors?: number
  onSensorPlaced?: (
    sensorId: number,
    floor: number,
    position: { x: number; y: number },
  ) => void
  onFloorsChange?: (floors: number) => void
  onSensorCreate?: (name: string) => void
  onSensorRemoved?: (sensorId: number) => void
  onAreaDrawn?: (
    sensorId: number,
    area: Array<{ x: number; y: number }>,
  ) => void
  fixtures?: Fixture[]
  onFixtureCreate?: (type: FixtureType, floor: number) => void
  onFixturePlaced?: (fixtureId: number, position: { x: number; y: number }) => void
  onFixtureRemoved?: (fixtureId: number) => void
  className?: string
}

interface ViewBox {
  x: number
  y: number
  width: number
  height: number
}

function geoToLocal(
  lat: number,
  lon: number,
  centerLat: number,
  centerLon: number,
): { x: number; y: number } {
  const DEG_TO_RAD = Math.PI / 180
  const R = 6371000
  const x =
    (lon - centerLon) * DEG_TO_RAD * R * Math.cos(centerLat * DEG_TO_RAD)
  const y = (lat - centerLat) * DEG_TO_RAD * R
  return { x, y: -y }
}

function clientToSvg(
  clientX: number,
  clientY: number,
  svg: SVGSVGElement,
  vb: ViewBox,
): { x: number; y: number } {
  const rect = svg.getBoundingClientRect()
  const ratioX = (clientX - rect.left) / rect.width
  const ratioY = (clientY - rect.top) / rect.height
  return {
    x: vb.x + ratioX * vb.width,
    y: vb.y + ratioY * vb.height,
  }
}

function svgToPercent(
  svgX: number,
  svgY: number,
  bounds: ViewBox,
): { x: number; y: number } {
  return {
    x: ((svgX - bounds.x) / bounds.width) * 100,
    y: ((svgY - bounds.y) / bounds.height) * 100,
  }
}

function percentToSvg(
  px: number,
  py: number,
  bounds: ViewBox,
): { x: number; y: number } {
  return {
    x: bounds.x + (px / 100) * bounds.width,
    y: bounds.y + (py / 100) * bounds.height,
  }
}

export default function BuildingFootprint({
  footprints,
  sensors = [],
  numberOfFloors = 1,
  onSensorPlaced,
  onFloorsChange,
  onSensorCreate,
  onSensorRemoved,
  onAreaDrawn,
  fixtures = [],
  onFixtureCreate,
  onFixturePlaced,
  onFixtureRemoved,
  className = '',
}: BuildingFootprintProps) {
  const navigate = useNavigate()
  const svgRef = useRef<SVGSVGElement>(null)
  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState({ x: 0, y: 0 })
  const [viewBox, setViewBox] = useState<ViewBox | null>(null)
  const [selectedFloor, setSelectedFloor] = useState(1)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isAddingSensor, setIsAddingSensor] = useState(false)
  const [newSensorName, setNewSensorName] = useState('')
  const [showFixtureMenu, setShowFixtureMenu] = useState(false)
  const [expandedSensors, setExpandedSensors] = useState<Set<number>>(new Set())
  const [draggingSensorId, setDraggingSensorId] = useState<number | null>(null)
  const [dragSvgPos, setDragSvgPos] = useState<{
    x: number
    y: number
  } | null>(null)

  // Fixture state
  const [selectedFixtureId, setSelectedFixtureId] = useState<number | null>(null)
  const [draggingFixtureId, setDraggingFixtureId] = useState<number | null>(null)
  const [dragFixtureSvgPos, setDragFixtureSvgPos] = useState<{ x: number; y: number } | null>(null)
  const fixtureMouseDownPos = useRef<{ x: number; y: number } | null>(null)

  // Drawing mode state
  const [selectedSensorId, setSelectedSensorId] = useState<number | null>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [drawingPoints, setDrawingPoints] = useState<
    Array<{ x: number; y: number }>
  >([])
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(
    null,
  )

  const { paths, defaultViewBox } = useMemo(() => {
    if (footprints.length === 0) return { paths: [], defaultViewBox: null }

    const allCoords = footprints.flatMap((f) => f.coordinates)
    const centerLat =
      allCoords.reduce((s, c) => s + c.lat, 0) / allCoords.length
    const centerLon =
      allCoords.reduce((s, c) => s + c.lon, 0) / allCoords.length

    const paths = footprints.map((fp) => {
      const points = fp.coordinates.map((c) =>
        geoToLocal(c.lat, c.lon, centerLat, centerLon),
      )
      const d =
        points
          .map(
            (p, i) =>
              `${i === 0 ? 'M' : 'L'}${p.x.toFixed(2)},${p.y.toFixed(2)}`,
          )
          .join(' ') + ' Z'
      return { id: fp.id, d }
    })

    const allPoints = footprints.flatMap((fp) =>
      fp.coordinates.map((c) =>
        geoToLocal(c.lat, c.lon, centerLat, centerLon),
      ),
    )
    const xs = allPoints.map((p) => p.x)
    const ys = allPoints.map((p) => p.y)
    const minX = Math.min(...xs)
    const maxX = Math.max(...xs)
    const minY = Math.min(...ys)
    const maxY = Math.max(...ys)
    const padding = Math.max(maxX - minX, maxY - minY) * 0.15
    const defaultViewBox: ViewBox = {
      x: minX - padding,
      y: minY - padding,
      width: maxX - minX + padding * 2,
      height: maxY - minY + padding * 2,
    }

    return { paths, defaultViewBox }
  }, [footprints])

  const activeViewBox = viewBox ?? defaultViewBox

  // Sensors placed on the current floor
  const floorSensors = useMemo(
    () =>
      sensors.filter(
        (s) => s.floor_number === selectedFloor && s.location_on_floor != null,
      ),
    [sensors, selectedFloor],

  )

  // Fixtures on the current floor
  const floorFixtures = useMemo(
    () => fixtures.filter((f) => f.floor_number === selectedFloor),
    [fixtures, selectedFloor],
  )

  // Group fixtures by sensor
  const fixturesBySensor = useMemo(() => {
    const grouped = new Map<number | null, Fixture[]>()
    for (const f of floorFixtures) {
      const key = f.sensor_id
      const list = grouped.get(key) ?? []
      list.push(f)
      grouped.set(key, list)
    }
    return grouped
  }, [floorFixtures])

  const toggleSensorExpanded = useCallback((sensorId: number) => {
    setExpandedSensors((prev) => {
      const next = new Set(prev)
      if (next.has(sensorId)) next.delete(sensorId)
      else next.add(sensorId)
      return next
    })
  }, [])

  // Cancel drawing on Escape
  useEffect(() => {
    if (!isDrawing) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsDrawing(false)
        setDrawingPoints([])
        setMousePos(null)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isDrawing])

  // Wheel zoom
  const handleWheel = useCallback(
    (e: WheelEvent) => {
      e.preventDefault()
      if (!activeViewBox) return
      const factor = e.deltaY > 0 ? 1.1 : 0.9
      const newWidth = activeViewBox.width * factor
      const newHeight = activeViewBox.height * factor
      const dx = (activeViewBox.width - newWidth) / 2
      const dy = (activeViewBox.height - newHeight) / 2
      setViewBox({
        x: activeViewBox.x + dx,
        y: activeViewBox.y + dy,
        width: newWidth,
        height: newHeight,
      })
    },
    [activeViewBox],
  )

  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return
    svg.addEventListener('wheel', handleWheel, { passive: false })
    return () => svg.removeEventListener('wheel', handleWheel)
  }, [handleWheel])

  // SVG click — either add drawing point or start pan
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (isDrawing || draggingSensorId != null || draggingFixtureId != null) return
      setIsPanning(true)
      setPanStart({ x: e.clientX, y: e.clientY })
    },
    [isDrawing, draggingSensorId, draggingFixtureId],
  )

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      if (!isDrawing || !activeViewBox || !svgRef.current) return
      const pos = clientToSvg(
        e.clientX,
        e.clientY,
        svgRef.current,
        activeViewBox,
      )
      setDrawingPoints((prev) => [...prev, pos])
    },
    [isDrawing, activeViewBox],
  )

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      if (
        !isDrawing ||
        drawingPoints.length < 3 ||
        !defaultViewBox ||
        selectedSensorId == null
      )
        return
      e.preventDefault()
      // Convert SVG coords to percentage
      const pctPoints = drawingPoints.map((p) =>
        svgToPercent(p.x, p.y, defaultViewBox),
      )
      onAreaDrawn?.(selectedSensorId, pctPoints)
      setIsDrawing(false)
      setDrawingPoints([])
      setMousePos(null)
    },
    [isDrawing, drawingPoints, defaultViewBox, selectedSensorId, onAreaDrawn],
  )

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      // Track mouse for drawing preview
      if (isDrawing && activeViewBox && svgRef.current) {
        const pos = clientToSvg(
          e.clientX,
          e.clientY,
          svgRef.current,
          activeViewBox,
        )
        setMousePos(pos)
        return
      }
      // Dragging a sensor within SVG
      if (draggingSensorId != null && activeViewBox && svgRef.current) {
        const pos = clientToSvg(
          e.clientX,
          e.clientY,
          svgRef.current,
          activeViewBox,
        )
        setDragSvgPos(pos)
        return
      }
      // Dragging a fixture within SVG
      if (draggingFixtureId != null && activeViewBox && svgRef.current) {
        const pos = clientToSvg(e.clientX, e.clientY, svgRef.current, activeViewBox)
        setDragFixtureSvgPos(pos)
        return
      }
      // Panning
      if (!isPanning || !activeViewBox || !svgRef.current) return
      const rect = svgRef.current.getBoundingClientRect()
      const scaleX = activeViewBox.width / rect.width
      const scaleY = activeViewBox.height / rect.height
      const dx = (e.clientX - panStart.x) * scaleX
      const dy = (e.clientY - panStart.y) * scaleY
      setViewBox({
        ...activeViewBox,
        x: activeViewBox.x - dx,
        y: activeViewBox.y - dy,
      })
      setPanStart({ x: e.clientX, y: e.clientY })
    },
    [isDrawing, draggingSensorId, draggingFixtureId, isPanning, activeViewBox, panStart],
  )

  const handleMouseUp = useCallback(
    (e: React.MouseEvent) => {
      if (isDrawing) return
      if (
        draggingSensorId != null &&
        activeViewBox &&
        svgRef.current &&
        defaultViewBox
      ) {
        // Check if it was a click (barely moved) vs a drag
        const downPos = sensorMouseDownPos.current
        const dist = downPos
          ? Math.hypot(e.clientX - downPos.x, e.clientY - downPos.y)
          : Infinity
        sensorMouseDownPos.current = null

        if (dist < 5) {
          // It was a click — toggle selection instead of repositioning
          setSelectedSensorId((prev) =>
            prev === draggingSensorId ? null : draggingSensorId,
          )
          setDraggingSensorId(null)
          setDragSvgPos(null)
          return
        }

        const pos = clientToSvg(
          e.clientX,
          e.clientY,
          svgRef.current,
          activeViewBox,
        )
        const pct = svgToPercent(pos.x, pos.y, defaultViewBox)
        onSensorPlaced?.(draggingSensorId, selectedFloor, pct)
        setDraggingSensorId(null)
        setDragSvgPos(null)
        return
      }
      // Fixture drag/click
      if (
        draggingFixtureId != null &&
        activeViewBox &&
        svgRef.current &&
        defaultViewBox
      ) {
        const downPos = fixtureMouseDownPos.current
        const dist = downPos
          ? Math.hypot(e.clientX - downPos.x, e.clientY - downPos.y)
          : Infinity
        fixtureMouseDownPos.current = null

        if (dist < 5) {
          setSelectedFixtureId((prev) =>
            prev === draggingFixtureId ? null : draggingFixtureId,
          )
          setDraggingFixtureId(null)
          setDragFixtureSvgPos(null)
          return
        }

        const pos = clientToSvg(e.clientX, e.clientY, svgRef.current, activeViewBox)
        const pct = svgToPercent(pos.x, pos.y, defaultViewBox)
        onFixturePlaced?.(draggingFixtureId, pct)
        setDraggingFixtureId(null)
        setDragFixtureSvgPos(null)
        return
      }
      setIsPanning(false)
    },
    [
      isDrawing,
      draggingSensorId,
      draggingFixtureId,
      activeViewBox,
      defaultViewBox,
      selectedFloor,
      onSensorPlaced,
      onFixturePlaced,
    ],
  )

  // External drop from sensor/fixture list
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      if (!activeViewBox || !svgRef.current || !defaultViewBox) return
      const pos = clientToSvg(e.clientX, e.clientY, svgRef.current, activeViewBox)
      const pct = svgToPercent(pos.x, pos.y, defaultViewBox)

      const fixtureId = Number(e.dataTransfer.getData('fixture'))
      if (fixtureId) {
        onFixturePlaced?.(fixtureId, pct)
        return
      }

      const sensorId = Number(e.dataTransfer.getData('text/plain'))
      if (sensorId) {
        onSensorPlaced?.(sensorId, selectedFloor, pct)
      }
    },
    [activeViewBox, defaultViewBox, selectedFloor, onSensorPlaced, onFixturePlaced],
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }, [])

  // Track whether a sensor mousedown resulted in a drag vs a click
  const sensorMouseDownPos = useRef<{ x: number; y: number } | null>(null)

  // Start dragging an already-placed sensor within SVG
  const handleSensorMouseDown = useCallback(
    (e: React.MouseEvent, sensorId: number) => {
      if (isDrawing) return
      e.stopPropagation()
      if (!activeViewBox || !svgRef.current) return
      sensorMouseDownPos.current = { x: e.clientX, y: e.clientY }
      setDraggingSensorId(sensorId)
      const pos = clientToSvg(
        e.clientX,
        e.clientY,
        svgRef.current,
        activeViewBox,
      )
      setDragSvgPos(pos)
    },
    [isDrawing, activeViewBox],
  )

  // Start dragging an already-placed fixture within SVG
  const handleFixtureMouseDown = useCallback(
    (e: React.MouseEvent, fixtureId: number) => {
      if (isDrawing) return
      e.stopPropagation()
      if (!activeViewBox || !svgRef.current) return
      fixtureMouseDownPos.current = { x: e.clientX, y: e.clientY }
      setDraggingFixtureId(fixtureId)
      const pos = clientToSvg(e.clientX, e.clientY, svgRef.current, activeViewBox)
      setDragFixtureSvgPos(pos)
    },
    [isDrawing, activeViewBox],
  )

  const startDrawing = useCallback((sensorId: number) => {
    setSelectedSensorId(sensorId)
    setIsDrawing(true)
    setDrawingPoints([])
    setMousePos(null)
  }, [])

  const cancelDrawing = useCallback(() => {
    setIsDrawing(false)
    setDrawingPoints([])
    setMousePos(null)
    setSelectedSensorId(null)
  }, [])

  const floorTabs = useMemo(
    () =>
      Array.from({ length: Math.max(numberOfFloors, 1) }, (_, i) => i + 1),
    [numberOfFloors],
  )

  if (!activeViewBox || footprints.length === 0) {
    return (
      <div
        className={`flex items-center justify-center rounded-xl border border-gray-200 bg-gray-100 dark:border-gray-700 dark:bg-gray-800 ${className}`}
      >
        <p className="text-sm text-gray-400">No footprint data available</p>
      </div>
    )
  }

  const baseWidth = defaultViewBox?.width ?? activeViewBox.width
  const circleR = baseWidth * 0.012
  const dotR = baseWidth * 0.005

  // Build the drawing preview polyline
  const drawingPreview = (() => {
    if (!isDrawing || drawingPoints.length === 0) return null
    const allPts = [...drawingPoints]
    if (mousePos) allPts.push(mousePos)
    return allPts.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ')
  })()

  return (
    <div
      className={`flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900 ${className}`}
    >
      {/* Drawing mode banner */}
      {isDrawing && (
        <div className="flex items-center justify-between bg-green-600 px-3 py-1.5 text-xs text-white">
          <span>
            Drawing coverage area — click to add points, double-click to finish
          </span>
          <button
            onClick={cancelDrawing}
            className="rounded px-2 py-0.5 hover:bg-green-700"
          >
            Cancel (Esc)
          </button>
        </div>
      )}

      {/* Floor tabs */}
      <div className="flex items-center gap-1 border-b border-gray-200 px-3 py-2 dark:border-gray-700">
        {floorTabs.map((floor) => (
          <button
            key={floor}
            onClick={() => setSelectedFloor(floor)}
            className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
              selectedFloor === floor
                ? 'bg-indigo-500 text-white'
                : 'text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
            }`}
          >
            Floor {floor}
          </button>
        ))}
        {onFloorsChange && (
          <div className="ml-auto flex items-center gap-1">
            <button
              onClick={() => {
                if (numberOfFloors > 1) onFloorsChange(numberOfFloors - 1)
              }}
              disabled={numberOfFloors <= 1}
              className="rounded-md px-1.5 py-0.5 text-xs text-gray-400 hover:bg-gray-100 disabled:opacity-30 dark:hover:bg-gray-800"
            >
              −
            </button>
            <span className="text-xs text-gray-400">{numberOfFloors}F</span>
            <button
              onClick={() => onFloorsChange(numberOfFloors + 1)}
              className="rounded-md px-1.5 py-0.5 text-xs text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              +
            </button>
          </div>
        )}
      </div>

      {/* Main area: SVG + floating sidebar */}
      <div className="relative min-h-0 flex-1">
        {/* Legend */}
        {floorFixtures.length > 0 && (
          <div className="absolute left-2 top-2 z-10 rounded-md border border-gray-200 bg-white/90 px-2 py-1.5 shadow-sm backdrop-blur dark:border-gray-600 dark:bg-gray-800/90">
            <div className="flex flex-col gap-1">
              {[...new Set(floorFixtures.map((f) => f.type).filter(Boolean))].map(
                (type) => {
                  const colors = FIXTURE_COLORS[type!]
                  return (
                    <div key={type} className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
                      <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: colors.fill }} />
                      {colors.label}
                    </div>
                  )
                },
              )}
              <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
                <span className="h-2 w-2 shrink-0 rounded-full bg-green-500" />
                Sensor
              </div>
            </div>
          </div>
        )}

        {/* SVG */}
        <svg
          ref={svgRef}
          viewBox={`${activeViewBox.x} ${activeViewBox.y} ${activeViewBox.width} ${activeViewBox.height}`}
          className="h-full w-full"
          style={{
            cursor: isDrawing
              ? 'crosshair'
              : draggingSensorId
                ? 'crosshair'
                : isPanning
                  ? 'grabbing'
                  : 'grab',
          }}
          onMouseDown={handleMouseDown}
          onClick={handleClick}
          onDoubleClick={handleDoubleClick}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={() => {
            setIsPanning(false)
            setMousePos(null)
            if (draggingSensorId != null) {
              setDraggingSensorId(null)
              setDragSvgPos(null)
            }
            if (draggingFixtureId != null) {
              setDraggingFixtureId(null)
              setDragFixtureSvgPos(null)
            }
          }}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
        >
          {/* Building polygon */}
          {paths.map((path) => (
            <path
              key={path.id}
              d={path.d}
              className="fill-indigo-200 stroke-indigo-600 dark:fill-indigo-900 dark:stroke-indigo-400"
              strokeWidth={activeViewBox.width * 0.005}
            />
          ))}

          {/* Saved coverage areas */}
          {floorSensors.map((sensor) => {
            if (!sensor.area_covered || !defaultViewBox) return null
            const pts = sensor.area_covered
              .map((p) => {
                const sv = percentToSvg(p.x, p.y, defaultViewBox)
                return `${sv.x.toFixed(2)},${sv.y.toFixed(2)}`
              })
              .join(' ')
            const isSelected = selectedSensorId === sensor.id
            return (
              <polygon
                key={`area-${sensor.id}`}
                points={pts}
                className={
                  isSelected
                    ? 'fill-green-400/40 stroke-green-600'
                    : 'fill-green-500/20 stroke-green-600/50'
                }
                strokeWidth={activeViewBox.width * 0.003}
                strokeDasharray={
                  isSelected ? 'none' : `${activeViewBox.width * 0.008}`
                }
                style={{ pointerEvents: 'none' }}
              />
            )
          })}

          {/* Placed sensors */}
          {floorSensors.map((sensor) => {
            if (!sensor.location_on_floor || !defaultViewBox) return null
            const isDragging = draggingSensorId === sensor.id
            const isSelected = selectedSensorId === sensor.id
            const pos =
              isDragging && dragSvgPos
                ? dragSvgPos
                : percentToSvg(
                    sensor.location_on_floor.x,
                    sensor.location_on_floor.y,
                    defaultViewBox,
                  )
            return (
              <g key={sensor.id}>
                {isSelected && (
                  <circle
                    cx={pos.x}
                    cy={pos.y}
                    r={circleR * 1.6}
                    className="fill-none stroke-green-400"
                    strokeWidth={activeViewBox.width * 0.003}
                    strokeDasharray={`${activeViewBox.width * 0.006}`}
                    style={{ pointerEvents: 'none' }}
                  />
                )}
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={circleR}
                  className="fill-green-500 stroke-green-700 dark:fill-green-400 dark:stroke-green-600"
                  strokeWidth={activeViewBox.width * 0.003}
                  style={{ cursor: isDrawing ? 'crosshair' : 'grab' }}
                  onMouseDown={(e) => handleSensorMouseDown(e, sensor.id)}
                />
                <text
                  x={pos.x}
                  y={pos.y - circleR * 1.5}
                  textAnchor="middle"
                  className="fill-gray-700 dark:fill-gray-300"
                  fontSize={activeViewBox.width * 0.02}
                  style={{ pointerEvents: 'none' }}
                >
                  {sensor.name ?? `#${sensor.id}`}
                </text>
              </g>
            )
          })}

          {/* Placed fixtures */}
          {floorFixtures.map((fixture) => {
            if (!fixture.location_on_floor || !defaultViewBox || !fixture.type) return null
            const colors = FIXTURE_COLORS[fixture.type]
            const isDragging = draggingFixtureId === fixture.id
            const isSelected = selectedFixtureId === fixture.id
            const pos =
              isDragging && dragFixtureSvgPos
                ? dragFixtureSvgPos
                : percentToSvg(
                    fixture.location_on_floor.x,
                    fixture.location_on_floor.y,
                    defaultViewBox,
                  )
            return (
              <g key={`fix-${fixture.id}`}>
                {isSelected && (
                  <circle
                    cx={pos.x}
                    cy={pos.y}
                    r={circleR * 1.6}
                    fill="none"
                    stroke={colors.stroke}
                    strokeWidth={activeViewBox.width * 0.003}
                    strokeDasharray={`${activeViewBox.width * 0.006}`}
                    style={{ pointerEvents: 'none' }}
                  />
                )}
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={circleR * 0.8}
                  fill={colors.fill}
                  stroke={colors.stroke}
                  strokeWidth={activeViewBox.width * 0.003}
                  style={{ cursor: isDrawing ? 'crosshair' : 'grab' }}
                  onMouseDown={(e) => handleFixtureMouseDown(e, fixture.id)}
                />
              </g>
            )
          })}

          {/* Ghost circle while dragging from list */}
          {draggingSensorId != null &&
            dragSvgPos &&
            !floorSensors.some((s) => s.id === draggingSensorId) && (
              <circle
                cx={dragSvgPos.x}
                cy={dragSvgPos.y}
                r={circleR}
                className="fill-green-500/50 stroke-green-700"
                strokeWidth={activeViewBox.width * 0.003}
                strokeDasharray={`${activeViewBox.width * 0.005}`}
                style={{ pointerEvents: 'none' }}
              />
            )}

          {/* Drawing preview */}
          {isDrawing && drawingPreview && (
            <>
              <polyline
                points={drawingPreview}
                className="fill-none stroke-green-500"
                strokeWidth={activeViewBox.width * 0.004}
                strokeDasharray={`${activeViewBox.width * 0.008}`}
                style={{ pointerEvents: 'none' }}
              />
              {/* Closing line preview */}
              {drawingPoints.length >= 3 && mousePos && (
                <line
                  x1={mousePos.x}
                  y1={mousePos.y}
                  x2={drawingPoints[0]!.x}
                  y2={drawingPoints[0]!.y}
                  className="stroke-green-500/30"
                  strokeWidth={activeViewBox.width * 0.003}
                  strokeDasharray={`${activeViewBox.width * 0.008}`}
                  style={{ pointerEvents: 'none' }}
                />
              )}
              {/* Filled preview */}
              {drawingPoints.length >= 3 && (
                <polygon
                  points={drawingPoints
                    .map(
                      (p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`,
                    )
                    .join(' ')}
                  className="fill-green-500/10"
                  style={{ pointerEvents: 'none' }}
                />
              )}
              {/* Vertex dots */}
              {drawingPoints.map((p, i) => (
                <circle
                  key={i}
                  cx={p.x}
                  cy={p.y}
                  r={dotR}
                  className="fill-green-600 stroke-white"
                  strokeWidth={activeViewBox.width * 0.002}
                  style={{ pointerEvents: 'none' }}
                />
              ))}
            </>
          )}
        </svg>

        {/* Sidebar toggle */}
        <button
          onClick={() => setSidebarOpen((v) => !v)}
          className="absolute right-2 top-2 z-10 rounded-md border border-gray-200 bg-white/90 px-2 py-1 text-xs font-medium text-gray-500 shadow-sm backdrop-blur hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-800/90 dark:text-gray-400 dark:hover:bg-gray-700"
        >
          {sidebarOpen ? 'Close' : 'Panel'}
        </button>

        {/* Floating sensor/fixture list */}
        {sidebarOpen && (
        <div className="absolute right-2 top-10 z-10 flex max-h-[calc(100%-3rem)] w-40 flex-col overflow-hidden rounded-lg border border-gray-200 bg-white/95 shadow-lg backdrop-blur dark:border-gray-600 dark:bg-gray-800/95 sm:w-48">
          <div className="flex-1 overflow-y-auto p-2">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
            Sensors
          </p>
          <div className="flex-1 space-y-1 overflow-y-auto">
            {sensors.map((sensor) => {
              const placed =
                sensor.location_on_floor != null &&
                sensor.floor_number === selectedFloor
              const isSelected = selectedSensorId === sensor.id
              return (
                <div key={sensor.id}>
                  <div
                    draggable={!placed && !isDrawing}
                    onDragStart={(e) => {
                      e.dataTransfer.setData(
                        'text/plain',
                        String(sensor.id),
                      )
                      e.dataTransfer.effectAllowed = 'move'
                    }}
                    onClick={() => {
                      if (isDrawing) return
                      setSelectedSensorId(
                        isSelected ? null : sensor.id,
                      )
                    }}
                    className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-xs ${
                      isSelected
                        ? 'bg-green-100 text-green-800 ring-1 ring-green-400 dark:bg-green-900/30 dark:text-green-300 dark:ring-green-600'
                        : placed
                          ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                          : 'cursor-grab bg-gray-50 text-gray-600 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700'
                    }`}
                  >
                    <span
                      className={`h-2 w-2 shrink-0 rounded-full ${
                        placed
                          ? 'bg-green-500'
                          : 'bg-gray-300 dark:bg-gray-600'
                      }`}
                    />
                    <span className="truncate">
                      {sensor.name ?? `Sensor ${sensor.id}`}
                    </span>
                  </div>
                  {/* Sensor actions */}
                  {isSelected && !isDrawing && (
                    <div className="mt-1 flex flex-col gap-1">
                      <button
                        onClick={() =>
                          navigate(
                            `/dashboard/reports/${sensor.id}`,
                          )
                        }
                        className="w-full rounded-md bg-indigo-500 px-2 py-1 text-xs text-white hover:bg-indigo-600"
                      >
                        View Reports
                      </button>
                      {placed && (
                        <div className="flex gap-1">
                          {onAreaDrawn && (
                            <button
                              onClick={() => startDrawing(sensor.id)}
                              className="flex-1 rounded-md bg-green-600 px-2 py-1 text-xs text-white hover:bg-green-700"
                            >
                              {sensor.area_covered ? 'Redraw' : 'Draw Area'}
                            </button>
                          )}
                          {onSensorRemoved && (
                            <button
                              onClick={() => {
                                onSensorRemoved(sensor.id)
                                setSelectedSensorId(null)
                              }}
                              className="rounded-md px-2 py-1 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                            >
                              Remove
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
            {sensors.length === 0 && (
              <p className="py-2 text-center text-xs text-gray-400">
                No sensors yet
              </p>
            )}
          </div>

          {/* Add sensor */}
          {onSensorCreate && (
            <div className="mt-2 border-t border-gray-200 pt-2 dark:border-gray-700">
              {isAddingSensor ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    const name = newSensorName.trim()
                    if (!name) return
                    onSensorCreate(name)
                    setNewSensorName('')
                    setIsAddingSensor(false)
                  }}
                  className="flex flex-col gap-1"
                >
                  <input
                    autoFocus
                    value={newSensorName}
                    onChange={(e) => setNewSensorName(e.target.value)}
                    placeholder="Sensor name"
                    className="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs text-gray-700 outline-none focus:border-indigo-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300"
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') {
                        setIsAddingSensor(false)
                        setNewSensorName('')
                      }
                    }}
                  />
                  <div className="flex gap-1">
                    <button
                      type="submit"
                      className="flex-1 rounded-md bg-indigo-500 px-2 py-1 text-xs text-white hover:bg-indigo-600"
                    >
                      Add
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddingSensor(false)
                        setNewSensorName('')
                      }}
                      className="rounded-md px-2 py-1 text-xs text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <button
                  onClick={() => setIsAddingSensor(true)}
                  className="w-full rounded-md px-2 py-1.5 text-xs text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
                >
                  + Add sensor
                </button>
              )}
            </div>
          )}

          {/* Fixtures grouped by sensor */}
          <div className="mt-2 border-t border-gray-200 pt-2 dark:border-gray-700">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
              Fixtures
            </p>

            {/* Fixtures under each sensor */}
            {sensors
              .filter((s) => s.floor_number === selectedFloor && s.area_covered)
              .map((sensor) => {
                const sensorFixtures = fixturesBySensor.get(sensor.id) ?? []
                const isExpanded = expandedSensors.has(sensor.id)
                return (
                  <div key={`sf-${sensor.id}`} className="mb-1">
                    <button
                      onClick={() => toggleSensorExpanded(sensor.id)}
                      className="flex w-full items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
                    >
                      <svg
                        className={`h-3 w-3 shrink-0 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                      <span className="h-2 w-2 shrink-0 rounded-full bg-green-500" />
                      <span className="truncate">{sensor.name ?? `Sensor ${sensor.id}`}</span>
                      <span className="ml-auto text-gray-400">{sensorFixtures.length}</span>
                    </button>
                    {isExpanded && (
                      <div className="ml-3 mt-0.5 space-y-0.5 border-l border-gray-200 pl-2 dark:border-gray-700">
                        {sensorFixtures.length === 0 ? (
                          <p className="py-1 text-xs text-gray-400">No fixtures</p>
                        ) : (
                          sensorFixtures.map((fixture) => {
                            if (!fixture.type) return null
                            const colors = FIXTURE_COLORS[fixture.type]
                            const isSelected = selectedFixtureId === fixture.id
                            return (
                              <div key={fixture.id}>
                                <div
                                  onClick={() => {
                                    if (isDrawing) return
                                    setSelectedFixtureId(isSelected ? null : fixture.id)
                                    setSelectedSensorId(null)
                                  }}
                                  className={`flex cursor-pointer items-center gap-2 rounded-md px-2 py-1 text-xs ${
                                    isSelected
                                      ? 'bg-gray-100 dark:bg-gray-800'
                                      : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                                  }`}
                                  style={isSelected ? { outline: `2px solid ${colors.stroke}`, outlineOffset: '-1px', borderRadius: '6px' } : undefined}
                                >
                                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: colors.fill }} />
                                  <span className="truncate text-gray-600 dark:text-gray-400">{colors.label}</span>
                                </div>
                                {isSelected && onFixtureRemoved && (
                                  <button
                                    onClick={() => { onFixtureRemoved(fixture.id); setSelectedFixtureId(null) }}
                                    className="ml-6 mt-0.5 rounded-md px-2 py-0.5 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                                  >
                                    Remove
                                  </button>
                                )}
                              </div>
                            )
                          })
                        )}
                      </div>
                    )}
                  </div>
                )
              })}

            {/* Unassigned fixtures */}
            {(() => {
              const unassigned = fixturesBySensor.get(null) ?? []
              if (unassigned.length === 0 && floorFixtures.length > 0) return null
              return (
                <>
                  {unassigned.length > 0 && (
                    <div className="mb-1">
                      <p className="px-2 py-1 text-xs text-gray-400">Unassigned</p>
                      <div className="space-y-0.5">
                        {unassigned.map((fixture) => {
                          if (!fixture.type) return null
                          const colors = FIXTURE_COLORS[fixture.type]
                          const placed = fixture.location_on_floor != null
                          const isSelected = selectedFixtureId === fixture.id
                          return (
                            <div key={fixture.id}>
                              <div
                                draggable={!placed && !isDrawing}
                                onDragStart={(e) => {
                                  e.dataTransfer.setData('fixture', String(fixture.id))
                                  e.dataTransfer.effectAllowed = 'move'
                                }}
                                onClick={() => {
                                  if (isDrawing) return
                                  setSelectedFixtureId(isSelected ? null : fixture.id)
                                  setSelectedSensorId(null)
                                }}
                                className={`flex items-center gap-2 rounded-md px-2 py-1 text-xs ${
                                  !placed ? 'cursor-grab ' : 'cursor-pointer '}${
                                  isSelected
                                    ? 'bg-gray-100 dark:bg-gray-800'
                                    : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                                }`}
                                style={isSelected ? { outline: `2px solid ${colors.stroke}`, outlineOffset: '-1px', borderRadius: '6px' } : undefined}
                              >
                                <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: colors.fill }} />
                                <span className="truncate text-gray-600 dark:text-gray-400">{colors.label}</span>
                              </div>
                              {isSelected && onFixtureRemoved && (
                                <button
                                  onClick={() => { onFixtureRemoved(fixture.id); setSelectedFixtureId(null) }}
                                  className="ml-6 mt-0.5 rounded-md px-2 py-0.5 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                                >
                                  Remove
                                </button>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </>
              )
            })()}

            {floorFixtures.length === 0 && (
              <p className="py-1 text-center text-xs text-gray-400">
                No fixtures on this floor
              </p>
            )}
          </div>

          {/* Add fixture */}
          {onFixtureCreate && (
            <div className="mt-2 border-t border-gray-200 pt-2 dark:border-gray-700">
              {showFixtureMenu ? (
                <div className="flex flex-col gap-1 rounded-md border border-gray-200 bg-white p-1.5 dark:border-gray-600 dark:bg-gray-800">
                  {(Object.keys(FIXTURE_COLORS) as FixtureType[]).map((type) => {
                    const colors = FIXTURE_COLORS[type]
                    return (
                      <button
                        key={type}
                        onClick={() => {
                          onFixtureCreate(type, selectedFloor)
                          setShowFixtureMenu(false)
                        }}
                        className="flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
                      >
                        <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: colors.fill }} />
                        {colors.label}
                      </button>
                    )
                  })}
                  <button
                    onClick={() => setShowFixtureMenu(false)}
                    className="rounded-md px-2 py-1 text-xs text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowFixtureMenu(true)}
                  className="w-full rounded-md px-2 py-1.5 text-xs text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
                >
                  + Add fixture
                </button>
              )}
            </div>
          )}
          </div>
        </div>
        )}
      </div>
    </div>
  )
}
