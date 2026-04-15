import React from "react";
import {
  Columns,
  Copy,
  Download,
  Edit3,
  Eye,
  Save,
} from "lucide-react";
import type { CodeFile } from "../../store/appStore";
import { FileTab, RunBtn, ToolBtn } from "./CodeViewPrimitives";

export function CodeTabStrip({
  openFiles,
  activeCodeId,
  active,
  hasPreview,
  preview,
  setPreview,
  setCode,
  closeCode,
  onCopyCode,
  onDownloadCode,
  onSaveCode,
  run,
  running,
  accent,
}: {
  openFiles: CodeFile[];
  activeCodeId: string | null;
  active: CodeFile | undefined;
  hasPreview: boolean;
  preview: "editor" | "split" | "preview";
  setPreview: (mode: "editor" | "split" | "preview") => void;
  setCode: (id: string) => void;
  closeCode: (id: string) => void;
  onCopyCode: () => void;
  onDownloadCode: () => void;
  onSaveCode: () => void;
  run: () => void;
  running: boolean;
  accent: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "stretch",
        borderBottom: "1px solid rgba(255,255,255,0.07)",
        background: "rgba(0,0,0,0.12)",
        overflowX: "auto",
        flexShrink: 0,
        minHeight: 38,
      }}
    >
      {openFiles.length === 0 ? (
        <div
          style={{
            padding: "0 14px",
            display: "flex",
            alignItems: "center",
            fontSize: 12,
            opacity: 0.3,
          }}
        >
          Open a file →
        </div>
      ) : (
        openFiles.map((file) => (
          <FileTab
            key={file.id}
            file={file}
            active={file.id === activeCodeId}
            onSelect={() => setCode(file.id)}
            onClose={() => closeCode(file.id)}
          />
        ))
      )}
      <div style={{ flex: 1 }} />
      {active && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 2,
            padding: "0 8px",
            flexShrink: 0,
          }}
        >
          {hasPreview && (
            <div
              style={{
                display: "flex",
                background: "rgba(255,255,255,0.06)",
                borderRadius: 7,
                overflow: "hidden",
                marginRight: 6,
              }}
            >
              {(["editor", "split", "preview"] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setPreview(mode)}
                  style={{
                    padding: "5px 8px",
                    background: preview === mode ? accent : "transparent",
                    border: "none",
                    cursor: "pointer",
                    color: preview === mode ? "#fff" : "inherit",
                    opacity: preview === mode ? 1 : 0.5,
                    transition: "all 0.12s",
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  {mode === "editor" ? (
                    <Edit3 size={11} />
                  ) : mode === "split" ? (
                    <Columns size={11} />
                  ) : (
                    <Eye size={11} />
                  )}
                </button>
              ))}
            </div>
          )}
          <ToolBtn
            onClick={onCopyCode}
            title="Copy code"
            icon={<Copy size={13} />}
          />
          <ToolBtn
            onClick={onDownloadCode}
            title="Download"
            icon={<Download size={13} />}
          />
          <ToolBtn
            onClick={onSaveCode}
            title="Save (Ctrl+S)"
            icon={<Save size={13} />}
            active={active.dirty}
          />
          <RunBtn running={running} onClick={run} accent={accent} />
        </div>
      )}
    </div>
  );
}
