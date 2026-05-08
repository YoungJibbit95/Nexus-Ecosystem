import React from "react";

function ToolBtn({
  icon: Icon,
  tooltip,
  onClick,
  accent,
  rgb,
  active,
}: {
  icon: any;
  tooltip: string;
  onClick: () => void;
  accent: string;
  rgb: string;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={tooltip}
      aria-label={tooltip}
      className="nx-interactive"
      style={{
        background: active ? `rgba(${rgb}, 0.18)` : "transparent",
        border: active
          ? `1px solid rgba(${rgb}, 0.3)`
          : "1px solid transparent",
        borderRadius: 7,
        width: 27,
        height: 27,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: active ? accent : "inherit",
        opacity: active ? 1 : 0.72,
        cursor: "pointer",
        transition: "background 140ms ease, border-color 140ms ease, color 140ms ease, opacity 140ms ease",
      }}
    >
      <Icon size={14} />
    </button>
  );
}

// ─── MAIN CANVAS VIEW ───


export { ToolBtn };
