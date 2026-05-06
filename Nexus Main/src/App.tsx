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
import { configureRenderRuntime } from "./render/renderRuntime";
import {
  applyAccessibilityFlags,
  applyGlobalFont,
  applyPanelDensity,
  applyTypographyScale,
  buildLiveViewModel,
  resolveNexusControlUserContext,
  resolveLayoutProfile,
  sanitizeGlobalFont,
} from "@nexus/core";
import {
  createNexusRuntime,
  type NexusLiveBundle,
  type NexusRuntime,
  type NexusUserTier,
  type NexusViewAccessResult,
} from "@nexus/api";
import {
  VIEW_CHUNK_PRELOADERS,
  VIEW_IDS,
  orderMainPreloadViews,
  preloadMainViews,
} from "./app/viewPreload";
import { MainShellLayout } from "./app/MainShellLayout";
import { MainViewHost } from "./app/mainViewHost";
import {
  CONTROL_API_BASE_URL as DEFAULT_CONTROL_API_BASE_URL,
  MAIN_BOOT_PRELOAD_TIMEOUT_LOW_POWER_MS,
  MAIN_BOOT_PRELOAD_TIMEOUT_MS,
  MAIN_BOOT_PRIORITY_VIEWS,
  MAIN_BOOT_VIEW_WARMUP_TIMEOUT_LOW_POWER_MS,
  MAIN_BOOT_VIEW_WARMUP_TIMEOUT_MS,
  MAIN_CRITICAL_PRELOAD_VIEWS,
  MAIN_HEAVY_PRELOAD_VIEW_SET,
  MAIN_PERSISTENT_VIEW_CACHE,
  MAIN_SAFE_STARTUP_VIEWS,
  isLowPowerDevice,
  isOfflineBootstrapResourceError,
  mergeUniqueViews,
  withTimeoutResult,
  withDevDiagnosticsView,
} from "./app/mainAppConfig";

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
const MAIN_AUTH_REMEMBER_STORAGE_KEY = "nx-main-api-session-remember-v1";
const MAIN_DEVICE_ID_STORAGE_KEY = "nx-main-device-id-v1";

type MainAuthMode = "login" | "register";

type MainAuthSession = {
  token: string;
  expiresAt: number;
  rememberSession?: boolean;
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
): NexusUserTier | undefined => {
  const raw = String(requestedTier || "").trim().toLowerCase();
  if (!raw) return undefined;
  if (raw === "free") return "free";
  if (raw === "lifetime_pro" || raw === "lifetime-pro" || raw === "pro_lifetime") {
    return "lifetime_pro";
  }
  if (raw === "lifetime") return "lifetime";
  return "pro";
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
    rememberSession: candidate.rememberSession === true,
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

  const read = (storage: Storage | null) => {
    if (!storage) return null;
    const raw = storage.getItem(MAIN_AUTH_SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = parseMainAuthSession(JSON.parse(raw));
    if (!parsed) {
      storage.removeItem(MAIN_AUTH_SESSION_STORAGE_KEY);
    }
    return parsed;
  };

  try {
    return read(window.sessionStorage) || read(window.localStorage);
  } catch {
    window.sessionStorage.removeItem(MAIN_AUTH_SESSION_STORAGE_KEY);
    window.localStorage.removeItem(MAIN_AUTH_SESSION_STORAGE_KEY);
    return null;
  }
};

const readStoredMainAuthPreference = () => {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(MAIN_AUTH_REMEMBER_STORAGE_KEY) === "1";
};

const storeMainAuthSession = (session: MainAuthSession, rememberSession = false) => {
  if (typeof window === "undefined") return;
  const payload = JSON.stringify({ ...session, rememberSession });
  const primary = rememberSession ? window.localStorage : window.sessionStorage;
  const secondary = rememberSession ? window.sessionStorage : window.localStorage;
  primary.setItem(MAIN_AUTH_SESSION_STORAGE_KEY, payload);
  secondary.removeItem(MAIN_AUTH_SESSION_STORAGE_KEY);
  window.localStorage.setItem(MAIN_AUTH_REMEMBER_STORAGE_KEY, rememberSession ? "1" : "0");
};

const clearStoredMainAuthSession = () => {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(MAIN_AUTH_SESSION_STORAGE_KEY);
  window.localStorage.removeItem(MAIN_AUTH_SESSION_STORAGE_KEY);
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
  rememberSession: boolean;
}) => {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), 9_000);
  const endpoint = input.mode === "login" ? "/auth/login" : "/auth/register";
  const body =
    input.mode === "login"
      ? {
          identifier: input.identifier.trim(),
          password: input.password,
          rememberSession: input.rememberSession,
        }
      : {
          email: input.email.trim().toLowerCase(),
          username: input.username.trim() || undefined,
          password: input.password,
          rememberSession: input.rememberSession,
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

export default function App() {
  const [view, setView] = useState<View>("dashboard");
  const [mountedViews, setMountedViews] = useState<View[]>(["dashboard"]);
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
  const [authRememberSession, setAuthRememberSession] = useState(() =>
    readStoredMainAuthPreference(),
  );
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
  const controlApiBaseUrl = useMemo(() => resolveControlApiBaseUrl(), []);

  useEffect(() => {
    setMountedViews((prev) => {
      const filtered = prev.filter((entry) => availableViews.includes(entry));
      const next = availableViews.includes(view)
        ? mergeUniqueViews([view], filtered)
        : filtered;
      const keepAlive = next.filter((entry) =>
        MAIN_PERSISTENT_VIEW_CACHE.includes(entry),
      );
      return keepAlive.length > 0
        ? keepAlive.slice(0, MAIN_PERSISTENT_VIEW_CACHE.length)
        : [availableViews[0] || "dashboard"];
    });
  }, [availableViews, view]);

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
        resolveMainAuthUserTier(env.VITE_NEXUS_USER_TIER as string | undefined),
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
          requiredTier: cachedAccess.requiredTier || "pro",
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
        requiredTier: access.requiredTier || "pro",
        reason: access.reason || "PAYWALL_BLOCKED",
      });
      setView(previousView);
    },
    [availableViews, preloadViewChunk, view, viewAccessContext],
  );

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
          rememberSession: authRememberSession,
        });
        storeMainAuthSession(session, authRememberSession);
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
      authRememberSession,
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

            <label
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 10,
                marginTop: 12,
                borderRadius: 16,
                border: "1px solid rgba(148,163,184,0.2)",
                background: "rgba(15,23,42,0.54)",
                padding: "10px 12px",
                color: "#cbd5e1",
              }}
            >
              <input
                type="checkbox"
                checked={authRememberSession}
                onChange={(event) => setAuthRememberSession(event.target.checked)}
                style={{
                  marginTop: 2,
                  accentColor: "#22d3ee",
                }}
              />
              <span>
                <span style={{ display: "block", fontWeight: 900 }}>
                  Auf diesem Geraet angemeldet bleiben
                </span>
                <span
                  style={{
                    display: "block",
                    marginTop: 3,
                    color: "#94a3b8",
                    fontSize: 12,
                    lineHeight: 1.45,
                  }}
                >
                  Speichert nur den API-Session-Token, niemals dein Passwort.
                </span>
              </span>
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

  const mainViewNode = (
    <MainViewHost
      view={view}
      mountedViews={mountedViews}
      availableViews={availableViews}
      reducedMotion={Boolean(t.qol?.reducedMotion)}
      onRequestViewChange={(nextView) => {
        void requestViewChange(nextView);
      }}
      onPrefetchView={(nextView) => {
        void preloadViewChunk(nextView);
      }}
      onOpenWalkthrough={() => {}}
    />
  );

  return (
    <MainShellLayout
      theme={t}
      lowPowerMode={lowPowerMode}
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
      showDiagnosticsButton={Boolean((import.meta as any).env?.DEV)}
      releaseId={liveReleaseId}
      onRequestViewChange={(nextView) => {
        void requestViewChange(nextView);
      }}
      onPrefetchView={(nextView) => {
        void preloadViewChunk(nextView);
      }}
      onSidebarAutoPeek={setSidebarExpanded}
      onOpenDiagnostics={() => {
        void requestViewChange("diagnostics");
      }}
      mainViewNode={mainViewNode}
    />
  );
}
