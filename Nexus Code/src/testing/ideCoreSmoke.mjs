import assert from "node:assert/strict";

import {
  ACCOUNT_AUTH_MODES,
  createLocalAccountSession,
  getAccountSessionState,
  normalizeAccountSession,
} from "../app/accountSession.js";
import {
  createFileTreeItems,
  createFileNodesFromEntries,
  createFileTreeModel,
  getFileExtension,
  getFileTreeDisplayState,
  getFileTreeVirtualWindow,
  mergeFileTreeRefreshNode,
} from "../pages/editor/fileTreeModel.js";
import {
  getBottomPanelClassName,
  getSidePanelStyle,
} from "../pages/editor/editorShellLayout.js";
import {
  createSpotlightResults,
  getEditorCommandPaletteCommands,
  groupCommandPaletteItems,
  rankCommandPaletteItems,
  rankSpotlightFiles,
  rankSpotlightSymbols,
} from "../pages/editor/commandPaletteModel.js";
import {
  createEditorCommandRegistry,
  createEditorScopeInfo,
  createSnippetCompletions,
  extractDocumentSymbols,
  getActiveDocumentSymbol,
  lspCompletionsToCodeMirror,
  shouldRequestLspCompletion,
} from "../pages/editor/editorFeatureModel.js";
import {
  collectExtensionContributions,
  createExtensionCommandPaletteEntries,
  createDefaultExtensionRecords,
  createExtensionRuntimeSnapshot,
  filterExtensions,
  getExtensionRuntimeOverview,
  resolveExtensions,
} from "../pages/editor/extensionSystem.js";
import {
  classifyGithubPlatformError,
  formatGithubPlatformError,
  getGithubCapabilityStatus,
  getGithubRepositoryError,
  normalizeGithubRepositoryInput,
} from "../pages/editor/githubWorkbenchModel.js";
import {
  DEFAULT_WORKBENCH_LAYOUT,
  WORKBENCH_CUSTOM_PRESET_ID,
  WORKBENCH_DOCK_ZONE_SEQUENCE,
  WORKBENCH_PANEL_IDS,
  WORKBENCH_PANEL_PLACEMENTS,
  WORKBENCH_SNAP_ZONES,
  getBottomPanelStyle,
  getLayoutDropPreview,
  getVisiblePanelId,
  getWorkbenchPanelSnapZone,
  getWorkbenchZonePanelIds,
  movePanelToZone,
  normalizeWorkbenchDockState,
  normalizeWorkbenchLayout,
} from "../pages/editor/workbenchDockModel.js";

function getNodeRowNames(model) {
  return model.rows
    .filter((row) => row.kind === "node")
    .map((row) => row.node.name);
}

function getRowById(model, id) {
  return model.rows.find((row) => row.id === id);
}

function createRootFiles(count) {
  return Array.from({ length: count }, (_, index) => ({
    id: `file-${index}`,
    name: `item-${String(index).padStart(2, "0")}.js`,
    type: "file",
  }));
}

function getPlacementForSnapZone(zone) {
  if (zone === WORKBENCH_SNAP_ZONES.bottom) {
    return WORKBENCH_PANEL_PLACEMENTS.bottom;
  }
  if (zone === WORKBENCH_SNAP_ZONES.hidden) {
    return WORKBENCH_PANEL_PLACEMENTS.hidden;
  }
  return WORKBENCH_PANEL_PLACEMENTS.side;
}

function createCompletionContext(text, { pos = text.length, explicit = false } = {}) {
  return {
    pos,
    explicit,
    state: {
      sliceDoc(from, to) {
        return text.slice(from, to);
      },
    },
    matchBefore(pattern) {
      const flags = pattern.flags.replace("g", "");
      const matcher = new RegExp(`${pattern.source}$`, flags);
      const match = text.slice(0, pos).match(matcher);
      if (!match) return null;
      const value = match[0];
      return {
        from: pos - value.length,
        to: pos,
        text: value,
      };
    },
  };
}

function assertWorkbenchLayoutInvariants(layout) {
  const normalized = normalizeWorkbenchLayout(layout);
  const seen = new Map();

  for (const zone of WORKBENCH_DOCK_ZONE_SEQUENCE) {
    const panelIds = normalized.zonePanelIds[zone];
    assert.ok(Array.isArray(panelIds), `${zone} zone should be an array`);

    for (const panelId of panelIds) {
      assert.ok(
        WORKBENCH_PANEL_IDS.includes(panelId),
        `${zone} contains unknown panel ${panelId}`,
      );
      assert.equal(
        seen.has(panelId),
        false,
        `${panelId} appears in both ${seen.get(panelId)} and ${zone}`,
      );
      seen.set(panelId, zone);
      assert.equal(normalized.panelZones[panelId], zone);
      assert.equal(
        normalized.panelPlacements[panelId],
        getPlacementForSnapZone(zone),
      );
    }
  }

  assert.deepEqual(
    [...seen.keys()].sort(),
    [...WORKBENCH_PANEL_IDS].sort(),
  );
  return normalized;
}

const scenarios = [
  {
    id: "file-tree-sort-order",
    title: "folders first, files by section group then extension",
    run() {
      const model = createFileTreeModel([
        { id: "file-ts", name: "zeta.ts", type: "file" },
        { id: "folder-src", name: "src", type: "folder" },
        { id: "file-js-b", name: "beta.js", type: "file" },
        { id: "file-bare", name: "README", type: "file" },
        { id: "folder-docs", name: "docs", type: "folder" },
        { id: "file-js-a", name: "alpha.js", type: "file" },
        { id: "file-json", name: "package.json", type: "file" },
        { id: "file-md", name: "guide.md", type: "file" },
      ]);

      assert.deepEqual(getNodeRowNames(model), [
        "docs",
        "src",
        "alpha.js",
        "beta.js",
        "zeta.ts",
        "package.json",
        "guide.md",
        "README",
      ]);
      assert.equal(model.stats.folders, 2);
      assert.equal(model.stats.files, 6);
    },
  },
  {
    id: "file-tree-entry-normalization",
    title: "entries dedupe ids and preserve refresh state",
    run() {
      const srcPath = "C:\\work\\src";
      const filePath = "C:\\work\\src\\index.ts";
      const previousById = new Map([
        [`fs_${srcPath}`, { id: `fs_${srcPath}`, type: "folder", isOpen: true }],
        [
          `fs_${filePath}`,
          {
            id: `fs_${filePath}`,
            type: "file",
            content: "dirty editor buffer",
            modifiedAt: "before-refresh",
          },
        ],
      ]);

      const nodes = createFileNodesFromEntries(
        [
          { path: srcPath, type: "directory" },
          { path: srcPath, type: "directory" },
          { path: filePath, type: "file" },
          { name: "README", id: "readme", type: "file" },
        ],
        {
          previousById,
          openTabIds: new Set([`fs_${filePath}`]),
        },
      );

      assert.equal(nodes.length, 3);
      assert.equal(nodes.find((node) => node.id === `fs_${srcPath}`)?.isOpen, true);
      assert.equal(
        nodes.find((node) => node.id === `fs_${filePath}`)?.content,
        "dirty editor buffer",
      );
      assert.equal(nodes.find((node) => node.id === "readme")?.language, "text");
    },
  },
  {
    id: "file-tree-refresh-merge",
    title: "refresh merge keeps folder open state and dirty open-tab content",
    run() {
      const previousById = new Map([
        ["src", { id: "src", type: "folder", isOpen: true, createdAt: "old" }],
        ["index", { id: "index", type: "file", content: "unsaved", modifiedAt: "old" }],
      ]);

      const folder = mergeFileTreeRefreshNode(
        { id: "src", name: "src", type: "folder", isOpen: false },
        previousById,
      );
      const file = mergeFileTreeRefreshNode(
        { id: "index", name: "index.ts", type: "file", content: "" },
        previousById,
        { openTabIds: new Set(["index"]) },
      );

      assert.equal(folder.isOpen, true);
      assert.equal(folder.createdAt, "old");
      assert.equal(file.content, "unsaved");
      assert.equal(file.modifiedAt, "old");
    },
  },
  {
    id: "file-tree-open-search-paths",
    title: "closed folders hide children, search opens ancestor paths",
    run() {
      const files = [
        { id: "src", name: "src", type: "folder", isOpen: false },
        { id: "components", name: "components", type: "folder", parentId: "src" },
        { id: "button", name: "Button.jsx", type: "file", parentId: "components" },
      ];

      const closed = createFileTreeModel(files);
      const searched = createFileTreeModel(files, { query: "button" });

      assert.deepEqual(getNodeRowNames(closed), ["src"]);
      assert.deepEqual(getNodeRowNames(searched), ["src", "components", "Button.jsx"]);
      assert.equal(getRowById(searched, "src")?.isOpen, true);
      assert.equal(getRowById(searched, "components")?.isOpen, true);
      assert.equal(getRowById(searched, "button")?.isMatch, true);
    },
  },
  {
    id: "file-tree-token-search-and-parent-cycle-guards",
    title: "multi-token search and parent cycles keep visible rows stable",
    run() {
      const files = [
        { id: "alpha", name: "alpha", type: "folder", parentId: "beta", isOpen: "true" },
        { id: "beta", name: "beta", type: "folder", parentId: "alpha", isOpen: "false" },
        {
          id: "button",
          name: "Button.spec.jsx",
          type: "file",
          parentId: "alpha",
          fsPath: "src/components/Button.spec.jsx",
        },
      ];
      const model = createFileTreeModel(files, { query: "button jsx" });

      assert.deepEqual(getNodeRowNames(model), [
        "alpha",
        "Button.spec.jsx",
      ]);
      assert.deepEqual(model.searchTokens, ["button", "jsx"]);
      assert.equal(model.stats.searchMatches, 1);
      assert.equal(getRowById(model, "alpha")?.isOpen, true);
      assert.equal(getRowById(model, "button")?.isMatch, true);
    },
  },
  {
    id: "file-tree-limits",
    title: "row and child caps report hidden work",
    run() {
      const files = createRootFiles(55);
      const childLimited = createFileTreeModel(files, {
        maxRows: 100,
        maxChildrenPerFolder: 50,
      });
      const rowLimited = createFileTreeModel(files, {
        maxRows: 50,
        maxChildrenPerFolder: 900,
      });

      assert.equal(childLimited.rows.length, 51);
      assert.equal(childLimited.rows[50]?.kind, "overflow");
      assert.equal(childLimited.stats.hiddenByChildLimit, 5);
      assert.equal(rowLimited.rows.length, 50);
      assert.equal(rowLimited.stats.hiddenByRowLimit, 5);
    },
  },
  {
    id: "file-tree-empty-error-display",
    title: "empty, error, loading and search-empty states are explicit",
    run() {
      const empty = createFileTreeModel([]);
      const ready = createFileTreeModel([
        { id: "index", name: "index.ts", type: "file" },
      ]);
      const noSearchMatches = createFileTreeModel(
        [{ id: "index", name: "index.ts", type: "file" }],
        { query: "missing" },
      );

      assert.equal(
        getFileTreeDisplayState(empty, { hasWorkspace: false }).kind,
        "missing-workspace",
      );
      assert.equal(
        getFileTreeDisplayState(empty, { hasWorkspace: true }).kind,
        "empty",
      );
      assert.equal(
        getFileTreeDisplayState(empty, { hasWorkspace: true, isLoading: true }).kind,
        "loading",
      );
      assert.equal(
        getFileTreeDisplayState(empty, { hasWorkspace: true, error: "disk failed" }).kind,
        "error",
      );
      assert.equal(
        getFileTreeDisplayState(ready, { hasWorkspace: true, error: "stale read" }).kind,
        "error-inline",
      );
      assert.equal(
        getFileTreeDisplayState(ready, { hasWorkspace: true, isLoading: true }).kind,
        "refreshing",
      );
      assert.equal(
        getFileTreeDisplayState(noSearchMatches, { hasWorkspace: true }).kind,
        "search-empty",
      );
    },
  },
  {
    id: "file-tree-extension-guards",
    title: "special filenames and extension-less files stay stable",
    run() {
      assert.equal(getFileExtension(".env.local"), "env");
      assert.equal(getFileExtension("Dockerfile"), "dockerfile");
      assert.equal(getFileExtension("Makefile"), "mk");
      assert.equal(getFileExtension("README"), "");
    },
  },
  {
    id: "file-tree-items-and-virtual-window",
    title: "section rows, creation rows and virtual windows are model-backed",
    run() {
      const model = createFileTreeModel([
        { id: "src", name: "src", type: "folder", isOpen: true },
        { id: "alpha", name: "alpha.js", type: "file", parentId: "src" },
        { id: "zeta", name: "zeta.ts", type: "file", parentId: "src" },
        { id: "styles", name: "styles.css", type: "file", parentId: "src" },
        { id: "pkg", name: "package.json", type: "file", parentId: "src" },
      ]);
      const items = createFileTreeItems(model.rows, {
        creating: { type: "file", parentId: "src" },
      });
      const sections = items
        .filter((item) => item.kind === "section")
        .map((item) => [item.section.label, item.section.detail, item.section.count]);
      const creationIndex = items.findIndex((item) => item.kind === "creation");
      const srcIndex = items.findIndex((item) => item.id === "src");
      const virtualItems = Array.from({ length: 40 }, (_, index) => ({
        id: `item-${index}`,
        kind: "node",
      }));
      const virtualWindow = getFileTreeVirtualWindow(
        virtualItems,
        { height: 64, scrollTop: 320 },
        {
          rowHeight: 16,
          virtualizeAfter: 10,
          overscanRows: 2,
          maxRenderedRows: 8,
        },
      );

      assert.deepEqual(sections, [
        ["JS", "Source", 1],
        ["TS", "Source", 1],
        ["CSS", "Styles", 1],
        ["JSON", "Data", 1],
      ]);
      assert.equal(creationIndex, srcIndex + 1);
      assert.equal(virtualWindow.isVirtualized, true);
      assert.equal(virtualWindow.startIndex, 18);
      assert.equal(virtualWindow.renderedRows, 8);
      assert.equal(virtualWindow.items[0]?.offsetY, 288);
    },
  },
  {
    id: "workbench-layout-corrupt-data-normalization",
    title: "corrupt dock layout data normalizes to one valid zone per panel",
    run() {
      const fallback = assertWorkbenchLayoutInvariants("not-a-layout");
      assert.equal(fallback.presetId, DEFAULT_WORKBENCH_LAYOUT.presetId);
      assert.equal(fallback.sidePanelSize, DEFAULT_WORKBENCH_LAYOUT.sidePanelSize);
      assert.equal(
        fallback.bottomPanelSize,
        DEFAULT_WORKBENCH_LAYOUT.bottomPanelSize,
      );

      const layout = assertWorkbenchLayoutInvariants({
        version: "legacy",
        presetId: "unknown",
        sidePanelSize: "tiny",
        bottomPanelSize: "giant",
        panelZones: {
          Explorer: "galaxy",
          ISSUES: "SIDE",
          prs: "right_panel",
          problems: "bottom_panel",
          terminal: "none",
        },
        zonePanelIds: {
          LEFT: ["search", "search", "ghost-panel", "explorer"],
          right_panel: { items: ["PRS", "issues", "search"] },
          bottom_panel: { panels: ["problems", "terminal", "prs"] },
          hidden: ["terminal", "account", "account"],
          nowhere: ["debug"],
        },
      });

      assert.equal(layout.presetId, DEFAULT_WORKBENCH_LAYOUT.presetId);
      assert.equal(layout.sidePanelSize, DEFAULT_WORKBENCH_LAYOUT.sidePanelSize);
      assert.equal(
        layout.bottomPanelSize,
        DEFAULT_WORKBENCH_LAYOUT.bottomPanelSize,
      );
      assert.equal(layout.panelZones.search, WORKBENCH_SNAP_ZONES.left);
      assert.equal(layout.panelZones.prs, WORKBENCH_SNAP_ZONES.right);
      assert.equal(layout.panelZones.terminal, WORKBENCH_SNAP_ZONES.bottom);
      assert.equal(layout.panelZones.account, WORKBENCH_SNAP_ZONES.hidden);
    },
  },
  {
    id: "workbench-layout-duplicate-panel-dedupe",
    title: "duplicate dock buckets keep the first valid panel placement",
    run() {
      const layout = assertWorkbenchLayoutInvariants({
        zonePanelIds: {
          left: ["explorer", "search", "explorer", "issues"],
          right: ["issues", "prs", "projects"],
          bottom: ["terminal", "problems", "terminal", "search"],
          hidden: ["account", "explorer", "missing"],
        },
      });

      assert.deepEqual(
        getWorkbenchZonePanelIds(layout, WORKBENCH_SNAP_ZONES.left).slice(0, 4),
        ["explorer", "search", "issues", "git"],
      );
      assert.equal(layout.panelZones.issues, WORKBENCH_SNAP_ZONES.left);
      assert.equal(layout.panelZones.search, WORKBENCH_SNAP_ZONES.left);
      assert.equal(layout.panelZones.terminal, WORKBENCH_SNAP_ZONES.bottom);
      assert.equal(layout.panelZones.account, WORKBENCH_SNAP_ZONES.hidden);
    },
  },
  {
    id: "workbench-layout-aliases-and-compact-fallbacks",
    title: "layout aliases and compact shell fallbacks stay valid",
    run() {
      const layout = assertWorkbenchLayoutInvariants({
        presetId: "Compact",
        sidePanelSize: "ROOMY",
        bottomPanelSize: "TALL",
        panelPlacements: {
          ISSUES: "bottom_panel",
          TERMINAL: "hidden",
        },
      });
      const compactSideStyle = getSidePanelStyle({
        compact: true,
        size: "missing-size",
      });
      const regularSideStyle = getSidePanelStyle({
        compact: false,
        size: "missing-size",
      });
      const compactBottomClassName = getBottomPanelClassName({
        compact: true,
        size: "missing-size",
      });
      const compactBottomStyle = getBottomPanelStyle({
        compact: true,
        size: "missing-size",
      });

      assert.equal(layout.presetId, "focus");
      assert.equal(layout.sidePanelSize, "wide");
      assert.equal(layout.bottomPanelSize, "wide");
      assert.equal(layout.panelZones.issues, WORKBENCH_SNAP_ZONES.bottom);
      assert.equal(layout.panelZones.terminal, WORKBENCH_SNAP_ZONES.hidden);
      assert.match(compactSideStyle.width, /calc\(100vw - 3\.25rem\)/);
      assert.equal(regularSideStyle.minWidth, "14rem");
      assert.match(compactBottomClassName, /nx-code-bottom-panel/);
      assert.equal(typeof compactBottomStyle.flex, "string");
    },
  },
  {
    id: "workbench-move-panel-to-zone",
    title: "movePanelToZone moves panels once and preserves insertion intent",
    run() {
      let layout = normalizeWorkbenchLayout();
      layout = movePanelToZone(layout, "prs", WORKBENCH_SNAP_ZONES.left, {
        beforePanelId: "explorer",
      });
      layout = assertWorkbenchLayoutInvariants(layout);

      assert.equal(getWorkbenchPanelSnapZone("prs", layout), WORKBENCH_SNAP_ZONES.left);
      assert.equal(
        getWorkbenchZonePanelIds(layout, WORKBENCH_SNAP_ZONES.left)[0],
        "prs",
      );
      assert.equal(
        getWorkbenchZonePanelIds(layout, WORKBENCH_SNAP_ZONES.right).includes("prs"),
        false,
      );

      layout = movePanelToZone(layout, "terminal", WORKBENCH_PANEL_PLACEMENTS.side, {
        afterPanelId: "prs",
      });
      layout = assertWorkbenchLayoutInvariants(layout);

      assert.equal(layout.presetId, WORKBENCH_CUSTOM_PRESET_ID);
      assert.equal(getWorkbenchPanelSnapZone("terminal", layout), WORKBENCH_SNAP_ZONES.left);
      assert.deepEqual(
        getWorkbenchZonePanelIds(layout, WORKBENCH_SNAP_ZONES.left).slice(0, 2),
        ["prs", "terminal"],
      );
    },
  },
  {
    id: "workbench-layout-drop-preview",
    title: "getLayoutDropPreview reports valid moves without mutating source layout",
    run() {
      const layout = normalizeWorkbenchLayout();
      const invalidPanel = getLayoutDropPreview(
        layout,
        "missing-panel",
        WORKBENCH_SNAP_ZONES.left,
      );
      const invalidZone = getLayoutDropPreview(layout, "prs", "floating");

      assert.equal(invalidPanel.canDrop, false);
      assert.equal(invalidPanel.reason, "invalid-panel");
      assert.equal(invalidZone.canDrop, false);
      assert.equal(invalidZone.reason, "invalid-zone");

      const preview = getLayoutDropPreview(layout, {
        panelId: "prs",
        snapZone: WORKBENCH_SNAP_ZONES.bottom,
        beforePanelId: "problems",
      });

      assert.equal(preview.canDrop, true);
      assert.equal(preview.panelId, "prs");
      assert.equal(preview.sourceZone, WORKBENCH_SNAP_ZONES.right);
      assert.equal(preview.targetZone, WORKBENCH_SNAP_ZONES.bottom);
      assert.equal(preview.sourcePlacement, WORKBENCH_PANEL_PLACEMENTS.side);
      assert.equal(preview.targetPlacement, WORKBENCH_PANEL_PLACEMENTS.bottom);
      assert.equal(preview.insertIndex, 0);
      assert.deepEqual(preview.targetPanelIds.slice(0, 2), ["prs", "problems"]);
      assert.equal(
        getWorkbenchZonePanelIds(layout, WORKBENCH_SNAP_ZONES.bottom).includes("prs"),
        false,
      );
      assertWorkbenchLayoutInvariants(preview.layout);
    },
  },
  {
    id: "workbench-visible-panel-fallback",
    title: "visible panel fallback skips hidden or misplaced panels",
    run() {
      let layout = normalizeWorkbenchLayout();
      layout = movePanelToZone(layout, "explorer", WORKBENCH_SNAP_ZONES.hidden);
      layout = movePanelToZone(layout, "account", WORKBENCH_SNAP_ZONES.hidden);
      layout = assertWorkbenchLayoutInvariants(layout);

      assert.equal(
        getVisiblePanelId({
          layout,
          panelId: "explorer",
          activePanel: "account",
          snapZone: WORKBENCH_PANEL_PLACEMENTS.side,
          fallback: "account",
        }),
        "search",
      );
      assert.equal(
        getVisiblePanelId({
          layout,
          panelId: "explorer",
          snapZone: WORKBENCH_SNAP_ZONES.left,
          fallback: null,
          defaultToFirst: false,
        }),
        null,
      );
      assert.equal(
        getVisiblePanelId({
          layout,
          bottomPanelOpen: true,
          bottomPanel: "terminal",
          snapZone: WORKBENCH_SNAP_ZONES.bottom,
          fallback: "problems",
        }),
        "terminal",
      );
      assert.equal(
        getVisiblePanelId({
          layout,
          snapZone: WORKBENCH_SNAP_ZONES.hidden,
          fallback: "search",
        }),
        null,
      );

      const dockState = normalizeWorkbenchDockState(
        {
          activePanel: "explorer",
          bottomTab: "issues",
          bottomPanelOpen: true,
        },
        layout,
      );

      assert.equal(dockState.activePanel, null);
      assert.equal(dockState.bottomTab, "terminal");
      assert.equal(dockState.bottomPanelOpen, true);
    },
  },
  {
    id: "extension-runtime-snapshot-contributions",
    title: "extension runtime snapshot exposes enabled command contributions",
    run() {
      const records = createDefaultExtensionRecords();
      const contributions = collectExtensionContributions(records);
      const runtime = getExtensionRuntimeOverview(records);
      const snapshot = createExtensionRuntimeSnapshot(records);

      assert.deepEqual(snapshot.installed, [
        "nexus-theme-core",
        "prettier",
        "eslint",
      ]);
      assert.deepEqual(snapshot.enabled, snapshot.installed);
      assert.match(snapshot.generatedAt, /^\d{4}-\d{2}-\d{2}T/);
      assert.equal(snapshot.stats.commands, 3);
      assert.equal(contributions.commands.length, snapshot.stats.commands);
      assert.deepEqual(
        contributions.commands.map((command) => command.command),
        [
          "prettier.formatDocument",
          "eslint.fixAll",
          "eslint.restart",
        ],
      );

      const commandSummary = snapshot.summary.find(
        (entry) => entry.point === "commands",
      );
      assert.equal(commandSummary.count, 3);
      assert.deepEqual(commandSummary.extensions, ["Prettier", "ESLint"]);
      assert.deepEqual(commandSummary.items, [
        "Format Document",
        "Fix All Auto-Fixable Problems",
        "Restart ESLint Server",
      ]);
      assert.equal(runtime.enabledExtensionCount, 3);
      assert.ok(
        runtime.activation.events.some(
          (event) =>
            event.id === "onLanguage:javascript" &&
            event.extensionId === "prettier",
        ),
      );
    },
  },
  {
    id: "extension-lifecycle-and-category-filters",
    title: "extension lifecycle states expose active, available and category views",
    run() {
      const records = createDefaultExtensionRecords();
      const extensions = resolveExtensions(records);
      const prettier = extensions.find((extension) => extension.id === "prettier");
      const tailwind = extensions.find((extension) => extension.id === "tailwind-intellisense");
      const diagnostics = filterExtensions(extensions, { category: "diagnostics" });
      const active = filterExtensions(extensions, { state: "enabled" });

      assert.equal(prettier.lifecycleState.id, "active");
      assert.equal(prettier.lifecycleState.activationReady, true);
      assert.equal(prettier.categoryInfo.shortLabel, "Format");
      assert.equal(tailwind.lifecycleState.id, "available");
      assert.equal(tailwind.lifecycleState.activationReady, false);
      assert.ok(diagnostics.some((extension) => extension.id === "eslint"));
      assert.deepEqual(
        active.map((extension) => extension.id),
        ["nexus-theme-core", "prettier", "eslint"],
      );
    },
  },
  {
    id: "extension-command-contributions-route-to-palette-model",
    title: "extension command contributions normalize into palette and spotlight commands",
    run() {
      const records = createDefaultExtensionRecords();
      const extensionCommands = createExtensionCommandPaletteEntries(records);
      const registry = createEditorCommandRegistry(extensionCommands);
      const paletteCommands = getEditorCommandPaletteCommands({
        extensionCommands,
        surface: "palette",
      });
      const spotlightResults = createSpotlightResults({
        files: [],
        query: "eslint restart",
        extensionCommands,
      });

      const registryCommand = registry.find(
        (command) => command.id === "extension:prettier.formatDocument",
      );
      assert.equal(extensionCommands.length, 3);
      assert.equal(registryCommand.actionId, "prettier.formatDocument");
      assert.equal(registryCommand.category, "extensions");
      assert.equal(registryCommand.extensionId, "prettier");
      assert.equal(registryCommand.surfaces.includes("palette"), true);

      const ranked = rankCommandPaletteItems(paletteCommands, "format document");
      assert.equal(ranked[0]?.id, "extension:prettier.formatDocument");
      assert.equal(ranked[0]?.actionId, "prettier.formatDocument");
      assert.equal(ranked[0]?.label, "Format Document");
      assert.equal(ranked[0]?.categoryMeta.id, "extensions");
      assert.equal(typeof ranked[0]?.icon, "object");

      const groups = groupCommandPaletteItems(ranked);
      assert.equal(groups[0]?.id, "extensions");
      assert.deepEqual(
        groups[0]?.items.map((command) => command.id),
        ["extension:prettier.formatDocument"],
      );

      assert.equal(spotlightResults[0]?.id, "extension:eslint.restart");
      assert.equal(spotlightResults[0]?.actionId, "eslint.restart");
      assert.equal(spotlightResults[0]?.resultKind, "command");
      assert.equal(spotlightResults[0]?.extensionId, "eslint");
    },
  },
  {
    id: "github-workbench-model-fallbacks",
    title: "github workbench normalizes repo input and classifies platform failures",
    run() {
      const repo = normalizeGithubRepositoryInput(
        "https://github.com/NexusLab/nexus-code.git?tab=readme",
      );
      const partialStatus = getGithubCapabilityStatus({
        available: true,
        methods: ["issues"],
        missingMethods: ["createIssue"],
      });
      const offlineStatus = getGithubCapabilityStatus({
        available: false,
        methods: [],
        missingMethods: ["issues"],
      });
      const auth = classifyGithubPlatformError({
        status: 401,
        message: "Bad credentials",
      });
      const scope = classifyGithubPlatformError({
        status: 403,
        message: "Resource not accessible by integration",
        details: { scopes: { missingScopes: ["project"] } },
      });
      const validationMessage = formatGithubPlatformError(
        {
          status: 422,
          message: "Validation Failed",
          details: { errors: [{ message: "Head branch was not found" }] },
        },
        "GitHub data could not be loaded.",
      );

      assert.deepEqual(repo, {
        owner: "NexusLab",
        repo: "nexus-code",
        label: "NexusLab/nexus-code",
      });
      assert.equal(getGithubRepositoryError(repo), "");
      assert.equal(getGithubRepositoryError({ owner: "NexusLab", repo: "" }).includes("owner/repo"), true);
      assert.equal(partialStatus.id, "partial");
      assert.equal(offlineStatus.id, "offline");
      assert.equal(auth.kind, "auth");
      assert.equal(scope.kind, "scope");
      assert.match(validationMessage, /Head branch was not found/);
    },
  },
  {
    id: "account-session-start-contract",
    title: "account session contract supports local start and migrated API sessions",
    run() {
      const localSession = createLocalAccountSession({ username: "Local IDE" });
      const localState = getAccountSessionState(localSession);
      assert.equal(localSession.authMode, ACCOUNT_AUTH_MODES.local);
      assert.equal(localState.canStartWorkbench, true);
      assert.equal(localState.isLocal, true);

      const migratedSession = normalizeAccountSession({
        token: "session-token",
        userId: "user-1",
        username: "nexus-user",
        userTier: "paid",
        expiresAt: Date.now() + 60_000,
      });
      const migratedState = getAccountSessionState(migratedSession);
      assert.equal(migratedSession.authMode, ACCOUNT_AUTH_MODES.nexus);
      assert.equal(migratedSession.userTier, "pro");
      assert.equal(migratedState.canStartWorkbench, true);

      const expiredSession = normalizeAccountSession({
        authMode: ACCOUNT_AUTH_MODES.nexus,
        token: "expired",
        username: "old-user",
        expiresAt: Date.now() - 1_000,
      });
      assert.equal(getAccountSessionState(expiredSession).canStartWorkbench, false);
    },
  },
  {
    id: "command-palette-fuzzy-search-ranking",
    title: "palette ranking accepts abbreviations and IDE intent queries",
    run() {
      const paletteCommands = getEditorCommandPaletteCommands({ surface: "palette" });
      const ranked = rankCommandPaletteItems(paletteCommands, "opgpr");
      const tones = new Set(
        paletteCommands.map((command) => command.categoryMeta?.tone).filter(Boolean),
      );

      assert.equal(ranked[0]?.id, "open-github-projects");
      assert.equal(ranked[0]?.actionId, "open-github-projects");
      assert.equal(ranked[0]?.categoryMeta.id, "source-control");
      assert.equal(tones.has("emerald"), false);
      assert.equal(tones.has("teal"), false);

      const terminalRanked = rankCommandPaletteItems(paletteCommands, "ttr");
      assert.equal(terminalRanked[0]?.id, "terminal-task-runner");

      const symbolRanked = rankCommandPaletteItems(paletteCommands, "symbol scope");
      assert.equal(symbolRanked[0]?.id, "focus-active-symbol");
      assert.equal(symbolRanked[0]?.categoryMeta.id, "symbols");
      assert.equal(symbolRanked[0]?.matchReason, "Label");

      const intentExpectations = [
        ["git", "github-sync"],
        ["problems", "open-problems"],
        ["terminal", "toggle-terminal"],
        ["extensions", "open-extensions"],
        ["settings", "open-settings"],
        ["search", "open-search"],
      ];
      intentExpectations.forEach(([query, expectedId]) => {
        const [firstResult] = rankCommandPaletteItems(paletteCommands, query);
        assert.equal(firstResult?.id, expectedId);
        assert.equal(firstResult?.isFrequent, true);
      });
    },
  },
  {
    id: "spotlight-file-fuzzy-dedupe",
    title: "spotlight file search handles abbreviations and duplicate entries",
    run() {
      const files = [
        {
          id: "command-model",
          name: "commandPaletteModel.js",
          fsPath: "src/pages/editor/commandPaletteModel.js",
          type: "file",
        },
        {
          id: "command-model",
          name: "commandPaletteModel.js",
          fsPath: "src/pages/editor/commandPaletteModel.js",
          type: "file",
        },
        {
          id: "code-editor",
          name: "CodeEditor.jsx",
          fsPath: "src/components/editor/CodeEditor.jsx",
          type: "file",
        },
      ];

      const rankedFiles = rankSpotlightFiles(files, "cpm", 8);
      assert.equal(rankedFiles.length, 1);
      assert.equal(rankedFiles[0]?.id, "command-model");
      assert.equal(rankedFiles[0]?.payload, "command-model");

      const mixedResults = createSpotlightResults({
        files,
        query: "src cpm",
        maxCommands: 4,
        maxFiles: 4,
      });
      assert.equal(mixedResults[0]?.resultKind, "file");
      assert.equal(mixedResults[0]?.id, "command-model");
    },
  },
  {
    id: "spotlight-symbol-results-open-files",
    title: "spotlight symbol search ranks extracted scopes and opens owning files",
    run() {
      const files = [
        {
          id: "code-editor",
          name: "CodeEditor.jsx",
          fsPath: "src/components/editor/CodeEditor.jsx",
          type: "file",
          content: [
            "export class EditorShell {",
            "  renderPanel() {",
            "    return true;",
            "  }",
            "}",
          ].join("\n"),
        },
        {
          id: "readme",
          name: "README.md",
          fsPath: "README.md",
          type: "file",
          content: "# Nexus Code\n\n## Command Surface",
        },
      ];

      const symbols = rankSpotlightSymbols(files, "@render", 8);
      assert.equal(symbols[0]?.resultKind, "symbol");
      assert.equal(symbols[0]?.label, "renderPanel");
      assert.equal(symbols[0]?.payload, "code-editor");
      assert.equal(symbols[0]?.actionId, "open-file");
      assert.equal(symbols[0]?.matchReason, "Symbol");

      const mixedResults = createSpotlightResults({
        files,
        query: "@command",
        maxCommands: 4,
        maxFiles: 4,
        maxSymbols: 4,
      });
      assert.equal(mixedResults[0]?.resultKind, "symbol");
      assert.equal(mixedResults[0]?.label, "Command Surface");
      assert.equal(mixedResults[0]?.payload, "readme");
    },
  },
  {
    id: "editor-symbol-extraction-active-scope",
    title: "document symbols expose active editor scope",
    run() {
      const source = [
        "export class WorkbenchController {",
        "  constructor() {}",
        "  renderPanel() {",
        "    return true;",
        "  }",
        "}",
        "",
        "export const createCommand = () => true;",
      ].join("\n");
      const symbols = extractDocumentSymbols(source, "typescript");

      assert.deepEqual(
        symbols.map((symbol) => `${symbol.kind}:${symbol.name}`),
        [
          "class:WorkbenchController",
          "method:constructor",
          "method:renderPanel",
          "function:createCommand",
        ],
      );
      assert.equal(getActiveDocumentSymbol(symbols, 4)?.name, "renderPanel");
      assert.equal(getActiveDocumentSymbol(symbols, 6)?.name, "WorkbenchController");
      assert.equal(getActiveDocumentSymbol(symbols, 8)?.name, "createCommand");

      const scopeInfo = createEditorScopeInfo(symbols, 4, { lineCount: 8 });
      assert.equal(scopeInfo.activeSymbol.name, "renderPanel");
      assert.equal(scopeInfo.pathLabel, "WorkbenchController > renderPanel");
      assert.equal(scopeInfo.rangeLabel, "L3-5");
      assert.equal(scopeInfo.inSymbolScope, true);

      const markdownSymbols = extractDocumentSymbols(
        "# Release\n\n## Smoke Gates\n\n### IDE Core",
        "markdown",
      );
      assert.deepEqual(
        markdownSymbols.map((symbol) => [symbol.name, symbol.depth]),
        [
          ["Release", 0],
          ["Smoke Gates", 1],
          ["IDE Core", 2],
        ],
      );
      assert.equal(getActiveDocumentSymbol(markdownSymbols, 5)?.name, "IDE Core");
    },
  },
  {
    id: "editor-completion-helper-routing",
    title: "snippet and LSP completion helpers stay deterministic near CodeEditor",
    run() {
      const wordContext = createCompletionContext("use");
      const snippets = createSnippetCompletions(wordContext, "javascript");
      const localContext = createCompletionContext("function renderPanel() {}\nren");
      const localSnippets = createSnippetCompletions(localContext, "javascript");

      assert.equal(snippets.from, 0);
      assert.equal(
        snippets.options.some((option) => option.label === "useEffect"),
        true,
      );
      assert.equal(localSnippets.from, 26);
      assert.equal(
        localSnippets.options.find((option) => option.label === "renderPanel")?.section.name,
        "Current Document",
      );
      assert.equal(shouldRequestLspCompletion(wordContext), true);
      assert.equal(
        shouldRequestLspCompletion(createCompletionContext("const value = ")),
        false,
      );
      assert.equal(
        shouldRequestLspCompletion(createCompletionContext("", { explicit: true })),
        true,
      );

      const completionResult = lspCompletionsToCodeMirror(
        wordContext,
        {
          isIncomplete: false,
          items: [
            {
              label: "clg",
              kind: 3,
              detail: "console.log",
              documentation: "Duplicate of the bundled snippet.",
            },
            {
              label: { label: "formatDocument" },
              kind: 2,
              detail: "method",
              documentation: { value: "Formats the current document." },
              insertText: "formatDocument(${1:options})",
              insertTextFormat: 2,
              preselect: true,
              sortText: "!0001",
            },
            {
              label: "plainFunction",
              kind: 3,
              insertText: "plainFunction()",
            },
            {
              label: "beta",
              kind: 10,
              textEdit: {
                newText: "gamma",
                range: {
                  start: { line: 0, character: 6 },
                  end: { line: 0, character: 10 },
                },
              },
            },
          ],
        },
        snippets,
      );

      assert.equal(completionResult.from, 0);
      assert.equal(String(completionResult.validFor), "/[\\w$-]*$/");
      assert.equal(
        completionResult.options.filter((option) => option.label === "clg").length,
        1,
      );

      const formatOption = completionResult.options.find(
        (option) => option.label === "formatDocument",
      );
      assert.equal(formatOption.type, "method");
      assert.equal(typeof formatOption.apply, "function");
      assert.equal(formatOption.section.name, "Recommended");
      assert.equal(formatOption.info, "Formats the current document.");

      const plainOption = completionResult.options.find(
        (option) => option.label === "plainFunction",
      );
      assert.equal(plainOption.apply, "plainFunction()");
      assert.equal(plainOption.section.name, "Language Server");

      const textEditOption = completionResult.options.find(
        (option) => option.label === "beta",
      );
      assert.equal(typeof textEditOption.apply, "function");

      const cssCompletionResult = lspCompletionsToCodeMirror(
        createCompletionContext(".button:"),
        {
          isIncomplete: false,
          items: [{ label: "color", kind: 10, insertText: "color" }],
        },
        null,
        { languageId: "css" },
      );
      assert.equal(cssCompletionResult.from, 0);
      assert.equal(String(cssCompletionResult.validFor), "/[\\w$#.:-]*$/");

      const cappedResult = lspCompletionsToCodeMirror(
        createCompletionContext("item", { explicit: true }),
        {
          isIncomplete: false,
          items: Array.from({ length: 320 }, (_, index) => ({
            label: `item${index}`,
            kind: 3,
          })),
        },
        null,
        { maxItems: 500 },
      );
      assert.equal(cappedResult.options.length, 240);

      const incompleteResult = lspCompletionsToCodeMirror(
        createCompletionContext("do"),
        { isIncomplete: true, items: [] },
        createSnippetCompletions(createCompletionContext("do"), "javascript"),
      );
      assert.equal(incompleteResult.validFor, undefined);
    },
  },
];

export function createIdeCoreSmokeScenarios() {
  return scenarios;
}

export function runIdeCoreSmoke() {
  return scenarios.map((scenario) => {
    const startedAt = Date.now();
    scenario.run();
    return {
      id: scenario.id,
      title: scenario.title,
      ms: Date.now() - startedAt,
    };
  });
}
