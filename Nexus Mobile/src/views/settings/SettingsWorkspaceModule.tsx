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
  return (
    <>
              <>
                <ModuleCard title="Onboarding">
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

                <ModuleCard title="Spotlight" desc="Command Center Wartung">
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
                      onClick={clearSpotlight}
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

                <ModuleCard title="Terminal Workspace">
                  <button
                    onClick={clearTerminalWorkspace}
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
                    <TerminalSquare size={13} /> Terminal Verlauf & Makros
                    zurücksetzen
                  </button>
                </ModuleCard>

                <ModuleCard title="Layouts">
                  <button
                    onClick={resetDashboardLayout}
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
                </ModuleCard>
              </>
    </>
  );
}
