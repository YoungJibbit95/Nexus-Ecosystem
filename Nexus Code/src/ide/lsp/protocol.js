export const LSP_METHODS = Object.freeze({
  INITIALIZE: "initialize",
  INITIALIZED: "initialized",
  DID_OPEN: "textDocument/didOpen",
  DID_CHANGE: "textDocument/didChange",
  DID_CLOSE: "textDocument/didClose",
  COMPLETION: "textDocument/completion",
  HOVER: "textDocument/hover",
  DEFINITION: "textDocument/definition",
  FORMATTING: "textDocument/formatting",
  DIAGNOSTIC: "textDocument/diagnostic",
});

export const LSP_DIAGNOSTIC_SEVERITY = Object.freeze({
  ERROR: 1,
  WARNING: 2,
  INFORMATION: 3,
  HINT: 4,
});

export const EMPTY_COMPLETION_LIST = Object.freeze({
  isIncomplete: false,
  items: Object.freeze([]),
});

export function toLspPosition(position = {}) {
  const lineNumber = Number(position.lineNumber ?? position.line ?? 1);
  const column = Number(position.column ?? position.character ?? 1);
  return {
    line: Math.max(0, Number.isFinite(lineNumber) ? lineNumber - 1 : 0),
    character: Math.max(0, Number.isFinite(column) ? column - 1 : 0),
  };
}

export function fromLspPosition(position = {}) {
  const line = Number(position.line ?? 0);
  const character = Number(position.character ?? 0);
  return {
    lineNumber: Math.max(1, Number.isFinite(line) ? line + 1 : 1),
    column: Math.max(1, Number.isFinite(character) ? character + 1 : 1),
  };
}

export function toLspRange(range = {}) {
  return {
    start: toLspPosition({
      lineNumber: range.startLineNumber,
      column: range.startColumn,
    }),
    end: toLspPosition({
      lineNumber: range.endLineNumber ?? range.startLineNumber,
      column: range.endColumn ?? range.startColumn,
    }),
  };
}

export function fromLspRange(range = {}) {
  const start = fromLspPosition(range.start);
  const end = fromLspPosition(range.end || range.start);
  return {
    startLineNumber: start.lineNumber,
    startColumn: start.column,
    endLineNumber: end.lineNumber,
    endColumn: end.column,
  };
}

export function toTextDocumentIdentifier(document) {
  return {
    uri: document?.uri || "",
  };
}

export function toTextDocumentItem(document) {
  return {
    uri: document?.uri || "",
    languageId: document?.languageId || "plaintext",
    version: Number.isFinite(document?.version) ? Number(document.version) : 1,
    text: typeof document?.value === "string" ? document.value : "",
  };
}

export function normalizeCompletionList(result) {
  if (!result) return { ...EMPTY_COMPLETION_LIST, items: [] };
  if (Array.isArray(result)) {
    return { isIncomplete: false, items: result };
  }
  if (Array.isArray(result.items)) {
    return {
      isIncomplete: result.isIncomplete === true,
      items: result.items,
    };
  }
  return { ...EMPTY_COMPLETION_LIST, items: [] };
}

export function normalizeHover(result) {
  if (!result) return null;
  if (typeof result === "string") {
    return { contents: result };
  }
  return result;
}

export function normalizeDefinition(result) {
  if (!result) return [];
  if (Array.isArray(result)) return result.filter(Boolean);
  return [result].filter(Boolean);
}

export function normalizeTextEdits(result) {
  if (!result) return [];
  if (Array.isArray(result)) return result.filter(Boolean);
  if (Array.isArray(result.edits)) return result.edits.filter(Boolean);
  if (Array.isArray(result.items)) return result.items.filter(Boolean);
  return [];
}

export function normalizeDiagnostics(result) {
  if (!result) return [];
  if (Array.isArray(result)) return result;
  if (Array.isArray(result.items)) return result.items;
  if (Array.isArray(result.diagnostics)) return result.diagnostics;
  return [];
}

export function toLspFormattingOptions(options = {}) {
  const tabSize = Number(options.tabSize);
  return {
    tabSize: Number.isFinite(tabSize) && tabSize > 0 ? tabSize : 2,
    insertSpaces: options.insertSpaces !== false,
    ...(typeof options.trimTrailingWhitespace === "boolean"
      ? { trimTrailingWhitespace: options.trimTrailingWhitespace }
      : {}),
    ...(typeof options.insertFinalNewline === "boolean"
      ? { insertFinalNewline: options.insertFinalNewline }
      : {}),
    ...(typeof options.trimFinalNewlines === "boolean"
      ? { trimFinalNewlines: options.trimFinalNewlines }
      : {}),
  };
}
