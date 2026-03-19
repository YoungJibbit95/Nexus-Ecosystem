import { useEffect, useMemo } from "react";
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
  const runtime = useMemo(
    () =>
      createNexusRuntime({
        appId: "code-mobile",
        appVersion: "1.0.0",
      }),
    [],
  );

  useEffect(() => {
    runtime.start();
    return () => runtime.stop();
  }, [runtime]);

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
