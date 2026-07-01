export const FILE_TREE_LIMITS = {
  maxRows: 2200,
  maxChildrenPerFolder: 900,
  rowHeight: 32,
  virtualizeAfter: 120,
  overscanRows: 12,
  maxRenderedRows: 220,
  minVirtualViewportRows: 8,
  collapseBatchSize: 48,
};

export const FILE_TREE_GROUP_LABELS = Object.freeze({
  source: "Source",
  style: "Styles",
  markup: "Markup",
  data: "Data",
  config: "Config",
  docs: "Docs",
  media: "Media",
  other: "Other",
});

export const FILE_TREE_GROUP_ORDER = Object.freeze([
  "source",
  "style",
  "markup",
  "data",
  "config",
  "docs",
  "media",
  "other",
]);

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

const FILE_TREE_GROUP_RANK = FILE_TREE_GROUP_ORDER.reduce((acc, group, index) => {
  acc[group] = index;
  return acc;
}, {});

function normalizeBoolean(value) {
  if (value === true || value === 1) return true;
  if (typeof value !== "string") return false;
  const normalized = value.trim().toLowerCase();
  return normalized === "true" || normalized === "1" || normalized === "yes";
}

function normalizePositiveInteger(value, fallback, min = 1) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.max(min, Math.trunc(numeric));
}

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
  ).trim().toLowerCase();
}

function getSourceIndex(node) {
  return Number.isFinite(node?.sourceIndex) ? node.sourceIndex : 0;
}

function getNodeGroup(node) {
  return String(
    node?.extensionGroup || getFileMeta(node?.name || node?.fsPath || node?.path || "").group,
  ).toLowerCase();
}

function getGroupRank(group) {
  return Number.isFinite(FILE_TREE_GROUP_RANK[group])
    ? FILE_TREE_GROUP_RANK[group]
    : FILE_TREE_GROUP_ORDER.length;
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

export function getFileGroupLabel(group) {
  return FILE_TREE_GROUP_LABELS[group] || FILE_TREE_GROUP_LABELS.other;
}

function normalizeSearch(value) {
  return String(value || "").trim().toLowerCase();
}

function getSearchTokens(query) {
  return normalizeSearch(query).split(/\s+/).filter(Boolean).slice(0, 8);
}

function normalizeErrorMessage(error) {
  if (!error) return "";
  if (typeof error === "string") return error.trim();
  return String(error.message || error).trim();
}

function normalizeNode(input, index) {
  const source = input && typeof input === "object" ? input : {};
  const rawPath = source.fsPath || source.path || "";
  const name = String(source.name || getPathBasename(rawPath) || "untitled").trim() || "untitled";
  const id = String(source.id || source.fsPath || source.path || `${name}:${index}`).trim();
  const type = getNodeType(input);
  const parentId = source.parentId == null || source.parentId === ""
    ? null
    : String(source.parentId).trim() || null;
  const meta = getFileMeta(name);

  return {
    ...source,
    id,
    parentId: parentId === id ? null : parentId,
    name,
    type,
    isFolder: type === "folder",
    isFile: type !== "folder",
    isOpen: normalizeBoolean(source.isOpen),
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
    const groupCompare = getGroupRank(getNodeGroup(a)) - getGroupRank(getNodeGroup(b));
    if (groupCompare !== 0) return groupCompare;
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
    isOpen: node.type === "folder"
      ? normalizeBoolean(previous.isOpen) || normalizeBoolean(node.isOpen)
      : normalizeBoolean(node.isOpen),
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
    const entry = rawEntries[index] && typeof rawEntries[index] === "object"
      ? rawEntries[index]
      : {};
    const fsPath = entry.path || entry.fsPath || "";
    const name = String(entry.name || getPathBasename(fsPath) || "untitled");
    const id = String(entry.id || (fsPath ? `fs_${fsPath}` : `${parentId || "root"}:${name}:${index}`)).trim();
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
        isOpen: normalizeBoolean(entry.isOpen),
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

function nodeMatchesQuery(node, queryTokens) {
  const tokens = Array.isArray(queryTokens)
    ? queryTokens
    : getSearchTokens(queryTokens);
  if (tokens.length === 0) return true;
  const haystack = [
    node.name,
    node.fsPath,
    node.path,
    node.language,
    node.extension,
    node.extensionGroup,
  ]
    .filter(Boolean)
    .map((value) => String(value).toLowerCase());
  return tokens.every((token) => haystack.some((value) => value.includes(token)));
}

function collectVisibleSearchIds(nodes, byId, queryTokens) {
  if (!queryTokens.length) return null;
  const visibleIds = new Set();

  for (const node of nodes) {
    if (!nodeMatchesQuery(node, queryTokens)) continue;
    let current = node;
    let guard = 0;
    while (current && guard < 200) {
      visibleIds.add(current.id);
      const parentId = getSafeParentId(current, byId);
      current = parentId ? byId.get(parentId) : null;
      guard += 1;
    }
  }

  return visibleIds;
}

function getSafeParentId(node, byId) {
  const parentId = node.parentId && byId.has(node.parentId) ? node.parentId : null;
  if (!parentId) return null;

  const seen = new Set([node.id]);
  let currentId = parentId;
  let guard = 0;

  while (currentId && guard < 200) {
    if (seen.has(currentId)) {
      return currentId === node.id ? null : parentId;
    }
    seen.add(currentId);

    const current = byId.get(currentId);
    if (!current?.parentId) return parentId;
    if (!byId.has(current.parentId)) return parentId;
    currentId = current.parentId;
    guard += 1;
  }

  return guard >= 200 ? null : parentId;
}

export function createFileTreeModel(files = [], options = {}) {
  const maxRows = normalizePositiveInteger(
    options.maxRows,
    FILE_TREE_LIMITS.maxRows,
    50,
  );
  const maxChildrenPerFolder = normalizePositiveInteger(
    options.maxChildrenPerFolder,
    FILE_TREE_LIMITS.maxChildrenPerFolder,
    50,
  );
  const query = normalizeSearch(options.query);
  const queryTokens = getSearchTokens(query);
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

    const parentId = getSafeParentId(node, byId);
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

  const visibleSearchIds = collectVisibleSearchIds(nodes, byId, queryTokens);
  const searchMatches = queryTokens.length
    ? nodes.filter((node) => nodeMatchesQuery(node, queryTokens)).length
    : 0;
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
    const isOpen = Boolean(node.isOpen) || queryTokens.length > 0;
    rows.push({
      id: node.id,
      node,
      depth,
      childCount,
      isOpen,
      isMatch: queryTokens.length > 0 ? nodeMatchesQuery(node, queryTokens) : false,
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
      searchMatches,
      maxRows,
      maxChildrenPerFolder,
    },
    isSearching: queryTokens.length > 0,
    query,
    searchTokens: queryTokens,
  };
}

export function getFileTreeSection(row) {
  const node = row?.node;
  if (!node || node.isFolder) return null;

  const meta = getFileMeta(node.name);
  const extension = String(node.extension || "").trim().toLowerCase();
  const sectionId = extension || "no-extension";
  const parentKey = node.parentId || "root";

  return {
    key: `${parentKey}:file-section:${sectionId}`,
    parentKey,
    depth: row.depth,
    label: extension ? meta.label : "No Ext",
    detail: extension ? getFileGroupLabel(meta.group) : "Plain",
    color: meta.color,
    group: meta.group,
    extension,
  };
}

export function createFileTreeItems(rows = [], options = {}) {
  const sourceRows = Array.isArray(rows) ? rows : [];
  const creating = options.creating && typeof options.creating === "object"
    ? options.creating
    : null;
  const includeSections = options.includeSections !== false;
  const items = [];
  const sectionCounts = new Map();

  if (includeSections) {
    for (const row of sourceRows) {
      if (row.kind !== "node") continue;
      const section = getFileTreeSection(row);
      if (!section) continue;
      const current = sectionCounts.get(section.key) || { ...section, count: 0 };
      current.count += 1;
      sectionCounts.set(section.key, current);
    }
  }

  if (creating?.parentId == null && creating?.type) {
    items.push({
      id: `creation:root:${creating.type}`,
      kind: "creation",
      depth: 0,
      type: creating.type,
      parentId: null,
    });
  }

  const lastSectionByParent = new Map();

  for (const row of sourceRows) {
    const section = includeSections && row.kind === "node"
      ? getFileTreeSection(row)
      : null;
    if (section && lastSectionByParent.get(section.parentKey) !== section.key) {
      const countedSection = sectionCounts.get(section.key) || { ...section, count: 1 };
      items.push({
        id: `section:${section.key}`,
        kind: "section",
        section: countedSection,
      });
      lastSectionByParent.set(section.parentKey, section.key);
    }

    items.push({
      id: row.id,
      kind: row.kind === "overflow" ? "overflow" : "node",
      row,
    });

    if (creating?.parentId === row.node?.id && creating?.type) {
      items.push({
        id: `creation:${row.node.id}:${creating.type}`,
        kind: "creation",
        depth: row.depth + 1,
        type: creating.type,
        parentId: row.node.id,
      });
    }
  }

  return items;
}

export function getFileTreeVirtualWindow(items = [], viewport = {}, options = {}) {
  const sourceItems = Array.isArray(items) ? items : [];
  const rowHeight = normalizePositiveInteger(
    options.rowHeight,
    FILE_TREE_LIMITS.rowHeight,
    1,
  );
  const virtualizeAfter = normalizePositiveInteger(
    options.virtualizeAfter,
    FILE_TREE_LIMITS.virtualizeAfter,
    1,
  );
  const overscanRows = normalizePositiveInteger(
    options.overscanRows,
    FILE_TREE_LIMITS.overscanRows,
    0,
  );
  const maxRenderedRows = normalizePositiveInteger(
    options.maxRenderedRows,
    FILE_TREE_LIMITS.maxRenderedRows,
    1,
  );
  const minViewportRows = normalizePositiveInteger(
    options.minViewportRows,
    FILE_TREE_LIMITS.minVirtualViewportRows,
    1,
  );
  const totalRows = sourceItems.length;
  const shouldVirtualize = totalRows > virtualizeAfter;

  if (!shouldVirtualize) {
    return {
      isVirtualized: false,
      items: sourceItems.map((item, index) => ({
        item,
        index,
        offsetY: index * rowHeight,
      })),
      totalHeight: totalRows * rowHeight,
      startIndex: 0,
      renderedRows: totalRows,
      totalRows,
      rowHeight,
    };
  }

  const viewportHeight = Math.max(
    Number(viewport.height) || 0,
    rowHeight * minViewportRows,
  );
  const scrollTop = Math.max(0, Number(viewport.scrollTop) || 0);
  const visibleCapacity = Math.ceil(viewportHeight / rowHeight);
  const renderCount = Math.min(
    maxRenderedRows,
    visibleCapacity + overscanRows * 2,
  );
  const maxStartIndex = Math.max(0, totalRows - renderCount);
  const startIndex = Math.max(
    0,
    Math.min(maxStartIndex, Math.floor(scrollTop / rowHeight) - overscanRows),
  );
  const endIndex = Math.min(totalRows, startIndex + renderCount);

  return {
    isVirtualized: true,
    items: sourceItems.slice(startIndex, endIndex).map((item, offset) => {
      const index = startIndex + offset;
      return {
        item,
        index,
        offsetY: index * rowHeight,
      };
    }),
    totalHeight: totalRows * rowHeight,
    startIndex,
    renderedRows: endIndex - startIndex,
    totalRows,
    rowHeight,
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
