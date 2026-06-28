import React, { Suspense } from "react";
import { motion } from "framer-motion";
import { Sidebar, type View } from "../components/Sidebar";
import { TitleBar } from "../components/TitleBar";
import { hexToRgb } from "../lib/utils";
import { buildAppShellSurfaceTokens, buildPanelSurfaceTokens } from "../lib/visualUtils";
import { NexusTerminal, NexusToolbar } from "./viewPreload";
import { getNexusViewManifest } from "@nexus/core";

type ViewGuardState = {
  checking: boolean;
  blockedView: string | null;
  requiredTier: string | null;
  reason: string | null;
};

type Props = {
  theme: any;
  lowPowerMode: boolean;
  motionCssVars: React.CSSProperties;
  backgroundStyles: React.CSSProperties;
  accentRgb: string;
  accent2Rgb: string;
  sidebarLeft: boolean;
  sidebarAutoHideEnabled: boolean;
  sidebarExpanded: boolean;
  effectiveSidebarWidth: number;
  toolbarBottom: boolean;
  toolbarVisible: boolean;
  terminalOpen: boolean;
  view: View;
  availableViews: View[];
  viewGuardState: ViewGuardState;
  motionRuntime: any;
  showDiagnosticsButton?: boolean;
  releaseId?: string | null;
  onRequestViewChange: (viewId: View | string) => void;
  onPrefetchView: (viewId: View) => void;
  onSidebarAutoPeek: (next: boolean) => void;
  onOpenDiagnostics?: () => void;
  mainViewNode: React.ReactNode;
};

export function MainShellLayout({
  theme: t,
  lowPowerMode,
  motionCssVars,
  backgroundStyles,
  accentRgb,
  accent2Rgb,
  sidebarLeft,
  sidebarAutoHideEnabled,
  sidebarExpanded,
  effectiveSidebarWidth,
  toolbarBottom,
  toolbarVisible,
  terminalOpen,
  view,
  availableViews,
  viewGuardState,
  motionRuntime,
  showDiagnosticsButton = false,
  releaseId = null,
  onRequestViewChange,
  onPrefetchView,
  onSidebarAutoPeek,
  onOpenDiagnostics,
  mainViewNode,
}: Props) {
  const isDark = t.mode === "dark";
  const activeViewManifest = React.useMemo(
    () => getNexusViewManifest(view),
    [view],
  );
  const panelSurfaceTokens = React.useMemo(
    () =>
      buildPanelSurfaceTokens({
        mode: t.background?.panelBgMode || "glass",
        accent: t.accent,
        accent2: t.accent2,
        appBg: t.bg,
        colorMode: t.mode,
        backgroundVisibility: t.background?.overlayOpacity,
      }),
    [
      t.accent,
      t.accent2,
      t.background?.overlayOpacity,
      t.background?.panelBgMode,
      t.bg,
      t.mode,
    ],
  );
  const appShellSurfaceTokens = React.useMemo(
    () =>
      buildAppShellSurfaceTokens({
        background: t.background,
        accent: t.accent,
        accent2: t.accent2,
        appBg: t.bg,
        colorMode: t.mode,
      }),
    [t.accent, t.accent2, t.background, t.bg, t.mode],
  );
  const safeFontSize = Math.max(12, Math.min(18, Number(t.qol?.fontSize) || 14));
  const safePanelRadius = Math.max(4, Math.min(32, Number(t.visual?.panelRadius) || 14));
  const viewContract = activeViewManifest ?? {
    title: view === "diagnostics" ? "Diagnostics" : String(view),
    subtitle: "Lokaler Entwicklungs-View",
    category: "system",
    desktopMode: "diagnostics",
    mobileMode: "stack",
    defaultActionId: "inspect",
    actions: [],
    panels: [],
    shortcuts: [],
    statusSignals: ["debug"],
  };

  const toolbarEl = toolbarVisible ? (
    <div
      style={{
        position: "relative",
        zIndex: 500,
        display: "flex",
        justifyContent: "center",
        padding: toolbarBottom ? "0 0 3px" : "3px 0 0",
        pointerEvents: "none",
      }}
    >
      <div style={{ pointerEvents: "auto", width: "100%" }}>
        <Suspense fallback={null}>
          <NexusToolbar
            activeView={view}
            availableViews={availableViews}
            setView={(v: any) => {
              onRequestViewChange(v);
            }}
          />
        </Suspense>
      </div>
    </div>
  ) : null;

  return (
    <div
      className="nx-app-shell nx-motion-root"
      data-nx-color-mode={t.mode}
      data-sidebar-style={t.sidebarStyle || "default"}
      data-panel-bg-mode={t.background?.panelBgMode || "glass"}
      data-app-bg-mode={t.background?.mode || "solid"}
      data-app-bg-animated={t.background?.animated ? "true" : "false"}
      data-nx-motion-profile={motionRuntime?.profile || "balanced"}
      data-nx-motion-reduced={motionRuntime?.reduced ? "1" : "0"}
      style={{
        ...motionCssVars,
        ["--nx-font-size" as any]: `${safeFontSize}px`,
        ["--nx-radius" as any]: `${safePanelRadius}px`,
        ["--nx-panel-radius" as any]: `${safePanelRadius}px`,
        ["--nx-shell-accent-rgb" as any]: accentRgb,
        ["--nx-shell-accent2-rgb" as any]: accent2Rgb,
        ["--nx-panel-bg" as any]: panelSurfaceTokens.background,
        ["--nx-panel-bg-size" as any]:
          panelSurfaceTokens.backgroundSize || "100% 100%",
        ["--nx-panel-bg-blend" as any]:
          panelSurfaceTokens.backgroundBlendMode || "normal",
        ["--nx-app-root-bg" as any]: appShellSurfaceTokens.rootBackgroundColor,
        ["--nx-app-shell-aura-bg" as any]: appShellSurfaceTokens.auraBackground,
        ["--nx-app-shell-aura-opacity" as any]: appShellSurfaceTokens.auraOpacity,
        ["--nx-app-shell-grid-bg" as any]: appShellSurfaceTokens.gridBackground,
        ["--nx-app-shell-grid-opacity" as any]: appShellSurfaceTokens.gridOpacity,
        ["--nx-app-bg-animation-duration" as any]: `${Math.max(
          8,
          Math.min(42, Number(t.background?.animationSpeed || 4) * 4),
        )}s`,
        ["--nx-shell-window-bg" as any]: appShellSurfaceTokens.windowBackground,
        ["--nx-shell-window-aura-bg" as any]: appShellSurfaceTokens.windowAuraBackground,
        ["--nx-shell-window-grid-bg" as any]: appShellSurfaceTokens.windowGridBackground,
        ["--nx-shell-window-grid-opacity" as any]: appShellSurfaceTokens.windowGridOpacity,
        ["--nx-v6-surface" as any]: isDark
          ? "rgba(15, 23, 42, 0.58)"
          : "rgba(255, 255, 255, 0.72)",
        ["--nx-v6-surface-strong" as any]: isDark
          ? "rgba(8, 13, 32, 0.62)"
          : "rgba(248, 250, 252, 0.88)",
        ["--nx-v6-line" as any]: isDark
          ? "rgba(255, 255, 255, 0.1)"
          : "rgba(15, 23, 42, 0.12)",
        ["--nx-v6-line-soft" as any]: isDark
          ? "rgba(255, 255, 255, 0.065)"
          : "rgba(15, 23, 42, 0.08)",
        ["--nx-v6-text" as any]: isDark
          ? "rgba(255, 255, 255, 0.92)"
          : "rgba(15, 23, 42, 0.94)",
        ["--nx-v6-muted" as any]: isDark
          ? "rgba(255, 255, 255, 0.62)"
          : "rgba(15, 23, 42, 0.66)",
        ["--nx-v6-faint" as any]: isDark
          ? "rgba(255, 255, 255, 0.4)"
          : "rgba(15, 23, 42, 0.48)",
        ["--nx-v6-control-text" as any]: isDark
          ? "rgba(255, 255, 255, 0.78)"
          : "rgba(15, 23, 42, 0.78)",
        ["--nx-v6-control-hover-text" as any]: isDark
          ? "rgba(255, 255, 255, 0.96)"
          : "rgba(15, 23, 42, 0.96)",
        ["--nx-v6-control-bg" as any]: isDark
          ? "rgba(255, 255, 255, 0.055)"
          : "rgba(15, 23, 42, 0.045)",
        ["--nx-v6-control-bg-hover" as any]: isDark
          ? "rgba(255, 255, 255, 0.07)"
          : "rgba(15, 23, 42, 0.065)",
        ["--nx-v6-strong-text" as any]: isDark
          ? "rgba(255, 255, 255, 0.9)"
          : "rgba(2, 6, 23, 0.94)",
        ["--nx-v6-primary-text" as any]: isDark
          ? "rgba(255, 255, 255, 0.96)"
          : "rgba(2, 6, 23, 0.94)",
        ["--nx-v6-grid-line-a" as any]: isDark
          ? "rgba(255, 255, 255, 0.042)"
          : "rgba(15, 23, 42, 0.045)",
        ["--nx-v6-grid-line-b" as any]: isDark
          ? "rgba(255, 255, 255, 0.032)"
          : "rgba(15, 23, 42, 0.032)",
        ["--nx-status-bar-bg" as any]: isDark
          ? "linear-gradient(180deg, rgba(255, 255, 255, 0.018), rgba(255, 255, 255, 0.01)), rgba(4, 6, 13, 0.2)"
          : "linear-gradient(180deg, rgba(255, 255, 255, 0.86), rgba(248, 250, 252, 0.76)), rgba(255, 255, 255, 0.38)",
        ["--nx-status-bar-border" as any]: isDark
          ? "rgba(255, 255, 255, 0.055)"
          : "rgba(15, 23, 42, 0.09)",
        ["--nx-status-text" as any]: isDark
          ? "rgba(255, 255, 255, 0.52)"
          : "rgba(15, 23, 42, 0.58)",
        ["--nx-status-strong-text" as any]: isDark
          ? "rgba(255, 255, 255, 0.72)"
          : "rgba(15, 23, 42, 0.78)",
        color: isDark ? "#f8f8fc" : "#111827",
        colorScheme: t.mode,
        ...backgroundStyles,
        fontSize: "var(--nx-font-size, 14px)",
      }}
    >
      <div
        aria-hidden="true"
        className="nx-ambient-layer"
        style={{
          background: lowPowerMode
            ? `linear-gradient(160deg, rgba(${accentRgb},0.1), rgba(${accent2Rgb},0.08))`
            : `
            radial-gradient(650px circle at 10% 14%, rgba(${accentRgb},0.2), transparent 55%),
            radial-gradient(580px circle at 88% 14%, rgba(${accent2Rgb},0.18), transparent 60%),
            radial-gradient(520px circle at 60% 95%, rgba(${accentRgb},0.14), transparent 65%)
          `,
        }}
      />

      <div
        className="nx-shell-window"
        style={{
          width: "calc(100% / var(--nx-ui-scale, 1))",
          height: "calc(100% / var(--nx-ui-scale, 1))",
          transform: "scale(var(--nx-ui-scale, 1))",
          transformOrigin: "top left",
          borderRadius: safePanelRadius,
          border:
            t.mode === "dark"
              ? "1px solid rgba(255,255,255,0.1)"
              : "1px solid rgba(0,0,0,0.085)",
          boxShadow:
            t.mode === "dark"
              ? "0 22px 56px rgba(0,0,0,0.46), 0 0 0 1px rgba(255,255,255,0.035) inset"
              : "0 18px 44px rgba(28,31,42,0.13), 0 0 0 1px rgba(255,255,255,0.54) inset",
        }}
      >
        <TitleBar
          showDiagnosticsButton={showDiagnosticsButton}
          onOpenDiagnostics={onOpenDiagnostics}
          releaseId={releaseId}
        />
        <div
          style={{
            display: "flex",
            flex: 1,
            overflow: "hidden",
            minHeight: 0,
            flexDirection: sidebarLeft ? "row" : "row-reverse",
            position: "relative",
          }}
        >
          <div
            className="nx-motion-surface"
            style={{
              width: effectiveSidebarWidth,
              flexShrink: 0,
              height: "100%",
              transition: "width 220ms cubic-bezier(0.2, 0.8, 0.2, 1)",
              transitionDuration: `${motionRuntime.quickMs}ms`,
              overflow: "hidden",
              pointerEvents:
                sidebarAutoHideEnabled && !sidebarExpanded ? "none" : "auto",
            }}
            onMouseEnter={() => {
              if (sidebarAutoHideEnabled) onSidebarAutoPeek(true);
            }}
            onMouseLeave={() => {
              if (sidebarAutoHideEnabled) onSidebarAutoPeek(false);
            }}
          >
            <Sidebar
              view={view}
              availableViews={availableViews}
              onChange={(v: any) => {
                onRequestViewChange(v);
              }}
              onPrefetch={(v: any) => {
                onPrefetchView(v as View);
              }}
            />
          </div>
          {sidebarAutoHideEnabled && !sidebarExpanded ? (
            <div
              onMouseEnter={() => onSidebarAutoPeek(true)}
              style={{
                position: "absolute",
                top: 0,
                bottom: 0,
                [sidebarLeft ? "left" : "right"]: 0,
                width: 14,
                zIndex: 55,
                cursor: "ew-resize",
                background: sidebarLeft
                  ? "linear-gradient(90deg, rgba(255,255,255,0.14), transparent)"
                  : "linear-gradient(270deg, rgba(255,255,255,0.14), transparent)",
                opacity: 0.48,
              }}
            />
          ) : null}
          <div
            style={{
              position: "absolute",
              top: 56,
              left: 12,
              right: 12,
              zIndex: 1200,
              pointerEvents: "none",
            }}
          >
            {viewGuardState.checking ? (
              <div
                style={{
                  pointerEvents: "none",
                  borderRadius: 10,
                  padding: "8px 10px",
                  fontSize: 12,
                  fontWeight: 700,
                  background:
                    t.mode === "dark"
                      ? "rgba(6,12,24,0.82)"
                      : "rgba(255,255,255,0.88)",
                  border: `1px solid rgba(${hexToRgb(t.accent)},0.34)`,
                  color: t.accent,
                  boxShadow: `0 8px 24px rgba(${hexToRgb(t.accent)},0.2)`,
                }}
              >
                Validiere View-Zugriff...
              </div>
            ) : null}
            {viewGuardState.blockedView ? (
              <div
                style={{
                  pointerEvents: "none",
                  marginTop: 8,
                  borderRadius: 10,
                  padding: "9px 10px",
                  fontSize: 12,
                  fontWeight: 700,
                  background: "rgba(255,69,58,0.14)",
                  border: "1px solid rgba(255,69,58,0.45)",
                  color: t.mode === "dark" ? "#ffd8d2" : "#5e1810",
                  boxShadow: "0 8px 26px rgba(255,69,58,0.18)",
                }}
              >
                View gesperrt: `{viewGuardState.blockedView}` erfordert Tier `
                {viewGuardState.requiredTier || "paid"}` (
                {viewGuardState.reason || "PAYWALL_BLOCKED"}).
              </div>
            ) : null}
          </div>
          <div
            className="nx-motion-surface"
            style={{
              flex: 1,
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
              position: "relative",
              minHeight: 0,
              background:
                t.mode === "dark"
                  ? "rgba(7,8,13,0.18)"
                  : "rgba(255,255,255,0.24)",
            }}
          >
            {!toolbarBottom ? toolbarEl : null}
            <motion.div
              initial={motionRuntime.pageInitial}
              animate={motionRuntime.pageAnimate}
              exit={motionRuntime.pageExit}
              transition={motionRuntime.pageTransition}
              style={{
                flex: 1,
                overflow: "hidden",
                height: "100%",
                minHeight: 0,
                position: "relative",
              }}
            >
              {mainViewNode}
            </motion.div>
            <Suspense fallback={null}>
              {terminalOpen ? (
                <NexusTerminal
                  setView={(v: any) => {
                    onRequestViewChange(v);
                  }}
                />
              ) : null}
            </Suspense>
            {/*<div className="nx-app-status-bar" role="status" aria-live="polite">
              <div className="nx-status-chip nx-status-chip--strong">
                View: {viewContract.title}
              </div>
              <div className="nx-status-chip">
                Release: {releaseId || "local fallback"}
              </div>
              {viewGuardState.checking ? (
                <div className="nx-status-chip nx-status-chip--busy">
                  Zugriff wird geprueft
                </div>
              ) : null}
              {viewGuardState.blockedView ? (
                <div className="nx-status-chip nx-status-chip--danger">
                  Blockiert: {viewGuardState.blockedView}
                </div>
              ) : null}
            </div>*/}
            {toolbarBottom ? toolbarEl : null}
          </div>
        </div>
      </div>

      {!lowPowerMode && t.background.vignette ? (
        <div
          aria-hidden="true"
          style={{
            position: "fixed",
            inset: 0,
            pointerEvents: "none",
            zIndex: 1,
            background: `radial-gradient(circle at center, transparent 54%, rgba(0,0,0,${t.background.vignetteStrength * 0.56}) 100%)`,
          }}
        />
      ) : null}
    </div>
  );
}
