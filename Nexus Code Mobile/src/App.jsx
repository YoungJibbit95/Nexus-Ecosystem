import { useEffect, useMemo, useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import {
  HashRouter as Router,
  Route,
  Routes,
  Navigate,
  useLocation,
} from "react-router-dom";
import Editor from "./pages/Editor";
import { createNexusRuntime } from "@nexus/api";

function NexusBridge({ runtime }) {
  const location = useLocation();

  useEffect(() => {
    runtime.connection.sendNavigation(location.pathname);
    runtime.connection.syncState("code-mobile.route", location.pathname);
    runtime.performance.trackViewRender(`code-mobile:${location.pathname}`);
  }, [location.pathname, runtime]);

  return null;
}

function App() {
  const controlBaseUrl = import.meta.env?.VITE_NEXUS_CONTROL_URL || "https://nexus-api.dev";
  const controlIngestKey = import.meta.env?.VITE_NEXUS_CONTROL_INGEST_KEY;
  const viewUserId = import.meta.env?.VITE_NEXUS_USER_ID;
  const viewUsername = import.meta.env?.VITE_NEXUS_USERNAME;
  const viewUserTier = import.meta.env?.VITE_NEXUS_USER_TIER;
  const [viewAccessState, setViewAccessState] = useState({
    checking: true,
    allowed: true,
    requiredTier: null,
    reason: null,
  });
  const [releaseState, setReleaseState] = useState({
    releaseId: null,
    compatible: true,
    reasons: [],
  });

  const runtime = useMemo(
    () =>
      createNexusRuntime({
        appId: "code-mobile",
        appVersion: "1.0.0",
        control: {
          enabled: Boolean(controlBaseUrl),
          baseUrl: controlBaseUrl,
          ingestKey: controlIngestKey,
          viewValidationCacheMs: 120_000,
        },
        liveSync: {
          enabled: false,
        },
      }),
    [controlBaseUrl, controlIngestKey],
  );

  useEffect(() => {
    runtime.start();
    return () => runtime.stop();
  }, [runtime]);

  useEffect(() => {
    let active = true;
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

    void runtime
      .loadLiveBundle({ channel: "production", forceRefresh: true, cacheTtlMs: 0 })
      .then((bundle) => {
        applyBundle(bundle);
      });

    const unsubscribe = runtime.control.subscribeReleaseUpdates(
      { appId: "code-mobile", channel: "production", pollIntervalMs: 15_000 },
      (event) => {
        applyBundle(event.bundle);
      },
    );

    return () => {
      active = false;
      unsubscribe();
    };
  }, [runtime]);

  useEffect(() => {
    let active = true;

    const runValidation = async () => {
      const warmup = await runtime.control.warmupViewAccess(["editor"], {
        userId: viewUserId,
        username: viewUsername,
        userTier: viewUserTier,
        forceRefresh: true,
        concurrency: 1,
      });
      const access = warmup.resultByView.editor;
      if (!access) return;

      if (!active) return;
      setViewAccessState({
        checking: false,
        allowed: access.allowed,
        requiredTier: access.requiredTier || "paid",
        reason: access.reason || "PAYWALL_BLOCKED",
      });
    };

    setViewAccessState((prev) => ({ ...prev, checking: true }));
    void runValidation();

    return () => {
      active = false;
    };
  }, [runtime, viewUserId, viewUsername, viewUserTier]);

  if (viewAccessState.checking) {
    return (
      <div
        style={{
          width: "100%",
          minHeight: "100dvh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #03030b 0%, #121525 100%)",
          color: "#d7e6ff",
          fontFamily: "system-ui, sans-serif",
          fontWeight: 700,
        }}
      >
        Validiere View-Zugriff...
      </div>
    );
  }

  if (!viewAccessState.allowed) {
    return (
      <div
        style={{
          width: "100%",
          minHeight: "100dvh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #1b0505 0%, #0f1118 100%)",
          color: "#ffe5e2",
          fontFamily: "system-ui, sans-serif",
          padding: 18,
        }}
      >
        <div
          style={{
            maxWidth: 520,
            borderRadius: 14,
            border: "1px solid rgba(255,69,58,0.45)",
            background: "rgba(255,69,58,0.12)",
            padding: 14,
            fontSize: 13,
            lineHeight: 1.45,
          }}
        >
          <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 6 }}>
            Zugriff gesperrt
          </div>
          <div>
            Der View <code>editor</code> ist aktuell nicht in deinem Tier enthalten.
          </div>
          <div style={{ marginTop: 6 }}>
            Erforderliches Tier: <code>{viewAccessState.requiredTier || "paid"}</code>
          </div>
          <div style={{ marginTop: 6 }}>
            Reason: <code>{viewAccessState.reason || "PAYWALL_BLOCKED"}</code>
          </div>
          {releaseState.releaseId ? (
            <div style={{ marginTop: 6 }}>
              Live Release: <code>{releaseState.releaseId}</code>
            </div>
          ) : null}
        </div>
      </div>
    );
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
        <Routes>
          <Route path="/" element={<Navigate to="/editor" replace />} />
          <Route path="/editor" element={<Editor />} />
          <Route path="*" element={<Navigate to="/editor" replace />} />
        </Routes>
        <Toaster />
      </Router>
    </div>
  );
}

export default App;
