import React, { Suspense } from "react";
import { motion } from "framer-motion";
import { Sidebar, type View } from "../components/Sidebar";
import { TitleBar } from "../components/TitleBar";
import { hexToRgb } from "../lib/utils";
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
  const activeViewManifest = React.useMemo(
    () => getNexusViewManifest(view),
    [view],
  );
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
  const primaryAction =
    activeViewManifest?.actions.find(
      (action) => action.id === activeViewManifest.defaultActionId,
    ) ?? activeViewManifest?.actions.find((action) => action.placement === "primary");

  const toolbarEl = toolbarVisible ? (
    <div
      style={{
        position: "relative",
        zIndex: 500,
        display: "flex",
        justifyContent: "center",
        padding: toolbarBottom ? "0 0 5px" : "5px 0 0",
        pointerEvents: "none",
      }}
    >
      <div style={{ pointerEvents: "auto", width: "100%" }}>
        <Suspense fallback={null}>
          <NexusToolbar
            activeView={view}
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
      data-nx-motion-profile={motionRuntime?.profile || "balanced"}
      data-nx-motion-reduced={motionRuntime?.reduced ? "1" : "0"}
      style={{
        ...motionCssVars,
        ["--nx-shell-accent-rgb" as any]: accentRgb,
        ["--nx-shell-accent2-rgb" as any]: accent2Rgb,
        color: t.mode === "dark" ? "#f8f8fc" : "#15161d",
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
          borderRadius: 16,
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
              pointerEvents: sidebarAutoHideEnabled && !sidebarExpanded ? "none" : "auto",
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
                  background: t.mode === "dark" ? "rgba(6,12,24,0.82)" : "rgba(255,255,255,0.88)",
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
              background: t.mode === "dark" ? "rgba(7,8,13,0.26)" : "rgba(255,255,255,0.3)",
            }}
          >
            {!toolbarBottom ? toolbarEl : null}
            <div className="nx-view-context-bar" aria-label="Aktiver View-Kontext">
              <div className="nx-view-context-main">
                <div className="nx-view-context-kicker">
                  Workbench / {viewContract.category}
                </div>
                <div className="nx-view-context-title-row">
                  <strong>{viewContract.title}</strong>
                  <span>{viewContract.subtitle}</span>
                </div>
              </div>
              <div className="nx-view-context-pills" aria-label="View Contract">
                {primaryAction ? (
                  <span className="nx-context-pill nx-context-pill--primary">
                    Primary: {primaryAction.title}
                  </span>
                ) : null}
                <span className="nx-context-pill">
                  Mode: {viewContract.desktopMode}
                </span>
              </div>
            </div>
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
            <div className="nx-app-status-bar" role="status" aria-live="polite">
              <div className="nx-status-chip nx-status-chip--strong">
                View: {viewContract.title}
              </div>
              <div className="nx-status-chip">
                Release: {releaseId || "local fallback"}
              </div>
              <div className="nx-status-chip">
                Motion: {motionRuntime?.profile || "balanced"}
              </div>
              <div className="nx-status-chip">
                Views: {availableViews.length}
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
            </div>
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
