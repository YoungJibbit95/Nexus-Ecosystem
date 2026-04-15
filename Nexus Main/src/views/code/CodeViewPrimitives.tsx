import React from "react";
import { Loader, Play, X } from "lucide-react";
import type { CodeFile } from "../../store/appStore";
import { InteractiveIconButton } from "../../components/render/InteractiveIconButton";
import { useTheme } from "../../store/themeStore";
import { hexToRgb } from "../../lib/utils";
import { getLang } from "./languageRegistry";

export function ToolBtn({
  onClick,
  title,
  icon,
  active,
}: {
  onClick: () => void;
  title: string;
  icon: React.ReactNode;
  active?: boolean;
}) {
  const t = useTheme();
  return (
    <button
      onClick={onClick}
      title={title}
      className="nx-interactive nx-bounce-target"
      style={{
        background: active ? `rgba(${hexToRgb(t.accent)},0.15)` : "none",
        border: "none",
        color: active ? t.accent : "inherit",
        opacity: active ? 1 : 0.5,
        padding: "5px 7px",
        borderRadius: 6,
        display: "flex",
        alignItems: "center",
      }}
    >
      {icon}
    </button>
  );
}

export function RunBtn({
  running,
  onClick,
  accent,
}: {
  running: boolean;
  onClick: () => void;
  accent: string;
}) {
  const rgb = hexToRgb(accent);
  return (
    <button
      onClick={onClick}
      disabled={running}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "5px 14px",
        borderRadius: 8,
        background: running ? `rgba(${rgb},0.18)` : accent,
        border: "none",
        cursor: running ? "not-allowed" : "pointer",
        color: "#fff",
        fontSize: 12,
        fontWeight: 700,
        boxShadow: running ? "none" : `0 2px 12px rgba(${rgb},0.4)`,
        transition: "all 0.15s",
        opacity: running ? 0.7 : 1,
      }}
    >
      {running ? (
        <Loader size={13} className="nx-spin" />
      ) : (
        <Play size={13} fill="currentColor" />
      )}
      {running ? "Running…" : "Run"}
    </button>
  );
}

export function FileTab({
  file,
  active,
  onSelect,
  onClose,
}: {
  file: CodeFile;
  active: boolean;
  onSelect: () => void;
  onClose: () => void;
}) {
  const t = useTheme();
  const lang = getLang(file.lang);
  return (
    <div
      onClick={onSelect}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "0 10px 0 12px",
        cursor: "pointer",
        flexShrink: 0,
        maxWidth: 180,
        minHeight: 38,
        borderRight: "1px solid rgba(255,255,255,0.06)",
        borderBottom: active
          ? `2px solid ${t.accent}`
          : "2px solid transparent",
        background: active ? "rgba(255,255,255,0.07)" : "transparent",
        transition: "all 0.12s",
      }}
    >
      <span
        style={{
          fontSize: 9,
          fontWeight: 800,
          color: lang.color,
          letterSpacing: 0.3,
          textTransform: "uppercase",
          flexShrink: 0,
        }}
      >
        {lang.ext}
      </span>
      <span
        style={{
          fontSize: 12,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          flex: 1,
          opacity: active ? 1 : 0.6,
        }}
      >
        {file.dirty && <span style={{ color: t.accent, marginRight: 3 }}>●</span>}
        {file.name}
      </span>
      <InteractiveIconButton
        motionId={`code-tab-close-${file.id}`}
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        idleOpacity={0.3}
        radius={3}
        style={{ padding: "2px 1px" }}
      >
        <X size={12} />
      </InteractiveIconButton>
    </div>
  );
}

export function OutLine({ text }: { text: string }) {
  const color = text.startsWith("❌")
    ? "#ff453a"
    : text.startsWith("⚠️")
      ? "#ffd60a"
      : text.startsWith("ℹ️")
        ? "#64d2ff"
        : text.startsWith("✓")
          ? "#30d158"
          : undefined;
  return (
    <div
      style={{
        fontFamily: "'Fira Code',monospace",
        fontSize: 12.5,
        lineHeight: 1.65,
        color,
        opacity: color ? 1 : 0.85,
        whiteSpace: "pre-wrap",
        wordBreak: "break-all",
        padding: "0.5px 0",
      }}
    >
      {text}
    </div>
  );
}
