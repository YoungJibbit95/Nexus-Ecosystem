import { fromLspRange } from "./protocol.js";

const LSP_COMPLETION_KIND_TO_MONACO = {
  1: "Text",
  2: "Method",
  3: "Function",
  4: "Constructor",
  5: "Field",
  6: "Variable",
  7: "Class",
  8: "Interface",
  9: "Module",
  10: "Property",
  11: "Unit",
  12: "Value",
  13: "Enum",
  14: "Keyword",
  15: "Snippet",
  16: "Color",
  17: "File",
  18: "Reference",
  19: "Folder",
  20: "EnumMember",
  21: "Constant",
  22: "Struct",
  23: "Event",
  24: "Operator",
  25: "TypeParameter",
};

function getMonacoCompletionKind(monaco, kind) {
  const key = LSP_COMPLETION_KIND_TO_MONACO[Number(kind)] || "Text";
  return monaco.languages.CompletionItemKind[key] ?? monaco.languages.CompletionItemKind.Text;
}

function normalizeMarkupContent(value) {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value.value === "string") return value.value;
  return "";
}

function normalizeDocumentation(value) {
  const text = normalizeMarkupContent(value);
  return text ? { value: text } : undefined;
}

function completionInsertText(item) {
  if (typeof item?.insertText === "string") return item.insertText;
  if (typeof item?.textEdit?.newText === "string") return item.textEdit.newText;
  return item?.label || "";
}

function completionRange(item, fallbackRange) {
  if (item?.textEdit?.range) return fromLspRange(item.textEdit.range);
  if (item?.textEdit?.insert) return fromLspRange(item.textEdit.insert);
  return fallbackRange;
}

function parseMonacoUri(monaco, uri) {
  if (!uri) return null;
  if (typeof uri === "object") return uri;
  try {
    return monaco.Uri.parse(String(uri));
  } catch {
    return null;
  }
}

function hasRange(value) {
  return Boolean(value?.start && value?.end);
}

export function lspCompletionListToMonaco(monaco, completionList, fallbackRange) {
  const items = Array.isArray(completionList?.items)
    ? completionList.items
    : Array.isArray(completionList)
      ? completionList
      : [];

  return {
    incomplete: completionList?.isIncomplete === true,
    suggestions: items.map((item, index) => ({
      label: item.label || item.insertText || `item-${index + 1}`,
      kind: getMonacoCompletionKind(monaco, item.kind),
      insertText: completionInsertText(item),
      sortText: item.sortText,
      filterText: item.filterText,
      detail: item.detail,
      documentation: normalizeDocumentation(item.documentation),
      range: completionRange(item, fallbackRange),
      commitCharacters: Array.isArray(item.commitCharacters)
        ? item.commitCharacters
        : undefined,
      preselect: item.preselect === true,
      insertTextRules:
        item.insertTextFormat === 2
          ? monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet
          : undefined,
    })),
  };
}

export function lspHoverToMonaco(hover) {
  if (!hover) return null;
  const contents = Array.isArray(hover.contents)
    ? hover.contents
    : [hover.contents || hover];
  const value = contents.map(normalizeMarkupContent).filter(Boolean).join("\n\n");
  if (!value) return null;
  return {
    contents: [{ value }],
    range: hover.range ? fromLspRange(hover.range) : undefined,
  };
}

export function lspDefinitionToMonaco(monaco, definitionResult) {
  const locations = Array.isArray(definitionResult)
    ? definitionResult
    : definitionResult
      ? [definitionResult]
      : [];

  return locations
    .map((location) => {
      if (!location || typeof location !== "object") return null;
      const isLocationLink =
        "targetUri" in location ||
        "targetRange" in location ||
        "targetSelectionRange" in location;
      const uri = parseMonacoUri(monaco, location.targetUri || location.uri);
      const range =
        location.targetRange ||
        location.range ||
        location.targetSelectionRange;

      if (!uri || !hasRange(range)) return null;

      if (isLocationLink) {
        return {
          uri,
          range: fromLspRange(range),
          originSelectionRange: hasRange(location.originSelectionRange)
            ? fromLspRange(location.originSelectionRange)
            : undefined,
          targetSelectionRange: hasRange(location.targetSelectionRange)
            ? fromLspRange(location.targetSelectionRange)
            : undefined,
        };
      }

      return {
        uri,
        range: fromLspRange(range),
      };
    })
    .filter(Boolean);
}

export function lspTextEditsToMonaco(textEdits = []) {
  const edits = Array.isArray(textEdits)
    ? textEdits
    : Array.isArray(textEdits?.edits)
      ? textEdits.edits
      : [];

  return edits
    .map((edit) => {
      if (!hasRange(edit?.range)) return null;
      const text = typeof edit.newText === "string" ? edit.newText : edit.text;
      if (typeof text !== "string") return null;
      return {
        range: fromLspRange(edit.range),
        text,
      };
    })
    .filter(Boolean);
}

export function lspDiagnosticsToMonacoMarkers(monaco, diagnostics = []) {
  const severityMap = {
    1: monaco.MarkerSeverity.Error,
    2: monaco.MarkerSeverity.Warning,
    3: monaco.MarkerSeverity.Info,
    4: monaco.MarkerSeverity.Hint,
  };

  return diagnostics.map((diagnostic) => {
    const range = fromLspRange(diagnostic.range);
    return {
      ...range,
      severity: severityMap[diagnostic.severity] || monaco.MarkerSeverity.Info,
      message: diagnostic.message || "Language server diagnostic",
      source: diagnostic.source || "lsp",
      code: diagnostic.code,
    };
  });
}
