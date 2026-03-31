import { useEffect, useMemo, useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import {
  BrowserRouter as Router,
  Route,
  Routes,
  Navigate,
  useLocation,
} from "react-router-dom";
import Editor from "./pages/Editor";
import { createNexusRuntime, isOfflineControlErrorCode } from "@nexus/api";

const CONTROL_API_BASE_URL = "https://nexus-api.cloud";
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
  const [bootReady, setBootReady] = useState(false);
  const [bootProgress, setBootProgress] = useState(0);
  const [bootStage, setBootStage] = useState("Nexus Runtime wird gestartet...");
  const [bootFailure, setBootFailure] = useState(null);
  const [releaseState, setReleaseState] = useState({
    releaseId: null,
    compatible: true,
    reasons: [],
  });

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
        },
        performance: {
          collectMemoryMs: lowPowerMode ? 90_000 : 60_000,
          summaryIntervalMs: 60_000,
          maxMetricsPerMinute: lowPowerMode ? 40 : 60,
        },
        liveSync: {
          enabled: false,
        },
      }),
    [controlBaseUrl, controlIngestKey, lowPowerMode],
  );

  useEffect(() => {
    runtime.start();
    return () => runtime.stop();
  }, [runtime]);

  useEffect(() => {
    const root = document.documentElement;
    if (lowPowerMode) root.classList.add("reduce-motion");
    else root.classList.remove("reduce-motion");
    return () => root.classList.remove("reduce-motion");
  }, [lowPowerMode]);

  useEffect(() => {
    let active = true;
    setBootFailure(null);
    setBootReady(false);
    setBootProgress(8);
    setBootStage("Nexus Runtime wird gestartet...");

    const setBootStep = (progress, stage) => {
      if (!active) return;
      setBootProgress((prev) => Math.max(prev, progress));
      setBootStage(stage);
    };

    void runtime.control.reportCapabilities({
      appId: "code",
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
            appId: "code",
            channel: "production",
            forceRefresh: true,
            cacheTtlMs: 0,
          }),
          runtime.control.fetchLayoutSchema({
            appId: "code",
            channel: "production",
            forceRefresh: true,
            cacheTtlMs: 0,
          }),
          runtime.control.fetchCurrentRelease({
            appId: "code",
            channel: "production",
            forceRefresh: true,
            cacheTtlMs: 0,
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
            appId: "code",
            channel: "production",
            catalog: catalogResult.item,
            layoutSchema: layoutResult.item,
            release: releaseResult.item,
          });
        }
        setBootStep(100, "Startsequenz abgeschlossen");
      } catch (error) {
        const reason =
          error instanceof Error && error.message
            ? error.message
            : "CONTROL_API_UNAVAILABLE";
        console.error("Nexus Code bootstrap failed", error);
        if (!active) return;
        setBootFailure(reason);
      } finally {
        if (active) {
          setBootProgress(100);
          setBootReady(true);
        }
      }
    })();

    const unsubscribe = runtime.control.subscribeReleaseUpdates(
      { appId: "code", channel: "production", pollIntervalMs: 30_000 },
      (event) => {
        applyBundle(event.bundle);
      },
    );

    return () => {
      active = false;
      unsubscribe();
    };
  }, [runtime]);

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
            maxWidth: 620,
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
            Nexus Code wurde kontrolliert gestoppt, weil der Hosted-API-Bootflow
            nicht erfolgreich war.
          </div>
          <div style={{ marginTop: 8 }}>
            Reason: <code>{bootFailure}</code>
          </div>
        </div>
      </div>
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

  return (
    <Router>
      <NexusBridge runtime={runtime} />
      <Routes>
        <Route path="/" element={<Navigate to="/editor" replace />} />
        <Route path="/editor" element={<Editor />} />
        <Route path="*" element={<Navigate to="/editor" replace />} />
      </Routes>
      <Toaster />
    </Router>
  );
}

export default App;
