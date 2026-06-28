import React, { useMemo, useState } from "react";
import { AnimatePresence } from "framer-motion";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Bell,
  CheckSquare,
  Eye,
  FolderOpen,
  LayoutDashboard,
} from "lucide-react";
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
import { DashboardActionButton } from "./dashboard/DashboardActionButton";
import { asObjectArray } from "./dashboard/dashboardViewUtils";
import { buildDashboardWidgetContent } from "./dashboard/widgetContent";
import { useDashboardLayoutEditing } from "./dashboard/useDashboardLayoutEditing";
import { useDashboardDerivedData } from "./dashboard/useDashboardDerivedData";

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
<<<<<<< HEAD
=======
  const blockedTasks = useMemo(
    () =>
      tasks.filter((task) =>
        String(task.status || "")
          .toLowerCase()
          .includes("block"),
      ).length,
    [tasks],
  );
  const activeCanvas = useMemo(
    () =>
      canvases.find((canvas) => canvas.id === activeCanvasId)
      || canvases
        .slice()
        .sort(
          (a, b) =>
            new Date(b.updated || b.created || 0).getTime()
            - new Date(a.updated || a.created || 0).getTime(),
        )[0],
    [activeCanvasId, canvases],
  );
  const activeCanvasNodeCount = Array.isArray(activeCanvas?.nodes)
    ? activeCanvas.nodes.length
    : 0;

  const totalDashboardItems =
    notes.length + tasks.length + codes.length + reminders.length + canvases.length;

  const dashboardQuality = useMemo(() => {
    return calculateNexusViewQuality({
      totalItems: totalDashboardItems,
      visibleItems: visibleWidgets.length,
      overdueItems: overdueReminders,
      blockedItems: blockedTasks,
      workspaceReady: Boolean(activeWorkspace || workspaceRoot),
      synced: Boolean(lastSyncLabel),
    });
  }, [
    activeWorkspace,
    blockedTasks,
    lastSyncLabel,
    overdueReminders,
    totalDashboardItems,
    visibleWidgets.length,
    workspaceRoot,
  ]);

  const handleDashboardQualityAction = (action: string) => {
    const actionLabel = action.toLowerCase();
    if (actionLabel.includes("ueberfaellig")) {
      setView?.("reminders");
      return;
    }
    if (actionLabel.includes("block")) {
      setView?.("tasks");
      return;
    }
    if (actionLabel.includes("workspace") || actionLabel.includes("sync")) {
      setView?.("files");
      return;
    }
    if (actionLabel.includes("filter")) {
      resetLayout();
      return;
    }
    setEditLayout(true);
  };

>>>>>>> 04ddd4b79c332ffc5e621dc5fdeeed1214eea803
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

  const dashboardAttentionCount =
    overdueReminders + blockedTasks + (widgetContentBuildError ? 1 : 0);
  const dashboardSignals = [
    {
      id: "content",
      icon: Activity,
      label: "Content",
      value: totalDashboardItems,
      tone: t.accent,
    },
    {
      id: "widgets",
      icon: LayoutDashboard,
      label: "Widgets",
      value: `${visibleWidgets.length}/${visibleWidgets.length + hiddenWidgets.length}`,
      tone: t.accent2,
    },
    {
      id: "hidden",
      icon: Eye,
      label: "Hidden",
      value: hiddenWidgets.length,
      tone: hiddenWidgets.length > 0 ? "#ffcc00" : "#30d158",
    },
    {
      id: "attention",
      icon: AlertTriangle,
      label: "Attention",
      value: dashboardAttentionCount,
      tone: dashboardAttentionCount > 0 ? "#ff9f0a" : "#30d158",
    },
  ];

  const dashboardQualityActions = dashboardQuality.actions.slice(0, 2);

  const dashboardQualityStyle = {
    "--nx-dashboard-accent": t.accent,
    "--nx-dashboard-accent-rgb": rgb,
  } as React.CSSProperties;
  const dashboardPriorityCards = [
    {
      id: "overdue",
      icon: Bell,
      label: "Reminder",
      value: overdueReminders > 0 ? `${overdueReminders} overdue` : "Clear",
      detail: overdueReminders > 0 ? "Faellige Reminder zuerst klaeren" : "Keine ueberfaelligen Reminder",
      tone: overdueReminders > 0 ? "#ff9f0a" : "#30d158",
      action: () => setView?.("reminders"),
      urgent: overdueReminders > 0,
    },
    {
      id: "blocked",
      icon: CheckSquare,
      label: "Tasks",
      value: blockedTasks > 0 ? `${blockedTasks} blocked` : `${pendingTasks} open`,
      detail: blockedTasks > 0 ? "Blocker im Task Board pruefen" : "Naechsten offenen Task aufnehmen",
      tone: blockedTasks > 0 ? "#ff453a" : t.accent,
      action: () => setView?.("tasks"),
      urgent: blockedTasks > 0,
    },
    {
      id: "workspace",
      icon: FolderOpen,
      label: "Workspace",
      value: activeWorkspace?.name || workspaceRoot || "Not set",
      detail: lastSyncLabel ? `Sync ${lastSyncLabel}` : "Workspace verbinden oder neu scannen",
      tone: activeWorkspace || workspaceRoot ? t.accent2 : "#ff9f0a",
      action: () => setView?.("files"),
      urgent: !activeWorkspace && !workspaceRoot,
    },
    {
      id: "canvas",
      icon: LayoutDashboard,
      label: "Canvas",
      value: activeCanvas ? `${activeCanvasNodeCount} nodes` : "Start",
      detail: activeCanvas?.name || "Visuellen Arbeitskontext anlegen",
      tone: t.accent,
      action: () => setView?.("canvas"),
      urgent: false,
    },
  ];

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

<<<<<<< HEAD
=======
        <section
          className="nx-dashboard-priority-rail"
          aria-label="Dashboard priorities"
          style={dashboardQualityStyle}
        >
          {dashboardPriorityCards.map((card) => {
            const Icon = card.icon;
            return (
              <DashboardActionButton
                key={card.id}
                className="nx-dashboard-priority-card"
                onClick={card.action}
                liquidColor={card.tone}
                style={
                  {
                    "--nx-dashboard-priority": card.tone,
                  } as React.CSSProperties
                }
              >
                <span className="nx-dashboard-priority-icon">
                  <Icon size={15} />
                </span>
                <span className="nx-dashboard-priority-copy">
                  <span className="nx-dashboard-priority-label">
                    {card.label}
                  </span>
                  <strong>{card.value}</strong>
                  <span>{card.detail}</span>
                </span>
                <span
                  className="nx-dashboard-priority-state"
                  data-urgent={card.urgent ? "true" : "false"}
                >
                  {card.urgent ? "Fix" : "Open"}
                  <ArrowRight size={12} />
                </span>
              </DashboardActionButton>
            );
          })}
        </section>

        <div
          className="nx-view-quality-strip nx-dashboard-quality-strip"
          style={dashboardQualityStyle}
        >
          <div className="nx-dashboard-quality-main">
            <span className={`nx-view-quality-badge nx-view-quality-badge--${dashboardQuality.tone}`} style={{ fontSize: 10, fontWeight: 800 }}>
              {dashboardQuality.score}% {dashboardQuality.label}
            </span>
            <span className="nx-dashboard-quality-summary">
              {dashboardQuality.summary}
            </span>
          </div>
          <div className="nx-dashboard-signal-grid">
            {dashboardSignals.map((signal) => {
              const Icon = signal.icon;
              return (
                <span
                  className="nx-dashboard-signal"
                  key={signal.id}
                  style={{ "--nx-dashboard-signal": signal.tone } as React.CSSProperties}
                >
                  <Icon size={12} />
                  <span>{signal.label}</span>
                  <b>{signal.value}</b>
                </span>
              );
            })}
          </div>
          <div className="nx-view-quality-metrics nx-dashboard-quality-actions">
            {dashboardQuality.metrics.slice(0, 3).map((metric) => (
              <span className="nx-dashboard-quality-metric" key={metric.id}>
                {metric.label}: <b>{metric.value}</b>
              </span>
            ))}
            {dashboardQualityActions.map((action) => (
              <DashboardActionButton
                className="nx-dashboard-quality-button"
                key={action}
                onClick={() => handleDashboardQualityAction(action)}
                liquidColor={t.accent}
              >
                <AlertTriangle size={11} />
                {action}
              </DashboardActionButton>
            ))}
            <DashboardActionButton
              className="nx-dashboard-quality-button"
              onClick={() => setEditLayout((value) => !value)}
              liquidColor={editLayout ? t.accent : t.accent2}
            >
              <LayoutDashboard size={11} />
              {editLayout ? "Editing" : "Layout"}
            </DashboardActionButton>
          </div>
        </div>
>>>>>>> 04ddd4b79c332ffc5e621dc5fdeeed1214eea803
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
