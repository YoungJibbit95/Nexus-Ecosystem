import assert from "node:assert/strict";

import {
  createFileNodesFromEntries,
  createFileTreeModel,
  getFileExtension,
  getFileTreeDisplayState,
  mergeFileTreeRefreshNode,
} from "../pages/editor/fileTreeModel.js";
import {
  DEFAULT_WORKBENCH_LAYOUT,
  WORKBENCH_CUSTOM_PRESET_ID,
  WORKBENCH_DOCK_ZONE_SEQUENCE,
  WORKBENCH_PANEL_IDS,
  WORKBENCH_PANEL_PLACEMENTS,
  WORKBENCH_SNAP_ZONES,
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
    title: "folders first, files by extension then name",
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
        "package.json",
        "guide.md",
        "zeta.ts",
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
          explorer: "galaxy",
          issues: "side",
          prs: "rightPanel",
          problems: "bottom-panel",
          terminal: "none",
        },
        zonePanelIds: {
          left: ["search", "search", "ghost-panel", "explorer"],
          right: { items: ["prs", "issues", "search"] },
          bottom: { panels: ["problems", "terminal", "prs"] },
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
