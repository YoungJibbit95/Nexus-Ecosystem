import React from "react";
import AccountPanel from "../components/editor/AccountPanel.jsx";
import GitHubWorkbenchPanel from "../components/editor/github/GitHubWorkbenchPanel.jsx";
import {
  PanelActionButton,
  PanelBadge,
  PanelBody,
  PanelCard,
  PanelFooter,
  PanelHeader,
  PanelMetric,
  PanelNotice,
  PanelSection,
  PanelShell,
  PanelState,
} from "../components/editor/panels/PanelChrome.jsx";
import SettingsPanel from "../components/editor/SettingsPanel.jsx";
import WelcomeScreen from "../components/editor/WelcomeScreen.jsx";
import Editor from "../pages/Editor.jsx";
import { DEFAULT_SETTINGS } from "../pages/editor/editorShared.jsx";
import {
  UI_SMOKE_FIXTURE_ACCOUNT_SESSION,
  UI_SMOKE_FIXTURE_CONTROL_STATUS,
  UI_SMOKE_FIXTURE_GITHUB_REPOSITORY,
  UI_SMOKE_FIXTURE_LONG_LABELS,
  UI_SMOKE_FIXTURE_WORKSPACE_PATH,
  createUiSmokeSettingsFixture,
  createUiSmokeCallbacks,
} from "./uiSmokeFixtures";

const noop = () => {};

const UI_SMOKE_VIEWPORTS = Object.freeze([
  { id: "desktop", width: 1440, height: 900 },
  { id: "tablet", width: 1024, height: 768 },
  { id: "short-wide", width: 900, height: 512 },
  { id: "phone-portrait", width: 390, height: 900 },
]);

function SmokeViewport({ viewport, surfaceId, children }) {
  return (
    <section
      data-ui-smoke-root="nexus-code"
      data-ui-smoke-surface={surfaceId}
      data-ui-smoke-viewport={viewport.id}
      data-ui-smoke-width={viewport.width}
      data-ui-smoke-height={viewport.height}
      style={{
        width: viewport.width,
        height: viewport.height,
        minWidth: viewport.width,
        maxWidth: viewport.width,
        minHeight: viewport.height,
        maxHeight: viewport.height,
        overflow: "hidden",
        color: "var(--nexus-text, #e5e7eb)",
        background: "#050712",
      }}
    >
      <div
        data-ui-smoke-surface-frame={surfaceId}
        style={{
          width: "100%",
          height: "100%",
          minWidth: 0,
          minHeight: 0,
          display: "flex",
          overflow: "hidden",
        }}
      >
        {children}
      </div>
    </section>
  );
}

function renderInViewport(surfaceId, viewport, children) {
  return (
    <SmokeViewport viewport={viewport} surfaceId={surfaceId}>
      {children}
    </SmokeViewport>
  );
}

function PanelChromeSmokeSurface() {
  return (
    <PanelShell
      ariaLabel="PanelChrome smoke surface"
      className="nx-code-panelchrome-smoke"
    >
      <PanelHeader
        title="UI Smoke PanelChrome"
        subtitle="Chrome guard keeps shared panel markup stable."
        status={<PanelBadge tone="success">Ready</PanelBadge>}
        actions={
          <PanelActionButton tone="accent" onClick={noop}>
            Retry action
          </PanelActionButton>
        }
      />
      <PanelBody className="px-3 py-3">
        <PanelCard className="p-3">
          <div className="grid gap-2">
            <PanelMetric label="Panel metric" value="stable" tone="accent" />
            <PanelNotice
              title="Fixture notice"
              detail="Shared panel notice markup renders without App boot."
              tone="teal"
            />
            <PanelSection title="Chrome section" onToggle={noop}>
              <PanelState
                title="Fallback state"
                detail="Panel state guard stays visible in SSR."
                compact
              />
            </PanelSection>
          </div>
        </PanelCard>
      </PanelBody>
      <PanelFooter>
        <span>Panel footer guard</span>
      </PanelFooter>
    </PanelShell>
  );
}

export const UI_SMOKE_HARNESS_METADATA = Object.freeze({
  testOnly: true,
  scope: "Nexus Code/src/testing",
  importsProductionBoot: false,
  viewports: UI_SMOKE_VIEWPORTS,
});

export function prepareUiSmokeScenario(scenario) {
  const overrides = scenario.reactUseStateOverrides || [];
  if (overrides.length === 0) return null;

  const originalUseState = React.useState;
  React.useState = (initialState) => {
    const override = overrides.find((candidate) =>
      Object.is(candidate.initialState, initialState),
    );
    return originalUseState(override ? override.value : initialState);
  };

  return () => {
    React.useState = originalUseState;
  };
}

export function createUiSmokeScenarios() {
  const callbacks = createUiSmokeCallbacks();
  const settings = createUiSmokeSettingsFixture(DEFAULT_SETTINGS);
  const accountPanelCallbacks = {
    onSaveSession: callbacks.onSaveAccountSession,
    onClearSession: callbacks.onClearAccountSession,
    onTestConnection: callbacks.onTestAccountConnection,
  };

  const surfaces = [
    {
      id: "workbench-shell",
      title: "Workbench shell with account fixture",
      primaryActions: [
        "New scratch file",
        "Open project folder",
        "Tune editor setup",
      ],
      expectedText: [
        "nx-code-shell",
        "nx-code-workbench",
        "Nexus Code",
        "New scratch file",
      ],
      requiredMarkup: [
        "nx-code-titlebar-wrap",
        "nx-code-side-panel",
        "nx-code-status-strip",
        "data-workbench-zone=\"side-panel\"",
        "data-workbench-dock-id=\"side-panel\"",
        "data-workbench-panel=\"explorer\"",
        "data-workbench-placement=\"side\"",
        "data-workbench-axis=\"horizontal\"",
        "data-workbench-zone=\"editor\"",
        "data-workbench-dock-id=\"editor\"",
        "aria-label=\"Side panel width\"",
      ],
      render: (viewport) =>
        renderInViewport(
          "workbench-shell",
          viewport,
          <Editor
            accountSession={UI_SMOKE_FIXTURE_ACCOUNT_SESSION}
            controlStatus={UI_SMOKE_FIXTURE_CONTROL_STATUS}
            {...callbacks}
          />,
        ),
    },
    {
      id: "launchpad",
      title: "Launchpad welcome surface",
      primaryActions: [
        "New scratch file",
        "Open project folder",
        "Tune editor setup",
      ],
      expectedText: [
        "nx-code-launchpad",
        "Productive flows",
        "Ready surfaces",
        "Local editing with terminal",
      ],
      requiredMarkup: [
        "nx-code-welcome",
        "nx-code-launchpad",
        "nx-code-launchpad-header",
        "nx-code-launchpad-action",
        "nx-code-launchpad-recent",
        "nx-code-launchpad-flow",
        "nx-code-launchpad-languages",
      ],
      render: (viewport) =>
        renderInViewport(
          "launchpad",
          viewport,
          <WelcomeScreen
            onNewFile={noop}
            onOpenFolder={noop}
            onOpenSettings={noop}
          />,
        ),
    },
    {
      id: "account-panel",
      title: "Account panel with strict-ready fixture",
      primaryActions: [
        "Hosted API",
        "Local API",
        "Test",
        "Save",
        "Clear",
        "Logout",
      ],
      longLabels: UI_SMOKE_FIXTURE_LONG_LABELS,
      expectedText: [
        "Nexus Account",
        "UI smoke control fixture with long account status label",
        "Identity",
        "Token",
        "Present",
      ],
      requiredMarkup: [
        "nx-editor-panel-shell",
        "nx-editor-panel-header",
        "nx-editor-panel-body",
        "nx-editor-panel-footer",
      ],
      render: (viewport) =>
        renderInViewport(
          "account-panel",
          viewport,
          <AccountPanel
            session={UI_SMOKE_FIXTURE_ACCOUNT_SESSION}
            controlStatus={UI_SMOKE_FIXTURE_CONTROL_STATUS}
            {...accountPanelCallbacks}
          />,
        ),
    },
    {
      id: "settings-panel",
      title: "Settings panel with deterministic fixture",
      primaryActions: ["Zurueck"],
      reactUseStateOverrides: [
        { initialState: "theme-editor", value: "workbench" },
      ],
      expectedText: [
        "nx-code-settings-panel",
        "Einstellungen",
        "Workbench",
        "Panel Background",
        "Auto Save",
      ],
      requiredMarkup: [
        "nx-code-settings-panel",
        "nx-code-settings-nav",
        "nx-code-settings-content",
        "Workbench",
      ],
      render: (viewport) =>
        renderInViewport(
          "settings-panel",
          viewport,
          <SettingsPanel
            settings={settings}
            onSettingsChange={noop}
            onResetSettings={noop}
            onClose={noop}
          />,
        ),
    },
    {
      id: "panel-chrome",
      title: "Shared PanelChrome surface",
      primaryActions: ["Retry action"],
      expectedText: [
        "UI Smoke PanelChrome",
        "Chrome guard keeps shared panel markup stable.",
        "Ready",
        "Panel metric",
        "Fixture notice",
        "Fallback state",
        "Panel footer guard",
      ],
      requiredMarkup: [
        "nx-code-panelchrome-smoke",
        "nx-editor-panel-shell",
        "nx-editor-panel-header",
        "nx-editor-panel-actions",
        "nx-editor-panel-body",
        "nx-editor-panel-footer",
        "nx-editor-panel-card",
        "nx-editor-panel-section",
        "nx-editor-panel-state",
      ],
      render: (viewport) =>
        renderInViewport(
          "panel-chrome",
          viewport,
          <PanelChromeSmokeSurface />,
        ),
    },
    {
      id: "github-workbench",
      title: "GitHub workbench panel without desktop bridge",
      primaryActions: [
        "Refresh issues",
        "Open Git panel",
        "Open account panel",
        "Create issue",
      ],
      expectedText: [
        "GitHub Issues",
        "Triage, create, and edit repository issues.",
        "offline",
        "Repository",
        UI_SMOKE_FIXTURE_GITHUB_REPOSITORY,
        "Bridge offline",
        "No issues found",
        "Create issue",
      ],
      requiredMarkup: [
        "nx-editor-panel-shell",
        "nx-editor-panel-header",
        "nx-editor-panel-actions",
        "nx-editor-panel-body",
        "nx-editor-panel-card",
        "placeholder=\"owner/repo\"",
      ],
      render: (viewport) =>
        renderInViewport(
          "github-workbench",
          viewport,
          <GitHubWorkbenchPanel
            panelId="issues"
            workspacePath={UI_SMOKE_FIXTURE_WORKSPACE_PATH}
            accountSession={UI_SMOKE_FIXTURE_ACCOUNT_SESSION}
            initialRepository={UI_SMOKE_FIXTURE_GITHUB_REPOSITORY}
            onOpenGit={noop}
            onOpenAccount={noop}
          />,
        ),
    },
  ];

  return UI_SMOKE_VIEWPORTS.flatMap((viewport) =>
    surfaces.map((surface) => ({
      ...surface,
      id: `${surface.id}@${viewport.id}`,
      surfaceId: surface.id,
      viewport,
      title: `${surface.title} (${viewport.width}x${viewport.height})`,
      render: () => surface.render(viewport),
    })),
  );
}

function stripTags(value) {
  return String(value || "")
    .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
    .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function readAttribute(attributes, name) {
  const pattern = new RegExp(`${name}="([^"]*)"`);
  const match = pattern.exec(attributes);
  return match?.[1] || "";
}

function assertButtonLabels(markup) {
  const failures = [];
  const buttonPattern = /<button\b([^>]*)>([\s\S]*?)<\/button>/gi;
  let match;
  let index = 0;

  while ((match = buttonPattern.exec(markup))) {
    index += 1;
    const attributes = match[1] || "";
    const content = match[2] || "";
    const visibleText = stripTags(content);
    const role = readAttribute(attributes, "role");
    const ariaChecked = readAttribute(attributes, "aria-checked");
    const accessibleText =
      visibleText ||
      readAttribute(attributes, "aria-label") ||
      readAttribute(attributes, "title");

    if (!accessibleText && !(role === "switch" && ariaChecked)) {
      const className = readAttribute(attributes, "class") || "without class";
      failures.push(`button ${index} has no text, title or aria-label (${className})`);
    }
  }

  return { failures, count: index };
}

function assertSmokeAttributes(scenario, markup) {
  const expectedAttributes = [
    ["data-ui-smoke-root", "nexus-code"],
    ["data-ui-smoke-surface", scenario.surfaceId],
    ["data-ui-smoke-surface-frame", scenario.surfaceId],
    ["data-ui-smoke-viewport", scenario.viewport.id],
    ["data-ui-smoke-width", String(scenario.viewport.width)],
    ["data-ui-smoke-height", String(scenario.viewport.height)],
  ];

  return expectedAttributes
    .filter(([name, value]) => !markup.includes(`${name}="${value}"`))
    .map(([name, value]) => `missing ${name}="${value}"`);
}

export function assertUiSmokeMarkup(scenario, markup) {
  const failures = [
    ...assertSmokeAttributes(scenario, markup),
    ...(scenario.expectedText || [])
      .filter((marker) => !markup.includes(marker))
      .map((marker) => `missing text "${marker}"`),
    ...(scenario.primaryActions || [])
      .filter((label) => !markup.includes(label))
      .map((label) => `missing primary action "${label}"`),
    ...(scenario.longLabels || [])
      .filter((label) => !markup.includes(label))
      .map((label) => `missing long fixture label "${label}"`),
    ...(scenario.requiredMarkup || [])
      .filter((marker) => !markup.includes(marker))
      .map((marker) => `missing markup guard "${marker}"`),
  ];
  const buttonResult = assertButtonLabels(markup);
  failures.push(...buttonResult.failures);

  return {
    ok: failures.length === 0,
    missing: failures,
    bytes: Buffer.byteLength(markup, "utf8"),
    buttons: buttonResult.count,
    viewport: `${scenario.viewport.width}x${scenario.viewport.height}`,
  };
}
