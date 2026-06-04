import React from "react";
import {
  buildNexusViewCssVars,
  buildNexusViewStatusChips,
  buildNexusPanelEngine,
  getNexusViewManifest,
  getNexusViewManifests,
  resolveNexusViewState,
  resolveNexusViewStateBehavior,
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
  onPrefetchView: (viewId: View) => void;
  onExecuteCommand?: (command: NexusResolvedViewCommand) => boolean | void;
  children: React.ReactNode;
};

type ViewContract = NexusViewManifest | {
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

const resolveViewContract = (viewId: View): ViewContract =>
  getNexusViewManifest(viewId) ?? {
    id: viewId,
    title: viewId === "diagnostics" ? "Diagnostics" : String(viewId),
    subtitle: "Lokaler v6 Entwicklungs-View",
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

const sameCategoryViews = (
  viewId: View,
  availableViews: View[],
  contract: ViewContract,
) =>
  getNexusViewManifests(availableViews)
    .filter((manifest) => manifest.id !== viewId)
    .filter(
      (manifest) =>
        manifest.category === contract.category ||
        manifest.navigationGroup === contract.navigationGroup,
    )
    .slice(0, 3);

export function NexusV6ViewShell({
  viewId,
  availableViews,
  active,
  reducedMotion,
  onRequestViewChange,
  onPrefetchView,
  onExecuteCommand,
  children,
}: Props) {
  const contract = React.useMemo(() => resolveViewContract(viewId), [viewId]);
  const relatedViews = React.useMemo(
    () => sameCategoryViews(viewId, availableViews, contract),
    [availableViews, contract, viewId],
  );
  const uiCssVars = React.useMemo(
    () =>
      buildNexusViewCssVars(
        resolveNexusViewUiTokens({
          viewId,
          surface: "desktop",
          density: "comfortable",
          themeMode: "dark",
          accent: contract.accent,
          reducedMotion,
        }),
      ),
    [contract.accent, reducedMotion, viewId],
  );
  const [inspectorOpen, setInspectorOpen] = React.useState(false);
  const [focusMode, setFocusMode] = React.useState(false);
  const [activePanelId, setActivePanelId] = React.useState<string | null>(null);
  const [lastCommandId, setLastCommandId] = React.useState<string | null>(null);
  const [shellState, setShellState] = React.useState<NexusResolvedViewState | null>(null);

  React.useEffect(() => {
    setActivePanelId(null);
    setInspectorOpen(false);
    setFocusMode(false);
    setLastCommandId(null);
    setShellState(null);
  }, [contract.id]);

  const panelEngine = React.useMemo(
    () =>
      buildNexusPanelEngine({
        viewId,
        surface: "desktop",
        density: "comfortable",
        focusMode,
        inspectorOpen,
        activePanelId,
        reducedMotion,
      }),
    [activePanelId, focusMode, inspectorOpen, reducedMotion, viewId],
  );
  const layout = panelEngine.layout;
  const activePanel = panelEngine.activePanel;
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
    .slice(0, 2);
  const lastCommand = commandRegistry.find(
    (command) => command.commandId === lastCommandId,
  );
  const resolvedShellState = React.useMemo(
    () => shellState ?? resolveNexusViewState({ viewId, loading: !active }),
    [active, shellState, viewId],
  );
  const shellStateBehavior = React.useMemo(
    () => resolveNexusViewStateBehavior(resolvedShellState),
    [resolvedShellState],
  );
  const statusChips = React.useMemo(
    () =>
      buildNexusViewStatusChips({
        state: resolvedShellState,
        signals: layout?.statusSignals ?? contract.statusSignals,
        maxItems: inspectorOpen ? 7 : 4,
      }),
    [contract.statusSignals, inspectorOpen, layout?.statusSignals, resolvedShellState],
  );

  React.useEffect(() => {
    if (
      !shellState ||
      !shellStateBehavior.autoDismissMs ||
      typeof window === "undefined"
    ) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setShellState((current) => (current === shellState ? null : current));
    }, shellStateBehavior.autoDismissMs);

    return () => window.clearTimeout(timeoutId);
  }, [shellState, shellStateBehavior.autoDismissMs]);

  const runShellCommand = React.useCallback(
    (command: NexusResolvedViewCommand) => {
      setLastCommandId(command.commandId);
      if (command.disabledReason || command.requiresSelection) {
        setShellState(
          resolveNexusViewState({
            viewId,
            blockedReason: command.disabledReason || "requires-selection",
          }),
        );
        setInspectorOpen(true);
        return;
      }

      const handled = onExecuteCommand?.(command);
      if (handled) {
        setShellState(resolveNexusViewState({ viewId, saved: true }));
        return;
      }

      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("nexus:view-command", {
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

      if (command.id === "focus-mode") {
        setFocusMode((next) => !next);
        setShellState(resolveNexusViewState({ viewId, saved: true }));
        return;
      }
      setShellState(resolveNexusViewState({ viewId, dirty: true }));
      setInspectorOpen(true);
    },
    [onExecuteCommand, viewId],
  );

  return (
    <section
      className="nx-v6-view-shell"
      data-view={viewId}
      data-active={active ? "true" : "false"}
      data-focus={focusMode ? "true" : "false"}
      data-inspector={inspectorOpen ? "open" : "closed"}
      data-reduced-motion={reducedMotion ? "true" : "false"}
      data-layout-version={layout?.version ?? "local"}
      data-chrome={layout?.chrome ?? "full"}
      data-state={resolvedShellState.kind}
      data-state-persistent={shellStateBehavior.persistent ? "true" : "false"}
      style={{
        ...uiCssVars,
        ["--nx-v6-view-accent" as any]: contract.accent,
      }}
    >
      <header className="nx-v6-view-header">
        <div className="nx-v6-title-cluster">
          <div className="nx-v6-eyebrow">
            {contract.category} / {layout?.contentPriority ?? contract.desktopMode}
          </div>
          <div className="nx-v6-title-row">
            <div className="nx-v6-title-copy">
              <h1>{contract.title}</h1>
              <p>{contract.subtitle}</p>
            </div>
          </div>
          <div className="nx-v6-quick-nav" aria-label="Verwandte Views">
            {relatedViews.length > 0 ? (
              relatedViews.map((manifest) => (
                <button
                  key={manifest.id}
                  type="button"
                  onClick={() => onRequestViewChange(manifest.id)}
                  onMouseEnter={() => {
                    onPrefetchView(manifest.id as View);
                  }}
                >
                  <span style={{ background: manifest.accent }} />
                  {manifest.navLabel}
                </button>
              ))
            ) : null}
          </div>
        </div>

        <div className="nx-v6-header-actions" aria-label="v6 View Actions">
          {primaryAction ? (
            <button
              type="button"
              className="nx-v6-action nx-v6-action--primary"
              title={primaryAction.disabledReason || primaryAction.shortcut || primaryAction.intent}
              aria-disabled={primaryAction.enabled ? undefined : "true"}
              onClick={() => runShellCommand(primaryAction)}
            >
              {primaryAction.title}
            </button>
          ) : null}
          {toolbarActions.map((action) => (
            <button
              key={action.id}
              type="button"
              className="nx-v6-action"
              title={action.disabledReason || action.shortcut || action.intent}
              aria-disabled={action.enabled ? undefined : "true"}
              onClick={() => runShellCommand(action)}
            >
              {action.title}
            </button>
          ))}
          <button
            type="button"
            className="nx-v6-action"
            aria-pressed={focusMode}
            onClick={() => setFocusMode((next) => !next)}
          >
            {focusMode ? "Zurueck" : "Fokus"}
          </button>
          <button
            type="button"
            className="nx-v6-action"
            aria-pressed={inspectorOpen}
            onClick={() => setInspectorOpen((next) => !next)}
          >
            Details
          </button>
        </div>
      </header>

      <div className="nx-v6-workbench">
        <div className="nx-v6-content-frame">{children}</div>

        {inspectorOpen ? (
          <aside className="nx-v6-inspector-rail" aria-label={`${contract.title} Inspector`}>
            <div className="nx-v6-inspector-section">
              <div className="nx-v6-section-label">Panels</div>
              <div className="nx-v6-panel-list">
                {panelEngine.panels.length > 0 ? (
                  panelEngine.panels.map((panel) => (
                    <button
                      key={panel.id}
                      type="button"
                      className={panel.id === activePanel?.id ? "is-active" : undefined}
                      onClick={() => setActivePanelId(panel.id)}
                    >
                      <strong>{panel.title}</strong>
                      <span>{panel.state} / {panel.presentation} / {panel.rail}</span>
                    </button>
                  ))
                ) : (
                  <span>Keine Panels definiert.</span>
                )}
              </div>
            </div>

            <div className="nx-v6-inspector-section">
              <div className="nx-v6-section-label">Signals</div>
              <div className="nx-v6-signal-grid">
                {statusChips.map((chip) => (
                  <span key={chip.id} data-tone={chip.tone} title={chip.description}>
                    {chip.label}
                  </span>
                ))}
              </div>
            </div>

            <div className="nx-v6-inspector-section">
              <div className="nx-v6-section-label">View Health</div>
              <div className="nx-v6-responsive-card">
                <span>State: {resolvedShellState.label} / {resolvedShellState.kind}</span>
                <span>
                  Behavior: {shellStateBehavior.persistent ? "persistent" : "transient"} /{" "}
                  {shellStateBehavior.autoDismissMs ? `${shellStateBehavior.autoDismissMs}ms` : "manual"}
                </span>
                <span>Layout: v{layout?.version ?? "local"} / {layout?.contentPriority ?? contract.desktopMode}</span>
                <span>Columns: {layout?.columns ?? 1} / min {layout?.minContentWidth ?? 560}px</span>
                <span>Chrome: {layout?.chrome ?? "full"} / motion {layout?.animationProfile ?? "standard"}</span>
                <span>Active panel: {activePanel?.title ?? "none"}</span>
                <span>Last command: {lastCommand?.title ?? "none"}</span>
                <span>Shortcuts: {contract.shortcuts.length || "none"}</span>
              </div>
            </div>
          </aside>
        ) : null}
      </div>

      <footer
        className="nx-v6-status-bar"
        aria-label={`${contract.title} Status`}
        aria-live={resolvedShellState.ariaLive}
        data-attention={shellStateBehavior.attention}
      >
        <div className="nx-v6-status-primary">
          <span data-tone={resolvedShellState.tone}>{resolvedShellState.label}</span>
          <strong>{resolvedShellState.title}</strong>
          <em>{resolvedShellState.description}</em>
        </div>
        <div className="nx-v6-status-chip-row" aria-label="View Signale">
          {statusChips.map((chip) => (
            <span key={chip.id} data-tone={chip.tone} title={chip.description}>
              {chip.label}
            </span>
          ))}
        </div>
      </footer>
    </section>
  );
}
