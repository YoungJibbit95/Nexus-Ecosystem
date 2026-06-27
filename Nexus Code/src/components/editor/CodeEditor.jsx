import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import CodeMirror from "@uiw/react-codemirror";
import {
  drawSelection,
  dropCursor,
  EditorView,
  highlightActiveLine,
  highlightActiveLineGutter,
  highlightSpecialChars,
  keymap,
  lineNumbers,
  placeholder,
  rectangularSelection,
} from "@codemirror/view";
import { EditorState, Compartment } from "@codemirror/state";
import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
import {
  autocompletion,
  closeBrackets,
  closeBracketsKeymap,
  completionKeymap,
} from "@codemirror/autocomplete";
import {
  bracketMatching,
  defaultHighlightStyle,
  foldGutter,
  foldKeymap,
  indentOnInput,
  syntaxHighlighting,
} from "@codemirror/language";
import { lintGutter, lintKeymap, setDiagnostics } from "@codemirror/lint";
import { searchKeymap, highlightSelectionMatches } from "@codemirror/search";
import { javascript } from "@codemirror/lang-javascript";
import { json } from "@codemirror/lang-json";
import { html } from "@codemirror/lang-html";
import { css } from "@codemirror/lang-css";
import { markdown } from "@codemirror/lang-markdown";
import { python } from "@codemirror/lang-python";
import { java } from "@codemirror/lang-java";
import { cpp } from "@codemirror/lang-cpp";
import { php } from "@codemirror/lang-php";
import { rust } from "@codemirror/lang-rust";
import { sql } from "@codemirror/lang-sql";
import { xml } from "@codemirror/lang-xml";
import { THEMES as EDITOR_THEMES } from "../../pages/editor/editorShared.jsx";
import { createEditorEngine } from "../../ide/editor/editorEngine.js";
import { createDocumentUriDescriptor } from "../../ide/editor/documentUri.js";
import {
  detectLanguageId,
  getLanguageDisplayName,
  isLspReadyLanguage,
  LANGUAGE_IDS,
} from "../../ide/languages/languageIds.js";
import {
  createElectronLspTransport,
  hasElectronLspBridge,
} from "../../ide/lsp/index.js";

const EDITOR_CHANGE_EMIT_INTERVAL_MS = 48;
const CURSOR_INFO_UPDATE_MS = 45;
const LINE_COUNT_UPDATE_MS = 80;
const LARGE_FILE_CHAR_THRESHOLD = 220_000;
const COMPACT_VIEWPORT_WIDTH = 920;
const DEFAULT_EDITOR_FONT_STACK =
  "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace";

const cmThemeCompartment = new Compartment();
const languageCompartment = new Compartment();
const diagnosticsCompartment = new Compartment();

function clampNumber(value, min, max, fallback) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.max(min, Math.min(max, numeric));
}

function getCompactViewport() {
  if (typeof window === "undefined") return false;
  return window.innerWidth < COMPACT_VIEWPORT_WIDTH;
}

function resolveEditorFontSize(settings, fallbackFontSize) {
  return Math.round(
    clampNumber(settings.font_size ?? fallbackFontSize, 11, 22, 14),
  );
}

function resolveEditorLineHeight(settings, resolvedFontSize) {
  const raw = clampNumber(settings.line_height, 1.2, 34, 1.55);
  const pixelValue = raw <= 3 ? raw * resolvedFontSize : raw;
  return Math.round(Math.max(resolvedFontSize + 4, Math.min(40, pixelValue)));
}

function resolveEditorLetterSpacing(settings) {
  return clampNumber(settings.letter_spacing, 0, 1.5, 0);
}

function resolveEditorTabSize(settings, fallbackTabSize) {
  return Math.round(clampNumber(settings.tab_size ?? fallbackTabSize, 2, 8, 4));
}

function resolveEditorFontFamily(settings) {
  const configured = String(settings.font_family || "").trim();
  if (!configured) return DEFAULT_EDITOR_FONT_STACK;
  return `'${configured.replace(/'/g, "")}', ${DEFAULT_EDITOR_FONT_STACK}`;
}

function safeHex(value, fallback) {
  const normalized = String(value || "").trim();
  return /^#[0-9a-f]{6}$/i.test(normalized) ? normalized : fallback;
}

function hexToRgba(value, alpha) {
  const hex = safeHex(value, "#8b5cf6").slice(1);
  const r = Number.parseInt(hex.slice(0, 2), 16);
  const g = Number.parseInt(hex.slice(2, 4), 16);
  const b = Number.parseInt(hex.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function createNexusCodeMirrorTheme(settings, compactViewport, editorFontSize, editorLineHeight) {
  const theme = EDITOR_THEMES[settings.theme] || EDITOR_THEMES.nexus_vibrant;
  const accent = safeHex(settings.primary_accent || theme.accent, "#8b5cf6");
  const text = safeHex(theme.text, "#f3f4f6");
  const selection = theme.selection || hexToRgba(accent, 0.26);
  const panelSurface = "var(--nexus-panel-surface)";
  const letterSpacing = resolveEditorLetterSpacing(settings);

  return EditorView.theme(
    {
      "&": {
        height: "100%",
        minHeight: 0,
        background: "transparent",
        color: text,
        fontFamily: resolveEditorFontFamily(settings),
        fontSize: `${editorFontSize}px`,
        letterSpacing: `${letterSpacing}px`,
      },
      ".cm-scroller": {
        height: "100%",
        overflow: "auto",
        fontFamily: "inherit",
        lineHeight: `${editorLineHeight}px`,
        background: "transparent",
      },
      ".cm-content": {
        minHeight: "100%",
        padding: `${compactViewport ? 14 : 20}px ${compactViewport ? 14 : 24}px`,
        caretColor: accent,
      },
      ".cm-line": {
        padding: "0 2px",
      },
      ".cm-gutters": {
        background: "rgba(0,0,0,0.12)",
        color: "#7d8598",
        borderRight: "1px solid rgba(255,255,255,0.05)",
      },
      ".cm-lineNumbers .cm-gutterElement": {
        padding: compactViewport ? "0 8px 0 10px" : "0 12px 0 14px",
        minWidth: compactViewport ? "2.4rem" : "3rem",
      },
      ".cm-activeLine": {
        backgroundColor: "rgba(255,255,255,0.045)",
      },
      ".cm-activeLineGutter": {
        backgroundColor: hexToRgba(accent, 0.1),
        color: "#d8b4fe",
      },
      ".cm-selectionBackground, .cm-content ::selection": {
        backgroundColor: selection,
      },
      ".cm-cursor": {
        borderLeftColor: accent,
        borderLeftWidth: settings.cursor_style === "block" ? "0.55em" : "2px",
      },
      ".cm-matchingBracket, .cm-nonmatchingBracket": {
        outline: `1px solid ${hexToRgba(accent, 0.55)}`,
        backgroundColor: hexToRgba(accent, 0.12),
      },
      ".cm-panels, .cm-tooltip, .cm-tooltip-autocomplete": {
        background: panelSurface,
        backdropFilter: "var(--nexus-panel-filter)",
        border: "1px solid var(--nexus-border)",
        borderRadius: "8px",
        overflow: "hidden",
      },
      ".cm-tooltip": {
        color: "var(--nexus-text)",
        boxShadow: "0 18px 55px rgba(0,0,0,0.35)",
      },
      ".cm-tooltip-autocomplete ul li[aria-selected]": {
        background: hexToRgba(accent, 0.18),
        color: "#fff",
      },
      ".cm-searchMatch": {
        backgroundColor: "rgba(250,204,21,0.24)",
        outline: "1px solid rgba(250,204,21,0.25)",
      },
      ".cm-searchMatch.cm-searchMatch-selected": {
        backgroundColor: hexToRgba(accent, 0.32),
      },
      ".cm-diagnostic": {
        borderRadius: "4px",
      },
      ".cm-foldGutter .cm-gutterElement": {
        color: "#64748b",
      },
      ".cm-placeholder": {
        color: "#64748b",
      },
    },
    { dark: true },
  );
}

function getLanguageExtension(languageId, fileName) {
  const lowerName = String(fileName || "").toLowerCase();
  switch (languageId) {
    case LANGUAGE_IDS.JAVASCRIPT:
      return javascript({ jsx: lowerName.endsWith(".jsx") });
    case LANGUAGE_IDS.TYPESCRIPT:
      return javascript({ typescript: true, jsx: lowerName.endsWith(".tsx") });
    case LANGUAGE_IDS.JSON:
    case LANGUAGE_IDS.JSONC:
      return json();
    case LANGUAGE_IDS.HTML:
    case LANGUAGE_IDS.VUE:
    case LANGUAGE_IDS.SVELTE:
    case LANGUAGE_IDS.ASTRO:
      return html({ matchClosingTags: true });
    case LANGUAGE_IDS.CSS:
    case LANGUAGE_IDS.SCSS:
    case LANGUAGE_IDS.LESS:
      return css();
    case LANGUAGE_IDS.MARKDOWN:
    case LANGUAGE_IDS.MDX:
      return markdown();
    case LANGUAGE_IDS.PYTHON:
      return python();
    case LANGUAGE_IDS.JAVA:
      return java();
    case LANGUAGE_IDS.C:
    case LANGUAGE_IDS.CPP:
    case LANGUAGE_IDS.CSHARP:
      return cpp();
    case LANGUAGE_IDS.PHP:
      return php();
    case LANGUAGE_IDS.RUST:
      return rust();
    case LANGUAGE_IDS.SQL:
      return sql();
    case LANGUAGE_IDS.XML:
      return xml();
    default:
      return [];
  }
}

function countLines(value) {
  if (!value) return 1;
  let lines = 1;
  for (let index = 0; index < value.length; index += 1) {
    if (value.charCodeAt(index) === 10) lines += 1;
  }
  return lines;
}

function cmPosToLspPosition(doc, pos) {
  const line = doc.lineAt(pos);
  return {
    lineNumber: line.number,
    column: pos - line.from + 1,
  };
}

function lspSeverityToProblemSeverity(severity) {
  if (severity === 1 || severity === "error") return 8;
  if (severity === 2 || severity === "warning") return 4;
  return 2;
}

function lspDiagnosticsToProblems(diagnostics, resource) {
  return (diagnostics || []).slice(0, 140).map((diagnostic) => {
    const range = diagnostic.range || {};
    const start = range.start || {};
    const end = range.end || {};
    return {
      message: diagnostic.message || "Diagnostic",
      source: diagnostic.source || "nexus-lsp",
      code: diagnostic.code,
      severity: lspSeverityToProblemSeverity(diagnostic.severity),
      startLineNumber: Number(start.line ?? 0) + 1,
      startColumn: Number(start.character ?? 0) + 1,
      endLineNumber: Number(end.line ?? start.line ?? 0) + 1,
      endColumn: Number(end.character ?? start.character ?? 0) + 1,
      resource,
    };
  });
}

function lspDiagnosticsToCodeMirror(diagnostics, view) {
  const doc = view?.state?.doc;
  if (!doc) return [];
  return (diagnostics || []).slice(0, 180).map((diagnostic) => {
    const range = diagnostic.range || {};
    const startLine = Math.max(1, Number(range.start?.line ?? 0) + 1);
    const endLine = Math.max(1, Number(range.end?.line ?? range.start?.line ?? 0) + 1);
    const safeStartLine = Math.min(doc.lines, startLine);
    const safeEndLine = Math.min(doc.lines, endLine);
    const startInfo = doc.line(safeStartLine);
    const endInfo = doc.line(safeEndLine);
    const from = Math.min(
      doc.length,
      startInfo.from + Math.max(0, Number(range.start?.character ?? 0)),
    );
    const to = Math.max(
      from,
      Math.min(doc.length, endInfo.from + Math.max(0, Number(range.end?.character ?? 0))),
    );
    return {
      from,
      to: to || Math.min(doc.length, from + 1),
      severity: diagnostic.severity === 1 ? "error" : diagnostic.severity === 2 ? "warning" : "info",
      message: diagnostic.message || "Diagnostic",
      source: diagnostic.source || "nexus-lsp",
    };
  });
}

function normalizeCompletionLabel(item) {
  if (typeof item?.label === "string") return item.label;
  if (item?.label?.label) return item.label.label;
  return String(item?.insertText || item?.textEdit?.newText || "completion");
}

function completionType(kind) {
  const numeric = Number(kind);
  if ([3, 7, 8, 9, 22].includes(numeric)) return "function";
  if ([5, 6, 10, 11, 12, 13].includes(numeric)) return "variable";
  if ([14, 15, 16, 17, 18, 19].includes(numeric)) return "keyword";
  if ([20, 21].includes(numeric)) return "constant";
  if ([24, 25].includes(numeric)) return "type";
  return "text";
}

function createSnippetCompletions(context) {
  const word = context.matchBefore(/[\w-]*/);
  const from = word ? word.from : context.pos;
  return {
    from,
    options: [
      {
        label: "nexus-component",
        type: "function",
        detail: "Nexus React component",
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
        apply: "console.log();",
      },
      {
        label: "useState",
        type: "function",
        detail: "React state hook",
        apply: "const [value, setValue] = useState(null);",
      },
    ],
  };
}

export default function CodeEditor({
  code,
  onChange,
  fileName,
  filePath = null,
  workspacePath = null,
  fontSize = 14,
  showLineNumbers = true,
  tabSize = 4,
  wordWrap = false,
  minimap = false,
  onMarkersChange,
  settings = /** @type {any} */ ({}),
}) {
  const resourcePath = filePath || fileName;
  const nexusLanguageId = useMemo(
    () => detectLanguageId(resourcePath),
    [resourcePath],
  );
  const languageLabel = useMemo(
    () => getLanguageDisplayName(nexusLanguageId),
    [nexusLanguageId],
  );
  const documentDescriptor = useMemo(
    () =>
      createDocumentUriDescriptor({
        fileName,
        fsPath: filePath,
        workspacePath,
      }),
    [fileName, filePath, workspacePath],
  );
  const [cursorInfo, setCursorInfo] = useState({ line: 1, col: 1 });
  const [lineCount, setLineCount] = useState(() => countLines(code || ""));
  const [compactViewport, setCompactViewport] = useState(getCompactViewport);
  const [lspStatus, setLspStatus] = useState({
    state: "idle",
    label: "LSP",
    message: "",
  });
  const editorViewRef = useRef(null);
  const codeRef = useRef(code || "");
  const lspEngineRef = useRef(null);
  const lspDocumentUriRef = useRef(null);
  const lspVersionRef = useRef(1);
  const changeEmitTimerRef = useRef(null);
  const pendingChangeRef = useRef(null);
  const cursorTimerRef = useRef(null);
  const pendingCursorInfoRef = useRef({ line: 1, col: 1 });
  const lineCountTimerRef = useRef(null);
  const pendingLineCountRef = useRef(1);
  const diagnosticsHashRef = useRef("");
  const installedExtensions = Array.isArray(settings.extensions_installed)
    ? settings.extensions_installed
    : [];
  const hasRainbowBrackets = installedExtensions.includes("rainbow-brackets");
  const isLargeFile = typeof code === "string" && code.length > LARGE_FILE_CHAR_THRESHOLD;
  const canUseLsp =
    settings.lsp_enabled !== false &&
    !isLargeFile &&
    Boolean(workspacePath) &&
    isLspReadyLanguage(nexusLanguageId) &&
    hasElectronLspBridge();
  const editorFontSize = useMemo(
    () => resolveEditorFontSize(settings, fontSize),
    [fontSize, settings.font_size],
  );
  const editorLineHeight = useMemo(
    () => resolveEditorLineHeight(settings, editorFontSize),
    [editorFontSize, settings.line_height],
  );
  const editorTabSize = useMemo(
    () => resolveEditorTabSize(settings, tabSize),
    [settings.tab_size, tabSize],
  );
  const showDiagnostics = settings.validation_decorations !== false;

  const flushPendingChange = useCallback(() => {
    if (changeEmitTimerRef.current) {
      window.clearTimeout(changeEmitTimerRef.current);
      changeEmitTimerRef.current = null;
    }
    if (pendingChangeRef.current === null) return;
    const nextValue = pendingChangeRef.current;
    pendingChangeRef.current = null;
    onChange(nextValue);
  }, [onChange]);

  const scheduleLineCountUpdate = useCallback((nextCount) => {
    const normalized = Math.max(1, Number(nextCount || 1));
    pendingLineCountRef.current = normalized;
    if (lineCountTimerRef.current) return;
    lineCountTimerRef.current = window.setTimeout(() => {
      lineCountTimerRef.current = null;
      const next = pendingLineCountRef.current;
      setLineCount((prev) => (prev === next ? prev : next));
    }, LINE_COUNT_UPDATE_MS);
  }, []);

  const scheduleCursorInfoUpdate = useCallback((line, col) => {
    pendingCursorInfoRef.current = { line, col };
    if (cursorTimerRef.current) return;
    cursorTimerRef.current = window.setTimeout(() => {
      cursorTimerRef.current = null;
      const next = pendingCursorInfoRef.current;
      setCursorInfo((prev) =>
        prev.line === next.line && prev.col === next.col ? prev : next,
      );
    }, CURSOR_INFO_UPDATE_MS);
  }, []);

  const emitEditorChange = useCallback(
    (value) => {
      pendingChangeRef.current = value;
      if (changeEmitTimerRef.current) return;
      changeEmitTimerRef.current = window.setTimeout(() => {
        changeEmitTimerRef.current = null;
        if (pendingChangeRef.current === null) return;
        const nextValue = pendingChangeRef.current;
        pendingChangeRef.current = null;
        onChange(nextValue);
      }, EDITOR_CHANGE_EMIT_INTERVAL_MS);
    },
    [onChange],
  );

  const updateProblems = useCallback(
    (diagnostics) => {
      if (!onMarkersChange) return;
      const problems = lspDiagnosticsToProblems(diagnostics, documentDescriptor.path);
      const hash = problems
        .map(
          (problem) =>
            `${problem.severity}|${problem.startLineNumber}|${problem.startColumn}|${problem.message}`,
        )
        .join("::");
      if (hash === diagnosticsHashRef.current) return;
      diagnosticsHashRef.current = hash;
      onMarkersChange(problems);
    },
    [documentDescriptor.path, onMarkersChange],
  );

  useEffect(() => {
    codeRef.current = code || "";
    setLineCount(countLines(code || ""));
  }, [code, fileName]);

  useEffect(() => {
    let frame = 0;
    const onResize = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        const next = getCompactViewport();
        setCompactViewport((prev) => (prev === next ? prev : next));
      });
    };
    window.addEventListener("resize", onResize, { passive: true });
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  useEffect(() => {
    const view = editorViewRef.current;
    if (!view || !settings._revealLine) return;
    const { line, col } = settings._revealLine;
    const safeLine = Math.max(1, Math.min(view.state.doc.lines, Number(line || 1)));
    const lineInfo = view.state.doc.line(safeLine);
    const pos = Math.min(lineInfo.to, lineInfo.from + Math.max(0, Number(col || 1) - 1));
    view.dispatch({
      selection: { anchor: pos },
      effects: EditorView.scrollIntoView(pos, { y: "center" }),
    });
    view.focus();
  }, [settings._revealLine]);

  useEffect(() => {
    const previous = lspEngineRef.current;
    previous?.dispose?.();
    lspEngineRef.current = null;
    lspDocumentUriRef.current = null;
    lspVersionRef.current = 1;
    updateProblems([]);

    if (!canUseLsp) {
      setLspStatus({
        state: isLargeFile ? "disabled" : "idle",
        label: "LSP",
        message: isLargeFile ? "large file" : "",
      });
      return undefined;
    }

    let active = true;
    const transport = createElectronLspTransport({
      languageId: nexusLanguageId,
      workspacePath,
      onStatus: (status) => {
        if (!active) return;
        setLspStatus({
          state: status?.state || "running",
          label: status?.label || languageLabel,
          message: status?.message || "",
        });
      },
      onDiagnostics: ({ uri, diagnostics }) => {
        if (!active) return;
        if (uri && lspDocumentUriRef.current && uri !== lspDocumentUriRef.current) return;
        const view = editorViewRef.current;
        if (view && showDiagnostics) {
          view.dispatch(setDiagnostics(view.state, lspDiagnosticsToCodeMirror(diagnostics, view)));
        }
        updateProblems(diagnostics || []);
      },
    });

    const engine = createEditorEngine({
      lsp: {
        transports: {
          [nexusLanguageId]: transport,
        },
      },
    });
    lspEngineRef.current = engine;
    setLspStatus({ state: "starting", label: languageLabel, message: "" });

    engine
      .openDocument({
        fileName,
        fsPath: filePath,
        workspacePath,
        languageId: nexusLanguageId,
        value: codeRef.current,
        version: lspVersionRef.current,
      })
      .then((document) => {
        if (!active) return;
        lspDocumentUriRef.current = document.uri;
        setLspStatus((prev) => ({
          ...prev,
          state: prev.state === "unavailable" ? prev.state : "running",
        }));
      })
      .catch((error) => {
        if (!active) return;
        setLspStatus({
          state: "unavailable",
          label: languageLabel,
          message: error?.message || "LSP unavailable",
        });
      });

    return () => {
      active = false;
      engine.dispose();
      if (lspEngineRef.current === engine) {
        lspEngineRef.current = null;
      }
      lspDocumentUriRef.current = null;
    };
  }, [
    canUseLsp,
    fileName,
    filePath,
    isLargeFile,
    languageLabel,
    nexusLanguageId,
    showDiagnostics,
    updateProblems,
    workspacePath,
  ]);

  useEffect(() => {
    return () => {
      lspEngineRef.current?.dispose?.();
      lspEngineRef.current = null;
      if (changeEmitTimerRef.current) window.clearTimeout(changeEmitTimerRef.current);
      if (cursorTimerRef.current) window.clearTimeout(cursorTimerRef.current);
      if (lineCountTimerRef.current) window.clearTimeout(lineCountTimerRef.current);
      flushPendingChange();
    };
  }, [flushPendingChange]);

  const completionSource = useCallback(
    async (context) => {
      const snippets = createSnippetCompletions(context);
      const engine = lspEngineRef.current;
      const documentUri = lspDocumentUriRef.current;
      const shouldAskLsp =
        engine &&
        documentUri &&
        (context.explicit || /[.\w:/<#@"'-]$/.test(context.state.sliceDoc(Math.max(0, context.pos - 1), context.pos)));

      if (!shouldAskLsp) {
        return context.explicit ? snippets : null;
      }

      try {
        const position = cmPosToLspPosition(context.state.doc, context.pos);
        const completionList = await engine.getCompletions(documentUri, position, {
          triggerKind: context.explicit ? 1 : 2,
        });
        const word = context.matchBefore(/[\w$-]*/);
        const from = word ? word.from : context.pos;
        const options = (completionList?.items || []).slice(0, 80).map((item) => {
          const label = normalizeCompletionLabel(item);
          return {
            label,
            type: completionType(item.kind),
            detail: item.detail || item.labelDetails?.detail || "",
            info: item.documentation?.value || item.documentation || "",
            apply: item.insertText || item.textEdit?.newText || label,
          };
        });
        return {
          from,
          options: [...snippets.options, ...options],
          validFor: /^[\w$-]*$/,
        };
      } catch {
        return snippets;
      }
    },
    [],
  );

  const cmTheme = useMemo(
    () => createNexusCodeMirrorTheme(settings, compactViewport, editorFontSize, editorLineHeight),
    [
      compactViewport,
      editorFontSize,
      editorLineHeight,
      settings.cursor_style,
      settings.font_family,
      settings.font_weight,
      settings.letter_spacing,
      settings.primary_accent,
      settings.theme,
    ],
  );

  const baseExtensions = useMemo(() => {
    const extensions = [
      history(),
      closeBrackets(),
      drawSelection(),
      dropCursor(),
      highlightActiveLine(),
      highlightSpecialChars(),
      indentOnInput(),
      rectangularSelection(),
      bracketMatching(),
      syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
      keymap.of([
        indentWithTab,
        ...closeBracketsKeymap,
        ...defaultKeymap,
        ...historyKeymap,
        ...completionKeymap,
        ...searchKeymap,
        ...foldKeymap,
        ...lintKeymap,
      ]),
      EditorState.tabSize.of(editorTabSize),
      wordWrap ? EditorView.lineWrapping : [],
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          const nextValue = update.state.doc.toString();
          codeRef.current = nextValue;
          emitEditorChange(nextValue);
          scheduleLineCountUpdate(update.state.doc.lines);
          const engine = lspEngineRef.current;
          const documentUri = lspDocumentUriRef.current;
          if (engine && documentUri) {
            lspVersionRef.current += 1;
            engine
              .updateDocument(documentUri, nextValue, {
                version: lspVersionRef.current,
                dirty: true,
              })
              .catch(() => {});
          }
        }
        if (update.selectionSet || update.focusChanged) {
          const head = update.state.selection.main.head;
          const line = update.state.doc.lineAt(head);
          scheduleCursorInfoUpdate(line.number, head - line.from + 1);
        }
      }),
      EditorView.domEventHandlers({
        blur: () => flushPendingChange(),
      }),
      autocompletion({
        override: [completionSource],
        activateOnTyping: !isLargeFile,
        closeOnBlur: false,
      }),
      highlightSelectionMatches(),
      placeholder("Schreib Code, Markdown, JSON oder Notizen direkt hier..."),
      cmThemeCompartment.of(cmTheme),
      languageCompartment.of(getLanguageExtension(nexusLanguageId, fileName)),
      diagnosticsCompartment.of(showDiagnostics ? [lintGutter()] : []),
    ];

    if (showLineNumbers) {
      extensions.push(lineNumbers(), highlightActiveLineGutter());
    }
    if (!compactViewport && !isLargeFile) extensions.push(foldGutter());
    return extensions;
  }, [
    cmTheme,
    compactViewport,
    completionSource,
    editorTabSize,
    emitEditorChange,
    fileName,
    flushPendingChange,
    isLargeFile,
    nexusLanguageId,
    scheduleCursorInfoUpdate,
    scheduleLineCountUpdate,
    showDiagnostics,
    showLineNumbers,
    wordWrap,
  ]);

  const handleCreateEditor = useCallback((view) => {
    editorViewRef.current = view;
    setLineCount(view.state.doc.lines);
    const head = view.state.selection.main.head;
    const line = view.state.doc.lineAt(head);
    setCursorInfo({ line: line.number, col: head - line.from + 1 });
  }, []);

  const handleChange = useCallback(
    (value) => {
      codeRef.current = value || "";
    },
    [],
  );

  const engineLabel = "CodeMirror 6";
  const lspTone =
    lspStatus.state === "running"
      ? "text-green-400"
      : lspStatus.state === "starting"
        ? "text-amber-400"
        : lspStatus.state === "unavailable"
          ? "text-red-400"
          : "text-gray-600";

  return (
    <div
      className="nx-code-editor-shell flex-1 flex flex-col min-h-0 w-full relative overflow-hidden bg-transparent"
      style={{ background: "transparent" }}
      data-editor-engine="codemirror"
    >
      <div className="nx-code-editor-canvas flex-1 min-h-0 w-full relative overflow-hidden">
        <CodeMirror
          value={code || ""}
          height="100%"
          width="100%"
          extensions={baseExtensions}
          onChange={handleChange}
          onCreateEditor={handleCreateEditor}
          basicSetup={false}
          indentWithTab
          editable
        />
      </div>

      <div
        className="nx-code-editor-status h-6 flex items-center justify-between gap-3 px-3 shrink-0 select-none backdrop-blur-md border-t border-white/5 z-10"
        style={{ background: "rgba(0,0,0,0.3)" }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-[10px] text-gray-400 font-medium truncate">
            {languageLabel}
          </span>
          <span className="text-[10px] text-gray-500">{engineLabel}</span>
          <span
            className={`text-[10px] font-medium ${lspTone}`}
            title={lspStatus.message || lspStatus.label || "Language Server"}
          >
            LSP {lspStatus.state}
          </span>
          {isLargeFile && (
            <span className="text-[10px] text-amber-400/80 font-semibold">
              LARGE
            </span>
          )}
          {hasRainbowBrackets && (
            <span className="text-[10px] text-purple-400 font-semibold opacity-70">
              BRACKETS
            </span>
          )}
          {minimap && !compactViewport && (
            <span className="text-[10px] text-gray-600">
              minimap retired
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-[10px] text-gray-400">
            Ln {cursorInfo.line}, Col {cursorInfo.col}
          </span>
          <span className="text-[10px] text-gray-500">
            {lineCount} Lines
          </span>
        </div>
      </div>
    </div>
  );
}
