import { lazy, Suspense, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import {
  HashRouter as Router,
  Navigate,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import {
  AccountGateScreen,
  BlockingGateScreen,
  BootSequenceScreen,
  EditorRouteErrorBoundary,
  EditorSuspenseFallback,
} from "./app/AppScreens.jsx";
import { useNexusCodeBoot } from "./app/useNexusCodeBoot.js";

const loadEditorPage = () => import("./pages/Editor");
const Editor = lazy(() => loadEditorPage());
const warmupCodeUiModules = () => Promise.allSettled([loadEditorPage()]);

function NexusBridge({ runtime }) {
  const location = useLocation();

  useEffect(() => {
    runtime.connection.sendNavigation(location.pathname);
    runtime.connection.syncState("code.route", location.pathname);
    runtime.performance.trackViewRender(`code:${location.pathname}`);
  }, [location.pathname, runtime]);

  return null;
}

function App() {
  const {
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
  } = useNexusCodeBoot({ warmupCodeUiModules });

  if (!strictAccountReady || (bootReady && viewGuardState.blocked)) {
    return (
      <AccountGateScreen
        session={accountSession}
        controlStatus={controlStatus}
        viewGuardState={viewGuardState}
        onSubmit={handleAccountGateSubmit}
        onClear={handleClearAccountSession}
      />
    );
  }

  if (!bootReady) {
    return <BootSequenceScreen progress={bootProgress} stage={bootStage} />;
  }

  if (!releaseState.compatible) {
    return (
      <BlockingGateScreen
        tone="warning"
        eyebrow="Release Gate"
        title="Client nicht kompatibel mit aktuellem Release"
        detail="Nexus Code rendert die Workbench erst wieder, wenn der laufende Client zum freigegebenen Release passt."
        rows={[
          ["Release", releaseState.releaseId || "unbekannt"],
          ["Gruende", (releaseState.reasons || []).join(" | ") || "N/A"],
        ]}
      />
    );
  }

  if (viewGuardState.blocked) {
    return (
      <BlockingGateScreen
        tone="warning"
        eyebrow="Account Gate"
        title="Editor-Zugriff gesperrt"
        detail="Der Account ist angemeldet, aber der Editor-View wurde durch die API nicht freigegeben."
        rows={[
          ["Grund", viewGuardState.reason || "PAYWALL_BLOCKED"],
          ["Erforderlicher Tier", viewGuardState.requiredTier || "paid"],
        ]}
      />
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
              <EditorRouteErrorBoundary resetKey={`${accountSession.authMode}:${accountSession.userId}:${accountSession.endpoint}`}>
                <Suspense fallback={<EditorSuspenseFallback />}>
                  <Editor
                    accountSession={accountSession}
                    controlStatus={controlStatus}
                    onSaveAccountSession={handleSaveAccountSession}
                    onClearAccountSession={handleClearAccountSession}
                    onTestAccountConnection={handleTestAccountConnection}
                  />
                </Suspense>
              </EditorRouteErrorBoundary>
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
