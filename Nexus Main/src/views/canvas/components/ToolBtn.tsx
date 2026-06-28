import React from "react";

function ToolBtn({
  icon: Icon,
  tooltip,
  onClick,
  accent,
  rgb,
  active,
  disabled = false,
  label,
  className = "",
}: {
  icon: any;
  tooltip: string;
  onClick: () => void;
  accent: string;
  rgb: string;
  active?: boolean;
  disabled?: boolean;
  label?: string;
  className?: string;
}) {
  const hasLabel = Boolean(label);

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={tooltip}
      aria-label={tooltip}
      className={`nx-interactive nx-canvas-tool-btn ${className}`.trim()}
      data-active={active ? "true" : "false"}
      data-has-label={hasLabel ? "true" : "false"}
      style={{
        background: active ? `rgba(${rgb}, 0.18)` : "transparent",
        border: active
          ? `1px solid rgba(${rgb}, 0.3)`
          : "1px solid transparent",
        borderRadius: 7,
        width: hasLabel ? "auto" : 29,
        minWidth: hasLabel ? 0 : 29,
        height: 29,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        padding: hasLabel ? "0 9px" : 0,
        color: active ? accent : "inherit",
        opacity: disabled ? 0.42 : active ? 1 : 0.72,
        cursor: disabled ? "not-allowed" : "pointer",
        transition:
          "background 140ms ease, border-color 140ms ease, color 140ms ease, opacity 140ms ease",
      }}
    >
      <Icon aria-hidden="true" size={14} strokeWidth={2.2} />
      {label ? <span className="nx-canvas-tool-label">{label}</span> : null}
    </button>
  );
}

export { ToolBtn };
