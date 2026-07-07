import React from "react";
import * as ReactDOMClient from "react-dom/client";
import "../globals.css";
import {
  UI_SMOKE_FIXTURE_ACCOUNT_SESSION,
  UI_SMOKE_FIXTURE_CONTROL_STATUS,
  UI_SMOKE_FIXTURE_GITHUB_PROJECT_OWNER,
  UI_SMOKE_FIXTURE_GITHUB_REPOSITORY,
  UI_SMOKE_FIXTURE_LONG_EDITOR_CODE,
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

const EDITOR_LANGUAGE_SMOKE_CASES = Object.freeze({
  "editor-scroll": {
    label: "TypeScript",
    grammarId: "typescript",
    fileName: "scroll-contract.ts",
    pathSuffix: "src\\scroll-contract.ts",
    code: UI_SMOKE_FIXTURE_LONG_EDITOR_CODE,
  },
  "editor-javascript": {
    label: "JavaScript",
    grammarId: "javascript",
    fileName: "language-contract.js",
    pathSuffix: "src\\language-contract.js",
    code: Array.from({ length: 90 }, (_, index) => {
      const line = String(index + 1).padStart(3, "0");
      return [
        `// Nexus Code JavaScript syntax contract ${line}`,
        `export function smokeJavaScript${line}(input, options = {}) {`,
        `  const nextValue = Number(input ?? ${index + 1});`,
        `  return nextValue > 42 ? "js-highlight-${line}" : options.label || String(nextValue);`,
        `}`,
      ].join("\n");
    }).join("\n"),
  },
  "editor-jsx": {
    label: "JavaScript",
    grammarId: "javascript",
    fileName: "LanguageCard.jsx",
    pathSuffix: "src\\components\\LanguageCard.jsx",
    code: Array.from({ length: 72 }, (_, index) => {
      const line = String(index + 1).padStart(3, "0");
      return [
        `// Nexus Code JSX syntax contract ${line}`,
        `export function LanguageCard${line}({ title, active }) {`,
        `  const label = title ?? "Card ${line}";`,
        `  return <section data-card="${line}" aria-current={active ? "page" : undefined}>`,
        `    <h2>{label}</h2><button type="button">{active ? "Open" : "Preview"}</button>`,
        `  </section>;`,
        `}`,
      ].join("\n");
    }).join("\n"),
  },
  "editor-json": {
    label: "JSON",
    grammarId: "json",
    fileName: "language-contract.json",
    pathSuffix: "config\\language-contract.json",
    code: `{
  "name": "nexus-code-language-contract",
  "enabled": true,
  "version": 1,
  "items": [
${Array.from({ length: 120 }, (_, index) => {
  const line = String(index + 1).padStart(3, "0");
  return `    { "id": ${index + 1}, "name": "json-highlight-${line}", "active": ${index % 2 === 0}, "tags": ["syntax", "json", "nexus"] }`;
}).join(",\n")}
  ]
}`,
  },
});

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
  const orderedMarkers = scenario.orderedMarkup || [];
  const orderedFailures = [];
  let previousIndex = -1;
  for (const marker of orderedMarkers) {
    const index = markup.indexOf(marker);
    if (index === -1) {
      orderedFailures.push(`missing ordered marker "${marker}"`);
      continue;
    }
    if (index < previousIndex) {
      orderedFailures.push(`ordered marker "${marker}" rendered out of order`);
    }
    previousIndex = index;
  }

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
    ...orderedFailures,
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

function assertTopbarDomContract(scenario) {
  if (!scenario.topbarContract) return [];

  const topbar = document.querySelector(".nx-code-titlebar");
  if (!topbar) return ["topbar contract missing .nx-code-titlebar"];

  const failures = [];
  const rect = topbar.getBoundingClientRect();
  const text = topbar.textContent || "";
  const iconButtons = topbar.querySelectorAll(".nx-code-titlebar-icon-button");
  const bulkyPanelText = [
    "GitHub Issues",
    "GitHub Projects",
    "Pull Requests",
    "Nexus Account",
    "No issues found",
    "No projects found",
  ];

  if (rect.height > 44) {
    failures.push(`topbar height ${Math.round(rect.height)}px exceeds compact contract`);
  }
  if (!topbar.querySelector(".nx-code-command-center")) {
    failures.push("topbar missing command center");
  }
  if (iconButtons.length < 2) {
    failures.push(`topbar has ${iconButtons.length} icon buttons, expected at least 2`);
  }
  failures.push(
    ...bulkyPanelText
      .filter((marker) => text.includes(marker))
      .map((marker) => `topbar includes bulky panel text "${marker}"`),
  );

  return failures;
}

function assertEditorScrollDomContract(scenario) {
  if (!scenario.editorScrollContract) return [];

  const shell = document.querySelector(".nx-code-editor-shell");
  const canvas = shell?.querySelector(".nx-code-editor-canvas");
  const scrollHost = shell?.querySelector(".cm-scroller, .nx-code-editor-fallback");
  const failures = [];

  if (!shell) return ["editor scroll contract missing editor shell"];
  if (!canvas) failures.push("editor scroll contract missing editor canvas");
  if (shell.dataset.editorEngine !== "codemirror") {
    failures.push(`editor engine is ${shell.dataset.editorEngine || "unknown"}, expected codemirror`);
  }
  if (!scrollHost) {
    failures.push("editor scroll contract missing .cm-scroller or fallback textarea");
    return failures;
  }

  const style = window.getComputedStyle(scrollHost);
  const overflowValue = `${style.overflow} ${style.overflowY}`;
  const scrollRange = scrollHost.scrollHeight - scrollHost.clientHeight;
  const originalScrollTop = scrollHost.scrollTop;
  scrollHost.scrollTop = 0;
  const beforeScrollTop = scrollHost.scrollTop;
  const probeScrollTop = Math.min(scrollRange, beforeScrollTop + 160);
  scrollHost.scrollTop = probeScrollTop;
  const afterScrollTop = scrollHost.scrollTop;
  scrollHost.scrollTop = originalScrollTop;

  if (!/(auto|scroll)/.test(overflowValue)) {
    failures.push(`editor scroll host overflow is "${overflowValue.trim()}"`);
  }
  if (scrollRange < 80) {
    failures.push(
      `editor scroll host has insufficient vertical range ${scrollHost.scrollHeight}x${scrollHost.clientHeight}`,
    );
  }
  if (scrollRange > 0 && afterScrollTop <= beforeScrollTop) {
    failures.push("editor scroll host did not accept scrollTop changes");
  }
  if (shell.getBoundingClientRect().height > scenario.viewport.height + 1) {
    failures.push("editor shell exceeds viewport height");
  }

  return failures;
}

function assertGithubFallbackDomContract(scenario) {
  if (!scenario.githubFallbackContract) return [];

  const frame = document.querySelector(
    `[data-ui-smoke-surface-frame="${scenario.surfaceId}"]`,
  );
  const text = frame?.textContent || "";
  const isProjects = scenario.githubFallbackContract === "projects";
  const requiredText = isProjects
    ? ["GitHub Projects", "Bridge offline", "Desktop bridge unavailable", "Refresh projects"]
    : ["GitHub Issues", "Bridge offline", "Desktop bridge unavailable", "Refresh issues"];
  const forbiddenText = [
    "Bridge ready",
    "Create issueUpdate selected issue",
    "Add issue or PR by node ID",
    "Update project field",
  ];

  if (!frame) return [`github ${scenario.githubFallbackContract} fallback missing frame`];
  return [
    ...requiredText
      .filter((marker) => !text.includes(marker))
      .map((marker) => `github ${scenario.githubFallbackContract} fallback missing "${marker}"`),
    ...forbiddenText
      .filter((marker) => text.includes(marker))
      .map((marker) => `github ${scenario.githubFallbackContract} fallback exposes ready UI "${marker}"`),
  ];
}

function assertVisualSmokeDomContracts(scenario) {
  return [
    ...assertTopbarDomContract(scenario),
    ...assertEditorScrollDomContract(scenario),
    ...assertGithubFallbackDomContract(scenario),
  ];
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
      topbarContract: true,
      requiredMarkup: [
        "nx-code-titlebar-wrap",
        "nx-code-titlebar",
        "nx-code-command-center",
        "nx-code-titlebar-icon-button",
        "nx-code-titlebar-overflow-button",
        "nx-code-menu-cluster",
        "nx-code-menu-compact-host",
        "nx-code-workbench-menu-trigger",
        "nx-code-side-panel",
        "nx-code-status-strip",
        "data-workbench-zone=\"side-panel\"",
        "data-workbench-dock-id=\"side-panel\"",
        "data-workbench-panel=\"explorer\"",
        "data-workbench-placement=\"side\"",
        "data-workbench-axis=\"horizontal\"",
        "data-workbench-zone=\"editor\"",
        "data-workbench-dock-id=\"editor\"",
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

  if (EDITOR_LANGUAGE_SMOKE_CASES[currentSurfaceId]) {
    const languageCase = EDITOR_LANGUAGE_SMOKE_CASES[currentSurfaceId];
    const [{ default: CodeEditor }, { DEFAULT_SETTINGS }] = await Promise.all([
      import("../components/editor/CodeEditor.jsx"),
      import("../pages/editor/editorShared.jsx"),
    ]);
    const settings = {
      ...createUiSmokeSettingsFixture(DEFAULT_SETTINGS),
      lsp_enabled: true,
      font_size: 14,
      line_height: 1.45,
      tab_size: 2,
      word_wrap: false,
    };

    return {
      id: `${currentSurfaceId}@${viewport.id}`,
      surfaceId: currentSurfaceId,
      viewport,
      expectedText: [languageCase.label, "CodeMirror"],
      editorScrollContract: true,
      requiredMarkup: [
        "nx-code-editor-shell",
        "nx-code-editor-canvas",
        "nx-code-editor-status",
        "data-editor-engine=\"codemirror\"",
        "data-editor-fallback=\"false\"",
        `data-cm-language-id="${languageCase.grammarId}"`,
      ],
      render: () =>
        renderInViewport(
          currentSurfaceId,
          viewport,
          <CodeEditor
            code={languageCase.code}
            fileName={languageCase.fileName}
            filePath={`${UI_SMOKE_FIXTURE_WORKSPACE_PATH}\\${languageCase.pathSuffix}`}
            workspacePath={UI_SMOKE_FIXTURE_WORKSPACE_PATH}
            onChange={noop}
            settings={settings}
            showLineNumbers
            tabSize={2}
            wordWrap={false}
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
      githubFallbackContract: "issues",
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

  if (currentSurfaceId === "github-projects") {
    const { default: GitHubWorkbenchPanel } = await import(
      "../components/editor/github/GitHubWorkbenchPanel.jsx"
    );
    return {
      id: `${currentSurfaceId}@${viewport.id}`,
      surfaceId: currentSurfaceId,
      viewport,
      primaryActions: [
        "Refresh projects",
        "Open Git panel",
        "Open account panel",
      ],
      githubFallbackContract: "projects",
      expectedText: [
        "GitHub Projects",
        "Bridge offline",
        "Owner / repository",
        "Scope",
        "Viewer",
        UI_SMOKE_FIXTURE_GITHUB_PROJECT_OWNER,
        "No projects found",
      ],
      requiredMarkup: [
        "nx-editor-panel-shell",
        "nx-editor-panel-header",
        "nx-editor-panel-actions",
        "nx-editor-panel-body",
        "nx-editor-panel-card",
        "placeholder=\"owner or owner/repo\"",
      ],
      render: () =>
        renderInViewport(
          currentSurfaceId,
          viewport,
          <GitHubWorkbenchPanel
            panelId="projects"
            workspacePath={UI_SMOKE_FIXTURE_WORKSPACE_PATH}
            accountSession={UI_SMOKE_FIXTURE_ACCOUNT_SESSION}
            initialRepository={UI_SMOKE_FIXTURE_GITHUB_PROJECT_OWNER}
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
  const markupResult = assertVisualSmokeMarkup(scenario, rootElement.innerHTML);
  const contractFailures = assertVisualSmokeDomContracts(scenario);
  const missing = [...markupResult.missing, ...contractFailures];
  setReady({
    ...markupResult,
    ok: missing.length === 0,
    missing,
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
