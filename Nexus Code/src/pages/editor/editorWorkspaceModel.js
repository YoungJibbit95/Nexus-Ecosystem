export function getPathBasename(value) {
  if (!value) return "";
  const parts = String(value).split(/[\\/]/).filter(Boolean);
  return parts[parts.length - 1] || "";
}

export function getRelativePathLabel(file, workspacePath) {
  const rawPath = file?.fsPath || file?.name || "";
  if (!rawPath) return "Keine Datei";
  if (!workspacePath || !file?.fsPath) return rawPath;

  const normalizedWorkspace = String(workspacePath).replace(/[\\/]+$/, "");
  const normalizedPath = String(file.fsPath);
  if (normalizedPath.toLowerCase().startsWith(normalizedWorkspace.toLowerCase())) {
    const relative = normalizedPath
      .slice(normalizedWorkspace.length)
      .replace(/^[\\/]+/, "");
    return relative || getPathBasename(normalizedPath);
  }
  return getPathBasename(normalizedPath) || normalizedPath;
}

export function getFileExtensionLabel(file) {
  const name = file?.name || file?.fsPath || "";
  const extension = String(name).split(".").pop()?.toUpperCase();
  if (!extension || extension === String(name).toUpperCase()) return "TXT";
  return extension.slice(0, 8);
}

export function getFileTreeErrorMessage(
  error,
  fallback = "Workspace tree could not be read.",
) {
  const message = error?.message || String(error || "");
  return message.trim() || fallback;
}

export function waitForFileTreeFrame() {
  if (
    typeof window === "undefined" ||
    typeof window.requestAnimationFrame !== "function"
  ) {
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    window.requestAnimationFrame(() => resolve());
  });
}

export function mergeFileTreeNode(node, previousById, options = {}) {
  const previous = previousById.get(node.id);
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

export function getProblemSummary(problems = []) {
  return problems.reduce(
    (acc, problem) => {
      if (problem?.severity === 8) acc.errors += 1;
      else if (problem?.severity === 4) acc.warnings += 1;
      else acc.infos += 1;
      return acc;
    },
    { errors: 0, warnings: 0, infos: 0 },
  );
}
