import React, { useCallback, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  CheckCircle2,
  Layout,
  MoreHorizontal,
  RotateCcw,
  X,
} from 'lucide-react'
import { type CaptureIntentType } from '@nexus/core'
import { Glass } from '../components/Glass'
import { ViewHeader } from '../components/ViewHeader'
import { useApp, DashboardWidget } from '../store/appStore'
import { useCanvas } from '../store/canvasStore'
import { useTheme } from '../store/themeStore'
import { useWorkspaces } from '../store/workspaceStore'
import { useWorkspaceHandoff } from '../store/workspaceHandoffStore'
import { hexToRgb } from '../lib/utils'
import { useMobile } from '../lib/useMobile'
import { useRenderSurfaceBudget } from '../render/useRenderSurfaceBudget'
import { useSurfaceMotionRuntime } from '../render/useSurfaceMotionRuntime'
import {
  asObjectArray,
  normalizeDashboardWidgets,
} from './dashboard/mobileDashboardUtils'
import { DashboardActionButton } from './dashboard/mobileDashboardPrimitives'
import {
  MobileDashboardEmptyWidgetsState,
  MobileDashboardHiddenTray,
  MobileDashboardWidgetSafeModeNotice,
} from './dashboard/MobileDashboardSupportSections'
import { MobileDashboardWidgetErrorBoundary } from './dashboard/MobileDashboardWidgetErrorBoundary'
import { MobileDashboardWidgetEditChrome } from './dashboard/MobileDashboardWidgetEditChrome'
import { MobileRuntimeSummaryCard } from './dashboard/MobileRuntimeSummaryCard'
import { useMobileDashboardLayoutEditing } from './dashboard/useMobileDashboardLayoutEditing'
import { useMobileDashboardDerivedData } from './dashboard/useMobileDashboardDerivedData'
import { buildMobileDashboardWidgetContent } from './dashboard/mobileDashboardWidgetContent'

export function DashboardView({ setView }: { setView?: (v: string) => void }) {
  const t = useTheme()
  const mob = useMobile()
  const rgb = hexToRgb(t.accent)
  const {
    notes: rawNotes,
    tasks: rawTasks,
    reminders: rawReminders,
    activities: rawActivities,
    codes: rawCodes,
    addNote,
    addTask,
    addRem,
    addCode,
    updateReminder,
    dashboardWidgets: rawDashboardWidgets,
    setDashboardWidgets,
    resetDashboardWidgets,
  } = useApp()
  const addCanvas = useCanvas((state) => state.addCanvas)
  const canvases = useCanvas((state) => state.canvases)
  const activeCanvasId = useCanvas((state) => state.activeCanvasId)
  const { workspaces: rawWorkspaces, activeWorkspaceId } = useWorkspaces()
  const notes = asObjectArray<any>(rawNotes)
  const tasks = asObjectArray<any>(rawTasks)
  const reminders = asObjectArray<any>(rawReminders)
  const activities = asObjectArray<any>(rawActivities)
  const codes = asObjectArray<any>(rawCodes)
  const dashboardWidgets = asObjectArray<any>(rawDashboardWidgets)
  const workspaces = asObjectArray<any>(rawWorkspaces)

  const handoffMode = useWorkspaceHandoff((state) => state.mode)
  const handoffAction = useWorkspaceHandoff((state) => state.lastAction)
  const handoffActionAt = useWorkspaceHandoff((state) => state.lastActionAt)
  const handoffConfidence = useWorkspaceHandoff((state) => state.confidence)
  const handoffSourceApp = useWorkspaceHandoff((state) => state.lastSourceApp)
  const handoffCheckpoint = useWorkspaceHandoff((state) => state.checkpoint)

  const [editLayout, setEditLayout] = useState(false)
  const [todayMenuOpen, setTodayMenuOpen] = useState(false)
  const [captureMenuOpen, setCaptureMenuOpen] = useState(false)

  const setWidgets = useCallback((next: DashboardWidget[]) => {
    setDashboardWidgets(normalizeDashboardWidgets(next))
  }, [setDashboardWidgets])

  const {
    layoutLocked,
    setLayoutLocked,
    layoutHistory,
    layoutFuture,
    presetMenuOpen,
    setPresetMenuOpen,
    dragState,
    hoveredWidgetId,
    setHoveredWidgetId,
    visible,
    hidden,
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
  } = useMobileDashboardLayoutEditing({
    editLayout,
    dashboardWidgets,
    setWidgets,
  })

  const heroRenderDecision = useRenderSurfaceBudget({
    id: 'mobile-dashboard-hero',
    surfaceClass: 'hero-surface',
    effectClass: 'status-highlight',
    interactionState: 'idle',
    visibilityState: 'visible',
    budgetPriority: 'high',
    areaHint: 980,
    motionClassHint: 'hero',
    transformOwnerHint: 'surface',
    filterOwnerHint: 'surface',
    opacityOwnerHint: 'surface',
  })
  const contentRenderDecision = useRenderSurfaceBudget({
    id: 'mobile-dashboard-content',
    surfaceClass: 'panel-surface',
    effectClass: 'backdrop',
    interactionState: 'idle',
    visibilityState: 'visible',
    budgetPriority: 'normal',
    areaHint: 760,
    motionClassHint: 'content',
    transformOwnerHint: 'surface',
    filterOwnerHint: 'surface',
    opacityOwnerHint: 'surface',
  })
  const heroSurfaceMotion = useSurfaceMotionRuntime(heroRenderDecision, { family: 'hero' })
  const contentSurfaceMotion = useSurfaceMotionRuntime(contentRenderDecision, { family: 'content' })
  const reducedMotion = Boolean(t.qol?.reducedMotion)
    || heroSurfaceMotion.capability === 'static-safe'
    || contentSurfaceMotion.capability === 'static-safe'
    || heroSurfaceMotion.complexity === 'none'
    || contentSurfaceMotion.complexity === 'none'
  const heroMotion = useMemo(
    () => ({
      allowEntry: heroSurfaceMotion.allowEntry && !reducedMotion,
      allowHover: heroSurfaceMotion.allowHover && !reducedMotion,
      allowStagger: heroSurfaceMotion.allowStagger && !reducedMotion,
      hoverLiftPx: Math.max(0.45, heroSurfaceMotion.hoverLiftPx),
      hoverScale: Math.max(1.001, heroSurfaceMotion.hoverScale),
      transition: heroSurfaceMotion.transition,
      timings: {
        transformMs: Math.max(150, heroSurfaceMotion.timings.regularMs),
        materialMs: Math.max(130, heroSurfaceMotion.timings.materialMs),
        materialDelayMs: reducedMotion ? 0 : Math.max(14, heroSurfaceMotion.timings.materialDelayMs),
        easing: heroSurfaceMotion.timings.easing,
        framerEase: heroSurfaceMotion.timings.framerEase,
      },
    }),
    [heroSurfaceMotion, reducedMotion],
  )
  const contentMotion = useMemo(
    () => ({
      allowEntry: contentSurfaceMotion.allowEntry && !reducedMotion,
      allowHover: contentSurfaceMotion.allowHover && !reducedMotion,
      allowStagger: contentSurfaceMotion.allowStagger && !reducedMotion,
      hoverLiftPx: Math.max(0.45, contentSurfaceMotion.hoverLiftPx),
      hoverScale: Math.max(1.001, contentSurfaceMotion.hoverScale),
      transition: contentSurfaceMotion.transition,
      timings: {
        transformMs: Math.max(145, contentSurfaceMotion.timings.transformMs),
        materialMs: Math.max(124, contentSurfaceMotion.timings.materialMs),
        materialDelayMs: reducedMotion ? 0 : Math.max(10, contentSurfaceMotion.timings.materialDelayMs),
        easing: contentSurfaceMotion.timings.easing,
        framerEase: contentSurfaceMotion.timings.framerEase,
      },
    }),
    [contentSurfaceMotion, reducedMotion],
  )
  const widgetEntryDelayMs = contentMotion.allowStagger ? 20 : 10
  const heroFramerEase = heroMotion.timings.framerEase
  const contentFramerEase = contentMotion.timings.framerEase

  const {
    doneTasks,
    openTasks,
    overdueReminders,
    upcomingReminders,
    recentNotes,
    recentActivity,
    pinnedNotes,
    todaySummary,
    taskProgress,
    greeting,
    resumeLane,
    runCaptureIntent,
    snoozeOverdue,
    activeWorkspace,
  } = useMobileDashboardDerivedData({
    notes,
    tasks,
    reminders,
    activities,
    codes,
    canvases,
    activeCanvasId,
    workspaces,
    activeWorkspaceId,
    setView,
    addNote,
    addTask,
    addRem,
    addCode,
    addCanvas,
    updateReminder,
  })

  const { widgetNodes, widgetContentBuildError } = useMemo(
    () => {
      try {
        return {
          widgetNodes: buildMobileDashboardWidgetContent({
            t,
            rgb,
            mob,
            notes,
            tasks,
            reminders,
            codes,
            recentNotes,
            upcomingReminders,
            recentActivity,
            pinnedNotes,
            doneTasks,
            openTasks,
            overdueReminders,
            taskProgress,
            runCaptureIntent,
            setView,
          }),
          widgetContentBuildError: null as string | null,
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error || 'unknown')
        console.error('[Mobile Dashboard] widget content build failed', error)
        return {
          widgetNodes: {} as Partial<Record<string, React.ReactNode>>,
          widgetContentBuildError: message,
        }
      }
    },
    [
      t,
      rgb,
      mob,
      notes,
      tasks,
      reminders,
      codes,
      recentNotes,
      upcomingReminders,
      recentActivity,
      pinnedNotes,
      doneTasks,
      openTasks,
      overdueReminders,
      taskProgress,
      runCaptureIntent,
      setView,
    ],
  )

  return (
    <div className="h-full overflow-y-auto" style={{ padding: mob.isMobile ? '10px 12px 12px' : '14px 20px 20px' }}>
      <ViewHeader
        title={`${greeting} ✦`}
        subtitle={`${openTasks} offene Tasks · ${overdueReminders} überfällige Erinnerungen`}
        right={
          <DashboardActionButton
            onClick={() => setEditLayout((s) => !s)}
            liquidColor={editLayout ? t.accent : t.accent2}
            style={{
              border: `1px solid ${editLayout ? t.accent : 'rgba(255,255,255,0.14)'}`,
              borderRadius: 10,
              padding: '7px 10px',
              fontSize: 11,
              fontWeight: 700,
              background: editLayout ? `rgba(${rgb},0.18)` : 'rgba(255,255,255,0.05)',
              color: editLayout ? t.accent : 'inherit',
              cursor: 'pointer',
              display: 'inline-flex',
              gap: 6,
              alignItems: 'center',
            }}
          >
            <Layout size={12} /> Layout
          </DashboardActionButton>
        }
      />

      <Glass gradient style={{ padding: '12px', marginBottom: 12, background: `linear-gradient(145deg, rgba(${rgb},0.34), rgba(${hexToRgb(t.accent2)},0.22) 58%, rgba(255,255,255,0.03))` }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, fontWeight: 800, color: t.accent }}>Today Layer</span>
            <span style={{ fontSize: 11, opacity: 0.72 }}>Open: <b>{todaySummary.openTaskCount}</b></span>
            <span style={{ fontSize: 11, opacity: 0.72 }}>Today: <b>{todaySummary.dueTodayCount}</b></span>
            <span style={{ fontSize: 11, opacity: 0.72, color: todaySummary.overdueCount > 0 ? '#ff453a' : 'inherit' }}>
              Overdue: <b>{todaySummary.overdueCount}</b>
            </span>
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <DashboardActionButton
              onClick={() => setView?.('tasks')}
              liquidColor="#ff9f0a"
              style={{ padding: '5px 9px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.14)', background: 'rgba(255,255,255,0.05)', color: 'inherit', fontSize: 10, fontWeight: 700, cursor: 'pointer' }}
            >
              Tasks
            </DashboardActionButton>
            <DashboardActionButton
              onClick={() => setView?.('reminders')}
              liquidColor={t.accent}
              style={{ padding: '5px 9px', borderRadius: 8, border: `1px solid rgba(${rgb},0.3)`, background: `rgba(${rgb},0.14)`, color: t.accent, fontSize: 10, fontWeight: 700, cursor: 'pointer' }}
            >
              Reminders
            </DashboardActionButton>
            <div style={{ position: 'relative' }}>
              <DashboardActionButton
                onClick={() => setTodayMenuOpen((open) => !open)}
                liquidColor={todayMenuOpen ? t.accent : t.accent2}
                style={{
                  padding: '5px 8px',
                  borderRadius: 8,
                  border: '1px solid rgba(255,255,255,0.14)',
                  background: todayMenuOpen ? `rgba(${rgb},0.14)` : 'rgba(255,255,255,0.05)',
                  color: todayMenuOpen ? t.accent : 'inherit',
                  fontSize: 10,
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                Mehr <MoreHorizontal size={11} />
              </DashboardActionButton>
              {todayMenuOpen ? (
                <div style={{ position: 'absolute', top: 'calc(100% + 6px)', right: 0, zIndex: 60, minWidth: 150, borderRadius: 10, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(17,20,31,0.96)', backdropFilter: 'blur(12px)', padding: 6, boxShadow: '0 14px 34px rgba(0,0,0,0.35)' }}>
                  <DashboardActionButton
                    onClick={() => { snoozeOverdue(15); setTodayMenuOpen(false) }}
                    liquidColor="#ff9f0a"
                    style={{ width: '100%', border: 'none', borderRadius: 8, background: 'transparent', color: '#ff9f0a', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', fontSize: 12, fontWeight: 650 }}
                  >
                    Snooze +15m
                  </DashboardActionButton>
                  <DashboardActionButton
                    onClick={() => { snoozeOverdue(60); setTodayMenuOpen(false) }}
                    liquidColor="#ff9f0a"
                    style={{ width: '100%', border: 'none', borderRadius: 8, background: 'transparent', color: '#ff9f0a', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', fontSize: 12, fontWeight: 650 }}
                  >
                    Snooze +1h
                  </DashboardActionButton>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', marginTop: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 10, opacity: 0.54, textTransform: 'uppercase', letterSpacing: 0.5 }}>Quick Capture</span>
            <DashboardActionButton
              onClick={() => runCaptureIntent('note')}
              liquidColor={t.accent}
              style={{ padding: '5px 9px', borderRadius: 999, border: `1px solid rgba(${rgb},0.25)`, background: `rgba(${rgb},0.14)`, color: t.accent, fontSize: 10, fontWeight: 800, cursor: 'pointer' }}
            >
              + Note
            </DashboardActionButton>
            <DashboardActionButton
              onClick={() => runCaptureIntent('task')}
              liquidColor="#ff9f0a"
              style={{ padding: '5px 9px', borderRadius: 999, border: '1px solid rgba(255,159,10,0.32)', background: 'rgba(255,159,10,0.14)', color: '#ffb547', fontSize: 10, fontWeight: 800, cursor: 'pointer' }}
            >
              + Task
            </DashboardActionButton>
            <DashboardActionButton
              onClick={() => runCaptureIntent('reminder')}
              liquidColor="#ff453a"
              style={{ padding: '5px 9px', borderRadius: 999, border: '1px solid rgba(255,69,58,0.32)', background: 'rgba(255,69,58,0.14)', color: '#ff7d75', fontSize: 10, fontWeight: 800, cursor: 'pointer' }}
            >
              + Reminder
            </DashboardActionButton>
            <div style={{ position: 'relative' }}>
              <DashboardActionButton
                onClick={() => setCaptureMenuOpen((open) => !open)}
                liquidColor={captureMenuOpen ? t.accent : t.accent2}
                style={{
                  padding: '5px 8px',
                  borderRadius: 999,
                  border: '1px solid rgba(255,255,255,0.14)',
                  background: captureMenuOpen ? `rgba(${rgb},0.14)` : 'rgba(255,255,255,0.05)',
                  color: captureMenuOpen ? t.accent : 'inherit',
                  fontSize: 10,
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                Mehr <MoreHorizontal size={11} />
              </DashboardActionButton>
              {captureMenuOpen ? (
                <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 60, minWidth: 150, borderRadius: 10, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(17,20,31,0.96)', backdropFilter: 'blur(12px)', padding: 6, boxShadow: '0 14px 34px rgba(0,0,0,0.35)' }}>
                  {([
                    { type: 'code', label: 'Code' },
                    { type: 'canvas', label: 'Canvas' },
                  ] as Array<{ type: CaptureIntentType; label: string }>).map((entry) => (
                    <DashboardActionButton
                      key={entry.type}
                      onClick={() => { runCaptureIntent(entry.type); setCaptureMenuOpen(false) }}
                      liquidColor={entry.type === 'task' ? '#ff9f0a' : entry.type === 'reminder' ? '#ff453a' : entry.type === 'code' ? '#30d158' : '#64d2ff'}
                      style={{ width: '100%', border: 'none', borderRadius: 8, background: 'transparent', color: 'inherit', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', fontSize: 12, fontWeight: 650 }}
                    >
                      + {entry.label}
                    </DashboardActionButton>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 10, opacity: 0.54, textTransform: 'uppercase', letterSpacing: 0.5 }}>Workspace</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: activeWorkspace?.color || t.accent }}>
              {activeWorkspace ? `${activeWorkspace.icon} ${activeWorkspace.name}` : 'Global'}
            </span>
            <span style={{
              padding: '2px 7px',
              borderRadius: 999,
              fontSize: 10,
              fontWeight: 700,
              border: handoffConfidence === 'fresh' ? '1px solid rgba(48,209,88,0.35)' : handoffConfidence === 'stale' ? '1px solid rgba(255,159,10,0.35)' : `1px solid rgba(${rgb},0.3)`,
              background: handoffConfidence === 'fresh' ? 'rgba(48,209,88,0.12)' : handoffConfidence === 'stale' ? 'rgba(255,159,10,0.12)' : `rgba(${rgb},0.13)`,
              color: handoffConfidence === 'fresh' ? '#30d158' : handoffConfidence === 'stale' ? '#ff9f0a' : t.accent,
            }}>
              {handoffConfidence === 'fresh' ? 'Fresh' : handoffConfidence === 'stale' ? 'Stale' : 'Recent'}
            </span>
            {handoffCheckpoint ? (
              <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 999, border: '1px solid rgba(255,255,255,0.16)', background: 'rgba(255,255,255,0.05)', opacity: 0.82 }}>
                Restore bereit
              </span>
            ) : null}
            <span style={{ fontSize: 10, opacity: 0.58 }}>
              {handoffMode === 'manual-runtime' ? 'Manual runtime handoff' : handoffMode}
              {handoffSourceApp ? ` · ${handoffSourceApp}` : ''}
              {handoffAction ? ` · ${handoffAction}` : ''}
              {handoffActionAt ? ` · ${new Date(handoffActionAt).toLocaleString()}` : ''}
            </span>
          </div>
        </div>
      </Glass>

      <motion.div
        initial={contentMotion.allowEntry ? { opacity: 0, y: 8 } : false}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: Math.max(0.14, contentMotion.timings.materialMs / 1000), ease: contentFramerEase }}
        style={{ marginBottom: 12 }}
      >
        <MobileRuntimeSummaryCard t={t} rgb={rgb} resumeLane={resumeLane} />
      </motion.div>

      <MobileDashboardHiddenTray
        editLayout={editLayout}
        heroMotion={heroMotion}
        heroFramerEase={heroFramerEase}
        hidden={hidden}
        toggleWidget={toggleWidget}
        t={t}
        rgb={rgb}
        layoutLocked={layoutLocked}
      />
      <MobileDashboardWidgetSafeModeNotice
        error={widgetContentBuildError}
        resetLayout={resetLayout}
        t={t}
        rgb={rgb}
      />

      {visible.length === 0 ? (
        <MobileDashboardEmptyWidgetsState
          visible={visible}
          setEditLayout={setEditLayout}
          t={t}
          rgb={rgb}
        />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: mob.isMobile ? '1fr' : '1fr 1fr', gap: 12 }}>
          {visible.map((w, idx) => (
            <motion.div
              key={w.id}
              data-mobile-dashboard-widget-id={w.id}
              layout
              initial={contentMotion.allowEntry ? { opacity: 0, y: 8, scale: 0.998 } : false}
              animate={{
                opacity: 1,
                y: 0,
                scale:
                  dragState?.widgetId === w.id
                    ? 1.02
                    : dragState?.targetWidgetId === w.id
                      ? 1.01
                      : contentMotion.allowHover && hoveredWidgetId === w.id
                        ? Math.max(1.002, contentMotion.hoverScale + 0.002)
                        : 1,
              }}
              transition={{
                opacity: {
                  duration: Math.max(0.14, contentMotion.timings.transformMs / 1000),
                  ease: contentFramerEase,
                  delay: Math.min(idx, 14) * (widgetEntryDelayMs / 1000),
                },
                y: {
                  duration: Math.max(0.14, contentMotion.timings.transformMs / 1000),
                  ease: contentFramerEase,
                  delay: Math.min(idx, 14) * (widgetEntryDelayMs / 1000),
                },
                scale: {
                  type: 'spring',
                  stiffness: contentMotion.allowStagger ? 430 : 390,
                  damping: contentMotion.allowStagger ? 26 : 30,
                  mass: 0.68,
                },
              }}
              onHoverStart={() => {
                if (!contentMotion.allowHover) return
                setHoveredWidgetId(w.id)
              }}
              onHoverEnd={() => {
                setHoveredWidgetId((current) => (current === w.id ? null : current))
              }}
              style={{
                gridColumn: mob.isMobile ? 'span 1' : `span ${w.span === 2 ? 2 : 1}`,
                position: 'relative',
                borderRadius: 12,
                border: editLayout && dragState?.targetWidgetId === w.id
                  ? `1px dashed ${t.accent}`
                  : '1px solid transparent',
              }}
            >
              {editLayout ? (
                <MobileDashboardWidgetEditChrome
                  w={w}
                  beginPointerDrag={beginPointerDrag}
                  cancelLongPress={cancelLongPress}
                  longPressOriginRef={longPressOriginRef}
                  dragState={dragState}
                  setSpan={setSpan}
                  move={move}
                  toggleWidget={toggleWidget}
                  t={t}
                  rgb={rgb}
                  layoutLocked={layoutLocked}
                  mob={mob}
                />
              ) : null}
              <MobileDashboardWidgetErrorBoundary
                widgetLabel={w.label}
                onResetLayout={resetLayout}
              >
                {widgetNodes[w.id] || (
                  <Glass style={{ minHeight: 120, padding: 12 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
                      Widget nicht verfügbar
                    </div>
                    <div style={{ fontSize: 11, opacity: 0.66 }}>
                      {w.label} konnte nicht geladen werden.
                    </div>
                  </Glass>
                )}
              </MobileDashboardWidgetErrorBoundary>
            </motion.div>
          ))}
        </div>
      )}

      {editLayout ? (
        <div style={{
          position: 'fixed',
          left: 12,
          right: 12,
          bottom: mob.isMobile ? 76 : 24,
          zIndex: 80,
          display: 'flex',
          gap: 8,
          flexWrap: 'wrap',
          padding: '8px 10px',
          borderRadius: 14,
          border: '1px solid rgba(255,255,255,0.12)',
          background: 'rgba(17,20,31,0.92)',
          backdropFilter: 'blur(14px)',
        }}>
          <DashboardActionButton onClick={() => setLayoutLocked((v) => !v)} liquidColor={layoutLocked ? '#ff9f0a' : t.accent} style={{ border: `1px solid ${layoutLocked ? 'rgba(255,159,10,0.35)' : `rgba(${rgb},0.3)`}`, background: layoutLocked ? 'rgba(255,159,10,0.12)' : `rgba(${rgb},0.14)`, color: layoutLocked ? '#ff9f0a' : t.accent, borderRadius: 10, padding: '6px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>{layoutLocked ? 'Layout Locked' : 'Lock Layout'}</DashboardActionButton>
          <DashboardActionButton onClick={undoLayoutChange} liquidColor="#64d2ff" style={{ border: '1px solid rgba(100,210,255,0.35)', background: 'rgba(100,210,255,0.12)', color: '#64d2ff', borderRadius: 10, padding: '6px 10px', fontSize: 11, fontWeight: 700, cursor: layoutHistory.length ? 'pointer' : 'not-allowed', opacity: layoutHistory.length ? 1 : 0.45 }}>Undo</DashboardActionButton>
          <DashboardActionButton onClick={redoLayoutChange} liquidColor="#64d2ff" style={{ border: '1px solid rgba(100,210,255,0.35)', background: 'rgba(100,210,255,0.12)', color: '#64d2ff', borderRadius: 10, padding: '6px 10px', fontSize: 11, fontWeight: 700, cursor: layoutFuture.length ? 'pointer' : 'not-allowed', opacity: layoutFuture.length ? 1 : 0.45 }}>Redo</DashboardActionButton>
          <div style={{ position: 'relative' }}>
            <DashboardActionButton onClick={() => setPresetMenuOpen((open) => !open)} liquidColor={presetMenuOpen ? t.accent : t.accent2} style={{ border: '1px solid rgba(255,255,255,0.12)', background: presetMenuOpen ? `rgba(${rgb},0.14)` : 'rgba(255,255,255,0.06)', color: presetMenuOpen ? t.accent : 'inherit', borderRadius: 10, padding: '6px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>Preset</DashboardActionButton>
            {presetMenuOpen ? (
              <div style={{ position: 'absolute', bottom: 'calc(100% + 8px)', left: 0, zIndex: 90, minWidth: 170, borderRadius: 10, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(17,20,31,0.95)', backdropFilter: 'blur(12px)', padding: 6, boxShadow: '0 14px 34px rgba(0,0,0,0.35)' }}>
                {([
                  { id: 'focus', label: 'Focus' },
                  { id: 'balanced', label: 'Balanced' },
                  { id: 'planning', label: 'Planning' },
                ] as const).map((preset) => (
                  <DashboardActionButton key={preset.id} onClick={() => applyLayoutPreset(preset.id)} liquidColor="#64d2ff" style={{ width: '100%', border: 'none', borderRadius: 8, background: 'transparent', color: 'inherit', cursor: 'pointer', textAlign: 'left', padding: '8px 10px', fontSize: 12, fontWeight: 650 }}>{preset.label}</DashboardActionButton>
                ))}
              </div>
            ) : null}
          </div>
          <DashboardActionButton onClick={resetLayout} liquidColor="#ff9f0a" style={{ border: '1px solid rgba(255,159,10,0.35)', background: 'rgba(255,159,10,0.12)', color: '#ff9f0a', borderRadius: 10, padding: '6px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}><RotateCcw size={12} style={{ marginRight: 5, display: 'inline' }} /> Reset</DashboardActionButton>
          <DashboardActionButton onClick={() => setEditLayout(false)} liquidColor="#ff453a" style={{ marginLeft: 'auto', border: '1px solid rgba(255,69,58,0.35)', background: 'rgba(255,69,58,0.12)', color: '#ff453a', borderRadius: 10, padding: '6px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}><X size={12} style={{ marginRight: 5, display: 'inline' }} /> Fertig</DashboardActionButton>
        </div>
      ) : null}

      <div style={{ marginTop: 12, textAlign: 'center', fontSize: 10, opacity: 0.35 }}>
        <CheckCircle2 size={10} style={{ display: 'inline', marginRight: 5 }} />
        Dashboard personalisierbar · Widgets sind persistent gespeichert
      </div>
    </div>
  )
}
