import React, {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
} from "react";
import { useTheme, GLOBAL_FONTS } from "./store/themeStore";
import { useTerminal } from "./store/terminalStore";
import type { View } from "./components/Sidebar";
import { BootSequenceScreen } from "./components/BootSequenceScreen";
import { buildBackground } from "./lib/visualUtils";
import { hexToRgb } from "./lib/utils";
import { installRuntimeLagProbe } from "./lib/runtimeLagProbe";
import { buildMotionRuntime } from "./lib/motionEngine";
import { useGlobalTypingAnimation } from "./lib/useGlobalTypingAnimation";
import { useWorkspaceRuntimeSync } from "./hooks/useWorkspaceRuntimeSync";
import {
  applyAccessibilityFlags,
  buildAdaptiveViewWarmupPlan,
  applyGlobalFont,
  applyPanelDensity,
  applyTypographyScale,
  buildLiveViewModel,
  loadViewWarmupStats,
  orderViewsForNavigation,
  saveViewWarmupStats,
  type NexusViewTransitionStats,
  resolveViewHotkey,
  resolveLayoutProfile,
  sanitizeGlobalFont,
} from "@nexus/core";
import {
  createNexusRuntime,
  type NexusLiveBundle,
  type NexusRuntime,
  type NexusViewAccessResult,
} from "@nexus/api";
import {
  VIEW_IDS,
  orderMainPreloadViews,
  preloadMainViewChunk,
  preloadMainViews,
} from "./app/viewPreload";
import { MainViewHost } from "./app/mainViewHost";
import { MainShellLayout } from "./app/MainShellLayout";
import {
  CONTROL_API_BASE_URL,
  MAIN_BOOT_PRELOAD_TIMEOUT_LOW_POWER_MS,
  MAIN_BOOT_PRELOAD_TIMEOUT_MS,
  MAIN_BOOT_PRIORITY_VIEWS,
  MAIN_BOOT_VIEW_WARMUP_TIMEOUT_LOW_POWER_MS,
  MAIN_BOOT_VIEW_WARMUP_TIMEOUT_MS,
  MAIN_CORE_FALLBACK_VIEWS,
  MAIN_CRITICAL_PRELOAD_VIEWS,
  MAIN_HEAVY_PRELOAD_VIEW_SET,
  MAIN_PERSISTENT_VIEW_CACHE,
  MAIN_SAFE_STARTUP_VIEWS,
  isLowPowerDevice,
  isOfflineBootstrapResourceError,
  mergeUniqueViews,
  withTimeoutResult,
} from "./app/mainAppConfig";

export default function App() {
  useWorkspaceRuntimeSync();
  const [view, setView] = useState<View>("dashboard");
  const [availableViews, setAvailableViews] = useState<View[]>(
    MAIN_SAFE_STARTUP_VIEWS,
  );
  const [mountedViews, setMountedViews] = useState<View[]>(["dashboard"]);
  const [bootReady, setBootReady] = useState(false);
  const [bootProgress, setBootProgress] = useState(0);
  const [bootStage, setBootStage] = useState("Nexus Runtime wird gestartet...");
  const [bootFailure, setBootFailure] = useState<string | null>(null);
  const [remoteDensity, setRemoteDensity] = useState<
    "compact" | "comfortable" | "spacious" | null
  >(null);
  const [viewGuardState, setViewGuardState] = useState<{
    checking: boolean;
    blockedView: string | null;
    requiredTier: string | null;
    reason: string | null;
  }>({
    checking: false,
    blockedView: null,
    requiredTier: null,
    reason: null,
  });
  const [sidebarAutoPeek, setSidebarAutoPeek] = useState(false);
  const t = useTheme();
  const terminalOpen = useTerminal((s) => s.isOpen);
  const runtimeRef = useRef<NexusRuntime | null>(null);
  const validatedAccessRef = useRef<
    Partial<Record<View, NexusViewAccessResult>>
  >({});
  const transitionStatsRef = useRef<NexusViewTransitionStats>({});
  const recentViewsRef = useRef<View[]>(["dashboard"]);
  const previousTrackedViewRef = useRef<View>("dashboard");
  const warmupPersistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const preloadTelemetryRef = useRef<
    Partial<Record<View, { reports: number }>>
  >({});
  const lagSamplesRef = useRef<Array<{ ts: number; duration: number }>>([]);
  const motionRecoveryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const guardRequestSeq = useRef(0);
  const [lagPressure, setLagPressure] = useState<
    "low" | "elevated" | "critical"
  >("low");
  const [autoMotionSafety, setAutoMotionSafety] = useState(false);
  const lowPowerMode = useMemo(() => isLowPowerDevice(), []);
  const motionSafetyLowPower = lowPowerMode || autoMotionSafety;
  const effectiveReducedMotion =
    Boolean(t.qol?.reducedMotion ?? false) || autoMotionSafety;

  const viewAccessContext = useMemo(
    () => ({
      userId: (import.meta as any).env?.VITE_NEXUS_USER_ID as
        | string
        | undefined,
      username: (import.meta as any).env?.VITE_NEXUS_USERNAME as
        | string
        | undefined,
      userTier: (import.meta as any).env?.VITE_NEXUS_USER_TIER as
        | "free"
        | "paid"
        | undefined,
    }),
    [],
  );

  const emitViewFilterDebugEvents = useCallback(
    (events: Array<{ viewId: string; reason: string }> | undefined) => {
      if (!Array.isArray(events) || events.length === 0) return;
      const runtime = runtimeRef.current;
      for (const item of events) {
        const viewId = String(item?.viewId || "");
        const reason = String(item?.reason || "unknown");
        if (!viewId) continue;
        console.info("[Nexus Main] view filtered by live model", {
          viewId,
          reason,
        });
        runtime?.connection.publish(
          "custom",
          {
            event: "view_filtered",
            appId: "main",
            viewId,
            reason,
          },
          "all",
        );
      }
    },
    [],
  );

  const flushWarmupStats = useCallback(() => {
    void saveViewWarmupStats("main", {
      transitionStats: transitionStatsRef.current,
      recentViews: recentViewsRef.current,
    });
  }, []);

  const scheduleWarmupStatsPersist = useCallback(() => {
    if (warmupPersistTimerRef.current !== null) {
      clearTimeout(warmupPersistTimerRef.current);
    }
    warmupPersistTimerRef.current = globalThis.setTimeout(() => {
      warmupPersistTimerRef.current = null;
      flushWarmupStats();
    }, 900);
  }, [flushWarmupStats]);

  const trackLagPressure = useCallback((durationMs: number) => {
    if (!Number.isFinite(durationMs) || durationMs < 80) return;

    const nowTs = Date.now();
    lagSamplesRef.current = [
      ...lagSamplesRef.current.filter((sample) => nowTs - sample.ts <= 12_000),
      { ts: nowTs, duration: durationMs },
    ];

    const severeCount = lagSamplesRef.current.filter(
      (sample) => sample.duration >= 180,
    ).length;
    const mediumCount = lagSamplesRef.current.filter(
      (sample) => sample.duration >= 120,
    ).length;

    const nextPressure: "low" | "elevated" | "critical" =
      severeCount >= 3 || mediumCount >= 6
        ? "critical"
        : severeCount >= 1 || mediumCount >= 3
          ? "elevated"
          : "low";
    setLagPressure((prev) => (prev === nextPressure ? prev : nextPressure));

    if (nextPressure === "critical") {
      setAutoMotionSafety(true);
      if (motionRecoveryTimerRef.current !== null) {
        clearTimeout(motionRecoveryTimerRef.current);
      }
      motionRecoveryTimerRef.current = globalThis.setTimeout(() => {
        motionRecoveryTimerRef.current = null;
        lagSamplesRef.current = [];
        setLagPressure("low");
        setAutoMotionSafety(false);
      }, 25_000);
    }
  }, []);

  useEffect(() => {
    let active = true;
    void loadViewWarmupStats("main")
      .then((payload) => {
        if (!active) return;
        transitionStatsRef.current = payload.transitionStats || {};
        const loadedRecent = (payload.recentViews || []) as View[];
        recentViewsRef.current = [
          view,
          ...loadedRecent.filter((entry) => entry !== view),
        ].slice(0, 8);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  useEffect(
    () => () => {
      if (warmupPersistTimerRef.current !== null) {
        clearTimeout(warmupPersistTimerRef.current);
      }
      if (motionRecoveryTimerRef.current !== null) {
        clearTimeout(motionRecoveryTimerRef.current);
      }
      flushWarmupStats();
    },
    [flushWarmupStats],
  );

  useEffect(() => {
    setMountedViews((prev) => {
      const filtered = prev.filter((entry) => availableViews.includes(entry));
      if (availableViews.includes(view) && !filtered.includes(view)) {
        filtered.push(view);
      }
      if (filtered.length > 0) return filtered;
      const fallback = availableViews[0] ?? "dashboard";
      return [fallback];
    });
  }, [availableViews, view]);

  const resolveBundleViews = useCallback(
    (bundle: NexusLiveBundle | null) => {
      if (!bundle) return MAIN_SAFE_STARTUP_VIEWS;

      const model = buildLiveViewModel({
        appId: "main",
        catalog: bundle.catalog ?? null,
        schema: bundle.layoutSchema ?? null,
      });
      emitViewFilterDebugEvents(model.filterDebugEvents);

      const nextViews = model.views
        .map((candidate) => candidate as View)
        .filter((candidate) => VIEW_IDS.includes(candidate));

      return nextViews.length > 0 ? nextViews : MAIN_SAFE_STARTUP_VIEWS;
    },
    [emitViewFilterDebugEvents],
  );

  const applyLiveBundle = useCallback(
    (bundle: NexusLiveBundle | null) => {
      const nextViews = resolveBundleViews(bundle);
      setAvailableViews(nextViews);
      setView((prev) => (nextViews.includes(prev) ? prev : nextViews[0]));

      if (bundle?.layoutSchema) {
        const profile = resolveLayoutProfile(bundle.layoutSchema, {
          mode: "desktop",
          density: "comfortable",
          navigation: "sidebar",
        });
        setRemoteDensity(profile.density);
      } else {
        setRemoteDensity(null);
      }
    },
    [resolveBundleViews],
  );

  const storeWarmupAccess = useCallback(
    (resultByView: Record<string, NexusViewAccessResult>) => {
      const next: Partial<Record<View, NexusViewAccessResult>> = {
        ...validatedAccessRef.current,
      };
      Object.entries(resultByView || {}).forEach(([viewId, access]) => {
        const key = String(viewId || "") as View;
        if (!VIEW_IDS.includes(key)) return;
        next[key] = access;
      });
      validatedAccessRef.current = next;
    },
    [],
  );

  const preloadViewChunk = useCallback(
    async (viewId: View, timeoutMs?: number) => {
      const chunk = preloadMainViewChunk(viewId);
      if (!chunk) return;

      const budget =
        timeoutMs ??
        (lagPressure === "critical"
          ? 80
          : lagPressure === "elevated"
            ? 120
            : lowPowerMode
              ? 160
              : 60);
      const startedAt =
        typeof performance !== "undefined" ? performance.now() : Date.now();
      const result = await withTimeoutResult(chunk.promise, budget);
      const endedAt =
        typeof performance !== "undefined" ? performance.now() : Date.now();
      const durationMs = Number(Math.max(0, endedAt - startedAt).toFixed(2));

      const telemetry = preloadTelemetryRef.current[viewId] || { reports: 0 };
      const shouldReport = telemetry.reports < 8 || result.timedOut;
      if (shouldReport) {
        telemetry.reports += 1;
        preloadTelemetryRef.current[viewId] = telemetry;
        const runtime = runtimeRef.current;
        runtime?.connection.publish(
          "custom",
          {
            event: "view_preload",
            appId: "main",
            viewId,
            cacheStatus: chunk.warm ? "hit" : "miss",
            durationMs,
            timedOut: result.timedOut,
            lagPressure,
          },
          "all",
        );
      }

      const recordCustomMetric = (runtimeRef.current?.performance as any)
        ?.recordCustomMetric;
      if (typeof recordCustomMetric === "function") {
        try {
          recordCustomMetric.call(
            runtimeRef.current?.performance,
            "main.view_preload_ms",
            durationMs,
            "ms",
          );
          if (result.timedOut) {
            recordCustomMetric.call(
              runtimeRef.current?.performance,
              "main.view_preload_timeout",
              1,
              "count",
            );
          }
        } catch {
          // keep diagnostics best-effort.
        }
      }
    },
    [lagPressure, lowPowerMode],
  );

  useEffect(() => {
    const controlBaseUrl = CONTROL_API_BASE_URL;
    const controlIngestKey = (import.meta as any).env
      ?.VITE_NEXUS_CONTROL_INGEST_KEY as string | undefined;

    const runtime = createNexusRuntime({
      appId: "main",
      appVersion: "5.0.0",
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
        channel: "production",
        immediate: false,
        onUpdate: (event) => {
          applyLiveBundle(event.bundle);
        },
      },
    });
    runtime.start();
    runtimeRef.current = runtime;
    const stopLagProbe = installRuntimeLagProbe({
      enabled: (import.meta as any).env?.VITE_NEXUS_LAG_PROBE === "1",
      onEvent: (event) => {
        const metric = Number(event.durationMs.toFixed(2));
        const recordCustomMetric = (runtime.performance as any)
          ?.recordCustomMetric;
        if (typeof recordCustomMetric === "function") {
          try {
            recordCustomMetric.call(
              runtime.performance,
              "main.ui_lag_ms",
              metric,
              "ms",
            );
          } catch {
            // keep diagnostics best-effort.
          }
        }

        runtime.connection.publish(
          "custom",
          {
            event: event.kind,
            appId: "main",
            durationMs: metric,
            detail:
              event.kind === "long-task"
                ? { name: event.name }
                : { interaction: event.interaction },
          },
          "all",
        );

        if (metric >= 120) {
          console.warn("[Nexus Main] interaction lag detected", event);
        }
        trackLagPressure(metric);
      },
    });
    validatedAccessRef.current = {};
    let active = true;
    const preloadBudgetMs = lowPowerMode
      ? MAIN_BOOT_PRELOAD_TIMEOUT_LOW_POWER_MS
      : MAIN_BOOT_PRELOAD_TIMEOUT_MS;
    const viewWarmupBudgetMs = lowPowerMode
      ? MAIN_BOOT_VIEW_WARMUP_TIMEOUT_LOW_POWER_MS
      : MAIN_BOOT_VIEW_WARMUP_TIMEOUT_MS;
    setBootFailure(null);
    setBootProgress(8);
    setBootStage("Nexus Runtime wird gestartet...");

    const earlyPreloadViews = mergeUniqueViews(
      MAIN_SAFE_STARTUP_VIEWS.filter(
        (candidate) => !MAIN_HEAVY_PRELOAD_VIEW_SET.has(candidate),
      ),
      MAIN_CRITICAL_PRELOAD_VIEWS,
    );
    const earlyPreloadPromise = preloadMainViews(earlyPreloadViews, {
      eagerLimit: lowPowerMode ? 3 : 4,
      includeDeferred: false,
      allowHeavy: false,
    });

    const setBootStep = (progress: number, stage: string) => {
      if (!active) return;
      setBootProgress((prev) => Math.max(prev, progress));
      setBootStage(stage);
    };

    void (async () => {
      try {
        setBootStep(24, "Lade API Katalog, Layout und Release...");
        const [catalogResult, layoutResult, releaseResult] = await Promise.all([
          runtime.control.fetchCatalog({
            appId: "main",
            channel: "production",
            forceRefresh: false,
            cacheTtlMs: 120_000,
          }),
          runtime.control.fetchLayoutSchema({
            appId: "main",
            channel: "production",
            forceRefresh: false,
            cacheTtlMs: 120_000,
          }),
          runtime.control.fetchCurrentRelease({
            appId: "main",
            channel: "production",
            forceRefresh: false,
            cacheTtlMs: 60_000,
          }),
        ]);

        const failedResources = [
          ["catalog", catalogResult.errorCode, catalogResult.item],
          ["layout", layoutResult.errorCode, layoutResult.item],
          ["release", releaseResult.errorCode, releaseResult.item],
        ]
          .filter(([, errorCode, item]) => Boolean(errorCode) || !item)
          .map(([resource, errorCode]) => ({
            resource: String(resource),
            errorCode: String(errorCode || "INVALID_PAYLOAD"),
          }));

        if (failedResources.length > 0) {
          const offlineOnly = failedResources.every((entry) =>
            isOfflineBootstrapResourceError(entry.errorCode),
          );
          if (!offlineOnly) {
            throw new Error(
              `CONTROL_API_BOOTSTRAP_FAILED (${failedResources.map((entry) => `${entry.resource}:${entry.errorCode}`).join(", ")})`,
            );
          }
        }

        const bundle: NexusLiveBundle | null =
          failedResources.length === 0
            ? {
                appId: "main",
                channel: "production",
                catalog: catalogResult.item,
                layoutSchema: layoutResult.item,
                release: releaseResult.item,
              }
            : null;

        if (!active) return;
        applyLiveBundle(bundle);
        setBootStep(54, "Validiere verfuegbare Views...");
        const startupViews = bundle
          ? resolveBundleViews(bundle)
          : MAIN_SAFE_STARTUP_VIEWS;
        if (startupViews.length === 0) {
          throw new Error("CONTROL_API_BOOTSTRAP_FAILED (NO_STARTUP_VIEWS)");
        }

        const prioritizedStartupViews = orderMainPreloadViews(startupViews);
        const prewarmViews = mergeUniqueViews(
          startupViews.filter(
            (candidate) => !MAIN_HEAVY_PRELOAD_VIEW_SET.has(candidate),
          ),
          MAIN_CRITICAL_PRELOAD_VIEWS.filter((candidate) =>
            startupViews.includes(candidate),
          ),
        );
        setAvailableViews(startupViews);
        setView((prev) =>
          startupViews.includes(prev) ? prev : startupViews[0],
        );
        setMountedViews(
          mergeUniqueViews(
            [startupViews[0]],
            MAIN_PERSISTENT_VIEW_CACHE.filter((candidate) =>
              startupViews.includes(candidate),
            ),
          ),
        );
        setViewGuardState({
          checking: false,
          blockedView: null,
          requiredTier: null,
          reason: null,
        });
        setBootStep(70, "Lade UI-Module fuer schnellen View-Wechsel...");
        const priorityPrewarmViews = MAIN_BOOT_PRIORITY_VIEWS.filter(
          (candidate) => startupViews.includes(candidate),
        );
        const heavyPrewarmViews = Array.from(
          MAIN_HEAVY_PRELOAD_VIEW_SET,
        ).filter((candidate) => startupViews.includes(candidate));
        const priorityWarmupPromise = Promise.allSettled(
          priorityPrewarmViews.map((candidate) =>
            preloadViewChunk(candidate, lowPowerMode ? 260 : 150),
          ),
        );
        const startupPreloadPromise = preloadMainViews(prewarmViews, {
          eagerLimit: Math.max(
            2,
            Math.min(prewarmViews.length, lowPowerMode ? 3 : 4),
          ),
          includeDeferred: false,
          allowHeavy: false,
        });
        const heavyPreloadPromise =
          heavyPrewarmViews.length > 0
            ? preloadMainViews(heavyPrewarmViews, {
                eagerLimit: Math.max(1, heavyPrewarmViews.length),
                includeDeferred: false,
                allowHeavy: true,
              })
            : Promise.resolve();
        const preloadResult = await withTimeoutResult(
          Promise.allSettled([
            earlyPreloadPromise,
            startupPreloadPromise,
            priorityWarmupPromise,
            heavyPreloadPromise,
          ]),
          preloadBudgetMs,
        );
        if (!active) return;
        setBootStep(
          82,
          preloadResult.timedOut
            ? "UI-Module-Warmup laeuft im Hintergrund weiter..."
            : "Alle Kern-Views vorgeladen",
        );

        setBootStep(90, "Validiere View-Zugriff...");
        const warmupPromise = runtime.control.warmupViewAccess(
          prioritizedStartupViews,
          {
            ...viewAccessContext,
            forceRefresh: false,
            concurrency: lowPowerMode ? 4 : 8,
          },
        );
        const warmupResult = await withTimeoutResult(
          warmupPromise,
          viewWarmupBudgetMs,
        );
        if (!active) return;
        if ("value" in warmupResult) {
          storeWarmupAccess(warmupResult.value.resultByView);
        } else {
          void warmupPromise
            .then((warmup) => {
              if (!active) return;
              storeWarmupAccess(warmup.resultByView);
            })
            .catch(() => {});
        }
        setBootStep(100, "Startsequenz abgeschlossen");
      } catch (error) {
        const reason =
          error instanceof Error && error.message
            ? error.message
            : "CONTROL_API_UNAVAILABLE";
        console.error("Nexus Main bootstrap failed", error);
        if (!active) return;
        setBootFailure(reason);
      } finally {
        if (active) {
          setBootProgress(100);
          setBootReady(true);
        }
      }
    })();

    return () => {
      active = false;
      stopLagProbe();
      runtime.stop();
      runtimeRef.current = null;
      validatedAccessRef.current = {};
    };
  }, [
    applyLiveBundle,
    lowPowerMode,
    resolveBundleViews,
    storeWarmupAccess,
    trackLagPressure,
    viewAccessContext,
  ]);

  useEffect(() => {
    const safeFont = sanitizeGlobalFont(
      t.globalFont,
      GLOBAL_FONTS.map((font) => font.value),
      "system-ui",
    );

    const requestedFont = t.globalFont || "system-ui";
    if (requestedFont !== safeFont) {
      t.setGlobalFont(safeFont);
    }

    applyGlobalFont(safeFont || "system-ui, sans-serif");
  }, [t.globalFont, t.setGlobalFont]);

  useEffect(() => {
    applyAccessibilityFlags({
      reducedMotion: effectiveReducedMotion,
      highContrast: t.qol?.highContrast ?? false,
    });
  }, [effectiveReducedMotion, t.qol?.highContrast]);

  useEffect(() => {
    const sz = t.qol?.fontSize ?? 14;
    applyTypographyScale({
      fontSize: sz,
      baseline: 14,
      useUiScale: true,
      minUiScale: 0.82,
      maxUiScale: 1.42,
      lockRootFontSizePx: 14,
    });
  }, [t.qol?.fontSize]);

  useEffect(() => {
    applyPanelDensity(remoteDensity || t.qol?.panelDensity || "comfortable");
  }, [remoteDensity, t.qol?.panelDensity]);

  useEffect(() => {
    const previous = previousTrackedViewRef.current;
    if (previous !== view) {
      const bucket = transitionStatsRef.current[previous] || {};
      bucket[view] = (bucket[view] || 0) + 1;
      transitionStatsRef.current[previous] = bucket;
    }
    previousTrackedViewRef.current = view;
    recentViewsRef.current = [
      view,
      ...recentViewsRef.current.filter((entry) => entry !== view),
    ].slice(0, 8);
    scheduleWarmupStatsPersist();

    const runtime = runtimeRef.current;
    if (!runtime) return;

    runtime.connection.sendNavigation(view);
    runtime.connection.syncState("main.activeView", view);
    runtime.performance.trackViewRender(`main:${view}`);
  }, [scheduleWarmupStatsPersist, view]);

  const requestViewChange = useCallback(
    async (nextRaw: unknown) => {
      const next = String(nextRaw || "").toLowerCase() as View;
      if (!availableViews.includes(next)) return;
      if (next === view) return;

      const runtime = runtimeRef.current;
      if (!runtime) {
        setView(next);
        setMountedViews((prev) =>
          prev.includes(next) ? prev : [...prev, next],
        );
        void preloadViewChunk(next);
        setViewGuardState((prev) => ({
          ...prev,
          blockedView: null,
          requiredTier: null,
          reason: null,
        }));
        return;
      }

      const cachedAccess = validatedAccessRef.current[next];
      if (cachedAccess) {
        if (cachedAccess.allowed) {
          setView(next);
          setMountedViews((prev) =>
            prev.includes(next) ? prev : [...prev, next],
          );
          void preloadViewChunk(next);
          setViewGuardState({
            checking: false,
            blockedView: null,
            requiredTier: null,
            reason: null,
          });
          return;
        }

        setViewGuardState({
          checking: false,
          blockedView: next,
          requiredTier: cachedAccess.requiredTier || "paid",
          reason: cachedAccess.reason || "PAYWALL_BLOCKED",
        });
        return;
      }

      const requestId = ++guardRequestSeq.current;
      const previousView = view;
      setView(next);
      setMountedViews((prev) => (prev.includes(next) ? prev : [...prev, next]));
      void preloadViewChunk(next);
      setViewGuardState((prev) => ({
        ...prev,
        checking: true,
        blockedView: null,
        requiredTier: null,
        reason: null,
      }));
      const access = await runtime.control.validateViewAccess(
        next,
        viewAccessContext,
      );
      if (requestId !== guardRequestSeq.current) return;
      validatedAccessRef.current = {
        ...validatedAccessRef.current,
        [next]: access,
      };

      if (access.allowed) {
        setViewGuardState({
          checking: false,
          blockedView: null,
          requiredTier: null,
          reason: null,
        });
        return;
      }

      setViewGuardState({
        checking: false,
        blockedView: next,
        requiredTier: access.requiredTier || "paid",
        reason: access.reason || "PAYWALL_BLOCKED",
      });
      setView(previousView);
    },
    [availableViews, preloadViewChunk, view, viewAccessContext],
  );

  useEffect(() => {
    if (!bootReady) return;
    const warmupMaxItems =
      lagPressure === "critical"
        ? 1
        : lagPressure === "elevated"
          ? lowPowerMode
            ? 1
            : 2
          : lowPowerMode
            ? 2
            : 4;
    const queue = buildAdaptiveViewWarmupPlan({
      currentView: view,
      availableViews,
      mountedViews,
      transitionStats: transitionStatsRef.current,
      recentViews: recentViewsRef.current,
      maxItems: warmupMaxItems,
    }) as View[];
    if (queue.length === 0) return;

    const warmupPerViewBudgetMs =
      lagPressure === "critical"
        ? 80
        : lagPressure === "elevated"
          ? 120
          : lowPowerMode
            ? 240
            : 140;

    let cancelled = false;
    const warmup = () => {
      if (cancelled) return;
      void (async () => {
        for (const candidate of queue) {
          if (cancelled || candidate === view) break;
          await preloadViewChunk(candidate, warmupPerViewBudgetMs);
        }
      })();
    };

    if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      const handle = (window as any).requestIdleCallback(warmup, {
        timeout: 1_000,
      });
      return () => {
        cancelled = true;
        (window as any).cancelIdleCallback?.(handle);
      };
    }

    const fallbackHandle = globalThis.setTimeout(warmup, 80);
    return () => {
      cancelled = true;
      clearTimeout(fallbackHandle);
    };
  }, [
    availableViews,
    bootReady,
    lagPressure,
    lowPowerMode,
    mountedViews,
    preloadViewChunk,
    view,
  ]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey)) return;
      const target = event.target as HTMLElement | null;
      const isEditing = Boolean(
        target &&
          (target.tagName === "INPUT" ||
            target.tagName === "TEXTAREA" ||
            target.isContentEditable),
      );
      if (isEditing) return;
      if (event.altKey) return;

      if (/^[1-9]$/.test(event.key)) {
        const nextView = resolveViewHotkey(
          Number(event.key) - 1,
          availableViews,
        ) as View | null;
        if (!nextView) return;
        event.preventDefault();
        void requestViewChange(nextView);
        return;
      }

      if (event.key === "[" || event.key === "]") {
        const orderedViews = orderViewsForNavigation(availableViews) as View[];
        if (orderedViews.length < 2) return;
        const currentIndex = Math.max(0, orderedViews.indexOf(view));
        const delta = event.key === "]" ? 1 : -1;
        const nextIndex =
          (currentIndex + delta + orderedViews.length) % orderedViews.length;
        const nextView = orderedViews[nextIndex];
        if (!nextView || nextView === view) return;
        event.preventDefault();
        void requestViewChange(nextView);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [availableViews, requestViewChange, view]);

  const motionRuntime = useMemo(
    () => buildMotionRuntime(t, { lowPowerMode: motionSafetyLowPower }),
    [motionSafetyLowPower, t],
  );
  useGlobalTypingAnimation(!effectiveReducedMotion);
  const motionCssVars = useMemo(
    () =>
      ({
        "--nx-motion-quick": `${motionRuntime.quickMs}ms`,
        "--nx-motion-regular": `${motionRuntime.regularMs}ms`,
        "--nx-motion-hover-ease": motionRuntime.hoverEase,
        "--nx-motion-press-ease": motionRuntime.pressEase,
        "--nx-motion-settle-ease": motionRuntime.settleEase,
        "--nx-hover-lift": `${motionRuntime.hoverLiftPx}px`,
        "--nx-hover-scale": `${motionRuntime.hoverScale}`,
        "--nx-press-scale": `${motionRuntime.pressScale}`,
        "--nx-hover-extra-scale": `${motionRuntime.hoverExtraScale}`,
      }) as React.CSSProperties,
    [motionRuntime],
  );

  useEffect(() => {
    const sidebarStyle = (t as any).sidebarStyle;
    const autoHideEnabled =
      Boolean(t.qol?.sidebarAutoHide) && sidebarStyle !== "hidden";
    if (!autoHideEnabled) {
      setSidebarAutoPeek(false);
    }
  }, [t.qol?.sidebarAutoHide, (t as any).sidebarStyle]);

  if (!bootReady) {
    return (
      <BootSequenceScreen
        appName="Nexus Main"
        progress={bootProgress}
        stage={bootStage}
        accent={t.accent}
        accent2={t.accent2}
      />
    );
  }

  if (bootFailure) {
    return (
      <div
        style={{
          width: "100%",
          minHeight: "100dvh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #1a0909 0%, #0c111b 100%)",
          color: "#ffe5e2",
          fontFamily: "system-ui, sans-serif",
          padding: 24,
        }}
      >
        <div
          style={{
            maxWidth: 660,
            borderRadius: 16,
            border: "1px solid rgba(255,69,58,0.45)",
            background: "rgba(255,69,58,0.12)",
            padding: 18,
            fontSize: 14,
            lineHeight: 1.5,
          }}
        >
          <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 8 }}>
            API-Startpruefung fehlgeschlagen
          </div>
          <div>
            Nexus Main wurde kontrolliert gestoppt, weil der Hosted-API-Bootflow
            nicht erfolgreich war.
          </div>
          <div style={{ marginTop: 8 }}>
            Reason: <code>{bootFailure}</code>
          </div>
        </div>
      </div>
    );
  }

  const bgStyles = buildBackground(t.background, t.bg, t.mode);
  const accentRgb = hexToRgb(t.accent);
  const accent2Rgb = hexToRgb(t.accent2);
  const sidebarLeft = (t as any).sidebarPosition !== "right";
  const toolbarBottom = t.toolbar?.position !== "top";
  const toolbarVisible = t.toolbar?.visible !== false;
  const sidebarHidden = (t as any).sidebarStyle === "hidden";
  const sidebarAutoHideEnabled =
    Boolean(t.qol?.sidebarAutoHide) && !sidebarHidden;
  const sidebarExpanded = !sidebarAutoHideEnabled || sidebarAutoPeek;
  const collapsedSidebarWidth = sidebarAutoHideEnabled ? 12 : t.sidebarWidth;
  const effectiveSidebarWidth = sidebarHidden
    ? 0
    : sidebarExpanded
      ? t.sidebarWidth
      : collapsedSidebarWidth;

  return (
    <>
      <MainShellLayout
        theme={t}
        lowPowerMode={motionSafetyLowPower}
        motionCssVars={motionCssVars}
        backgroundStyles={bgStyles}
        accentRgb={accentRgb}
        accent2Rgb={accent2Rgb}
        sidebarLeft={sidebarLeft}
        sidebarAutoHideEnabled={sidebarAutoHideEnabled}
        sidebarExpanded={sidebarExpanded}
        effectiveSidebarWidth={effectiveSidebarWidth}
        toolbarBottom={toolbarBottom}
        toolbarVisible={toolbarVisible}
        terminalOpen={terminalOpen}
        view={view}
        availableViews={availableViews}
        viewGuardState={viewGuardState}
        motionRuntime={motionRuntime}
        onRequestViewChange={(nextView) => {
          void requestViewChange(nextView);
        }}
        onPrefetchView={(nextView) => {
          void preloadViewChunk(nextView);
        }}
        onSidebarAutoPeek={(next) => {
          setSidebarAutoPeek(next);
        }}
        mainViewNode={
          <MainViewHost
            view={view}
            mountedViews={mountedViews}
            availableViews={availableViews}
            reducedMotion={effectiveReducedMotion}
            onRequestViewChange={(nextView) => {
              void requestViewChange(nextView);
            }}
          />
        }
      />

      {!!t.background.overlayOpacity && (
        <div
          aria-hidden="true"
          style={{
            position: "fixed",
            inset: 0,
            pointerEvents: "none",
            zIndex: 1,
            background: `rgba(0,0,0,${t.background.overlayOpacity})`,
          }}
        />
      )}

      {!lowPowerMode && t.background.scanlines && (
        <div
          aria-hidden="true"
          style={{
            position: "fixed",
            inset: 0,
            pointerEvents: "none",
            zIndex: 1,
            opacity: t.mode === "dark" ? 0.1 : 0.07,
            backgroundImage:
              "repeating-linear-gradient(to bottom, rgba(255,255,255,0.08), rgba(255,255,255,0.08) 1px, transparent 1px, transparent 3px)",
          }}
        />
      )}

    </>
  );
}
