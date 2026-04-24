import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { motion } from 'framer-motion'
import { useTheme, GLOBAL_FONTS } from './store/themeStore'
import { Sidebar, View } from './components/Sidebar'
import { TitleBar } from './components/TitleBar'
import { BootSequenceScreen } from './components/BootSequenceScreen'
import { MobileNav } from './components/MobileNav'
import { MobileTabsNav } from './components/MobileTabsNav'
import { NexusTerminal } from './components/NexusTerminal'
import { NexusToolbar } from './components/NexusToolbar'
import { CommandPalette } from './components/CommandPalette'
import { buildBackground } from './lib/visualUtils'
import { useMobile } from './lib/useMobile'
import { hexToRgb } from './lib/utils'
import { installRuntimeLagProbe } from './lib/runtimeLagProbe'
import { buildMotionRuntime } from './lib/motionEngine'
import { useGlobalTypingAnimation } from './lib/useGlobalTypingAnimation'
import { configureRenderRuntime } from './render/renderRuntime'
import {
  applyAccessibilityFlags,
  buildAdaptiveViewWarmupPlan,
  applyGlobalFont,
  applyPanelDensity,
  applySafeAreaInsets,
  applyTypographyScale,
  buildLiveViewModel,
  loadViewWarmupStats,
  NEXUS_VIEW_META,
  saveViewWarmupStats,
  resolveNexusControlUserContext,
  type NexusViewTransitionStats,
  orderViewsForNavigation,
  resolveViewHotkey,
  resolveLayoutProfile,
  sanitizeGlobalFont,
} from '@nexus/core'
import {
  createNexusRuntime,
  type NexusLiveBundle,
  type NexusRuntime,
  type NexusViewAccessResult,
} from '@nexus/api'
import {
  VIEW_IDS,
  orderMobilePreloadViews,
  preloadMobileViewChunk,
  preloadMobileViews,
} from './app/viewPreload'
import { MobileViewHost } from './app/mobileViewHost'
import { MobileShellLayout } from './app/MobileShellLayout'
import {
  CONTROL_API_BASE_URL,
  MOBILE_BOOT_BLOCK_BUDGET_LOW_POWER_MS,
  MOBILE_BOOT_BLOCK_BUDGET_MS,
  MOBILE_BOOT_PRIORITY_VIEWS,
  MOBILE_HEAVY_PRELOAD_VIEWS,
  MOBILE_PERSISTENT_VIEW_CACHE,
  MOBILE_SAFE_STARTUP_VIEWS,
  describeBootstrapFailureKind,
  isRecoverableBootstrapResourceError,
  isLowPowerDevice,
  isOfflineBootstrapResourceError,
  mergeUniqueViews,
  readLastKnownMobileStartupViews,
  resolveControlApiBaseUrl,
  shouldPrewarmHeavyMobileViews,
  isLikelyIOSRuntime,
  withTimeoutResult,
  writeLastKnownMobileStartupViews,
} from './app/mobileAppConfig'

const withDevDiagnosticsView = (views: View[]): View[] => {
  const baseViews = views.filter((candidate) => candidate !== 'diagnostics')
  if (!(import.meta as any).env?.DEV) return baseViews
  return [...baseViews, 'diagnostics']
}
type CoreView = keyof typeof NEXUS_VIEW_META

export default function App() {
  const [view, setView] = useState<View>('dashboard')
  const [availableViews, setAvailableViews] = useState<View[]>(
    withDevDiagnosticsView(MOBILE_SAFE_STARTUP_VIEWS),
  )
  const [mountedViews, setMountedViews] = useState<View[]>(['dashboard'])
  const [bootReady, setBootReady] = useState(false)
  const [bootProgress, setBootProgress] = useState(0)
  const [bootStage, setBootStage] = useState('Nexus Runtime wird gestartet...')
  const [bootFailure, setBootFailure] = useState<string | null>(null)
  const [bootFailureDetails, setBootFailureDetails] = useState<Array<{
    resource: string
    errorCode: string
    kind: string
  }> | null>(null)
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
  const isTinyMobile = mob.isMobile && Math.min(mob.screenW, mob.screenH) <= 430
  const isTightMobile = mob.isMobile && mob.screenH <= 900
  const isLandscapeMobile = mob.isMobile && mob.isLandscape
  const runtimeRef = useRef<NexusRuntime | null>(null)
  const validatedAccessRef = useRef<Partial<Record<View, NexusViewAccessResult>>>({})
  const transitionStatsRef = useRef<NexusViewTransitionStats>({})
  const recentViewsRef = useRef<View[]>(['dashboard'])
  const previousTrackedViewRef = useRef<View>('dashboard')
  const warmupPersistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const preloadTelemetryRef = useRef<Partial<Record<View, { reports: number }>>>({})
  const lagSamplesRef = useRef<Array<{ ts: number; duration: number }>>([])
  const motionRecoveryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const guardRequestSeq = useRef(0)
  const [lagPressure, setLagPressure] = useState<'low' | 'elevated' | 'critical'>('low')
  const [autoMotionSafety, setAutoMotionSafety] = useState(false)
  const lowPowerMode = useMemo(() => isLowPowerDevice(), [])
  const prefersStaticMobileContent = useMemo(
    () => isLikelyIOSRuntime() && (lowPowerMode || Boolean(t.qol?.reducedMotion ?? false)),
    [lowPowerMode, t.qol?.reducedMotion],
  )
  const motionSafetyLowPower = lowPowerMode || autoMotionSafety
  const effectiveReducedMotion = Boolean(t.qol?.reducedMotion ?? false) || autoMotionSafety
  const motionRuntime = useMemo(
    () => buildMotionRuntime(t, { lowPowerMode: motionSafetyLowPower }),
    [motionSafetyLowPower, t],
  )
  useGlobalTypingAnimation(!effectiveReducedMotion)
  const motionCssVars = useMemo(
    () =>
      ({
        '--nx-motion-quick': `${motionRuntime.quickMs}ms`,
        '--nx-motion-regular': `${motionRuntime.regularMs}ms`,
        '--nx-motion-hover-ease': motionRuntime.hoverEase,
        '--nx-motion-press-ease': motionRuntime.pressEase,
        '--nx-motion-settle-ease': motionRuntime.settleEase,
        '--nx-hover-lift': `${motionRuntime.hoverLiftPx}px`,
        '--nx-hover-scale': `${motionRuntime.hoverScale}`,
        '--nx-press-scale': `${motionRuntime.pressScale}`,
        '--nx-hover-extra-scale': `${motionRuntime.hoverExtraScale}`,
      }) as React.CSSProperties,
    [motionRuntime],
  )
  const isCoreView = useCallback(
    (candidate: View): candidate is CoreView =>
      Object.prototype.hasOwnProperty.call(NEXUS_VIEW_META, candidate),
    [],
  )

  useEffect(() => {
    configureRenderRuntime({
      lowPowerMode: motionSafetyLowPower,
      reducedMotion: effectiveReducedMotion,
      motion: {
        quickMs: motionRuntime.quickMs,
        regularMs: motionRuntime.regularMs,
        hoverEase: motionRuntime.hoverEase,
        pressEase: motionRuntime.pressEase,
        settleEase: motionRuntime.settleEase,
        hoverLiftPx: motionRuntime.hoverLiftPx,
        hoverScale: motionRuntime.hoverScale,
        pressScale: motionRuntime.pressScale,
        hoverExtraScale: motionRuntime.hoverExtraScale,
      },
    })
  }, [
    effectiveReducedMotion,
    motionRuntime.hoverEase,
    motionRuntime.hoverExtraScale,
    motionRuntime.hoverLiftPx,
    motionRuntime.hoverScale,
    motionRuntime.pressEase,
    motionRuntime.pressScale,
    motionRuntime.quickMs,
    motionRuntime.regularMs,
    motionRuntime.settleEase,
    motionSafetyLowPower,
  ])

  useEffect(() => {
    const sidebarStyle = (t as any).sidebarStyle
    const autoHideEnabled = Boolean(t.qol?.sidebarAutoHide) && sidebarStyle !== 'hidden'
    if (!autoHideEnabled) {
      setSidebarAutoPeek(false)
    }
  }, [t.qol?.sidebarAutoHide, (t as any).sidebarStyle])

  const viewAccessContext = useMemo(() => resolveNexusControlUserContext({
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

  const flushWarmupStats = useCallback(() => {
    const recentViews = recentViewsRef.current.filter((entry) => isCoreView(entry))
    void saveViewWarmupStats('mobile', {
      transitionStats: transitionStatsRef.current,
      recentViews,
    })
  }, [isCoreView])

  const scheduleWarmupStatsPersist = useCallback(() => {
    if (warmupPersistTimerRef.current !== null) {
      clearTimeout(warmupPersistTimerRef.current)
    }
    warmupPersistTimerRef.current = globalThis.setTimeout(() => {
      warmupPersistTimerRef.current = null
      flushWarmupStats()
    }, 900)
  }, [flushWarmupStats])

  const trackLagPressure = useCallback((durationMs: number) => {
    if (!Number.isFinite(durationMs) || durationMs < 80) return

    const nowTs = Date.now()
    lagSamplesRef.current = [
      ...lagSamplesRef.current.filter((sample) => nowTs - sample.ts <= 12_000),
      { ts: nowTs, duration: durationMs },
    ]

    const severeCount = lagSamplesRef.current.filter((sample) => sample.duration >= 180).length
    const mediumCount = lagSamplesRef.current.filter((sample) => sample.duration >= 120).length
    const nextPressure: 'low' | 'elevated' | 'critical' =
      severeCount >= 3 || mediumCount >= 6
        ? 'critical'
        : severeCount >= 1 || mediumCount >= 3
          ? 'elevated'
          : 'low'
    setLagPressure((prev) => (prev === nextPressure ? prev : nextPressure))

    if (nextPressure === 'critical') {
      setAutoMotionSafety(true)
      if (motionRecoveryTimerRef.current !== null) {
        clearTimeout(motionRecoveryTimerRef.current)
      }
      motionRecoveryTimerRef.current = globalThis.setTimeout(() => {
        motionRecoveryTimerRef.current = null
        lagSamplesRef.current = []
        setLagPressure('low')
        setAutoMotionSafety(false)
      }, 25_000)
    }
  }, [])

  useEffect(() => {
    let active = true
    void loadViewWarmupStats('mobile')
      .then((payload) => {
        if (!active) return
        transitionStatsRef.current = payload.transitionStats || {}
        const loadedRecent = (payload.recentViews || []) as View[]
        recentViewsRef.current = [
          view,
          ...loadedRecent.filter((entry) => entry !== view),
        ].slice(0, 8)
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [])

  useEffect(
    () => () => {
      if (warmupPersistTimerRef.current !== null) {
        clearTimeout(warmupPersistTimerRef.current)
      }
      if (motionRecoveryTimerRef.current !== null) {
        clearTimeout(motionRecoveryTimerRef.current)
      }
      flushWarmupStats()
    },
    [flushWarmupStats],
  )

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
    if (!bundle) return withDevDiagnosticsView(MOBILE_SAFE_STARTUP_VIEWS)

    const model = buildLiveViewModel({
      appId: 'mobile',
      catalog: bundle.catalog ?? null,
      schema: bundle.layoutSchema ?? null,
    })
    emitViewFilterDebugEvents(model.filterDebugEvents)
    const nextViews = model.views
      .map((candidate) => candidate as View)
      .filter((candidate) => VIEW_IDS.includes(candidate))

    return withDevDiagnosticsView(
      nextViews.length > 0 ? nextViews : MOBILE_SAFE_STARTUP_VIEWS,
    )
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
      const chunk = preloadMobileViewChunk(viewId)
      if (!chunk) return

      const budget = timeoutMs ?? (
        lagPressure === 'critical'
          ? 90
          : lagPressure === 'elevated'
            ? 130
            : lowPowerMode
              ? 180
              : 80
      )
      const startedAt = typeof performance !== 'undefined' ? performance.now() : Date.now()
      const result = await withTimeoutResult(chunk.promise, budget)
      const endedAt = typeof performance !== 'undefined' ? performance.now() : Date.now()
      const durationMs = Number(Math.max(0, endedAt - startedAt).toFixed(2))

      const telemetry = preloadTelemetryRef.current[viewId] || { reports: 0 }
      const shouldReport = telemetry.reports < 8 || result.timedOut
      if (shouldReport) {
        telemetry.reports += 1
        preloadTelemetryRef.current[viewId] = telemetry
        const runtime = runtimeRef.current
        runtime?.connection.publish('custom', {
          event: 'view_preload',
          appId: 'mobile',
          viewId,
          cacheStatus: chunk.warm ? 'hit' : 'miss',
          durationMs,
          timedOut: result.timedOut,
          lagPressure,
        }, 'all')
      }

      const recordCustomMetric = (runtimeRef.current?.performance as any)?.recordCustomMetric
      if (typeof recordCustomMetric === 'function') {
        try {
          recordCustomMetric.call(runtimeRef.current?.performance, 'mobile.view_preload_ms', durationMs, 'ms')
          if (result.timedOut) {
            recordCustomMetric.call(runtimeRef.current?.performance, 'mobile.view_preload_timeout', 1, 'count')
          }
        } catch {
          // best-effort only
        }
      }
    },
    [lagPressure, lowPowerMode],
  )

  useEffect(() => {
    const controlBaseUrl = resolveControlApiBaseUrl() || CONTROL_API_BASE_URL
    const controlIngestKey = (import.meta as any).env?.VITE_NEXUS_CONTROL_INGEST_KEY as string | undefined
    const safeStartupViews = withDevDiagnosticsView(
      mergeUniqueViews(
        MOBILE_SAFE_STARTUP_VIEWS.filter((candidate) => VIEW_IDS.includes(candidate)),
        readLastKnownMobileStartupViews(),
      ),
    )
    const hardenedSafeStartupViews =
      safeStartupViews.length > 0
        ? safeStartupViews
        : withDevDiagnosticsView(['dashboard', 'notes', 'tasks', 'settings', 'files'])

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
        requestTimeoutMs: lowPowerMode ? 7_200 : 5_200,
        readRetryMax: lowPowerMode ? 3 : 2,
        readRetryBaseMs: 220,
        readRetryMaxMs: 1_900,
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
    runtime.control.setViewValidationDefaults(viewAccessContext)
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
        trackLagPressure(metric)
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
    setBootFailureDetails(null)
    setBootProgress(8)
    setBootStage('Nexus Runtime wird gestartet...')

    void preloadMobileViews(hardenedSafeStartupViews, {
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
            kind: describeBootstrapFailureKind(errorCode),
          }))

        if (failedResources.length > 0) {
          const offlineOnly = failedResources.every((entry) => isOfflineBootstrapResourceError(entry.errorCode))
          const recoverableOnly = failedResources.every((entry) =>
            isRecoverableBootstrapResourceError(entry.errorCode),
          )
          const shouldUseSafeFallback = recoverableOnly && hardenedSafeStartupViews.length > 0
          runtime.connection.publish(
            'custom',
            {
              event: 'mobile_bootstrap_resources_partial',
              appId: 'mobile',
              failedResources,
              fallbackStartupViews: shouldUseSafeFallback ? hardenedSafeStartupViews : [],
            },
            'all',
          )
          if (!offlineOnly && !shouldUseSafeFallback) {
            if (active) {
              setBootFailureDetails(failedResources)
            }
            throw new Error(`CONTROL_API_BOOTSTRAP_FAILED (${failedResources.map((entry) => `${entry.resource}:${entry.errorCode}`).join(', ')})`)
          }
          if (shouldUseSafeFallback) {
            console.warn('[Nexus Mobile] bootstrap fallback to safe startup views', {
              failedResources,
              fallbackViews: hardenedSafeStartupViews,
            })
            setBootStep(42, 'Hosted API teilweise nicht erreichbar, sichere lokale Views werden genutzt...')
          }
        }

        const hasPartialBootstrapPayload = Boolean(
          catalogResult.item || layoutResult.item || releaseResult.item,
        )
        const bundle: NexusLiveBundle | null = hasPartialBootstrapPayload
          ? {
              appId: 'mobile',
              channel: 'production',
              catalog: catalogResult.item ?? null,
              layoutSchema: layoutResult.item ?? null,
              release: releaseResult.item ?? null,
            }
          : null

        if (!active) return
        applyLiveBundle(bundle)
        setBootStep(54, 'Validiere verfuegbare Views...')
        const startupViewsFromBundle = bundle
          ? resolveBundleViews(bundle)
          : hardenedSafeStartupViews
        const startupViews = startupViewsFromBundle.length > 0
          ? startupViewsFromBundle
          : hardenedSafeStartupViews
        if (startupViews.length === 0) {
          throw new Error('CONTROL_API_BOOTSTRAP_FAILED (NO_STARTUP_VIEWS)')
        }
        writeLastKnownMobileStartupViews(startupViews)

        const prioritizedStartupViews = orderMobilePreloadViews(startupViews)
        const priorityPrewarmViews = MOBILE_BOOT_PRIORITY_VIEWS.filter((candidate) =>
          startupViews.includes(candidate),
        )
        const allowHeavyBootWarmup = shouldPrewarmHeavyMobileViews({ lowPowerMode })
        const heavyPrewarmViews =
          allowHeavyBootWarmup
            ? Array.from(MOBILE_HEAVY_PRELOAD_VIEWS).filter((candidate) =>
                startupViews.includes(candidate),
              )
            : []
        const persistentCacheViews = MOBILE_PERSISTENT_VIEW_CACHE.filter((candidate) =>
          startupViews.includes(candidate),
        ).filter((candidate) => (
          allowHeavyBootWarmup ? true : !MOBILE_HEAVY_PRELOAD_VIEWS.has(candidate)
        ))
        setAvailableViews(startupViews)
        setView((prev) => (startupViews.includes(prev) ? prev : startupViews[0]))
        setMountedViews(
          mergeUniqueViews(
            [startupViews[0]],
            persistentCacheViews,
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
  }, [applyLiveBundle, lowPowerMode, resolveBundleViews, storeWarmupAccess, trackLagPressure, viewAccessContext])

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
      reducedMotion: effectiveReducedMotion,
      highContrast: t.qol?.highContrast ?? false,
    })
  }, [effectiveReducedMotion, t.qol?.highContrast])

  useEffect(() => {
    const sz = t.qol?.fontSize ?? (mob.isMobile ? 14 : 14)
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
    const root = document.documentElement
    if (!mob.isMobile) {
      delete root.dataset.nxMobileCompact
      delete root.dataset.nxMobileCompactSize
      delete root.dataset.nxMobileCompactHeight
      delete root.dataset.nxMobileOrientation
      return
    }
    root.dataset.nxMobileCompact = '1'
    root.dataset.nxMobileCompactSize = isTinyMobile ? 'small' : 'regular'
    root.dataset.nxMobileCompactHeight = isTightMobile ? 'tight' : 'regular'
    root.dataset.nxMobileOrientation = isLandscapeMobile ? 'landscape' : 'portrait'
    return () => {
      delete root.dataset.nxMobileCompact
      delete root.dataset.nxMobileCompactSize
      delete root.dataset.nxMobileCompactHeight
      delete root.dataset.nxMobileOrientation
    }
  }, [isLandscapeMobile, isTightMobile, isTinyMobile, mob.isMobile])

  useEffect(() => {
    if (!mob.isMobile) return
    const root = document.documentElement
    const resolveViewportDimension = (candidate: unknown, fallback: number) => {
      const numeric = Number(candidate)
      if (!Number.isFinite(numeric)) return fallback
      // iOS/WebKit can transiently report 0 or near-zero visualViewport sizes.
      if (numeric < 120) return fallback
      return numeric
    }
    const syncTouchMode = () => {
      const prefersCoarsePointer =
        window.matchMedia('(pointer: coarse)').matches
        || window.matchMedia('(hover: none)').matches
      root.dataset.nxTouch = prefersCoarsePointer ? 'coarse' : 'fine'
    }
    const syncViewport = () => {
      const viewport = window.visualViewport
      const fallbackWidth = Math.max(120, Math.round(window.innerWidth || 390))
      const fallbackHeight = Math.max(120, Math.round(window.innerHeight || 844))
      const viewportWidth = Math.round(
        resolveViewportDimension(viewport?.width, fallbackWidth),
      )
      const viewportHeight = Math.round(
        resolveViewportDimension(viewport?.height, fallbackHeight),
      )
      const viewportOffsetTop = Math.max(0, Math.round(viewport?.offsetTop ?? 0))
      root.style.setProperty('--nx-mobile-vw', `${viewportWidth}px`)
      root.style.setProperty('--nx-mobile-vh', `${viewportHeight}px`)
      root.style.setProperty('--nx-mobile-viewport-top', `${viewportOffsetTop}px`)
    }
    let rafId: number | null = null
    const queueViewportSync = () => {
      if (rafId !== null) return
      rafId = window.requestAnimationFrame(() => {
        rafId = null
        syncViewport()
      })
    }
    const viewport = window.visualViewport
    const coarsePointerQuery = window.matchMedia('(pointer: coarse)')
    const hoverNoneQuery = window.matchMedia('(hover: none)')

    syncTouchMode()
    queueViewportSync()

    window.addEventListener('resize', queueViewportSync, { passive: true })
    window.addEventListener('orientationchange', queueViewportSync)
    viewport?.addEventListener('resize', queueViewportSync)
    viewport?.addEventListener('scroll', queueViewportSync)
    if (typeof coarsePointerQuery.addEventListener === 'function') {
      coarsePointerQuery.addEventListener('change', syncTouchMode)
      hoverNoneQuery.addEventListener('change', syncTouchMode)
    } else {
      coarsePointerQuery.addListener(syncTouchMode)
      hoverNoneQuery.addListener(syncTouchMode)
    }

    return () => {
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId)
      }
      window.removeEventListener('resize', queueViewportSync)
      window.removeEventListener('orientationchange', queueViewportSync)
      viewport?.removeEventListener('resize', queueViewportSync)
      viewport?.removeEventListener('scroll', queueViewportSync)
      if (typeof coarsePointerQuery.removeEventListener === 'function') {
        coarsePointerQuery.removeEventListener('change', syncTouchMode)
        hoverNoneQuery.removeEventListener('change', syncTouchMode)
      } else {
        coarsePointerQuery.removeListener(syncTouchMode)
        hoverNoneQuery.removeListener(syncTouchMode)
      }
      delete root.dataset.nxTouch
    }
  }, [mob.isMobile])

  useEffect(() => {
    const previous = previousTrackedViewRef.current
    if (previous !== view) {
      const bucket = transitionStatsRef.current[previous] || {}
      bucket[view] = (bucket[view] || 0) + 1
      transitionStatsRef.current[previous] = bucket
    }
    previousTrackedViewRef.current = view
    recentViewsRef.current = [
      view,
      ...recentViewsRef.current.filter((entry) => entry !== view),
    ].slice(0, 8)
    scheduleWarmupStatsPersist()

    const runtime = runtimeRef.current
    if (!runtime) return

    runtime.connection.sendNavigation(view)
    runtime.connection.syncState('mobile.activeView', view)
    runtime.connection.syncState('mobile.isMobile', mob.isMobile)
    runtime.performance.trackViewRender(`mobile:${view}`)
  }, [mob.isMobile, scheduleWarmupStatsPersist, view])

  const requestViewChange = useCallback(async (nextRaw: unknown) => {
    const next = String(nextRaw || '').toLowerCase() as View
    if (next === 'diagnostics' && !(import.meta as any).env?.DEV) return
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
    if (!bootReady) return
    const warmupMaxItems =
      lagPressure === 'critical'
        ? 1
        : lagPressure === 'elevated'
          ? lowPowerMode
            ? 1
            : 2
          : lowPowerMode
            ? 2
            : 4
    const coreAvailableViews = availableViews.filter((candidate) => isCoreView(candidate))
    const coreMountedViews = mountedViews.filter((candidate) => isCoreView(candidate))
    const coreRecentViews = recentViewsRef.current.filter((candidate) => isCoreView(candidate))
    const currentCoreView = isCoreView(view) ? view : 'dashboard'
    const queue = buildAdaptiveViewWarmupPlan({
      currentView: currentCoreView,
      availableViews: coreAvailableViews,
      mountedViews: coreMountedViews,
      transitionStats: transitionStatsRef.current,
      recentViews: coreRecentViews,
      maxItems: warmupMaxItems,
    }) as View[]
    if (queue.length === 0) return

    const warmupPerViewBudgetMs =
      lagPressure === 'critical'
        ? 90
        : lagPressure === 'elevated'
          ? 130
          : lowPowerMode
            ? 240
            : 140

    let cancelled = false
    const warmup = () => {
      if (cancelled) return
      void (async () => {
        for (const candidate of queue) {
          if (cancelled || candidate === view) break
          await preloadViewChunk(candidate, warmupPerViewBudgetMs)
        }
      })()
    }

    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      const handle = (window as any).requestIdleCallback(warmup, { timeout: 1_000 })
      return () => {
        cancelled = true
        ;(window as any).cancelIdleCallback?.(handle)
      }
    }

    const fallbackHandle = globalThis.setTimeout(warmup, 80)
    return () => {
      cancelled = true
      clearTimeout(fallbackHandle)
    }
  }, [availableViews, bootReady, lagPressure, lowPowerMode, mountedViews, preloadViewChunk, view])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      const isEditing = Boolean(
        target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable),
      )

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setPaletteOpen((s) => !s)
      } else if (!isEditing && (e.metaKey || e.ctrlKey) && /^[1-9]$/.test(e.key)) {
        const coreAvailableViews = availableViews.filter((candidate) => isCoreView(candidate))
        const nextView = resolveViewHotkey(Number(e.key) - 1, coreAvailableViews) as View | null
        if (!nextView) return
        e.preventDefault()
        void requestViewChange(nextView)
      } else if (!isEditing && (e.metaKey || e.ctrlKey) && (e.key === '[' || e.key === ']')) {
        const coreAvailableViews = availableViews.filter((candidate) => isCoreView(candidate))
        const orderedViews = orderViewsForNavigation(coreAvailableViews) as View[]
        if (orderedViews.length < 2) return
        const currentIndex = Math.max(0, orderedViews.indexOf(view))
        const delta = e.key === ']' ? 1 : -1
        const nextIndex = (currentIndex + delta + orderedViews.length) % orderedViews.length
        const nextView = orderedViews[nextIndex]
        if (!nextView || nextView === view) return
        e.preventDefault()
        void requestViewChange(nextView)
      } else if (e.key === 'Escape') {
        setPaletteOpen(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [availableViews, isCoreView, requestViewChange, view])

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
          {bootFailureDetails && bootFailureDetails.length > 0 ? (
            <div style={{ marginTop: 8, fontSize: 12, opacity: 0.9 }}>
              {bootFailureDetails.map((entry) => (
                <div key={`${entry.resource}-${entry.errorCode}`}>
                  - {entry.resource}: {entry.errorCode} ({entry.kind})
                </div>
              ))}
            </div>
          ) : null}
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
  const requestedNavigationMode = remoteNavigation || 'bottom-nav'
  const mobileNavigationMode = requestedNavigationMode === 'tabs' ? 'tabs' : 'bottom-nav'
  const showMobileBottomNav = mobileNavigationMode === 'bottom-nav'
  const showMobileTabsNav = mobileNavigationMode === 'tabs'
  const mobileNavBaseHeight = isTightMobile
    ? (isTinyMobile ? 32 : 34)
    : (isTinyMobile ? 34 : 36)
  const MOBILE_NAV_HEIGHT = showMobileBottomNav ? (mobileNavBaseHeight + mob.safeBottom) : 0

  const viewHostNode = (
    <MobileViewHost
      view={view}
      mountedViews={mountedViews}
      availableViews={availableViews}
      reducedMotion={effectiveReducedMotion}
      onRequestViewChange={(nextView) => {
        void requestViewChange(nextView)
      }}
    />
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

  // ── MOBILE LAYOUT ───────────────────────────────────────────────────────
  if (mob.isMobile) {
    return (
      <MobileShellLayout
        theme={t}
        motionRuntime={motionRuntime}
        motionCssVars={motionCssVars}
        backgroundStyles={bgStyles}
        lowPowerMode={lowPowerMode}
        accentRgb={hexToRgb(t.accent)}
        accent2Rgb={hexToRgb(t.accent2)}
        fontSize={isTightMobile
          ? (isTinyMobile ? 'var(--nx-font-size, 12px)' : 'var(--nx-font-size, 13px)')
          : (isTinyMobile ? 'var(--nx-font-size, 13px)' : 'var(--nx-font-size, 14px)')}
      >
        <div
          className='nx-mobile-frame'
          style={{
            ['--nx-mobile-nav-height' as any]: `${MOBILE_NAV_HEIGHT}px`,
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            minHeight: 0,
            overscrollBehavior: 'none',
            WebkitTapHighlightColor: 'transparent',
            paddingTop: `calc(env(safe-area-inset-top, ${mob.safeTop}px) + ${mob.isNative ? '0px' : 'var(--nx-mobile-viewport-top, 0px)'})`,
          }}
        >
        {/* Mobile header strip */}
        <div
          className='nx-motion-surface nx-mobile-header'
          style={{
          minHeight: isTightMobile ? (isTinyMobile ? 30 : 32) : (isTinyMobile ? 32 : 34), display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: isTightMobile ? (isTinyMobile ? 4 : 5) : (isTinyMobile ? 5 : 6), padding: isTightMobile ? (isTinyMobile ? '3px 7px' : '4px 8px') : (isTinyMobile ? '4px 8px' : '5px 9px'), flexShrink: 0,
          background: t.mode === 'dark'
            ? 'linear-gradient(180deg, rgba(255,255,255,0.14), rgba(8,10,18,0.68))'
            : 'linear-gradient(180deg, rgba(255,255,255,0.95), rgba(245,248,255,0.72))',
          backdropFilter: lowPowerMode ? 'none' : 'blur(30px) saturate(220%)',
          WebkitBackdropFilter: lowPowerMode ? 'none' : 'blur(30px) saturate(220%)',
          borderBottom: `1px solid ${t.mode === 'dark' ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.9)'}`,
          boxShadow: t.mode === 'dark'
            ? 'inset 0 1px 0 rgba(255,255,255,0.24)'
            : 'inset 0 1px 0 rgba(255,255,255,0.96)',
        }}
        >
          <button
            className="nx-icon-btn nx-mobile-touch-button nx-mobile-header-button"
            onClick={() => { void requestViewChange('dashboard') }}
            aria-label="Zum Dashboard"
            style={{
              minWidth: isTightMobile ? (isTinyMobile ? 30 : 32) : (isTinyMobile ? 32 : 34),
              height: isTightMobile ? (isTinyMobile ? 28 : 30) : (isTinyMobile ? 30 : 32),
              borderRadius: isTightMobile ? 8 : (isTinyMobile ? 9 : 10),
              border: 'none',
              cursor: 'pointer',
              background: t.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
              color: t.mode === 'dark' ? '#fff' : '#111',
              fontSize: isTightMobile ? (isTinyMobile ? 10 : 11) : (isTinyMobile ? 11 : 12), fontWeight: 900,
            }}
          >
            ✦
          </button>

          <div style={{ flex: 1, minWidth: 0, textAlign: 'center' }}>
              <div style={{ fontSize: isTightMobile ? (isTinyMobile ? 10 : 11) : (isTinyMobile ? 11 : 12), fontWeight: 800, lineHeight: 1.2, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
              {mobileMeta.title}
            </div>
            {!isLandscapeMobile && !isTightMobile ? (
              <div style={{ fontSize: isTinyMobile ? 8 : 9, opacity: 0.62, marginTop: 1, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                {mobileMeta.subtitle}
              </div>
            ) : null}
          </div>

          <button
            className="nx-icon-btn nx-mobile-touch-button nx-mobile-header-button"
            onClick={() => { void requestViewChange('settings') }}
            aria-label="Zu den Einstellungen"
            style={{
              minWidth: isTightMobile ? (isTinyMobile ? 30 : 32) : (isTinyMobile ? 32 : 34),
              height: isTightMobile ? (isTinyMobile ? 28 : 30) : (isTinyMobile ? 30 : 32),
              borderRadius: isTightMobile ? 8 : (isTinyMobile ? 9 : 10),
              border: 'none',
              cursor: 'pointer',
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

        {showMobileTabsNav ? (
          <MobileTabsNav
            view={view}
            availableViews={availableViews}
            onChange={(v) => { void requestViewChange(v) }}
          />
        ) : null}

        {/* Main content */}
        <div
          className='nx-mobile-main'
          style={{
            flex: 1,
            minHeight: 0,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            paddingBottom: showMobileBottomNav ? MOBILE_NAV_HEIGHT : 0,
            WebkitOverflowScrolling: 'touch',
            overscrollBehaviorY: 'contain',
            touchAction: 'pan-y pinch-zoom',
          }}
        >
          {prefersStaticMobileContent ? (
            <div
              className='nx-mobile-main-stage nx-mobile-main-stage--static'
              style={{
                height: '100%',
                minHeight: 0,
                overflow: 'hidden',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {viewHostNode}
            </div>
          ) : (
            <motion.div
              className='nx-mobile-main-stage nx-mobile-main-stage--motion'
              initial={motionRuntime.pageInitial}
              animate={motionRuntime.pageAnimate}
              exit={motionRuntime.pageExit}
              transition={motionRuntime.pageTransition}
              style={{ height: '100%', minHeight: 0, overflow: 'hidden', position: 'relative' }}
            >
              {viewHostNode}
            </motion.div>
          )}
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
      </MobileShellLayout>
    )
  }

  // ── TABLET / DESKTOP LAYOUT (unchanged) ─────────────────────────────────
  return (
      <MobileShellLayout
        theme={t}
        motionRuntime={motionRuntime}
        motionCssVars={motionCssVars}
        backgroundStyles={bgStyles}
        lowPowerMode={lowPowerMode}
        accentRgb={hexToRgb(t.accent)}
        accent2Rgb={hexToRgb(t.accent2)}
        fontSize='var(--nx-font-size, 14px)'
      >
      <TitleBar
        showDiagnosticsButton={Boolean((import.meta as any).env?.DEV)}
        onOpenDiagnostics={() => { void requestViewChange('diagnostics') }}
      />
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
          className='nx-motion-surface'
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
        <div
          className='nx-motion-surface'
          style={{
          flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column',
          position: 'relative', minHeight: 0,
        }}
        >
          {!toolbarBottom && toolbarEl}
          <motion.div
            initial={motionRuntime.pageInitial}
            animate={motionRuntime.pageAnimate}
            exit={motionRuntime.pageExit}
            transition={motionRuntime.pageTransition}
            style={{ flex: 1, overflow: 'hidden', height: '100%', minHeight: 0, position: 'relative' }}
          >
            <div style={{ position: 'relative', height: '100%', minHeight: 0, overflow: 'hidden' }}>
              {viewHostNode}
            </div>
          </motion.div>
          <NexusTerminal setView={(v: any) => { void requestViewChange(v) }} openPalette={() => setPaletteOpen(true)} />
          {toolbarBottom && toolbarEl}
        </div>
      </div>
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} setView={(v: any) => { void requestViewChange(v) }} />
    </MobileShellLayout>
  )
}
