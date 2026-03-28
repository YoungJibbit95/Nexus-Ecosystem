import React, {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
  lazy,
  Suspense,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme, GLOBAL_FONTS } from "./store/themeStore";
import { useTerminal } from "./store/terminalStore";
import { Sidebar, View } from "./components/Sidebar";
import { TitleBar } from "./components/TitleBar";
import { buildBackground } from "./lib/visualUtils";
import { hexToRgb } from "./lib/utils";
import {
  applyAccessibilityFlags,
  applyGlobalFont,
  applyPanelDensity,
  applyTypographyScale,
  buildLiveViewModel,
  getFallbackViewsForApp,
  resolveLayoutProfile,
  sanitizeGlobalFont,
} from "@nexus/core";
import {
  createNexusRuntime,
  isOfflineControlErrorCode,
  type NexusLiveBundle,
  type NexusRuntime,
} from "@nexus/api";

const loadDashboardView = () => import("./views/DashboardView");
const loadNotesView = () => import("./views/NotesView");
const loadCodeView = () => import("./views/CodeView");
const loadTasksView = () => import("./views/TasksView");
const loadRemindersView = () => import("./views/RemindersView");
const loadCanvasView = () => import("./views/CanvasView");
const loadFilesView = () => import("./views/FilesView");
const loadFluxView = () => import("./views/FluxView");
const loadSettingsView = () => import("./views/SettingsView");
const loadInfoView = () => import("./views/InfoView");
const loadDevToolsView = () => import("./views/DevToolsView");
const loadNexusTerminal = () => import("./components/NexusTerminal");
const loadNexusToolbar = () => import("./components/NexusToolbar");

const DashboardView = lazy(() =>
  loadDashboardView().then((m) => ({ default: m.DashboardView })),
);
const NotesView = lazy(() =>
  loadNotesView().then((m) => ({ default: m.NotesView })),
);
const CodeView = lazy(() =>
  loadCodeView().then((m) => ({ default: m.CodeView })),
);
const TasksView = lazy(() =>
  loadTasksView().then((m) => ({ default: m.TasksView })),
);
const RemindersView = lazy(() =>
  loadRemindersView().then((m) => ({ default: m.RemindersView })),
);
const CanvasView = lazy(() =>
  loadCanvasView().then((m) => ({ default: m.CanvasView })),
);
const FilesView = lazy(() =>
  loadFilesView().then((m) => ({ default: m.FilesView })),
);
const FluxView = lazy(() =>
  loadFluxView().then((m) => ({ default: m.FluxView })),
);
const SettingsView = lazy(() =>
  loadSettingsView().then((m) => ({ default: m.SettingsView })),
);
const InfoView = lazy(() =>
  loadInfoView().then((m) => ({ default: m.InfoView })),
);
const DevToolsView = lazy(() =>
  loadDevToolsView().then((m) => ({ default: m.DevToolsView })),
);
const NexusTerminal = lazy(() =>
  loadNexusTerminal().then((m) => ({ default: m.NexusTerminal })),
);
const NexusToolbar = lazy(() =>
  loadNexusToolbar().then((m) => ({ default: m.NexusToolbar })),
);
const CONTROL_API_BASE_URL = "https://nexus-api.cloud";
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

const runIdle = (task: () => void) => {
  if (typeof window !== "undefined" && "requestIdleCallback" in window) {
    (window as any).requestIdleCallback(task, { timeout: 1_200 });
    return;
  }
  setTimeout(task, 80);
};

const VIEW_IDS = getFallbackViewsForApp("main") as View[];
const isOfflineBootstrapResourceError = (errorCodeRaw: unknown) =>
  isOfflineControlErrorCode(String(errorCodeRaw || "INVALID_PAYLOAD"));

const VIEW_CHUNK_PRELOADERS: Record<View, () => Promise<unknown>> = {
  dashboard: loadDashboardView,
  notes: loadNotesView,
  code: loadCodeView,
  tasks: loadTasksView,
  reminders: loadRemindersView,
  canvas: loadCanvasView,
  files: loadFilesView,
  flux: loadFluxView,
  settings: loadSettingsView,
  info: loadInfoView,
  devtools: loadDevToolsView,
};

const preloadMainViews = async (
  views: View[],
  options: { eagerLimit?: number } = {},
) => {
  const eagerLimit = Math.max(
    1,
    Math.min(4, Math.floor(options.eagerLimit ?? 2)),
  );
  const loaders = views
    .map((viewId) => VIEW_CHUNK_PRELOADERS[viewId])
    .filter(
      (loader): loader is () => Promise<unknown> =>
        typeof loader === "function",
    );

  const uniqueLoaders = [...new Set(loaders)];
  if (uniqueLoaders.length === 0) return;

  const eager = uniqueLoaders.slice(0, eagerLimit);
  const deferred = uniqueLoaders.slice(eagerLimit);
  await Promise.allSettled(eager.map((loader) => loader()));

  if (deferred.length > 0) {
    runIdle(() => {
      void Promise.allSettled(deferred.map((loader) => loader()));
    });
  }
  runIdle(() => {
    void Promise.allSettled([loadNexusTerminal(), loadNexusToolbar()]);
  });
};

export default function App() {
  const [view, setView] = useState<View>("dashboard");
  const [availableViews, setAvailableViews] = useState<View[]>(VIEW_IDS);
  const [bootReady, setBootReady] = useState(false);
  const [bootFailure, setBootFailure] = useState<string | null>(null);
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
  const runtimeRef = useRef<NexusRuntime | null>(null);
  const guardRequestSeq = useRef(0);
  const lowPowerMode = useMemo(() => isLowPowerDevice(), []);

  const viewAccessContext = useMemo(
    () => ({
      userId: (import.meta as any).env?.VITE_NEXUS_USER_ID as
        | string
        | undefined,
      username: (import.meta as any).env?.VITE_NEXUS_USERNAME as
        | string
        | undefined,
      userTier: (import.meta as any).env?.VITE_NEXUS_USER_TIER as
        | "free"
        | "paid"
        | undefined,
    }),
    [],
  );

  const resolveBundleViews = useCallback((bundle: NexusLiveBundle | null) => {
    if (!bundle?.catalog || !bundle.layoutSchema) return VIEW_IDS;

    const model = buildLiveViewModel({
      appId: "main",
      catalog: bundle.catalog,
      schema: bundle.layoutSchema,
    });

    const nextViews = model.views
      .map((candidate) => candidate as View)
      .filter((candidate) => VIEW_IDS.includes(candidate));

    return nextViews.length > 0 ? nextViews : VIEW_IDS;
  }, []);

  const applyLiveBundle = useCallback(
    (bundle: NexusLiveBundle | null) => {
      if (!bundle?.catalog || !bundle.layoutSchema) return;

      const nextViews = resolveBundleViews(bundle);
      setAvailableViews(nextViews);
      setView((prev) => (nextViews.includes(prev) ? prev : nextViews[0]));

      const profile = resolveLayoutProfile(bundle.layoutSchema, {
        mode: "desktop",
        density: "comfortable",
        navigation: "sidebar",
      });
      setRemoteDensity(profile.density);
      setLiveReleaseId(bundle.release?.id || null);
    },
    [resolveBundleViews],
  );

  useEffect(() => {
    const controlBaseUrl = CONTROL_API_BASE_URL;
    const controlIngestKey = (import.meta as any).env
      ?.VITE_NEXUS_CONTROL_INGEST_KEY as string | undefined;

    const runtime = createNexusRuntime({
      appId: 'main',
      appVersion: "5.0.0",
      control: {
        enabled: Boolean(controlBaseUrl),
        baseUrl: controlBaseUrl,
        ingestKey: controlIngestKey,
        sampleRate: 0.35,
        flushIntervalMs: 12_000,
        releasePollIntervalMs: 30_000,
        viewValidationFailOpen: false,
        viewValidationCacheMs: 120_000,
      },
      performance: {
        collectMemoryMs: 60_000,
        summaryIntervalMs: 60_000,
        maxMetricsPerMinute: 60,
      },
      liveSync: {
        enabled: Boolean(controlBaseUrl),
        channel: "production",
        onUpdate: (event) => {
          applyLiveBundle(event.bundle);
        },
      },
    });
    runtime.start();
    runtimeRef.current = runtime;
    let active = true;
    setBootFailure(null);

    void (async () => {
      try {
        const [catalogResult, layoutResult, releaseResult] = await Promise.all([
          runtime.control.fetchCatalog({
            appId: "main",
            channel: "production",
            forceRefresh: true,
            cacheTtlMs: 0,
          }),
          runtime.control.fetchLayoutSchema({
            appId: "main",
            channel: "production",
            forceRefresh: true,
            cacheTtlMs: 0,
          }),
          runtime.control.fetchCurrentRelease({
            appId: "main",
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

        const bundle: NexusLiveBundle | null = failedResources.length === 0
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
        const startupViews = bundle ? resolveBundleViews(bundle) : VIEW_IDS;
        if (startupViews.length === 0) {
          throw new Error("CONTROL_API_BOOTSTRAP_FAILED (NO_STARTUP_VIEWS)");
        }

        const warmup = await runtime.control.warmupViewAccess(startupViews, {
          ...viewAccessContext,
          forceRefresh: true,
          concurrency: 4,
        });
        if (!active) return;

        const allowedViews = warmup.allowedViews.filter((candidate) =>
          startupViews.includes(candidate as View),
        ) as View[];
        if (allowedViews.length === 0) {
          const reasons = startupViews
            .map((candidate) => warmup.resultByView[candidate]?.reason)
            .filter((reason): reason is string => Boolean(reason))
            .slice(0, 3);
          throw new Error(
            `VIEW_VALIDATION_BLOCKED (${reasons.join(", ") || "NO_ALLOWED_VIEWS"})`,
          );
        }

        await preloadMainViews(allowedViews, { eagerLimit: 2 });
        if (!active) return;

        setAvailableViews(startupViews);
        setView((prev) => {
          if (allowedViews.includes(prev)) return prev;
          return allowedViews[0];
        });
        setViewGuardState({
          checking: false,
          blockedView: null,
          requiredTier: null,
          reason: null,
        });
      } catch (error) {
        const reason =
          error instanceof Error && error.message
            ? error.message
            : "CONTROL_API_UNAVAILABLE";
        console.error("Nexus Main bootstrap failed", error);
        if (!active) return;
        setBootFailure(reason);
      } finally {
        if (active) setBootReady(true);
      }
    })();

    return () => {
      active = false;
      runtime.stop();
      runtimeRef.current = null;
    };
  }, [applyLiveBundle, resolveBundleViews, viewAccessContext]);

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
      if (!availableViews.includes(next)) return;
      if (next === view) return;

      const runtime = runtimeRef.current;
      if (!runtime) {
        setView(next);
        setViewGuardState((prev) => ({
          ...prev,
          blockedView: null,
          requiredTier: null,
          reason: null,
        }));
        return;
      }

      const requestId = ++guardRequestSeq.current;
      const checkingTimer = setTimeout(() => {
        if (requestId !== guardRequestSeq.current) return;
        setViewGuardState((prev) => ({ ...prev, checking: true }));
      }, 120);

      const access = await runtime.control.validateViewAccess(
        next,
        viewAccessContext,
      );
      clearTimeout(checkingTimer);
      if (requestId !== guardRequestSeq.current) return;

      if (access.allowed) {
        setView(next);
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
    },
    [availableViews, view, viewAccessContext],
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

  if (!bootReady) {
    return (
      <div
        style={{
          width: "100%",
          minHeight: "100dvh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #04050c 0%, #111628 100%)",
          color: "#d7e6ff",
          fontFamily: "system-ui, sans-serif",
          fontWeight: 700,
        }}
      >
        Initialisiere Views und Zugriffsrechte...
      </div>
    );
  }

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
            maxWidth: 660,
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
            Nexus Main wurde kontrolliert gestoppt, weil der Hosted-API-Bootflow
            nicht erfolgreich war.
          </div>
          <div style={{ marginTop: 8 }}>
            Reason: <code>{bootFailure}</code>
          </div>
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
  const sidebarHidden = (t as any).sidebarStyle === "hidden";

  const viewMap: Record<View, React.ReactNode> = {
    dashboard: (
      <DashboardView
        setView={(v: any) => {
          void requestViewChange(v);
        }}
      />
    ),
    notes: <NotesView />,
    code: <CodeView />,
    tasks: <TasksView />,
    reminders: <RemindersView />,
    canvas: <CanvasView />,
    files: <FilesView />,
    flux: <FluxView />,
    settings: <SettingsView />,
    info: <InfoView />,
    devtools: <DevToolsView />,
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
        <TitleBar />
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
              width: sidebarHidden ? 0 : t.sidebarWidth,
              flexShrink: 0,
              height: "100%",
              transition: "width 220ms cubic-bezier(0.2, 0.8, 0.2, 1)",
            }}
          >
            <Sidebar
              view={view}
              availableViews={availableViews}
              onChange={(v: any) => {
                void requestViewChange(v);
              }}
            />
          </div>
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
            {liveReleaseId ? (
              <div
                style={{
                  marginTop: 8,
                  marginLeft: "auto",
                  width: "fit-content",
                  borderRadius: 999,
                  border: `1px solid rgba(${accentRgb},0.32)`,
                  background:
                    t.mode === "dark"
                      ? "rgba(10,18,34,0.78)"
                      : "rgba(255,255,255,0.82)",
                  padding: "5px 10px",
                  fontSize: 11,
                  fontWeight: 700,
                  color: t.accent,
                  pointerEvents: "none",
                }}
              >
                Live Release: {liveReleaseId}
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
            <AnimatePresence mode="wait">
              <motion.div
                key={view}
                initial={motionPreset.initial}
                animate={motionPreset.animate}
                exit={motionPreset.exit}
                transition={{
                  duration:
                    (lowPowerMode ? 0.12 : 0.2) * (t.visual.animationSpeed || 1),
                  ease: "easeInOut",
                }}
                style={{
                  flex: 1,
                  overflow: "hidden",
                  height: "100%",
                  minHeight: 0,
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
                  {viewMap[view]}
                </Suspense>
              </motion.div>
            </AnimatePresence>
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
