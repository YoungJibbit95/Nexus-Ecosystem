import assert from "node:assert/strict";

import {
  createFileNodesFromEntries,
  createFileTreeModel,
  getFileExtension,
  getFileTreeDisplayState,
  mergeFileTreeRefreshNode,
} from "../pages/editor/fileTreeModel.js";

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
