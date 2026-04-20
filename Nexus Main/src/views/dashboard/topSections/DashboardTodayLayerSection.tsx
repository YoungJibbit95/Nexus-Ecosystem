import React from "react";
import { motion } from "framer-motion";
import { MoreHorizontal } from "lucide-react";
import type { CaptureIntentType } from "@nexus/core";
import { Glass } from "../../../components/Glass";
import { hexToRgb } from "../../../lib/utils";
import { DashboardActionButton } from "../DashboardActionButton";

export function DashboardTodayLayerSection({
  heroMotion,
  heroFramerEase,
  t,
  rgb,
  todaySummary,
  setView,
  todayMenuOpen,
  setTodayMenuOpen,
  snoozeOverdue,
  runCaptureIntent,
  captureMenuOpen,
  setCaptureMenuOpen,
  activeWorkspace,
  workspaceRoot,
  lastSyncLabel,
}: {
  heroMotion: any;
  heroFramerEase: any;
  t: any;
  rgb: string;
  todaySummary: any;
  setView?: (v: string) => void;
  todayMenuOpen: boolean;
  setTodayMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
  snoozeOverdue: (minutes: number) => void;
  runCaptureIntent: (type: CaptureIntentType) => void;
  captureMenuOpen: boolean;
  setCaptureMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
  activeWorkspace: any;
  workspaceRoot: string;
  lastSyncLabel: string;
}) {
  return (
    <motion.div
      initial={heroMotion.allowEntry ? { opacity: 0, y: 10 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: Math.max(0.14, heroMotion.timings.materialMs / 1000),
        delay: heroMotion.timings.materialDelayMs / 1000,
        ease: heroFramerEase,
      }}
      style={{ marginBottom: 16, position: "relative", zIndex: 24 }}
    >
      <Glass
        gradient
        style={{
          padding: "14px 16px",
          overflow: "visible",
          position: "relative",
          zIndex: 24,
          background: `linear-gradient(145deg, rgba(${rgb},0.34), rgba(${hexToRgb(t.accent2)},0.22) 58%, rgba(255,255,255,0.03))`,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            <span style={{ fontSize: 12, fontWeight: 800, color: t.accent }}>
              Today Layer
            </span>
            <span style={{ fontSize: 11, opacity: 0.72 }}>
              Open Tasks: <b>{todaySummary.openTaskCount}</b>
            </span>
            <span style={{ fontSize: 11, opacity: 0.72 }}>
              Due Today: <b>{todaySummary.dueTodayCount}</b>
            </span>
            <span
              style={{
                fontSize: 11,
                opacity: 0.72,
                color: todaySummary.overdueCount > 0 ? "#ff453a" : "inherit",
              }}
            >
              Overdue: <b>{todaySummary.overdueCount}</b>
            </span>
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <DashboardActionButton
              onClick={() => setView?.("tasks")}
              liquidColor="#ff9f0a"
              style={{
                padding: "6px 10px",
                borderRadius: 8,
                border: "1px solid rgba(255,255,255,0.14)",
                background: "rgba(255,255,255,0.06)",
                color: "inherit",
                cursor: "pointer",
                fontSize: 11,
                fontWeight: 700,
              }}
            >
              Tasks
            </DashboardActionButton>
            <DashboardActionButton
              onClick={() => setView?.("reminders")}
              liquidColor={t.accent}
              style={{
                padding: "6px 10px",
                borderRadius: 8,
                border: `1px solid rgba(${rgb},0.25)`,
                background: `rgba(${rgb},0.12)`,
                color: t.accent,
                cursor: "pointer",
                fontSize: 11,
                fontWeight: 700,
              }}
            >
              Reminders
            </DashboardActionButton>
            <div style={{ position: "relative" }}>
              <DashboardActionButton
                onClick={() => setTodayMenuOpen((open) => !open)}
                liquidColor={todayMenuOpen ? t.accent : t.accent2}
                style={{
                  padding: "6px 8px",
                  borderRadius: 8,
                  border: "1px solid rgba(255,255,255,0.14)",
                  background: todayMenuOpen
                    ? `rgba(${rgb},0.12)`
                    : "rgba(255,255,255,0.06)",
                  color: todayMenuOpen ? t.accent : "inherit",
                  cursor: "pointer",
                  fontSize: 11,
                  fontWeight: 700,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                }}
              >
                Mehr <MoreHorizontal size={12} />
              </DashboardActionButton>
              {todayMenuOpen ? (
                <div
                  style={{
                    position: "absolute",
                    top: "calc(100% + 6px)",
                    right: 0,
                    zIndex: 60,
                    minWidth: 190,
                    borderRadius: 10,
                    border: "1px solid rgba(255,255,255,0.12)",
                    background: "rgba(17,20,31,0.96)",
                    backdropFilter: "blur(12px)",
                    padding: 6,
                    boxShadow: "0 14px 38px rgba(0,0,0,0.35)",
                  }}
                >
                  <DashboardActionButton
                    onClick={() => {
                      snoozeOverdue(15);
                      setTodayMenuOpen(false);
                    }}
                    liquidColor="#ff9f0a"
                    style={todayMenuButtonStyle}
                  >
                    Snooze Overdue +15m
                  </DashboardActionButton>
                  <DashboardActionButton
                    onClick={() => {
                      snoozeOverdue(60);
                      setTodayMenuOpen(false);
                    }}
                    liquidColor="#ff9f0a"
                    style={todayMenuButtonStyle}
                  >
                    Snooze Overdue +1h
                  </DashboardActionButton>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            marginTop: 12,
            flexWrap: "wrap",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            <span
              style={{
                fontSize: 10,
                opacity: 0.56,
                textTransform: "uppercase",
                letterSpacing: 0.6,
              }}
            >
              Quick Capture
            </span>
            <DashboardActionButton
              onClick={() => runCaptureIntent("note")}
              liquidColor={t.accent}
              style={{
                padding: "5px 10px",
                borderRadius: 999,
                border: `1px solid rgba(${rgb},0.24)`,
                background: `rgba(${rgb},0.14)`,
                color: t.accent,
                cursor: "pointer",
                fontSize: 10,
                fontWeight: 800,
              }}
            >
              + Note
            </DashboardActionButton>
            <DashboardActionButton
              onClick={() => runCaptureIntent("task")}
              liquidColor="#ff9f0a"
              style={{
                padding: "5px 10px",
                borderRadius: 999,
                border: "1px solid rgba(255,159,10,0.28)",
                background: "rgba(255,159,10,0.14)",
                color: "#ff9f0a",
                cursor: "pointer",
                fontSize: 10,
                fontWeight: 800,
              }}
            >
              + Task
            </DashboardActionButton>
            <DashboardActionButton
              onClick={() => runCaptureIntent("reminder")}
              liquidColor="#ff453a"
              style={{
                padding: "5px 10px",
                borderRadius: 999,
                border: "1px solid rgba(255,69,58,0.3)",
                background: "rgba(255,69,58,0.13)",
                color: "#ff453a",
                cursor: "pointer",
                fontSize: 10,
                fontWeight: 800,
              }}
            >
              + Reminder
            </DashboardActionButton>
            <div style={{ position: "relative" }}>
              <DashboardActionButton
                onClick={() => setCaptureMenuOpen((open) => !open)}
                liquidColor={captureMenuOpen ? t.accent : t.accent2}
                style={{
                  padding: "5px 9px",
                  borderRadius: 999,
                  border: "1px solid rgba(255,255,255,0.14)",
                  background: captureMenuOpen
                    ? `rgba(${rgb},0.12)`
                    : "rgba(255,255,255,0.05)",
                  color: captureMenuOpen ? t.accent : "inherit",
                  cursor: "pointer",
                  fontSize: 10,
                  fontWeight: 700,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                Mehr <MoreHorizontal size={11} />
              </DashboardActionButton>
              {captureMenuOpen ? (
                <div
                  style={{
                    position: "absolute",
                    top: "calc(100% + 6px)",
                    left: 0,
                    zIndex: 60,
                    minWidth: 170,
                    borderRadius: 10,
                    border: "1px solid rgba(255,255,255,0.12)",
                    background: "rgba(17,20,31,0.96)",
                    backdropFilter: "blur(12px)",
                    padding: 6,
                    boxShadow: "0 14px 38px rgba(0,0,0,0.35)",
                  }}
                >
                  {(
                    [
                      { type: "code", label: "Code" },
                      { type: "canvas", label: "Canvas" },
                    ] as Array<{ type: CaptureIntentType; label: string }>
                  ).map((entry) => (
                    <DashboardActionButton
                      key={entry.type}
                      onClick={() => {
                        runCaptureIntent(entry.type);
                        setCaptureMenuOpen(false);
                      }}
                      liquidColor={
                        entry.type === "task"
                          ? "#ff9f0a"
                          : entry.type === "reminder"
                            ? "#ff453a"
                            : entry.type === "code"
                              ? "#30d158"
                              : "#64d2ff"
                      }
                      style={captureMenuButtonStyle}
                    >
                      + {entry.label}
                    </DashboardActionButton>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            <span
              style={{
                fontSize: 10,
                opacity: 0.56,
                textTransform: "uppercase",
                letterSpacing: 0.6,
              }}
            >
              Workspace
            </span>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: activeWorkspace?.color || t.accent,
              }}
            >
              {activeWorkspace ? `${activeWorkspace.icon} ${activeWorkspace.name}` : "Global"}
            </span>
            <span
              style={{
                fontSize: 10,
                opacity: 0.58,
                maxWidth: 320,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {workspaceRoot ? `Root: ${workspaceRoot}` : "Root: nicht gesetzt"} ·{" "}
              {lastSyncLabel}
            </span>
          </div>
        </div>
      </Glass>
    </motion.div>
  );
}

const todayMenuButtonStyle: React.CSSProperties = {
  width: "100%",
  border: "none",
  borderRadius: 8,
  background: "transparent",
  color: "#ff9f0a",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "8px 10px",
  fontSize: 12,
  fontWeight: 650,
};

const captureMenuButtonStyle: React.CSSProperties = {
  width: "100%",
  border: "none",
  borderRadius: 8,
  background: "transparent",
  color: "inherit",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "8px 10px",
  fontSize: 12,
  fontWeight: 650,
};
