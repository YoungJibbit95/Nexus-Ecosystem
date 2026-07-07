import {
  createSpotlightTextResults,
  normalizeSearchValue,
  rankSpotlightFiles,
  rankSpotlightSymbols,
} from "./commandPaletteModel.js";
import { SEARCH_LIMITS, searchFiles } from "./searchPanelModel.js";

export const SPOTLIGHT_WORKSPACE_SEARCH_LIMITS = {
  maxDepth: 9,
  maxDirectories: 220,
  maxEntries: 2600,
  maxFileCandidates: 900,
  maxFileResults: 8,
  maxTextResults: 8,
  maxSymbolFiles: 80,
  maxSymbolResults: 8,
  maxSearchFiles: 650,
  maxSearchMatches: 48,
  maxMatchesPerFile: 3,
  maxSearchFileChars: 360_000,
};

const IGNORED_DIRECTORY_NAMES = new Set([
  ".git",
  ".hg",
  ".svn",
  ".next",
  ".nuxt",
  ".turbo",
  ".vite",
  ".yarn",
  "coverage",
  "dist",
  "build",
  "out",
  "release",
  "node_modules",
]);

const SKIPPED_FILE_NAMES = new Set([
  "package-lock.json",
  "pnpm-lock.yaml",
  "yarn.lock",
]);

const BINARY_FILE_EXTENSIONS = new Set([
  "7z",
  "avi",
  "bin",
  "bmp",
  "class",
  "dll",
  "dmg",
  "doc",
  "docx",
  "exe",
  "gif",
  "gz",
  "ico",
  "jar",
  "jpeg",
  "jpg",
  "mov",
  "mp3",
  "mp4",
  "pdf",
  "png",
  "rar",
  "so",
  "ttf",
  "wasm",
  "webp",
  "woff",
  "woff2",
  "zip",
]);

const SYMBOL_FILE_EXTENSIONS = new Set([
  "c",
  "cc",
  "cpp",
  "cs",
  "css",
  "go",
  "h",
  "hpp",
  "html",
  "java",
  "js",
  "jsx",
  "json",
  "md",
  "mjs",
  "py",
  "rs",
  "ts",
  "tsx",
  "vue",
  "xml",
  "yml",
  "yaml",
]);

function getDefaultFsApi() {
  if (typeof window === "undefined") return null;
  return window.electronAPI || null;
}

function normalizePath(value) {
  return String(value || "").replace(/\\/g, "/").replace(/\/+/g, "/");
}

function stripTrailingSlash(value) {
  return String(value || "").replace(/[\\/]+$/, "");
}

function getPathBasename(value) {
  return String(value || "").split(/[\\/]/).filter(Boolean).pop() || "";
}

function getFileExtension(name) {
  const value = String(name || "");
  const dotIndex = value.lastIndexOf(".");
  return dotIndex > -1 ? value.slice(dotIndex + 1).toLowerCase() : "";
}

function getCandidateKey(file) {
  return normalizePath(file?.fsPath || file?.path || file?.id || file?.name).toLowerCase();
}

function createFsFileCandidate(filePath, name = getPathBasename(filePath), extra = {}) {
  const fsPath = String(filePath || "");
  return {
    id: `fs_${fsPath}`,
    name: name || getPathBasename(fsPath) || "Untitled",
    type: "file",
    fsPath,
    path: fsPath,
    ...extra,
  };
}

function normalizeExistingFile(file) {
  if (!file || file.type === "folder") return null;
  const fsPath = file.fsPath || "";
  const name = file.name || getPathBasename(fsPath) || "Untitled";
  return {
    ...file,
    id: file.id || (fsPath ? `fs_${fsPath}` : name),
    name,
    type: "file",
    fsPath: fsPath || null,
    path: file.path || fsPath || name,
  };
}

function mergeFileCandidate(existing, next) {
  if (!existing) return next;
  if (typeof existing.content === "string" && typeof next.content !== "string") {
    return {
      ...next,
      ...existing,
      fsPath: existing.fsPath || next.fsPath || null,
      path: existing.path || next.path || "",
    };
  }
  return {
    ...existing,
    ...next,
    content:
      typeof existing.content === "string" ? existing.content : next.content,
  };
}

function rememberFileCandidate(fileMap, file) {
  if (!file) return;
  const key = getCandidateKey(file);
  if (!key) return;
  fileMap.set(key, mergeFileCandidate(fileMap.get(key), file));
}

function isIgnoredDirectoryName(name) {
  return IGNORED_DIRECTORY_NAMES.has(String(name || "").toLowerCase());
}

function isProbablyTextFileName(name) {
  const normalizedName = String(name || "").toLowerCase();
  if (!normalizedName || SKIPPED_FILE_NAMES.has(normalizedName)) return false;
  const extension = getFileExtension(normalizedName);
  return !BINARY_FILE_EXTENSIONS.has(extension);
}

function isSymbolFile(file) {
  return SYMBOL_FILE_EXTENSIONS.has(getFileExtension(file?.name || file?.fsPath));
}

function joinPath(parentPath, childName) {
  const base = stripTrailingSlash(parentPath);
  if (!base) return childName;
  const separator = base.includes("\\") ? "\\" : "/";
  return `${base}${separator}${childName}`;
}

function getEntryPath(entry, parentPath) {
  return String(entry?.path || entry?.fsPath || joinPath(parentPath, entry?.name || ""));
}

function normalizeReadDirEntries(entries) {
  return Array.isArray(entries)
    ? entries
        .filter((entry) => entry && entry.name)
        .slice()
        .sort((a, b) => String(a.name).localeCompare(String(b.name)))
    : [];
}

export function getSpotlightWorkspaceSearchStatus({
  workspacePath = "",
  fsApi = getDefaultFsApi(),
  files = [],
} = {}) {
  const hasWorkspace = Boolean(String(workspacePath || "").trim());
  const hasReadDir = Boolean(fsApi && typeof fsApi.readDir === "function");
  const hasReadFile = Boolean(fsApi && typeof fsApi.readFile === "function");
  const loadedFileCount = files.filter((file) => file?.type !== "folder").length;

  if (hasWorkspace && hasReadDir && hasReadFile) {
    return {
      kind: "ready",
      canSearchWorkspace: true,
      message: "Projekt-Suche bereit",
      hasWorkspace,
      hasReadDir,
      hasReadFile,
      loadedFileCount,
    };
  }

  if (!hasWorkspace) {
    return {
      kind: loadedFileCount > 0 ? "fallback" : "missing-workspace",
      canSearchWorkspace: false,
      message:
        loadedFileCount > 0
          ? "Kein Workspace offen, suche in geladenen Dateien."
          : "Oeffne einen Workspace fuer Projekt-Suche.",
      hasWorkspace,
      hasReadDir,
      hasReadFile,
      loadedFileCount,
    };
  }

  return {
    kind: loadedFileCount > 0 ? "fallback" : "missing-ipc",
    canSearchWorkspace: false,
    message:
      loadedFileCount > 0
        ? "FS-IPC fehlt, suche in geladenen Dateien."
        : "FS-IPC fehlt fuer Projekt-Suche.",
    hasWorkspace,
    hasReadDir,
    hasReadFile,
    loadedFileCount,
  };
}

export async function collectSpotlightWorkspaceFiles({
  files = [],
  workspacePath = "",
  fsApi = getDefaultFsApi(),
  limits = SPOTLIGHT_WORKSPACE_SEARCH_LIMITS,
} = {}) {
  const status = getSpotlightWorkspaceSearchStatus({ workspacePath, fsApi, files });
  const fileMap = new Map();
  const warnings = [];

  files.forEach((file) => rememberFileCandidate(fileMap, normalizeExistingFile(file)));

  if (!status.canSearchWorkspace) {
    if (status.kind !== "ready") warnings.push(status.message);
    return {
      files: Array.from(fileMap.values()).slice(0, limits.maxFileCandidates),
      status,
      warnings,
      stats: {
        directoryCount: 0,
        entryCount: 0,
        readErrorCount: 0,
        limitReached: false,
      },
    };
  }

  const queue = [{ path: workspacePath, depth: 0 }];
  let directoryCount = 0;
  let entryCount = 0;
  let readErrorCount = 0;
  let limitReached = false;

  while (queue.length > 0) {
    if (
      directoryCount >= limits.maxDirectories ||
      entryCount >= limits.maxEntries ||
      fileMap.size >= limits.maxFileCandidates
    ) {
      limitReached = true;
      break;
    }

    const current = queue.shift();
    directoryCount += 1;

    let entries = [];
    try {
      entries = normalizeReadDirEntries(await fsApi.readDir(current.path));
    } catch {
      readErrorCount += 1;
      continue;
    }

    for (const entry of entries) {
      if (entryCount >= limits.maxEntries || fileMap.size >= limits.maxFileCandidates) {
        limitReached = true;
        break;
      }

      const entryPath = getEntryPath(entry, current.path);
      entryCount += 1;

      if (entry.isDirectory) {
        if (
          current.depth + 1 <= limits.maxDepth &&
          !isIgnoredDirectoryName(entry.name)
        ) {
          queue.push({ path: entryPath, depth: current.depth + 1 });
        }
        continue;
      }

      if (!isProbablyTextFileName(entry.name)) continue;
      rememberFileCandidate(
        fileMap,
        createFsFileCandidate(entryPath, entry.name, {
          size: entry.size ?? null,
          modified: entry.modified ?? null,
        }),
      );
    }
  }

  if (limitReached) {
    warnings.push("Projekt-Suche wurde begrenzt, um Spotlight responsiv zu halten.");
  }
  if (readErrorCount > 0) {
    warnings.push(`${readErrorCount} Ordner konnten nicht gelesen werden.`);
  }

  return {
    files: Array.from(fileMap.values()).slice(0, limits.maxFileCandidates),
    status,
    warnings,
    stats: {
      directoryCount,
      entryCount,
      readErrorCount,
      limitReached,
    },
  };
}

async function readCandidateFile(file, fsApi) {
  if (typeof file?.content === "string") return file.content;
  if (!file?.fsPath || !fsApi || typeof fsApi.readFile !== "function") return "";
  const content = await fsApi.readFile(file.fsPath);
  return typeof content === "string" ? content : "";
}

function attachFilePayloads(results, files) {
  const byKey = new Map(files.map((file) => [getCandidateKey(file), file]));
  return results.map((result) => {
    const key = getCandidateKey(result);
    const payload = byKey.get(key) || byKey.get(normalizePath(result.payload?.fsPath).toLowerCase());
    return {
      ...result,
      payload: payload || result.payload,
      source: "workspace",
    };
  });
}

function shouldSearchProjectSymbols(query) {
  return /^@+/.test(String(query || "").trim());
}

async function createWorkspaceSymbolResults({ files, query, fsApi, limits }) {
  if (!shouldSearchProjectSymbols(query)) return [];

  const symbolQuery = normalizeSearchValue(query).replace(/^@+/, "");
  const rankedCandidates = files
    .filter((file) => file?.type === "file" && isSymbolFile(file))
    .map((file, index) => {
      const haystack = normalizeSearchValue(`${file.name || ""} ${file.fsPath || file.path || ""}`);
      const score =
        symbolQuery && haystack.includes(symbolQuery)
          ? 100 - index / 100
          : 20 - index / 100;
      return { file, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limits.maxSymbolFiles);

  const loadedFiles = [];
  for (const { file } of rankedCandidates) {
    try {
      const content = await readCandidateFile(file, fsApi);
      if (content.trim()) loadedFiles.push({ ...file, content });
    } catch {
      // Symbol search is opportunistic; text search reports read errors separately.
    }
  }

  return attachFilePayloads(
    rankSpotlightSymbols(loadedFiles, query, limits.maxSymbolResults),
    loadedFiles,
  );
}

function createSearchLimits(limits) {
  return {
    ...SEARCH_LIMITS,
    maxFiles: limits.maxSearchFiles,
    maxTotalMatches: limits.maxSearchMatches,
    maxMatchesPerFile: limits.maxMatchesPerFile,
    maxFileChars: limits.maxSearchFileChars,
  };
}

export async function searchSpotlightWorkspace({
  files = [],
  query = "",
  workspacePath = "",
  fsApi = getDefaultFsApi(),
  limits = SPOTLIGHT_WORKSPACE_SEARCH_LIMITS,
} = {}) {
  const normalizedQuery = normalizeSearchValue(query);
  if (!normalizedQuery) {
    const status = getSpotlightWorkspaceSearchStatus({ workspacePath, fsApi, files });
    return {
      status,
      files: [],
      results: [],
      warnings: [],
      stats: {
        candidateFiles: 0,
        scannedFiles: 0,
        totalMatches: 0,
      },
    };
  }

  const collected = await collectSpotlightWorkspaceFiles({
    files,
    workspacePath,
    fsApi,
    limits,
  });
  const candidates = collected.files;
  const searchableFiles = candidates.filter(
    (file) => file?.type === "file" && isProbablyTextFileName(file.name || file.fsPath),
  );

  const fileResults = attachFilePayloads(
    rankSpotlightFiles(searchableFiles, query, limits.maxFileResults),
    searchableFiles,
  );

  const readFile = (file) => readCandidateFile(file, fsApi);
  const textSearchResult = await searchFiles({
    files: searchableFiles,
    options: { query },
    readFile,
    limits: createSearchLimits(limits),
  });
  const textResults = createSpotlightTextResults(
    textSearchResult,
    query,
    limits.maxTextResults,
  );
  const symbolResults = await createWorkspaceSymbolResults({
    files: searchableFiles,
    query,
    fsApi,
    limits,
  });

  const warnings = [
    ...collected.warnings,
    ...textSearchResult.warnings,
  ].filter(Boolean);

  return {
    status: {
      ...collected.status,
      message:
        collected.status.kind === "ready"
          ? `${searchableFiles.length} Projektdateien indexiert`
          : collected.status.message,
    },
    files: searchableFiles,
    results: [...fileResults, ...symbolResults, ...textResults],
    warnings,
    stats: {
      ...collected.stats,
      candidateFiles: searchableFiles.length,
      scannedFiles: textSearchResult.scannedFiles,
      totalMatches: textSearchResult.totalMatches,
      matchedFiles: textSearchResult.matchedFiles,
      readErrorCount: textSearchResult.readErrorCount,
    },
  };
}
