export const FILE_TREE_LIMITS = {
  maxRows: 2200,
  maxChildrenPerFolder: 900,
  rowHeight: 32,
  virtualizeAfter: 120,
  overscanRows: 12,
  maxRenderedRows: 220,
};

/** @type {Record<string, { label: string, color: string, group: string }>} */
const EXTENSION_META = {
  js: { label: "JS", color: "#facc15", group: "source" },
  jsx: { label: "JSX", color: "#61dafb", group: "source" },
  ts: { label: "TS", color: "#3b82f6", group: "source" },
  tsx: { label: "TSX", color: "#3b82f6", group: "source" },
  mjs: { label: "MJS", color: "#facc15", group: "source" },
  cjs: { label: "CJS", color: "#facc15", group: "source" },
  py: { label: "PY", color: "#38bdf8", group: "source" },
  java: { label: "JAVA", color: "#f97316", group: "source" },
  go: { label: "GO", color: "#22d3ee", group: "source" },
  rs: { label: "RS", color: "#f97316", group: "source" },
  php: { label: "PHP", color: "#8b5cf6", group: "source" },
  rb: { label: "RB", color: "#ef4444", group: "source" },
  c: { label: "C", color: "#3b82f6", group: "source" },
  cpp: { label: "CPP", color: "#3b82f6", group: "source" },
  h: { label: "H", color: "#3b82f6", group: "source" },
  dockerfile: { label: "DOCKER", color: "#38bdf8", group: "config" },
  mk: { label: "MAKE", color: "#94a3b8", group: "config" },
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
  png: { label: "PNG", color: "#60a5fa", group: "media" },
  jpg: { label: "JPG", color: "#60a5fa", group: "media" },
  jpeg: { label: "JPEG", color: "#60a5fa", group: "media" },
  svg: { label: "SVG", color: "#60a5fa", group: "media" },
  webp: { label: "WEBP", color: "#60a5fa", group: "media" },
};

/** @type {Record<string, string>} */
const SPECIAL_EXTENSION_BY_NAME = {
  ".env": "env",
  ".env.local": "env",
  ".env.development": "env",
  ".env.production": "env",
  dockerfile: "dockerfile",
  makefile: "mk",
};

const collator = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: "base",
});

function getNodeType(input) {
  return input?.type === "folder" || input?.type === "directory" || input?.isDirectory
    ? "folder"
    : "file";
}

function getPathBasename(value) {
  const parts = String(value || "").split(/[\\/]/).filter(Boolean);
  return parts[parts.length - 1] || "";
}

function getNodeSortName(node) {
  return String(node?.sortName || node?.name || getPathBasename(node?.fsPath || node?.path) || "")
    .trim()
    .toLowerCase();
}

function getNodeExtension(node) {
  return String(
    node?.extension || getFileExtension(node?.name || node?.fsPath || node?.path || ""),
  ).toLowerCase();
}

function getSourceIndex(node) {
  return Number.isFinite(node?.sourceIndex) ? node.sourceIndex : 0;
}

export function getFileExtension(name) {
  if (!name || typeof name !== "string") return "";
  const trimmed = name.trim();
  if (!trimmed) return "";
  const lowerName = trimmed.toLowerCase();
  if (SPECIAL_EXTENSION_BY_NAME[lowerName]) return SPECIAL_EXTENSION_BY_NAME[lowerName];
  if (trimmed.startsWith(".") && trimmed.indexOf(".", 1) === -1) {
    return trimmed.slice(1).toLowerCase();
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

function normalizeErrorMessage(error) {
  if (!error) return "";
  if (typeof error === "string") return error.trim();
  return String(error.message || error).trim();
}

function normalizeNode(input, index) {
  const rawPath = input?.fsPath || input?.path || "";
  const name = String(input?.name || getPathBasename(rawPath) || "untitled");
  const id = String(input?.id || input?.fsPath || input?.path || `${name}:${index}`);
  const type = getNodeType(input);
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

export function compareFileTreeNodes(a, b) {
  const isFolderA = Boolean(a?.isFolder) || getNodeType(a) === "folder";
  const isFolderB = Boolean(b?.isFolder) || getNodeType(b) === "folder";
  if (isFolderA !== isFolderB) return isFolderA ? -1 : 1;
  if (!isFolderA && !isFolderB) {
    const extensionA = getNodeExtension(a);
    const extensionB = getNodeExtension(b);
    const extensionRankA = extensionA ? 0 : 1;
    const extensionRankB = extensionB ? 0 : 1;
    if (extensionRankA !== extensionRankB) return extensionRankA - extensionRankB;
    const extensionCompare = collator.compare(extensionA, extensionB);
    if (extensionCompare !== 0) return extensionCompare;
  }
  const nameCompare = collator.compare(getNodeSortName(a), getNodeSortName(b));
  if (nameCompare !== 0) return nameCompare;
  return getSourceIndex(a) - getSourceIndex(b);
}

function getLimitedChildren(children, maxChildrenPerFolder) {
  const limitedChildren = children.slice(0, maxChildrenPerFolder);
  const omitted = Math.max(0, children.length - limitedChildren.length);
  return { limitedChildren, omitted };
}

function createOverflowNode(parentId, omitted) {
  const safeParentId = parentId || "root";
  return {
    id: `${safeParentId}::overflow:${omitted}`,
    name: `${omitted} more items hidden`,
    type: "overflow",
    isFolder: false,
    isFile: false,
    extensionLabel: "CAP",
    extensionColor: "#f59e0b",
  };
}

export function mergeFileTreeRefreshNode(node, previousById, options = {}) {
  const previous =
    previousById instanceof Map && node?.id ? previousById.get(node.id) : null;
  if (!previous) return node;

  const openTabIds = options.openTabIds instanceof Set ? options.openTabIds : null;
  const shouldPreserveContent =
    node.type !== "folder" &&
    previous.content != null &&
    (!openTabIds || openTabIds.has(node.id));

  return {
    ...previous,
    ...node,
    content: shouldPreserveContent ? previous.content : node.content,
    createdAt: previous.createdAt || node.createdAt,
    modifiedAt: previous.modifiedAt || node.modifiedAt,
    isOpen: node.type === "folder" ? Boolean(previous.isOpen) : Boolean(node.isOpen),
  };
}

export function createFileNodesFromEntries(entries = [], options = {}) {
  const parentId = options.parentId == null ? null : String(options.parentId);
  const existingIds = options.existingIds instanceof Set ? options.existingIds : new Set();
  const seenIds = new Set(existingIds);
  const previousById = options.previousById instanceof Map ? options.previousById : null;
  const openTabIds = options.openTabIds instanceof Set ? options.openTabIds : null;
  const rawEntries = Array.isArray(entries) ? entries : [];
  const nodes = [];

  for (let index = 0; index < rawEntries.length; index += 1) {
    const entry = rawEntries[index] || {};
    const fsPath = entry.path || entry.fsPath || "";
    const name = String(entry.name || getPathBasename(fsPath) || "untitled");
    const id = String(entry.id || (fsPath ? `fs_${fsPath}` : `${parentId || "root"}:${name}:${index}`));
    if (seenIds.has(id)) continue;
    seenIds.add(id);

    const type = getNodeType(entry);
    const extension = getFileExtension(name);
    const node = normalizeNode(
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
    );

    nodes.push(
      previousById
        ? mergeFileTreeRefreshNode(node, previousById, { openTabIds })
        : node,
    );
  }

  nodes.sort(compareFileTreeNodes);
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

  rootItems.sort(compareFileTreeNodes);
  for (const children of childrenByParent.values()) {
    children.sort(compareFileTreeNodes);
  }

  const visibleSearchIds = collectVisibleSearchIds(nodes, byId, query);
  const rows = [];
  const visibleRootItems = visibleSearchIds
    ? rootItems.filter((node) => visibleSearchIds.has(node.id))
    : rootItems;
  const rootLimit = getLimitedChildren(visibleRootItems, maxChildrenPerFolder);
  const rootStackItems = rootLimit.limitedChildren.map((node) => ({ node, depth: 0 }));
  let hiddenByChildLimit = rootLimit.omitted;

  if (rootLimit.omitted > 0) {
    rootStackItems.push({
      node: createOverflowNode(null, rootLimit.omitted),
      depth: 0,
      overflowCount: rootLimit.omitted,
    });
  }

  const pushStack = rootStackItems.slice().reverse();
  let hiddenByRowLimit = 0;

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
    const { limitedChildren, omitted } = getLimitedChildren(
      visibleChildren,
      maxChildrenPerFolder,
    );
    hiddenByChildLimit += omitted;

    if (omitted > 0) {
      pushStack.push({
        node: createOverflowNode(node.id, omitted),
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

export function getFileTreeDisplayState(model, options = {}) {
  const rows = Array.isArray(model?.rows) ? model.rows : [];
  const stats = model?.stats || {};
  const total = Number.isFinite(stats.total) ? stats.total : rows.length;
  const hasWorkspace = Boolean(options.hasWorkspace);
  const hasCreatingDraft = Boolean(options.hasCreatingDraft);
  const isLoading = Boolean(options.isLoading);
  const isSearching = Boolean(model?.isSearching);
  const error = normalizeErrorMessage(options.error);
  const base = {
    rowCount: rows.length,
    total,
    message: "",
  };

  if (isLoading && rows.length === 0) {
    return {
      ...base,
      kind: "loading",
      isEmpty: true,
      message: "Reading workspace entries.",
    };
  }

  if (error && rows.length === 0 && !hasCreatingDraft) {
    return {
      ...base,
      kind: "error",
      isEmpty: true,
      message: error,
    };
  }

  if (error) {
    return {
      ...base,
      kind: "error-inline",
      isEmpty: false,
      message: error,
    };
  }

  if (!hasWorkspace && !hasCreatingDraft) {
    return {
      ...base,
      kind: "missing-workspace",
      isEmpty: true,
      message: "Open a workspace to populate the explorer.",
    };
  }

  if (hasWorkspace && total === 0 && !hasCreatingDraft) {
    return {
      ...base,
      kind: "empty",
      isEmpty: true,
      message: "Workspace is empty.",
    };
  }

  if (isSearching && total > 0 && rows.length === 0 && !hasCreatingDraft) {
    return {
      ...base,
      kind: "search-empty",
      isEmpty: true,
      message: "No files matched the current search.",
    };
  }

  if (isLoading) {
    return {
      ...base,
      kind: "refreshing",
      isEmpty: false,
      message: "Refreshing workspace entries.",
    };
  }

  return {
    ...base,
    kind: "ready",
    isEmpty: false,
  };
}
