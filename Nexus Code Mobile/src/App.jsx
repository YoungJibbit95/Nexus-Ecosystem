import { lazy, Suspense, useEffect, useMemo, useState } from "react";
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
import { installRuntimeLagProbe } from "./lib/runtimeLagProbe";
import { useGlobalTypingAnimation } from "./lib/useGlobalTypingAnimation";
import { completeCodeMobileLogout, requestCodeMobileLogout } from "./lib/sessionLogout";

const CONTROL_API_BASE_URL = "https://nexus-api.cloud";
const CODE_MOBILE_SESSION_KEY = "nx-code-mobile-session-v1";
const CODE_MOBILE_DEVICE_KEY = "nx-code-mobile-device-v1";
const CODE_MOBILE_BOOT_BLOCK_BUDGET_MS = 6_500;
const CODE_MOBILE_BOOT_BLOCK_BUDGET_LOW_POWER_MS = 8_500;
const loadEditorPage = () => import("./pages/Editor");
const Editor = lazy(() => loadEditorPage());
const warmupCodeMobileUiModules = () =>
  Promise.allSettled([
    loadEditorPage(),
  ]);
const isOfflineBootstrapResourceError = (errorCodeRaw) =>
  isOfflineControlErrorCode(String(errorCodeRaw || "INVALID_PAYLOAD"));
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

const readCodeMobileSession = () => {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(CODE_MOBILE_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const item = parsed?.item && typeof parsed.item === "object" ? parsed.item : parsed;
    if (
      typeof item?.token !== "string" ||
      !item.token.trim() ||
      !Number.isFinite(item?.expiresAt) ||
      item.expiresAt <= Date.now() + 15_000 ||
      typeof item?.user?.id !== "string" ||
      typeof item?.user?.username !== "string"
    ) {
      window.sessionStorage.removeItem(CODE_MOBILE_SESSION_KEY);
      return null;
    }
    return item;
  } catch {
    window.sessionStorage.removeItem(CODE_MOBILE_SESSION_KEY);
    return null;
  }
};

const getCodeMobileDeviceId = () => {
  if (typeof window === "undefined") return "nx-code-mobile";
  try {
    const existing = window.localStorage.getItem(CODE_MOBILE_DEVICE_KEY);
    if (existing) return existing;
    const bytes = new Uint8Array(12);
    window.crypto.getRandomValues(bytes);
    const id = `nx-code-mobile-${Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
    window.localStorage.setItem(CODE_MOBILE_DEVICE_KEY, id);
    return id;
  } catch {
    return `nx-code-mobile-${Date.now().toString(36)}`;
  }
};

const loginCodeMobile = async (identifier, password) => {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), 9_000);
  try {
    const response = await fetch(`${CONTROL_API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "X-Nexus-Device-Id": getCodeMobileDeviceId(),
        "X-Nexus-Device-Label": "Nexus Code Mobile",
      },
      body: JSON.stringify({ identifier: identifier.trim(), password }),
      signal: controller.signal,
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const details = Array.isArray(payload?.details)
        ? payload.details.join(", ")
        : typeof payload?.details === "string"
          ? payload.details
          : payload?.error;
      throw new Error(details || `Login fehlgeschlagen (HTTP ${response.status}).`);
    }
    const session = payload?.item && typeof payload.item === "object" ? payload.item : payload;
    if (!session?.token || !session?.user || !Number.isFinite(session?.expiresAt)) {
      throw new Error("Die Login-Antwort ist unvollständig.");
    }
    return session;
  } finally {
    window.clearTimeout(timeoutId);
  }
};

const logoutCodeMobile = async (token) => {
  await requestCodeMobileLogout({
    baseUrl: CONTROL_API_BASE_URL,
    token,
    deviceId: getCodeMobileDeviceId(),
  });
};

function NexusBridge({ runtime }) {
  const location = useLocation();

  useEffect(() => {
    runtime.connection.sendNavigation(location.pathname);
    runtime.connection.syncState("code-mobile.route", location.pathname);
    runtime.performance.trackViewRender(`code-mobile:${location.pathname}`);
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
        padding: 18,
      }}
    >
      <div
        style={{
          width: "min(520px, 94vw)",
          borderRadius: 18,
          border: "1px solid rgba(255,255,255,0.14)",
          background: "rgba(8,12,24,0.68)",
          backdropFilter: "blur(16px) saturate(130%)",
          WebkitBackdropFilter: "blur(16px) saturate(130%)",
          boxShadow:
            "0 24px 70px rgba(0,0,0,0.44), inset 0 1px 0 rgba(255,255,255,0.18)",
          padding: 18,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 11,
              border: "1px solid rgba(112,165,255,0.58)",
              background: "linear-gradient(135deg, rgba(112,165,255,0.34), rgba(94,92,230,0.26))",
              display: "grid",
              placeItems: "center",
              fontWeight: 900,
              fontSize: 15,
            }}
          >
            ⌘
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 800 }}>Nexus Code Mobile</div>
            <div style={{ fontSize: 10, opacity: 0.62 }}>Boot Sequence</div>
          </div>
        </div>
        <div style={{ marginTop: 12, fontSize: 12, opacity: 0.88, minHeight: 18 }}>
          {stage}
        </div>
        <div
          style={{
            marginTop: 10,
            height: 9,
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
              boxShadow: "0 0 10px rgba(112,165,255,0.72)",
              transition: "width 260ms cubic-bezier(0.2, 0.7, 0.2, 1)",
            }}
          />
        </div>
        <div style={{ marginTop: 7, fontSize: 10, opacity: 0.7 }}>
          {safeProgress}% geladen
        </div>
      </div>
    </div>
  );
}

function App() {
  const controlBaseUrl = CONTROL_API_BASE_URL;
  const [authSession, setAuthSession] = useState(readCodeMobileSession);
  const [authIdentifier, setAuthIdentifier] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authPending, setAuthPending] = useState(false);
  const [authError, setAuthError] = useState(null);
  const lowPowerMode = useMemo(() => isLowPowerDevice(), []);
  const viewAccessContext = useMemo(
    () =>
      resolveNexusControlUserContext({
        userId: authSession?.user?.id,
        username: authSession?.user?.username,
        userTier: authSession?.user?.paymentTier || authSession?.user?.requestedTier,
      }),
    [authSession],
  );
  useGlobalTypingAnimation(!lowPowerMode);
  const [bootReady, setBootReady] = useState(false);
  const [bootProgress, setBootProgress] = useState(0);
  const [bootStage, setBootStage] = useState("Nexus Runtime wird gestartet...");
  const [bootFailure, setBootFailure] = useState(null);
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

  const runtime = useMemo(
    () =>
      createNexusRuntime({
        appId: "code-mobile",
        appVersion: "1.0.0",
        control: {
          enabled: Boolean(controlBaseUrl),
          baseUrl: controlBaseUrl,
          token: authSession?.token || "",
          deviceId: getCodeMobileDeviceId(),
          deviceLabel: "Nexus Code Mobile",
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
    [authSession?.token, controlBaseUrl, lowPowerMode],
  );

  const handleLogin = async (event) => {
    event.preventDefault();
    if (authPending) return;
    setAuthPending(true);
    setAuthError(null);
    try {
      const session = await loginCodeMobile(authIdentifier, authPassword);
      window.sessionStorage.setItem(CODE_MOBILE_SESSION_KEY, JSON.stringify(session));
      setAuthSession(session);
      setAuthPassword("");
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Login fehlgeschlagen.");
    } finally {
      setAuthPending(false);
    }
  };

  const clearLogin = async () => {
    await completeCodeMobileLogout({
      revoke: () => logoutCodeMobile(authSession?.token),
      clearLocal: () => {
        window.sessionStorage.removeItem(CODE_MOBILE_SESSION_KEY);
        setAuthSession(null);
        setAuthPassword("");
        setAuthError(null);
      },
    });
  };

  useEffect(() => {
    runtime.control.setViewValidationDefaults(viewAccessContext);
    runtime.start();
    const stopLagProbe = installRuntimeLagProbe({
      enabled: import.meta.env?.VITE_NEXUS_LAG_PROBE === "1",
      onEvent: (event) => {
        const durationMs = Number(event.durationMs.toFixed(2));
        const metricFn = runtime?.performance?.recordCustomMetric;
        if (typeof metricFn === "function") {
          try {
            metricFn.call(runtime.performance, "code_mobile.ui_lag_ms", durationMs, "ms");
          } catch {
            // non-blocking diagnostics path
          }
        }
        runtime.connection.publish(
          "custom",
          {
            event: event.kind,
            appId: "code-mobile",
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
          console.warn("[Nexus Code Mobile] interaction lag detected", event);
        }
      },
    });
    return () => {
      stopLagProbe();
      runtime.stop();
    };
  }, [runtime, viewAccessContext]);

  useEffect(() => {
    const root = document.documentElement;
    if (lowPowerMode) root.classList.add("reduce-motion");
    else root.classList.remove("reduce-motion");
    return () => root.classList.remove("reduce-motion");
  }, [lowPowerMode]);

  useEffect(() => {
    let active = true;
    const bootBudgetMs = lowPowerMode
      ? CODE_MOBILE_BOOT_BLOCK_BUDGET_LOW_POWER_MS
      : CODE_MOBILE_BOOT_BLOCK_BUDGET_MS;
    const forceBootReadyTimer = window.setTimeout(() => {
      if (!active) return;
      setBootProgress(100);
      setBootStage("Schnellstart aktiv, Rest wird im Hintergrund geladen...");
      setBootReady(true);
    }, bootBudgetMs);
    setBootFailure(null);
    setBootReady(false);
    setViewGuardState({
      checking: true,
      blocked: false,
      reason: null,
      requiredTier: null,
    });
    setBootProgress(8);
    setBootStage("Nexus Runtime wird gestartet...");

    const setBootStep = (progress, stage) => {
      if (!active) return;
      setBootProgress((prev) => Math.max(prev, progress));
      setBootStage(stage);
    };

    void runtime.control.reportCapabilities({
      appId: "code-mobile",
      appVersion: "1.0.0",
      platform: "mobile",
      supports: {
        schemaVersions: ["2.0.0"],
        components: ["code-editor", "status-strip"],
        layoutProfiles: ["mobile-adaptive"],
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
            appId: "code-mobile",
            channel: "production",
            forceRefresh: false,
            cacheTtlMs: 120_000,
          }),
          runtime.control.fetchLayoutSchema({
            appId: "code-mobile",
            channel: "production",
            forceRefresh: false,
            cacheTtlMs: 120_000,
          }),
          runtime.control.fetchCurrentRelease({
            appId: "code-mobile",
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

        if (failedResources.length === 0) {
          setBootStep(66, "Pruefe Release-Kompatibilitaet...");
          applyBundle({
            appId: "code-mobile",
            channel: "production",
            catalog: catalogResult.item,
            layoutSchema: layoutResult.item,
            release: releaseResult.item,
          });
        }
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
          setBootStep(100, "Editor-Zugriff gesperrt");
          return;
        }
        setBootStep(80, "Lade Editor-Module und Runtime...");
        const warmupBudgetMs = Math.max(1_200, bootBudgetMs - 700);
        await Promise.race([
          warmupCodeMobileUiModules(),
          new Promise((resolve) => {
            window.setTimeout(resolve, warmupBudgetMs);
          }),
        ]);
        setBootStep(100, "Startsequenz abgeschlossen");
      } catch (error) {
        const reason =
          error instanceof Error && error.message
            ? error.message
            : "CONTROL_API_UNAVAILABLE";
        console.error("Nexus Code Mobile bootstrap failed", error);
        if (!active) return;
        setBootFailure(reason);
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
      { appId: "code-mobile", channel: "production", pollIntervalMs: 30_000 },
      (event) => {
        applyBundle(event.bundle);
      },
    );

    return () => {
      active = false;
      clearTimeout(forceBootReadyTimer);
      unsubscribe();
    };
  }, [runtime, lowPowerMode, viewAccessContext]);

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
          padding: 16,
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            maxWidth: 560,
            borderRadius: 14,
            border: "1px solid rgba(255,191,64,0.45)",
            background: "rgba(255,191,64,0.12)",
            padding: 14,
            fontSize: 13,
            lineHeight: 1.45,
          }}
        >
          <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 6 }}>
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
    const needsLogin = !authSession && /(HTTP_401|UNAUTHORIZED|AUTH_REQUIRED)/.test(String(viewGuardState.reason || ""));
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
          padding: 16,
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            width: "min(560px, 100%)",
            boxSizing: "border-box",
            borderRadius: 14,
            border: "1px solid rgba(255,191,64,0.45)",
            background: "rgba(255,191,64,0.12)",
            padding: 14,
            fontSize: 13,
            lineHeight: 1.45,
          }}
        >
          <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 6 }}>
            {needsLogin ? "Bei Nexus Code Mobile anmelden" : "Editor-Zugriff gesperrt"}
          </div>
          {needsLogin ? (
            <>
              <div style={{ opacity: 0.76, marginBottom: 14 }}>
                Melde dich mit deinem Nexus-Konto an. Der Token bleibt nur in dieser App-Sitzung.
              </div>
              <form onSubmit={handleLogin} style={{ display: "grid", gap: 10 }}>
                <label style={{ display: "grid", gap: 5 }}>
                  <span style={{ fontSize: 11, fontWeight: 700 }}>E-Mail oder Benutzername</span>
                  <input
                    value={authIdentifier}
                    onChange={(event) => setAuthIdentifier(event.target.value)}
                    autoComplete="username"
                    required
                    style={{ minHeight: 44, borderRadius: 10, border: "1px solid rgba(255,191,64,0.35)", background: "rgba(0,0,0,0.3)", color: "inherit", padding: "8px 10px", fontSize: 16 }}
                  />
                </label>
                <label style={{ display: "grid", gap: 5 }}>
                  <span style={{ fontSize: 11, fontWeight: 700 }}>Passwort</span>
                  <input
                    type="password"
                    value={authPassword}
                    onChange={(event) => setAuthPassword(event.target.value)}
                    autoComplete="current-password"
                    minLength={8}
                    required
                    style={{ minHeight: 44, borderRadius: 10, border: "1px solid rgba(255,191,64,0.35)", background: "rgba(0,0,0,0.3)", color: "inherit", padding: "8px 10px", fontSize: 16 }}
                  />
                </label>
                {authError ? <div role="alert" style={{ color: "#ffb4a9" }}>{authError}</div> : null}
                <button
                  type="submit"
                  disabled={authPending}
                  style={{ minHeight: 44, borderRadius: 10, border: "1px solid rgba(112,165,255,0.5)", background: "linear-gradient(135deg, #70a5ff, #5e5ce6)", color: "#07101f", fontWeight: 800, cursor: authPending ? "wait" : "pointer" }}
                >
                  {authPending ? "Anmeldung läuft …" : "Anmelden"}
                </button>
              </form>
              <a href="https://nexusproject.dev/?page=login" style={{ display: "inline-block", marginTop: 12, color: "#b9d5ff" }}>
                Noch kein Konto? Auf nexusproject.dev registrieren
              </a>
            </>
          ) : (
            <>
              <div>Grund: <code>{viewGuardState.reason || "PAYWALL_BLOCKED"}</code></div>
              <div style={{ marginTop: 6 }}>Erforderlicher Tier: <code>{viewGuardState.requiredTier || "paid"}</code></div>
              {authSession ? (
                <button type="button" onClick={clearLogin} style={{ marginTop: 14, minHeight: 42, borderRadius: 10, border: "1px solid rgba(255,255,255,0.24)", background: "rgba(255,255,255,0.08)", color: "inherit", padding: "8px 12px", fontWeight: 700 }}>
                  Mit einem anderen Konto anmelden
                </button>
              ) : null}
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        minHeight: "100dvh",
        overflow: "hidden",
        paddingTop: "env(safe-area-inset-top, 0px)",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      <Router>
        <NexusBridge runtime={runtime} />
        {bootFailure ? (
          <div
            style={{
              position: "fixed",
              top: "calc(env(safe-area-inset-top, 0px) + 8px)",
              left: "50%",
              transform: "translateX(-50%)",
              zIndex: 4000,
              borderRadius: 10,
              border: "1px solid rgba(255,69,58,0.38)",
              background: "rgba(255,69,58,0.12)",
              color: "#ffd8d2",
              padding: "8px 12px",
              fontSize: 12,
              fontWeight: 700,
              maxWidth: "min(92vw, 720px)",
            }}
          >
            API Bootstrap eingeschraenkt: {bootFailure}
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
                  <Editor onLogout={clearLogin} />
                </Suspense>
              </div>
            )}
          />
          <Route path="*" element={<Navigate to="/editor" replace />} />
        </Routes>
        <Toaster />
      </Router>
    </div>
  );
}

export default App;
