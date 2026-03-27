import React, { useState, useEffect, useRef, useMemo, useCallback, lazy, Suspense } from 'react'
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
  buildLiveViewModel,
  getFallbackViewsForApp,
  NEXUS_VIEW_META,
  resolveLayoutProfile,
  sanitizeGlobalFont,
} from '@nexus/core'
import { createNexusRuntime, type NexusLiveBundle, type NexusRuntime } from '@nexus/api'

const VIEW_IDS = getFallbackViewsForApp('mobile') as View[]
const CONTROL_API_BASE_URL = 'https://nexus-api.cloud'
const isLowPowerDevice = () => {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return false
  }

  const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  const cores = Number(navigator.hardwareConcurrency || 8)
  const memory = Number((navigator as any).deviceMemory || 8)
  return Boolean(reducedMotion) || cores <= 4 || memory <= 4
}
const runIdle = (task: () => void) => {
  if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
    ;(window as any).requestIdleCallback(task, { timeout: 1_200 })
    return
  }
  setTimeout(task, 80)
}
const loadDashboardView = () => import('./views/DashboardView')
const loadNotesView = () => import('./views/NotesView')
const loadCodeView = () => import('./views/CodeView')
const loadTasksView = () => import('./views/TasksView')
const loadRemindersView = () => import('./views/RemindersView')
const loadCanvasView = () => import('./views/CanvasView')
const loadFilesView = () => import('./views/FilesView')
const loadFluxView = () => import('./views/FluxView')
const loadSettingsView = () => import('./views/SettingsView')
const loadInfoView = () => import('./views/InfoView')
const loadDevToolsView = () => import('./views/DevToolsView')

const DashboardView = lazy(() => loadDashboardView().then(m => ({ default: m.DashboardView })))
const NotesView = lazy(() => loadNotesView().then(m => ({ default: m.NotesView })))
const CodeView = lazy(() => loadCodeView().then(m => ({ default: m.CodeView })))
const TasksView = lazy(() => loadTasksView().then(m => ({ default: m.TasksView })))
const RemindersView = lazy(() => loadRemindersView().then(m => ({ default: m.RemindersView })))
const CanvasView = lazy(() => loadCanvasView().then(m => ({ default: m.CanvasView })))
const FilesView = lazy(() => loadFilesView().then(m => ({ default: m.FilesView })))
const FluxView = lazy(() => loadFluxView().then(m => ({ default: m.FluxView })))
const SettingsView = lazy(() => loadSettingsView().then(m => ({ default: m.SettingsView })))
const InfoView = lazy(() => loadInfoView().then(m => ({ default: m.InfoView })))
const DevToolsView = lazy(() => loadDevToolsView().then(m => ({ default: m.DevToolsView })))

const VIEW_CHUNK_PRELOADERS: Record<View, () => Promise<unknown>> = {
  dashboard: loadDashboardView,
  notes: loadNotesView,
  code: loadCodeView,
  tasks: loadTasksView,
  reminders: loadRemindersView,
  canvas: loadCanvasView,
  files: loadFilesView,
  flux: loadFluxView,
  settings: loadSettingsView,
  info: loadInfoView,
  devtools: loadDevToolsView,
}

const preloadMobileViews = async (views: View[], options: { eagerLimit?: number } = {}) => {
  const eagerLimit = Math.max(1, Math.min(4, Math.floor(options.eagerLimit ?? 2)))
  const loaders = views
    .map((viewId) => VIEW_CHUNK_PRELOADERS[viewId])
    .filter((loader): loader is () => Promise<unknown> => typeof loader === 'function')
  const uniqueLoaders = [...new Set(loaders)]

  if (uniqueLoaders.length === 0) return
  const eager = uniqueLoaders.slice(0, eagerLimit)
  const deferred = uniqueLoaders.slice(eagerLimit)

  await Promise.allSettled(eager.map((loader) => loader()))
  if (deferred.length > 0) {
    runIdle(() => {
      void Promise.allSettled(deferred.map((loader) => loader()))
    })
  }
}

export default function App() {
  const [view, setView] = useState<View>('dashboard')
  const [availableViews, setAvailableViews] = useState<View[]>(VIEW_IDS)
  const [bootReady, setBootReady] = useState(false)
  const [bootFailure, setBootFailure] = useState<string | null>(null)
  const [remoteDensity, setRemoteDensity] = useState<'compact' | 'comfortable' | 'spacious' | null>(null)
  const [remoteNavigation, setRemoteNavigation] = useState<'sidebar' | 'bottom-nav' | 'tabs' | null>(null)
  const [liveReleaseId, setLiveReleaseId] = useState<string | null>(null)
  const [viewGuardState, setViewGuardState] = useState<{
    checking: boolean
    blockedView: string | null
    requiredTier: string | null
    reason: string | null
  }>({
    checking: false,
    blockedView: null,
    requiredTier: null,
    reason: null,
  })
  const [paletteOpen, setPaletteOpen] = useState(false)
  const t = useTheme()
  const mob = useMobile()
  const runtimeRef = useRef<NexusRuntime | null>(null)
  const guardRequestSeq = useRef(0)
  const lowPowerMode = useMemo(() => isLowPowerDevice(), [])

  const viewAccessContext = useMemo(() => ({
    userId: (import.meta as any).env?.VITE_NEXUS_USER_ID as string | undefined,
    username: (import.meta as any).env?.VITE_NEXUS_USERNAME as string | undefined,
    userTier: (import.meta as any).env?.VITE_NEXUS_USER_TIER as 'free' | 'paid' | undefined,
  }), [])

  const resolveBundleViews = useCallback((bundle: NexusLiveBundle | null) => {
    if (!bundle?.catalog || !bundle.layoutSchema) return VIEW_IDS

    const model = buildLiveViewModel({
      appId: 'mobile',
      catalog: bundle.catalog,
      schema: bundle.layoutSchema,
    })
    const nextViews = model.views
      .map((candidate) => candidate as View)
      .filter((candidate) => VIEW_IDS.includes(candidate))

    return nextViews.length > 0 ? nextViews : VIEW_IDS
  }, [])

  const applyLiveBundle = useCallback((bundle: NexusLiveBundle | null) => {
    if (!bundle?.catalog || !bundle.layoutSchema) return

    const nextViews = resolveBundleViews(bundle)
    setAvailableViews(nextViews)
    setView((prev) => (nextViews.includes(prev) ? prev : nextViews[0]))

    const profile = resolveLayoutProfile(bundle.layoutSchema, {
      mode: 'mobile',
      density: 'comfortable',
      navigation: 'bottom-nav',
    })
    setRemoteDensity(profile.density)
    setRemoteNavigation(profile.navigation)
    setLiveReleaseId(bundle.release?.id || null)
  }, [resolveBundleViews])

  useEffect(() => {
    const controlBaseUrl = CONTROL_API_BASE_URL
    const controlIngestKey = (import.meta as any).env?.VITE_NEXUS_CONTROL_INGEST_KEY as string | undefined

    const runtime = createNexusRuntime({
      appId: 'mobile',
      appVersion: '4.0.0',
      control: {
        enabled: Boolean(controlBaseUrl),
        baseUrl: controlBaseUrl,
        localFallbackEnabled: false,
        ingestKey: controlIngestKey,
        sampleRate: 0.35,
        flushIntervalMs: 12_000,
        releasePollIntervalMs: 30_000,
        viewValidationFailOpen: false,
        viewValidationCacheMs: 120_000,
      },
      performance: {
        collectMemoryMs: 60_000,
        summaryIntervalMs: 60_000,
        maxMetricsPerMinute: 60,
      },
      liveSync: {
        enabled: Boolean(controlBaseUrl),
        channel: 'production',
        onUpdate: (event) => {
          applyLiveBundle(event.bundle)
        },
      },
    })
    runtime.start()
    runtimeRef.current = runtime
    let active = true
    setBootFailure(null)

    void (async () => {
      try {
        const [catalogResult, layoutResult, releaseResult] = await Promise.all([
          runtime.control.fetchCatalog({
            appId: 'mobile',
            channel: 'production',
            forceRefresh: true,
            cacheTtlMs: 0,
          }),
          runtime.control.fetchLayoutSchema({
            appId: 'mobile',
            channel: 'production',
            forceRefresh: true,
            cacheTtlMs: 0,
          }),
          runtime.control.fetchCurrentRelease({
            appId: 'mobile',
            channel: 'production',
            forceRefresh: true,
            cacheTtlMs: 0,
          }),
        ])

        const failedResources = [
          ['catalog', catalogResult.errorCode, catalogResult.item],
          ['layout', layoutResult.errorCode, layoutResult.item],
          ['release', releaseResult.errorCode, releaseResult.item],
        ]
          .filter(([, errorCode, item]) => Boolean(errorCode) || !item)
          .map(([resource, errorCode]) => `${resource}:${String(errorCode || 'INVALID_PAYLOAD')}`)

        if (failedResources.length > 0) {
          throw new Error(`CONTROL_API_BOOTSTRAP_FAILED (${failedResources.join(', ')})`)
        }

        const bundle: NexusLiveBundle = {
          appId: 'mobile',
          channel: 'production',
          catalog: catalogResult.item,
          layoutSchema: layoutResult.item,
          release: releaseResult.item,
        }

        if (!active) return
        applyLiveBundle(bundle)
        const startupViews = resolveBundleViews(bundle)
        if (startupViews.length === 0) {
          throw new Error('CONTROL_API_BOOTSTRAP_FAILED (NO_STARTUP_VIEWS)')
        }

        const warmup = await runtime.control.warmupViewAccess(startupViews, {
          ...viewAccessContext,
          forceRefresh: true,
          concurrency: 4,
        })
        if (!active) return
        const allowedViews = warmup.allowedViews.filter((candidate) => startupViews.includes(candidate as View)) as View[]
        if (allowedViews.length === 0) {
          const reasons = startupViews
            .map((candidate) => warmup.resultByView[candidate]?.reason)
            .filter((reason): reason is string => Boolean(reason))
            .slice(0, 3)
          throw new Error(`VIEW_VALIDATION_BLOCKED (${reasons.join(', ') || 'NO_ALLOWED_VIEWS'})`)
        }

        await preloadMobileViews(allowedViews, { eagerLimit: 2 })
        if (!active) return
        setAvailableViews(startupViews)
        setView((prev) => {
          if (allowedViews.includes(prev)) return prev
          return allowedViews[0]
        })
        setViewGuardState({
          checking: false,
          blockedView: null,
          requiredTier: null,
          reason: null,
        })
      } catch (error) {
        const reason = error instanceof Error && error.message
          ? error.message
          : 'CONTROL_API_UNAVAILABLE'
        console.error('Nexus Mobile bootstrap failed', error)
        if (!active) return
        setBootFailure(reason)
      } finally {
        if (active) setBootReady(true)
      }
    })()

    return () => {
      active = false
      runtime.stop()
      runtimeRef.current = null
    }
  }, [applyLiveBundle, resolveBundleViews, viewAccessContext])

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
    applyPanelDensity(remoteDensity || t.qol?.panelDensity || 'comfortable')
  }, [remoteDensity, t.qol?.panelDensity])

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

  const requestViewChange = useCallback(async (nextRaw: unknown) => {
    const next = String(nextRaw || '').toLowerCase() as View
    if (!availableViews.includes(next)) return
    if (next === view) return

    const runtime = runtimeRef.current
    if (!runtime) {
      setView(next)
      setViewGuardState({
        checking: false,
        blockedView: null,
        requiredTier: null,
        reason: null,
      })
      return
    }

    const requestId = ++guardRequestSeq.current
    const checkingTimer = setTimeout(() => {
      if (requestId !== guardRequestSeq.current) return
      setViewGuardState((prev) => ({ ...prev, checking: true }))
    }, 120)

    const access = await runtime.control.validateViewAccess(next, viewAccessContext)
    clearTimeout(checkingTimer)
    if (requestId !== guardRequestSeq.current) return

    if (access.allowed) {
      setView(next)
      setViewGuardState({
        checking: false,
        blockedView: null,
        requiredTier: null,
        reason: null,
      })
      return
    }

    setViewGuardState({
      checking: false,
      blockedView: next,
      requiredTier: access.requiredTier || 'paid',
      reason: access.reason || 'PAYWALL_BLOCKED',
    })
  }, [availableViews, view, viewAccessContext])

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

  if (!bootReady) {
    return (
      <div style={{
        width: '100%',
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #04050c 0%, #111628 100%)',
        color: '#d7e6ff',
        fontFamily: 'system-ui, sans-serif',
        fontWeight: 700,
      }}>
        Initialisiere Views und Zugriffsrechte...
      </div>
    )
  }

  if (bootFailure) {
    return (
      <div style={{
        width: '100%',
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #1a0909 0%, #0c111b 100%)',
        color: '#ffe5e2',
        fontFamily: 'system-ui, sans-serif',
        padding: 18,
      }}>
        <div style={{
          maxWidth: 620,
          borderRadius: 14,
          border: '1px solid rgba(255,69,58,0.45)',
          background: 'rgba(255,69,58,0.12)',
          padding: 14,
          fontSize: 13,
          lineHeight: 1.45,
        }}>
          <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 6 }}>
            API-Startpruefung fehlgeschlagen
          </div>
          <div>
            Nexus Mobile wurde kontrolliert gestoppt, weil der Hosted-API-Bootflow
            nicht erfolgreich war.
          </div>
          <div style={{ marginTop: 8 }}>
            Reason: <code>{bootFailure}</code>
          </div>
        </div>
      </div>
    )
  }

  const bgStyles = buildBackground(t.background, t.bg, t.mode)
  const sidebarLeft = (t as any).sidebarPosition !== 'right'
  const toolbarBottom = t.toolbar?.position !== 'top'
  const toolbarVisible = t.toolbar?.visible !== false

  // Bottom nav height for mobile content offset
  const mobileNavigationMode = remoteNavigation || 'bottom-nav'
  const showMobileBottomNav = mobileNavigationMode !== 'sidebar'
  const MOBILE_NAV_HEIGHT = showMobileBottomNav ? (64 + mob.safeBottom) : 0

  const viewMap: Record<View, React.ReactNode> = {
    dashboard: <DashboardView setView={(v: any) => { void requestViewChange(v) }} />,
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
        <NexusToolbar setView={(v: any) => { void requestViewChange(v) }} />
      </div>
    </div>
  ) : null

  const mobileMeta = NEXUS_VIEW_META[view] || NEXUS_VIEW_META.dashboard
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
        filter: lowPowerMode ? 'blur(8px)' : 'blur(18px)',
      }} />
      <div style={{
        position: 'absolute', bottom: '-16%', right: '-10%', width: '48vw', height: '48vw', maxWidth: 520, maxHeight: 520,
        background: `radial-gradient(circle, rgba(${hexToRgb(t.accent2)},0.16), transparent 68%)`,
        filter: lowPowerMode ? 'blur(10px)' : 'blur(20px)',
      }} />
    </div>
  )

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
          backdropFilter: lowPowerMode ? 'none' : 'blur(30px) saturate(220%)',
          WebkitBackdropFilter: lowPowerMode ? 'none' : 'blur(30px) saturate(220%)',
          borderBottom: `1px solid ${t.mode === 'dark' ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.9)'}`,
          boxShadow: t.mode === 'dark'
            ? 'inset 0 1px 0 rgba(255,255,255,0.24)'
            : 'inset 0 1px 0 rgba(255,255,255,0.96)',
        }}>
          <button
            className="nx-icon-btn"
            onClick={() => { void requestViewChange('dashboard') }}
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
            {liveReleaseId ? (
              <div style={{ fontSize: 9, opacity: 0.7, marginTop: 2, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                live: {liveReleaseId}
              </div>
            ) : null}
          </div>

          <button
            className="nx-icon-btn"
            onClick={() => { void requestViewChange('settings') }}
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

        {(viewGuardState.checking || viewGuardState.blockedView) ? (
          <div style={{ padding: '8px 12px 0', flexShrink: 0, zIndex: 4 }}>
            {viewGuardState.checking ? (
              <div
                style={{
                  borderRadius: 10,
                  padding: '8px 10px',
                  fontSize: 12,
                  fontWeight: 700,
                  background: t.mode === 'dark' ? 'rgba(6,12,24,0.82)' : 'rgba(255,255,255,0.88)',
                  border: `1px solid rgba(${hexToRgb(t.accent)},0.34)`,
                  color: t.accent,
                }}
              >
                Validiere View-Zugriff...
              </div>
            ) : null}
            {viewGuardState.blockedView ? (
              <div
                style={{
                  borderRadius: 10,
                  padding: '9px 10px',
                  fontSize: 12,
                  fontWeight: 700,
                  marginTop: viewGuardState.checking ? 8 : 0,
                  background: 'rgba(255,69,58,0.14)',
                  border: '1px solid rgba(255,69,58,0.45)',
                  color: t.mode === 'dark' ? '#ffd8d2' : '#5e1810',
                }}
              >
                View gesperrt: `{viewGuardState.blockedView}` erfordert Tier `{viewGuardState.requiredTier || 'paid'}` ({viewGuardState.reason || 'PAYWALL_BLOCKED'}).
              </div>
            ) : null}
          </div>
        ) : null}

        {/* Main content */}
        <div style={{
          flex: 1, overflow: 'hidden', minHeight: 0,
          paddingBottom: MOBILE_NAV_HEIGHT,
          WebkitOverflowScrolling: 'touch',
        }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={view}
              initial={t.animations.pageTransitions && !lowPowerMode ? { opacity: 0, x: 20 } : false}
              animate={{ opacity: 1, x: 0 }}
              exit={t.animations.pageTransitions && !lowPowerMode ? { opacity: 0, x: -20 } : undefined}
              transition={{ duration: lowPowerMode ? 0.1 : 0.18, ease: 'easeInOut' }}
              style={{ height: '100%', overflow: 'hidden' }}
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
        </div>

        {/* Mobile bottom navigation */}
        {showMobileBottomNav ? (
          <MobileNav
            view={view}
            availableViews={availableViews}
            onChange={(v: any) => { void requestViewChange(v) }}
            safeBottom={mob.safeBottom}
          />
        ) : null}

        <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} setView={(v: any) => { void requestViewChange(v) }} />
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
      {(viewGuardState.checking || viewGuardState.blockedView) ? (
        <div style={{ padding: '8px 12px 0', flexShrink: 0, zIndex: 4 }}>
          {viewGuardState.checking ? (
            <div
              style={{
                borderRadius: 10,
                padding: '8px 10px',
                fontSize: 12,
                fontWeight: 700,
                background: t.mode === 'dark' ? 'rgba(6,12,24,0.82)' : 'rgba(255,255,255,0.88)',
                border: `1px solid rgba(${hexToRgb(t.accent)},0.34)`,
                color: t.accent,
              }}
            >
              Validiere View-Zugriff...
            </div>
          ) : null}
          {viewGuardState.blockedView ? (
            <div
              style={{
                borderRadius: 10,
                padding: '9px 10px',
                fontSize: 12,
                fontWeight: 700,
                marginTop: viewGuardState.checking ? 8 : 0,
                background: 'rgba(255,69,58,0.14)',
                border: '1px solid rgba(255,69,58,0.45)',
                color: t.mode === 'dark' ? '#ffd8d2' : '#5e1810',
              }}
            >
              View gesperrt: `{viewGuardState.blockedView}` erfordert Tier `{viewGuardState.requiredTier || 'paid'}` ({viewGuardState.reason || 'PAYWALL_BLOCKED'}).
            </div>
          ) : null}
        </div>
      ) : null}
      <div style={{
        display: 'flex', flex: 1, overflow: 'hidden', minHeight: 0,
        flexDirection: sidebarLeft ? 'row' : 'row-reverse',
      }}>
        <div style={{ width: t.sidebarWidth, flexShrink: 0, height: '100%' }}>
          <Sidebar
            view={view}
            availableViews={availableViews}
            onChange={(v: any) => { void requestViewChange(v) }}
          />
        </div>
        <div style={{
          flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column',
          position: 'relative', minHeight: 0,
        }}>
          {!toolbarBottom && toolbarEl}
          <AnimatePresence mode="wait">
            <motion.div
              key={view}
              initial={t.animations.pageTransitions && !lowPowerMode ? { opacity: 0, y: 8 } : false}
              animate={{ opacity: 1, y: 0 }}
              exit={t.animations.pageTransitions && !lowPowerMode ? { opacity: 0, y: -8 } : undefined}
              transition={{ duration: (lowPowerMode ? 0.1 : 0.18) * (t.visual.animationSpeed || 1), ease: 'easeInOut' }}
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
          <NexusTerminal setView={(v: any) => { void requestViewChange(v) }} openPalette={() => setPaletteOpen(true)} />
          {toolbarBottom && toolbarEl}
        </div>
      </div>
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} setView={(v: any) => { void requestViewChange(v) }} />
    </div>
  )
}
