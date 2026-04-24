import React, { Suspense } from "react";
import type { View } from "../components/Sidebar";
import { ViewErrorBoundary } from "../components/ViewErrorBoundary";
import {
  CanvasView,
  CodeView,
  DashboardView,
  DevToolsView,
  FilesView,
  FluxView,
  InfoView,
  NotesView,
  RenderDiagnosticsView,
  RemindersView,
  SettingsView,
  TasksView,
} from "./viewPreload";

type Props = {
  view: View;
  mountedViews: View[];
  availableViews: View[];
  reducedMotion: boolean;
  onRequestViewChange: (viewId: View | string) => void;
};

const isLikelyIOSWebkit = () => {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  const isiOSDevice = /iPad|iPhone|iPod/.test(ua);
  const iPadDesktopMode =
    navigator.platform === "MacIntel" && Number(navigator.maxTouchPoints || 0) > 1;
  return isiOSDevice || iPadDesktopMode;
};

const mergeUniqueViews = (...groups: View[][]): View[] => {
  const ordered = groups.flat();
  const seen = new Set<View>();
  const result: View[] = [];
  for (const viewId of ordered) {
    if (seen.has(viewId)) continue;
    seen.add(viewId);
    result.push(viewId);
  }
  return result;
};

const resetDashboardViewState = () => {
  try {
    localStorage.removeItem("nx-dashboard-layout-v3");
    localStorage.removeItem("nx-dashboard-layout-v2");
  } catch {}
};

const withViewBoundary = (
  viewId: View,
  node: React.ReactNode,
  opts?: { withDashboardReset?: boolean },
) => (
  <ViewErrorBoundary
    viewId={viewId}
    onReset={opts?.withDashboardReset ? resetDashboardViewState : undefined}
  >
    {node}
  </ViewErrorBoundary>
);

const renderActiveView = (
  viewId: View,
  onRequestViewChange: (viewId: View | string) => void,
): React.ReactNode => {
  switch (viewId) {
    case "dashboard":
      return withViewBoundary(
        "dashboard",
        <DashboardView
          setView={(nextView: string) => {
            onRequestViewChange(nextView);
          }}
        />,
        { withDashboardReset: true },
      );
    case "notes":
      return withViewBoundary("notes", <NotesView />);
    case "code":
      return withViewBoundary("code", <CodeView />);
    case "tasks":
      return withViewBoundary(
        "tasks",
        <TasksView
          setView={(nextView: string) => {
            onRequestViewChange(nextView);
          }}
        />,
      );
    case "reminders":
      return withViewBoundary(
        "reminders",
        <RemindersView
          setView={(nextView: string) => {
            onRequestViewChange(nextView);
          }}
        />,
      );
    case "canvas":
      return withViewBoundary("canvas", <CanvasView />);
    case "files":
      return withViewBoundary(
        "files",
        <FilesView
          setView={(nextView: string) => {
            onRequestViewChange(nextView);
          }}
        />,
      );
    case "flux":
      return withViewBoundary(
        "flux",
        <FluxView
          setView={(nextView: string) => {
            onRequestViewChange(nextView);
          }}
        />,
      );
    case "settings":
      return withViewBoundary("settings", <SettingsView />);
    case "info":
      return withViewBoundary("info", <InfoView />);
    case "devtools":
      return withViewBoundary("devtools", <DevToolsView />);
    case "diagnostics":
      if ((import.meta as any).env?.DEV) {
        return withViewBoundary("diagnostics", <RenderDiagnosticsView />);
      }
      return withViewBoundary(
        "dashboard",
        <DashboardView
          setView={(nextView: string) => {
            onRequestViewChange(nextView);
          }}
        />,
        { withDashboardReset: true },
      );
    default:
      return withViewBoundary(
        "dashboard",
        <DashboardView
          setView={(nextView: string) => {
            onRequestViewChange(nextView);
          }}
        />,
        { withDashboardReset: true },
      );
  }
};

export function MobileViewHost({
  view,
  mountedViews,
  availableViews,
  reducedMotion,
  onRequestViewChange,
}: Props) {
  const prefersStaticLayering = isLikelyIOSWebkit();
  const useSingleActiveLayer = prefersStaticLayering && reducedMotion;
  const allowViewEnterAnimation = !reducedMotion && !useSingleActiveLayer;
  const renderedViews = useSingleActiveLayer
    ? [view]
    : mergeUniqueViews(
        [view],
        mountedViews.filter((entry) => availableViews.includes(entry)),
      );

  return (
    <div
      className="nx-mobile-view-host"
      style={{
        position: "relative",
        height: "100%",
        minHeight: 0,
        width: "100%",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {renderedViews.map((viewId) => (
        <div
          key={viewId}
          className="nx-mobile-view-layer"
          style={
            useSingleActiveLayer
              ? {
                  position: "relative",
                  width: "100%",
                  height: "100%",
                  minHeight: 0,
                  display: "flex",
                  flexDirection: "column",
                  overflow: "hidden",
                }
              : {
                  position: "absolute",
                  inset: 0,
                  width: "100%",
                  height: "100%",
                  minHeight: 0,
                  overflow: "hidden",
                  pointerEvents: viewId === view ? "auto" : "none",
                  zIndex: viewId === view ? 2 : 1,
                  display: viewId === view ? "flex" : "none",
                  flexDirection: "column",
                  animation:
                    viewId === view && allowViewEnterAnimation
                      ? "nx-view-enter calc(var(--nx-motion-regular, 210ms) + 70ms) cubic-bezier(0.22, 1, 0.36, 1) both"
                      : undefined,
                }
          }
        >
          <Suspense
            fallback={
              viewId === view ? (
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
              ) : null
            }
          >
            <div
              className="nx-mobile-view-content"
              style={{
                display: "flex",
                flexDirection: "column",
                height: "100%",
                minHeight: 0,
                overflow: "hidden",
              }}
            >
              <div
                className="nx-mobile-view-root"
                style={{
                  flex: 1,
                  minHeight: 0,
                  overflow: "hidden",
                  position: "relative",
                }}
              >
                {renderActiveView(viewId, onRequestViewChange)}
              </div>
            </div>
          </Suspense>
        </div>
      ))}
    </div>
  );
}
