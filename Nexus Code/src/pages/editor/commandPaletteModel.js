import {
  Blocks,
  File,
  FileCode2,
  FolderOpen,
  GitBranch,
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
  getEditorCommandCategory,
} from "./editorFeatureModel.js";

const COMMAND_ICON_BY_ID = Object.freeze({
  "new-file": FileCode2,
  "open-folder": FolderOpen,
  "open-explorer": PanelLeft,
  "open-search": Search,
  "focus-editor": FileCode2,
  "github-sync": GitBranch,
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
  "open-extensions": Blocks,
  "change-theme": Palette,
  "open-settings": Settings,
  "open-account": Settings,
});

const CATEGORY_ICON_BY_ID = Object.freeze({
  file: FileCode2,
  navigation: Search,
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
    dot: "bg-emerald-300",
    text: "text-emerald-200",
    chip: "border-emerald-300/20 bg-emerald-300/10 text-emerald-100",
    icon: "border-emerald-300/15 bg-emerald-300/10 text-emerald-200",
    active: "border-emerald-300/25 bg-emerald-300/10",
  }),
  "source-control": Object.freeze({
    dot: "bg-amber-300",
    text: "text-amber-200",
    chip: "border-amber-300/20 bg-amber-300/10 text-amber-100",
    icon: "border-amber-300/15 bg-amber-300/10 text-amber-200",
    active: "border-amber-300/25 bg-amber-300/10",
  }),
  diagnostics: Object.freeze({
    dot: "bg-rose-300",
    text: "text-rose-200",
    chip: "border-rose-300/20 bg-rose-300/10 text-rose-100",
    icon: "border-rose-300/15 bg-rose-300/10 text-rose-200",
    active: "border-rose-300/25 bg-rose-300/10",
  }),
  terminal: Object.freeze({
    dot: "bg-blue-300",
    text: "text-blue-200",
    chip: "border-blue-300/20 bg-blue-300/10 text-blue-100",
    icon: "border-blue-300/15 bg-blue-300/10 text-blue-200",
    active: "border-blue-300/25 bg-blue-300/10",
  }),
  layout: Object.freeze({
    dot: "bg-violet-300",
    text: "text-violet-200",
    chip: "border-violet-300/20 bg-violet-300/10 text-violet-100",
    icon: "border-violet-300/15 bg-violet-300/10 text-violet-200",
    active: "border-violet-300/25 bg-violet-300/10",
  }),
  extensions: Object.freeze({
    dot: "bg-teal-300",
    text: "text-teal-200",
    chip: "border-teal-300/20 bg-teal-300/10 text-teal-100",
    icon: "border-teal-300/15 bg-teal-300/10 text-teal-200",
    active: "border-teal-300/25 bg-teal-300/10",
  }),
  preferences: Object.freeze({
    dot: "bg-slate-300",
    text: "text-slate-200",
    chip: "border-slate-300/20 bg-slate-300/10 text-slate-100",
    icon: "border-slate-300/15 bg-slate-300/10 text-slate-200",
    active: "border-slate-300/25 bg-slate-300/10",
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

function scoreCommand(command, query, index) {
  const normalizedQuery = normalizeSearchValue(query);
  const baseScore = Number(command.priority || 0) - index / 100;
  if (!normalizedQuery) return baseScore;

  const tokens = tokenizeQuery(query);
  const label = normalizeSearchValue(command.label);
  const id = normalizeSearchValue(command.id);
  const description = normalizeSearchValue(command.description);
  const category = normalizeSearchValue(command.categoryMeta?.label);
  const keywordBlob = normalizeSearchValue((command.keywords || []).join(" "));
  const shortcut = normalizeSearchValue(command.shortcut);
  const searchBlob = getCommandSearchBlob(command);

  if (!tokens.every((token) => searchBlob.includes(token))) return null;

  let score = baseScore;
  score += scoreTextField(label, normalizedQuery, {
    exact: 220,
    prefix: 170,
    contains: 110,
  });
  score += scoreTextField(id, normalizedQuery, {
    exact: 90,
    prefix: 70,
    contains: 45,
  });
  score += scoreTextField(keywordBlob, normalizedQuery, {
    exact: 75,
    prefix: 58,
    contains: 38,
  });

  tokens.forEach((token) => {
    score += Math.max(
      scoreTextField(label, token, { exact: 90, prefix: 68, contains: 42 }),
      scoreTextField(id, token, { exact: 58, prefix: 44, contains: 30 }),
      scoreTextField(keywordBlob, token, { exact: 48, prefix: 36, contains: 26 }),
      scoreTextField(category, token, { exact: 32, prefix: 24, contains: 16 }),
      scoreTextField(description, token, { exact: 24, prefix: 18, contains: 12 }),
      scoreTextField(shortcut, token, { exact: 20, prefix: 14, contains: 10 }),
    );
  });

  return score;
}

export function rankCommandPaletteItems(commands, query) {
  return commands
    .map((command, index) => {
      const searchScore = scoreCommand(command, query, index);
      return searchScore === null ? null : { ...command, searchScore };
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

function scoreFileResult(file, query, index) {
  const normalizedQuery = normalizeSearchValue(query);
  const name = normalizeSearchValue(getFileName(file));
  const path = normalizeSearchValue(getFilePath(file));
  const blob = `${name} ${path}`;
  if (!normalizedQuery) return 40 - index / 100;

  const tokens = tokenizeQuery(query);
  if (!tokens.every((token) => blob.includes(token))) return null;

  let score = 0;
  score += scoreTextField(name, normalizedQuery, {
    exact: 210,
    prefix: 160,
    contains: 95,
  });
  score += scoreTextField(path, normalizedQuery, {
    exact: 80,
    prefix: 65,
    contains: 42,
  });
  tokens.forEach((token) => {
    score += Math.max(
      scoreTextField(name, token, { exact: 80, prefix: 60, contains: 38 }),
      scoreTextField(path, token, { exact: 36, prefix: 28, contains: 18 }),
    );
  });
  return score - index / 100;
}

export function rankSpotlightFiles(files = [], query = "", limit = 8) {
  return (files || [])
    .filter((file) => file && file.type === "file" && file.name)
    .map((file, index) => {
      const searchScore = scoreFileResult(file, query, index);
      if (searchScore === null) return null;
      return {
        ...file,
        id: file.id || file.fsPath || file.name,
        label: getFileName(file),
        description: getFilePath(file),
        actionId: "open-file",
        payload: file.id,
        resultKind: "file",
        category: FILE_CATEGORY.id,
        categoryMeta: FILE_CATEGORY,
        icon: File,
        tone: resolveCategoryTone(FILE_CATEGORY.id),
        searchScore,
      };
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

  if (!normalizedQuery) return [...commands, ...fileResults];

  const bestFileScore = fileResults[0]?.searchScore || 0;
  const bestCommandScore = commands[0]?.searchScore || 0;
  const filesFirst = /[./\\]/.test(query) || bestFileScore > bestCommandScore + 30;
  return filesFirst ? [...fileResults, ...commands] : [...commands, ...fileResults];
}
