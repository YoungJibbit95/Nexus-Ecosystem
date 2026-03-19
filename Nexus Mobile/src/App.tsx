import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTheme, GLOBAL_FONTS } from './store/themeStore'
import { Sidebar, View } from './components/Sidebar'
import { TitleBar } from './components/TitleBar'
import { MobileNav } from './components/MobileNav'
import { NexusTerminal } from './components/NexusTerminal'
import { NexusToolbar } from './components/NexusToolbar'
import { CommandPalette } from './components/CommandPalette'
import { buildBackground } from './lib/visualUtils'
import { useMobile } from './lib/useMobile'
import { hexToRgb } from './lib/utils'
import {
  applyAccessibilityFlags,
  applyGlobalFont,
  applyPanelDensity,
  applySafeAreaInsets,
  applyTypographyScale,
  NEXUS_VIEW_META,
  sanitizeGlobalFont,
} from '@nexus/core'
import { createNexusRuntime, type NexusRuntime } from '@nexus/api'

import { DashboardView } from './views/DashboardView'
import { NotesView } from './views/NotesView'
import { CodeView } from './views/CodeView'
import { TasksView } from './views/TasksView'
import { RemindersView } from './views/RemindersView'
import { CanvasView } from './views/CanvasView'
import { FilesView } from './views/FilesView'
import { FluxView } from './views/FluxView'
import { SettingsView } from './views/SettingsView'
import { InfoView } from './views/InfoView'
import { DevToolsView } from './views/DevToolsView'

export default function App() {
  const [view, setView] = useState<View>('dashboard')
  const [paletteOpen, setPaletteOpen] = useState(false)
  const setViewStr = (v: string) => setView(v as View)
  const t = useTheme()
  const mob = useMobile()
  const runtimeRef = useRef<NexusRuntime | null>(null)

  useEffect(() => {
    const controlBaseUrl = (import.meta as any).env?.VITE_NEXUS_CONTROL_URL as string | undefined
    const controlIngestKey = (import.meta as any).env?.VITE_NEXUS_CONTROL_INGEST_KEY as string | undefined

    const runtime = createNexusRuntime({
      appId: 'mobile',
      appVersion: '4.0.0',
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
    const sz = t.qol?.fontSize ?? (mob.isMobile ? 15 : 14)
    applyTypographyScale({
      fontSize: sz,
      baseline: 14,
      useUiScale: false,
    })
  }, [t.qol?.fontSize, mob.isMobile])

  useEffect(() => {
    applyPanelDensity(t.qol?.panelDensity ?? 'comfortable')
  }, [t.qol?.panelDensity])

  useEffect(() => {
    applySafeAreaInsets(mob.safeTop, mob.safeBottom)
  }, [mob.safeTop, mob.safeBottom])

  useEffect(() => {
    const runtime = runtimeRef.current
    if (!runtime) return

    runtime.connection.sendNavigation(view)
    runtime.connection.syncState('mobile.activeView', view)
    runtime.connection.syncState('mobile.isMobile', mob.isMobile)
    runtime.performance.trackViewRender(`mobile:${view}`)
  }, [view, mob.isMobile])

  const bgStyles = buildBackground(t.background, t.bg, t.mode)
  const sidebarLeft = (t as any).sidebarPosition !== 'right'
  const toolbarBottom = t.toolbar?.position !== 'top'
  const toolbarVisible = t.toolbar?.visible !== false

  // Bottom nav height for mobile content offset
  const MOBILE_NAV_HEIGHT = 64 + mob.safeBottom

  const viewMap: Record<View, React.ReactNode> = {
    dashboard: <DashboardView setView={setViewStr} />,
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

  const toolbarEl = (!mob.isMobile && toolbarVisible) ? (
    <div style={{
      position: 'relative', zIndex: 500,
      display: 'flex', justifyContent: 'center',
      padding: toolbarBottom ? '0 0 6px' : '6px 0 0',
      pointerEvents: 'none',
    }}>
      <div style={{ pointerEvents: 'auto' }}>
        <NexusToolbar setView={setView} />
      </div>
    </div>
  ) : null

  const mobileMeta = NEXUS_VIEW_META[view]
  const ambientLayer = (
    <div
      aria-hidden
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        overflow: 'hidden',
        zIndex: 0,
      }}
    >
      <div style={{
        position: 'absolute', top: '-18%', left: '-12%', width: '46vw', height: '46vw', maxWidth: 480, maxHeight: 480,
        background: `radial-gradient(circle, rgba(${hexToRgb(t.accent)},0.18), transparent 68%)`,
        filter: 'blur(18px)',
      }} />
      <div style={{
        position: 'absolute', bottom: '-16%', right: '-10%', width: '48vw', height: '48vw', maxWidth: 520, maxHeight: 520,
        background: `radial-gradient(circle, rgba(${hexToRgb(t.accent2)},0.16), transparent 68%)`,
        filter: 'blur(20px)',
      }} />
    </div>
  )

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setPaletteOpen((s) => !s)
      } else if (e.key === 'Escape') {
        setPaletteOpen(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // ── MOBILE LAYOUT ───────────────────────────────────────────────────────
  if (mob.isMobile) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column',
        width: '100%', height: '100%', overflow: 'hidden',
        position: 'relative',
        color: t.mode === 'dark' ? '#fff' : '#0a0a0a',
        ...bgStyles,
        fontSize: 'var(--nx-font-size, 15px)',
        overscrollBehavior: 'none',
        WebkitTapHighlightColor: 'transparent',
        // Safe area top padding for status bar
        paddingTop: `env(safe-area-inset-top, ${mob.safeTop}px)`,
      }}>
        {ambientLayer}

        {/* Mobile header strip */}
        <div style={{
          minHeight: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: 10, padding: '8px 14px', flexShrink: 0,
          background: t.mode === 'dark'
            ? 'linear-gradient(180deg, rgba(255,255,255,0.14), rgba(8,10,18,0.68))'
            : 'linear-gradient(180deg, rgba(255,255,255,0.95), rgba(245,248,255,0.72))',
          backdropFilter: 'blur(30px) saturate(220%)',
          WebkitBackdropFilter: 'blur(30px) saturate(220%)',
          borderBottom: `1px solid ${t.mode === 'dark' ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.9)'}`,
          boxShadow: t.mode === 'dark'
            ? 'inset 0 1px 0 rgba(255,255,255,0.24)'
            : 'inset 0 1px 0 rgba(255,255,255,0.96)',
        }}>
          <button
            className="nx-icon-btn"
            onClick={() => setView('dashboard')}
            aria-label="Zum Dashboard"
            style={{
              minWidth: 42, height: 42, borderRadius: 12, border: 'none', cursor: 'pointer',
              background: t.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
              color: t.mode === 'dark' ? '#fff' : '#111',
              fontSize: 18, fontWeight: 900,
            }}
          >
            ✦
          </button>

          <div style={{ flex: 1, minWidth: 0, textAlign: 'center' }}>
            <div style={{ fontSize: 15, fontWeight: 800, lineHeight: 1.2, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
              {mobileMeta.title}
            </div>
            <div style={{ fontSize: 10, opacity: 0.62, marginTop: 2, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
              {mobileMeta.subtitle}
            </div>
          </div>

          <button
            className="nx-icon-btn"
            onClick={() => setView('settings')}
            aria-label="Zu den Einstellungen"
            style={{
              minWidth: 42, height: 42, borderRadius: 12, border: 'none', cursor: 'pointer',
              background: `linear-gradient(135deg, rgba(${hexToRgb(t.accent)},0.22), rgba(${hexToRgb(t.accent2)},0.15))`,
              color: t.accent,
              boxShadow: `0 0 0 1px rgba(${hexToRgb(t.accent)},0.25) inset`,
            }}
          >
            ⚙︎
          </button>
        </div>

        {/* Main content */}
        <div style={{
          flex: 1, overflow: 'hidden', minHeight: 0,
          paddingBottom: MOBILE_NAV_HEIGHT,
          WebkitOverflowScrolling: 'touch',
        }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={view}
              initial={t.animations.pageTransitions ? { opacity: 0, x: 20 } : false}
              animate={{ opacity: 1, x: 0 }}
              exit={t.animations.pageTransitions ? { opacity: 0, x: -20 } : undefined}
              transition={{ duration: 0.18, ease: 'easeInOut' }}
              style={{ height: '100%', overflow: 'hidden' }}
            >
              {viewMap[view]}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Mobile bottom navigation */}
        <MobileNav view={view} onChange={setView} safeBottom={mob.safeBottom} />

        <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} setView={setView} />
      </div>
    )
  }

  // ── TABLET / DESKTOP LAYOUT (unchanged) ─────────────────────────────────
  return (
      <div style={{
        display: 'flex', flexDirection: 'column',
        width: '100%', height: '100%', overflow: 'hidden',
        position: 'relative',
        color: t.mode === 'dark' ? '#fff' : '#0a0a0a',
        ...bgStyles,
        fontSize: 'var(--nx-font-size, 14px)',
      }}>
      {ambientLayer}
      <TitleBar />
      <div style={{
        display: 'flex', flex: 1, overflow: 'hidden', minHeight: 0,
        flexDirection: sidebarLeft ? 'row' : 'row-reverse',
      }}>
        <div style={{ width: t.sidebarWidth, flexShrink: 0, height: '100%' }}>
          <Sidebar view={view} onChange={setView} />
        </div>
        <div style={{
          flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column',
          position: 'relative', minHeight: 0,
        }}>
          {!toolbarBottom && toolbarEl}
          <AnimatePresence mode="wait">
            <motion.div
              key={view}
              initial={t.animations.pageTransitions ? { opacity: 0, y: 8 } : false}
              animate={{ opacity: 1, y: 0 }}
              exit={t.animations.pageTransitions ? { opacity: 0, y: -8 } : undefined}
              transition={{ duration: 0.18 * (t.visual.animationSpeed || 1), ease: 'easeInOut' }}
              style={{ flex: 1, overflow: 'hidden', height: '100%', minHeight: 0 }}
            >
              {viewMap[view]}
            </motion.div>
          </AnimatePresence>
          <NexusTerminal setView={setView} openPalette={() => setPaletteOpen(true)} />
          {toolbarBottom && toolbarEl}
        </div>
      </div>
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} setView={setView} />
    </div>
  )
}
