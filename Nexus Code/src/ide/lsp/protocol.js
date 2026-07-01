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
  CODE_ACTION: "textDocument/codeAction",
  RENAME: "textDocument/rename",
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

export const EMPTY_WORKSPACE_EDIT = Object.freeze({
  changes: Object.freeze({}),
});

function hasServerProvider(value) {
  return value === true || Boolean(value && typeof value === "object");
}

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
  if (range?.start && range?.end) {
    const startLine = Number(range.start.line ?? 0);
    const startCharacter = Number(range.start.character ?? 0);
    const endLine = Number(range.end.line ?? startLine);
    const endCharacter = Number(range.end.character ?? startCharacter);
    return {
      start: {
        line: Math.max(0, Number.isFinite(startLine) ? startLine : 0),
        character: Math.max(0, Number.isFinite(startCharacter) ? startCharacter : 0),
      },
      end: {
        line: Math.max(0, Number.isFinite(endLine) ? endLine : 0),
        character: Math.max(0, Number.isFinite(endCharacter) ? endCharacter : 0),
      },
    };
  }

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
    return { isIncomplete: false, items: result.filter(Boolean) };
  }
  if (Array.isArray(result.items)) {
    return {
      isIncomplete: result.isIncomplete === true,
      items: result.items.filter(Boolean),
    };
  }
  return { ...EMPTY_COMPLETION_LIST, items: [] };
}

export function normalizeHover(result) {
  if (!result) return null;
  if (typeof result === "string") {
    return { contents: result };
  }
  if (Array.isArray(result)) {
    return result.length ? { contents: result.filter(Boolean) } : null;
  }
  if (typeof result === "object" && !("contents" in result) && "value" in result) {
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

export function normalizeCodeActions(result) {
  if (!result) return [];
  if (Array.isArray(result)) return result.filter(Boolean);
  if (Array.isArray(result.items)) return result.items.filter(Boolean);
  if (Array.isArray(result.actions)) return result.actions.filter(Boolean);
  if (Array.isArray(result.commands)) return result.commands.filter(Boolean);
  return [];
}

export function normalizeWorkspaceEdit(result) {
  if (!result || typeof result !== "object") return { changes: {} };
  if (
    result.changes &&
    typeof result.changes === "object" &&
    !Array.isArray(result.changes)
  ) {
    return result;
  }
  if (Array.isArray(result.documentChanges)) {
    return result;
  }
  return { changes: {} };
}

export function normalizeDiagnostics(result) {
  if (!result) return [];
  if (Array.isArray(result)) return result.filter(Boolean);
  if (Array.isArray(result.items)) return result.items.filter(Boolean);
  if (Array.isArray(result.diagnostics)) return result.diagnostics.filter(Boolean);
  return [];
}

export function normalizeServerCapabilities(result) {
  if (!result || typeof result !== "object") return {};
  const capabilities = result.capabilities || result;
  return capabilities && typeof capabilities === "object" ? capabilities : {};
}

export function lspServerCapabilitiesToFeatureMap(capabilities = {}) {
  const normalized = normalizeServerCapabilities(capabilities);
  return {
    completion: hasServerProvider(normalized.completionProvider),
    hover: hasServerProvider(normalized.hoverProvider),
    diagnostics:
      hasServerProvider(normalized.diagnosticProvider) ||
      normalized.textDocumentSync !== undefined,
    definition: hasServerProvider(normalized.definitionProvider),
    formatting: hasServerProvider(normalized.documentFormattingProvider),
    codeActions: hasServerProvider(normalized.codeActionProvider),
    rename: hasServerProvider(normalized.renameProvider),
  };
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
