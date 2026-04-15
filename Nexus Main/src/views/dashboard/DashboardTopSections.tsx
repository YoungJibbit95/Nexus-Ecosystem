import React from "react";
import { Glass } from "../../components/Glass";
import { DashboardActionButton } from "./DashboardActionButton";
import { DashboardHeaderHero } from "./topSections/DashboardHeaderHero";
import { DashboardTodayLayerSection } from "./topSections/DashboardTodayLayerSection";
import { DashboardContinueSection } from "./topSections/DashboardContinueSection";
import type { DashboardTopSectionsProps } from "./topSections/types";

export function DashboardTopSections({
  t,
  rgb,
  today,
  greeting,
  pendingTasks,
  overdueReminders,
  setView,
  editLayout,
  setEditLayout,
  heroMotion,
  heroFramerEase,
  todaySummary,
  todayMenuOpen,
  setTodayMenuOpen,
  snoozeOverdue,
  runCaptureIntent,
  captureMenuOpen,
  setCaptureMenuOpen,
  activeWorkspace,
  workspaceRoot,
  lastSyncLabel,
  contentMotion,
  contentFramerEase,
  resumeLane,
  widgetContentBuildError,
  resetLayout,
}: DashboardTopSectionsProps) {
  return (
    <>
      <DashboardHeaderHero
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
      />

      <DashboardTodayLayerSection
        heroMotion={heroMotion}
        heroFramerEase={heroFramerEase}
        t={t}
        rgb={rgb}
        todaySummary={todaySummary}
        setView={setView}
        todayMenuOpen={todayMenuOpen}
        setTodayMenuOpen={setTodayMenuOpen}
        snoozeOverdue={snoozeOverdue}
        runCaptureIntent={runCaptureIntent}
        captureMenuOpen={captureMenuOpen}
        setCaptureMenuOpen={setCaptureMenuOpen}
        activeWorkspace={activeWorkspace}
        workspaceRoot={workspaceRoot}
        lastSyncLabel={lastSyncLabel}
      />

      <DashboardContinueSection
        contentMotion={contentMotion}
        contentFramerEase={contentFramerEase}
        t={t}
        resumeLane={resumeLane}
      />

      {widgetContentBuildError ? (
        <div style={{ marginBottom: 12 }}>
          <Glass
            type="panel"
            style={{
              padding: "10px 12px",
              border: "1px solid rgba(255,69,58,0.4)",
              background: "rgba(255,69,58,0.12)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 10,
                flexWrap: "wrap",
              }}
            >
              <div style={{ fontSize: 11, fontWeight: 700, color: "#ffd6d1" }}>
                Dashboard Widgets wurden im Safe Mode geladen (Renderfehler
                erkannt).
              </div>
              <DashboardActionButton
                onClick={resetLayout}
                liquidColor={t.accent}
                style={{
                  padding: "6px 10px",
                  borderRadius: 8,
                  border: "1px solid rgba(255,255,255,0.18)",
                  background: "rgba(255,255,255,0.08)",
                  fontSize: 11,
                  fontWeight: 700,
                  color: "inherit",
                  cursor: "pointer",
                }}
              >
                Layout resetten
              </DashboardActionButton>
            </div>
            <div
              style={{
                marginTop: 6,
                fontSize: 10,
                opacity: 0.72,
                wordBreak: "break-word",
              }}
            >
              Fehler: {widgetContentBuildError}
            </div>
          </Glass>
        </div>
      ) : null}
    </>
  );
}

