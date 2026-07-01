import {
  Blocks,
  File,
  FileCode2,
  FolderOpen,
  GitBranch,
  GitPullRequest,
  Layout,
  ListChecks,
  Maximize2,
  Palette,
  PanelLeft,
  Search,
  Settings,
  Terminal,
  TriangleAlert,
} from "lucide-react";
import {
  createEditorCommandRegistry,
  EDITOR_COMMAND_CATEGORIES,
  EDITOR_COMMAND_CATEGORY_ORDER,
  extractDocumentSymbols,
  getEditorCommandCategory,
} from "./editorFeatureModel.js";
import { detectLanguageId } from "../../ide/languages/languageIds.js";

const COMMAND_ICON_BY_ID = Object.freeze({
  "new-file": FileCode2,
  "open-folder": FolderOpen,
  "open-explorer": PanelLeft,
  "open-search": Search,
  "focus-editor": FileCode2,
  "focus-active-symbol": FileCode2,
  "search-workspace-symbols": Search,
  "github-sync": GitBranch,
  "open-github-issues": ListChecks,
  "open-pull-requests": GitPullRequest,
  "open-github-projects": Layout,
  "open-problems": TriangleAlert,
  "toggle-terminal": Terminal,
  "terminal-task-runner": ListChecks,
  "toggle-zen": Maximize2,
  "toggle-sidebar": PanelLeft,
  "layout-balanced": Layout,
  "layout-compact": Layout,
  "layout-roomy": Layout,
  "cycle-side-panel-size": Layout,
  "cycle-bottom-panel-size": Layout,
  "layout-reset": Layout,
  "dock-active-left": Layout,
  "dock-active-right": Layout,
  "dock-active-bottom": Layout,
  "open-extensions": Blocks,
  "change-theme": Palette,
  "open-settings": Settings,
  "open-account": Settings,
});

const CATEGORY_ICON_BY_ID = Object.freeze({
  file: FileCode2,
  navigation: Search,
  symbols: FileCode2,
  "source-control": GitBranch,
  diagnostics: TriangleAlert,
  terminal: Terminal,
  layout: Layout,
  extensions: Blocks,
  preferences: Settings,
  files: File,
});

const CATEGORY_TONE_BY_ID = Object.freeze({
  file: Object.freeze({
    dot: "bg-cyan-300",
    text: "text-cyan-200",
    chip: "border-cyan-300/20 bg-cyan-300/10 text-cyan-100",
    icon: "border-cyan-300/15 bg-cyan-300/10 text-cyan-200",
    active: "border-cyan-300/25 bg-cyan-300/10",
  }),
  navigation: Object.freeze({
    dot: "bg-sky-300",
    text: "text-sky-200",
    chip: "border-sky-300/20 bg-sky-300/10 text-sky-100",
    icon: "border-sky-300/15 bg-sky-300/10 text-sky-200",
    active: "border-sky-300/25 bg-sky-300/10",
  }),
  symbols: Object.freeze({
    dot: "bg-violet-300",
    text: "text-violet-200",
    chip: "border-violet-300/20 bg-violet-300/10 text-violet-100",
    icon: "border-violet-300/15 bg-violet-300/10 text-violet-200",
    active: "border-violet-300/25 bg-violet-300/10",
  }),
  "source-control": Object.freeze({
    dot: "bg-sky-300",
    text: "text-sky-200",
    chip: "border-sky-300/20 bg-sky-300/10 text-sky-100",
    icon: "border-sky-300/15 bg-sky-300/10 text-sky-200",
    active: "border-sky-300/25 bg-sky-300/10",
  }),
  diagnostics: Object.freeze({
    dot: "bg-violet-300",
    text: "text-violet-200",
    chip: "border-violet-300/20 bg-violet-300/10 text-violet-100",
    icon: "border-violet-300/15 bg-violet-300/10 text-violet-200",
    active: "border-violet-300/25 bg-violet-300/10",
  }),
  terminal: Object.freeze({
    dot: "bg-cyan-300",
    text: "text-cyan-200",
    chip: "border-cyan-300/20 bg-cyan-300/10 text-cyan-100",
    icon: "border-cyan-300/15 bg-cyan-300/10 text-cyan-200",
    active: "border-cyan-300/25 bg-cyan-300/10",
  }),
  layout: Object.freeze({
    dot: "bg-violet-300",
    text: "text-violet-200",
    chip: "border-violet-300/20 bg-violet-300/10 text-violet-100",
    icon: "border-violet-300/15 bg-violet-300/10 text-violet-200",
    active: "border-violet-300/25 bg-violet-300/10",
  }),
  extensions: Object.freeze({
    dot: "bg-cyan-300",
    text: "text-cyan-200",
    chip: "border-cyan-300/20 bg-cyan-300/10 text-cyan-100",
    icon: "border-cyan-300/15 bg-cyan-300/10 text-cyan-200",
    active: "border-cyan-300/25 bg-cyan-300/10",
  }),
  preferences: Object.freeze({
    dot: "bg-sky-300",
    text: "text-sky-200",
    chip: "border-sky-300/20 bg-sky-300/10 text-sky-100",
    icon: "border-sky-300/15 bg-sky-300/10 text-sky-200",
    active: "border-sky-300/25 bg-sky-300/10",
  }),
  files: Object.freeze({
    dot: "bg-sky-300",
    text: "text-sky-200",
    chip: "border-sky-300/20 bg-sky-300/10 text-sky-100",
    icon: "border-sky-300/15 bg-sky-300/10 text-sky-200",
    active: "border-sky-300/25 bg-sky-300/10",
  }),
});

const DEFAULT_TONE = CATEGORY_TONE_BY_ID.navigation;
const FILE_CATEGORY = Object.freeze({
  id: "files",
  label: "Dateien",
  description: "Workspace-Dateien",
  tone: "sky",
});
const SYMBOL_CATEGORY = Object.freeze({
  id: "symbols",
  label: "Symbole",
  description: "Funktionen, Klassen und Headings",
  tone: "violet",
});
const SYMBOL_QUERY_PREFIX = /^@+/;
const SYMBOL_SCAN_FILE_LIMIT = 48;
const SYMBOL_SCAN_PER_FILE_LIMIT = 80;
const FREQUENT_COMMAND_IDS = Object.freeze(
  new Set([
    "open-search",
    "github-sync",
    "open-problems",
    "toggle-terminal",
    "terminal-task-runner",
    "open-extensions",
    "open-settings",
  ]),
);
const COMMAND_INTENT_ALIASES = Object.freeze({
  "source-control": Object.freeze([
    "git",
    "github",
    "scm",
    "sourcecontrol",
    "changes",
    "branch",
    "commit",
    "pull",
    "push",
  ]),
  diagnostics: Object.freeze([
    "problems",
    "problem",
    "diagnostics",
    "diagnose",
    "errors",
    "warnings",
    "lint",
    "ts",
    "typescript",
  ]),
  terminal: Object.freeze([
    "terminal",
    "shell",
    "console",
    "cli",
    "task",
    "tasks",
    "script",
    "scripts",
    "npm",
  ]),
  extensions: Object.freeze([
    "extensions",
    "extension",
    "plugins",
    "marketplace",
    "prettier",
    "eslint",
    "language",
  ]),
  navigation: Object.freeze([
    "search",
    "find",
    "suche",
    "goto",
    "go",
    "workspace",
    "symbols",
  ]),
  preferences: Object.freeze([
    "settings",
    "setting",
    "preferences",
    "config",
    "options",
    "optionen",
    "keyboard",
  ]),
});

function resolveCategoryTone(categoryId) {
  return CATEGORY_TONE_BY_ID[categoryId] || DEFAULT_TONE;
}

export function normalizeSearchValue(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function tokenizeQuery(query) {
  return normalizeSearchValue(query).split(/\s+/).filter(Boolean);
}

function compactSearchValue(value) {
  return normalizeSearchValue(value).replace(/[^a-z0-9]+/g, "");
}

function getInitialism(value) {
  return normalizeSearchValue(value)
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("");
}

function isSubsequence(token, value) {
  if (!token || !value) return false;
  let tokenIndex = 0;
  for (let index = 0; index < value.length && tokenIndex < token.length; index += 1) {
    if (value[index] === token[tokenIndex]) tokenIndex += 1;
  }
  return tokenIndex === token.length;
}

function categorySortValue(categoryId) {
  const index = EDITOR_COMMAND_CATEGORY_ORDER.indexOf(categoryId);
  return index === -1 ? EDITOR_COMMAND_CATEGORY_ORDER.length + 1 : index;
}

function getCommandIcon(command) {
  return (
    COMMAND_ICON_BY_ID[command.id] ||
    CATEGORY_ICON_BY_ID[command.category] ||
    CATEGORY_ICON_BY_ID.navigation
  );
}

function isFrequentCommand(command) {
  return Boolean(command?.favorite) || FREQUENT_COMMAND_IDS.has(command?.id);
}

export function getEditorCommandPaletteCommands({
  extensionCommands = [],
  surface = "palette",
} = {}) {
  return createEditorCommandRegistry(extensionCommands)
    .filter((command) => !surface || command.surfaces.includes(surface))
    .map((command) => {
      const categoryMeta = getEditorCommandCategory(command);
      return {
        ...command,
        icon: getCommandIcon(command),
        categoryMeta,
        tone: resolveCategoryTone(categoryMeta.id),
        isFrequent: isFrequentCommand(command),
      };
    });
}

function getCommandSearchBlob(command) {
  return [
    command.id,
    command.actionId,
    command.label,
    command.description,
    command.categoryMeta?.label,
    command.categoryMeta?.description,
    command.shortcut,
    ...(command.keywords || []),
  ]
    .filter(Boolean)
    .map(normalizeSearchValue)
    .join(" ");
}

function scoreTextField(field, token, weights) {
  if (!field || !token) return 0;
  if (field === token) return weights.exact;
  if (field.startsWith(token)) return weights.prefix;
  if (field.includes(token)) return weights.contains;
  return 0;
}

function scoreFuzzyField(field, token, weights) {
  const normalizedField = normalizeSearchValue(field);
  const directScore = scoreTextField(normalizedField, token, weights);
  if (directScore) return directScore;

  const compactField = compactSearchValue(normalizedField);
  const compactToken = compactSearchValue(token);
  if (!compactField || !compactToken) return 0;
  if (compactField.startsWith(compactToken)) return Math.max(0, weights.prefix - 8);
  if (compactField.includes(compactToken)) return Math.max(0, weights.contains - 6);

  const initialism = getInitialism(normalizedField);
  if (initialism && initialism.startsWith(compactToken)) {
    return Math.max(0, Math.round(weights.prefix * 0.78));
  }
  if (
    compactToken.length >= 3 &&
    compactField.length <= 42 &&
    isSubsequence(compactToken, compactField)
  ) {
    return Math.max(0, Math.round(weights.contains * 0.58));
  }
  return 0;
}

function fieldMatchesToken(fields, token) {
  return fields.some((field) =>
    scoreFuzzyField(field, token, {
      exact: 8,
      prefix: 6,
      contains: 4,
    }) > 0,
  );
}

function scoreCommandIntent(command, tokens, normalizedQuery) {
  const aliases = COMMAND_INTENT_ALIASES[command.category] || [];
  if (!aliases.length) return 0;
  const compactQuery = compactSearchValue(normalizedQuery);
  let score = 0;
  tokens.forEach((token) => {
    const compactToken = compactSearchValue(token);
    if (
      aliases.some((alias) => {
        const compactAlias = compactSearchValue(alias);
        return (
          compactAlias === compactToken ||
          compactAlias.startsWith(compactToken) ||
          compactToken.startsWith(compactAlias)
        );
      })
    ) {
      score += 34;
    }
  });
  if (aliases.some((alias) => compactSearchValue(alias) === compactQuery)) {
    score += 26;
  }
  return score + (isFrequentCommand(command) ? 8 : 0);
}

function scoreCommand(command, query, index) {
  const normalizedQuery = normalizeSearchValue(query);
  const baseScore =
    Number(command.priority || 0) + (isFrequentCommand(command) ? 4 : 0) - index / 100;
  if (!normalizedQuery) return baseScore;

  const tokens = tokenizeQuery(query);
  const label = normalizeSearchValue(command.label);
  const id = normalizeSearchValue(command.id);
  const description = normalizeSearchValue(command.description);
  const category = normalizeSearchValue(command.categoryMeta?.label);
  const keywordBlob = normalizeSearchValue((command.keywords || []).join(" "));
  const shortcut = normalizeSearchValue(command.shortcut);
  const searchBlob = getCommandSearchBlob(command);
  const searchableFields = [
    searchBlob,
    label,
    id,
    description,
    category,
    keywordBlob,
    shortcut,
  ];

  if (!tokens.every((token) => fieldMatchesToken(searchableFields, token))) return null;

  let score = baseScore;
  score += scoreCommandIntent(command, tokens, normalizedQuery);
  score += scoreFuzzyField(label, normalizedQuery, {
    exact: 220,
    prefix: 170,
    contains: 110,
  });
  score += scoreFuzzyField(id, normalizedQuery, {
    exact: 90,
    prefix: 70,
    contains: 45,
  });
  score += scoreFuzzyField(keywordBlob, normalizedQuery, {
    exact: 75,
    prefix: 58,
    contains: 38,
  });

  tokens.forEach((token) => {
    score += Math.max(
      scoreFuzzyField(label, token, { exact: 90, prefix: 68, contains: 42 }),
      scoreFuzzyField(id, token, { exact: 58, prefix: 44, contains: 30 }),
      scoreFuzzyField(keywordBlob, token, { exact: 48, prefix: 36, contains: 26 }),
      scoreFuzzyField(category, token, { exact: 32, prefix: 24, contains: 16 }),
      scoreFuzzyField(description, token, { exact: 24, prefix: 18, contains: 12 }),
      scoreFuzzyField(shortcut, token, { exact: 20, prefix: 14, contains: 10 }),
    );
  });

  return score;
}

function getCommandMatchReason(command, query) {
  const normalizedQuery = normalizeSearchValue(query);
  if (!normalizedQuery) return command.categoryMeta?.label || "Command";
  const fields = [
    ["Label", command.label],
    ["Shortcut", command.shortcut],
    ["Keyword", (command.keywords || []).join(" ")],
    ["Category", command.categoryMeta?.label],
    ["Action", command.id],
    ["Description", command.description],
  ];
  const token = tokenizeQuery(query)[0] || normalizedQuery;
  const match = fields.find(([, value]) =>
    scoreFuzzyField(value, token, {
      exact: 8,
      prefix: 6,
      contains: 4,
    }) > 0,
  );
  return match?.[0] || "Command";
}

export function rankCommandPaletteItems(commands, query) {
  return commands
    .map((command, index) => {
      const searchScore = scoreCommand(command, query, index);
      return searchScore === null
        ? null
        : {
            ...command,
            matchReason: getCommandMatchReason(command, query),
            searchScore,
          };
    })
    .filter(Boolean)
    .sort((a, b) => {
      if (b.searchScore !== a.searchScore) return b.searchScore - a.searchScore;
      if (b.priority !== a.priority) return b.priority - a.priority;
      const categoryDelta = categorySortValue(a.category) - categorySortValue(b.category);
      if (categoryDelta !== 0) return categoryDelta;
      return a.label.localeCompare(b.label);
    });
}

export function groupCommandPaletteItems(items) {
  const groups = [];
  const seen = new Map();
  items.forEach((item) => {
    const categoryMeta = item.categoryMeta || EDITOR_COMMAND_CATEGORIES[item.category] || FILE_CATEGORY;
    if (!seen.has(categoryMeta.id)) {
      const group = {
        id: categoryMeta.id,
        label: categoryMeta.label,
        description: categoryMeta.description,
        tone: resolveCategoryTone(categoryMeta.id),
        icon: CATEGORY_ICON_BY_ID[categoryMeta.id] || CATEGORY_ICON_BY_ID.navigation,
        items: [],
      };
      seen.set(categoryMeta.id, group);
      groups.push(group);
    }
    seen.get(categoryMeta.id).items.push(item);
  });
  return groups;
}

function getFileName(file) {
  return String(file?.name || "Untitled");
}

function getFilePath(file) {
  return String(file?.fsPath || file?.path || "");
}

function getFileResultKey(file) {
  return normalizeSearchValue(file?.id || file?.fsPath || file?.path || file?.name);
}

function getFileContent(file) {
  if (typeof file?.content === "string") return file.content;
  if (typeof file?.source === "string") return file.source;
  if (typeof file?.text === "string") return file.text;
  return "";
}

function getUniqueFileEntries(files) {
  const seen = new Set();
  return (files || []).filter((file) => {
    const key = getFileResultKey(file);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function scoreFileResult(file, query, index) {
  const normalizedQuery = normalizeSearchValue(query);
  const name = normalizeSearchValue(getFileName(file));
  const path = normalizeSearchValue(getFilePath(file));
  const blob = `${name} ${path}`;
  if (!normalizedQuery) return 40 - index / 100;

  const tokens = tokenizeQuery(query);
  if (!tokens.every((token) => fieldMatchesToken([blob, name, path], token))) return null;

  let score = 0;
  score += scoreFuzzyField(name, normalizedQuery, {
    exact: 210,
    prefix: 160,
    contains: 95,
  });
  score += scoreFuzzyField(path, normalizedQuery, {
    exact: 80,
    prefix: 65,
    contains: 42,
  });
  tokens.forEach((token) => {
    score += Math.max(
      scoreFuzzyField(name, token, { exact: 80, prefix: 60, contains: 38 }),
      scoreFuzzyField(path, token, { exact: 36, prefix: 28, contains: 18 }),
    );
  });
  return score - index / 100;
}

function getFileMatchReason(file, query) {
  const normalizedQuery = normalizeSearchValue(query);
  if (!normalizedQuery) return "Datei";
  const name = getFileName(file);
  const path = getFilePath(file);
  const token = tokenizeQuery(query)[0] || normalizedQuery;
  if (scoreFuzzyField(name, token, { exact: 8, prefix: 6, contains: 4 }) > 0) {
    return "Name";
  }
  if (scoreFuzzyField(path, token, { exact: 8, prefix: 6, contains: 4 }) > 0) {
    return "Path";
  }
  return "Datei";
}

export function rankSpotlightFiles(files = [], query = "", limit = 8) {
  return getUniqueFileEntries(files)
    .filter((file) => file && file.type === "file" && file.name)
    .map((file, index) => {
      const searchScore = scoreFileResult(file, query, index);
      if (searchScore === null) return null;
      const fallbackPayload = file.id || file.fsPath || file.path || file.name;
      return {
        ...file,
        id: fallbackPayload,
        label: getFileName(file),
        description: getFilePath(file),
        actionId: "open-file",
        payload: fallbackPayload,
        resultKind: "file",
        category: FILE_CATEGORY.id,
        categoryMeta: FILE_CATEGORY,
        icon: File,
        tone: resolveCategoryTone(FILE_CATEGORY.id),
        matchReason: getFileMatchReason(file, query),
        searchScore,
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.searchScore - a.searchScore || a.label.localeCompare(b.label))
    .slice(0, limit);
}

function normalizeSymbolQuery(query) {
  return String(query || "").trim().replace(SYMBOL_QUERY_PREFIX, "").trim();
}

function createSymbolSearchBlob(file, symbol) {
  return [
    symbol.name,
    symbol.kind,
    symbol.detail,
    getFileName(file),
    getFilePath(file),
  ]
    .filter(Boolean)
    .map(normalizeSearchValue)
    .join(" ");
}

function scoreSymbolResult(file, symbol, query, index, symbolIndex) {
  const symbolQuery = normalizeSymbolQuery(query);
  const normalizedQuery = normalizeSearchValue(symbolQuery);
  const symbolName = normalizeSearchValue(symbol.name);
  const kind = normalizeSearchValue(symbol.kind);
  const fileName = normalizeSearchValue(getFileName(file));
  const path = normalizeSearchValue(getFilePath(file));
  const blob = createSymbolSearchBlob(file, symbol);
  const symbolIntentBoost = SYMBOL_QUERY_PREFIX.test(String(query || "").trim()) ? 36 : 0;
  const baseScore = 52 + symbolIntentBoost - index / 20 - symbolIndex / 100;
  if (!normalizedQuery) return baseScore;

  const tokens = tokenizeQuery(symbolQuery);
  if (!tokens.every((token) => fieldMatchesToken([blob, symbolName, kind, fileName, path], token))) {
    return null;
  }

  let score = baseScore;
  score += scoreFuzzyField(symbolName, normalizedQuery, {
    exact: 230,
    prefix: 178,
    contains: 112,
  });
  score += scoreFuzzyField(kind, normalizedQuery, {
    exact: 64,
    prefix: 42,
    contains: 22,
  });
  score += scoreFuzzyField(fileName, normalizedQuery, {
    exact: 52,
    prefix: 38,
    contains: 24,
  });

  tokens.forEach((token) => {
    score += Math.max(
      scoreFuzzyField(symbolName, token, { exact: 86, prefix: 66, contains: 40 }),
      scoreFuzzyField(kind, token, { exact: 34, prefix: 24, contains: 14 }),
      scoreFuzzyField(fileName, token, { exact: 30, prefix: 22, contains: 14 }),
      scoreFuzzyField(path, token, { exact: 18, prefix: 14, contains: 8 }),
    );
  });

  return score;
}

function getSymbolMatchReason(file, symbol, query) {
  const symbolQuery = normalizeSymbolQuery(query);
  const token = tokenizeQuery(symbolQuery)[0] || normalizeSearchValue(symbolQuery);
  if (!token) return "Symbol";
  if (scoreFuzzyField(symbol.name, token, { exact: 8, prefix: 6, contains: 4 }) > 0) {
    return "Symbol";
  }
  if (scoreFuzzyField(symbol.kind, token, { exact: 8, prefix: 6, contains: 4 }) > 0) {
    return "Kind";
  }
  if (scoreFuzzyField(getFileName(file), token, { exact: 8, prefix: 6, contains: 4 }) > 0) {
    return "File";
  }
  return "Scope";
}

export function rankSpotlightSymbols(files = [], query = "", limit = 8) {
  const symbolQuery = normalizeSymbolQuery(query);
  if (!symbolQuery && !SYMBOL_QUERY_PREFIX.test(String(query || "").trim())) {
    return [];
  }

  return getUniqueFileEntries(files)
    .filter((file) => file && file.type === "file" && getFileContent(file).trim())
    .slice(0, SYMBOL_SCAN_FILE_LIMIT)
    .flatMap((file, fileIndex) => {
      const filePath = getFilePath(file) || getFileName(file);
      const symbols = extractDocumentSymbols(
        getFileContent(file),
        detectLanguageId(filePath),
        { maxSymbols: SYMBOL_SCAN_PER_FILE_LIMIT },
      );
      return symbols.map((symbol, symbolIndex) => {
        const searchScore = scoreSymbolResult(
          file,
          symbol,
          query,
          fileIndex,
          symbolIndex,
        );
        if (searchScore === null) return null;
        const payload = file.id || file.fsPath || file.path || file.name;
        return {
          id: `symbol:${payload}:${symbol.id}`,
          label: symbol.name,
          description: `${getFilePath(file) || getFileName(file)}:${symbol.line}`,
          actionId: "open-file",
          payload,
          resultKind: "symbol",
          category: SYMBOL_CATEGORY.id,
          categoryMeta: SYMBOL_CATEGORY,
          icon: FileCode2,
          tone: resolveCategoryTone(SYMBOL_CATEGORY.id),
          matchReason: getSymbolMatchReason(file, symbol, query),
          searchScore,
          symbol,
          fsPath: getFilePath(file),
        };
      });
    })
    .filter(Boolean)
    .sort((a, b) => b.searchScore - a.searchScore || a.label.localeCompare(b.label))
    .slice(0, limit);
}

export function createSpotlightResults({
  files = [],
  query = "",
  maxCommands = 8,
  maxFiles = 8,
  maxSymbols = 8,
  extensionCommands = [],
} = {}) {
  const normalizedQuery = normalizeSearchValue(query);
  const commands = rankCommandPaletteItems(
    getEditorCommandPaletteCommands({ extensionCommands, surface: "spotlight" }),
    query,
  )
    .slice(0, normalizedQuery ? maxCommands : Math.min(maxCommands, 6))
    .map((command) => ({ ...command, resultKind: "command" }));
  const fileResults = rankSpotlightFiles(
    files,
    query,
    normalizedQuery ? maxFiles : Math.min(maxFiles, 5),
  );
  const symbolResults = rankSpotlightSymbols(
    files,
    query,
    normalizedQuery ? maxSymbols : Math.min(maxSymbols, 4),
  );

  if (!normalizedQuery) return [...commands, ...fileResults, ...symbolResults];

  const bestFileScore = fileResults[0]?.searchScore || 0;
  const bestCommandScore = commands[0]?.searchScore || 0;
  const bestSymbolScore = symbolResults[0]?.searchScore || 0;
  const bestFilePath = normalizeSearchValue(fileResults[0]?.description);
  const queryTokens = tokenizeQuery(query);
  const hasPathTokenMatch =
    fileResults[0]?.matchReason === "Path" &&
    queryTokens.some((token) => token.length >= 2 && bestFilePath.includes(token));
  const filesFirst =
    /[./\\]/.test(query) ||
    hasPathTokenMatch ||
    bestFileScore > bestCommandScore + 30;
  const symbolsFirst =
    SYMBOL_QUERY_PREFIX.test(String(query || "").trim()) ||
    bestSymbolScore > Math.max(bestCommandScore, bestFileScore) + 24;
  if (symbolsFirst) return [...symbolResults, ...commands, ...fileResults];
  return filesFirst
    ? [...fileResults, ...symbolResults, ...commands]
    : [...commands, ...symbolResults, ...fileResults];
}
