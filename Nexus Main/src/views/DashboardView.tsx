import React, { useMemo, useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FileText, Code, CheckSquare, Bell, GitBranch, Zap,
  Activity, Sparkles,
  Layout, X, Eye, EyeOff, RotateCcw, ChevronUp, ChevronDown, GripVertical
} from 'lucide-react'
import { Glass } from '../components/Glass'
import { useApp } from '../store/appStore'
import { useTheme } from '../store/themeStore'
import { hexToRgb } from '../lib/utils'
import { buildMotionRuntime } from '../lib/motionEngine'
import {
  DEFAULT_WIDGETS,
  LAYOUT_STORAGE_KEY,
  SNAP_ROW_HEIGHT,
  assignGridByOrder,
  cellKey,
  clampX,
  cloneDefaultWidgets,
  getSnapRowLimit,
  normalizeLayout,
  reorderLayoutByGrid,
  type GridCell,
  type Widget,
  type WidgetId,
} from './dashboard/dashboardLayout'
import { QuickChip } from './dashboard/dashboardUi'
import { buildDashboardWidgetContent } from './dashboard/widgetContent'

export function DashboardView({ setView }: { setView?: (v: string) => void }) {
  const t = useTheme()
  const motionRuntime = useMemo(() => buildMotionRuntime(t), [t])
  const { notes, tasks, codes, reminders, activities } = useApp()
  const rgb = hexToRgb(t.accent)

  const [editLayout, setEditLayout] = useState(false)
  const [widgets, setWidgets] = useState<Widget[]>(cloneDefaultWidgets())
  const [dragWidgetId, setDragWidgetId] = useState<WidgetId | null>(null)
  const [dragOriginCell, setDragOriginCell] = useState<GridCell | null>(null)
  const [dropCell, setDropCell] = useState<GridCell | null>(null)
  const gridRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LAYOUT_STORAGE_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw) as Widget[]
      if (!Array.isArray(parsed)) return
      const incoming = parsed
        .filter((w) => DEFAULT_WIDGETS.some((d) => d.id === w.id))
        .map((w) => ({
          ...w,
          span: (w.span === 2 ? 2 : 1) as 1 | 2,
          visible: w.visible !== false,
        }))

      const merged = cloneDefaultWidgets().map((base) => {
        const found = incoming.find((i) => i.id === base.id)
        return found ? { ...base, ...found } : base
      })
      setWidgets(normalizeLayout(merged))
    } catch {}
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(normalizeLayout(widgets)))
    } catch {}
  }, [widgets])

  const setSpan = (id: WidgetId, span: 1 | 2) => {
    setWidgets((ws) =>
      normalizeLayout(
        ws.map((w) => (w.id === id ? { ...w, span, x: clampX(w.x, span) } : w))
      )
    )
  }

  const moveWidget = (id: WidgetId, dir: number) => {
    setWidgets((ws) => {
      const ordered = normalizeLayout(ws)
      const idx = ordered.findIndex((w) => w.id === id)
      if (idx < 0) return ordered
      const toIdx = Math.max(0, Math.min(ordered.length - 1, idx + dir))
      const next = [...ordered]
      const [item] = next.splice(idx, 1)
      next.splice(toIdx, 0, item)
      return normalizeLayout(assignGridByOrder(next))
    })
  }

  const toggleWidget = (id: WidgetId) => {
    setWidgets((ws) => normalizeLayout(ws.map((w) => (w.id === id ? { ...w, visible: !w.visible } : w))))
  }

  const resetLayout = () => {
    setWidgets(normalizeLayout(cloneDefaultWidgets()))
  }

  const clearDragState = () => {
    setDragWidgetId(null)
    setDragOriginCell(null)
    setDropCell(null)
  }

  const startDrag = (e: React.DragEvent<HTMLElement>, id: WidgetId) => {
    const origin = normalizeLayout(widgets).find((widget) => widget.id === id)
    setDragWidgetId(id)
    setDragOriginCell(origin ? { x: origin.x, y: origin.y } : null)
    setDropCell(null)
    e.dataTransfer.setData('text/plain', id)
    e.dataTransfer.effectAllowed = 'move'
  }

  const setWidgetGrid = (id: WidgetId, cell: GridCell) => {
    setWidgets((ws) => {
      const ordered = normalizeLayout(ws)
      const dragged = ordered.find((w) => w.id === id)
      if (!dragged) return ordered
      const maxRow = getSnapRowLimit(ordered.filter((w) => w.visible).length)
      const nextCell = {
        x: clampX(cell.x, dragged.span),
        y: Math.max(1, Math.min(maxRow, Math.floor(cell.y))),
      }
      const occupant = ordered.find((w) => {
        if (!w.visible || w.id === id) return false
        if (w.y !== nextCell.y) return false
        if (w.span === 2) return true
        return w.x === nextCell.x
      })

      const swapped = ordered.map((widget) => {
        if (widget.id === id) {
          return { ...widget, x: nextCell.x, y: nextCell.y }
        }
        if (occupant && widget.id === occupant.id && dragOriginCell) {
          return {
            ...widget,
            x: clampX(dragOriginCell.x, widget.span),
            y: Math.max(1, Math.min(maxRow, dragOriginCell.y)),
          }
        }
        return widget
      })

      return reorderLayoutByGrid(swapped)
    })
  }

  const setDropCellFromPointer = (e: React.DragEvent<HTMLElement>) => {
    if (!dragWidgetId || !gridRef.current) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    const bounds = gridRef.current.getBoundingClientRect()
    const relX = e.clientX - bounds.left
    const relY = e.clientY - bounds.top
    const normalized = normalizeLayout(widgets)
    const dragged = normalized.find((w) => w.id === dragWidgetId)
    const maxRow = getSnapRowLimit(normalized.filter((w) => w.visible).length)
    const rawX: 1 | 2 = relX > bounds.width / 2 ? 2 : 1
    const x = clampX(rawX, dragged?.span ?? 1)
    const y = Math.max(1, Math.min(maxRow, Math.floor(relY / SNAP_ROW_HEIGHT) + 1))
    setDropCell({ x, y })
  }

  const nudgeWidgetRow = (id: WidgetId, delta: number) => {
    setWidgets((ws) => {
      const maxRow = getSnapRowLimit(ws.filter((w) => w.visible).length)
      return reorderLayoutByGrid(
        ws.map((w) => (w.id === id ? { ...w, y: Math.max(1, Math.min(maxRow, w.y + delta)) } : w))
      )
    })
  }

  const setWidgetColumn = (id: WidgetId, x: 1 | 2) => {
    setWidgets((ws) =>
      reorderLayoutByGrid(
        ws.map((w) => (w.id === id ? { ...w, x: clampX(x, w.span) } : w))
      )
    )
  }

  const onGridDrop = (forcedCell?: GridCell) => {
    const target = forcedCell ?? dropCell
    if (!dragWidgetId || !target) {
      clearDragState()
      return
    }
    setWidgetGrid(dragWidgetId, target)
    clearDragState()
  }

  // Stats
  const doneTasks = tasks.filter((task) => task.status === 'done').length
  const pendingTasks = tasks.filter((task) => task.status !== 'done').length
  const overdueReminders = reminders.filter((r) => !r.done && new Date(r.snoozeUntil || r.datetime) < new Date()).length
  const pinnedNotes = notes.filter((n) => n.pinned).length

  // Recent activity
  const recentActivity = useMemo(() => [...activities].slice(0, 8), [activities])

  const noteSpark = useMemo(() => {
    const base = notes.length
    return Array.from({ length: 7 }, (_, i) => Math.max(0, base - (6 - i) * 2 + Math.round(Math.random() * 2)))
  }, [notes.length])

  const taskSpark = useMemo(() => {
    const base = doneTasks
    return Array.from({ length: 7 }, (_, i) => Math.max(0, base - (6 - i) + Math.round(Math.random())))
  }, [doneTasks])

  const recentNotes = useMemo(
    () => [...notes].sort((a, b) => new Date(b.updated).getTime() - new Date(a.updated).getTime()).slice(0, 4),
    [notes]
  )

  const urgentReminders = useMemo(
    () => reminders.filter((r) => !r.done).sort((a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime()).slice(0, 4),
    [reminders]
  )

  const tasksByStatus = useMemo(() => {
    const counts: Record<string, number> = {}
    tasks.forEach((task) => { counts[task.status] = (counts[task.status] || 0) + 1 })
    return counts
  }, [tasks])

  const greeting = (() => {
    const h = new Date().getHours()
    if (h < 12) return 'Guten Morgen'
    if (h < 18) return 'Guten Tag'
    return 'Guten Abend'
  })()

  const today = new Date().toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })

  const actIcon = (type: string) => {
    const map: Record<string, any> = { note: FileText, code: Code, task: CheckSquare, reminder: Bell, system: Zap }
    return map[type] || Activity
  }

  const actColor = (type: string) => {
    const map: Record<string, string> = { note: t.accent, code: '#30D158', task: '#FF9F0A', reminder: '#FF453A', system: t.accent2 }
    return map[type] || t.accent
  }

  const orderedWidgets = useMemo(() => normalizeLayout(widgets), [widgets])
  const visibleWidgets = orderedWidgets.filter((w) => w.visible)
  const draggedWidget = dragWidgetId ? orderedWidgets.find((w) => w.id === dragWidgetId) ?? null : null
  const maxSnapRows = getSnapRowLimit(visibleWidgets.length)
  const snapRowCount = Math.max(maxSnapRows, ...visibleWidgets.map((w) => w.y), dropCell?.y ?? 1)
  const snapRows = useMemo(
    () => Array.from({ length: snapRowCount + 1 }, (_, i) => i + 1),
    [snapRowCount]
  )
  const occupiedCells = useMemo(() => {
    const map = new Map<string, Widget>()
    visibleWidgets.forEach((w) => {
      if (w.span === 2) {
        map.set(cellKey(w.y, 1), w)
        map.set(cellKey(w.y, 2), w)
        return
      }
      map.set(cellKey(w.y, w.x), w)
    })
    return map
  }, [visibleWidgets])

  const widgetContent = buildDashboardWidgetContent({
    theme: t,
    setView,
    notes,
    tasks,
    reminders,
    codes,
    recentNotes,
    urgentReminders,
    recentActivity,
    noteSpark,
    taskSpark,
    pinnedNotes,
    doneTasks,
    pendingTasks,
    overdueReminders,
    tasksByStatus,
    actIcon,
    actColor,
    accentRgb: rgb,
  })

  return (
    <div className="h-full overflow-y-auto custom-scrollbar" style={{ padding: '20px 24px', position: 'relative' }}>
      {/* ── Layout editor overlay ── */}
      <AnimatePresence>
        {editLayout && (
          <motion.div
            initial={{ opacity: 0, x: 320 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 320 }}
            style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 320, zIndex: 110, overflow: 'hidden' }}
          >
            <Glass type="modal" glow style={{ height: '100%', borderRadius: 0, borderLeft: '1px solid rgba(255,255,255,0.1)', padding: '16px 14px', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexShrink: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 800 }}>📐 Layout Editor</div>
                <button onClick={() => setEditLayout(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: 0.5, padding: 4, borderRadius: 6, color: 'inherit' }}>
                  <X size={15} />
                </button>
              </div>

              <div style={{ fontSize: 10, opacity: 0.45, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.55 }}>
                Drag Widget auf das Snap-Board oder direkt ins Dashboard-Grid
              </div>

              <div
                style={{
                  flexShrink: 0,
                  borderRadius: 11,
                  border: '1px solid rgba(255,255,255,0.12)',
                  background: 'rgba(255,255,255,0.03)',
                  padding: '8px 8px 9px',
                }}
              >
                <div style={{ fontSize: 10, fontWeight: 700, opacity: 0.58, marginBottom: 6 }}>Snap Board</div>
                <div style={{ display: 'grid', gridTemplateColumns: '34px repeat(2, minmax(0, 1fr))', gap: 5, maxHeight: 190, overflowY: 'auto', paddingRight: 2 }}>
                  {snapRows.map((y) => (
                    <React.Fragment key={`snap-row-${y}`}>
                      <div style={{ fontSize: 9, opacity: 0.45, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>R{y}</div>
                      {([1, 2] as const).map((x) => {
                        const occupied = occupiedCells.get(cellKey(y, x))
                        const invalidForSpan = (draggedWidget?.span ?? 1) === 2 && x === 2
                        const targetX = clampX(x, draggedWidget?.span ?? 1)
                        const isDropTarget = !!dragWidgetId && !invalidForSpan && dropCell?.x === targetX && dropCell?.y === y
                        const occupiedRgb = occupied ? hexToRgb(t.accent) : rgb
                        return (
                          <button
                            key={`cell-${y}-${x}`}
                            disabled={invalidForSpan}
                            onDragOver={(e) => {
                              if (!dragWidgetId || invalidForSpan) return
                              e.preventDefault()
                              setDropCell({ x: targetX, y })
                            }}
                            onDrop={(e) => {
                              if (!dragWidgetId || invalidForSpan) return
                              e.preventDefault()
                              onGridDrop({ x: targetX, y })
                            }}
                            style={{
                              border: `1px dashed ${isDropTarget ? t.accent : 'rgba(255,255,255,0.16)'}`,
                              background: isDropTarget
                                ? `rgba(${hexToRgb(t.accent)},0.15)`
                                : occupied
                                  ? `rgba(${occupiedRgb},0.08)`
                                  : 'rgba(255,255,255,0.02)',
                              borderRadius: 7,
                              minHeight: 24,
                              padding: '3px 5px',
                              textAlign: 'left',
                              cursor: invalidForSpan ? 'not-allowed' : 'copy',
                              opacity: invalidForSpan ? 0.24 : 1,
                              color: 'inherit',
                            }}
                          >
                            {occupied ? (
                              <span style={{ fontSize: 9, display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {occupied.icon} {occupied.label}
                              </span>
                            ) : (
                              <span style={{ fontSize: 8, opacity: 0.45 }}>Drop</span>
                            )}
                          </button>
                        )
                      })}
                    </React.Fragment>
                  ))}
                </div>
              </div>

              <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6, marginTop: 10 }}>
                {orderedWidgets.map((w) => {
                  const accentRgb = hexToRgb(t.accent)
                  const isDragging = dragWidgetId === w.id
                  return (
                    <div
                      key={w.id}
                      draggable
                      onDragStart={(e) => startDrag(e, w.id)}
                      onDragEnd={clearDragState}
                      onDragOver={(e) => {
                        if (!dragWidgetId) return
                        e.preventDefault()
                        setDropCell({ x: clampX(w.x, draggedWidget?.span ?? 1), y: w.y })
                      }}
                      onDrop={(e) => {
                        if (!dragWidgetId) return
                        e.preventDefault()
                        onGridDrop({ x: clampX(w.x, draggedWidget?.span ?? 1), y: w.y })
                      }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        padding: '9px 11px', borderRadius: 10,
                        background: w.visible ? `rgba(${accentRgb},0.09)` : 'rgba(255,255,255,0.03)',
                        border: `1px solid ${dropCell?.x === w.x && dropCell?.y === w.y && dragWidgetId ? t.accent : w.visible ? `rgba(${accentRgb},0.22)` : 'rgba(255,255,255,0.07)'}`,
                        transition: 'all 0.12s',
                        opacity: isDragging ? 0.58 : 1,
                      }}
                    >
                      <GripVertical size={13} style={{ opacity: 0.4, cursor: 'grab' }} />
                      <span style={{ fontSize: 14 }}>{w.icon}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, opacity: w.visible ? 1 : 0.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{w.label}</div>
                        <div style={{ fontSize: 9, opacity: 0.42, marginTop: 1 }}>
                          {w.visible ? 'sichtbar' : 'versteckt'} · {w.span} Spalte{w.span === 2 ? 'n' : ''} · R{w.y} C{w.x}
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: 2 }}>
                        {([1, 2] as const).map((s) => (
                          <button
                            key={s}
                            onClick={() => setSpan(w.id, s)}
                            style={{ width: 24, height: 18, borderRadius: 4, border: `1px solid ${w.span === s ? t.accent : 'rgba(255,255,255,0.12)'}`, background: w.span === s ? t.accent : 'transparent', cursor: 'pointer', fontSize: 9, fontWeight: 800, color: w.span === s ? '#fff' : 'inherit' }}
                          >
                            {s}w
                          </button>
                        ))}
                      </div>

                      <div style={{ display: 'flex', gap: 2 }}>
                        <button
                          onClick={() => setWidgetColumn(w.id, 1)}
                          disabled={w.span === 2}
                          style={{
                            width: 24, height: 18, borderRadius: 4,
                            border: `1px solid ${w.x === 1 ? t.accent : 'rgba(255,255,255,0.12)'}`,
                            background: w.x === 1 ? `rgba(${accentRgb},0.22)` : 'transparent',
                            cursor: w.span === 2 ? 'not-allowed' : 'pointer', fontSize: 9, fontWeight: 800,
                            color: w.x === 1 ? t.accent : 'inherit',
                            opacity: w.span === 2 ? 0.4 : 1,
                          }}
                        >
                          C1
                        </button>
                        <button
                          onClick={() => setWidgetColumn(w.id, 2)}
                          disabled={w.span === 2}
                          style={{
                            width: 24, height: 18, borderRadius: 4,
                            border: `1px solid ${w.x === 2 ? t.accent : 'rgba(255,255,255,0.12)'}`,
                            background: w.x === 2 ? `rgba(${accentRgb},0.22)` : 'transparent',
                            cursor: w.span === 2 ? 'not-allowed' : 'pointer', fontSize: 9, fontWeight: 800,
                            color: w.x === 2 ? t.accent : 'inherit',
                            opacity: w.span === 2 ? 0.4 : 1,
                          }}
                        >
                          C2
                        </button>
                      </div>

                      <button onClick={() => nudgeWidgetRow(w.id, -1)} style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: 0.5, padding: '1px 2px', color: 'inherit' }} title="Eine Zeile nach oben">R-</button>
                      <button onClick={() => nudgeWidgetRow(w.id, 1)} style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: 0.5, padding: '1px 2px', color: 'inherit' }} title="Eine Zeile nach unten">R+</button>

                      <button onClick={() => moveWidget(w.id, -1)} style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: 0.5, padding: '1px 2px', color: 'inherit' }}><ChevronUp size={12} /></button>
                      <button onClick={() => moveWidget(w.id, 1)} style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: 0.5, padding: '1px 2px', color: 'inherit' }}><ChevronDown size={12} /></button>

                      <button onClick={() => toggleWidget(w.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: w.visible ? t.accent : 'inherit', opacity: w.visible ? 1 : 0.45, padding: '1px 3px' }}>
                        {w.visible ? <Eye size={13} /> : <EyeOff size={13} />}
                      </button>
                    </div>
                  )
                })}
              </div>

              <div style={{ flexShrink: 0, marginTop: 4, display: 'flex', gap: 6 }}>
                <button onClick={resetLayout} style={{ flex: 1, padding: '8px', borderRadius: 9, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', fontSize: 11, color: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  <RotateCcw size={11} /> Reset Layout
                </button>
              </div>
            </Glass>
          </motion.div>
        )}
      </AnimatePresence>

      <div style={{ maxWidth: 1140, margin: '0 auto', paddingRight: editLayout ? 318 : 0, transition: 'padding-right 0.2s ease' }}>
        {/* ── Header ── */}
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <div style={{ fontSize: 11, opacity: 0.4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 4 }}>{today}</div>
              <h1 style={{ fontSize: 30, fontWeight: 900, letterSpacing: '-0.03em', lineHeight: 1, background: `linear-gradient(135deg, #fff 30%, ${t.accent})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                {greeting} ✦
              </h1>
              <p style={{ fontSize: 12, opacity: 0.4, marginTop: 6 }}>
                {pendingTasks > 0 ? `${pendingTasks} offene Tasks` : 'Alle Tasks erledigt ✓'}
                {overdueReminders > 0 && ` · ${overdueReminders} überfällige Erinnerung${overdueReminders > 1 ? 'en' : ''}`}
              </p>
            </div>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <QuickChip icon={FileText} label="Neue Notiz" color={t.accent} onClick={() => setView?.('notes')} />
              <QuickChip icon={CheckSquare} label="Tasks" color="#FF9F0A" onClick={() => setView?.('tasks')} />
              <QuickChip icon={Code} label="Code" color="#30D158" onClick={() => setView?.('code')} />
              <QuickChip icon={GitBranch} label="Canvas" color={t.accent2} onClick={() => setView?.('canvas')} />
              <button
                onClick={() => setEditLayout((v) => !v)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '7px 12px',
                  borderRadius: 999,
                  border: `1px solid ${editLayout ? t.accent : 'rgba(255,255,255,0.14)'}`,
                  background: editLayout ? `rgba(${hexToRgb(t.accent)},0.17)` : 'rgba(255,255,255,0.05)',
                  color: editLayout ? t.accent : 'inherit',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                <Layout size={12} />
                {editLayout ? 'Editor aktiv' : 'Layout bearbeiten'}
              </button>
            </div>
          </div>
        </motion.div>

        {/* ── Dynamic widget grid (snap via CSS Grid) ── */}
        <div
          ref={gridRef}
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
            gridAutoRows: `minmax(${SNAP_ROW_HEIGHT}px, auto)`,
            gap: 16,
            alignItems: 'stretch',
          }}
          onDragOver={(e) => {
            if (!editLayout || !dragWidgetId) return
            setDropCellFromPointer(e)
          }}
          onDrop={(e) => {
            if (!editLayout) return
            e.preventDefault()
            onGridDrop()
          }}
        >
          {visibleWidgets.map((w, idx) => (
            <motion.div
              key={w.id}
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={editLayout ? undefined : { filter: 'brightness(1.03)' }}
              transition={{
                ...motionRuntime.spring,
                delay: idx * 0.03,
                duration: 0.22,
              }}
              style={{
                gridColumn: `${w.x} / span ${w.span}`,
                gridRow: `${w.y} / span 1`,
                minHeight: 0,
                position: 'relative',
                borderRadius: 12,
                border: editLayout && dragWidgetId && dropCell?.x === clampX(w.x, draggedWidget?.span ?? 1) && dropCell?.y === w.y
                  ? `1px dashed ${t.accent}`
                  : '1px solid transparent',
              }}
              draggable={editLayout}
              onDragStartCapture={(e) => {
                if (!editLayout) return
                startDrag(e, w.id)
              }}
              onDragOver={(e) => {
                if (!editLayout || !dragWidgetId) return
                e.preventDefault()
                setDropCell({ x: clampX(w.x, draggedWidget?.span ?? 1), y: w.y })
              }}
              onDrop={(e) => {
                if (!editLayout || !dragWidgetId) return
                e.preventDefault()
                onGridDrop({ x: clampX(w.x, draggedWidget?.span ?? 1), y: w.y })
              }}
              onDragEnd={clearDragState}
            >
              {editLayout && (
                <div style={{ position: 'absolute', top: 8, right: 8, zIndex: 2, display: 'flex', alignItems: 'center', gap: 5, padding: '4px 7px', borderRadius: 999, background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(255,255,255,0.12)', fontSize: 10, fontWeight: 700, opacity: 0.9 }}>
                  <GripVertical size={10} /> {w.label} · R{w.y} C{w.x}
                </div>
              )}
              {widgetContent[w.id]}
            </motion.div>
          ))}
          {editLayout && dragWidgetId && dropCell && (
            <div
              style={{
                gridColumn: `${dropCell.x} / span ${draggedWidget?.span ?? 1}`,
                gridRow: `${dropCell.y} / span 1`,
                borderRadius: 12,
                border: `1px dashed ${t.accent}`,
                background: `linear-gradient(135deg, rgba(${hexToRgb(t.accent)},0.16), rgba(${hexToRgb(t.accent2)},0.1))`,
                boxShadow: `0 0 20px rgba(${hexToRgb(t.accent)},0.3)`,
                minHeight: SNAP_ROW_HEIGHT,
                pointerEvents: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 11,
                fontWeight: 700,
                color: t.accent,
              }}
            >
              Snap: R{dropCell.y} C{dropCell.x}
            </div>
          )}
        </div>

        {/* ── Footer tip ── */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }} style={{ marginTop: 16, textAlign: 'center', fontSize: 10, opacity: 0.28 }}>
          <Sparkles size={10} style={{ display: 'inline', marginRight: 5 }} />
          <button
            onClick={() => setEditLayout((e) => !e)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 9px', borderRadius: 7,
              background: editLayout ? `rgba(${hexToRgb(t.accent)},0.15)` : `rgba(255,255,255,0.06)`,
              border: `1px solid ${editLayout ? t.accent : 'rgba(255,255,255,0.1)'}`,
              cursor: 'pointer', fontSize: 10, color: editLayout ? t.accent : 'inherit', fontWeight: 700, marginRight: 8,
            }}
          >
            <Layout size={10} /> {editLayout ? 'Close Editor' : 'Edit Layout'}
          </button>
          Drag Widgets im Grid oder im Editor · Snap via Grid-Spalten
        </motion.div>
      </div>
    </div>
  )
}
