import { FileUp, Type, Wand2 } from "lucide-react";
import type React from "react";

const actionButton = (accent: string, primary = false): React.CSSProperties => ({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  minHeight: 42,
  padding: "10px 14px",
  borderRadius: 10,
  border: primary ? "none" : "1px solid rgba(255,255,255,0.14)",
  background: primary ? accent : "rgba(255,255,255,0.06)",
  color: primary ? "#fff" : "inherit",
  fontWeight: 760,
  fontSize: 13,
  cursor: "pointer",
});

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
      style={{
        position: compact ? "relative" : "absolute",
        inset: compact ? undefined : 0,
        zIndex: compact ? undefined : 120,
        display: "grid",
        placeItems: "center",
        pointerEvents: compact ? "auto" : "none",
        padding: compact ? 18 : 24,
      }}
    >
      <div
        style={{
          width: "min(560px, calc(100% - 28px))",
          display: "grid",
          gap: 14,
          textAlign: "center",
          pointerEvents: "auto",
        }}
      >
        <div
          aria-hidden="true"
          style={{
            justifySelf: "center",
            width: 58,
            height: 58,
            borderRadius: 18,
            display: "grid",
            placeItems: "center",
            background: `linear-gradient(135deg, ${accent}, ${accent2})`,
            boxShadow: `0 18px 48px rgba(${rgb}, 0.28)`,
            color: "#fff",
            fontSize: 25,
            fontWeight: 900,
          }}
        >
          +
        </div>
        <div style={{ display: "grid", gap: 5 }}>
          <h2 style={{ margin: 0, fontSize: compact ? 18 : 22, letterSpacing: 0 }}>
            Canvas starten
          </h2>
          <p
            style={{
              margin: 0,
              color: "var(--text-muted)",
              fontSize: 13,
              lineHeight: 1.5,
            }}
          >
            Beginne mit einem Node, nutze ein Template oder stelle einen Export wieder her.
          </p>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: compact ? "1fr" : "repeat(3, minmax(0, 1fr))",
            gap: 8,
          }}
        >
          <button type="button" onClick={onCreateText} style={actionButton(accent, true)}>
            <Type size={16} /> Neuer Text-Node
          </button>
          <button type="button" onClick={onUseTemplate} style={actionButton(accent)}>
            <Wand2 size={16} /> Template nutzen
          </button>
          <button type="button" onClick={onImportRestore} style={actionButton(accent)}>
            <FileUp size={16} /> Import/Restore
          </button>
        </div>
      </div>
    </div>
  );
}