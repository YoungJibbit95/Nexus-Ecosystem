export const FILE_TREE_LIMITS = {
  maxRows: 1800,
  maxChildrenPerFolder: 700,
  rowHeight: 32,
  virtualizeAfter: 160,
  overscanRows: 14,
  maxRenderedRows: 260,
};

const EXTENSION_META = {
  js: { label: "JS", color: "#facc15", group: "source" },
  jsx: { label: "JSX", color: "#61dafb", group: "source" },
  ts: { label: "TS", color: "#3b82f6", group: "source" },
  tsx: { label: "TSX", color: "#3b82f6", group: "source" },
  mjs: { label: "MJS", color: "#facc15", group: "source" },
  cjs: { label: "CJS", color: "#facc15", group: "source" },
  py: { label: "PY", color: "#22c55e", group: "source" },
  java: { label: "JAVA", color: "#f97316", group: "source" },
  go: { label: "GO", color: "#22d3ee", group: "source" },
  rs: { label: "RS", color: "#f97316", group: "source" },
  php: { label: "PHP", color: "#8b5cf6", group: "source" },
  rb: { label: "RB", color: "#ef4444", group: "source" },
  c: { label: "C", color: "#3b82f6", group: "source" },
  cpp: { label: "CPP", color: "#3b82f6", group: "source" },
  h: { label: "H", color: "#3b82f6", group: "source" },
  css: { label: "CSS", color: "#38bdf8", group: "style" },
  scss: { label: "SCSS", color: "#ec4899", group: "style" },
  html: { label: "HTML", color: "#f97316", group: "markup" },
  xml: { label: "XML", color: "#fb923c", group: "markup" },
  json: { label: "JSON", color: "#facc15", group: "data" },
  yml: { label: "YML", color: "#ef4444", group: "data" },
  yaml: { label: "YAML", color: "#ef4444", group: "data" },
  toml: { label: "TOML", color: "#94a3b8", group: "config" },
  env: { label: "ENV", color: "#94a3b8", group: "config" },
  md: { label: "MD", color: "#a855f7", group: "docs" },
  mdx: { label: "MDX", color: "#a855f7", group: "docs" },
  txt: { label: "TXT", color: "#94a3b8", group: "docs" },
  png: { label: "PNG", color: "#14b8a6", group: "media" },
  jpg: { label: "JPG", color: "#14b8a6", group: "media" },
  jpeg: { label: "JPEG", color: "#14b8a6", group: "media" },
  svg: { label: "SVG", color: "#14b8a6", group: "media" },
  webp: { label: "WEBP", color: "#14b8a6", group: "media" },
};

const collator = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: "base",
});

export function getFileExtension(name) {
  if (!name || typeof name !== "string") return "";
  const trimmed = name.trim();
  if (!trimmed || (trimmed.startsWith(".") && trimmed.indexOf(".", 1) === -1)) {
    return "";
  }
  const index = trimmed.lastIndexOf(".");
  return index > 0 && index < trimmed.length - 1
    ? trimmed.slice(index + 1).toLowerCase()
    : "";
}

export function getFileMeta(name) {
  const extension = getFileExtension(name);
  const fallbackLabel = extension ? extension.toUpperCase().slice(0, 5) : "TXT";
  return (
    EXTENSION_META[extension] || {
      label: fallbackLabel,
      color: "#94a3b8",
      group: extension ? "other" : "docs",
    }
  );
}

function normalizeSearch(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizeNode(input, index) {
  const name = String(input?.name || input?.fsPath || input?.path || "untitled");
  const id = String(input?.id || input?.fsPath || input?.path || `${name}:${index}`);
  const type = input?.type === "folder" || input?.isDirectory ? "folder" : "file";
  const parentId = input?.parentId == null || input?.parentId === "" ? null : String(input.parentId);
  const meta = getFileMeta(name);

  return {
    ...input,
    id,
    parentId: parentId === id ? null : parentId,
    name,
    type,
    isFolder: type === "folder",
    isFile: type !== "folder",
    extension: getFileExtension(name),
    extensionGroup: meta.group,
    extensionLabel: meta.label,
    extensionColor: meta.color,
    sortName: name.toLowerCase(),
    sourceIndex: index,
  };
}

function compareNodes(a, b) {
  if (a.isFolder !== b.isFolder) return a.isFolder ? -1 : 1;
  if (a.isFile && b.isFile) {
    const extensionRankA = a.extension ? 0 : 1;
    const extensionRankB = b.extension ? 0 : 1;
    if (extensionRankA !== extensionRankB) return extensionRankA - extensionRankB;
    const extensionCompare = collator.compare(a.extension, b.extension);
    if (extensionCompare !== 0) return extensionCompare;
  }
  const nameCompare = collator.compare(a.sortName, b.sortName);
  if (nameCompare !== 0) return nameCompare;
  return a.sourceIndex - b.sourceIndex;
}

export function createFileNodesFromEntries(entries = [], options = {}) {
  const parentId = options.parentId == null ? null : String(options.parentId);
  const existingIds = options.existingIds instanceof Set ? options.existingIds : new Set();
  const rawEntries = Array.isArray(entries) ? entries : [];
  const nodes = [];

  for (let index = 0; index < rawEntries.length; index += 1) {
    const entry = rawEntries[index] || {};
    const fsPath = entry.path || entry.fsPath || "";
    const name = String(entry.name || fsPath || "untitled");
    const id = String(entry.id || (fsPath ? `fs_${fsPath}` : `${parentId || "root"}:${name}:${index}`));
    if (existingIds.has(id)) continue;

    const type = entry.type === "folder" || entry.isDirectory ? "folder" : "file";
    const extension = getFileExtension(name);
    nodes.push(
      normalizeNode(
        {
          id,
          name,
          type,
          parentId,
          isOpen: Boolean(entry.isOpen),
          fsPath: fsPath || null,
          language: type === "folder" ? null : extension || "text",
          size: entry.size ?? null,
          modified: entry.modified ?? null,
        },
        index,
      ),
    );
  }

  nodes.sort(compareNodes);
  return nodes;
}

function nodeMatchesQuery(node, query) {
  if (!query) return true;
  return [
    node.name,
    node.fsPath,
    node.path,
    node.language,
    node.extension,
    node.extensionGroup,
  ]
    .filter(Boolean)
    .some((value) => String(value).toLowerCase().includes(query));
}

function collectVisibleSearchIds(nodes, byId, query) {
  if (!query) return null;
  const visibleIds = new Set();

  for (const node of nodes) {
    if (!nodeMatchesQuery(node, query)) continue;
    let current = node;
    let guard = 0;
    while (current && guard < 200) {
      visibleIds.add(current.id);
      current = current.parentId ? byId.get(current.parentId) : null;
      guard += 1;
    }
  }

  return visibleIds;
}

export function createFileTreeModel(files = [], options = {}) {
  const maxRows = Number.isFinite(options.maxRows)
    ? Math.max(50, options.maxRows)
    : FILE_TREE_LIMITS.maxRows;
  const maxChildrenPerFolder = Number.isFinite(options.maxChildrenPerFolder)
    ? Math.max(50, options.maxChildrenPerFolder)
    : FILE_TREE_LIMITS.maxChildrenPerFolder;
  const query = normalizeSearch(options.query);
  const rawFiles = Array.isArray(files) ? files : [];
  const byId = new Map();
  const nodes = [];

  for (let index = 0; index < rawFiles.length; index += 1) {
    const node = normalizeNode(rawFiles[index], index);
    if (byId.has(node.id)) continue;
    byId.set(node.id, node);
    nodes.push(node);
  }

  const childrenByParent = new Map();
  const childCountById = new Map();
  const rootItems = [];
  let folderCount = 0;
  let fileCount = 0;

  for (const node of nodes) {
    if (node.isFolder) folderCount += 1;
    else fileCount += 1;

    const parentId = node.parentId && byId.has(node.parentId) ? node.parentId : null;
    if (!parentId) {
      rootItems.push(node);
      continue;
    }

    if (!childrenByParent.has(parentId)) childrenByParent.set(parentId, []);
    childrenByParent.get(parentId).push(node);
    childCountById.set(parentId, (childCountById.get(parentId) || 0) + 1);
  }

  rootItems.sort(compareNodes);
  for (const children of childrenByParent.values()) {
    children.sort(compareNodes);
  }

  const visibleSearchIds = collectVisibleSearchIds(nodes, byId, query);
  const rows = [];
  const pushStack = rootItems
    .slice()
    .reverse()
    .map((node) => ({ node, depth: 0 }));
  let hiddenByRowLimit = 0;
  let hiddenByChildLimit = 0;

  while (pushStack.length > 0) {
    const { node, depth, overflowCount = 0 } = pushStack.pop();
    if (node.type === "overflow") {
      if (rows.length < maxRows) {
        rows.push({
          id: node.id,
          node,
          depth,
          kind: "overflow",
          overflowCount,
        });
      }
      continue;
    }

    if (visibleSearchIds && !visibleSearchIds.has(node.id)) continue;

    if (rows.length >= maxRows) {
      hiddenByRowLimit += 1 + pushStack.length;
      break;
    }

    const childCount = childCountById.get(node.id) || 0;
    const isOpen = Boolean(node.isOpen) || Boolean(query);
    rows.push({
      id: node.id,
      node,
      depth,
      childCount,
      isOpen,
      isMatch: query ? nodeMatchesQuery(node, query) : false,
      hasChildren: childCount > 0,
      kind: "node",
    });

    if (!node.isFolder || !isOpen) continue;
    const children = childrenByParent.get(node.id) || [];
    const visibleChildren = visibleSearchIds
      ? children.filter((child) => visibleSearchIds.has(child.id))
      : children;
    const limitedChildren = visibleChildren.slice(0, maxChildrenPerFolder);
    const omitted = Math.max(0, visibleChildren.length - limitedChildren.length);
    hiddenByChildLimit += omitted;

    if (omitted > 0) {
      pushStack.push({
        node: {
          id: `${node.id}::overflow`,
          name: `${omitted} more items hidden`,
          type: "overflow",
          isFolder: false,
          isFile: false,
          extensionLabel: "CAP",
          extensionColor: "#f59e0b",
        },
        depth: depth + 1,
        overflowCount: omitted,
      });
    }

    for (let index = limitedChildren.length - 1; index >= 0; index -= 1) {
      pushStack.push({ node: limitedChildren[index], depth: depth + 1 });
    }
  }

  return {
    rows,
    byId,
    rootCount: rootItems.length,
    stats: {
      total: nodes.length,
      folders: folderCount,
      files: fileCount,
      visibleRows: rows.length,
      hiddenByRowLimit,
      hiddenByChildLimit,
      searchMatches: visibleSearchIds ? visibleSearchIds.size : 0,
      maxRows,
      maxChildrenPerFolder,
    },
    isSearching: Boolean(query),
    query,
  };
}
