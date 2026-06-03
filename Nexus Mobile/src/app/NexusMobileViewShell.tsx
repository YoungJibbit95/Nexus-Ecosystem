import React from "react";
import {
  buildNexusViewCssVars,
  buildNexusViewStatusChips,
  buildNexusPanelEngine,
  getNexusViewManifest,
  getNexusViewManifests,
  resolveNexusViewState,
  resolveNexusViewUiTokens,
  resolveNexusViewCommandRegistry,
  type NexusResolvedViewState,
  type NexusResolvedViewCommand,
  type NexusViewManifest,
} from "@nexus/core";
import type { View } from "../components/Sidebar";

type Props = {
  viewId: View;
  availableViews: View[];
  active: boolean;
  reducedMotion: boolean;
  onRequestViewChange: (viewId: View | string) => void;
  onExecuteCommand?: (command: NexusResolvedViewCommand) => boolean | void;
  children: React.ReactNode;
};

type MobileViewContract = NexusViewManifest | {
  id: string;
  title: string;
  subtitle: string;
  navLabel: string;
  category: string;
  navigationGroup: string;
  icon: string;
  accent: string;
  desktopMode: string;
  mobileMode: string;
  defaultActionId: string;
  actions: NexusViewManifest["actions"];
  panels: NexusViewManifest["panels"];
  shortcuts: string[];
  statusSignals: string[];
};

const resolveViewContract = (viewId: View): MobileViewContract =>
  getNexusViewManifest(viewId) ?? {
    id: viewId,
    title: viewId === "diagnostics" ? "Diagnostics" : String(viewId),
    subtitle: "Mobile Debug View",
    navLabel: String(viewId),
    category: "system",
    navigationGroup: "developer",
    icon: "activity",
    accent: "#64d2ff",
    desktopMode: "diagnostics",
    mobileMode: "stack",
    defaultActionId: "inspect",
    actions: [],
    panels: [],
    shortcuts: [],
    statusSignals: ["debug"],
  };

const resolveRelatedViews = (
  viewId: View,
  availableViews: View[],
  contract: MobileViewContract,
) =>
  getNexusViewManifests(availableViews)
    .filter((manifest) => manifest.id !== viewId)
    .filter(
      (manifest) =>
        manifest.category === contract.category ||
        manifest.navigationGroup === contract.navigationGroup,
    )
    .slice(0, 3);

export function NexusMobileViewShell({
  viewId,
  availableViews,
  active,
  reducedMotion,
  onRequestViewChange,
  onExecuteCommand,
  children,
}: Props) {
  const contract = React.useMemo(() => resolveViewContract(viewId), [viewId]);
  const relatedViews = React.useMemo(
    () => resolveRelatedViews(viewId, availableViews, contract),
    [availableViews, contract, viewId],
  );
  const uiCssVars = React.useMemo(
    () =>
      buildNexusViewCssVars(
        resolveNexusViewUiTokens({
          viewId,
          surface: "mobile",
          density: "compact",
          themeMode: "dark",
          accent: contract.accent,
          reducedMotion,
        }),
      ),
    [contract.accent, reducedMotion, viewId],
  );
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [activePanelId, setActivePanelId] = React.useState<string | null>(null);
  const [lastCommandId, setLastCommandId] = React.useState<string | null>(null);
  const [shellState, setShellState] = React.useState<NexusResolvedViewState | null>(null);

  React.useEffect(() => {
    setSheetOpen(false);
    setActivePanelId(null);
    setLastCommandId(null);
    setShellState(null);
  }, [contract.id]);

  const panelEngine = React.useMemo(
    () =>
      buildNexusPanelEngine({
        viewId,
        surface: "mobile",
        density: "compact",
        inspectorOpen: sheetOpen,
        activePanelId,
        reducedMotion,
      }),
    [activePanelId, reducedMotion, sheetOpen, viewId],
  );
  const layout = panelEngine.layout;
  const commandRegistry = React.useMemo(
    () =>
      resolveNexusViewCommandRegistry({
        views: [viewId],
        activeView: viewId,
        hasSelection: false,
        availableViews,
      }),
    [availableViews, viewId],
  );
  const primaryAction =
    commandRegistry.find((command) => command.id === contract.defaultActionId) ??
    commandRegistry.find((command) => command.placement === "primary") ??
    null;
  const toolbarActions = commandRegistry
    .filter((command) => command.commandId !== primaryAction?.commandId)
    .filter((command) => command.placement === "toolbar" || command.placement === "command")
    .slice(0, 2);
  const activePanel =
    panelEngine.activePanel ??
    panelEngine.sheetPanels.find((panel) => panel.visible) ??
    panelEngine.inlinePanels[0] ??
    null;
  const lastCommand = commandRegistry.find(
    (command) => command.commandId === lastCommandId,
  );
  const resolvedShellState = React.useMemo(
    () => shellState ?? resolveNexusViewState({ viewId, loading: !active }),
    [active, shellState, viewId],
  );
  const statusChips = React.useMemo(
    () =>
      buildNexusViewStatusChips({
        state: resolvedShellState,
        signals: layout?.statusSignals ?? contract.statusSignals,
        maxItems: 4,
      }),
    [contract.statusSignals, layout?.statusSignals, resolvedShellState],
  );

  const runShellCommand = React.useCallback(
    (command: NexusResolvedViewCommand) => {
      setLastCommandId(command.commandId);
      if (!command.enabled || command.requiresSelection) {
        setShellState(
          resolveNexusViewState({
            viewId,
            blockedReason: command.disabledReason || "requires-selection",
          }),
        );
        setSheetOpen(true);
        return;
      }

      const handled = onExecuteCommand?.(command);
      if (handled) {
        setShellState(resolveNexusViewState({ viewId, saved: true }));
        return;
      }

      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("nexus:mobile-view-command", {
            detail: {
              commandId: command.commandId,
              actionId: command.id,
              viewId: command.viewId,
              intent: command.intent,
              placement: command.placement,
            },
          }),
        );
      }
      setShellState(resolveNexusViewState({ viewId, dirty: true }));
      setSheetOpen(true);
    },
    [onExecuteCommand, viewId],
  );

  return (
    <section
      className="nx-mobile-v6-view-shell"
      data-view={viewId}
      data-active={active ? "true" : "false"}
      data-sheet={sheetOpen ? "open" : "closed"}
      data-layout-version={layout?.version ?? "local"}
      data-chrome={layout?.chrome ?? "full"}
      data-state={resolvedShellState.kind}
      style={{
        ...uiCssVars,
        ["--nx-mobile-v6-accent" as any]: contract.accent,
      }}
    >
      <header className="nx-mobile-v6-header">
        <div className="nx-mobile-v6-title-cluster">
          <div className="nx-mobile-v6-eyebrow">
            {contract.category} / {layout?.surfaceMode ?? contract.mobileMode}
          </div>
          <div className="nx-mobile-v6-title-row">
            <div>
              <h1>{contract.title}</h1>
              <p>{contract.subtitle}</p>
            </div>
            <button
              type="button"
              className="nx-mobile-v6-details-button"
              aria-pressed={sheetOpen}
              onClick={() => setSheetOpen((next) => !next)}
            >
              Details
            </button>
          </div>
        </div>

        <div className="nx-mobile-v6-actions" aria-label="Mobile View Actions">
          {primaryAction ? (
            <button
              type="button"
              className="nx-mobile-v6-action nx-mobile-v6-action--primary"
              title={primaryAction.disabledReason || primaryAction.shortcut || primaryAction.intent}
              aria-disabled={primaryAction.enabled ? undefined : "true"}
              onClick={() => runShellCommand(primaryAction)}
            >
              {primaryAction.title}
            </button>
          ) : null}
          {toolbarActions.map((action) => (
            <button
              key={action.commandId}
              type="button"
              className="nx-mobile-v6-action"
              title={action.disabledReason || action.shortcut || action.intent}
              aria-disabled={action.enabled ? undefined : "true"}
              onClick={() => runShellCommand(action)}
            >
              {action.title}
            </button>
          ))}
        </div>

        {relatedViews.length > 0 ? (
          <nav className="nx-mobile-v6-related" aria-label="Related Views">
            {relatedViews.map((manifest) => (
              <button
                key={manifest.id}
                type="button"
                onClick={() => onRequestViewChange(manifest.id)}
              >
                <span style={{ background: manifest.accent }} />
                {manifest.navLabel}
              </button>
            ))}
          </nav>
        ) : null}
      </header>

      <div className="nx-mobile-v6-content">{children}</div>

      <footer className="nx-mobile-v6-status" aria-label="View Status">
        {statusChips.map((chip) => (
          <span key={chip.id} data-tone={chip.tone} title={chip.description}>
            {chip.label}
          </span>
        ))}
      </footer>

      {sheetOpen ? (
        <aside className="nx-mobile-v6-sheet" aria-label={`${contract.title} Details`}>
          <div className="nx-mobile-v6-sheet-handle" aria-hidden="true" />
          <div className="nx-mobile-v6-sheet-header">
            <div>
              <strong>{activePanel?.title ?? "View Context"}</strong>
              <span>{layout?.contentPriority ?? "balanced"} / {layout?.animationProfile ?? "calm"}</span>
            </div>
            <button type="button" onClick={() => setSheetOpen(false)}>
              Schliessen
            </button>
          </div>

          <div className="nx-mobile-v6-panel-list">
            {panelEngine.panels.length > 0 ? (
              panelEngine.panels.map((panel) => (
                <button
                  key={panel.id}
                  type="button"
                  className={panel.id === activePanel?.id ? "is-active" : undefined}
                  onClick={() => setActivePanelId(panel.id)}
                >
                  <strong>{panel.title}</strong>
                  <span>{panel.state} / {panel.presentation}</span>
                </button>
              ))
            ) : (
              <span>Keine Panels definiert.</span>
            )}
          </div>

          <div className="nx-mobile-v6-sheet-grid">
            <span>State: {resolvedShellState.label}</span>
            <span>Columns: {layout?.columns ?? 1}</span>
            <span>Min width: {layout?.minContentWidth ?? 320}px</span>
            <span>Last command: {lastCommand?.title ?? "none"}</span>
            <span>Shortcuts: {contract.shortcuts.length || "none"}</span>
          </div>
        </aside>
      ) : null}
    </section>
  );
}
