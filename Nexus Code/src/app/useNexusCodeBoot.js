import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createNexusRuntime } from "@nexus/api";
import { resolveNexusControlUserContext } from "@nexus/core";
import {
  DEFAULT_CONTROL_API_BASE_URL,
  NEXUS_CODE_APP_ID,
  NEXUS_CODE_CHANNEL,
  buildControlStatus,
  buildStatusFromConnectionTest,
  classifyControlBootstrapIssue,
  classifyViewAccessDegradation,
  collectBootstrapIssues,
  formatBootstrapIssues,
  summarizeBootstrapMode,
} from "./controlStatus.js";
import {
  ACCOUNT_AUTH_MODES,
  clearNexusAccountSession,
  getAccountSessionState,
  loadNexusAccountSession,
  saveNexusAccountSession,
} from "./accountSession.js";
import {
  getNexusCodeDeviceId,
  loginNexusCodeSession,
  testNexusApiConnection,
} from "./nexusApiClient.js";
import { beginPerfMetric, endPerfMetric, markPerfMetric } from "../lib/perfMetrics";
import { installRuntimeLagProbe } from "../lib/runtimeLagProbe";
import { useGlobalTypingAnimation } from "../lib/useGlobalTypingAnimation";

const CODE_BOOT_PRELOAD_TIMEOUT_MS = 6_500;
const CODE_BOOT_PRELOAD_TIMEOUT_LOW_POWER_MS = 9_000;
const STARTUP_TTI_METRIC = "code.startup_tti";
const BOOT_STAGE_METRIC = "code.boot_stage_ms";
const BOOT_TOTAL_METRIC = "code.boot_total_ms";

const createInitialReleaseState = () => ({
  releaseId: null,
  compatible: true,
  reasons: [],
});

const createInitialViewGuardState = () => ({
  checking: true,
  blocked: false,
  reason: null,
  requiredTier: null,
});

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

const getBootNow = () => {
  if (
    typeof performance !== "undefined" &&
    typeof performance.now === "function"
  ) {
    return performance.now();
  }
  return Date.now();
};

const isStrictAccountReady = (sessionRaw) => {
  const sessionState = getAccountSessionState(sessionRaw);
  return sessionState.canStartWorkbench;
};

const createBootstrapFailureReason = (issues) =>
  `CONTROL_API_BOOTSTRAP_FAILED (${issues
    .map((entry) => `${entry.resource}:${entry.errorCode}`)
    .join(", ")})`;

if (typeof window !== "undefined") {
  beginPerfMetric(STARTUP_TTI_METRIC);
}

export function useNexusCodeBoot({ warmupCodeUiModules }) {
  const [accountSession, setAccountSession] = useState(loadNexusAccountSession);
  const controlBaseUrl = accountSession.endpoint || DEFAULT_CONTROL_API_BASE_URL;
  const controlToken = accountSession.token || "";
  const controlEnabled = accountSession.authMode === ACCOUNT_AUTH_MODES.nexus && Boolean(controlBaseUrl);
  const controlIngestKey = import.meta.env?.VITE_NEXUS_CONTROL_INGEST_KEY;
  const hasElevatedAccountRole = ["admin", "owner", "developer"].includes(
    String(accountSession.role || "").trim().toLowerCase(),
  );
  const lowPowerMode = useMemo(() => isLowPowerDevice(), []);
  const viewAccessContext = useMemo(
    () =>
      resolveNexusControlUserContext({
        userId: accountSession.userId || import.meta.env?.VITE_NEXUS_USER_ID,
        username: accountSession.username || import.meta.env?.VITE_NEXUS_USERNAME,
        userTier: accountSession.userTier || import.meta.env?.VITE_NEXUS_USER_TIER,
      }),
    [accountSession.userId, accountSession.username, accountSession.userTier],
  );
  const strictAccountReady = useMemo(
    () => isStrictAccountReady(accountSession),
    [accountSession],
  );

  useGlobalTypingAnimation(!lowPowerMode);

  const [bootReady, setBootReady] = useState(false);
  const [bootProgress, setBootProgress] = useState(0);
  const [bootStage, setBootStage] = useState("Nexus Runtime wird gestartet...");
  const [controlStatus, setControlStatus] = useState(() =>
    buildControlStatus("online", []),
  );
  const [releaseState, setReleaseState] = useState(createInitialReleaseState);
  const [viewGuardState, setViewGuardState] = useState(createInitialViewGuardState);
  const startupMetricDoneRef = useRef(false);

  const handleSaveAccountSession = useCallback((nextSession) => {
    const saved = saveNexusAccountSession(nextSession);
    setAccountSession(saved);
    setControlStatus(buildControlStatus("degraded", ["account:SESSION_UPDATED"]));
    return saved;
  }, []);

  const handleClearAccountSession = useCallback(() => {
    const cleared = clearNexusAccountSession();
    setAccountSession(cleared);
    setReleaseState(createInitialReleaseState());
    setViewGuardState({
      checking: false,
      blocked: true,
      reason: "ACCOUNT_SESSION_CLEARED",
      requiredTier: "free",
    });
    setBootReady(true);
    setControlStatus(buildControlStatus("limited", ["account:SESSION_CLEARED"]));
    return cleared;
  }, []);

  const handleTestAccountConnection = useCallback(
    async (draftSession) => {
      const result = await testNexusApiConnection(draftSession);
      if (result?.mode) {
        setControlStatus(buildStatusFromConnectionTest(result));
      }
      return result;
    },
    [],
  );

  const handleAccountGateSubmit = useCallback(
    async (loginDraft) => {
      const result = await loginNexusCodeSession(loginDraft);
      if (result?.mode) {
        setControlStatus(buildStatusFromConnectionTest(result));
      }
      if (!result?.ok) {
        return result;
      }
      const saved = saveNexusAccountSession(result.session);
      setAccountSession(saved);
      setReleaseState(createInitialReleaseState());
      setViewGuardState(createInitialViewGuardState());
      setBootReady(false);
      setBootProgress(0);
      setBootStage("Nexus Runtime wird gestartet...");
      setControlStatus(buildControlStatus("online", []));
      return result;
    },
    [],
  );

  const runtime = useMemo(
    () =>
      createNexusRuntime({
        appId: "code",
        appVersion: "1.0.0",
        control: {
          enabled: controlEnabled,
          baseUrl: controlBaseUrl,
          token: controlToken,
          ingestKey: controlIngestKey,
          deviceId: getNexusCodeDeviceId(),
          deviceLabel: "Nexus Code",
          sampleRate: lowPowerMode ? 0.18 : 0.3,
          flushIntervalMs: 12_000,
          releasePollIntervalMs: 30_000,
          viewValidationFailOpen: false,
          viewValidationCacheMs: 120_000,
          requestTimeoutMs: lowPowerMode ? 1_900 : 1_350,
          readRetryMax: 1,
          readRetryBaseMs: 120,
          readRetryMaxMs: 1_000,
          defaultUserId: viewAccessContext.userId,
          defaultUsername: viewAccessContext.username,
          defaultUserTier: viewAccessContext.userTier,
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
    [controlBaseUrl, controlEnabled, controlIngestKey, controlToken, lowPowerMode, viewAccessContext],
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
    setBootReady(false);
    setViewGuardState(createInitialViewGuardState());
    setBootProgress(8);
    setBootStage("Nexus Runtime wird gestartet...");
    let bootControlStatus = buildControlStatus("online", []);
    const bootStartedAt = getBootNow();
    let activeBootStage = "runtime-start";
    let activeBootStageStartedAt = bootStartedAt;

    const markBootStage = (nextStage, detail = {}) => {
      const now = getBootNow();
      markPerfMetric(BOOT_STAGE_METRIC, now - activeBootStageStartedAt, {
        stage: activeBootStage,
        nextStage,
        strictAccountReady,
        ...detail,
      });
      activeBootStage = nextStage;
      activeBootStageStartedAt = now;
    };

    const setBootStep = (progress, stage, stageId = stage) => {
      if (!active) return;
      markBootStage(stageId, { progress });
      setBootProgress((prev) => Math.max(prev, progress));
      setBootStage(stage);
    };

    if (!strictAccountReady) {
      markBootStage("account-gate", { outcome: "session-required" });
      setControlStatus(buildControlStatus(
        "limited",
        ["account:SESSION_REQUIRED"],
        "Nexus Code wartet auf eine gueltige Nexus Session.",
      ));
      setReleaseState(createInitialReleaseState());
      setViewGuardState({
        checking: false,
        blocked: true,
        reason: "ACCOUNT_SESSION_REQUIRED",
        requiredTier: "free",
      });
      markPerfMetric(BOOT_TOTAL_METRIC, getBootNow() - bootStartedAt, {
        outcome: "account-gate",
        strictAccountReady: false,
      });
      setBootProgress(100);
      setBootStage("Nexus Account erforderlich");
      setBootReady(true);
      return () => {
        active = false;
      };
    }

    const uiWarmupPromise = typeof warmupCodeUiModules === "function"
      ? warmupCodeUiModules()
      : Promise.resolve([]);
    setControlStatus(buildControlStatus("online", []));

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
      const compatibility = runtime.resolveCompatibility(bundle, NEXUS_CODE_CHANNEL);
      setReleaseState({
        releaseId: bundle.release?.id || null,
        compatible: compatibility.compatible,
        reasons: compatibility.reasons || [],
      });
    };

    void (async () => {
      try {
        setBootStep(26, "Lade API Katalog, Layout und Release...", "control-bootstrap");
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

        const failedResources = collectBootstrapIssues({
          catalogResult,
          layoutResult,
          releaseResult,
        });

        if (failedResources.length > 0) {
          const statusMode = summarizeBootstrapMode(failedResources);
          const details = formatBootstrapIssues(failedResources);
          bootControlStatus = buildControlStatus(
            statusMode === "fatal" ? "degraded" : statusMode,
            details,
            "Nexus Code bleibt gesperrt, weil der Bootstrap nicht live validiert werden konnte.",
          );
          setControlStatus(bootControlStatus);
          throw new Error(createBootstrapFailureReason(failedResources));
        }

        setBootStep(66, "Pruefe Release-Kompatibilitaet...", "release-compatibility");
        applyBundle({
          appId: NEXUS_CODE_APP_ID,
          channel: NEXUS_CODE_CHANNEL,
          catalog: catalogResult.item,
          layoutSchema: layoutResult.item,
          release: releaseResult.item,
        });
        setBootStep(72, "Validiere Editor-Zugriff...", "view-access");
        const editorAccess = await runtime.control.validateViewAccess("editor", {
          forceRefresh: false,
          ...viewAccessContext,
        });
        if (!active) return;
        const editorAllowed = editorAccess.allowed || hasElevatedAccountRole;
        const editorReason = editorAccess.allowed
          ? editorAccess.reason || null
          : hasElevatedAccountRole
            ? `LOCAL_ELEVATED_ROLE_ALLOW_${editorAccess.reason || "REMOTE_DENIED"}`
            : editorAccess.reason || null;
        setViewGuardState({
          checking: false,
          blocked: !editorAllowed,
          reason: editorReason,
          requiredTier: editorAllowed ? null : editorAccess.requiredTier || null,
        });
        if (!editorAllowed) {
          const accessMode =
            classifyViewAccessDegradation(editorAccess.reason, bootControlStatus.mode) ||
            "limited";
          setControlStatus(buildControlStatus(
            accessMode,
            [
              ...(bootControlStatus.details || []),
              `access:${editorAccess.reason || "VIEW_VALIDATION_DENIED"}`,
            ],
            "Nexus Code bleibt gesperrt, bis der View-Zugriff erlaubt ist.",
          ));
          setBootStep(100, "Editor-Zugriff gesperrt", "view-access-blocked");
          return;
        }
        setBootStep(76, "Lade Editor-Module und Runtime...", "editor-warmup");
        const warmupResult = await withTimeoutResult(uiWarmupPromise, preloadBudgetMs);
        if (!active) return;
        setBootStep(
          92,
          warmupResult.timedOut
            ? "Editor-Warmup laeuft im Hintergrund weiter..."
            : "Editor-Module vorgeladen",
          warmupResult.timedOut ? "editor-warmup-background" : "editor-warmup-ready",
        );
        setBootStep(100, "Startsequenz abgeschlossen", "boot-ready");
      } catch (error) {
        const reason =
          error instanceof Error && error.message
            ? error.message
            : "CONTROL_API_UNAVAILABLE";
        // eslint-disable-next-line no-console
        console.error("Nexus Code bootstrap failed", error);
        if (!active) return;
        markBootStage("boot-failed", { outcome: "blocked", reason });
        const details = bootControlStatus.details?.length > 0
          ? bootControlStatus.details
          : [reason];
        setControlStatus(buildControlStatus(
          bootControlStatus.mode === "online" ? "degraded" : bootControlStatus.mode,
          details,
          "Nexus Code bleibt gesperrt, bis Account und Control API wieder valide sind.",
        ));
        setReleaseState({
          releaseId: null,
          compatible: false,
          reasons: details,
        });
        setViewGuardState({
          checking: false,
          blocked: true,
          reason,
          requiredTier: "free",
        });
      } finally {
        if (active) {
          markPerfMetric(BOOT_TOTAL_METRIC, getBootNow() - bootStartedAt, {
            outcome:
              activeBootStage === "boot-failed" || activeBootStage.includes("blocked")
                ? "blocked"
                : "ready",
            stage: activeBootStage,
            strictAccountReady,
          });
          setViewGuardState((prev) => ({
            ...prev,
            checking: false,
          }));
          setBootProgress(100);
          setBootReady(true);
        }
      }
    })();

    let unsubscribe = () => {};
    try {
      unsubscribe = runtime.control.subscribeReleaseUpdates(
        { appId: NEXUS_CODE_APP_ID, channel: NEXUS_CODE_CHANNEL, pollIntervalMs: 30_000 },
        (event) => {
          if (event?.errorCode) {
            const mode = classifyControlBootstrapIssue(event.errorCode);
            setControlStatus(buildControlStatus(
              mode === "fatal" ? "degraded" : mode,
              [`release:${event.errorCode}`],
            ));
            return;
          }
          const bundle = event?.bundle || {};
          if (!bundle.catalog && !bundle.layoutSchema && !bundle.release) {
            setControlStatus(buildControlStatus("degraded", ["release:EMPTY_BUNDLE"]));
            return;
          }
          if (!bundle.catalog || !bundle.layoutSchema || !bundle.release) {
            setControlStatus(buildControlStatus("degraded", ["release:PARTIAL_BUNDLE"]));
            return;
          }
          applyBundle(bundle);
          setControlStatus(buildControlStatus("online", []));
        },
      );
    } catch (error) {
      setControlStatus(buildControlStatus(
        "degraded",
        ["release:SUBSCRIBE_FAILED"],
        error?.message || "Release-Monitor konnte nicht gestartet werden.",
      ));
    }

    return () => {
      active = false;
      unsubscribe();
    };
  }, [
    hasElevatedAccountRole,
    lowPowerMode,
    runtime,
    strictAccountReady,
    viewAccessContext,
    warmupCodeUiModules,
  ]);

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

  return {
    accountSession,
    bootProgress,
    bootReady,
    bootStage,
    controlStatus,
    handleAccountGateSubmit,
    handleClearAccountSession,
    handleSaveAccountSession,
    handleTestAccountConnection,
    lowPowerMode,
    releaseState,
    runtime,
    strictAccountReady,
    viewGuardState,
  };
}
