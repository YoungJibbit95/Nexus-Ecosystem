import { HighlightStyle } from "@codemirror/language";
import { tags } from "@lezer/highlight";

const DEFAULT_SYNTAX_COLORS = Object.freeze({
  comment: "#6e7788",
  keyword: "#b987ff",
  string: "#8bd5ca",
  number: "#f5a97f",
  function: "#8aadf4",
  variable: "#cad3f5",
  type: "#91d7e3",
  operator: "#a6adc8",
});

const COMPLETION_KIND_TYPES = Object.freeze({
  1: "text",
  2: "method",
  3: "function",
  4: "function",
  5: "variable",
  6: "variable",
  7: "class",
  8: "interface",
  9: "namespace",
  10: "property",
  11: "property",
  12: "function",
  13: "variable",
  14: "keyword",
  15: "text",
  16: "text",
  17: "text",
  18: "text",
  19: "text",
  20: "constant",
  21: "constant",
  22: "function",
  23: "text",
  24: "class",
  25: "type",
});

const COMPLETION_KIND_NAMES = Object.freeze({
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
  20: "Enum member",
  21: "Constant",
  22: "Struct",
  23: "Event",
  24: "Operator",
  25: "Type parameter",
});

const SNIPPET_PLACEHOLDER_PATTERN = /\$\{(?:\d+:)?([^}]+)\}|\$\d+/g;
const WORD_COMPLETION_PATTERN = /^[\w$-]*$/;

function normalizeHex(value, fallback) {
  const normalized = String(value || "").trim();
  return /^#[0-9a-f]{6}$/i.test(normalized) ? normalized : fallback;
}

function getThemeSyntax(theme) {
  return {
    ...DEFAULT_SYNTAX_COLORS,
    comment: theme?.comment || theme?.syntax?.comment || DEFAULT_SYNTAX_COLORS.comment,
    keyword: theme?.keyword || theme?.syntax?.keyword || DEFAULT_SYNTAX_COLORS.keyword,
    string: theme?.string || theme?.syntax?.string || DEFAULT_SYNTAX_COLORS.string,
    number: theme?.number || theme?.syntax?.number || DEFAULT_SYNTAX_COLORS.number,
    function: theme?.function || theme?.syntax?.function || DEFAULT_SYNTAX_COLORS.function,
    variable: theme?.variable || theme?.syntax?.variable || DEFAULT_SYNTAX_COLORS.variable,
    type: theme?.type || theme?.syntax?.type || DEFAULT_SYNTAX_COLORS.type,
    operator: theme?.operator || theme?.syntax?.operator || DEFAULT_SYNTAX_COLORS.operator,
  };
}

export function createEditorHighlightStyle(theme) {
  const syntax = getThemeSyntax(theme);
  const muted = normalizeHex(theme?.muted, "#8b93a7");
  const text = normalizeHex(theme?.text, "#d7dae0");

  return HighlightStyle.define([
    { tag: tags.comment, color: normalizeHex(syntax.comment, muted), fontStyle: "italic" },
    { tag: [tags.keyword, tags.modifier, tags.controlKeyword], color: normalizeHex(syntax.keyword, text) },
    { tag: [tags.string, tags.special(tags.string), tags.regexp], color: normalizeHex(syntax.string, text) },
    { tag: [tags.number, tags.integer, tags.float, tags.bool, tags.null, tags.atom], color: normalizeHex(syntax.number, text) },
    { tag: [tags.function(tags.variableName), tags.function(tags.propertyName), tags.definition(tags.function(tags.variableName))], color: normalizeHex(syntax.function, text) },
    { tag: [tags.variableName, tags.definition(tags.variableName), tags.self], color: normalizeHex(syntax.variable, text) },
    { tag: [tags.typeName, tags.className, tags.namespace, tags.standard(tags.typeName)], color: normalizeHex(syntax.type, text) },
    { tag: [tags.operator, tags.compareOperator, tags.logicOperator, tags.arithmeticOperator, tags.derefOperator], color: normalizeHex(syntax.operator, text) },
    { tag: [tags.propertyName, tags.attributeName], color: normalizeHex(syntax.function, text) },
    { tag: tags.labelName, color: normalizeHex(syntax.type, text) },
    { tag: [tags.meta, tags.processingInstruction], color: muted },
    { tag: tags.invalid, color: "#fecaca", textDecoration: "underline wavy #ef4444" },
  ]);
}

export function cmPosToLspPosition(doc, pos) {
  const line = doc.lineAt(pos);
  return {
    lineNumber: line.number,
    column: pos - line.from + 1,
  };
}

export function lspRangeToCodeMirrorRange(doc, range) {
  if (!doc || !range?.start) return null;
  const resolvePos = (position) => {
    const lineNumber = Math.max(
      1,
      Math.min(doc.lines, Number(position?.line ?? 0) + 1),
    );
    const line = doc.line(lineNumber);
    const character = Math.max(0, Number(position?.character ?? 0));
    return Math.max(line.from, Math.min(line.to, line.from + character));
  };
  const from = resolvePos(range.start);
  const to = range.end ? resolvePos(range.end) : from;
  return {
    from: Math.min(from, to),
    to: Math.max(from, to),
  };
}

export function lspSeverityToProblemSeverity(severity) {
  if (severity === 1 || severity === "error") return 8;
  if (severity === 2 || severity === "warning") return 4;
  if (severity === 3 || severity === "info" || severity === "information") return 2;
  return 1;
}

export function getProblemSeverityId(problem) {
  if (problem?.severity === 8) return "error";
  if (problem?.severity === 4) return "warning";
  if (problem?.severity === 2) return "info";
  return "hint";
}

export function getProblemFilePath(problem) {
  if (problem?.resource?.path) return String(problem.resource.path);
  if (problem?.resource) return String(problem.resource);
  return "Unknown File";
}

export function getProblemKey(problem, index = 0) {
  return [
    getProblemFilePath(problem),
    problem?.startLineNumber ?? 1,
    problem?.startColumn ?? 1,
    problem?.severity ?? 0,
    problem?.source || "",
    problem?.code || "",
    problem?.message || "",
    index,
  ].join("|");
}

export function problemMatchesQuery(problem, query) {
  const normalized = String(query || "").trim().toLowerCase();
  if (!normalized) return true;
  return [
    problem?.message,
    problem?.source,
    problem?.code,
    getProblemSeverityId(problem),
    getProblemFilePath(problem),
  ]
    .filter(Boolean)
    .some((value) => String(value).toLowerCase().includes(normalized));
}

export function lspDiagnosticsToProblems(diagnostics, resource) {
  return (diagnostics || []).slice(0, 180).map((diagnostic, index) => {
    const range = diagnostic.range || {};
    const start = range.start || {};
    const end = range.end || {};
    const line = Number(start.line ?? 0) + 1;
    const column = Number(start.character ?? 0) + 1;
    return {
      id: [
        resource,
        line,
        column,
        diagnostic.severity,
        diagnostic.source,
        diagnostic.code,
        diagnostic.message,
        index,
      ].join("|"),
      message: diagnostic.message || "Diagnostic",
      source: diagnostic.source || "nexus-lsp",
      code: diagnostic.code,
      severity: lspSeverityToProblemSeverity(diagnostic.severity),
      startLineNumber: Math.max(1, line),
      startColumn: Math.max(1, column),
      endLineNumber: Math.max(1, Number(end.line ?? start.line ?? 0) + 1),
      endColumn: Math.max(1, Number(end.character ?? start.character ?? 0) + 1),
      resource,
    };
  });
}

export function lspDiagnosticsToCodeMirror(diagnostics, view) {
  const doc = view?.state?.doc;
  if (!doc) return [];
  return (diagnostics || []).slice(0, 220).map((diagnostic) => {
    const range = lspRangeToCodeMirrorRange(doc, diagnostic.range) || {
      from: 0,
      to: Math.min(doc.length, 1),
    };
    const from = Math.max(0, Math.min(doc.length, range.from));
    const fallbackTo = Math.min(doc.length, from + 1);
    const to = Math.max(from, Math.min(doc.length, range.to || fallbackTo));
    const severity =
      diagnostic.severity === 1
        ? "error"
        : diagnostic.severity === 2
          ? "warning"
          : "info";

    return {
      from,
      to: to === from && from < doc.length ? from + 1 : to,
      severity,
      message: diagnostic.message || "Diagnostic",
      source: diagnostic.source || "nexus-lsp",
    };
  });
}

export function findDiagnosticAtPosition(diagnostics, view, pos) {
  return lspDiagnosticsToCodeMirror(diagnostics, view)
    .filter((diagnostic) => diagnostic.from <= pos && pos <= diagnostic.to)
    .sort((a, b) => {
      const severityDelta =
        (a.severity === "error" ? 0 : a.severity === "warning" ? 1 : 2) -
        (b.severity === "error" ? 0 : b.severity === "warning" ? 1 : 2);
      if (severityDelta !== 0) return severityDelta;
      return a.to - a.from - (b.to - b.from);
    })[0] || null;
}

function stripLspSnippet(value) {
  return String(value || "").replace(SNIPPET_PLACEHOLDER_PATTERN, (_, placeholder) =>
    placeholder ? String(placeholder) : "",
  );
}

function completionType(kind) {
  return COMPLETION_KIND_TYPES[Number(kind)] || "text";
}

function completionKindName(kind) {
  return COMPLETION_KIND_NAMES[Number(kind)] || "Symbol";
}

function normalizeCompletionLabel(item) {
  if (typeof item?.label === "string") return item.label;
  if (item?.label?.label) return item.label.label;
  return String(item?.insertText || item?.textEdit?.newText || "completion");
}

function readMarkupContent(value) {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    return value.map(readMarkupContent).filter(Boolean).join("\n\n");
  }
  if (typeof value === "object") {
    if (typeof value.value === "string") return value.value;
    if (typeof value.contents === "string" || Array.isArray(value.contents)) {
      return readMarkupContent(value.contents);
    }
  }
  return "";
}

export function readHoverText(hover) {
  return readMarkupContent(hover?.contents ?? hover)
    .replace(/\r\n/g, "\n")
    .trim();
}

function resolveCompletionText(item, label) {
  const text = item?.textEdit?.newText ?? item?.insertText ?? item?.label?.label ?? label;
  return item?.insertTextFormat === 2 ? stripLspSnippet(text) : String(text || label);
}

function applyCompletionTextEdit(item, insertText) {
  const range = item?.textEdit?.range || item?.textEdit?.insert || item?.textEdit?.replace;
  if (!range) return insertText;

  return (view, _completion, from, to) => {
    const resolvedRange = lspRangeToCodeMirrorRange(view.state.doc, range);
    const changeFrom = resolvedRange?.from ?? from;
    const changeTo = resolvedRange?.to ?? to;
    view.dispatch({
      changes: { from: changeFrom, to: changeTo, insert: insertText },
      selection: { anchor: changeFrom + insertText.length },
      userEvent: "input.complete",
    });
  };
}

function getCompletionBoost(item, index) {
  if (item?.preselect) return 99;
  if (item?.sortText && /^[!#0]/.test(String(item.sortText))) return 30;
  return Math.max(-30, 12 - index / 8);
}

export function createSnippetCompletions(context) {
  const word = context.matchBefore(/[\w$-]*/);
  const from = word ? word.from : context.pos;
  return {
    from,
    options: [
      {
        label: "nexus-component",
        type: "function",
        detail: "Nexus React component",
        boost: 25,
        apply: [
          "import React from 'react';",
          "import { motion } from 'framer-motion';",
          "",
          "export default function ComponentName() {",
          "  return (",
          "    <motion.div className=\"nexus-glass p-6 rounded-lg\">",
          "      <h1>Hello Nexus</h1>",
          "    </motion.div>",
          "  );",
          "}",
        ].join("\n"),
      },
      {
        label: "clg",
        type: "function",
        detail: "console.log",
        boost: 20,
        apply: "console.log();",
      },
      {
        label: "useState",
        type: "function",
        detail: "React state hook",
        boost: 16,
        apply: "const [value, setValue] = useState(null);",
      },
    ],
    validFor: WORD_COMPLETION_PATTERN,
  };
}

export function shouldRequestLspCompletion(context) {
  if (context.explicit) return true;
  const before = context.state.sliceDoc(Math.max(0, context.pos - 1), context.pos);
  return /[.\w$:/<#@"'`-]$/.test(before);
}

export function lspCompletionsToCodeMirror(context, completionList, snippetResult, maxItems = 120) {
  const word = context.matchBefore(/[\w$-]*/);
  const from = word ? word.from : context.pos;
  const items = completionList?.items || [];
  const options = items.slice(0, maxItems).map((item, index) => {
    const label = normalizeCompletionLabel(item);
    const insertText = resolveCompletionText(item, label);
    const documentation = readMarkupContent(item.documentation).trim();
    const kindDetail = completionKindName(item.kind);
    const detailParts = [
      item.detail,
      item.labelDetails?.detail,
      item.labelDetails?.description,
    ].filter(Boolean);

    return {
      label,
      type: completionType(item.kind),
      detail: detailParts.join(" ").trim() || kindDetail,
      info: documentation || kindDetail,
      apply: applyCompletionTextEdit(item, insertText),
      boost: getCompletionBoost(item, index),
      section: item.sortText?.startsWith("!") ? "Recommended" : "Language Server",
    };
  });

  const unique = new Map();
  [...snippetResult.options, ...options].forEach((option) => {
    const key = `${option.label}|${option.detail || ""}`;
    if (!unique.has(key)) unique.set(key, option);
  });

  return {
    from,
    options: [...unique.values()],
    validFor: completionList?.isIncomplete ? undefined : WORD_COMPLETION_PATTERN,
  };
}

