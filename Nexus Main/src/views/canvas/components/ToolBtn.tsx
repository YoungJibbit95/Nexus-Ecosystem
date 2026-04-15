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
      className="nx-interactive nx-bounce-target"
      style={{
        background: active ? `rgba(${rgb}, 0.18)` : "transparent",
        border: active
          ? `1px solid rgba(${rgb}, 0.3)`
          : "1px solid transparent",
        borderRadius: 7,
        width: 30,
        height: 30,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: active ? accent : "inherit",
        opacity: active ? 1 : 0.72,
      }}
    >
      <Icon size={14} />
    </button>
  );
}

// ─── MAIN CANVAS VIEW ───


export { ToolBtn };
