const WINDOWS_DRIVE_PATH = /^[a-zA-Z]:[\\/]/;
const WINDOWS_DRIVE_URI_PATH = /^\/[a-zA-Z]:\//;
const URI_SCHEME = /^[a-zA-Z][a-zA-Z0-9+.-]*:/;

function normalizeSlashes(value) {
  return String(value || "")
    .trim()
    .replace(/\\/g, "/")
    .replace(/\/{2,}/g, (match, offset) => (offset === 0 ? match : "/"));
}

function stripTrailingSlash(value) {
  return value.replace(/\/+$/, "");
}

function encodePath(pathValue) {
  return String(pathValue || "")
    .split("/")
    .map((segment, index) => {
      if (!segment) return segment;
      if (index === 0 && /^[a-zA-Z]:$/.test(segment)) return segment;
      return encodeURIComponent(segment);
    })
    .join("/");
}

function getScheme(uri) {
  const match = String(uri || "").match(/^([a-zA-Z][a-zA-Z0-9+.-]*):/);
  return match?.[1] || "";
}

function isSameOrChildPath(pathValue, rootValue) {
  if (!pathValue || !rootValue) return false;
  const pathForCompare = stripTrailingSlash(pathValue).toLowerCase();
  const rootForCompare = stripTrailingSlash(rootValue).toLowerCase();
  return pathForCompare === rootForCompare || pathForCompare.startsWith(`${rootForCompare}/`);
}

export function isUri(value) {
  const normalized = String(value || "").trim();
  return !WINDOWS_DRIVE_PATH.test(normalized) && URI_SCHEME.test(normalized);
}

export function isAbsoluteFsPath(value) {
  const normalized = normalizeSlashes(value);
  return (
    WINDOWS_DRIVE_PATH.test(normalized) ||
    WINDOWS_DRIVE_URI_PATH.test(normalized) ||
    normalized.startsWith("//") ||
    normalized.startsWith("/")
  );
}

export function normalizeDocumentPath(value) {
  return normalizeSlashes(value).replace(/^file:\/+/, (prefix) =>
    prefix.toLowerCase() === "file:///" ? "/" : prefix,
  );
}

export function toWorkspaceRelativePath(resourcePath, workspacePath) {
  const normalizedPath = normalizeDocumentPath(resourcePath);
  const normalizedWorkspace = stripTrailingSlash(normalizeDocumentPath(workspacePath));
  if (!normalizedPath) return "";
  if (normalizedWorkspace && isSameOrChildPath(normalizedPath, normalizedWorkspace)) {
    return normalizedPath.slice(normalizedWorkspace.length).replace(/^\/+/, "");
  }
  return normalizedPath.replace(/^\/+/, "");
}

export function createFileUriString(fsPath) {
  const normalized = normalizeDocumentPath(fsPath);
  if (!normalized) return "";

  if (WINDOWS_DRIVE_PATH.test(normalized)) {
    return `file:///${encodePath(normalized)}`;
  }
  if (WINDOWS_DRIVE_URI_PATH.test(normalized)) {
    return `file://${encodePath(normalized)}`;
  }
  if (normalized.startsWith("//")) {
    return `file:${encodePath(normalized)}`;
  }
  if (isUri(normalized)) return normalized;
  return `file://${normalized.startsWith("/") ? "" : "/"}${encodePath(normalized)}`;
}

export function createWorkspaceUriString(relativePath) {
  const normalized = normalizeDocumentPath(relativePath).replace(/^\/+/, "");
  return `nexus-workspace:///${encodePath(normalized || "untitled")}`;
}

export function createUntitledUriString(label = "untitled") {
  const normalized = normalizeDocumentPath(label).replace(/^\/+/, "") || "untitled";
  return `untitled:///${encodePath(normalized)}`;
}

/**
 * @typedef {Object} EditorModelUriInput
 * @property {string} [uri]
 * @property {string} [modelPath]
 * @property {string} [fileName]
 * @property {string} [path]
 * @property {string} [name]
 * @property {string} [fsPath]
 * @property {string} [workspacePath]
 */

/**
 * @typedef {Object} EditorModelUriDescriptor
 * @property {string} uri
 * @property {string} modelPath
 * @property {string} path
 * @property {string|null} fsPath
 * @property {string|null} workspacePath
 * @property {string} scheme
 * @property {boolean} isFsPath
 */

/**
 * Builds a stable document URI descriptor for editor engines and language
 * services. Relative inputs keep a stable model path for local workspace files.
 *
 * @param {EditorModelUriInput|string} input
 * @returns {EditorModelUriDescriptor}
 */
export function createDocumentUriDescriptor(input = {}) {
  const options = typeof input === "string" ? { fileName: input } : input || {};
  const explicitUri = typeof options.uri === "string" ? options.uri.trim() : "";
  const fsPath = normalizeDocumentPath(options.fsPath || "");
  const workspacePath = normalizeDocumentPath(options.workspacePath || "");
  const candidatePath = normalizeDocumentPath(
    options.fileName || options.path || options.name || explicitUri || "untitled",
  );
  const hasFsPath = Boolean(fsPath) || (!explicitUri && isAbsoluteFsPath(candidatePath));
  const sourcePath = fsPath || candidatePath;
  const relativePath = hasFsPath
    ? toWorkspaceRelativePath(sourcePath, workspacePath)
    : normalizeDocumentPath(candidatePath).replace(/^\/+/, "");
  const uri = explicitUri || (hasFsPath ? createFileUriString(sourcePath) : createWorkspaceUriString(relativePath));
  const modelPath = options.modelPath || (hasFsPath || explicitUri ? uri : relativePath || "untitled");

  return {
    uri,
    modelPath,
    path: relativePath || "untitled",
    fsPath: hasFsPath ? sourcePath : null,
    workspacePath: workspacePath || null,
    scheme: getScheme(uri),
    isFsPath: hasFsPath,
  };
}

export function getModelUriString(modelOrDescriptor) {
  if (!modelOrDescriptor) return "";
  if (typeof modelOrDescriptor === "string") return modelOrDescriptor;
  if (typeof modelOrDescriptor.uri?.toString === "function") {
    return modelOrDescriptor.uri.toString();
  }
  if (typeof modelOrDescriptor.uri === "string") return modelOrDescriptor.uri;
  return "";
}
