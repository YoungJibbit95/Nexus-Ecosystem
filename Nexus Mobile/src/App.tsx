import React, { useState, useEffect, useRef, useMemo, useCallback, Suspense } from 'react'
import { motion } from 'framer-motion'
import { useTheme, GLOBAL_FONTS } from './store/themeStore'
import { Sidebar, View } from './components/Sidebar'
import { TitleBar } from './components/TitleBar'
import { BootSequenceScreen } from './components/BootSequenceScreen'
import { MobileNav } from './components/MobileNav'
import { NexusTerminal } from './components/NexusTerminal'
import { NexusToolbar } from './components/NexusToolbar'
import { CommandPalette } from './components/CommandPalette'
import { buildBackground } from './lib/visualUtils'
import { useMobile } from './lib/useMobile'
import { hexToRgb } from './lib/utils'
import { installRuntimeLagProbe } from './lib/runtimeLagProbe'
import { buildMotionRuntime } from './lib/motionEngine'
import { useGlobalTypingAnimation } from './lib/useGlobalTypingAnimation'
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
import {
  createNexusRuntime,
  isOfflineControlErrorCode,
  type NexusLiveBundle,
  type NexusRuntime,
  type NexusViewAccessResult,
} from '@nexus/api'
import {
  CanvasView,
  CodeView,
  DashboardView,
  DevToolsView,
  FilesView,
  FluxView,
  InfoView,
  NotesView,
  RemindersView,
  SettingsView,
  TasksView,
  VIEW_CHUNK_PRELOADERS,
  VIEW_IDS,
  orderMobilePreloadViews,
  preloadMobileViews,
} from './app/viewPreload'

const isOfflineBootstrapResourceError = (errorCodeRaw: unknown) => (
  isOfflineControlErrorCode(String(errorCodeRaw || 'INVALID_PAYLOAD'))
)
const CONTROL_API_BASE_URL = 'https://nexus-api.cloud'
const MOBILE_BOOT_BLOCK_BUDGET_MS = 6_500
const MOBILE_BOOT_BLOCK_BUDGET_LOW_POWER_MS = 8_500
const MOBILE_BOOT_PRIORITY_VIEWS: View[] = [
  'dashboard',
  'notes',
  'tasks',
  'settings',
  'reminders',
  'files',
]
const MOBILE_HEAVY_PRELOAD_VIEWS = new Set<View>(['code', 'canvas', 'devtools'])
const MOBILE_PERSISTENT_VIEW_CACHE: View[] = [
  'dashboard',
  'notes',
  'tasks',
  'settings',
  'files',
  'canvas',
  'code',
]
const mergeUniqueViews = (...groups: View[][]): View[] => {
  const ordered = groups.flat()
  const seen = new Set<View>()
  const result: View[] = []
  for (const viewId of ordered) {
    if (seen.has(viewId)) continue
    seen.add(viewId)
    result.push(viewId)
  }
  return result
}
const isLowPowerDevice = () => {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return false
  }

  const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  const cores = Number(navigator.hardwareConcurrency || 8)
  const memory = Number((navigator as any).deviceMemory || 8)
  return Boolean(reducedMotion) || cores <= 4 || memory <= 4
}

const withTimeoutResult = async <T,>(
  promise: Promise<T>,
  timeoutMs: number,
): Promise<{ timedOut: true } | { timedOut: false; value: T }> => {
  let timeoutHandle: number | null = null
  const timeoutPromise = new Promise<{ timedOut: true }>((resolve) => {
    timeoutHandle = window.setTimeout(() => resolve({ timedOut: true }), timeoutMs)
  })

  try {
    const result = await Promise.race([
      promise.then((value) => ({ timedOut: false as const, value })),
      timeoutPromise,
    ])
    return result
  } finally {
    if (timeoutHandle !== null) {
      clearTimeout(timeoutHandle)
    }
  }
}

const MOBILE_CORE_FALLBACK_VIEWS: View[] = getFallbackViewsForApp('mobile')
  .map((candidate) => candidate as View)
  .filter((candidate) => VIEW_IDS.includes(candidate))
const MOBILE_SAFE_STARTUP_VIEWS: View[] = MOBILE_CORE_FALLBACK_VIEWS.length > 0
  ? MOBILE_CORE_FALLBACK_VIEWS
  : VIEW_IDS


export default function App() {
  const [view, setView] = useState<View>('dashboard')
  const [availableViews, setAvailableViews] = useState<View[]>(MOBILE_SAFE_STARTUP_VIEWS)
  const [mountedViews, setMountedViews] = useState<View[]>(['dashboard'])
  const [bootReady, setBootReady] = useState(false)
  const [bootProgress, setBootProgress] = useState(0)
  const [bootStage, setBootStage] = useState('Nexus Runtime wird gestartet...')
  const [bootFailure, setBootFailure] = useState<string | null>(null)
  const [remoteDensity, setRemoteDensity] = useState<'compact' | 'comfortable' | 'spacious' | null>(null)
  const [remoteNavigation, setRemoteNavigation] = useState<'sidebar' | 'bottom-nav' | 'tabs' | null>(null)
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
  const [sidebarAutoPeek, setSidebarAutoPeek] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const t = useTheme()
  const mob = useMobile()
  const runtimeRef = useRef<NexusRuntime | null>(null)
  const validatedAccessRef = useRef<Partial<Record<View, NexusViewAccessResult>>>({})
  const guardRequestSeq = useRef(0)
  const lowPowerMode = useMemo(() => isLowPowerDevice(), [])
  const motionRuntime = useMemo(
    () => buildMotionRuntime(t, { lowPowerMode }),
    [lowPowerMode, t],
  )
  useGlobalTypingAnimation(!(t.qol?.reducedMotion ?? false))
  const motionCssVars = useMemo(
    () =>
      ({
        '--nx-motion-quick': `${motionRuntime.quickMs}ms`,
        '--nx-motion-regular': `${motionRuntime.regularMs}ms`,
        '--nx-hover-lift': `${motionRuntime.hoverLiftPx}px`,
        '--nx-hover-scale': `${motionRuntime.hoverScale}`,
        '--nx-press-scale': `${motionRuntime.pressScale}`,
        '--nx-hover-extra-scale': motionRuntime.reduced
          ? '0'
          : motionRuntime.profile === 'cinematic'
            ? '0.008'
            : motionRuntime.profile === 'expressive'
              ? '0.007'
              : '0.006',
      }) as React.CSSProperties,
    [motionRuntime],
  )

  useEffect(() => {
    const sidebarStyle = (t as any).sidebarStyle
    const autoHideEnabled = Boolean(t.qol?.sidebarAutoHide) && sidebarStyle !== 'hidden'
    if (!autoHideEnabled) {
      setSidebarAutoPeek(false)
    }
  }, [t.qol?.sidebarAutoHide, (t as any).sidebarStyle])

  const viewAccessContext = useMemo(() => ({
    userId: (import.meta as any).env?.VITE_NEXUS_USER_ID as string | undefined,
    username: (import.meta as any).env?.VITE_NEXUS_USERNAME as string | undefined,
    userTier: (import.meta as any).env?.VITE_NEXUS_USER_TIER as 'free' | 'paid' | undefined,
  }), [])

  const emitViewFilterDebugEvents = useCallback((events: Array<{ viewId: string; reason: string }> | undefined) => {
    if (!Array.isArray(events) || events.length === 0) return
    const runtime = runtimeRef.current
    for (const item of events) {
      const viewId = String(item?.viewId || '')
      const reason = String(item?.reason || 'unknown')
      if (!viewId) continue
      console.info('[Nexus Mobile] view filtered by live model', { viewId, reason })
      runtime?.connection.publish('custom', {
        event: 'view_filtered',
        appId: 'mobile',
        viewId,
        reason,
      }, 'all')
    }
  }, [])

  useEffect(() => {
    setMountedViews((prev) => {
      const filtered = prev.filter((entry) => availableViews.includes(entry))
      if (availableViews.includes(view) && !filtered.includes(view)) {
        filtered.push(view)
      }
      if (filtered.length > 0) return filtered
      const fallback = availableViews[0] ?? 'dashboard'
      return [fallback]
    })
  }, [availableViews, view])

  const resolveBundleViews = useCallback((bundle: NexusLiveBundle | null) => {
    if (!bundle) return MOBILE_SAFE_STARTUP_VIEWS

    const model = buildLiveViewModel({
      appId: 'mobile',
      catalog: bundle.catalog ?? null,
      schema: bundle.layoutSchema ?? null,
    })
    emitViewFilterDebugEvents(model.filterDebugEvents)
    const nextViews = model.views
      .map((candidate) => candidate as View)
      .filter((candidate) => VIEW_IDS.includes(candidate))

    return nextViews.length > 0 ? nextViews : MOBILE_SAFE_STARTUP_VIEWS
  }, [emitViewFilterDebugEvents])

  const applyLiveBundle = useCallback((bundle: NexusLiveBundle | null) => {
    const nextViews = resolveBundleViews(bundle)
    setAvailableViews(nextViews)
    setView((prev) => (nextViews.includes(prev) ? prev : nextViews[0]))

    if (bundle?.layoutSchema) {
      const profile = resolveLayoutProfile(bundle.layoutSchema, {
        mode: 'mobile',
        density: 'comfortable',
        navigation: 'bottom-nav',
      })
      setRemoteDensity(profile.density)
      setRemoteNavigation(profile.navigation)
    } else {
      setRemoteDensity(null)
      setRemoteNavigation(null)
    }
  }, [resolveBundleViews])

  const storeWarmupAccess = useCallback((resultByView: Record<string, NexusViewAccessResult>) => {
    const next: Partial<Record<View, NexusViewAccessResult>> = {
      ...validatedAccessRef.current,
    }
    Object.entries(resultByView || {}).forEach(([viewId, access]) => {
      const key = String(viewId || '') as View
      if (!VIEW_IDS.includes(key)) return
      next[key] = access
    })
    validatedAccessRef.current = next
  }, [])

  const preloadViewChunk = useCallback(
    async (viewId: View, timeoutMs?: number) => {
      const loader = VIEW_CHUNK_PRELOADERS[viewId]
      if (typeof loader !== 'function') return
      const budget = timeoutMs ?? (lowPowerMode ? 180 : 80)
      await withTimeoutResult(loader(), budget)
    },
    [lowPowerMode],
  )

  useEffect(() => {
    const controlBaseUrl = CONTROL_API_BASE_URL
    const controlIngestKey = (import.meta as any).env?.VITE_NEXUS_CONTROL_INGEST_KEY as string | undefined

    const runtime = createNexusRuntime({
      appId: 'mobile',
      appVersion: '5.0.0',
      control: {
        enabled: Boolean(controlBaseUrl),
        baseUrl: controlBaseUrl,
        ingestKey: controlIngestKey,
        sampleRate: 0.35,
        flushIntervalMs: 12_000,
        releasePollIntervalMs: 30_000,
        viewValidationFailOpen: false,
        viewValidationCacheMs: 120_000,
        requestTimeoutMs: lowPowerMode ? 1_800 : 1_300,
        readRetryMax: 1,
        readRetryBaseMs: 120,
        readRetryMaxMs: 1_000,
      },
      performance: {
        collectMemoryMs: 60_000,
        summaryIntervalMs: 60_000,
        maxMetricsPerMinute: 60,
        reportToBus: false,
      },
      liveSync: {
        enabled: Boolean(controlBaseUrl),
        channel: 'production',
        immediate: false,
        onUpdate: (event) => {
          applyLiveBundle(event.bundle)
        },
      },
    })
    runtime.start()
    runtimeRef.current = runtime
    const stopLagProbe = installRuntimeLagProbe({
      enabled: (import.meta as any).env?.VITE_NEXUS_LAG_PROBE === '1',
      onEvent: (event) => {
        const metric = Number(event.durationMs.toFixed(2))
        const recordCustomMetric = (runtime.performance as any)?.recordCustomMetric
        if (typeof recordCustomMetric === 'function') {
          try {
            recordCustomMetric.call(runtime.performance, 'mobile.ui_lag_ms', metric, 'ms')
          } catch {
            // best-effort only
          }
        }
        runtime.connection.publish('custom', {
          event: event.kind,
          appId: 'mobile',
          durationMs: metric,
          detail: event.kind === 'long-task'
            ? { name: event.name }
            : { interaction: event.interaction },
        }, 'all')
        if (metric >= 120) {
          console.warn('[Nexus Mobile] interaction lag detected', event)
        }
      },
    })
    validatedAccessRef.current = {}
    let active = true
    const bootBudgetMs = lowPowerMode
      ? MOBILE_BOOT_BLOCK_BUDGET_LOW_POWER_MS
      : MOBILE_BOOT_BLOCK_BUDGET_MS
    const forceBootReadyTimer = window.setTimeout(() => {
      if (!active) return
      setBootProgress(100)
      setBootStage('Schnellstart aktiv, Rest wird im Hintergrund geladen...')
      setBootReady(true)
    }, bootBudgetMs)
    setBootFailure(null)
    setBootProgress(8)
    setBootStage('Nexus Runtime wird gestartet...')

    void preloadMobileViews(MOBILE_SAFE_STARTUP_VIEWS, {
      eagerLimit: lowPowerMode ? 1 : 2,
      includeDeferred: false,
    })

    const setBootStep = (progress: number, stage: string) => {
      if (!active) return
      setBootProgress((prev) => Math.max(prev, progress))
      setBootStage(stage)
    }

    void (async () => {
      try {
        setBootStep(24, 'Lade API Katalog, Layout und Release...')
        const [catalogResult, layoutResult, releaseResult] = await Promise.all([
          runtime.control.fetchCatalog({
            appId: 'mobile',
            channel: 'production',
            forceRefresh: false,
            cacheTtlMs: 120_000,
          }),
          runtime.control.fetchLayoutSchema({
            appId: 'mobile',
            channel: 'production',
            forceRefresh: false,
            cacheTtlMs: 120_000,
          }),
          runtime.control.fetchCurrentRelease({
            appId: 'mobile',
            channel: 'production',
            forceRefresh: false,
            cacheTtlMs: 60_000,
          }),
        ])

        const failedResources = [
          ['catalog', catalogResult.errorCode, catalogResult.item],
          ['layout', layoutResult.errorCode, layoutResult.item],
          ['release', releaseResult.errorCode, releaseResult.item],
        ]
          .filter(([, errorCode, item]) => Boolean(errorCode) || !item)
          .map(([resource, errorCode]) => ({
            resource: String(resource),
            errorCode: String(errorCode || 'INVALID_PAYLOAD'),
          }))

        if (failedResources.length > 0) {
          const offlineOnly = failedResources.every((entry) => isOfflineBootstrapResourceError(entry.errorCode))
          if (!offlineOnly) {
            throw new Error(`CONTROL_API_BOOTSTRAP_FAILED (${failedResources.map((entry) => `${entry.resource}:${entry.errorCode}`).join(', ')})`)
          }
        }

        const bundle: NexusLiveBundle | null = failedResources.length === 0
          ? {
              appId: 'mobile',
              channel: 'production',
              catalog: catalogResult.item,
              layoutSchema: layoutResult.item,
              release: releaseResult.item,
            }
          : null

        if (!active) return
        applyLiveBundle(bundle)
        setBootStep(54, 'Validiere verfuegbare Views...')
        const startupViews = bundle ? resolveBundleViews(bundle) : MOBILE_SAFE_STARTUP_VIEWS
        if (startupViews.length === 0) {
          throw new Error('CONTROL_API_BOOTSTRAP_FAILED (NO_STARTUP_VIEWS)')
        }

        const prioritizedStartupViews = orderMobilePreloadViews(startupViews)
        const priorityPrewarmViews = MOBILE_BOOT_PRIORITY_VIEWS.filter((candidate) =>
          startupViews.includes(candidate),
        )
        const heavyPrewarmViews = Array.from(MOBILE_HEAVY_PRELOAD_VIEWS).filter((candidate) =>
          startupViews.includes(candidate),
        )
        setAvailableViews(startupViews)
        setView((prev) => (startupViews.includes(prev) ? prev : startupViews[0]))
        setMountedViews(
          mergeUniqueViews(
            [startupViews[0]],
            MOBILE_PERSISTENT_VIEW_CACHE.filter((candidate) =>
              startupViews.includes(candidate),
            ),
          ),
        )
        setViewGuardState({
          checking: false,
          blockedView: null,
          requiredTier: null,
          reason: null,
        })
        setBootStep(80, 'Views werden vorgewarmt...')
        const startupPreloadPromise = preloadMobileViews(startupViews, {
          eagerLimit: lowPowerMode ? 2 : 3,
          includeDeferred: false,
        })
        const heavyPreloadPromise = heavyPrewarmViews.length > 0
          ? preloadMobileViews(heavyPrewarmViews, {
              eagerLimit: Math.max(1, heavyPrewarmViews.length),
              includeDeferred: false,
              allowHeavy: true,
            })
          : Promise.resolve()
        const priorityWarmupPromise = Promise.allSettled(
          priorityPrewarmViews.map((candidate) =>
            preloadViewChunk(candidate, lowPowerMode ? 260 : 150),
          ),
        )
        const accessWarmupPromise = runtime.control
          .warmupViewAccess(prioritizedStartupViews, {
            ...viewAccessContext,
            forceRefresh: false,
            concurrency: lowPowerMode ? 4 : 8,
          })
        const warmupBudgetMs = Math.max(1_000, bootBudgetMs - 700)
        const warmupResult = await withTimeoutResult(
          Promise.allSettled([
            startupPreloadPromise,
            priorityWarmupPromise,
            accessWarmupPromise,
            heavyPreloadPromise,
          ]),
          warmupBudgetMs,
        )
        if ('value' in warmupResult) {
          const settledAccess = warmupResult.value[2]
          if (settledAccess?.status === 'fulfilled') {
            storeWarmupAccess(settledAccess.value.resultByView)
          }
        } else {
          void accessWarmupPromise
            .then((warmup) => {
              if (!active) return
              storeWarmupAccess(warmup.resultByView)
            })
            .catch(() => {})
        }
        setBootStep(100, 'Startsequenz abgeschlossen')
      } catch (error) {
        const reason = error instanceof Error && error.message
          ? error.message
          : 'CONTROL_API_UNAVAILABLE'
        console.error('Nexus Mobile bootstrap failed', error)
        if (!active) return
        setBootFailure(reason)
      } finally {
        if (active) {
          setBootProgress(100)
          setBootReady(true)
        }
      }
    })()

    return () => {
      active = false
      clearTimeout(forceBootReadyTimer)
      stopLagProbe()
      runtime.stop()
      runtimeRef.current = null
      validatedAccessRef.current = {}
    }
  }, [applyLiveBundle, lowPowerMode, resolveBundleViews, storeWarmupAccess, viewAccessContext])

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
      setMountedViews((prev) => (prev.includes(next) ? prev : [...prev, next]))
      void preloadViewChunk(next)
      setViewGuardState({
        checking: false,
        blockedView: null,
        requiredTier: null,
        reason: null,
      })
      return
    }

    const cachedAccess = validatedAccessRef.current[next]
    if (cachedAccess) {
      if (cachedAccess.allowed) {
        void preloadViewChunk(next)
        setView(next)
        setMountedViews((prev) => (prev.includes(next) ? prev : [...prev, next]))
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
        requiredTier: cachedAccess.requiredTier || 'paid',
        reason: cachedAccess.reason || 'PAYWALL_BLOCKED',
      })
      return
    }

    const requestId = ++guardRequestSeq.current
    const previousView = view
    void preloadViewChunk(next)
    setView(next)
    setMountedViews((prev) => (prev.includes(next) ? prev : [...prev, next]))
    setViewGuardState((prev) => ({
      ...prev,
      checking: true,
      blockedView: null,
      requiredTier: null,
      reason: null,
    }))
    const access = await runtime.control.validateViewAccess(next, viewAccessContext)
    if (requestId !== guardRequestSeq.current) return
    validatedAccessRef.current = {
      ...validatedAccessRef.current,
      [next]: access,
    }

    if (access.allowed) {
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
    setView(previousView)
  }, [availableViews, preloadViewChunk, view, viewAccessContext])

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
      <BootSequenceScreen
        appName='Nexus Mobile'
        progress={bootProgress}
        stage={bootStage}
        accent={t.accent}
        accent2={t.accent2}
      />
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
  const sidebarHidden = (t as any).sidebarStyle === 'hidden'
  const sidebarAutoHideEnabled = Boolean(t.qol?.sidebarAutoHide) && !sidebarHidden
  const sidebarExpanded = !sidebarAutoHideEnabled || sidebarAutoPeek
  const collapsedSidebarWidth = sidebarAutoHideEnabled ? 12 : t.sidebarWidth
  const effectiveSidebarWidth = sidebarHidden ? 0 : (sidebarExpanded ? t.sidebarWidth : collapsedSidebarWidth)

  // Bottom nav height for mobile content offset
  const mobileNavigationMode = remoteNavigation || 'bottom-nav'
  const showMobileBottomNav = mobileNavigationMode !== 'sidebar'
  const MOBILE_NAV_HEIGHT = showMobileBottomNav ? (64 + mob.safeBottom) : 0

  const renderActiveView = (viewId: View): React.ReactNode => {
    switch (viewId) {
      case 'dashboard':
        return <DashboardView setView={(v: any) => { void requestViewChange(v) }} />
      case 'notes':
        return <NotesView />
      case 'code':
        return <CodeView />
      case 'tasks':
        return <TasksView />
      case 'reminders':
        return <RemindersView />
      case 'canvas':
        return <CanvasView />
      case 'files':
        return <FilesView />
      case 'flux':
        return <FluxView />
      case 'settings':
        return <SettingsView />
      case 'info':
        return <InfoView />
      case 'devtools':
        return <DevToolsView />
      default:
        return <DashboardView setView={(v: any) => { void requestViewChange(v) }} />
    }
  }

  const renderMountedViews = () => (
    mergeUniqueViews(
      [view],
      mountedViews.filter((entry) => availableViews.includes(entry)),
    ).map((viewId) => (
      <div
        key={viewId}
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: viewId === view ? 'auto' : 'none',
          display: viewId === view ? 'block' : 'none',
          animation:
            viewId === view && !(t.qol?.reducedMotion ?? false)
              ? 'nx-view-enter calc(var(--nx-motion-regular, 210ms) + 70ms) cubic-bezier(0.22, 1, 0.36, 1) both'
              : undefined,
        }}
      >
        <Suspense
          fallback={viewId === view ? (
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
          ) : null}
        >
          {renderActiveView(viewId)}
        </Suspense>
      </div>
    ))
  )

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
        ...motionCssVars,
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
          <motion.div
            initial={motionRuntime.pageInitial}
            animate={motionRuntime.pageAnimate}
            exit={motionRuntime.pageExit}
            transition={motionRuntime.pageTransition}
            style={{ height: '100%', overflow: 'hidden', position: 'relative' }}
          >
            <div style={{ position: 'relative', height: '100%', overflow: 'hidden' }}>
              {renderMountedViews()}
            </div>
          </motion.div>
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
        ...motionCssVars,
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
        position: 'relative',
      }}>
        <div
          style={{
            width: effectiveSidebarWidth,
            flexShrink: 0,
            height: '100%',
            overflow: 'hidden',
            transition: `width ${motionRuntime.quickMs}ms cubic-bezier(0.2, 0.8, 0.2, 1)`,
            pointerEvents: sidebarAutoHideEnabled && !sidebarExpanded ? 'none' : 'auto',
          }}
          onMouseEnter={() => {
            if (sidebarAutoHideEnabled) setSidebarAutoPeek(true)
          }}
          onMouseLeave={() => {
            if (sidebarAutoHideEnabled) setSidebarAutoPeek(false)
          }}
        >
          <Sidebar
            view={view}
            availableViews={availableViews}
            onChange={(v: any) => { void requestViewChange(v) }}
          />
        </div>
        {sidebarAutoHideEnabled && !sidebarExpanded ? (
          <div
            onMouseEnter={() => setSidebarAutoPeek(true)}
            style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              [sidebarLeft ? 'left' : 'right']: 0,
              width: 14,
              zIndex: 55,
              cursor: 'ew-resize',
              background: sidebarLeft
                ? 'linear-gradient(90deg, rgba(255,255,255,0.14), transparent)'
                : 'linear-gradient(270deg, rgba(255,255,255,0.14), transparent)',
              opacity: 0.48,
            }}
          />
        ) : null}
        <div style={{
          flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column',
          position: 'relative', minHeight: 0,
        }}>
          {!toolbarBottom && toolbarEl}
          <motion.div
            initial={motionRuntime.pageInitial}
            animate={motionRuntime.pageAnimate}
            exit={motionRuntime.pageExit}
            transition={motionRuntime.pageTransition}
            style={{ flex: 1, overflow: 'hidden', height: '100%', minHeight: 0, position: 'relative' }}
          >
            <div style={{ position: 'relative', height: '100%', minHeight: 0, overflow: 'hidden' }}>
              {renderMountedViews()}
            </div>
          </motion.div>
          <NexusTerminal setView={(v: any) => { void requestViewChange(v) }} openPalette={() => setPaletteOpen(true)} />
          {toolbarBottom && toolbarEl}
        </div>
      </div>
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} setView={(v: any) => { void requestViewChange(v) }} />
    </div>
  )
}
