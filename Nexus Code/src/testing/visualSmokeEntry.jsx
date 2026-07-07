import React from "react";
import * as ReactDOMClient from "react-dom/client";
import "../globals.css";
import {
  UI_SMOKE_FIXTURE_ACCOUNT_SESSION,
  UI_SMOKE_FIXTURE_CONTROL_STATUS,
  UI_SMOKE_FIXTURE_GITHUB_REPOSITORY,
  UI_SMOKE_FIXTURE_LONG_LABELS,
  UI_SMOKE_FIXTURE_WORKSPACE_PATH,
  createUiSmokeCallbacks,
  createUiSmokeSettingsFixture,
} from "./uiSmokeFixtures.js";
import "./visualSmoke.css";

const noop = () => {};
const params = new URLSearchParams(window.location.search);
const surfaceId = params.get("surface") || "workbench-shell";
const viewportId = params.get("viewport") || "desktop";
const rootElement = document.getElementById("root");
const createRoot = ReactDOMClient.createRoot || ReactDOMClient.default?.createRoot;
const root = createRoot(rootElement);

document.documentElement.classList.add("reduce-motion");
document.body.classList.add("nx-code-visual-smoke-body");

const VIEWPORTS = Object.freeze([
  { id: "desktop", width: 1440, height: 900 },
  { id: "tablet", width: 1024, height: 768 },
  { id: "short-wide", width: 900, height: 512 },
  { id: "phone-portrait", width: 390, height: 900 },
]);

function SmokeViewport({ viewport, surfaceId: currentSurfaceId, children }) {
  return (
    <section
      className="nx-code-shell nx-code-visual-smoke-root"
      data-ui-smoke-root="nexus-code"
      data-ui-smoke-surface={currentSurfaceId}
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
        data-ui-smoke-surface-frame={currentSurfaceId}
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

function renderInViewport(currentSurfaceId, viewport, children) {
  return (
    <SmokeViewport viewport={viewport} surfaceId={currentSurfaceId}>
      {children}
    </SmokeViewport>
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

function assertVisualSmokeMarkup(scenario, markup) {
  const expectedAttributes = [
    ["data-ui-smoke-root", "nexus-code"],
    ["data-ui-smoke-surface", scenario.surfaceId],
    ["data-ui-smoke-surface-frame", scenario.surfaceId],
    ["data-ui-smoke-viewport", scenario.viewport.id],
    ["data-ui-smoke-width", String(scenario.viewport.width)],
    ["data-ui-smoke-height", String(scenario.viewport.height)],
  ];

  const failures = [
    ...expectedAttributes
      .filter(([name, value]) => !markup.includes(`${name}="${value}"`))
      .map(([name, value]) => `missing ${name}="${value}"`),
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
    bytes: new TextEncoder().encode(markup).length,
    buttons: buttonResult.count,
    viewport: `${scenario.viewport.width}x${scenario.viewport.height}`,
  };
}

function PanelChromeSmokeSurface({ components }) {
  const {
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
  } = components;

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

function setReady(result) {
  window.__NEXUS_CODE_VISUAL_SMOKE_RESULT__ = result;
  window.__NEXUS_CODE_VISUAL_SMOKE_READY__ = true;
  document.body.dataset.visualSmokeReady = result.ok ? "ok" : "failed";
}

function renderError(error, viewport) {
  const message = error?.stack || error?.message || String(error);
  root.render(
    renderInViewport(
      surfaceId,
      viewport,
      <div className="nexus-code-visual-smoke-error">
        <h1>Visual smoke scenario failed</h1>
        <p>{surfaceId}@{viewport.id}</p>
        <pre>{message}</pre>
      </div>,
    ),
  );
}

function configureViewport(viewport) {
  document.title = `Nexus Code Visual Smoke - ${surfaceId}@${viewport.id}`;
  document.documentElement.style.width = `${viewport.width}px`;
  document.documentElement.style.height = `${viewport.height}px`;
  document.body.style.width = `${viewport.width}px`;
  document.body.style.height = `${viewport.height}px`;
}

function applyUseStateOverrides(overrides = []) {
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

async function buildScenario(currentSurfaceId, viewport) {
  const callbacks = createUiSmokeCallbacks();
  const accountPanelCallbacks = {
    onSaveSession: callbacks.onSaveAccountSession,
    onClearSession: callbacks.onClearAccountSession,
    onTestConnection: callbacks.onTestAccountConnection,
  };

  if (currentSurfaceId === "workbench-shell") {
    const { default: Editor } = await import("../pages/Editor.jsx");
    return {
      id: `${currentSurfaceId}@${viewport.id}`,
      surfaceId: currentSurfaceId,
      viewport,
      primaryActions: ["Neue Datei", "Projekt oeffnen", "Einrichtung"],
      expectedText: ["nx-code-shell", "nx-code-workbench", "Nexus Code", "Neue Datei"],
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
      render: () =>
        renderInViewport(
          currentSurfaceId,
          viewport,
          <Editor
            accountSession={UI_SMOKE_FIXTURE_ACCOUNT_SESSION}
            controlStatus={UI_SMOKE_FIXTURE_CONTROL_STATUS}
            {...callbacks}
          />,
        ),
    };
  }

  if (currentSurfaceId === "launchpad") {
    const { default: WelcomeScreen } = await import("../components/editor/WelcomeScreen.jsx");
    return {
      id: `${currentSurfaceId}@${viewport.id}`,
      surfaceId: currentSurfaceId,
      viewport,
      primaryActions: ["Neue Datei", "Projekt oeffnen", "Einrichtung"],
      expectedText: [
        "nx-code-launchpad",
        "Produktive Flows",
        "Schnellstart",
        "Lokale Bearbeitung",
      ],
      requiredMarkup: [
        "nx-code-welcome",
        "nx-code-launchpad",
        "nx-code-launchpad-header",
        "nx-code-launchpad-action",
        "nx-code-launchpad-recent",
        "nx-code-launchpad-flow",
      ],
      render: () =>
        renderInViewport(
          currentSurfaceId,
          viewport,
          <WelcomeScreen
            onNewFile={noop}
            onOpenFolder={noop}
            onOpenSettings={noop}
          />,
        ),
    };
  }

  if (currentSurfaceId === "account-panel") {
    const { default: AccountPanel } = await import("../components/editor/AccountPanel.jsx");
    return {
      id: `${currentSurfaceId}@${viewport.id}`,
      surfaceId: currentSurfaceId,
      viewport,
      primaryActions: ["Hosted API", "Local API", "Test", "Save", "Clear", "Logout"],
      longLabels: UI_SMOKE_FIXTURE_LONG_LABELS,
      expectedText: [
        "Nexus Account",
        "UI smoke control fixture with long account status label",
        "Identity",
        "Session",
        "Ready",
      ],
      requiredMarkup: [
        "nx-editor-panel-shell",
        "nx-editor-panel-header",
        "nx-editor-panel-body",
        "nx-editor-panel-footer",
      ],
      render: () =>
        renderInViewport(
          currentSurfaceId,
          viewport,
          <AccountPanel
            session={UI_SMOKE_FIXTURE_ACCOUNT_SESSION}
            controlStatus={UI_SMOKE_FIXTURE_CONTROL_STATUS}
            {...accountPanelCallbacks}
          />,
        ),
    };
  }

  if (currentSurfaceId === "settings-panel") {
    const [{ default: SettingsPanel }, { DEFAULT_SETTINGS }] = await Promise.all([
      import("../components/editor/SettingsPanel.jsx"),
      import("../pages/editor/editorShared.jsx"),
    ]);
    const settings = createUiSmokeSettingsFixture(DEFAULT_SETTINGS);
    return {
      id: `${currentSurfaceId}@${viewport.id}`,
      surfaceId: currentSurfaceId,
      viewport,
      primaryActions: ["Zurueck"],
      reactUseStateOverrides: [{ initialState: "theme-editor", value: "workbench" }],
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
      render: () =>
        renderInViewport(
          currentSurfaceId,
          viewport,
          <SettingsPanel
            settings={settings}
            onSettingsChange={noop}
            onResetSettings={noop}
            onClose={noop}
          />,
        ),
    };
  }

  if (currentSurfaceId === "panel-chrome") {
    const panelChrome = await import("../components/editor/panels/PanelChrome.jsx");
    return {
      id: `${currentSurfaceId}@${viewport.id}`,
      surfaceId: currentSurfaceId,
      viewport,
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
      render: () =>
        renderInViewport(
          currentSurfaceId,
          viewport,
          <PanelChromeSmokeSurface components={panelChrome} />,
        ),
    };
  }

  if (currentSurfaceId === "github-workbench") {
    const { default: GitHubWorkbenchPanel } = await import(
      "../components/editor/github/GitHubWorkbenchPanel.jsx"
    );
    return {
      id: `${currentSurfaceId}@${viewport.id}`,
      surfaceId: currentSurfaceId,
      viewport,
      primaryActions: [
        "Refresh issues",
        "Open Git panel",
        "Open account panel",
      ],
      expectedText: [
        "GitHub Issues",
        "offline",
        "Repository",
        UI_SMOKE_FIXTURE_GITHUB_REPOSITORY,
        "Bridge offline",
        "No issues found",
      ],
      requiredMarkup: [
        "nx-editor-panel-shell",
        "nx-editor-panel-header",
        "nx-editor-panel-actions",
        "nx-editor-panel-body",
        "nx-editor-panel-card",
        "placeholder=\"owner/repo\"",
      ],
      render: () =>
        renderInViewport(
          currentSurfaceId,
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
    };
  }

  throw new Error(`unknown visual smoke surface: ${currentSurfaceId}`);
}

async function settleFrame() {
  await new Promise((resolve) => requestAnimationFrame(resolve));
  await new Promise((resolve) => requestAnimationFrame(resolve));
  if (document.fonts?.ready) {
    await Promise.race([
      document.fonts.ready.catch(() => {}),
      new Promise((resolve) => window.setTimeout(resolve, 500)),
    ]);
  }
}

async function waitForRenderedScenario(scenario, timeoutMs = 8_000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const smokeRoot = rootElement.querySelector('[data-ui-smoke-root="nexus-code"]');
    const surfaceFrame = rootElement.querySelector(
      `[data-ui-smoke-surface-frame="${scenario.surfaceId}"]`,
    );
    const textLength = rootElement.innerText?.trim()?.length || 0;
    if (smokeRoot && surfaceFrame && textLength > 0) return;
    await new Promise((resolve) => window.setTimeout(resolve, 50));
  }
}

async function main() {
  const viewport = VIEWPORTS.find((candidate) => candidate.id === viewportId);
  if (!viewport) {
    throw new Error(`unknown visual smoke viewport: ${viewportId}`);
  }

  configureViewport(viewport);
  const scenario = await buildScenario(surfaceId, viewport);
  const cleanup = applyUseStateOverrides(scenario.reactUseStateOverrides);

  root.render(
    <div
      data-visual-smoke-shell="nexus-code"
      data-visual-smoke-scenario={scenario.id}
    >
      {scenario.render()}
    </div>,
  );

  window.addEventListener(
    "beforeunload",
    () => {
      cleanup?.();
    },
    { once: true },
  );

  await settleFrame();
  await waitForRenderedScenario(scenario);
  const result = assertVisualSmokeMarkup(scenario, rootElement.innerHTML);
  setReady({
    ...result,
    surfaceId: scenario.surfaceId,
    scenarioId: scenario.id,
  });
  cleanup?.();
}

main().catch(async (error) => {
  const viewport =
    VIEWPORTS.find((candidate) => candidate.id === viewportId) || VIEWPORTS[0];
  configureViewport(viewport);
  renderError(error, viewport);
  await settleFrame();
  setReady({
    ok: false,
    missing: [error?.message || String(error)],
    bytes: new TextEncoder().encode(rootElement.innerHTML).length,
    buttons: 0,
    viewport: `${viewport.width}x${viewport.height}`,
    surfaceId,
    scenarioId: `${surfaceId}@${viewport.id}`,
  });
});
