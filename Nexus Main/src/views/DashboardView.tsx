import React, { useMemo, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { useApp } from "../store/appStore";
import { shallow } from 'zustand/shallow';
import { useActiveViewCommandScope } from '../app/ViewCommandScope';
import { useTheme } from "../store/themeStore";
import { hexToRgb } from "../lib/utils";
import { useRenderSurfaceBudget } from "../render/useRenderSurfaceBudget";
import { useSurfaceMotionRuntime } from "../render/useSurfaceMotionRuntime";
import { SNAP_ROW_HEIGHT } from "./dashboard/dashboardLayout";
import { DashboardOverview } from "./product/DashboardOverview";
import { DashboardWidgetGridSection } from "./dashboard/DashboardWidgetGridSection";
import { DashboardEditActionBar } from "./dashboard/DashboardEditActionBar";
import { asObjectArray } from "./dashboard/dashboardViewUtils";
import { buildDashboardWidgetContent } from "./dashboard/widgetContent";
import { useDashboardLayoutEditing } from "./dashboard/useDashboardLayoutEditing";
import { useDashboardDerivedData } from "./dashboard/useDashboardDerivedData";
import "./dashboard/dashboard.css";

export function DashboardView({ setView }: { setView?: (v: string) => void }) {
  const t = useTheme();
  const active = useActiveViewCommandScope();
  const {
    notes: rawNotes,
    tasks: rawTasks,
    codes: rawCodes,
    reminders: rawReminders,
    activities: rawActivities,
  } = useApp(state => ({
    notes: state.notes, tasks: state.tasks, codes: state.codes,
    reminders: state.reminders, activities: state.activities,
  }), shallow);
  const notes = asObjectArray<any>(rawNotes);
  const tasks = asObjectArray<any>(rawTasks);
  const codes = asObjectArray<any>(rawCodes);
  const reminders = asObjectArray<any>(rawReminders);
  const activities = asObjectArray<any>(rawActivities);
  const rgb = hexToRgb(t.accent);

  const [editLayout, setEditLayout] = useState(false);

  const {
    gridRef,
    layoutLocked,
    setLayoutLocked,
    layoutHistory,
    layoutFuture,
    presetMenuOpen,
    setPresetMenuOpen,
    dragState,
    hoverWidgetId,
    setHoverWidgetId,
    visibleWidgets,
    hiddenWidgets,
    draggedWidget,
    dropCell,
    dragWidgetId,
    beginPointerDrag,
    setSpan,
    toggleWidget,
    resetLayout,
    undoLayoutChange,
    redoLayoutChange,
    applyLayoutPreset,
  } = useDashboardLayoutEditing(editLayout);

  const contentRenderDecision = useRenderSurfaceBudget({
    id: "dashboard-content",
    surfaceClass: "panel-surface",
    effectClass: "backdrop",
    interactionState: "idle",
    visibilityState: active ? 'visible' : 'hidden',
    budgetPriority: "normal",
    areaHint: 980,
    motionClassHint: "content",
    transformOwnerHint: "surface",
    filterOwnerHint: "surface",
    opacityOwnerHint: "surface",
  });

  const contentSurfaceMotion = useSurfaceMotionRuntime(contentRenderDecision, {
    family: "content",
  });

  const reducedMotion =
    Boolean(t.qol?.reducedMotion) ||
    contentSurfaceMotion.capability === "static-safe" ||
    contentSurfaceMotion.complexity === "none";

  const contentMotion = useMemo(
    () => ({
      allowEntry: contentSurfaceMotion.allowEntry && !reducedMotion,
      allowHover: contentSurfaceMotion.allowHover && !reducedMotion,
      allowStagger: contentSurfaceMotion.allowStagger && !reducedMotion,
      hoverLiftPx: Math.max(0.6, contentSurfaceMotion.hoverLiftPx),
      hoverScale: Math.max(1.002, contentSurfaceMotion.hoverScale),
      transition: contentSurfaceMotion.transition,
      timings: {
        transformMs: Math.max(150, contentSurfaceMotion.timings.transformMs),
        materialMs: Math.max(136, contentSurfaceMotion.timings.materialMs),
        materialDelayMs: reducedMotion
          ? 0
          : Math.max(10, contentSurfaceMotion.timings.materialDelayMs),
        easing: contentSurfaceMotion.timings.easing,
        framerEase: contentSurfaceMotion.timings.framerEase,
      },
    }),
    [contentSurfaceMotion, reducedMotion],
  );

  const widgetEntryDelayMs = contentMotion.allowStagger ? 24 : 12;
  const contentFramerEase = contentMotion.timings.framerEase;

  const {
    doneTasks, pendingTasks, overdueReminders, pinnedNotes, recentActivity,
    noteSpark, taskSpark, recentNotes, urgentReminders, tasksByStatus, actIcon, actColor,
  } = useDashboardDerivedData({ notes, tasks, reminders, activities, accent: t.accent, accent2: t.accent2 });
  let widgetContent: Partial<Record<string, React.ReactNode>> = {};
  let widgetContentBuildError: string | null = null;
  try {
    widgetContent = buildDashboardWidgetContent({
      theme: t,
      setView,
      notes,
      tasks,
      reminders,
      codes,
      recentNotes,
      urgentReminders,
      recentActivity,
      noteSpark,
      taskSpark,
      pinnedNotes,
      doneTasks,
      pendingTasks,
      overdueReminders,
      tasksByStatus,
      actIcon,
      actColor,
      accentRgb: rgb,
    });
  } catch (error) {
    widgetContentBuildError =
      error instanceof Error ? error.message : String(error || "unknown");
    console.error("[Dashboard] widget content render failed", error);
  }

  return (
    <div
      className="nx-dashboard-v6 nx-release-view h-full overflow-y-auto custom-scrollbar"
      style={{ padding: "10px 14px 16px", position: "relative" }}
    >
      <div
        style={{
          maxWidth: 1440,
          margin: "0 auto",
        }}
      >
        <DashboardOverview navigate={setView} editLayout={editLayout} onEditLayout={() => setEditLayout(value => !value)} />
        {widgetContentBuildError && <div role="alert"><p>Widgets konnten nicht vollständig angezeigt werden.</p><button type="button" onClick={resetLayout}>Widget-Layout zurücksetzen</button></div>}

        <DashboardWidgetGridSection
          gridRef={gridRef}
          visibleWidgets={visibleWidgets}
          hiddenWidgets={hiddenWidgets}
          snapRowHeight={SNAP_ROW_HEIGHT}
          contentMotion={contentMotion}
          contentFramerEase={contentFramerEase}
          widgetEntryDelayMs={widgetEntryDelayMs}
          dragState={dragState as any}
          dragWidgetId={dragWidgetId}
          dropCell={dropCell}
          draggedWidget={draggedWidget}
          editLayout={editLayout}
          hoverWidgetId={hoverWidgetId}
          setHoverWidgetId={setHoverWidgetId}
          layoutLocked={layoutLocked}
          beginPointerDrag={beginPointerDrag as any}
          setSpan={setSpan}
          toggleWidget={toggleWidget}
          t={t}
          rgb={rgb}
          widgetContent={widgetContent}
          resetLayout={resetLayout}
        />
      </div>

      <AnimatePresence>
        <DashboardEditActionBar
          editLayout={editLayout}
          contentMotion={contentMotion}
          contentFramerEase={contentFramerEase}
          t={t}
          rgb={rgb}
          layoutLocked={layoutLocked}
          setLayoutLocked={setLayoutLocked}
          undoLayoutChange={undoLayoutChange}
          redoLayoutChange={redoLayoutChange}
          layoutHistoryCount={layoutHistory.length}
          layoutFutureCount={layoutFuture.length}
          presetMenuOpen={presetMenuOpen}
          setPresetMenuOpen={setPresetMenuOpen}
          applyLayoutPreset={applyLayoutPreset}
          resetLayout={resetLayout}
          setEditLayout={setEditLayout}
        />
      </AnimatePresence>
    </div>
  );
}
