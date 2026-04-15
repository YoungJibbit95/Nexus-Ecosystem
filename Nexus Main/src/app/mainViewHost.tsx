import React, { Suspense } from "react";
import type { View } from "../components/Sidebar";
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
  onOpenWalkthrough: () => void;
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

const renderActiveView = (
  viewId: View,
  onRequestViewChange: (viewId: View | string) => void,
  onOpenWalkthrough: () => void,
): React.ReactNode => {
  switch (viewId) {
    case "dashboard":
      return (
        <DashboardView
          setView={(nextView: string) => {
            onRequestViewChange(nextView);
          }}
        />
      );
    case "notes":
      return <NotesView />;
    case "code":
      return <CodeView />;
    case "tasks":
      return <TasksView />;
    case "reminders":
      return (
        <RemindersView
          setView={(nextView: string) => {
            onRequestViewChange(nextView);
          }}
        />
      );
    case "canvas":
      return <CanvasView />;
    case "files":
      return <FilesView />;
    case "flux":
      return <FluxView />;
    case "settings":
      return <SettingsView onOpenWalkthrough={onOpenWalkthrough} />;
    case "info":
      return <InfoView onOpenWalkthrough={onOpenWalkthrough} />;
    case "devtools":
      return <DevToolsView />;
    case "diagnostics":
      if ((import.meta as any).env?.DEV) {
        return <RenderDiagnosticsView />;
      }
      return (
        <DashboardView
          setView={(nextView: string) => {
            onRequestViewChange(nextView);
          }}
        />
      );
    default:
      return (
        <DashboardView
          setView={(nextView: string) => {
            onRequestViewChange(nextView);
          }}
        />
      );
  }
};

export function MainViewHost({
  view,
  mountedViews,
  availableViews,
  reducedMotion,
  onRequestViewChange,
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
            {renderActiveView(viewId, onRequestViewChange, onOpenWalkthrough)}
          </Suspense>
        </div>
      ))}
    </div>
  );
}
