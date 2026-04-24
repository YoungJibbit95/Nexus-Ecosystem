import React from "react";
import {
  Command,
  LayoutGrid,
  RotateCcw,
  Sparkles,
  TerminalSquare,
} from "lucide-react";
import { ModuleCard, Row } from "./SettingsPrimitives";

type SettingsWorkspaceModuleProps = {
  onOpenWalkthrough?: () => void;
  clearSpotlight: () => void;
  clearTerminalWorkspace: () => void;
  resetDashboardLayout: () => void;
};

export function SettingsWorkspaceModule({
  onOpenWalkthrough,
  clearSpotlight,
  clearTerminalWorkspace,
  resetDashboardLayout,
}: SettingsWorkspaceModuleProps) {
  const runWithConfirm = (message: string, action: () => void) => {
    if (!window.confirm(message)) return;
    action();
  };

  return (
    <>
      <ModuleCard
        title="Onboarding"
        desc="Hilft beim Wiedereinstieg, ohne Daten zu verändern."
      >
        <div
          style={{
            marginBottom: 8,
            fontSize: 11,
            opacity: 0.7,
            lineHeight: 1.45,
          }}
        >
          Sicher: Öffnet nur den Guide, kein Reset.
        </div>
        <button
          onClick={() => onOpenWalkthrough?.()}
          style={{
            borderRadius: 11,
            border: "1px solid rgba(255,255,255,0.12)",
            background: "rgba(255,255,255,0.04)",
            padding: "10px 11px",
            cursor: "pointer",
            color: "inherit",
            fontSize: 12,
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            gap: 7,
          }}
        >
          <Sparkles size={13} /> Walkthrough erneut öffnen
        </button>
      </ModuleCard>

      <ModuleCard
        title="Support"
        desc="Direkte Wartung von Spotlight- und Command-Daten."
      >
        <div
          style={{
            marginBottom: 8,
            fontSize: 11,
            opacity: 0.7,
            lineHeight: 1.45,
          }}
        >
          Teilweise reset-relevant: Pins/Recents betreffen nur Spotlight-Historie.
        </div>
        <Row>
          <button
            onClick={() => {
              window.dispatchEvent(
                new CustomEvent("nx-open-spotlight", {
                  detail: { query: "" },
                }),
              );
            }}
            style={{
              borderRadius: 11,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(255,255,255,0.04)",
              padding: "10px 11px",
              cursor: "pointer",
              color: "inherit",
              fontSize: 12,
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              gap: 7,
            }}
          >
            <Command size={13} /> Spotlight öffnen
          </button>
          <button
            onClick={() =>
              runWithConfirm(
                "Spotlight-Pins und Recents wirklich löschen?",
                clearSpotlight,
              )
            }
            style={{
              borderRadius: 11,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(255,255,255,0.04)",
              padding: "10px 11px",
              cursor: "pointer",
              color: "inherit",
              fontSize: 12,
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              gap: 7,
            }}
          >
            <RotateCcw size={13} /> Spotlight Cache löschen
          </button>
        </Row>
      </ModuleCard>

      <ModuleCard
        title="Maintenance"
        desc="Recovery-Aktionen mit klarer Auswirkung auf Workspace-Daten."
      >
        <div
          style={{
            marginBottom: 8,
            borderRadius: 10,
            border: "1px solid rgba(255,159,10,0.34)",
            background: "rgba(255,159,10,0.08)",
            padding: "8px 10px",
            fontSize: 11,
            lineHeight: 1.45,
          }}
        >
          Achtung: Diese Aktionen setzen gespeicherte Arbeitszustände zurück.
        </div>
        <div style={{ display: "grid", gap: 8 }}>
          <button
            onClick={() =>
              runWithConfirm(
                "Terminal-Verlauf, Makros sowie Undo/Redo wirklich zurücksetzen?",
                clearTerminalWorkspace,
              )
            }
            style={{
              borderRadius: 11,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(255,255,255,0.04)",
              padding: "10px 11px",
              cursor: "pointer",
              color: "inherit",
              fontSize: 12,
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              gap: 7,
            }}
          >
            <TerminalSquare size={13} /> Terminal Verlauf & Makros zurücksetzen
          </button>
          <button
            onClick={() =>
              runWithConfirm(
                "Dashboard-Layout wirklich auf Default zurücksetzen?",
                resetDashboardLayout,
              )
            }
            style={{
              borderRadius: 11,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(255,255,255,0.04)",
              padding: "10px 11px",
              cursor: "pointer",
              color: "inherit",
              fontSize: 12,
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              gap: 7,
            }}
          >
            <LayoutGrid size={13} /> Dashboard Layout zurücksetzen
          </button>
        </div>
      </ModuleCard>
    </>
  );
}
