import React, { useState } from "react";

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
  const [h, setH] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
      title={tooltip}
      style={{
        background: h || active ? `rgba(${rgb}, 0.18)` : "transparent",
        border: active
          ? `1px solid rgba(${rgb}, 0.3)`
          : "1px solid transparent",
        borderRadius: 7,
        width: 30,
        height: 30,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        color: h || active ? accent : "inherit",
        transition: "all 0.15s",
        opacity: h || active ? 1 : 0.65,
      }}
    >
      <Icon size={14} />
    </button>
  );
}

// ─── MAIN CANVAS VIEW ───


export { ToolBtn };
