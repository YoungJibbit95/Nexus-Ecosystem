import { FileUp, PlusCircle, Type, Wand2 } from "lucide-react";
import type React from "react";

function EmptyActionButton({
  accent,
  primary = false,
  icon: Icon,
  title,
  detail,
  onClick,
}: {
  accent: string;
  primary?: boolean;
  icon: any;
  title: string;
  detail: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`${title}: ${detail}`}
      className="nx-canvas-empty-action"
      data-primary={primary ? "true" : "false"}
      style={{
        ["--nx-canvas-action-accent" as any]: accent,
      }}
    >
      <Icon aria-hidden="true" size={18} strokeWidth={2.2} />
      <span className="nx-canvas-empty-action-copy">
        <strong>{title}</strong>
        <small>{detail}</small>
      </span>
    </button>
  );
}

export function CanvasEmptyState({
  accent,
  accent2,
  rgb,
  compact = false,
  onCreateText,
  onUseTemplate,
  onImportRestore,
}: {
  accent: string;
  accent2: string;
  rgb: string;
  compact?: boolean;
  onCreateText: () => void;
  onUseTemplate: () => void;
  onImportRestore: () => void;
}) {
  return (
    <div
      className="nx-canvas-empty-state"
      data-compact={compact ? "true" : "false"}
      style={{
        position: compact ? "relative" : "absolute",
        inset: compact ? undefined : 0,
        zIndex: compact ? undefined : 120,
        ["--nx-canvas-empty-accent" as any]: accent,
        ["--nx-canvas-empty-accent2" as any]: accent2,
        ["--nx-canvas-empty-rgb" as any]: rgb,
      }}
    >
      <div className="nx-canvas-empty-card">
        <div className="nx-canvas-empty-icon" aria-hidden="true">
          <PlusCircle size={26} />
        </div>
        <div className="nx-canvas-empty-copy">
          <h2>Startpunkt waehlen</h2>
          <p>Erstelle den ersten Node, nutze ein Template oder stelle ein bestehendes Canvas wieder her.</p>
        </div>
        <div className="nx-canvas-empty-actions">
          <EmptyActionButton
            accent={accent}
            primary
            icon={Type}
            title="Text-Node"
            detail="Leerer Start"
            onClick={onCreateText}
          />
          <EmptyActionButton
            accent={accent}
            icon={Wand2}
            title="Template"
            detail="Plan-Board"
            onClick={onUseTemplate}
          />
          <EmptyActionButton
            accent={accent}
            icon={FileUp}
            title="Import"
            detail="JSON laden"
            onClick={onImportRestore}
          />
        </div>
      </div>
    </div>
  );
}
