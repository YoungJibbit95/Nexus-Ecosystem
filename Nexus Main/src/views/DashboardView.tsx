import React, { useMemo, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { useApp } from "../store/appStore";
import { useCanvas } from "../store/canvasStore";
import { useTheme } from "../store/themeStore";
import { useWorkspaces } from "../store/workspaceStore";
import { useWorkspaceFs } from "../store/workspaceFsStore";
import { hexToRgb } from "../lib/utils";
import { useRenderSurfaceBudget } from "../render/useRenderSurfaceBudget";
import { useSurfaceMotionRuntime } from "../render/useSurfaceMotionRuntime";
import { SNAP_ROW_HEIGHT } from "./dashboard/dashboardLayout";
import { DashboardTopSections } from "./dashboard/DashboardTopSections";
import { DashboardWidgetGridSection } from "./dashboard/DashboardWidgetGridSection";
import { DashboardEditActionBar } from "./dashboard/DashboardEditActionBar";
import { asObjectArray } from "./dashboard/dashboardViewUtils";
import { buildDashboardWidgetContent } from "./dashboard/widgetContent";
import { useDashboardLayoutEditing } from "./dashboard/useDashboardLayoutEditing";
import { useDashboardDerivedData } from "./dashboard/useDashboardDerivedData";
import { calculateNexusViewQuality } from "@nexus/core";

export function DashboardView({ setView }: { setView?: (v: string) => void }) {
  const t = useTheme();
  const {
    notes: rawNotes,
    tasks: rawTasks,
    codes: rawCodes,
    reminders: rawReminders,
    activities: rawActivities,
    addNote,
    addTask,
    addRem,
    addCode,
    updateReminder,
  } = useApp();
  const addCanvas = useCanvas((state) => state.addCanvas);
  const canvases = useCanvas((state) => state.canvases);
  const activeCanvasId = useCanvas((state) => state.activeCanvasId);
  const { workspaces: rawWorkspaces, activeWorkspaceId } = useWorkspaces();
  const notes = asObjectArray<any>(rawNotes);
  const tasks = asObjectArray<any>(rawTasks);
  const codes = asObjectArray<any>(rawCodes);
  const reminders = asObjectArray<any>(rawReminders);
  const activities = asObjectArray<any>(rawActivities);
  const workspaces = asObjectArray<any>(rawWorkspaces);
  const workspaceRoot = useWorkspaceFs((state) => state.rootPath);
  const lastSyncAt = useWorkspaceFs((state) => state.lastSyncAt);
  const lastSyncMode = useWorkspaceFs((state) => state.lastSyncMode);
  const rgb = hexToRgb(t.accent);

  const [editLayout, setEditLayout] = useState(false);
  const [todayMenuOpen, setTodayMenuOpen] = useState(false);
  const [captureMenuOpen, setCaptureMenuOpen] = useState(false);

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

  const heroRenderDecision = useRenderSurfaceBudget({
    id: "dashboard-hero",
    surfaceClass: "hero-surface",
    effectClass: "status-highlight",
    interactionState: "idle",
    visibilityState: "visible",
    budgetPriority: "high",
    areaHint: 1200,
    motionClassHint: "hero",
    transformOwnerHint: "surface",
    filterOwnerHint: "surface",
    opacityOwnerHint: "surface",
  });

  const contentRenderDecision = useRenderSurfaceBudget({
    id: "dashboard-content",
    surfaceClass: "panel-surface",
    effectClass: "backdrop",
    interactionState: "idle",
    visibilityState: "visible",
    budgetPriority: "normal",
    areaHint: 980,
    motionClassHint: "content",
    transformOwnerHint: "surface",
    filterOwnerHint: "surface",
    opacityOwnerHint: "surface",
  });

  const heroSurfaceMotion = useSurfaceMotionRuntime(heroRenderDecision, {
    family: "hero",
  });
  const contentSurfaceMotion = useSurfaceMotionRuntime(contentRenderDecision, {
    family: "content",
  });

  const reducedMotion =
    Boolean(t.qol?.reducedMotion) ||
    heroSurfaceMotion.capability === "static-safe" ||
    contentSurfaceMotion.capability === "static-safe" ||
    heroSurfaceMotion.complexity === "none" ||
    contentSurfaceMotion.complexity === "none";

  const heroMotion = useMemo(
    () => ({
      allowEntry: heroSurfaceMotion.allowEntry && !reducedMotion,
      allowHover: heroSurfaceMotion.allowHover && !reducedMotion,
      allowStagger: heroSurfaceMotion.allowStagger && !reducedMotion,
      hoverLiftPx: Math.max(0.6, heroSurfaceMotion.hoverLiftPx),
      hoverScale: Math.max(1.002, heroSurfaceMotion.hoverScale),
      transition: heroSurfaceMotion.transition,
      timings: {
        transformMs: Math.max(160, heroSurfaceMotion.timings.regularMs),
        materialMs: Math.max(140, heroSurfaceMotion.timings.materialMs),
        materialDelayMs: reducedMotion
          ? 0
          : Math.max(16, heroSurfaceMotion.timings.materialDelayMs),
        easing: heroSurfaceMotion.timings.easing,
        framerEase: heroSurfaceMotion.timings.framerEase,
      },
    }),
    [heroSurfaceMotion, reducedMotion],
  );

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
  const heroFramerEase = heroMotion.timings.framerEase;
  const contentFramerEase = contentMotion.timings.framerEase;

  const {
    doneTasks,
    pendingTasks,
    overdueReminders,
    pinnedNotes,
    recentActivity,
    noteSpark,
    taskSpark,
    recentNotes,
    urgentReminders,
    resumeLane,
    tasksByStatus,
    greeting,
    today,
    actIcon,
    actColor,
    todaySummary,
    activeWorkspace,
    runCaptureIntent,
    snoozeOverdue,
    lastSyncLabel,
  } = useDashboardDerivedData({
    notes,
    tasks,
    codes,
    canvases,
    activeCanvasId,
    reminders,
    activities,
    workspaces,
    activeWorkspaceId,
    workspaceRoot,
    lastSyncAt,
    lastSyncMode,
    setView,
    addNote,
    addTask,
    addRem,
    addCode,
    addCanvas,
    updateReminder,
    accent: t.accent,
    accent2: t.accent2,
  });
  const dashboardQuality = useMemo(() => {
    const blockedTasks = tasks.filter((task) =>
      String(task.status || "")
        .toLowerCase()
        .includes("block"),
    ).length;
    return calculateNexusViewQuality({
      totalItems:
        notes.length +
        tasks.length +
        codes.length +
        reminders.length +
        canvases.length,
      visibleItems: visibleWidgets.length,
      overdueItems: overdueReminders,
      blockedItems: blockedTasks,
      staleItems: hiddenWidgets.length,
      workspaceReady: Boolean(activeWorkspace || workspaceRoot),
      synced: Boolean(lastSyncLabel),
    });
  }, [
    activeWorkspace,
    canvases.length,
    codes.length,
    hiddenWidgets.length,
    lastSyncLabel,
    notes.length,
    overdueReminders,
    reminders.length,
    tasks,
    visibleWidgets.length,
    workspaceRoot,
  ]);

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
        <DashboardTopSections
          t={t}
          rgb={rgb}
          today={today}
          greeting={greeting}
          pendingTasks={pendingTasks}
          overdueReminders={overdueReminders}
          setView={setView}
          editLayout={editLayout}
          setEditLayout={setEditLayout}
          heroMotion={heroMotion}
          heroFramerEase={heroFramerEase}
          todaySummary={todaySummary}
          todayMenuOpen={todayMenuOpen}
          setTodayMenuOpen={setTodayMenuOpen}
          snoozeOverdue={snoozeOverdue}
          runCaptureIntent={runCaptureIntent}
          captureMenuOpen={captureMenuOpen}
          setCaptureMenuOpen={setCaptureMenuOpen}
          activeWorkspace={activeWorkspace}
          workspaceRoot={workspaceRoot}
          lastSyncLabel={lastSyncLabel}
          contentMotion={contentMotion}
          contentFramerEase={contentFramerEase}
          resumeLane={resumeLane}
          widgetContentBuildError={widgetContentBuildError}
          resetLayout={resetLayout}
        />

        {/*<div
          className="nx-view-quality-strip nx-dashboard-quality-strip"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
            marginBottom: 12,
            padding: "9px 12px",
            borderRadius: 10,
            border: "1px solid rgba(255,255,255,0.08)",
            background: "rgba(255,255,255,0.035)",
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", minWidth: 0 }}>
            <span className={`nx-view-quality-badge nx-view-quality-badge--${dashboardQuality.tone}`} style={{ fontSize: 10, fontWeight: 800 }}>
              {dashboardQuality.score}% {dashboardQuality.label}
            </span>
            <span style={{ fontSize: 11, opacity: 0.68 }}>{dashboardQuality.summary}</span>
          </div>
          <div className="nx-view-quality-metrics" style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            {dashboardQuality.metrics.map((metric) => (
              <span key={metric.id} style={{ fontSize: 10, opacity: 0.68 }}>
                {metric.label}: <b>{metric.value}</b>
              </span>
            ))}
            {dashboardQuality.actions.slice(0, 2).map((action) => (
              <button
                key={action}
                onClick={() => setEditLayout(true)}
                style={{ padding: "4px 8px", borderRadius: 8, border: `1px solid rgba(${rgb},0.24)`, background: `rgba(${rgb},0.1)`, color: t.accent, cursor: "pointer", fontSize: 10, fontWeight: 750 }}
              >
                {action}
              </button>
            ))}
          </div>
        </div>*/}
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
