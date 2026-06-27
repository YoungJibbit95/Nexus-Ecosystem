import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import {
  HashRouter as Router,
  Route,
  Routes,
  Navigate,
  useLocation,
} from "react-router-dom";
import { createNexusRuntime, isOfflineControlErrorCode } from "@nexus/api";
import { resolveNexusControlUserContext } from "@nexus/core";
import { beginPerfMetric, endPerfMetric, markPerfMetric } from "./lib/perfMetrics";
import { installRuntimeLagProbe } from "./lib/runtimeLagProbe";
import { useGlobalTypingAnimation } from "./lib/useGlobalTypingAnimation";

const CONTROL_API_BASE_URL = "https://nexus-api.cloud";
const NEXUS_CODE_APP_ID = "code";
const NEXUS_CODE_CHANNEL = "production";
const CODE_BOOT_PRELOAD_TIMEOUT_MS = 6_500;
const CODE_BOOT_PRELOAD_TIMEOUT_LOW_POWER_MS = 9_000;
const AUTH_LIMITED_CONTROL_CODES = new Set(["HTTP_401", "HTTP_403"]);
const normalizeControlErrorCode = (errorCodeRaw) =>
  String(errorCodeRaw || "INVALID_PAYLOAD").trim().toUpperCase() || "INVALID_PAYLOAD";
const classifyControlBootstrapIssue = (errorCodeRaw) => {
  const errorCode = normalizeControlErrorCode(errorCodeRaw);
  if (AUTH_LIMITED_CONTROL_CODES.has(errorCode)) return "limited";
  if (isOfflineControlErrorCode(errorCode)) return "offline";
  return "fatal";
};
const isRecoverableBootstrapIssue = (errorCodeRaw) =>
  classifyControlBootstrapIssue(errorCodeRaw) !== "fatal";
const STARTUP_TTI_METRIC = "code.startup_tti";
const loadEditorPage = () => import("./pages/Editor");
const Editor = lazy(() => loadEditorPage());
const warmupCodeUiModules = () =>
  Promise.allSettled([
    loadEditorPage(),
  ]);

if (typeof window !== "undefined") {
  beginPerfMetric(STARTUP_TTI_METRIC);
}

const withTimeoutResult = async (promise, timeoutMs) => {
  let timeoutHandle = null;
  const timeoutPromise = new Promise((resolve) => {
    timeoutHandle = window.setTimeout(() => resolve({ timedOut: true }), timeoutMs);
  });

  try {
    return await Promise.race([
      promise.then((value) => ({ timedOut: false, value })),
      timeoutPromise,
    ]);
  } finally {
    if (timeoutHandle !== null) {
      clearTimeout(timeoutHandle);
    }
  }
};
const isLowPowerDevice = () => {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return false;
  }
  const reducedMotion = window.matchMedia?.(
    "(prefers-reduced-motion: reduce)",
  ).matches;
  const cores = Number(navigator.hardwareConcurrency || 8);
  const memory = Number(navigator.deviceMemory || 8);
  return Boolean(reducedMotion) || cores <= 4 || memory <= 4;
};

const localFallbackTimestamp = () => new Date().toISOString();

const buildCodeFallbackCatalog = (channel = NEXUS_CODE_CHANNEL) => {
  const generatedAt = localFallbackTimestamp();
  return {
    schemaVersion: "2.0.0",
    featureVersion: "local-fallback",
    channel,
    generatedAt,
    compatMatrix: {
      [NEXUS_CODE_APP_ID]: ">=0.0.0",
    },
    features: [
      {
        featureId: "core.editor",
        name: "Editor",
        description: "Local fallback feature for Nexus Code editor",
        version: "local-fallback",
        appTargets: [NEXUS_CODE_APP_ID],
        rollout: "stable",
        stable: true,
        requires: [],
        tags: ["local-fallback", "order:1"],
        updatedAt: generatedAt,
      },
    ],
  };
};

const buildCodeFallbackLayoutSchema = (channel = NEXUS_CODE_CHANNEL) => ({
  schemaVersion: "2.0.0",
  featureVersion: "local-fallback",
  channel,
  appId: NEXUS_CODE_APP_ID,
  minClientVersion: "0.0.0",
  compatMatrix: {
    [NEXUS_CODE_APP_ID]: ">=0.0.0",
  },
  layoutProfile: {
    id: "desktop-default",
    mode: "desktop",
    density: "comfortable",
    navigation: "sidebar",
    tokens: {
      source: "local-fallback",
    },
  },
  componentWhitelist: ["view-shell", "status-strip", "code-editor"],
  screens: [
    {
      id: "editor",
      title: "Editor",
      enabled: true,
      components: [
        {
          id: "editor-shell",
          type: "view-shell",
          props: {
            viewId: "editor",
            source: "local-fallback",
          },
        },
      ],
    },
  ],
  updatedAt: localFallbackTimestamp(),
});

const buildCodeFallbackRelease = (channel = NEXUS_CODE_CHANNEL) => {
  const createdAt = localFallbackTimestamp();
  const id = `local_${NEXUS_CODE_APP_ID}_${channel}`;
  return {
    id,
    appId: NEXUS_CODE_APP_ID,
    channel,
    schemaVersion: "2.0.0",
    featureVersion: "local-fallback",
    minClientVersion: "0.0.0",
    snapshotDigest: `digest_${id}_fallback`,
    schemaDigest: `digest_${id}_schema_fallback`,
    catalogDigest: `digest_${id}_catalog_fallback`,
    sourceReleaseId: null,
    rollbackToken: `rollback_${id}`,
    note: "Local fallback release for degraded Control API startup",
    createdAt,
    promotedBy: "local-fallback",
  };
};

const buildCodeFallbackBundle = ({
  channel = NEXUS_CODE_CHANNEL,
  catalog = null,
  layoutSchema = null,
  release = null,
} = {}) => ({
  appId: NEXUS_CODE_APP_ID,
  channel,
  catalog: catalog || buildCodeFallbackCatalog(channel),
  layoutSchema: layoutSchema || buildCodeFallbackLayoutSchema(channel),
  release: release || buildCodeFallbackRelease(channel),
});

const summarizeBootstrapMode = (issues) => {
  if (!Array.isArray(issues) || issues.length === 0) return "online";
  const modes = new Set(issues.map((issue) => issue.mode));
  if (modes.has("limited")) return "limited";
  if (modes.size === 1 && modes.has("offline")) return "offline";
  return "degraded";
};

const buildControlStatus = (mode, details, fallbackReason = "") => {
  const safeDetails = Array.isArray(details) ? details.filter(Boolean) : [];
  if (mode === "online") {
    return {
      mode: "online",
      title: "Control API verbunden",
      message: "Live Katalog, Layout und Release sind aktiv.",
      details: [],
    };
  }

  const title = mode === "limited"
    ? "Control API limited"
    : mode === "offline"
      ? "Control API offline"
      : "Control API degraded";
  const message = mode === "limited"
    ? "Hosted Auth ist nicht verfuegbar. Nexus Code startet mit lokalen Runtime-Daten."
    : mode === "offline"
      ? "Hosted Control ist nicht erreichbar. Nexus Code startet mit lokalen Runtime-Daten."
      : "Control Bootstrap ist eingeschraenkt. Nexus Code nutzt lokale Fallback-Daten.";

  return {
    mode,
    title,
    message: fallbackReason ? `${message} ${fallbackReason}` : message,
    details: safeDetails,
  };
};

const formatBootstrapIssues = (issues) =>
  issues.map((issue) => `${issue.resource}:${issue.errorCode}`);

const classifyViewAccessDegradation = (reasonRaw, currentMode) => {
  const reason = String(reasonRaw || "").trim().toUpperCase();
  if (!reason) return null;
  if (reason.includes("HTTP_401") || reason.includes("HTTP_403")) return "limited";
  if (
    reason.includes("OFFLINE")
    || reason.includes("TIMEOUT")
    || reason.includes("HTTP_408")
    || reason.includes("HTTP_425")
    || reason.includes("HTTP_429")
    || reason.includes("HTTP_500")
    || reason.includes("HTTP_502")
    || reason.includes("HTTP_503")
    || reason.includes("HTTP_504")
  ) {
    return "offline";
  }
  if (reason.includes("NETWORK_ERROR") && currentMode !== "online") return "degraded";
  return null;
};

function NexusBridge({ runtime }) {
  const location = useLocation();

  useEffect(() => {
    runtime.connection.sendNavigation(location.pathname);
    runtime.connection.syncState("code.route", location.pathname);
    runtime.performance.trackViewRender(`code:${location.pathname}`);
  }, [location.pathname, runtime]);

  return null;
}

function BootSequenceScreen({ progress, stage }) {
  const safeProgress = Math.max(0, Math.min(100, Math.round(progress)));
  return (
    <div
      style={{
        width: "100%",
        minHeight: "100dvh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background:
          "radial-gradient(circle at 18% 14%, rgba(51,85,180,0.45), transparent 45%), linear-gradient(135deg, #04050c 0%, #0b0f1c 45%, #111628 100%)",
        color: "#d7e6ff",
        fontFamily: "system-ui, sans-serif",
        padding: 24,
      }}
    >
      <div
        style={{
          width: "min(560px, 92vw)",
          borderRadius: 20,
          border: "1px solid rgba(255,255,255,0.14)",
          background: "rgba(8,12,24,0.68)",
          backdropFilter: "blur(18px) saturate(140%)",
          WebkitBackdropFilter: "blur(18px) saturate(140%)",
          boxShadow:
            "0 30px 90px rgba(0,0,0,0.46), inset 0 1px 0 rgba(255,255,255,0.18)",
          padding: 22,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 12,
              border: "1px solid rgba(112,165,255,0.58)",
              background: "linear-gradient(135deg, rgba(112,165,255,0.34), rgba(94,92,230,0.26))",
              display: "grid",
              placeItems: "center",
              fontWeight: 900,
              fontSize: 16,
            }}
          >
            ⌘
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800 }}>Nexus Code</div>
            <div style={{ fontSize: 11, opacity: 0.62 }}>Boot Sequence</div>
          </div>
        </div>
        <div style={{ marginTop: 14, fontSize: 13, opacity: 0.88, minHeight: 20 }}>
          {stage}
        </div>
        <div
          style={{
            marginTop: 12,
            height: 10,
            borderRadius: 999,
            background: "rgba(255,255,255,0.08)",
            overflow: "hidden",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <div
            style={{
              width: `${safeProgress}%`,
              height: "100%",
              borderRadius: 999,
              background: "linear-gradient(90deg, #70a5ff, #5e5ce6)",
              boxShadow: "0 0 12px rgba(112,165,255,0.72)",
              transition: "width 260ms cubic-bezier(0.2, 0.7, 0.2, 1)",
            }}
          />
        </div>
        <div style={{ marginTop: 8, fontSize: 11, opacity: 0.7 }}>
          {safeProgress}% geladen
        </div>
      </div>
    </div>
  );
}

function App() {
  const controlBaseUrl = CONTROL_API_BASE_URL;
  const controlIngestKey = import.meta.env?.VITE_NEXUS_CONTROL_INGEST_KEY;
  const lowPowerMode = useMemo(() => isLowPowerDevice(), []);
  const viewAccessContext = useMemo(
    () =>
      resolveNexusControlUserContext({
        userId: import.meta.env?.VITE_NEXUS_USER_ID,
        username: import.meta.env?.VITE_NEXUS_USERNAME,
        userTier: import.meta.env?.VITE_NEXUS_USER_TIER,
      }),
    [],
  );
  useGlobalTypingAnimation(!lowPowerMode);
  const [bootReady, setBootReady] = useState(false);
  const [bootProgress, setBootProgress] = useState(0);
  const [bootStage, setBootStage] = useState("Nexus Runtime wird gestartet...");
  const [controlStatus, setControlStatus] = useState(() =>
    buildControlStatus("online", []),
  );
  const [releaseState, setReleaseState] = useState({
    releaseId: null,
    compatible: true,
    reasons: [],
  });
  const [viewGuardState, setViewGuardState] = useState({
    checking: true,
    blocked: false,
    reason: null,
    requiredTier: null,
  });
  const startupMetricDoneRef = useRef(false);

  const runtime = useMemo(
    () =>
      createNexusRuntime({
        appId: "code",
        appVersion: "1.0.0",
        control: {
          enabled: Boolean(controlBaseUrl),
          baseUrl: controlBaseUrl,
          ingestKey: controlIngestKey,
          sampleRate: lowPowerMode ? 0.18 : 0.3,
          flushIntervalMs: 12_000,
          releasePollIntervalMs: 30_000,
          viewValidationFailOpen: false,
          viewValidationCacheMs: 120_000,
          requestTimeoutMs: lowPowerMode ? 1_900 : 1_350,
          readRetryMax: 1,
          readRetryBaseMs: 120,
          readRetryMaxMs: 1_000,
        },
        performance: {
          collectMemoryMs: lowPowerMode ? 90_000 : 60_000,
          summaryIntervalMs: 60_000,
          maxMetricsPerMinute: lowPowerMode ? 40 : 60,
          reportToBus: false,
        },
        liveSync: {
          enabled: false,
        },
      }),
    [controlBaseUrl, controlIngestKey, lowPowerMode],
  );

  useEffect(() => {
    runtime.control.setViewValidationDefaults(viewAccessContext);
    runtime.start();
    const stopLagProbe = installRuntimeLagProbe({
      enabled: import.meta.env?.VITE_NEXUS_LAG_PROBE === "1",
      onEvent: (event) => {
        const durationMs = Number(event.durationMs.toFixed(2));
        markPerfMetric("code.ui_lag_ms", durationMs, {
          source: event.kind,
        });
        runtime.connection.publish(
          "custom",
          {
            event: event.kind,
            appId: "code",
            durationMs,
            detail:
              event.kind === "long-task"
                ? { name: event.name }
                : { interaction: event.interaction },
          },
          "all",
        );
        if (durationMs >= 120) {
          // eslint-disable-next-line no-console
          console.warn("[Nexus Code] interaction lag detected", event);
        }
      },
    });
    return () => {
      stopLagProbe();
      runtime.stop();
    };
  }, [runtime, viewAccessContext]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.__NEXUS_CODE_RUNTIME__ = runtime;
    return () => {
      if (window.__NEXUS_CODE_RUNTIME__ === runtime) {
        delete window.__NEXUS_CODE_RUNTIME__;
      }
    };
  }, [runtime]);

  useEffect(() => {
    const root = document.documentElement;
    if (lowPowerMode) root.classList.add("reduce-motion");
    else root.classList.remove("reduce-motion");
    return () => root.classList.remove("reduce-motion");
  }, [lowPowerMode]);

  useEffect(() => {
    let active = true;
    const preloadBudgetMs = lowPowerMode
      ? CODE_BOOT_PRELOAD_TIMEOUT_LOW_POWER_MS
      : CODE_BOOT_PRELOAD_TIMEOUT_MS;
    setControlStatus(buildControlStatus("online", []));
    setBootReady(false);
    setViewGuardState({
      checking: true,
      blocked: false,
      reason: null,
      requiredTier: null,
    });
    setBootProgress(8);
    setBootStage("Nexus Runtime wird gestartet...");
    const uiWarmupPromise = warmupCodeUiModules();
    let bootControlStatus = buildControlStatus("online", []);

    const setBootStep = (progress, stage) => {
      if (!active) return;
      setBootProgress((prev) => Math.max(prev, progress));
      setBootStage(stage);
    };

    void runtime.control.reportCapabilities({
      appId: NEXUS_CODE_APP_ID,
      appVersion: "1.0.0",
      platform: "desktop",
      supports: {
        schemaVersions: ["2.0.0"],
        components: ["code-editor", "status-strip"],
        layoutProfiles: ["desktop-default", "mobile-adaptive"],
        featureFlags: ["paywall-validation", "live-release-sync"],
      },
    });

    const applyBundle = (bundle) => {
      if (!active) return;
      const compatibility = runtime.resolveCompatibility(bundle, "production");
      setReleaseState({
        releaseId: bundle.release?.id || null,
        compatible: compatibility.compatible,
        reasons: compatibility.reasons || [],
      });
    };

    void (async () => {
      try {
        setBootStep(26, "Lade API Katalog, Layout und Release...");
        const [catalogResult, layoutResult, releaseResult] = await Promise.all([
          runtime.control.fetchCatalog({
            appId: NEXUS_CODE_APP_ID,
            channel: NEXUS_CODE_CHANNEL,
            forceRefresh: false,
            cacheTtlMs: 120_000,
          }),
          runtime.control.fetchLayoutSchema({
            appId: NEXUS_CODE_APP_ID,
            channel: NEXUS_CODE_CHANNEL,
            forceRefresh: false,
            cacheTtlMs: 120_000,
          }),
          runtime.control.fetchCurrentRelease({
            appId: NEXUS_CODE_APP_ID,
            channel: NEXUS_CODE_CHANNEL,
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
            errorCode: normalizeControlErrorCode(errorCode),
            mode: classifyControlBootstrapIssue(errorCode),
          }));

        if (failedResources.length > 0) {
          const recoverableOnly = failedResources.every((entry) =>
            isRecoverableBootstrapIssue(entry.errorCode),
          );
          if (!recoverableOnly) {
            throw new Error(
              `CONTROL_API_BOOTSTRAP_FAILED (${failedResources.map((entry) => `${entry.resource}:${entry.errorCode}`).join(", ")})`,
            );
          }

          const statusMode = summarizeBootstrapMode(failedResources);
          const details = formatBootstrapIssues(failedResources);
          bootControlStatus = buildControlStatus(statusMode, details);
          setControlStatus(bootControlStatus);
          setBootStep(
            58,
            statusMode === "limited"
              ? "Hosted Auth eingeschraenkt, lokale Runtime-Daten aktiv..."
              : "Control API offline, lokale Runtime-Daten aktiv...",
          );
        }

        if (failedResources.length === 0) {
          setBootStep(66, "Pruefe Release-Kompatibilitaet...");
          applyBundle({
            appId: NEXUS_CODE_APP_ID,
            channel: NEXUS_CODE_CHANNEL,
            catalog: catalogResult.item,
            layoutSchema: layoutResult.item,
            release: releaseResult.item,
          });
        } else {
          setBootStep(66, "Pruefe lokale Release-Kompatibilitaet...");
          applyBundle(buildCodeFallbackBundle({
            channel: NEXUS_CODE_CHANNEL,
            catalog: catalogResult.item,
            layoutSchema: layoutResult.item,
            release: releaseResult.item,
          }));
        }
        setBootStep(72, "Validiere Editor-Zugriff...");
        const editorAccess = await runtime.control.validateViewAccess("editor", {
          forceRefresh: false,
          ...viewAccessContext,
        });
        if (!active) return;
        const accessDegradationMode = !editorAccess.allowed
          ? classifyViewAccessDegradation(editorAccess.reason, bootControlStatus.mode)
          : null;
        if (accessDegradationMode) {
          const details = [
            ...(bootControlStatus.details || []),
            `access:${editorAccess.reason || "VIEW_VALIDATION_UNAVAILABLE"}`,
          ];
          bootControlStatus = buildControlStatus(
            accessDegradationMode === "degraded" ? "degraded" : accessDegradationMode,
            details,
            "Remote View-Validation wurde lokal freigegeben.",
          );
          setControlStatus(bootControlStatus);
          setViewGuardState({
            checking: false,
            blocked: false,
            reason: editorAccess.reason || null,
            requiredTier: editorAccess.requiredTier || null,
          });
        } else {
          setViewGuardState({
            checking: false,
            blocked: !editorAccess.allowed,
            reason: editorAccess.reason || null,
            requiredTier: editorAccess.requiredTier || null,
          });
        }
        if (!editorAccess.allowed) {
          if (accessDegradationMode) {
            setBootStep(76, "Editor-Zugriff lokal freigegeben...");
          } else {
            setBootStep(100, "Editor-Zugriff gesperrt");
            return;
          }
        }
        setBootStep(76, "Lade Editor-Module und Runtime...");
        const warmupResult = await withTimeoutResult(uiWarmupPromise, preloadBudgetMs);
        if (!active) return;
        setBootStep(
          92,
          warmupResult.timedOut
            ? "Editor-Warmup laeuft im Hintergrund weiter..."
            : "Editor-Module vorgeladen",
        );
        setBootStep(100, "Startsequenz abgeschlossen");
      } catch (error) {
        const reason =
          error instanceof Error && error.message
            ? error.message
            : "CONTROL_API_UNAVAILABLE";
        console.error("Nexus Code bootstrap failed", error);
        if (!active) return;
        setControlStatus(buildControlStatus("degraded", [reason]));
      } finally {
        if (active) {
          setViewGuardState((prev) => ({
            ...prev,
            checking: false,
          }));
          setBootProgress(100);
          setBootReady(true);
        }
      }
    })();

    const unsubscribe = runtime.control.subscribeReleaseUpdates(
      { appId: NEXUS_CODE_APP_ID, channel: NEXUS_CODE_CHANNEL, pollIntervalMs: 30_000 },
      (event) => {
        applyBundle(event.bundle);
        setControlStatus(buildControlStatus("online", []));
      },
    );

    return () => {
      active = false;
      unsubscribe();
    };
  }, [runtime, viewAccessContext]);

  useEffect(() => {
    if (!bootReady || startupMetricDoneRef.current) return;
    const frame = window.requestAnimationFrame(() => {
      if (startupMetricDoneRef.current) return;
      endPerfMetric(STARTUP_TTI_METRIC, {
        source: "app",
      });
      startupMetricDoneRef.current = true;
    });
    return () => window.cancelAnimationFrame(frame);
  }, [bootReady]);

  if (!bootReady) {
    return <BootSequenceScreen progress={bootProgress} stage={bootStage} />;
  }

  if (!releaseState.compatible) {
    return (
      <div
        style={{
          width: "100%",
          minHeight: "100dvh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #1d1603 0%, #111723 100%)",
          color: "#fff3d0",
          fontFamily: "system-ui, sans-serif",
          padding: 24,
        }}
      >
        <div
          style={{
            maxWidth: 620,
            borderRadius: 16,
            border: "1px solid rgba(255,191,64,0.45)",
            background: "rgba(255,191,64,0.12)",
            padding: 18,
            fontSize: 14,
            lineHeight: 1.5,
          }}
        >
          <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 8 }}>
            Client nicht kompatibel mit aktuellem Release
          </div>
          <div>
            Release: <code>{releaseState.releaseId || "unbekannt"}</code>
          </div>
          <div style={{ marginTop: 6 }}>
            Gruende: <code>{(releaseState.reasons || []).join(" | ") || "N/A"}</code>
          </div>
        </div>
      </div>
    );
  }

  if (viewGuardState.blocked) {
    return (
      <div
        style={{
          width: "100%",
          minHeight: "100dvh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #1d1603 0%, #111723 100%)",
          color: "#fff3d0",
          fontFamily: "system-ui, sans-serif",
          padding: 24,
        }}
      >
        <div
          style={{
            maxWidth: 620,
            borderRadius: 16,
            border: "1px solid rgba(255,191,64,0.45)",
            background: "rgba(255,191,64,0.12)",
            padding: 18,
            fontSize: 14,
            lineHeight: 1.5,
          }}
        >
          <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 8 }}>
            Editor-Zugriff gesperrt
          </div>
          <div>
            Grund: <code>{viewGuardState.reason || "PAYWALL_BLOCKED"}</code>
          </div>
          <div style={{ marginTop: 6 }}>
            Erforderlicher Tier: <code>{viewGuardState.requiredTier || "paid"}</code>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <NexusBridge runtime={runtime} />
      {controlStatus.mode !== "online" ? (
        <div
          role="status"
          style={{
            position: "fixed",
            top: 10,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 4000,
            borderRadius: 10,
            border: controlStatus.mode === "limited"
              ? "1px solid rgba(255,191,64,0.44)"
              : "1px solid rgba(112,165,255,0.38)",
            background: controlStatus.mode === "limited"
              ? "rgba(255,191,64,0.14)"
              : "rgba(40,112,255,0.14)",
            color: controlStatus.mode === "limited" ? "#fff3d0" : "#d7e6ff",
            padding: "8px 12px",
            fontSize: 12,
            fontWeight: 700,
            maxWidth: "min(92vw, 720px)",
            lineHeight: 1.35,
            boxShadow: "0 14px 34px rgba(0,0,0,0.24)",
          }}
        >
          <span>{controlStatus.title}: </span>
          <span>{controlStatus.message}</span>
          {controlStatus.details.length > 0 ? (
            <span style={{ display: "block", marginTop: 2, opacity: 0.78 }}>
              Details: <code>{controlStatus.details.join(", ")}</code>
            </span>
          ) : null}
        </div>
      ) : null}
      <Routes>
        <Route path="/" element={<Navigate to="/editor" replace />} />
        <Route
          path="/editor"
          element={(
            <div className={lowPowerMode ? undefined : "nx-view-enter"} style={{ width: "100%", minHeight: "100dvh" }}>
              <Suspense
                fallback={(
                  <div
                    style={{
                      width: "100%",
                      minHeight: "100dvh",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background:
                        "radial-gradient(circle at 18% 14%, rgba(51,85,180,0.2), transparent 45%), linear-gradient(135deg, #04050c 0%, #0b0f1c 45%, #111628 100%)",
                      color: "#d7e6ff",
                      fontFamily: "system-ui, sans-serif",
                      fontSize: 13,
                      fontWeight: 700,
                    }}
                  >
                    Lade Editor...
                  </div>
                )}
              >
                <Editor />
              </Suspense>
            </div>
          )}
        />
        <Route path="*" element={<Navigate to="/editor" replace />} />
      </Routes>
      <Toaster />
    </Router>
  );
}

export default App;
