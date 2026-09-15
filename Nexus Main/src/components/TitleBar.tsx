import React, { useState } from "react";
import {
  Minus,
  Maximize2,
  X,
  Search,
  Command,
  Activity,
  Cloud,
  LogOut,
} from "lucide-react";
import { useTheme } from "../store/themeStore";

export function TitleBar({
  showDiagnosticsButton = false,
  onOpenDiagnostics,
  releaseId = null,
  authenticated = false,
  logoutPending = false,
  onLogout,
}: {
  showDiagnosticsButton?: boolean;
  onOpenDiagnostics?: () => void;
  releaseId?: string | null;
  authenticated?: boolean;
  logoutPending?: boolean;
  onLogout?: () => void;
}) {
  const t = useTheme();
  const [hovered, setHovered] = useState<string | null>(null);
  const isDark = t.mode === "dark";
  const showDiagnostics = Boolean(showDiagnosticsButton && onOpenDiagnostics);

  const actions = [
    {
      id: "close",
      label: "Fenster schliessen",
      color: "#ff5f57",
      icon: <X size={8} />,
      run: () => window.api?.window.close(),
    },
    {
      id: "minimize",
      label: "Fenster minimieren",
      color: "#febc2e",
      icon: <Minus size={8} />,
      run: () => window.api?.window.minimize(),
    },
    {
      id: "maximize",
      label: "Fenster maximieren oder wiederherstellen",
      color: "#28c840",
      icon: <Maximize2 size={8} />,
      run: () => window.api?.window.maximize(),
    },
  ];

  return (
    <div
      style={{
        position: "relative",
        display: "flex",
        alignItems: "center",
        height: 38,
        padding: "0 11px",
        flexShrink: 0,
        color: isDark ? "rgba(255,255,255,0.88)" : "rgba(17,24,39,0.92)",
        borderBottom: isDark
          ? "1px solid rgba(255,255,255,0.06)"
          : "1px solid rgba(0,0,0,0.065)",
        background: isDark
          ? "linear-gradient(to bottom, rgba(27,30,45,0.58), rgba(15,18,30,0.36))"
          : "linear-gradient(to bottom, rgba(255,255,255,0.94), rgba(245,248,255,0.78))",
        boxShadow: isDark ? undefined : "inset 0 1px 0 rgba(255,255,255,0.72)",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          ["WebkitAppRegion" as any]: "drag",
        }}
      />

      <div
        style={{
          position: "relative",
          zIndex: 2,
          display: "flex",
          alignItems: "center",
          gap: 7,
          ["WebkitAppRegion" as any]: "no-drag",
        }}
      >
        {actions.map((action) => (
          <button
            key={action.id}
            onMouseEnter={() => setHovered(action.id)}
            onMouseLeave={() => setHovered(null)}
            onClick={action.run}
            title={action.label}
            aria-label={action.label}
            style={{
              width: 28,
              height: 28,
              borderRadius: 999,
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "transparent",
              boxShadow:
                hovered === action.id ? `0 0 10px ${action.color}7a` : "none",
              transition: "box-shadow 140ms ease, opacity 140ms ease",
              transform: "translateZ(0)",
              color: "#1b1b1d",
            }}
          >
            <span
              aria-hidden="true"
              style={{
                width: 12,
                height: 12,
                borderRadius: 999,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                background: action.color,
                opacity: hovered === action.id ? 0.95 : 1,
              }}
            >
              {action.icon}
            </span>
          </button>
        ))}
      </div>

      <div
        style={{
          position: "absolute",
          left: "50%",
          transform: "translateX(-50%)",
          display: "flex",
          alignItems: "center",
          gap: 7,
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          opacity: 0.68,
          pointerEvents: "none",
          zIndex: 2,
        }}
      >
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: 999,
            background: `linear-gradient(135deg, ${t.accent}, ${t.accent2})`,
            boxShadow: `0 0 8px ${t.accent}80`,
          }}
        />
        Nexus Workspace
      </div>

      <div
        style={{
          position: "relative",
          zIndex: 2,
          marginLeft: "auto",
          display: "flex",
          alignItems: "center",
          gap: 6,
          ["WebkitAppRegion" as any]: "no-drag",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 5,
            fontSize: 9.5,
            fontWeight: 700,
            padding: "3px 7px",
            borderRadius: 999,
            border: isDark
              ? "1px solid rgba(255,255,255,0.09)"
              : "1px solid rgba(0,0,0,0.09)",
            background: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)",
            opacity: 0.8,
          }}
        >
          <Command size={9} />
          Shift x2
        </div>
        {/*{releaseId ? (
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              fontSize: 9.5,
              fontWeight: 800,
              letterSpacing: "0.04em",
              padding: "3px 7px",
              borderRadius: 999,
              border: isDark
                ? `1px solid ${t.accent}55`
                : `1px solid ${t.accent}66`,
              background: isDark
                ? `linear-gradient(135deg, ${t.accent}2a, ${t.accent2}20)`
                : `linear-gradient(135deg, ${t.accent}22, ${t.accent2}1a)`,
              color: t.accent,
              boxShadow: `0 8px 18px ${t.accent}28`,
              whiteSpace: "nowrap",
              maxWidth: 180,
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
            title={`Live Release ${releaseId}`}
          >
            <Cloud size={10} />
            <span style={{ opacity: 0.86 }}>Release</span>
            <span style={{ opacity: 0.96 }}>{releaseId}</span>
          </div>
        ) : null}*/}
        {showDiagnostics ? (
          <button
            title="Open Diagnostics"
            onClick={onOpenDiagnostics}
            style={{
              height: 24,
              borderRadius: 7,
              border: isDark
                ? "1px solid rgba(255,255,255,0.1)"
                : "1px solid rgba(0,0,0,0.1)",
              background: isDark
                ? "rgba(255,255,255,0.05)"
                : "rgba(0,0,0,0.04)",
              color: "inherit",
              opacity: 0.72,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 5,
              padding: "0 8px",
              fontSize: 9.5,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            <Activity size={11} />
            Diagnostics
          </button>
        ) : null}
        {authenticated && onLogout ? (
          <button
            type="button"
            title={logoutPending ? "Session wird beendet" : "Abmelden und Session beenden"}
            aria-label={logoutPending ? "Session wird beendet" : "Abmelden und Session beenden"}
            onClick={onLogout}
            disabled={logoutPending}
            style={{
              width: 24,
              height: 24,
              borderRadius: 7,
              border: isDark
                ? "1px solid rgba(255,255,255,0.1)"
                : "1px solid rgba(0,0,0,0.1)",
              background: isDark
                ? "rgba(255,255,255,0.05)"
                : "rgba(0,0,0,0.04)",
              color: "inherit",
              opacity: logoutPending ? 0.42 : 0.68,
              cursor: logoutPending ? "wait" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <LogOut size={12} aria-hidden="true" />
          </button>
        ) : null}
        <button
          title="Suche oeffnen"
          aria-label="Suche oeffnen"
          onClick={() =>
            window.dispatchEvent(
              new CustomEvent("nx-open-spotlight", { detail: { query: "" } }),
            )
          }
          style={{
            width: 24,
            height: 24,
            borderRadius: 7,
            border: isDark
              ? "1px solid rgba(255,255,255,0.1)"
              : "1px solid rgba(0,0,0,0.1)",
            background: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)",
            color: "inherit",
            opacity: 0.65,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Search size={12} />
        </button>
      </div>
    </div>
  );
}
