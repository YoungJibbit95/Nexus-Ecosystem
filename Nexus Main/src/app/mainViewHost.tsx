import React, { Suspense } from "react";
import type { View } from "../components/Sidebar";
import { ViewErrorBoundary } from "../components/ViewErrorBoundary";
import { NexusV6ViewShell } from "./NexusV6ViewShell";
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
  onPrefetchView: (viewId: View) => void;
  onOpenWalkthrough: () => void;
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

const renderActiveView = (
  viewId: View,
  onRequestViewChange: (viewId: View | string) => void,
  onOpenWalkthrough: () => void,
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
      return withViewBoundary(
        "settings",
        <SettingsView onOpenWalkthrough={onOpenWalkthrough} />,
      );
    case "info":
      return withViewBoundary(
        "info",
        <InfoView onOpenWalkthrough={onOpenWalkthrough} />,
      );
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

export function MainViewHost({
  view,
  mountedViews,
  availableViews,
  reducedMotion,
  onRequestViewChange,
  onPrefetchView,
  onOpenWalkthrough,
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
            overflow: "hidden",
            display: viewId === view ? "block" : "none",
            pointerEvents: viewId === view ? "auto" : "none",
            animation:
              viewId === view && !reducedMotion
                ? "nx-view-enter calc(var(--nx-motion-regular, 210ms) + 70ms) cubic-bezier(0.22, 1, 0.36, 1) both"
                : undefined,
          }}
        >
          <NexusV6ViewShell
            viewId={viewId}
            availableViews={availableViews}
            active={viewId === view}
            reducedMotion={reducedMotion}
            onRequestViewChange={onRequestViewChange}
            onPrefetchView={onPrefetchView}
          >
            <Suspense
              fallback={
                viewId === view ? (
                  <div className="nx-view-loading-state">
                    <span className="nx-view-loading-dot" aria-hidden="true" />
                    Lade View...
                  </div>
                ) : null
              }
            >
              {renderActiveView(viewId, onRequestViewChange, onOpenWalkthrough)}
            </Suspense>
          </NexusV6ViewShell>
        </div>
      ))}
    </div>
  );
}
