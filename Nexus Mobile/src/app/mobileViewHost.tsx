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
  const renderedViews = mergeUniqueViews(
    [view],
    mountedViews.filter((entry) => availableViews.includes(entry)),
  );

  return (
    <div
      style={{
        position: "relative",
        height: "100%",
        minHeight: 0,
        overflow: "hidden",
      }}
    >
      {renderedViews.map((viewId) => (
        <div
          key={viewId}
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: viewId === view ? "auto" : "none",
            display: viewId === view ? "block" : "none",
            animation:
              viewId === view && !reducedMotion
                ? "nx-view-enter calc(var(--nx-motion-regular, 210ms) + 70ms) cubic-bezier(0.22, 1, 0.36, 1) both"
                : undefined,
          }}
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
            {renderActiveView(viewId, onRequestViewChange)}
          </Suspense>
        </div>
      ))}
    </div>
  );
}
