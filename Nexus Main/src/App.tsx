import React, {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
  Suspense,
} from "react";
import { motion } from "framer-motion";
import { useTheme, GLOBAL_FONTS } from "./store/themeStore";
import { useTerminal } from "./store/terminalStore";
import { Sidebar, View } from "./components/Sidebar";
import { TitleBar } from "./components/TitleBar";
import { BootSequenceScreen } from "./components/BootSequenceScreen";
import { ViewErrorBoundary } from "./components/ViewErrorBoundary";
import { buildBackground } from "./lib/visualUtils";
import { hexToRgb } from "./lib/utils";
import { installRuntimeLagProbe } from "./lib/runtimeLagProbe";
import { buildMotionRuntime } from "./lib/motionEngine";
import { configureRenderRuntime } from "./render/renderRuntime";
import {
  applyAccessibilityFlags,
  applyGlobalFont,
  applyPanelDensity,
  applyTypographyScale,
  buildLiveViewModel,
  getFallbackViewsForApp,
  resolveNexusControlUserContext,
  resolveLayoutProfile,
  sanitizeGlobalFont,
} from "@nexus/core";
import {
  createNexusRuntime,
  isOfflineControlErrorCode,
  type NexusLiveBundle,
  type NexusRuntime,
  type NexusViewAccessResult,
} from "@nexus/api";
import {
  CanvasView,
  CodeView,
  DashboardView,
  DevToolsView,
  FilesView,
  FluxView,
  InfoView,
  RenderDiagnosticsView,
  NexusTerminal,
  NexusToolbar,
  NotesView,
  RemindersView,
  SettingsView,
  TasksView,
  VIEW_CHUNK_PRELOADERS,
  VIEW_IDS,
  orderMainPreloadViews,
  preloadMainViews,
} from "./app/viewPreload";

const DEFAULT_CONTROL_API_BASE_URL = "https://nexus-api.cloud";
const MAIN_BOOT_PRELOAD_TIMEOUT_MS = 6_000;
const MAIN_BOOT_PRELOAD_TIMEOUT_LOW_POWER_MS = 8_500;
const MAIN_BOOT_VIEW_WARMUP_TIMEOUT_MS = 2_800;
const MAIN_BOOT_VIEW_WARMUP_TIMEOUT_LOW_POWER_MS = 4_200;
const isLowPowerDevice = () => {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return false;
  }

  const reducedMotion = window.matchMedia?.(
    "(prefers-reduced-motion: reduce)",
  ).matches;
  const cores = Number(navigator.hardwareConcurrency || 8);
  const memory = Number((navigator as any).deviceMemory || 8);
  return Boolean(reducedMotion) || cores <= 4 || memory <= 4;
};
const isOfflineBootstrapResourceError = (errorCodeRaw: unknown) =>
  isOfflineControlErrorCode(String(errorCodeRaw || "INVALID_PAYLOAD"));

const resolveControlApiBaseUrl = () => {
  const env = (import.meta as any).env || {};
  const raw = String(
    env.VITE_NEXUS_CONTROL_URL ||
      env.VITE_NEXUS_CONTROL_API_BASE_URL ||
      env.VITE_CONTROL_API_BASE_URL ||
      DEFAULT_CONTROL_API_BASE_URL,
  ).trim();
  return (raw || DEFAULT_CONTROL_API_BASE_URL).replace(/\/+$/, "");
};

const resolveControlIngestKey = () => {
  const raw = String(
    ((import.meta as any).env || {}).VITE_NEXUS_CONTROL_INGEST_KEY || "",
  ).trim();
  if (!raw || raw.startsWith("REPLACE_")) return undefined;
  return raw;
};

const MAIN_AUTH_SESSION_STORAGE_KEY = "nx-main-api-session-v1";
const MAIN_DEVICE_ID_STORAGE_KEY = "nx-main-device-id-v1";

type MainAuthMode = "login" | "register";

type MainAuthSession = {
  token: string;
  expiresAt: number;
  user: {
    id: string;
    username: string;
    role: string;
    email: string | null;
    requestedTier: string;
    emailVerified: boolean;
  };
};

const resolveMainAuthUserTier = (
  requestedTier: string | undefined,
): "free" | "paid" | undefined => {
  const raw = String(requestedTier || "").trim().toLowerCase();
  if (!raw) return undefined;
  return raw === "free" ? "free" : "paid";
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const parseMainAuthSession = (payload: unknown): MainAuthSession | null => {
  const candidate = isRecord(payload) && isRecord(payload.item) ? payload.item : payload;
  if (!isRecord(candidate)) return null;

  const token = typeof candidate.token === "string" ? candidate.token.trim() : "";
  const expiresAt =
    typeof candidate.expiresAt === "number" && Number.isFinite(candidate.expiresAt)
      ? candidate.expiresAt
      : 0;
  const user = candidate.user;
  if (!token || expiresAt <= Date.now() + 15_000 || !isRecord(user)) return null;

  const id = typeof user.id === "string" ? user.id : "";
  const username = typeof user.username === "string" ? user.username : "";
  const role = typeof user.role === "string" ? user.role : "";
  if (!id || !username || !role) return null;

  return {
    token,
    expiresAt,
    user: {
      id,
      username,
      role,
      email: typeof user.email === "string" ? user.email : null,
      requestedTier:
        typeof user.requestedTier === "string" ? user.requestedTier : "free",
      emailVerified: user.emailVerified === true,
    },
  };
};

const readStoredMainAuthSession = (): MainAuthSession | null => {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(MAIN_AUTH_SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = parseMainAuthSession(JSON.parse(raw));
    if (!parsed) {
      window.sessionStorage.removeItem(MAIN_AUTH_SESSION_STORAGE_KEY);
    }
    return parsed;
  } catch {
    window.sessionStorage.removeItem(MAIN_AUTH_SESSION_STORAGE_KEY);
    return null;
  }
};

const storeMainAuthSession = (session: MainAuthSession) => {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(
    MAIN_AUTH_SESSION_STORAGE_KEY,
    JSON.stringify(session),
  );
};

const clearStoredMainAuthSession = () => {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(MAIN_AUTH_SESSION_STORAGE_KEY);
};

const getMainDeviceId = () => {
  if (typeof window === "undefined") return "nx-main-device";
  try {
    const existing = window.localStorage.getItem(MAIN_DEVICE_ID_STORAGE_KEY);
    if (existing) return existing;
    const bytes = new Uint8Array(12);
    window.crypto?.getRandomValues?.(bytes);
    const generated = `nx-main-${Array.from(bytes)
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("")}`;
    window.localStorage.setItem(MAIN_DEVICE_ID_STORAGE_KEY, generated);
    return generated;
  } catch {
    return `nx-main-${Date.now().toString(36)}`;
  }
};

const requestMainAuthSession = async (input: {
  mode: MainAuthMode;
  baseUrl: string;
  identifier: string;
  email: string;
  username: string;
  password: string;
}) => {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), 9_000);
  const endpoint = input.mode === "login" ? "/auth/login" : "/auth/register";
  const body =
    input.mode === "login"
      ? {
          identifier: input.identifier.trim(),
          password: input.password,
        }
      : {
          email: input.email.trim().toLowerCase(),
          username: input.username.trim() || undefined,
          password: input.password,
          source: "nexus-main",
        };

  try {
    const response = await fetch(`${input.baseUrl}${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "X-Nexus-Device-Id": getMainDeviceId(),
        "X-Nexus-Device-Label": "Nexus Main",
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const details = isRecord(payload) ? payload.details : null;
      const detailMessage = Array.isArray(details)
        ? details.map((entry) => String(entry)).join(", ")
        : typeof details === "string"
          ? details
          : "";
      throw new Error(
        detailMessage ||
          (isRecord(payload) && typeof payload.error === "string"
            ? payload.error
            : `HTTP_${response.status}`),
      );
    }
    const session = parseMainAuthSession(payload);
    if (!session) {
      throw new Error("Auth-Antwort ist unvollstaendig.");
    }
    return session;
  } finally {
    window.clearTimeout(timeoutId);
  }
};

const isMainAuthBootstrapFailure = (reason: string | null) =>
  Boolean(
    reason &&
      /(HTTP_401|HTTP_403|INGEST_UNAUTHORIZED|UNAUTHORIZED|INVALID_CREDENTIALS|DEVICE_NOT_VERIFIED|DEVICE_ID_REQUIRED)/.test(
        reason,
      ),
  );

const withTimeoutResult = async <T,>(
  promise: Promise<T>,
  timeoutMs: number,
): Promise<{ timedOut: true } | { timedOut: false; value: T }> => {
  let timeoutHandle: number | null = null;
  const timeoutPromise = new Promise<{ timedOut: true }>((resolve) => {
    timeoutHandle = window.setTimeout(
      () => resolve({ timedOut: true }),
      timeoutMs,
    );
  });

  try {
    const result = await Promise.race([
      promise.then((value) => ({ timedOut: false as const, value })),
      timeoutPromise,
    ]);
    return result;
  } finally {
    if (timeoutHandle !== null) {
      clearTimeout(timeoutHandle);
    }
  }
};

const MAIN_CORE_FALLBACK_VIEWS: View[] = getFallbackViewsForApp("main")
  .map((candidate) => candidate as View)
  .filter((candidate) => VIEW_IDS.includes(candidate));
const withDevDiagnosticsView = (views: View[]): View[] => {
  const baseViews = views.filter((candidate) => candidate !== "diagnostics");
  if (!(import.meta as any).env?.DEV) return baseViews;
  return [...baseViews, "diagnostics"];
};
const MAIN_SAFE_STARTUP_VIEWS: View[] =
  withDevDiagnosticsView(
    MAIN_CORE_FALLBACK_VIEWS.length > 0 ? MAIN_CORE_FALLBACK_VIEWS : VIEW_IDS,
  );
const MAIN_CRITICAL_PRELOAD_VIEWS: View[] = [
  "dashboard",
  "notes",
  "tasks",
  "settings",
  "reminders",
];
const MAIN_BOOT_PRIORITY_VIEWS: View[] = [
  "dashboard",
  "notes",
  "tasks",
  "settings",
  "reminders",
  "files",
];
const MAIN_HEAVY_PRELOAD_VIEW_SET = new Set<View>([
  "code",
  "canvas",
  "devtools",
]);
const mergeUniqueViews = (...groups: View[][]): View[] => {
  const ordered = groups.flat();
  const seen = new Set<View>();
  const result: View[] = [];
  for (const viewId of ordered) {
    if (seen.has(viewId)) continue;
    seen.add(viewId);
    result.push(viewId);
  }
  return result;
};

export default function App() {
  const [view, setView] = useState<View>("dashboard");
  const [availableViews, setAvailableViews] = useState<View[]>(
    MAIN_SAFE_STARTUP_VIEWS,
  );
  const [bootReady, setBootReady] = useState(false);
  const [bootProgress, setBootProgress] = useState(0);
  const [bootStage, setBootStage] = useState("Nexus Runtime wird gestartet...");
  const [bootFailure, setBootFailure] = useState<string | null>(null);
  const [bootAttempt, setBootAttempt] = useState(0);
  const [authSession, setAuthSession] = useState<MainAuthSession | null>(() =>
    readStoredMainAuthSession(),
  );
  const [authMode, setAuthMode] = useState<MainAuthMode>("login");
  const [authIdentifier, setAuthIdentifier] = useState("");
  const [authEmail, setAuthEmail] = useState("");
  const [authUsername, setAuthUsername] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authPending, setAuthPending] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [remoteDensity, setRemoteDensity] = useState<
    "compact" | "comfortable" | "spacious" | null
  >(null);
  const [liveReleaseId, setLiveReleaseId] = useState<string | null>(null);
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
  const t = useTheme();
  const terminalOpen = useTerminal((s) => s.isOpen);
  const sidebarHidden = (t as any).sidebarStyle === "hidden";
  const sidebarAutoHideEnabled = Boolean(t.qol?.sidebarAutoHide) && !sidebarHidden;
  const [sidebarExpanded, setSidebarExpanded] = useState(
    !sidebarAutoHideEnabled,
  );
  const runtimeRef = useRef<NexusRuntime | null>(null);
  const validatedAccessRef = useRef<
    Partial<Record<View, NexusViewAccessResult>>
  >({});
  const guardRequestSeq = useRef(0);
  const lowPowerMode = useMemo(() => isLowPowerDevice(), []);
  const motionRuntime = useMemo(
    () => buildMotionRuntime(t, { lowPowerMode }),
    [lowPowerMode, t],
  );
  const controlApiBaseUrl = useMemo(() => resolveControlApiBaseUrl(), []);

  useEffect(() => {
    if (!sidebarAutoHideEnabled) {
      setSidebarExpanded(true);
      return;
    }
    setSidebarExpanded(false);
  }, [sidebarAutoHideEnabled]);

  useEffect(() => {
    configureRenderRuntime({
      lowPowerMode,
      reducedMotion: Boolean(t.qol?.reducedMotion),
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
    });
  }, [
    lowPowerMode,
    motionRuntime.hoverEase,
    motionRuntime.hoverExtraScale,
    motionRuntime.hoverLiftPx,
    motionRuntime.hoverScale,
    motionRuntime.pressEase,
    motionRuntime.pressScale,
    motionRuntime.quickMs,
    motionRuntime.regularMs,
    motionRuntime.settleEase,
    t.qol?.reducedMotion,
  ]);

  const viewAccessContext = useMemo(() => {
    const env = (import.meta as any).env || {};
    return resolveNexusControlUserContext({
      userId:
        authSession?.user.id ||
        (env.VITE_NEXUS_USER_ID as string | undefined),
      username:
        authSession?.user.username ||
        (env.VITE_NEXUS_USERNAME as string | undefined),
      userTier:
        resolveMainAuthUserTier(authSession?.user.requestedTier) ||
        (env.VITE_NEXUS_USER_TIER as "free" | "paid" | undefined),
    });
  }, [authSession]);

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

      return withDevDiagnosticsView(
        nextViews.length > 0 ? nextViews : MAIN_SAFE_STARTUP_VIEWS,
      );
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
      setLiveReleaseId(bundle?.release?.id || null);
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
      const loader = VIEW_CHUNK_PRELOADERS[viewId];
      if (typeof loader !== "function") return;
      const budget = timeoutMs ?? (lowPowerMode ? 160 : 60);
      await withTimeoutResult(loader(), budget);
    },
    [lowPowerMode],
  );

  useEffect(() => {
    const controlBaseUrl = controlApiBaseUrl;
    const controlIngestKey = resolveControlIngestKey();
    const controlToken = authSession?.token || "";

    if (authSession && authSession.expiresAt <= Date.now() + 15_000) {
      clearStoredMainAuthSession();
      setAuthSession(null);
      return;
    }

    const runtime = createNexusRuntime({
      appId: "main",
      appVersion: "5.0.0",
      control: {
        enabled: Boolean(controlBaseUrl),
        baseUrl: controlBaseUrl,
        token: controlToken,
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
    runtime.control.setViewValidationDefaults(viewAccessContext);
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
    setBootReady(false);
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
        if (isMainAuthBootstrapFailure(reason) && authSession) {
          clearStoredMainAuthSession();
          setAuthSession(null);
        }
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
    authSession,
    bootAttempt,
    controlApiBaseUrl,
    lowPowerMode,
    resolveBundleViews,
    storeWarmupAccess,
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
      reducedMotion: t.qol?.reducedMotion ?? false,
      highContrast: t.qol?.highContrast ?? false,
    });
  }, [t.qol?.reducedMotion, t.qol?.highContrast]);

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
    const runtime = runtimeRef.current;
    if (!runtime) return;

    runtime.connection.sendNavigation(view);
    runtime.connection.syncState("main.activeView", view);
    runtime.performance.trackViewRender(`main:${view}`);
  }, [view]);

  const requestViewChange = useCallback(
    async (nextRaw: unknown) => {
      const next = String(nextRaw || "").toLowerCase() as View;
      if (next === "diagnostics" && !(import.meta as any).env?.DEV) return;
      if (!availableViews.includes(next)) return;
      if (next === view) return;

      const runtime = runtimeRef.current;
      if (!runtime) {
        setView(next);
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

  const motionPreset = useMemo(() => {
    const style = t.animations?.entranceStyle ?? "fade";
    if (lowPowerMode || !(t.animations?.pageTransitions ?? true)) {
      return {
        initial: false as const,
        animate: { opacity: 1 },
        exit: undefined,
      };
    }

    switch (style) {
      case "slide":
        return {
          initial: { opacity: 0, x: 16 },
          animate: { opacity: 1, x: 0 },
          exit: { opacity: 0, x: -16 },
        };
      case "scale":
        return {
          initial: { opacity: 0, scale: 0.985 },
          animate: { opacity: 1, scale: 1 },
          exit: { opacity: 0, scale: 1.01 },
        };
      case "bounce":
        return {
          initial: { opacity: 0, y: 18, scale: 0.98 },
          animate: { opacity: 1, y: 0, scale: 1 },
          exit: { opacity: 0, y: -10, scale: 0.99 },
        };
      case "flip":
        return {
          initial: { opacity: 0, rotateX: -8, y: 10 },
          animate: { opacity: 1, rotateX: 0, y: 0 },
          exit: { opacity: 0, rotateX: 8, y: -10 },
        };
      default:
        return {
          initial: { opacity: 0, y: 8 },
          animate: { opacity: 1, y: 0 },
          exit: { opacity: 0, y: -8 },
        };
    }
  }, [lowPowerMode, t.animations]);

  const resetDashboardViewState = useCallback(() => {
    try {
      localStorage.removeItem("nx-dashboard-layout-v3");
      localStorage.removeItem("nx-dashboard-layout-v2");
    } catch {}
  }, []);

  const handleMainAuthSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setAuthPending(true);
      setAuthError(null);
      try {
        const session = await requestMainAuthSession({
          mode: authMode,
          baseUrl: controlApiBaseUrl,
          identifier: authIdentifier,
          email: authEmail,
          username: authUsername,
          password: authPassword,
        });
        storeMainAuthSession(session);
        setAuthSession(session);
        setAuthIdentifier(session.user.email || session.user.username);
        setAuthEmail(session.user.email || "");
        setAuthUsername(session.user.username);
        setAuthPassword("");
        setBootFailure(null);
        setBootReady(false);
        setBootAttempt((attempt) => attempt + 1);
      } catch (error) {
        const message =
          error instanceof Error && error.message
            ? error.message
            : "Login fehlgeschlagen. Bitte pruefe deine Eingaben.";
        setAuthError(message);
      } finally {
        setAuthPending(false);
      }
    },
    [
      authEmail,
      authIdentifier,
      authMode,
      authPassword,
      authUsername,
      controlApiBaseUrl,
    ],
  );

  const authSubmitDisabled =
    authPending ||
    authPassword.trim().length < 8 ||
    (authMode === "login"
      ? authIdentifier.trim().length === 0
      : authEmail.trim().length === 0);

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
    const authFailure = isMainAuthBootstrapFailure(bootFailure);
    return (
      <div
        style={{
          width: "100%",
          minHeight: "100dvh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background:
            "radial-gradient(circle at 20% 10%, rgba(20,184,166,0.22), transparent 34%), radial-gradient(circle at 80% 20%, rgba(251,146,60,0.16), transparent 30%), linear-gradient(135deg, #061018 0%, #0c111b 100%)",
          color: "#e6fffb",
          fontFamily: "system-ui, sans-serif",
          padding: 24,
        }}
      >
        <div
          style={{
            width: "min(980px, 100%)",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 320px), 1fr))",
            gap: 18,
          }}
        >
          <div
            style={{
              borderRadius: 24,
              border: authFailure
                ? "1px solid rgba(45,212,191,0.38)"
                : "1px solid rgba(251,113,133,0.42)",
              background: "rgba(8,16,28,0.74)",
              boxShadow: "0 24px 80px rgba(0,0,0,0.36)",
              padding: 24,
              fontSize: 14,
              lineHeight: 1.55,
            }}
          >
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                borderRadius: 999,
                border: "1px solid rgba(45,212,191,0.26)",
                background: "rgba(20,184,166,0.1)",
                color: "#99f6e4",
                padding: "5px 10px",
                fontSize: 12,
                fontWeight: 800,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}
            >
              Hosted API Boot
            </div>
            <div style={{ fontSize: 26, fontWeight: 900, marginTop: 18 }}>
              API-Startpruefung braucht eine Session
            </div>
            <p style={{ color: "#b6c8d5", marginTop: 10, marginBottom: 0 }}>
              Nexus Main fragt weiter Katalog, Layout und Release von der API
              ab. Bei <code>401</code>/<code>403</code> wird jetzt nicht mehr
              stumpf gestoppt, sondern du kannst dich anmelden oder ein Konto
              erstellen. Danach startet der gleiche API-Bootflow erneut mit
              Bearer-Token.
            </p>
            <div
              style={{
                marginTop: 18,
                borderRadius: 16,
                border: "1px solid rgba(148,163,184,0.2)",
                background: "rgba(15,23,42,0.72)",
                padding: 14,
                color: "#cbd5e1",
              }}
            >
              <div style={{ color: "#e2e8f0", fontWeight: 800 }}>
                Diagnose
              </div>
              <div style={{ marginTop: 8 }}>
                API: <code>{controlApiBaseUrl}</code>
              </div>
              <div style={{ marginTop: 6 }}>
                Reason: <code>{bootFailure}</code>
              </div>
              <div style={{ marginTop: 10, color: "#94a3b8" }}>
                Kein Offline-Bypass: die App laedt erst weiter, wenn der
                Hosted-API-Boot erfolgreich ist.
              </div>
            </div>
          </div>

          <form
            onSubmit={handleMainAuthSubmit}
            style={{
              borderRadius: 24,
              border: "1px solid rgba(45,212,191,0.34)",
              background: "rgba(2,8,23,0.82)",
              boxShadow: "0 24px 80px rgba(0,0,0,0.34)",
              padding: 22,
              fontSize: 14,
            }}
          >
            <div style={{ fontSize: 20, fontWeight: 900 }}>
              {authMode === "login" ? "Einloggen" : "Konto erstellen"}
            </div>
            <div style={{ color: "#94a3b8", marginTop: 6 }}>
              Gleiche Account-API wie auf nexusproject.dev.
            </div>

            <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
              <button
                type="button"
                onClick={() => {
                  setAuthMode("login");
                  setAuthError(null);
                }}
                style={{
                  flex: 1,
                  border: "1px solid rgba(45,212,191,0.35)",
                  borderRadius: 14,
                  background:
                    authMode === "login"
                      ? "rgba(20,184,166,0.22)"
                      : "rgba(15,23,42,0.72)",
                  color: authMode === "login" ? "#ccfbf1" : "#94a3b8",
                  fontWeight: 800,
                  padding: "10px 12px",
                  cursor: "pointer",
                }}
              >
                Login
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthMode("register");
                  setAuthError(null);
                }}
                style={{
                  flex: 1,
                  border: "1px solid rgba(125,211,252,0.32)",
                  borderRadius: 14,
                  background:
                    authMode === "register"
                      ? "rgba(14,165,233,0.2)"
                      : "rgba(15,23,42,0.72)",
                  color: authMode === "register" ? "#e0f2fe" : "#94a3b8",
                  fontWeight: 800,
                  padding: "10px 12px",
                  cursor: "pointer",
                }}
              >
                Registrieren
              </button>
            </div>

            {authMode === "login" ? (
              <label style={{ display: "block", marginTop: 16 }}>
                <span style={{ color: "#cbd5e1", fontWeight: 800 }}>
                  E-Mail oder Benutzername
                </span>
                <input
                  value={authIdentifier}
                  onChange={(event) => setAuthIdentifier(event.target.value)}
                  autoComplete="username"
                  placeholder="name@example.com"
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    marginTop: 7,
                    borderRadius: 14,
                    border: "1px solid rgba(148,163,184,0.28)",
                    background: "rgba(15,23,42,0.92)",
                    color: "#f8fafc",
                    padding: "12px 13px",
                    outline: "none",
                  }}
                />
              </label>
            ) : (
              <>
                <label style={{ display: "block", marginTop: 16 }}>
                  <span style={{ color: "#cbd5e1", fontWeight: 800 }}>
                    E-Mail
                  </span>
                  <input
                    value={authEmail}
                    onChange={(event) => setAuthEmail(event.target.value)}
                    type="email"
                    autoComplete="email"
                    placeholder="name@example.com"
                    style={{
                      width: "100%",
                      boxSizing: "border-box",
                      marginTop: 7,
                      borderRadius: 14,
                      border: "1px solid rgba(148,163,184,0.28)",
                      background: "rgba(15,23,42,0.92)",
                      color: "#f8fafc",
                      padding: "12px 13px",
                      outline: "none",
                    }}
                  />
                </label>
                <label style={{ display: "block", marginTop: 12 }}>
                  <span style={{ color: "#cbd5e1", fontWeight: 800 }}>
                    Benutzername optional
                  </span>
                  <input
                    value={authUsername}
                    onChange={(event) => setAuthUsername(event.target.value)}
                    autoComplete="username"
                    placeholder="nexus-user"
                    style={{
                      width: "100%",
                      boxSizing: "border-box",
                      marginTop: 7,
                      borderRadius: 14,
                      border: "1px solid rgba(148,163,184,0.28)",
                      background: "rgba(15,23,42,0.92)",
                      color: "#f8fafc",
                      padding: "12px 13px",
                      outline: "none",
                    }}
                  />
                </label>
              </>
            )}

            <label style={{ display: "block", marginTop: 12 }}>
              <span style={{ color: "#cbd5e1", fontWeight: 800 }}>
                Passwort
              </span>
              <input
                value={authPassword}
                onChange={(event) => setAuthPassword(event.target.value)}
                type="password"
                autoComplete={
                  authMode === "login" ? "current-password" : "new-password"
                }
                minLength={8}
                placeholder="mind. 8 Zeichen"
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  marginTop: 7,
                  borderRadius: 14,
                  border: "1px solid rgba(148,163,184,0.28)",
                  background: "rgba(15,23,42,0.92)",
                  color: "#f8fafc",
                  padding: "12px 13px",
                  outline: "none",
                }}
              />
            </label>

            {authError ? (
              <div
                style={{
                  marginTop: 12,
                  borderRadius: 14,
                  border: "1px solid rgba(251,113,133,0.34)",
                  background: "rgba(127,29,29,0.32)",
                  color: "#fecaca",
                  padding: "10px 12px",
                }}
              >
                {authError}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={authSubmitDisabled}
              style={{
                width: "100%",
                marginTop: 16,
                border: 0,
                borderRadius: 16,
                background:
                  "linear-gradient(135deg, #14b8a6 0%, #38bdf8 100%)",
                color: "#00131a",
                fontWeight: 900,
                padding: "13px 14px",
                cursor: authSubmitDisabled ? "not-allowed" : "pointer",
                opacity: authSubmitDisabled ? 0.55 : 1,
              }}
            >
              {authPending
                ? "Verbinde mit API..."
                : authMode === "login"
                  ? "Einloggen und Boot erneut pruefen"
                  : "Konto erstellen und Boot starten"}
            </button>

            <a
              href="https://nexusproject.dev/?page=login"
              target="_blank"
              rel="noreferrer"
              style={{
                display: "block",
                marginTop: 14,
                color: "#7dd3fc",
                textAlign: "center",
                textDecoration: "none",
                fontWeight: 800,
              }}
            >
              Account lieber auf nexusproject.dev oeffnen
            </a>
          </form>
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
  const effectiveSidebarWidth = sidebarHidden
    ? 0
    : sidebarAutoHideEnabled
      ? sidebarExpanded
        ? t.sidebarWidth
        : 0
      : t.sidebarWidth;

  const renderActiveView = (viewId: View): React.ReactNode => {
    switch (viewId) {
      case "dashboard":
        return (
          <ViewErrorBoundary
            viewId="dashboard"
            onReset={resetDashboardViewState}
          >
            <DashboardView
              setView={(v: any) => {
                void requestViewChange(v);
              }}
            />
          </ViewErrorBoundary>
        );
      case "notes":
        return <NotesView />;
      case "code":
        return <CodeView />;
      case "tasks":
        return <TasksView />;
      case "reminders":
        return <RemindersView />;
      case "canvas":
        return <CanvasView />;
      case "files":
        return <FilesView />;
      case "flux":
        return <FluxView />;
      case "settings":
        return <SettingsView />;
      case "info":
        return <InfoView />;
      case "devtools":
        return <DevToolsView />;
      case "diagnostics":
        if ((import.meta as any).env?.DEV) {
          return <RenderDiagnosticsView />;
        }
        return (
          <ViewErrorBoundary
            viewId="dashboard"
            onReset={resetDashboardViewState}
          >
            <DashboardView
              setView={(v: any) => {
                void requestViewChange(v);
              }}
            />
          </ViewErrorBoundary>
        );
      default:
        return (
          <ViewErrorBoundary
            viewId="dashboard"
            onReset={resetDashboardViewState}
          >
            <DashboardView
              setView={(v: any) => {
                void requestViewChange(v);
              }}
            />
          </ViewErrorBoundary>
        );
    }
  };

  const toolbarEl = toolbarVisible ? (
    <div
      style={{
        position: "relative",
        zIndex: 500,
        display: "flex",
        justifyContent: "center",
        padding: toolbarBottom ? "0 0 6px" : "6px 0 0",
        pointerEvents: "none",
      }}
    >
      <div style={{ pointerEvents: "auto", width: "100%" }}>
        <Suspense fallback={null}>
          <NexusToolbar
            activeView={view}
            setView={(v: any) => {
              void requestViewChange(v);
            }}
          />
        </Suspense>
      </div>
    </div>
  ) : null;

  return (
    <div
      className="nx-app-shell"
      style={{
        color: t.mode === "dark" ? "#f8f8fc" : "#15161d",
        ...bgStyles,
        fontSize: `var(--nx-font-size, 14px)`,
      }}
    >
      <div
        aria-hidden="true"
        className="nx-ambient-layer"
        style={{
          background: lowPowerMode
            ? `linear-gradient(160deg, rgba(${accentRgb},0.1), rgba(${accent2Rgb},0.08))`
            : `
            radial-gradient(650px circle at 10% 14%, rgba(${accentRgb},0.2), transparent 55%),
            radial-gradient(580px circle at 88% 14%, rgba(${accent2Rgb},0.18), transparent 60%),
            radial-gradient(520px circle at 60% 95%, rgba(${accentRgb},0.14), transparent 65%)
          `,
        }}
      />

      <div
        className="nx-shell-window"
        style={{
          width: "calc(100% / var(--nx-ui-scale, 1))",
          height: "calc(100% / var(--nx-ui-scale, 1))",
          transform: "scale(var(--nx-ui-scale, 1))",
          transformOrigin: "top left",
          borderRadius: 18,
          border:
            t.mode === "dark"
              ? "1px solid rgba(255,255,255,0.12)"
              : "1px solid rgba(0,0,0,0.1)",
          boxShadow:
            t.mode === "dark"
              ? "0 28px 80px rgba(0,0,0,0.52), 0 0 0 1px rgba(255,255,255,0.04) inset"
              : "0 20px 60px rgba(28,31,42,0.16), 0 0 0 1px rgba(255,255,255,0.6) inset",
        }}
      >
        <TitleBar
          showDiagnosticsButton={Boolean((import.meta as any).env?.DEV)}
          onOpenDiagnostics={() => {
            void requestViewChange("diagnostics");
          }}
          releaseId={liveReleaseId}
        />
        <div
          style={{
            display: "flex",
            flex: 1,
            overflow: "hidden",
            minHeight: 0,
            flexDirection: sidebarLeft ? "row" : "row-reverse",
            position: "relative",
          }}
        >
          <div
            style={{
              width: effectiveSidebarWidth,
              flexShrink: 0,
              height: "100%",
              transition: "width 220ms cubic-bezier(0.2, 0.8, 0.2, 1)",
              overflow: "hidden",
              pointerEvents:
                sidebarAutoHideEnabled && !sidebarExpanded ? "none" : "auto",
            }}
            onMouseEnter={() => {
              if (sidebarAutoHideEnabled) setSidebarExpanded(true);
            }}
            onMouseLeave={() => {
              if (sidebarAutoHideEnabled) setSidebarExpanded(false);
            }}
          >
            <Sidebar
              view={view}
              availableViews={availableViews}
              onChange={(v: any) => {
                void requestViewChange(v);
              }}
              onPrefetch={(v: any) => {
                void preloadViewChunk(v);
              }}
            />
          </div>
          {sidebarAutoHideEnabled && !sidebarExpanded ? (
            <div
              onMouseEnter={() => setSidebarExpanded(true)}
              style={{
                position: "absolute",
                top: 0,
                bottom: 0,
                [sidebarLeft ? "left" : "right"]: 0,
                width: 14,
                zIndex: 55,
                cursor: "ew-resize",
                background: sidebarLeft
                  ? "linear-gradient(90deg, rgba(255,255,255,0.14), transparent)"
                  : "linear-gradient(270deg, rgba(255,255,255,0.14), transparent)",
                opacity: 0.48,
              }}
            />
          ) : null}
          <div
            style={{
              position: "absolute",
              top: 64,
              left: 16,
              right: 16,
              zIndex: 1200,
              pointerEvents: "none",
            }}
          >
            {viewGuardState.checking ? (
              <div
                style={{
                  pointerEvents: "none",
                  borderRadius: 10,
                  padding: "8px 10px",
                  fontSize: 12,
                  fontWeight: 700,
                  background:
                    t.mode === "dark"
                      ? "rgba(6,12,24,0.82)"
                      : "rgba(255,255,255,0.88)",
                  border: `1px solid rgba(${hexToRgb(t.accent)},0.34)`,
                  color: t.accent,
                  boxShadow: `0 8px 24px rgba(${hexToRgb(t.accent)},0.2)`,
                }}
              >
                Validiere View-Zugriff...
              </div>
            ) : null}
            {viewGuardState.blockedView ? (
              <div
                style={{
                  pointerEvents: "none",
                  marginTop: 8,
                  borderRadius: 10,
                  padding: "9px 10px",
                  fontSize: 12,
                  fontWeight: 700,
                  background: "rgba(255,69,58,0.14)",
                  border: "1px solid rgba(255,69,58,0.45)",
                  color: t.mode === "dark" ? "#ffd8d2" : "#5e1810",
                  boxShadow: "0 8px 26px rgba(255,69,58,0.18)",
                }}
              >
                View gesperrt: `{viewGuardState.blockedView}` erfordert Tier `
                {viewGuardState.requiredTier || "paid"}` (
                {viewGuardState.reason || "PAYWALL_BLOCKED"}).
              </div>
            ) : null}

          </div>
          <div
            style={{
              flex: 1,
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
              position: "relative",
              minHeight: 0,
              background:
                t.mode === "dark"
                  ? "rgba(7,8,13,0.42)"
                  : "rgba(255,255,255,0.42)",
            }}
          >
            {!toolbarBottom && toolbarEl}
            <motion.div
              initial={motionPreset.initial}
              animate={motionPreset.animate}
              exit={motionPreset.exit}
              transition={{
                duration:
                  (lowPowerMode ? 0.12 : 0.2) /
                  Math.max(t.visual.animationSpeed || 1, 0.1),
                ease: "easeInOut",
              }}
              style={{
                flex: 1,
                overflow: "hidden",
                height: "100%",
                minHeight: 0,
                position: "relative",
              }}
            >
              <div
                style={{
                  position: "relative",
                  height: "100%",
                  minHeight: 0,
                  overflow: "hidden",
                }}
              >
                <Suspense
                  fallback={
                    <div
                      style={{
                        height: "100%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        opacity: 0.6,
                        fontSize: 13,
                        fontWeight: 600,
                      }}
                    >
                      Loading view...
                    </div>
                  }
                >
                  {renderActiveView(view)}
                </Suspense>
              </div>
            </motion.div>
            <Suspense fallback={null}>
              {terminalOpen ? (
                <NexusTerminal
                  setView={(v: any) => {
                    void requestViewChange(v);
                  }}
                />
              ) : null}
            </Suspense>
            {toolbarBottom && toolbarEl}
          </div>
        </div>
      </div>

      {!lowPowerMode && t.background.vignette && (
        <div
          aria-hidden="true"
          style={{
            position: "fixed",
            inset: 0,
            pointerEvents: "none",
            zIndex: 1,
            background: `radial-gradient(circle at center, transparent 54%, rgba(0,0,0,${t.background.vignetteStrength * 0.56}) 100%)`,
          }}
        />
      )}

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
    </div>
  );
}
