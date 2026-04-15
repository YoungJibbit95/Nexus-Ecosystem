import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { DashboardWidget, DashboardWidgetId } from '../../store/appStore'
import {
  buildMobilePresetLayout,
  isSameWidgetLayout,
  normalizeDashboardWidgets,
  type MobileDragState,
  type MobileLayoutPreset,
} from './mobileDashboardUtils'

export function useMobileDashboardLayoutEditing({
  editLayout,
  dashboardWidgets,
  setWidgets,
}: {
  editLayout: boolean
  dashboardWidgets: DashboardWidget[]
  setWidgets: (next: DashboardWidget[]) => void
}) {
  const [layoutLocked, setLayoutLocked] = useState(false)
  const [layoutHistory, setLayoutHistory] = useState<DashboardWidget[][]>([])
  const [layoutFuture, setLayoutFuture] = useState<DashboardWidget[][]>([])
  const [presetMenuOpen, setPresetMenuOpen] = useState(false)
  const [dragState, setDragState] = useState<MobileDragState | null>(null)
  const [hoveredWidgetId, setHoveredWidgetId] = useState<DashboardWidgetId | null>(null)
  const dragPreviewRef = useRef<MobileDragState | null>(null)
  const longPressTimerRef = useRef<number>(0)
  const longPressOriginRef = useRef<{ x: number; y: number; widgetId: DashboardWidgetId } | null>(null)

  const ordered = useMemo(
    () => normalizeDashboardWidgets(dashboardWidgets),
    [dashboardWidgets],
  )
  const visible = useMemo(() => ordered.filter((w) => w.visible), [ordered])
  const hidden = useMemo(() => ordered.filter((w) => !w.visible), [ordered])
  const draggedWidget = dragState ? (ordered.find((w) => w.id === dragState.widgetId) || null) : null

  useEffect(() => {
    if (!editLayout) return
    setHoveredWidgetId(null)
  }, [editLayout])

  useEffect(() => {
    if (!editLayout) {
      setPresetMenuOpen(false)
      setDragState(null)
      dragPreviewRef.current = null
      if (longPressTimerRef.current) {
        window.clearTimeout(longPressTimerRef.current)
        longPressTimerRef.current = 0
      }
      longPressOriginRef.current = null
    }
  }, [editLayout])

  const commitLayout = useCallback((mutate: (current: DashboardWidget[]) => DashboardWidget[]) => {
    if (layoutLocked) return
    const current = normalizeDashboardWidgets(ordered)
    const next = normalizeDashboardWidgets(mutate(current))
    if (isSameWidgetLayout(current, next)) return
    setLayoutHistory((history) => [current, ...history].slice(0, 24))
    setLayoutFuture([])
    setWidgets(next)
  }, [layoutLocked, ordered, setWidgets])

  const undoLayoutChange = useCallback(() => {
    if (layoutLocked) return
    setLayoutHistory((history) => {
      if (history.length === 0) return history
      const [previous, ...rest] = history
      setLayoutFuture((future) => [normalizeDashboardWidgets(ordered), ...future].slice(0, 24))
      setWidgets(previous)
      return rest
    })
  }, [layoutLocked, ordered, setWidgets])

  const redoLayoutChange = useCallback(() => {
    if (layoutLocked) return
    setLayoutFuture((future) => {
      if (future.length === 0) return future
      const [next, ...rest] = future
      setLayoutHistory((history) => [normalizeDashboardWidgets(ordered), ...history].slice(0, 24))
      setWidgets(next)
      return rest
    })
  }, [layoutLocked, ordered, setWidgets])

  const toggleWidget = useCallback((id: DashboardWidgetId) => {
    commitLayout((current) =>
      current.map((widget) => (widget.id === id ? { ...widget, visible: !widget.visible } : widget)),
    )
  }, [commitLayout])

  const setSpan = useCallback((id: DashboardWidgetId, span: 1 | 2) => {
    commitLayout((current) =>
      current.map((widget) => (widget.id === id ? { ...widget, span } : widget)),
    )
  }, [commitLayout])

  const move = useCallback((id: DashboardWidgetId, dir: -1 | 1) => {
    commitLayout((current) => {
      const copy = [...current]
      const idx = copy.findIndex((widget) => widget.id === id)
      const nextIdx = idx + dir
      if (idx < 0 || nextIdx < 0 || nextIdx >= copy.length) return current
      const oldOrder = copy[idx].order
      copy[idx].order = copy[nextIdx].order
      copy[nextIdx].order = oldOrder
      return copy
    })
  }, [commitLayout])

  const resetLayout = useCallback(() => {
    commitLayout(() => buildMobilePresetLayout('balanced', ordered))
  }, [commitLayout, ordered])

  const applyLayoutPreset = useCallback((preset: MobileLayoutPreset) => {
    commitLayout((current) => buildMobilePresetLayout(preset, current))
    setPresetMenuOpen(false)
  }, [commitLayout])

  const cancelLongPress = useCallback(() => {
    if (longPressTimerRef.current) {
      window.clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = 0
    }
    longPressOriginRef.current = null
  }, [])

  const beginPointerDrag = useCallback((event: React.PointerEvent<HTMLButtonElement>, widgetId: DashboardWidgetId) => {
    if (!editLayout || layoutLocked) return
    cancelLongPress()
    const pointerId = event.pointerId
    longPressOriginRef.current = { x: event.clientX, y: event.clientY, widgetId }
    const target = event.currentTarget
    longPressTimerRef.current = window.setTimeout(() => {
      const nextDrag: MobileDragState = {
        widgetId,
        pointerId,
        targetWidgetId: null,
        clientX: event.clientX,
        clientY: event.clientY,
      }
      target.setPointerCapture?.(pointerId)
      dragPreviewRef.current = nextDrag
      setDragState(nextDrag)
      longPressTimerRef.current = 0
    }, 180)
  }, [cancelLongPress, editLayout, layoutLocked])

  useEffect(() => {
    if (!editLayout || !dragState) return

    const handlePointerMove = (event: PointerEvent) => {
      const targetEl = document
        .elementFromPoint(event.clientX, event.clientY)
        ?.closest('[data-mobile-dashboard-widget-id]') as HTMLElement | null
      const targetId = (targetEl?.dataset.mobileDashboardWidgetId as DashboardWidgetId | undefined) ?? null
      const nextDrag: MobileDragState = {
        ...dragState,
        clientX: event.clientX,
        clientY: event.clientY,
        targetWidgetId: targetId && targetId !== dragState.widgetId ? targetId : null,
      }
      dragPreviewRef.current = nextDrag
      setDragState(nextDrag)
    }

    const handlePointerEnd = () => {
      const finalDrag = dragPreviewRef.current ?? dragState
      if (finalDrag?.targetWidgetId) {
        commitLayout((current) => {
          const source = current.find((widget) => widget.id === finalDrag.widgetId)
          const target = current.find((widget) => widget.id === finalDrag.targetWidgetId)
          if (!source || !target) return current
          return current.map((widget) => {
            if (widget.id === source.id) return { ...widget, order: target.order }
            if (widget.id === target.id) return { ...widget, order: source.order }
            return widget
          })
        })
      }
      setDragState(null)
      dragPreviewRef.current = null
      cancelLongPress()
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerEnd)
    window.addEventListener('pointercancel', handlePointerEnd)
    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerEnd)
      window.removeEventListener('pointercancel', handlePointerEnd)
    }
  }, [cancelLongPress, commitLayout, dragState, editLayout])

  return {
    layoutLocked,
    setLayoutLocked,
    layoutHistory,
    layoutFuture,
    presetMenuOpen,
    setPresetMenuOpen,
    dragState,
    hoveredWidgetId,
    setHoveredWidgetId,
    ordered,
    visible,
    hidden,
    draggedWidget,
    beginPointerDrag,
    cancelLongPress,
    longPressOriginRef,
    setSpan,
    toggleWidget,
    move,
    resetLayout,
    applyLayoutPreset,
    undoLayoutChange,
    redoLayoutChange,
  }
}
