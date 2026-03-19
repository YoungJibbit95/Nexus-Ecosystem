import React, { useState, useEffect, useMemo, useRef, lazy, Suspense } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTheme, GLOBAL_FONTS } from './store/themeStore'
import { useTerminal } from './store/terminalStore'
import { Sidebar, View } from './components/Sidebar'
import { TitleBar } from './components/TitleBar'
import { buildBackground } from './lib/visualUtils'
import { hexToRgb } from './lib/utils'
import {
  applyAccessibilityFlags,
  applyGlobalFont,
  applyPanelDensity,
  applyTypographyScale,
  sanitizeGlobalFont,
} from '@nexus/core'
import { createNexusRuntime, type NexusRuntime } from '@nexus/api'

const DashboardView = lazy(() => import('./views/DashboardView').then(m => ({ default: m.DashboardView })))
const NotesView = lazy(() => import('./views/NotesView').then(m => ({ default: m.NotesView })))
const CodeView = lazy(() => import('./views/CodeView').then(m => ({ default: m.CodeView })))
const TasksView = lazy(() => import('./views/TasksView').then(m => ({ default: m.TasksView })))
const RemindersView = lazy(() => import('./views/RemindersView').then(m => ({ default: m.RemindersView })))
const CanvasView = lazy(() => import('./views/CanvasView').then(m => ({ default: m.CanvasView })))
const FilesView = lazy(() => import('./views/FilesView').then(m => ({ default: m.FilesView })))
const FluxView = lazy(() => import('./views/FluxView').then(m => ({ default: m.FluxView })))
const SettingsView = lazy(() => import('./views/SettingsView').then(m => ({ default: m.SettingsView })))
const InfoView = lazy(() => import('./views/InfoView').then(m => ({ default: m.InfoView })))
const DevToolsView = lazy(() => import('./views/DevToolsView').then(m => ({ default: m.DevToolsView })))
const NexusTerminal = lazy(() => import('./components/NexusTerminal').then(m => ({ default: m.NexusTerminal })))
const NexusToolbar = lazy(() => import('./components/NexusToolbar').then(m => ({ default: m.NexusToolbar })))

export default function App() {
  const [view, setView] = useState<View>('dashboard')
  const t = useTheme()
  const terminalOpen = useTerminal((s) => s.isOpen)
  const runtimeRef = useRef<NexusRuntime | null>(null)

  useEffect(() => {
    const controlBaseUrl = (import.meta as any).env?.VITE_NEXUS_CONTROL_URL as string | undefined
    const controlIngestKey = (import.meta as any).env?.VITE_NEXUS_CONTROL_INGEST_KEY as string | undefined

    const runtime = createNexusRuntime({
      appId: 'main',
      appVersion: '5.0.0',
      control: {
        enabled: Boolean(controlBaseUrl),
        baseUrl: controlBaseUrl,
        ingestKey: controlIngestKey,
      },
    })
    runtime.start()
    runtimeRef.current = runtime

    return () => {
      runtime.stop()
      runtimeRef.current = null
    }
  }, [])

  useEffect(() => {
    const safeFont = sanitizeGlobalFont(
      t.globalFont,
      GLOBAL_FONTS.map((font) => font.value),
      'system-ui',
    )

    const requestedFont = t.globalFont || 'system-ui'
    if (requestedFont !== safeFont) {
      t.setGlobalFont(safeFont)
    }

    applyGlobalFont(safeFont || 'system-ui, sans-serif')
  }, [t.globalFont, t.setGlobalFont])

  useEffect(() => {
    applyAccessibilityFlags({
      reducedMotion: t.qol?.reducedMotion ?? false,
      highContrast: t.qol?.highContrast ?? false,
    })
  }, [t.qol?.reducedMotion, t.qol?.highContrast])

  useEffect(() => {
    const sz = t.qol?.fontSize ?? 14
    applyTypographyScale({
      fontSize: sz,
      baseline: 14,
      useUiScale: true,
      minUiScale: 0.82,
      maxUiScale: 1.42,
      lockRootFontSizePx: 14,
    })
  }, [t.qol?.fontSize])

  useEffect(() => {
    applyPanelDensity(t.qol?.panelDensity ?? 'comfortable')
  }, [t.qol?.panelDensity])

  useEffect(() => {
    const runtime = runtimeRef.current
    if (!runtime) return

    runtime.connection.sendNavigation(view)
    runtime.connection.syncState('main.activeView', view)
    runtime.performance.trackViewRender(`main:${view}`)
  }, [view])

  const bgStyles = buildBackground(t.background, t.bg, t.mode)
  const accentRgb = hexToRgb(t.accent)
  const accent2Rgb = hexToRgb(t.accent2)
  const sidebarLeft = (t as any).sidebarPosition !== 'right'
  const toolbarBottom = t.toolbar?.position !== 'top'
  const toolbarVisible = t.toolbar?.visible !== false
  const sidebarHidden = (t as any).sidebarStyle === 'hidden'

  const motionPreset = useMemo(() => {
    const style = (t.animations as any).entranceStyle ?? 'fade'
    if (!t.animations.pageTransitions) {
      return { initial: false as const, animate: { opacity: 1 }, exit: undefined }
    }

    switch (style) {
      case 'slide':
        return {
          initial: { opacity: 0, x: 16 },
          animate: { opacity: 1, x: 0 },
          exit: { opacity: 0, x: -16 },
        }
      case 'scale':
        return {
          initial: { opacity: 0, scale: 0.985 },
          animate: { opacity: 1, scale: 1 },
          exit: { opacity: 0, scale: 1.01 },
        }
      case 'bounce':
        return {
          initial: { opacity: 0, y: 18, scale: 0.98 },
          animate: { opacity: 1, y: 0, scale: 1 },
          exit: { opacity: 0, y: -10, scale: 0.99 },
        }
      case 'flip':
        return {
          initial: { opacity: 0, rotateX: -8, y: 10 },
          animate: { opacity: 1, rotateX: 0, y: 0 },
          exit: { opacity: 0, rotateX: 8, y: -10 },
        }
      default:
        return {
          initial: { opacity: 0, y: 8 },
          animate: { opacity: 1, y: 0 },
          exit: { opacity: 0, y: -8 },
        }
    }
  }, [t.animations])

  const viewMap: Record<View, React.ReactNode> = {
    dashboard: <DashboardView setView={(v: any) => setView(v)} />,
    notes: <NotesView />,
    code: <CodeView />,
    tasks: <TasksView />,
    reminders: <RemindersView />,
    canvas: <CanvasView />,
    files: <FilesView />,
    flux: <FluxView />,
    settings: <SettingsView />,
    info: <InfoView />,
    devtools: <DevToolsView />,
  }

  const toolbarEl = toolbarVisible ? (
    <div style={{
      position: 'relative', zIndex: 500,
      display: 'flex', justifyContent: 'center',
      padding: toolbarBottom ? '0 0 6px' : '6px 0 0',
      pointerEvents: 'none',
    }}>
      <div style={{ pointerEvents: 'auto', width: '100%' }}>
        <Suspense fallback={null}>
          <NexusToolbar setView={setView} />
        </Suspense>
      </div>
    </div>
  ) : null

  return (
    <div
      className="nx-app-shell"
      style={{
        color: t.mode === 'dark' ? '#f8f8fc' : '#15161d',
        ...bgStyles,
        fontSize: `var(--nx-font-size, 14px)`,
      }}
    >
      <div
        aria-hidden="true"
        className="nx-ambient-layer"
        style={{
          background: `
            radial-gradient(650px circle at 10% 14%, rgba(${accentRgb},0.2), transparent 55%),
            radial-gradient(580px circle at 88% 14%, rgba(${accent2Rgb},0.18), transparent 60%),
            radial-gradient(520px circle at 60% 95%, rgba(${accentRgb},0.14), transparent 65%)
          `,
        }}
      />

      <div
        className="nx-shell-window"
        style={{
          width: 'calc(100% / var(--nx-ui-scale, 1))',
          height: 'calc(100% / var(--nx-ui-scale, 1))',
          transform: 'scale(var(--nx-ui-scale, 1))',
          transformOrigin: 'top left',
          borderRadius: 18,
          border: t.mode === 'dark'
            ? '1px solid rgba(255,255,255,0.12)'
            : '1px solid rgba(0,0,0,0.1)',
          boxShadow: t.mode === 'dark'
            ? '0 28px 80px rgba(0,0,0,0.52), 0 0 0 1px rgba(255,255,255,0.04) inset'
            : '0 20px 60px rgba(28,31,42,0.16), 0 0 0 1px rgba(255,255,255,0.6) inset',
        }}
      >
        <TitleBar />
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden', minHeight: 0, flexDirection: sidebarLeft ? 'row' : 'row-reverse' }}>
          <div
            style={{
              width: sidebarHidden ? 0 : t.sidebarWidth,
              flexShrink: 0,
              height: '100%',
              transition: 'width 220ms cubic-bezier(0.2, 0.8, 0.2, 1)',
            }}
          >
            <Sidebar view={view} onChange={setView} />
          </div>
          <div
            style={{
              flex: 1,
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              position: 'relative',
              minHeight: 0,
              background: t.mode === 'dark' ? 'rgba(7,8,13,0.42)' : 'rgba(255,255,255,0.42)',
            }}
          >
            {!toolbarBottom && toolbarEl}
            <AnimatePresence mode="wait">
              <motion.div
                key={view}
                initial={motionPreset.initial}
                animate={motionPreset.animate}
                exit={motionPreset.exit}
                transition={{ duration: 0.2 * (t.visual.animationSpeed || 1), ease: 'easeInOut' }}
                style={{ flex: 1, overflow: 'hidden', height: '100%', minHeight: 0 }}
              >
                <Suspense
                  fallback={
                    <div style={{
                      height: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      opacity: 0.6,
                      fontSize: 13,
                      fontWeight: 600,
                    }}>
                      Loading view...
                    </div>
                  }
                >
                  {viewMap[view]}
                </Suspense>
              </motion.div>
            </AnimatePresence>
            <Suspense fallback={null}>
              {terminalOpen ? <NexusTerminal setView={setView} /> : null}
            </Suspense>
            {toolbarBottom && toolbarEl}
          </div>
        </div>
      </div>

      {t.background.vignette && (
        <div
          aria-hidden="true"
          style={{
            position: 'fixed',
            inset: 0,
            pointerEvents: 'none',
            zIndex: 1,
            background: `radial-gradient(circle at center, transparent 54%, rgba(0,0,0,${t.background.vignetteStrength * 0.56}) 100%)`,
          }}
        />
      )}

      {!!t.background.overlayOpacity && (
        <div
          aria-hidden="true"
          style={{
            position: 'fixed',
            inset: 0,
            pointerEvents: 'none',
            zIndex: 1,
            background: `rgba(0,0,0,${t.background.overlayOpacity})`,
          }}
        />
      )}

      {t.background.scanlines && (
        <div
          aria-hidden="true"
          style={{
            position: 'fixed',
            inset: 0,
            pointerEvents: 'none',
            zIndex: 1,
            opacity: t.mode === 'dark' ? 0.1 : 0.07,
            backgroundImage: 'repeating-linear-gradient(to bottom, rgba(255,255,255,0.08), rgba(255,255,255,0.08) 1px, transparent 1px, transparent 3px)',
          }}
        />
      )}
    </div>
  )
}
