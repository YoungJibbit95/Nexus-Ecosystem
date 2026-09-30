import React, { useId } from "react";
import { motion } from "framer-motion";
import { ChevronDown, Plus } from "lucide-react";
import type { CaptureIntentType } from "@nexus/core";
import { Glass } from "../../../components/Glass";
import { DashboardActionButton } from "../DashboardActionButton";
import { usePlanningToday } from '../../planning/usePlanningToday';

export function DashboardTodayLayerSection({
  heroMotion,
  heroFramerEase,
  t,
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
  const detailsId = useId();
  const captureId = useId();
  const today = usePlanningToday();

  return (
    <motion.section
      className="nx-dashboard-today"
      aria-label="Heute"
      initial={heroMotion.allowEntry ? { opacity: 0, y: 10 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: Math.max(0.14, heroMotion.timings.materialMs / 1000),
        delay: heroMotion.timings.materialDelayMs / 1000,
        ease: heroFramerEase,
      }}
    >
      <Glass className="nx-dashboard-today-panel">
        <div className="nx-dashboard-today-row">
          <div className="nx-dashboard-today-summary">
            <h2>Heute</h2>
            <button className="nx-dashboard-summary-link" onClick={() => setView?.("tasks")}>
              <strong>{today.openTaskCount}</strong> offene Aufgaben heute
            </button>
            <button className="nx-dashboard-summary-link" onClick={() => setView?.("calendar")}>
              <strong>{today.commitmentCount}</strong> Verpflichtungen
            </button>
            <button className="nx-dashboard-summary-link" onClick={() => setView?.("reminders")}>
              <strong>{today.reminderCount}</strong> Erinnerungspunkte
            </button>
          </div>
          <DashboardActionButton
            className="nx-dashboard-control nx-dashboard-control-quiet"
            onClick={() => setTodayMenuOpen((open) => !open)}
            aria-expanded={todayMenuOpen}
            aria-controls={detailsId}
          >
            Details
            <ChevronDown size={14} aria-hidden="true" className={todayMenuOpen ? "nx-dashboard-chevron-open" : undefined} />
          </DashboardActionButton>
        </div>

        <div className="nx-dashboard-capture-actions" aria-label="Neu erstellen">
          <DashboardActionButton
            className="nx-dashboard-control nx-dashboard-control-primary"
            onClick={() => runCaptureIntent("note")}
            liquidColor={t.accent}
          >
            <Plus size={15} aria-hidden="true" /> Neue Notiz
          </DashboardActionButton>
          <DashboardActionButton className="nx-dashboard-control" onClick={() => runCaptureIntent("task")}>
            <Plus size={15} aria-hidden="true" /> Neuer Task
          </DashboardActionButton>
          <DashboardActionButton
            className="nx-dashboard-control nx-dashboard-control-quiet"
            onClick={() => setCaptureMenuOpen((open) => !open)}
            aria-expanded={captureMenuOpen}
            aria-controls={captureId}
          >
            Weitere
            <ChevronDown size={14} aria-hidden="true" className={captureMenuOpen ? "nx-dashboard-chevron-open" : undefined} />
          </DashboardActionButton>
          <div id={captureId} className="nx-dashboard-capture-extra" hidden={!captureMenuOpen}>
            {([
              { type: "reminder", label: "Erinnerung" },
              { type: "code", label: "Code" },
              { type: "canvas", label: "Canvas" },
            ] as Array<{ type: CaptureIntentType; label: string }>).map((entry) => (
              <DashboardActionButton
                key={entry.type}
                className="nx-dashboard-control"
                onClick={() => {
                  runCaptureIntent(entry.type);
                  setCaptureMenuOpen(false);
                }}
              >
                <Plus size={14} aria-hidden="true" /> {entry.label}
              </DashboardActionButton>
            ))}
          </div>
        </div>

        <div id={detailsId} className="nx-dashboard-details" hidden={!todayMenuOpen}>
          <dl className="nx-dashboard-workspace-details">
            <div>
              <dt>Workspace</dt>
              <dd>{activeWorkspace ? `${activeWorkspace.icon} ${activeWorkspace.name}` : "Global"}</dd>
            </div>
            <div>
              <dt>Ordner</dt>
              <dd>{workspaceRoot || "Kein Ordner verbunden"}</dd>
            </div>
            <div>
              <dt>Synchronisierung</dt>
              <dd>{lastSyncLabel}</dd>
            </div>
          </dl>
          {todaySummary.overdueReminderIds.length > 0 ? (
            <div className="nx-dashboard-snooze-actions">
              <span>Überfällige Erinnerungen verschieben</span>
              <DashboardActionButton className="nx-dashboard-control" onClick={() => snoozeOverdue(15)}>
                +15 Min.
              </DashboardActionButton>
              <DashboardActionButton className="nx-dashboard-control" onClick={() => snoozeOverdue(60)}>
                +1 Std.
              </DashboardActionButton>
            </div>
          ) : null}
        </div>
      </Glass>
    </motion.section>
  );
}
