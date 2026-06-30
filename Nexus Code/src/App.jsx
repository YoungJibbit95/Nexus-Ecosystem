import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import {
  HashRouter as Router,
  Route,
  Routes,
  Navigate,
  useLocation,
} from "react-router-dom";
import { createNexusRuntime } from "@nexus/api";
import { resolveNexusControlUserContext } from "@nexus/core";
import {
  DEFAULT_CONTROL_API_BASE_URL,
  NEXUS_CODE_APP_ID,
  NEXUS_CODE_CHANNEL,
  buildControlStatus,
  classifyControlBootstrapIssue,
  collectBootstrapIssues,
  formatBootstrapIssues,
  summarizeBootstrapMode,
} from "./app/controlStatus";
import {
  ACCOUNT_AUTH_MODES,
  clearNexusAccountSession,
  createLocalAccountSession,
  getAccountSessionState,
  loadNexusAccountSession,
  normalizeAccountSession,
  saveNexusAccountSession,
} from "./app/accountSession";
import { loginNexusCodeSession, testNexusApiConnection } from "./app/nexusApiClient";
import { beginPerfMetric, endPerfMetric, markPerfMetric } from "./lib/perfMetrics";
import { installRuntimeLagProbe } from "./lib/runtimeLagProbe";
import { useGlobalTypingAnimation } from "./lib/useGlobalTypingAnimation";

const CODE_BOOT_PRELOAD_TIMEOUT_MS = 6_500;
const CODE_BOOT_PRELOAD_TIMEOUT_LOW_POWER_MS = 9_000;
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

const isStrictAccountReady = (sessionRaw) => {
  const sessionState = getAccountSessionState(sessionRaw);
  return sessionState.canStartWorkbench;
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

function AccountGateScreen({
  session,
  controlStatus,
  viewGuardState,
  onSubmit,
  onStartLocal,
  onClear,
}) {
  const normalizedSession = useMemo(() => normalizeAccountSession(session), [session]);
  const [draft, setDraft] = useState(() => ({
    endpoint: normalizedSession.endpoint,
    identifier: normalizedSession.email || normalizedSession.username || "",
    password: "",
    rememberSession: true,
  }));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    setDraft((prev) => ({
      ...prev,
      endpoint: normalizedSession.endpoint,
      identifier: prev.identifier || normalizedSession.email || normalizedSession.username || "",
    }));
  }, [normalizedSession.endpoint, normalizedSession.email, normalizedSession.username]);

  const updateDraft = (field, value) => {
    setDraft((prev) => ({
      ...prev,
      [field]: value,
    }));
    setMessage(null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!draft.identifier.trim() || draft.password.length < 8) {
      setMessage({
        tone: "warning",
        title: "Login unvollstaendig",
        detail: "Username oder E-Mail und ein Passwort mit mindestens 8 Zeichen sind erforderlich.",
      });
      return;
    }

    setBusy(true);
    try {
      const result = await onSubmit?.(draft);
      if (result?.ok) {
        setMessage({
          tone: "success",
          title: "Session aktiv",
          detail: "Nexus Code startet mit deiner API Session.",
        });
        return;
      }
      setMessage({
        tone: "danger",
        title: result?.message || "Login fehlgeschlagen",
        detail: (result?.details || []).join(", ") || "Die API Session konnte nicht validiert werden.",
      });
    } catch (error) {
      setMessage({
        tone: "danger",
        title: "Login fehlgeschlagen",
        detail: error?.message || "Die API Session konnte nicht validiert werden.",
      });
    } finally {
      setBusy(false);
    }
  };

  const handleStartLocal = () => {
    if (busy) return;
    const saved = onStartLocal?.();
    setMessage({
      tone: "success",
      title: "Lokaler Workspace aktiv",
      detail: saved?.username
        ? `${saved.username} startet ohne Cloud-Features.`
        : "Nexus Code startet lokal; API Features bleiben deaktiviert.",
    });
  };

  const gateDetails = [
    ...(controlStatus?.details || []),
    viewGuardState?.reason ? `access:${viewGuardState.reason}` : "",
  ].filter(Boolean);
  const notice = message || {
    tone: viewGuardState?.blocked ? "danger" : "info",
    title: viewGuardState?.blocked
      ? "Nexus Code ist durch den Account-Gate gesperrt"
      : "Mit Nexus Code anmelden",
    detail:
      gateDetails.length > 0
        ? gateDetails.join(", ")
        : "Cloud-Funktionen brauchen eine Nexus Session; lokale IDE-Funktionen koennen sofort starten.",
  };
  const noticeColor = notice.tone === "success"
    ? "rgba(45,212,191,0.2)"
    : notice.tone === "warning"
      ? "rgba(251,191,36,0.22)"
      : notice.tone === "danger"
        ? "rgba(248,113,113,0.24)"
        : "rgba(124,140,255,0.2)";

  return (
    <div
      style={{
        width: "100%",
        minHeight: "100dvh",
        display: "grid",
        placeItems: "center",
        padding: "clamp(18px, 4vw, 48px)",
        background:
          "radial-gradient(circle at 18% 10%, rgba(124,140,255,0.34), transparent 34%), radial-gradient(circle at 84% 18%, rgba(45,212,191,0.18), transparent 36%), linear-gradient(135deg, #050711 0%, #12182f 48%, #061f23 100%)",
        color: "#edf4ff",
        fontFamily: "Inter, Segoe UI, system-ui, sans-serif",
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          width: "min(940px, 100%)",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 320px), 1fr))",
          gap: 18,
          alignItems: "stretch",
        }}
      >
        <section
          style={{
            minWidth: 0,
            borderRadius: 28,
            border: "1px solid rgba(255,255,255,0.12)",
            background: "linear-gradient(145deg, rgba(255,255,255,0.09), rgba(255,255,255,0.035))",
            boxShadow: "0 24px 90px rgba(0,0,0,0.42), inset 0 1px 0 rgba(255,255,255,0.12)",
            padding: "clamp(22px, 3.6vw, 34px)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 18,
              display: "grid",
              placeItems: "center",
              border: "1px solid rgba(124,140,255,0.42)",
              background: "linear-gradient(135deg, rgba(124,140,255,0.3), rgba(45,212,191,0.14))",
              color: "#dbe7ff",
              fontWeight: 800,
              letterSpacing: 0,
            }}
          >
            NC
          </div>
          <h1
            style={{
              margin: "24px 0 0",
              fontSize: "clamp(32px, 5vw, 56px)",
              lineHeight: 0.96,
              letterSpacing: 0,
            }}
          >
            Code Session
          </h1>
          <p
            style={{
              margin: "14px 0 0",
              maxWidth: 390,
              color: "rgba(237,244,255,0.68)",
              fontSize: 14,
              lineHeight: 1.65,
            }}
          >
            Melde dich mit deinem Nexus Account an oder starte lokal. Der lokale Modus laedt den Editor sofort und markiert Cloud-, Sync- und Billing-nahe Features als offline.
          </p>
          <div
            style={{
              marginTop: 22,
              borderRadius: 18,
              border: `1px solid ${noticeColor}`,
              background: "rgba(0,0,0,0.18)",
              padding: 14,
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 800 }}>{notice.title}</div>
            <div style={{ marginTop: 4, color: "rgba(237,244,255,0.62)", fontSize: 12, lineHeight: 1.5 }}>
              {notice.detail}
            </div>
          </div>
        </section>

        <section
          style={{
            minWidth: 0,
            borderRadius: 28,
            border: "1px solid rgba(255,255,255,0.12)",
            background: "rgba(7,11,24,0.72)",
            backdropFilter: "blur(24px) saturate(135%)",
            WebkitBackdropFilter: "blur(24px) saturate(135%)",
            boxShadow: "0 24px 90px rgba(0,0,0,0.38)",
            padding: 20,
          }}
        >
          <div style={{ display: "grid", gap: 12 }}>
            {[
              ["endpoint", "API Endpoint", "https://nexus-api.cloud"],
              ["identifier", "Username oder E-Mail", "nexus-user"],
            ].map(([field, label, placeholder]) => (
              <label key={field} style={{ display: "grid", gap: 6, minWidth: 0 }}>
                <span style={{ fontSize: 11, fontWeight: 800, color: "rgba(237,244,255,0.54)" }}>
                  {label}
                </span>
                <input
                  value={draft[field] || ""}
                  onChange={(event) => updateDraft(field, event.target.value)}
                  type="text"
                  placeholder={placeholder}
                  autoCapitalize="off"
                  autoCorrect="off"
                  spellCheck={false}
                  style={{
                    minHeight: 44,
                    borderRadius: 14,
                    border: "1px solid rgba(255,255,255,0.11)",
                    background: "rgba(255,255,255,0.055)",
                    color: "#f5f7ff",
                    padding: "0 13px",
                    outline: "none",
                    minWidth: 0,
                  }}
                />
              </label>
            ))}
            <label style={{ display: "grid", gap: 6, minWidth: 0 }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: "rgba(237,244,255,0.54)" }}>
                Passwort
              </span>
              <input
                value={draft.password || ""}
                onChange={(event) => updateDraft("password", event.target.value)}
                type="password"
                placeholder="Nexus Passwort"
                autoComplete="current-password"
                style={{
                  minHeight: 44,
                  borderRadius: 14,
                  border: "1px solid rgba(255,255,255,0.11)",
                  background: "rgba(255,255,255,0.055)",
                  color: "#f5f7ff",
                  padding: "0 13px",
                  outline: "none",
                  minWidth: 0,
                }}
              />
            </label>
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 9,
                color: "rgba(237,244,255,0.64)",
                fontSize: 12,
                lineHeight: 1.4,
              }}
            >
              <input
                checked={draft.rememberSession === true}
                onChange={(event) => updateDraft("rememberSession", event.target.checked)}
                type="checkbox"
                style={{ width: 16, height: 16, accentColor: "#7c8cff" }}
              />
              Session auf diesem Geraet merken
            </label>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10, marginTop: 18 }}>
            <button
              type="submit"
              disabled={busy}
              style={{
                minHeight: 46,
                borderRadius: 16,
                border: "1px solid rgba(124,140,255,0.44)",
                background: "linear-gradient(135deg, rgba(124,140,255,0.32), rgba(45,212,191,0.18))",
                color: "#f7f8ff",
                fontWeight: 850,
                cursor: busy ? "wait" : "pointer",
              }}
            >
              {busy ? "Melde an..." : "Mit Nexus starten"}
            </button>
            <button
              type="button"
              onClick={handleStartLocal}
              disabled={busy}
              style={{
                minHeight: 46,
                borderRadius: 16,
                border: "1px solid rgba(45,212,191,0.22)",
                background: "rgba(45,212,191,0.08)",
                color: "#a7f3d0",
                padding: "0 14px",
                fontWeight: 750,
                cursor: busy ? "wait" : "pointer",
              }}
            >
              Lokal starten
            </button>
          </div>
          <button
            type="button"
            onClick={onClear}
            disabled={busy}
            style={{
              marginTop: 10,
              minHeight: 38,
              width: "100%",
              borderRadius: 14,
              border: "1px solid rgba(255,255,255,0.1)",
              background: "rgba(255,255,255,0.035)",
              color: "rgba(237,244,255,0.62)",
              fontWeight: 720,
              cursor: busy ? "wait" : "pointer",
            }}
          >
            Gespeicherte Session entfernen
          </button>
        </section>
      </form>
    </div>
  );
}

function App() {
  const [accountSession, setAccountSession] = useState(loadNexusAccountSession);
  const accountSessionState = useMemo(
    () => getAccountSessionState(accountSession),
    [accountSession],
  );
  const controlBaseUrl = accountSession.endpoint || DEFAULT_CONTROL_API_BASE_URL;
  const controlToken = accountSession.token || "";
  const controlEnabled = accountSession.authMode === ACCOUNT_AUTH_MODES.nexus && Boolean(controlBaseUrl);
  const controlIngestKey = import.meta.env?.VITE_NEXUS_CONTROL_INGEST_KEY;
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

  const handleSaveAccountSession = useCallback((nextSession) => {
    const saved = saveNexusAccountSession(nextSession);
    setAccountSession(saved);
    setControlStatus(buildControlStatus("degraded", ["account:SESSION_UPDATED"]));
    return saved;
  }, []);

  const handleClearAccountSession = useCallback(() => {
    const cleared = clearNexusAccountSession();
    setAccountSession(cleared);
    setControlStatus(buildControlStatus("limited", ["account:SESSION_CLEARED"]));
    return cleared;
  }, []);

  const handleStartLocalWorkspace = useCallback(() => {
    const localSession = createLocalAccountSession();
    const saved = saveNexusAccountSession(localSession);
    setAccountSession(saved);
    setControlStatus(buildControlStatus(
      "offline",
      ["account:LOCAL_WORKSPACE"],
      "Nexus Code startet lokal; Cloud Features sind bis zum Login deaktiviert.",
    ));
    setReleaseState({
      releaseId: "local-workspace",
      compatible: true,
      reasons: [],
    });
    setViewGuardState({
      checking: false,
      blocked: false,
      reason: null,
      requiredTier: null,
    });
    setBootReady(false);
    setBootProgress(0);
    setBootStage("Lokale Workbench wird gestartet...");
    return saved;
  }, []);

  const handleTestAccountConnection = useCallback(
    async (draftSession) => {
      const result = await testNexusApiConnection(draftSession);
      if (result?.mode) {
        setControlStatus(buildControlStatus(result.mode, result.details || [], result.message || ""));
      }
      return result;
    },
    [],
  );

  const handleAccountGateSubmit = useCallback(
    async (loginDraft) => {
      const result = await loginNexusCodeSession(loginDraft);
      if (result?.mode) {
        setControlStatus(buildControlStatus(result.mode, result.details || [], result.message || ""));
      }
      if (!result?.ok) {
        return result;
      }
      const saved = saveNexusAccountSession(result.session);
      setAccountSession(saved);
      setReleaseState({
        releaseId: null,
        compatible: true,
        reasons: [],
      });
      setViewGuardState({
        checking: true,
        blocked: false,
        reason: null,
        requiredTier: null,
      });
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

    if (!strictAccountReady) {
      setControlStatus(buildControlStatus(
        "limited",
        ["account:SESSION_REQUIRED"],
        "Nexus Code wartet auf Login oder lokalen Workspace.",
      ));
      setReleaseState({
        releaseId: null,
        compatible: true,
        reasons: [],
      });
      setViewGuardState({
        checking: false,
        blocked: true,
        reason: "ACCOUNT_SESSION_REQUIRED",
        requiredTier: "free",
      });
      setBootProgress(100);
      setBootStage("Nexus Account erforderlich");
      setBootReady(true);
      return () => {
        active = false;
      };
    }

    if (accountSessionState.isLocal) {
      setControlStatus(buildControlStatus(
        "offline",
        ["account:LOCAL_WORKSPACE"],
        "Nexus Code nutzt lokale IDE-Daten; Cloud Features sind deaktiviert.",
      ));
      setReleaseState({
        releaseId: "local-workspace",
        compatible: true,
        reasons: [],
      });
      setViewGuardState({
        checking: false,
        blocked: false,
        reason: null,
        requiredTier: null,
      });
      void (async () => {
        setBootStep(38, "Lade lokale Editor-Module...");
        const warmupResult = await withTimeoutResult(uiWarmupPromise, preloadBudgetMs);
        if (!active) return;
        setBootStep(
          92,
          warmupResult.timedOut
            ? "Editor-Warmup laeuft im Hintergrund weiter..."
            : "Editor-Module vorgeladen",
        );
        setBootStep(100, "Lokale Workbench bereit");
        setBootReady(true);
      })();
      return () => {
        active = false;
      };
    }

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
          throw new Error(
            `CONTROL_API_BOOTSTRAP_FAILED (${failedResources.map((entry) => `${entry.resource}:${entry.errorCode}`).join(", ")})`,
          );
        }

        setBootStep(66, "Pruefe Release-Kompatibilitaet...");
        applyBundle({
          appId: NEXUS_CODE_APP_ID,
          channel: NEXUS_CODE_CHANNEL,
          catalog: catalogResult.item,
          layoutSchema: layoutResult.item,
          release: releaseResult.item,
        });
        setBootStep(72, "Validiere Editor-Zugriff...");
        const editorAccess = await runtime.control.validateViewAccess("editor", {
          forceRefresh: false,
          ...viewAccessContext,
        });
        if (!active) return;
        setViewGuardState({
          checking: false,
          blocked: !editorAccess.allowed,
          reason: editorAccess.reason || null,
          requiredTier: editorAccess.requiredTier || null,
        });
        if (!editorAccess.allowed) {
          setControlStatus(buildControlStatus(
            "limited",
            [
              ...(bootControlStatus.details || []),
              `access:${editorAccess.reason || "VIEW_VALIDATION_DENIED"}`,
            ],
            "Nexus Code bleibt gesperrt, bis der View-Zugriff erlaubt ist.",
          ));
          setBootStep(100, "Editor-Zugriff gesperrt");
          return;
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
        setControlStatus(buildControlStatus(
          "degraded",
          [reason],
          "Nexus Code startet mit lokalen Runtime-Daten; API Features bleiben eingeschraenkt.",
        ));
        setReleaseState({
          releaseId: "degraded-local-runtime",
          compatible: true,
          reasons: [reason],
        });
        setViewGuardState({
          checking: false,
          blocked: false,
          reason,
          requiredTier: "free",
        });
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

    return () => {
      active = false;
      unsubscribe();
    };
  }, [accountSessionState.isLocal, runtime, strictAccountReady, viewAccessContext]);

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

  if (!strictAccountReady || (bootReady && viewGuardState.blocked)) {
    return (
      <AccountGateScreen
        session={accountSession}
        controlStatus={controlStatus}
        viewGuardState={viewGuardState}
        onSubmit={handleAccountGateSubmit}
        onStartLocal={handleStartLocalWorkspace}
        onClear={handleClearAccountSession}
      />
    );
  }

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
                <Editor
                  accountSession={accountSession}
                  controlStatus={controlStatus}
                  onSaveAccountSession={handleSaveAccountSession}
                  onClearAccountSession={handleClearAccountSession}
                  onTestAccountConnection={handleTestAccountConnection}
                />
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
