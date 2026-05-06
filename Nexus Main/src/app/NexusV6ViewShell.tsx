import React from "react";
import {
  getNexusViewManifest,
  getNexusViewManifests,
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
    .slice(0, 4);

export function NexusV6ViewShell({
  viewId,
  availableViews,
  active,
  reducedMotion,
  onRequestViewChange,
  onPrefetchView,
  children,
}: Props) {
  const contract = React.useMemo(() => resolveViewContract(viewId), [viewId]);
  const relatedViews = React.useMemo(
    () => sameCategoryViews(viewId, availableViews, contract),
    [availableViews, contract, viewId],
  );
  const [inspectorOpen, setInspectorOpen] = React.useState(false);
  const [focusMode, setFocusMode] = React.useState(false);
  const [activePanelId, setActivePanelId] = React.useState(
    contract.panels[0]?.id ?? null,
  );

  React.useEffect(() => {
    setActivePanelId(contract.panels[0]?.id ?? null);
    setInspectorOpen(false);
    setFocusMode(false);
  }, [contract.id, contract.panels]);

  const primaryAction =
    contract.actions.find((action) => action.id === contract.defaultActionId) ??
    contract.actions.find((action) => action.placement === "primary") ??
    null;
  const toolbarActions = contract.actions
    .filter((action) => action.id !== primaryAction?.id)
    .slice(0, 3);

  return (
    <section
      className="nx-v6-view-shell"
      data-view={viewId}
      data-active={active ? "true" : "false"}
      data-focus={focusMode ? "true" : "false"}
      data-inspector={inspectorOpen ? "open" : "closed"}
      data-reduced-motion={reducedMotion ? "true" : "false"}
      style={{ ["--nx-v6-view-accent" as any]: contract.accent }}
    >
      <header className="nx-v6-view-header">
        <div className="nx-v6-title-cluster">
          <div className="nx-v6-eyebrow">
            Nexus v6 / {contract.category} / {contract.desktopMode}
          </div>
          <div className="nx-v6-title-row">
            <span className="nx-v6-orb" aria-hidden="true" />
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
            ) : (
              <span className="nx-v6-quick-nav-empty">
                Lokaler View
              </span>
            )}
          </div>
        </div>

        <div className="nx-v6-header-actions" aria-label="v6 View Actions">
          {primaryAction ? (
            <button
              type="button"
              className="nx-v6-action nx-v6-action--primary"
              title={primaryAction.shortcut || primaryAction.intent}
              onClick={() => setInspectorOpen(true)}
            >
              {primaryAction.title}
            </button>
          ) : null}
          {toolbarActions.map((action) => (
            <button
              key={action.id}
              type="button"
              className="nx-v6-action"
              title={action.shortcut || action.intent}
              onClick={() => setInspectorOpen(true)}
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
            {focusMode ? "Chrome anzeigen" : "Fokus"}
          </button>
          <button
            type="button"
            className="nx-v6-action"
            aria-pressed={inspectorOpen}
            onClick={() => setInspectorOpen((next) => !next)}
          >
            Inspector
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
                {contract.panels.length > 0 ? (
                  contract.panels.map((panel) => (
                    <button
                      key={panel.id}
                      type="button"
                      className={panel.id === activePanelId ? "is-active" : undefined}
                      onClick={() => setActivePanelId(panel.id)}
                    >
                      <strong>{panel.title}</strong>
                      <span>{panel.placement} / {panel.mobilePresentation}</span>
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
                {contract.statusSignals.map((signal) => (
                  <span key={signal}>{signal}</span>
                ))}
              </div>
            </div>

            <div className="nx-v6-inspector-section">
              <div className="nx-v6-section-label">Responsive</div>
              <div className="nx-v6-responsive-card">
                <span>Desktop: {contract.desktopMode}</span>
                <span>Mobile: {contract.mobileMode}</span>
                <span>Shortcuts: {contract.shortcuts.length || "none"}</span>
              </div>
            </div>
          </aside>
        ) : null}
      </div>
    </section>
  );
}
