import { useCallback, useEffect, useRef, type RefObject } from 'react'
import { useCanvas } from '../../store/canvasStore'

type UseCanvasWheelGesturesInput = {
  canvasRef: RefObject<HTMLDivElement>
  canvasHeight: number
  setZoom: (zoom: number) => void
  setWheelPanning: (value: boolean) => void
}

export function useCanvasWheelGestures({
  canvasRef,
  canvasHeight,
  setZoom,
  setWheelPanning,
}: UseCanvasWheelGesturesInput) {
  const wheelPanRaf = useRef(0)
  const wheelPanDelta = useRef({ x: 0, y: 0 })
  const wheelPanReleaseTimeout = useRef(0)
  const wheelZoomRaf = useRef(0)
  const wheelZoomDelta = useRef(0)
  const wheelZoomPoint = useRef<{ x: number, y: number } | null>(null)
  const wheelGestureMode = useRef<'pan' | 'zoom' | null>(null)
  const wheelGestureModeTimeout = useRef(0)

  const applyZoomAtPoint = useCallback((clientX: number, clientY: number, scaleFactor: number) => {
    const el = canvasRef.current
    if (!el) return
    const vp = useCanvas.getState().viewport
    const rect = el.getBoundingClientRect()
    const localX = clientX - rect.left
    const localY = clientY - rect.top
    const nextZoom = Math.max(0.15, Math.min(3, vp.zoom * scaleFactor))
    if (Math.abs(nextZoom - vp.zoom) < 0.0001) return
    const worldX = (localX - vp.panX) / vp.zoom
    const worldY = (localY - vp.panY) / vp.zoom
    const nextPanX = localX - worldX * nextZoom
    const nextPanY = localY - worldY * nextZoom
    useCanvas.setState({
      viewport: {
        ...vp,
        zoom: nextZoom,
        panX: nextPanX,
        panY: nextPanY,
      },
    })
  }, [canvasRef])

  const setZoomCentered = useCallback((nextZoom: number) => {
    const el = canvasRef.current
    const vp = useCanvas.getState().viewport
    const clamped = Math.max(0.15, Math.min(3, nextZoom))
    if (!el) {
      setZoom(clamped)
      return
    }
    const rect = el.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2
    const factor = clamped / Math.max(0.0001, vp.zoom)
    applyZoomAtPoint(centerX, centerY, factor)
  }, [applyZoomAtPoint, canvasRef, setZoom])

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    const deltaScale = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? canvasHeight : 1
    const rawDx = e.deltaX * deltaScale
    const rawDy = e.deltaY * deltaScale
    const dx = Math.max(-180, Math.min(180, rawDx))
    const dy = Math.max(-180, Math.min(180, rawDy))
    if (Math.abs(dx) < 0.02 && Math.abs(dy) < 0.02) return

    const absRawDx = Math.abs(rawDx)
    const absRawDy = Math.abs(rawDy)
    const looksLikePinch =
      absRawDy > 0
      && absRawDy <= 18
      && absRawDx <= 14
      && absRawDy >= absRawDx * 0.55

    let mode = wheelGestureMode.current
    if (!mode) {
      mode = e.ctrlKey || e.metaKey || e.altKey || looksLikePinch ? 'zoom' : 'pan'
      wheelGestureMode.current = mode
    }
    if (wheelGestureModeTimeout.current) {
      window.clearTimeout(wheelGestureModeTimeout.current)
    }
    wheelGestureModeTimeout.current = window.setTimeout(() => {
      wheelGestureMode.current = null
    }, 120)

    if (mode === 'zoom') {
      const pinchDelta = Math.max(-150, Math.min(150, dy))
      wheelZoomDelta.current += pinchDelta
      wheelZoomPoint.current = { x: e.clientX, y: e.clientY }
      if (!wheelZoomRaf.current) {
        wheelZoomRaf.current = requestAnimationFrame(() => {
          wheelZoomRaf.current = 0
          const delta = Math.max(-240, Math.min(240, wheelZoomDelta.current))
          wheelZoomDelta.current = 0
          const point = wheelZoomPoint.current
          if (!point || Math.abs(delta) < 0.02) return
          const absPinch = Math.abs(delta)
          const sensitivity = absPinch <= 6 ? 0.04 : absPinch < 24 ? 0.022 : 0.0125
          const factor = Math.exp(-delta * sensitivity)
          applyZoomAtPoint(point.x, point.y, factor)
        })
      }
      setWheelPanning(false)
      return
    }

    wheelPanDelta.current.x -= dx
    wheelPanDelta.current.y -= dy
    setWheelPanning(true)
    if (!wheelPanRaf.current) {
      wheelPanRaf.current = requestAnimationFrame(() => {
        wheelPanRaf.current = 0
        const vp = useCanvas.getState().viewport
        const delta = wheelPanDelta.current
        wheelPanDelta.current = { x: 0, y: 0 }
        if (delta.x || delta.y) {
          useCanvas.setState({
            viewport: {
              ...vp,
              panX: vp.panX + delta.x,
              panY: vp.panY + delta.y,
            },
          })
        }
      })
    }

    if (wheelPanReleaseTimeout.current) {
      window.clearTimeout(wheelPanReleaseTimeout.current)
    }
    wheelPanReleaseTimeout.current = window.setTimeout(() => {
      setWheelPanning(false)
    }, 110)
  }, [applyZoomAtPoint, canvasHeight, setWheelPanning])

  useEffect(() => () => {
    if (wheelPanRaf.current) {
      cancelAnimationFrame(wheelPanRaf.current)
    }
    if (wheelZoomRaf.current) {
      cancelAnimationFrame(wheelZoomRaf.current)
    }
    if (wheelPanReleaseTimeout.current) {
      window.clearTimeout(wheelPanReleaseTimeout.current)
    }
    if (wheelGestureModeTimeout.current) {
      window.clearTimeout(wheelGestureModeTimeout.current)
    }
    wheelGestureMode.current = null
  }, [])

  return { applyZoomAtPoint, handleWheel, setZoomCentered }
}
