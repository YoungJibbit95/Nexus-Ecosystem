export const SEARCH_DEBOUNCE_MS = 260;

export const SEARCH_LIMITS = {
  maxFiles: 1400,
  maxTotalMatches: 500,
  maxMatchesPerFile: 32,
  maxFileChars: 1_000_000,
  contextRadius: 88,
};

export const DEFAULT_SEARCH_OPTIONS = {
  query: "",
  include: "",
  exclude: "",
  caseSensitive: false,
  useRegex: false,
  wholeWord: false,
};

const EXTENSION_COLORS = {
  js: "#facc15",
  jsx: "#61dafb",
  ts: "#3b82f6",
  tsx: "#3b82f6",
  py: "#38bdf8",
  java: "#f97316",
  html: "#f97316",
  css: "#3b82f6",
  scss: "#ec4899",
  json: "#facc15",
  md: "#a855f7",
  cpp: "#3b82f6",
  c: "#3b82f6",
  h: "#3b82f6",
  rs: "#f97316",
  go: "#22d3ee",
  rb: "#ef4444",
  php: "#8b5cf6",
  yml: "#ef4444",
  yaml: "#ef4444",
};

export function getFileExtension(name) {
  if (!name || typeof name !== "string") return "";
  const parts = name.split(".");
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : "";
}

export function getExtColor(name) {
  return EXTENSION_COLORS[getFileExtension(name)] || "#6b7280";
}

export function getExtLabel(name) {
  return getFileExtension(name).toUpperCase() || "TXT";
}

export function normalizeSearchOptions(options = {}) {
  return {
    ...DEFAULT_SEARCH_OPTIONS,
    query: String(options.query ?? "").trimStart(),
    include: String(options.include ?? ""),
    exclude: String(options.exclude ?? ""),
    caseSensitive: Boolean(options.caseSensitive),
    useRegex: Boolean(options.useRegex),
    wholeWord: Boolean(options.wholeWord),
  };
}

export function createEmptySearchResult(overrides = {}) {
  return {
    groups: [],
    totalMatches: 0,
    matchedFiles: 0,
    scannedFiles: 0,
    candidateFiles: 0,
    skippedFiles: 0,
    readErrorCount: 0,
    truncatedFileCount: 0,
    fileLimitReached: false,
    matchLimitReached: false,
    durationMs: 0,
    error: null,
    warnings: [],
    ...overrides,
  };
}

export async function searchFiles({
  files = [],
  options = DEFAULT_SEARCH_OPTIONS,
  readFile,
  limits = SEARCH_LIMITS,
} = {}) {
  const startedAt = getNow();
  const normalizedOptions = normalizeSearchOptions(options);
  const query = normalizedOptions.query.trim();

  if (!query) {
    return createEmptySearchResult();
  }

  const compiled = compileSearchRegex(normalizedOptions);
  if (compiled.error) {
    return createEmptySearchResult({
      error: compiled.error,
      durationMs: Math.round(getNow() - startedAt),
    });
  }

  const includePatterns = parsePatternList(normalizedOptions.include);
  const excludePatterns = parsePatternList(normalizedOptions.exclude);
  const fileById = new Map(
    files
      .filter((file) => file?.id)
      .map((file) => [String(file.id), file]),
  );
  const searchableFiles = files.filter(isSearchableFile);
  const groups = [];
  const warnings = [];
  let totalMatches = 0;
  let scannedFiles = 0;
  let candidateFiles = 0;
  let skippedFiles = 0;
  let readErrorCount = 0;
  let truncatedFileCount = 0;
  let fileLimitReached = false;
  let matchLimitReached = false;

  for (const file of searchableFiles) {
    const meta = getFileMeta(file, fileById);
    if (includePatterns.length > 0 && !matchesAnyPattern(includePatterns, meta)) {
      skippedFiles += 1;
      continue;
    }
    if (excludePatterns.length > 0 && matchesAnyPattern(excludePatterns, meta)) {
      skippedFiles += 1;
      continue;
    }

    candidateFiles += 1;
    if (scannedFiles >= limits.maxFiles) {
      fileLimitReached = true;
      break;
    }

    let content = "";
    try {
      content = await resolveFileContent(file, readFile);
    } catch {
      readErrorCount += 1;
      continue;
    }

    scannedFiles += 1;
    if (!content || looksBinary(content)) continue;

    if (content.length > limits.maxFileChars) {
      content = content.slice(0, limits.maxFileChars);
      truncatedFileCount += 1;
    }

    const fileResult = collectFileMatches({
      file,
      meta,
      content,
      regex: compiled.regex,
      currentTotalMatches: totalMatches,
      limits,
    });

    if (fileResult.totalMatches > 0) {
      groups.push(fileResult.group);
      totalMatches += fileResult.totalMatches;
    }

    if (fileResult.limitReached || totalMatches >= limits.maxTotalMatches) {
      matchLimitReached = true;
      break;
    }
  }

  if (fileLimitReached) {
    warnings.push(`Scan auf ${limits.maxFiles} Dateien begrenzt.`);
  }
  if (matchLimitReached) {
    warnings.push(`Ergebnisse auf ${limits.maxTotalMatches} Treffer begrenzt.`);
  }
  if (truncatedFileCount > 0) {
    warnings.push(`${truncatedFileCount} grosse Dateien nur teilweise durchsucht.`);
  }
  if (readErrorCount > 0) {
    warnings.push(`${readErrorCount} Dateien konnten nicht gelesen werden.`);
  }

  return createEmptySearchResult({
    groups,
    totalMatches,
    matchedFiles: groups.length,
    scannedFiles,
    candidateFiles,
    skippedFiles,
    readErrorCount,
    truncatedFileCount,
    fileLimitReached,
    matchLimitReached,
    durationMs: Math.round(getNow() - startedAt),
    warnings,
  });
}

function collectFileMatches({
  file,
  meta,
  content,
  regex,
  currentTotalMatches,
  limits,
}) {
  const matches = [];
  const lines = content.split(/\r?\n/);
  let totalMatches = 0;
  let limitReached = false;

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    regex.lastIndex = 0;
    const lineText = lines[lineIndex];
    let match = regex.exec(lineText);

    while (match) {
      const matchText = match[0] || "";
      if (matchText.length === 0) {
        regex.lastIndex += 1;
        match = regex.exec(lineText);
        continue;
      }

      totalMatches += 1;
      if (matches.length < limits.maxMatchesPerFile) {
        matches.push(
          createMatch({
            lineText,
            lineNumber: lineIndex + 1,
            column: match.index + 1,
            matchLength: matchText.length,
            contextRadius: limits.contextRadius,
          }),
        );
      }

      if (currentTotalMatches + totalMatches >= limits.maxTotalMatches) {
        limitReached = true;
        break;
      }

      match = regex.exec(lineText);
    }

    if (limitReached) break;
  }

  return {
    totalMatches,
    limitReached,
    group: {
      file,
      fileId: file.id,
      fileName: file.name || "Untitled",
      path: meta.displayPath,
      fullPath: meta.fullPath,
      extension: getExtLabel(file.name),
      color: getExtColor(file.name),
      matches,
      totalMatches,
      perFileLimitReached: totalMatches > matches.length,
    },
  };
}

function createMatch({
  lineText,
  lineNumber,
  column,
  matchLength,
  contextRadius,
}) {
  const normalizedLine = String(lineText || "").replace(/\t/g, "  ");
  const matchIndex = Math.max(0, column - 1);
  const excerptStart = Math.max(0, matchIndex - contextRadius);
  const excerptEnd = Math.min(
    normalizedLine.length,
    matchIndex + matchLength + contextRadius,
  );
  const hasPrefix = excerptStart > 0;
  const hasSuffix = excerptEnd < normalizedLine.length;
  const prefix = hasPrefix ? "..." : "";
  const suffix = hasSuffix ? "..." : "";
  const excerpt = `${prefix}${normalizedLine.slice(excerptStart, excerptEnd)}${suffix}`;

  return {
    lineNumber,
    column,
    lineText: normalizedLine,
    excerpt: excerpt || "(empty)",
    matchStart: matchIndex - excerptStart + prefix.length,
    matchLength,
  };
}

async function resolveFileContent(file, readFile) {
  if (typeof file?.content === "string") return file.content;
  if (!file?.fsPath || typeof readFile !== "function") return "";
  const content = await readFile(file);
  return typeof content === "string" ? content : "";
}

function compileSearchRegex(options) {
  const query = options.query.trim();
  let source = options.useRegex ? query : escapeRegex(query);

  if (options.wholeWord) {
    source = `\\b(?:${source})\\b`;
  }

  try {
    const regex = new RegExp(source, options.caseSensitive ? "g" : "gi");
    regex.lastIndex = 0;
    if (regex.test("")) {
      return {
        error: "Die Regex muss mindestens ein Zeichen treffen.",
        regex: null,
      };
    }
    regex.lastIndex = 0;
    return { regex, error: null };
  } catch (error) {
    return {
      error: `Ungueltige Regex: ${error?.message || "Pattern kann nicht gelesen werden."}`,
      regex: null,
    };
  }
}

function getFileMeta(file, fileById) {
  const name = file?.name || "Untitled";
  const path = buildDisplayPath(file, fileById);
  const fsPath = normalizePath(file?.fsPath || "");
  return {
    name,
    displayPath: path || name,
    fullPath: fsPath || path || name,
    candidates: [name, path, fsPath].filter(Boolean),
  };
}

function buildDisplayPath(file, fileById) {
  if (!file) return "";
  const parts = [file.name || "Untitled"];
  let parentId = file.parentId;
  const seen = new Set([String(file.id || "")]);

  while (parentId && fileById.has(String(parentId)) && parts.length < 32) {
    const parent = fileById.get(String(parentId));
    const parentKey = String(parent?.id || "");
    if (seen.has(parentKey)) break;
    seen.add(parentKey);
    if (parent?.name) parts.unshift(parent.name);
    parentId = parent?.parentId;
  }

  if (parts.length > 1) return normalizePath(parts.join("/"));
  if (file.fsPath) {
    const normalized = normalizePath(file.fsPath);
    return normalized.split("/").slice(-3).join("/");
  }
  return parts[0] || "";
}

function parsePatternList(value) {
  return String(value || "")
    .split(/[\n,;]+/)
    .map((pattern) => pattern.trim())
    .filter(Boolean);
}

function matchesAnyPattern(patterns, meta) {
  return patterns.some((pattern) => matchesPattern(pattern, meta));
}

function matchesPattern(pattern, meta) {
  const normalizedPattern = normalizePath(pattern);
  const hasWildcard = /[*?]/.test(normalizedPattern);

  if (!hasWildcard) {
    const needle = normalizedPattern.toLowerCase();
    return meta.candidates.some((candidate) =>
      normalizePath(candidate).toLowerCase().includes(needle),
    );
  }

  const regex = globToRegex(normalizedPattern);
  const patternHasPath = normalizedPattern.includes("/");

  return meta.candidates.some((candidate) => {
    const normalizedCandidate = normalizePath(candidate);
    if (regex.test(normalizedCandidate)) return true;
    if (patternHasPath) return false;
    return normalizedCandidate.split("/").some((part) => regex.test(part));
  });
}

function globToRegex(pattern) {
  let source = "";
  for (const char of pattern) {
    if (char === "*") source += ".*";
    else if (char === "?") source += ".";
    else source += escapeRegex(char);
  }
  return new RegExp(`^${source}$`, "i");
}

function normalizePath(path) {
  return String(path || "").replace(/\\/g, "/").replace(/\/+/g, "/");
}

function isSearchableFile(file) {
  if (!file || typeof file !== "object") return false;
  return file.type !== "folder";
}

function looksBinary(content) {
  return typeof content === "string" && content.includes("\0");
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getNow() {
  return typeof performance !== "undefined" && performance.now
    ? performance.now()
    : Date.now();
}
