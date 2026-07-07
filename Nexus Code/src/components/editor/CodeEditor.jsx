import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import CodeMirror from "@uiw/react-codemirror";
import {
  drawSelection,
  dropCursor,
  EditorView,
  highlightActiveLine,
  highlightActiveLineGutter,
  highlightSpecialChars,
  hoverTooltip,
  keymap,
  lineNumbers,
  placeholder,
  rectangularSelection,
  scrollPastEnd,
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
  foldGutter,
  foldKeymap,
  indentOnInput,
  syntaxHighlighting,
} from "@codemirror/language";
import { lintGutter, lintKeymap, setDiagnostics } from "@codemirror/lint";
import { search, searchKeymap, highlightSelectionMatches } from "@codemirror/search";
import { THEMES as EDITOR_THEMES } from "../../pages/editor/editorShared.jsx";
import { createEditorEngine } from "../../ide/editor/editorEngine.js";
import { createDocumentUriDescriptor } from "../../ide/editor/documentUri.js";
import {
  detectLanguageId,
  getLanguageDisplayName,
  isLspReadyLanguage,
} from "../../ide/languages/languageIds.js";
import {
  createCodeMirrorLanguageFallback,
  loadCodeMirrorLanguageExtension,
} from "../../ide/languages/codeMirrorLanguages.js";
import {
  createElectronLspTransport,
  hasElectronLspBridge,
} from "../../ide/lsp/index.js";
import { normalizeDiagnostics } from "../../ide/lsp/protocol.js";
import {
  cmPosToLspPosition,
  createEditorLanguageFeatureModel,
  createEditorLspFeatureRequest,
  createEditorScopeInfo,
  createEditorHighlightStyle,
  createEditorStatusModel,
  createSnippetCompletions,
  extractDocumentSymbols,
  findDiagnosticAtPosition,
  EDITOR_LSP_FEATURE_IDS,
  getPrimaryLspLocation,
  lspCompletionsToCodeMirror,
  lspDiagnosticsToCodeMirror,
  lspDiagnosticsToProblems,
  lspRangeToCodeMirrorRange,
  lspTextEditsToCodeMirrorChanges,
  lspWorkspaceEditToCodeMirrorChanges,
  readHoverText,
  shouldRequestLspCompletion,
  summarizeEditorDiagnostics,
} from "../../pages/editor/editorFeatureModel.js";

const EDITOR_CHANGE_EMIT_INTERVAL_MS = 48;
const CURSOR_INFO_UPDATE_MS = 45;
const LINE_COUNT_UPDATE_MS = 80;
const LARGE_FILE_CHAR_THRESHOLD = 220_000;
const EDITOR_MOUNT_WATCHDOG_MS = 1800;
const COMPACT_VIEWPORT_WIDTH = 920;
const DEFAULT_EDITOR_FONT_STACK =
  "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace";

const cmThemeCompartment = new Compartment();
const languageCompartment = new Compartment();
const diagnosticsCompartment = new Compartment();

class CodeMirrorCrashBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { crashed: false, message: "" };
  }

  static getDerivedStateFromError(error) {
    return {
      crashed: true,
      message: error?.message || "CodeMirror render failed",
    };
  }

  componentDidCatch(error) {
    this.props.onCrash?.(error);
  }

  componentDidUpdate(previousProps) {
    if (previousProps.resetKey !== this.props.resetKey && this.state.crashed) {
      this.setState({ crashed: false, message: "" });
    }
  }

  render() {
    if (this.state.crashed) {
      return this.props.fallback(this.state.message);
    }
    return this.props.children;
  }
}

function clampNumber(value, min, max, fallback) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.max(min, Math.min(max, numeric));
}

function getCompactViewport() {
  if (typeof window === "undefined") return false;
  return window.innerWidth < COMPACT_VIEWPORT_WIDTH;
}

function resolveEditorReducedMotion(settings) {
  const prefersReducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
  const lowPowerClass =
    typeof document !== "undefined" &&
    document.documentElement?.classList?.contains("reduce-motion");

  return Boolean(
    settings.reduce_motion === true ||
      settings.animations_enabled === false ||
      settings.visual_performance_profile === "performance" ||
      prefersReducedMotion ||
      lowPowerClass,
  );
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

function resolveAutocompleteMaxItems(settings, reduceMotion, compactViewport) {
  const fallback = reduceMotion ? 72 : compactViewport ? 96 : 120;
  return Math.round(clampNumber(settings.autocomplete_max_items, 24, 180, fallback));
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

function positionCompletionInfo(_view, list, option, info, space, tooltip) {
  const margin = 10;
  const listWidth = Math.max(1, list.right - list.left);
  const listHeight = Math.max(1, list.bottom - list.top);
  const scaleX = tooltip?.offsetWidth ? listWidth / tooltip.offsetWidth : 1;
  const scaleY = tooltip?.offsetHeight ? listHeight / tooltip.offsetHeight : 1;
  const infoWidth = Math.max(220, info.right - info.left);
  const infoHeight = Math.max(120, info.bottom - info.top);
  const spaceLeft = Math.max(0, list.left - space.left - margin);
  const spaceRight = Math.max(0, space.right - list.right - margin);
  const sideWidth = Math.min(420, Math.max(spaceLeft, spaceRight));
  const topOffset =
    Math.max(space.top + margin, Math.min(option.top, space.bottom - infoHeight - margin)) -
    list.top;

  if (sideWidth >= Math.min(infoWidth, 280)) {
    const placeLeft = spaceLeft > spaceRight;
    return {
      style: [
        `top: ${Math.max(0, topOffset) / scaleY}px`,
        `${placeLeft ? "right" : "left"}: 100%`,
        `max-width: ${sideWidth / scaleX}px`,
      ].join("; "),
      class: `nx-cm-completionInfo-side ${
        placeLeft ? "nx-cm-completionInfo-left" : "nx-cm-completionInfo-right"
      }`,
    };
  }

  const stackedWidth = Math.max(220, Math.min(420, space.right - space.left - margin * 2));
  const spaceBelow = space.bottom - list.bottom;
  const spaceAbove = list.top - space.top;
  const placeBelow = spaceBelow >= Math.min(infoHeight, 220) || spaceBelow >= spaceAbove;
  const verticalOffset = placeBelow ? option.bottom - list.top : list.bottom - option.top;

  return {
    style: [
      `${placeBelow ? "top" : "bottom"}: ${Math.max(0, verticalOffset) / scaleY}px`,
      "left: 0",
      `max-width: ${stackedWidth / scaleX}px`,
      `width: min(${stackedWidth / scaleX}px, calc(100vw - ${margin * 2}px))`,
    ].join("; "),
    class: `nx-cm-completionInfo-stacked ${
      placeBelow ? "nx-cm-completionInfo-below" : "nx-cm-completionInfo-above"
    }`,
  };
}

function createNexusCodeMirrorTheme(
  settings,
  compactViewport,
  editorFontSize,
  editorLineHeight,
  reduceMotion,
) {
  const theme = resolveEditorTheme(settings);
  const accent = safeHex(settings.primary_accent || theme.accent, "#8b5cf6");
  const editorAccent = "#8b5cf6";
  const editorAccentBlue = "#60a5fa";
  const text = safeHex(theme.text, "#f3f4f6");
  const muted = safeHex(theme.muted, "#8b93a7");
  const selection = hexToRgba(editorAccent, 0.32);
  const selectionStrong = hexToRgba(editorAccentBlue, 0.36);
  const selectionSoft = hexToRgba(editorAccent, 0.16);
  const panelSurface = "var(--nexus-panel-surface)";
  const panelFilter = reduceMotion ? "none" : "var(--nexus-panel-filter)";
  const tooltipShadow = reduceMotion
    ? "0 8px 24px rgba(0,0,0,0.28)"
    : "0 18px 55px rgba(0,0,0,0.35)";
  const letterSpacing = resolveEditorLetterSpacing(settings);

  return EditorView.theme(
    {
      "&": {
        height: "100%",
        minHeight: 0,
        maxHeight: "100%",
        background: "transparent",
        color: text,
        fontFamily: resolveEditorFontFamily(settings),
        fontSize: `${editorFontSize}px`,
        fontWeight: String(settings.font_weight || "400"),
        letterSpacing: `${letterSpacing}px`,
        textRendering: "optimizeLegibility",
        WebkitFontSmoothing: "antialiased",
        fontSynthesis: "none",
        outline: "none",
        overflow: "hidden",
        position: "relative",
      },
      "&.cm-focused": {
        outline: "none",
      },
      ".cm-scroller": {
        flex: "1 1 auto",
        height: "100%",
        minHeight: 0,
        maxHeight: "100%",
        overflow: "auto",
        overscrollBehavior: "contain",
        scrollbarGutter: "stable",
        fontFamily: "inherit",
        lineHeight: `${editorLineHeight}px`,
        background: "transparent",
      },
      ".cm-content": {
        minHeight: "100%",
        padding: `${compactViewport ? 14 : 20}px ${compactViewport ? 14 : 24}px`,
        caretColor: accent,
        color: text,
      },
      ".cm-line": {
        padding: "0 2px",
        textRendering: "inherit",
      },
      ".cm-content ::selection": {
        color: `${text} !important`,
      },
      ".cm-gutters": {
        background: "rgba(0,0,0,0.12)",
        color: muted,
        borderRight: "1px solid rgba(255,255,255,0.05)",
      },
      ".cm-lineNumbers .cm-gutterElement": {
        padding: compactViewport ? "0 8px 0 10px" : "0 12px 0 14px",
        minWidth: compactViewport ? "2.4rem" : "3rem",
      },
      ".cm-activeLine": {
        backgroundColor: hexToRgba(editorAccent, 0.07),
      },
      ".cm-activeLineGutter": {
        backgroundColor: hexToRgba(editorAccent, 0.12),
        color: text,
      },
      ".cm-selectionLayer .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection": {
        backgroundColor: `${selection} !important`,
        color: `${text} !important`,
      },
      ".cm-selectionMatch": {
        backgroundColor: `${selectionSoft} !important`,
        outline: `1px solid ${hexToRgba(editorAccentBlue, 0.24)}`,
      },
      ".cm-cursor": {
        borderLeftColor: accent,
        borderLeftWidth: settings.cursor_style === "block" ? "0.55em" : "2px",
      },
      ".cm-dropCursor": {
        borderLeftColor: accent,
      },
      ".cm-matchingBracket, .cm-nonmatchingBracket": {
        outline: `1px solid ${hexToRgba(editorAccentBlue, 0.56)}`,
        backgroundColor: hexToRgba(editorAccent, 0.13),
      },
      ".cm-panels, .cm-tooltip, .cm-tooltip-autocomplete": {
        background: panelSurface,
        backdropFilter: panelFilter,
        border: "1px solid var(--nexus-border)",
        borderRadius: "8px",
        overflow: "hidden",
      },
      ".cm-tooltip": {
        color: "var(--nexus-text)",
        boxShadow: tooltipShadow,
      },
      ".cm-tooltip-autocomplete": {
        zIndex: 80,
        contain: "layout style paint",
        minWidth: compactViewport ? "min(17rem, calc(100vw - 1rem))" : "22rem",
        width: compactViewport
          ? "min(20rem, calc(100vw - 1rem))"
          : "min(32rem, calc(100vw - 1rem))",
        maxWidth: "calc(100vw - 1rem)",
      },
      ".cm-tooltip-autocomplete > ul": {
        maxHeight: compactViewport
          ? "min(15rem, calc(100vh - 8rem))"
          : "min(22rem, calc(100vh - 8rem))",
        fontFamily: "inherit",
        overflowY: "auto",
        scrollbarGutter: "stable",
      },
      ".cm-tooltip-autocomplete ul li[aria-selected]": {
        background: hexToRgba(accent, 0.18),
        color: "#fff",
      },
      ".cm-completionLabel": {
        color: text,
      },
      ".cm-completionDetail": {
        color: muted,
        marginLeft: "0.75rem",
        maxWidth: compactViewport ? "8rem" : "14rem",
        overflow: "hidden",
        textOverflow: "ellipsis",
      },
      ".cm-tooltip.cm-completionInfo": {
        zIndex: 81,
        maxWidth: compactViewport
          ? "min(19rem, calc(100vw - 1rem))"
          : "min(28rem, calc(100vw - 1rem))",
        maxHeight: compactViewport
          ? "min(13rem, calc(100vh - 7rem))"
          : "min(18rem, calc(100vh - 7rem))",
        color: text,
        background: panelSurface,
        backdropFilter: panelFilter,
        border: "1px solid var(--nexus-border)",
        borderRadius: "8px",
        boxShadow: tooltipShadow,
        whiteSpace: "pre-wrap",
        overflow: "auto",
        padding: "9px 10px",
      },
      ".cm-completionInfo.nx-cm-completionInfo-side": {
        marginInline: "8px",
      },
      ".cm-completionInfo.nx-cm-completionInfo-stacked": {
        marginTop: "8px",
        marginBottom: "8px",
      },
      ".cm-panels": {
        color: text,
        position: "absolute",
        left: compactViewport ? "6px" : "10px",
        right: "auto",
        zIndex: 70,
        width: "max-content",
        maxWidth: compactViewport
          ? "calc(100% - 12px)"
          : "min(44rem, calc(100% - 20px))",
        boxShadow: tooltipShadow,
      },
      ".cm-panels.cm-panels-top": {
        top: compactViewport ? "6px" : "10px",
        borderBottom: "1px solid var(--nexus-border)",
      },
      ".cm-panels.cm-panels-bottom": {
        bottom: compactViewport ? "6px" : "10px",
        borderTop: "1px solid var(--nexus-border)",
      },
      ".cm-search": {
        maxWidth: "100%",
        padding: "6px 8px",
        display: "flex",
        flexWrap: "wrap",
        gap: "6px",
        alignItems: "center",
      },
      ".cm-search input": {
        maxWidth: compactViewport ? "8.5rem" : "13rem",
        minHeight: "1.75rem",
        borderRadius: "6px",
        border: "1px solid var(--nexus-border)",
        background: "rgba(255,255,255,0.055)",
        color: text,
        outline: "none",
      },
      ".cm-search button": {
        minHeight: "1.75rem",
        borderRadius: "6px",
        border: "1px solid var(--nexus-border)",
        background: "rgba(255,255,255,0.065)",
        color: text,
      },
      ".cm-search button:hover": {
        background: hexToRgba(accent, 0.16),
      },
      ".cm-searchMatch": {
        backgroundColor: `${selectionSoft} !important`,
        outline: `1px solid ${hexToRgba(editorAccentBlue, 0.28)}`,
      },
      ".cm-searchMatch.cm-searchMatch-selected": {
        backgroundColor: `${selectionStrong} !important`,
      },
      ".cm-diagnostic": {
        borderRadius: "4px",
      },
      ".cm-diagnostic-error": {
        textDecorationColor: "#ef4444",
      },
      ".cm-diagnostic-warning": {
        textDecorationColor: "#f59e0b",
      },
      ".cm-tooltip.nx-cm-hover-tooltip": {
        background: "transparent",
        border: "0",
        boxShadow: "none",
      },
      ".nx-cm-hover-card": {
        maxWidth: compactViewport ? "18rem" : "32rem",
        borderRadius: "8px",
        border: "1px solid var(--nexus-border)",
        background: panelSurface,
        backdropFilter: "var(--nexus-panel-filter)",
        boxShadow: "0 18px 55px rgba(0,0,0,0.35)",
        overflow: "hidden",
      },
      ".nx-cm-hover-title": {
        padding: "7px 10px 5px",
        color: muted,
        fontSize: "10px",
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: "0",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      },
      ".nx-cm-hover-body": {
        margin: 0,
        padding: "9px 10px 10px",
        color: text,
        fontFamily: "inherit",
        fontSize: `${Math.max(11, editorFontSize - 1)}px`,
        lineHeight: "1.45",
        whiteSpace: "pre-wrap",
        overflow: "auto",
        maxHeight: compactViewport ? "12rem" : "18rem",
      },
      ".cm-foldGutter .cm-gutterElement": {
        color: muted,
      },
      ".cm-placeholder": {
        color: muted,
      },
    },
    { dark: true },
  );
}

function countLines(value) {
  if (!value) return 1;
  let lines = 1;
  for (let index = 0; index < value.length; index += 1) {
    if (value.charCodeAt(index) === 10) lines += 1;
  }
  return lines;
}

function resolveEditorTheme(settings) {
  return EDITOR_THEMES[settings.theme] || EDITOR_THEMES.nexus_vibrant;
}

function resolveEditorAccent(settings) {
  const theme = resolveEditorTheme(settings);
  return safeHex(settings.primary_accent || theme.accent, "#8b5cf6");
}

function createHoverTooltipDom({ title, text, accent, tone = "default" }) {
  const dom = document.createElement("div");
  dom.className = `nx-cm-hover-card nx-cm-hover-card-${tone}`;
  dom.style.borderTop = `2px solid ${accent}`;

  const heading = document.createElement("div");
  heading.className = "nx-cm-hover-title";
  heading.textContent = title;

  const body = document.createElement("pre");
  body.className = "nx-cm-hover-body";
  body.textContent = text.length > 2600 ? `${text.slice(0, 2600)}\n...` : text;

  dom.append(heading, body);
  return dom;
}

function cmRangeToEditorFeatureRange(doc, from, to = from) {
  if (!doc) return null;
  const safeFrom = Math.max(0, Math.min(doc.length, Number(from || 0)));
  const safeTo = Math.max(safeFrom, Math.min(doc.length, Number(to || safeFrom)));
  const start = doc.lineAt(safeFrom);
  const end = doc.lineAt(safeTo);
  return {
    startLineNumber: start.number,
    startColumn: safeFrom - start.from + 1,
    endLineNumber: end.number,
    endColumn: safeTo - end.from + 1,
  };
}

function getEditorActionRange(view) {
  const selection = view?.state?.selection?.main;
  if (!view || !selection) return null;
  if (!selection.empty) {
    return cmRangeToEditorFeatureRange(view.state.doc, selection.from, selection.to);
  }
  const word = view.state.wordAt(selection.head);
  if (word) return cmRangeToEditorFeatureRange(view.state.doc, word.from, word.to);
  return cmRangeToEditorFeatureRange(view.state.doc, selection.head, selection.head);
}

function getRenameDefaultName(view) {
  const selection = view?.state?.selection?.main;
  if (!view || !selection) return "";
  if (!selection.empty) {
    return view.state.doc.sliceString(selection.from, selection.to).trim();
  }
  const word = view.state.wordAt(selection.head);
  return word ? view.state.doc.sliceString(word.from, word.to).trim() : "";
}

function readCodeActionTitle(action) {
  if (typeof action === "string") return action;
  return String(action?.title || action?.command?.title || action?.command || "Code action");
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
  const languageFallback = useMemo(
    () => createCodeMirrorLanguageFallback(nexusLanguageId, fileName),
    [fileName, nexusLanguageId],
  );
  const [languageSupport, setLanguageSupport] = useState(languageFallback);
  const activeLanguageSupport =
    languageSupport.key === languageFallback.key ? languageSupport : languageFallback;
  const activeLanguageExtension = activeLanguageSupport.extension;
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
  const [lspActionStatus, setLspActionStatus] = useState({
    state: "idle",
    featureId: "",
    text: "",
    title: "",
    tone: "text-gray-500",
  });
  const [diagnosticSummary, setDiagnosticSummary] = useState(() =>
    summarizeEditorDiagnostics([]),
  );
  const [editorFocused, setEditorFocused] = useState(false);
  const [editorFallbackReason, setEditorFallbackReason] = useState("");
  const [fallbackValue, setFallbackValue] = useState(code || "");
  const editorCanvasRef = useRef(null);
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
  const currentDiagnosticsRef = useRef([]);
  const installedExtensions = Array.isArray(settings.extensions_installed)
    ? settings.extensions_installed
    : [];
  const hasRainbowBrackets = installedExtensions.includes("rainbow-brackets");
  const isLargeFile = typeof code === "string" && code.length > LARGE_FILE_CHAR_THRESHOLD;
  const lspReadyLanguage = useMemo(
    () => isLspReadyLanguage(nexusLanguageId),
    [nexusLanguageId],
  );
  const hasLspBridge = useMemo(() => hasElectronLspBridge(), []);
  const editorFeatureSettings = useMemo(
    () => ({
      autocomplete_enabled: settings.autocomplete_enabled,
      autocomplete_language_hints: settings.autocomplete_language_hints,
      autocomplete_local_words: settings.autocomplete_local_words,
      autocomplete_lsp: settings.autocomplete_lsp,
      autocomplete_snippets: settings.autocomplete_snippets,
      lsp_enabled: settings.lsp_enabled,
    }),
    [
      settings.autocomplete_enabled,
      settings.autocomplete_language_hints,
      settings.autocomplete_local_words,
      settings.autocomplete_lsp,
      settings.autocomplete_snippets,
      settings.lsp_enabled,
    ],
  );
  const lspAvailabilityModel = useMemo(
    () =>
      createEditorLanguageFeatureModel({
        languageId: nexusLanguageId,
        settings: editorFeatureSettings,
        isLargeFile,
        hasWorkspace: Boolean(workspacePath),
        hasBridge: hasLspBridge,
      }),
    [
      editorFeatureSettings,
      hasLspBridge,
      isLargeFile,
      nexusLanguageId,
      workspacePath,
    ],
  );
  const canUseLsp =
    lspAvailabilityModel.lsp.canStart &&
    lspReadyLanguage;
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
  const editorTheme = useMemo(() => resolveEditorTheme(settings), [settings.theme]);
  const editorAccent = useMemo(
    () => resolveEditorAccent(settings),
    [settings.primary_accent, settings.theme],
  );
  const editorHighlightStyle = useMemo(
    () => createEditorHighlightStyle(editorTheme),
    [editorTheme],
  );
  const reduceEditorMotion = useMemo(
    () => resolveEditorReducedMotion(settings),
    [
      settings.animations_enabled,
      settings.reduce_motion,
      settings.visual_performance_profile,
    ],
  );
  const autocompleteMaxItems = useMemo(
    () => resolveAutocompleteMaxItems(settings, reduceEditorMotion, compactViewport),
    [
      compactViewport,
      reduceEditorMotion,
      settings.autocomplete_max_items,
    ],
  );
  const completionOptions = useMemo(
    () => ({
      lowPowerMode: reduceEditorMotion,
      languageHints: settings.autocomplete_language_hints !== false,
      localWords: settings.autocomplete_local_words !== false,
      maxItems: autocompleteMaxItems,
      minPrefixLength: settings.autocomplete_min_chars,
      snippets: settings.autocomplete_snippets !== false,
    }),
    [
      autocompleteMaxItems,
      reduceEditorMotion,
      settings.autocomplete_language_hints,
      settings.autocomplete_local_words,
      settings.autocomplete_min_chars,
      settings.autocomplete_snippets,
    ],
  );
  const languageFeatureModel = useMemo(
    () =>
      createEditorLanguageFeatureModel({
        languageId: nexusLanguageId,
        settings: editorFeatureSettings,
        isLargeFile,
        hasWorkspace: Boolean(workspacePath),
        hasBridge: hasLspBridge,
        runtimeStatus: lspStatus,
      }),
    [
      editorFeatureSettings,
      hasLspBridge,
      isLargeFile,
      lspStatus,
      nexusLanguageId,
      workspacePath,
    ],
  );
  const documentSymbols = useMemo(
    () =>
      isLargeFile
        ? []
        : extractDocumentSymbols(code || "", nexusLanguageId, {
            maxSymbols: reduceEditorMotion ? 90 : 180,
          }),
    [code, isLargeFile, nexusLanguageId, reduceEditorMotion],
  );
  const editorScopeInfo = useMemo(
    () =>
      createEditorScopeInfo(documentSymbols, cursorInfo.line, {
        lineCount,
      }),
    [cursorInfo.line, documentSymbols, lineCount],
  );
  const editorResetKey = `${resourcePath || "untitled"}:${nexusLanguageId}`;

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
    setFallbackValue(code || "");
    setLineCount(countLines(code || ""));
  }, [code, fileName]);

  useEffect(() => {
    setEditorFallbackReason("");
  }, [editorResetKey]);

  useEffect(() => {
    let cancelled = false;
    setLanguageSupport(languageFallback);

    loadCodeMirrorLanguageExtension(nexusLanguageId, fileName).then((result) => {
      if (cancelled) return;
      const nextSupport = result.key === languageFallback.key ? result : languageFallback;
      setLanguageSupport(nextSupport);
      const view = editorViewRef.current;
      if (view) {
        view.dispatch({
          effects: languageCompartment.reconfigure(nextSupport.extension),
        });
      }
    });

    return () => {
      cancelled = true;
    };
  }, [fileName, languageFallback, nexusLanguageId]);

  useEffect(() => {
    if (editorFallbackReason) return undefined;
    const timer = window.setTimeout(() => {
      const canvas = editorCanvasRef.current;
      const view = editorViewRef.current;
      if (!canvas) return;
      const editorNode = canvas.querySelector(".cm-editor");
      const contentNode = canvas.querySelector(".cm-content");
      const scrollerNode = canvas.querySelector(".cm-scroller");
      const canvasRect = canvas.getBoundingClientRect();
      const contentRect = contentNode?.getBoundingClientRect?.();
      const hasMountedDom = Boolean(view && editorNode && contentNode && scrollerNode);
      const hasUsableSize =
        canvasRect.height > 44 &&
        canvasRect.width > 120 &&
        (contentRect?.height ?? 0) > 8;
      const expectedText = codeRef.current;
      const hasRenderedText =
        !expectedText ||
        Number(view?.state?.doc?.length ?? 0) === expectedText.length ||
        Number(contentNode?.textContent?.length ?? 0) > 0;

      if (!hasMountedDom || !hasUsableSize || !hasRenderedText) {
        setEditorFallbackReason("CodeMirror mount watchdog");
      }
    }, EDITOR_MOUNT_WATCHDOG_MS);
    return () => window.clearTimeout(timer);
  }, [editorFallbackReason, editorResetKey]);

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
    currentDiagnosticsRef.current = [];
    setLspActionStatus({
      state: "idle",
      featureId: "",
      text: "",
      title: "",
      tone: "text-gray-500",
    });
    setDiagnosticSummary(summarizeEditorDiagnostics([], { enabled: showDiagnostics }));
    updateProblems([]);
    const currentView = editorViewRef.current;
    if (currentView) {
      currentView.dispatch(setDiagnostics(currentView.state, []));
    }

    if (!canUseLsp) {
      setLspStatus(lspAvailabilityModel.lsp);
      return undefined;
    }

    let active = true;
    const resolveRuntimeLspStatus = (runtimeStatus) =>
      createEditorLanguageFeatureModel({
        languageId: nexusLanguageId,
        settings: editorFeatureSettings,
        isLargeFile,
        hasWorkspace: Boolean(workspacePath),
        hasBridge: hasLspBridge,
        runtimeStatus,
      }).lsp;
    const transport = createElectronLspTransport({
      languageId: nexusLanguageId,
      workspacePath,
      onStatus: (status) => {
        if (!active) return;
        setLspStatus(resolveRuntimeLspStatus(status || { state: "running" }));
      },
      onDiagnostics: ({ uri, diagnostics }) => {
        if (!active) return;
        if (uri && lspDocumentUriRef.current && uri !== lspDocumentUriRef.current) return;
        const normalizedDiagnostics = normalizeDiagnostics(diagnostics);
        currentDiagnosticsRef.current = normalizedDiagnostics;
        const view = editorViewRef.current;
        if (view) {
          view.dispatch(
            setDiagnostics(
              view.state,
              showDiagnostics
                ? lspDiagnosticsToCodeMirror(normalizedDiagnostics, view)
                : [],
            ),
          );
        }
        updateProblems(normalizedDiagnostics);
        setDiagnosticSummary(
          summarizeEditorDiagnostics(normalizedDiagnostics, { enabled: showDiagnostics }),
        );
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
    setLspStatus(resolveRuntimeLspStatus({ state: "starting" }));

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
        const serverFeatures =
          engine.lspService?.getServerFeatures?.(nexusLanguageId) || null;
        setLspStatus((prev) => {
          if (["missing", "unavailable", "unsupported", "disabled"].includes(prev.state)) {
            return prev;
          }
          return {
            ...prev,
            ...resolveRuntimeLspStatus({
              ...prev,
              state: "running",
              ...(serverFeatures ? { features: serverFeatures } : {}),
            }),
          };
        });
      })
      .catch((error) => {
        if (!active) return;
        setLspStatus(
          resolveRuntimeLspStatus(
            error?.lspStatus ||
              error?.details?.status || {
                state: "unavailable",
                message: error?.message || "LSP unavailable",
              },
          ),
        );
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
    editorFeatureSettings,
    fileName,
    filePath,
    hasLspBridge,
    isLargeFile,
    lspAvailabilityModel,
    lspReadyLanguage,
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
      if (settings.autocomplete_enabled === false || isLargeFile) return null;

      const snippets = createSnippetCompletions(
        context,
        nexusLanguageId,
        completionOptions,
      );
      const engine = lspEngineRef.current;
      const documentUri = lspDocumentUriRef.current;
      const shouldAskLsp =
        settings.autocomplete_lsp !== false &&
        engine &&
        documentUri &&
        shouldRequestLspCompletion(context, completionOptions);

      if (!shouldAskLsp) {
        return snippets;
      }

      try {
        const position = cmPosToLspPosition(context.state.doc, context.pos);
        const completionList = await engine.getCompletions(documentUri, position, {
          triggerKind: context.explicit ? 1 : 2,
        });
        return lspCompletionsToCodeMirror(context, completionList, snippets, {
          ...completionOptions,
          languageId: nexusLanguageId,
        });
      } catch {
        return snippets;
      }
    },
    [
      completionOptions,
      isLargeFile,
      nexusLanguageId,
      settings.autocomplete_enabled,
      settings.autocomplete_lsp,
    ],
  );

  const hoverSource = useCallback(
    async (view, pos) => {
      const diagnostic = showDiagnostics
        ? findDiagnosticAtPosition(currentDiagnosticsRef.current, view, pos)
        : null;
      const engine = lspEngineRef.current;
      const documentUri = lspDocumentUriRef.current;
      let hoverText = "";
      let hoverRange = null;

      if (engine && documentUri && !isLargeFile) {
        try {
          const hover = await engine.getHover(
            documentUri,
            cmPosToLspPosition(view.state.doc, pos),
            {},
          );
          hoverText = readHoverText(hover);
          hoverRange = lspRangeToCodeMirrorRange(view.state.doc, hover?.range);
        } catch {
          hoverText = "";
        }
      }

      if (!hoverText && diagnostic) {
        hoverText = readHoverText(diagnostic.message);
      }
      if (!hoverText) return null;

      const word = view.state.wordAt(pos);
      const tooltipFrom = hoverRange?.from ?? diagnostic?.from ?? word?.from ?? pos;
      const tooltipTo = hoverRange?.to ?? diagnostic?.to ?? word?.to ?? pos;
      const diagnosticOnly = diagnostic && hoverText === diagnostic.message;
      const tone = diagnostic?.severity || "default";

      return {
        pos: tooltipFrom,
        end: Math.max(tooltipTo, tooltipFrom + 1),
        above: true,
        class: "nx-cm-hover-tooltip",
        create: () => ({
          dom: createHoverTooltipDom({
            title: diagnosticOnly ? "Diagnostic" : "LSP Hover",
            text: hoverText,
            accent: editorAccent,
            tone,
          }),
        }),
      };
    },
    [editorAccent, isLargeFile, showDiagnostics],
  );

  const updateLspActionStatus = useCallback((status = {}) => {
    setLspActionStatus({
      state: status.state || "idle",
      featureId: status.featureId || "",
      text: status.text || "",
      title: status.title || status.text || "",
      tone: status.tone || "text-gray-500",
    });
  }, []);

  const getLspActionContext = useCallback(
    (view, overrides = {}) => {
      if (!view) return null;
      const head = view.state.selection.main.head;
      const runtimeBlocked = ["missing", "unavailable", "unsupported", "disabled"].includes(
        lspStatus.state,
      );
      return {
        canUseLsp: canUseLsp && !runtimeBlocked,
        hasWorkspace: Boolean(workspacePath),
        hasLspBridge,
        lspReadyLanguage,
        isLargeFile,
        documentUri: lspDocumentUriRef.current || "",
        hasDocument: Boolean(lspDocumentUriRef.current),
        languageId: nexusLanguageId,
        position: cmPosToLspPosition(view.state.doc, head),
        range: getEditorActionRange(view),
        diagnostics: showDiagnostics ? currentDiagnosticsRef.current : [],
        lspFeatures: languageFeatureModel.lsp.features,
        runtimeStatus: lspStatus,
        ...overrides,
      };
    },
    [
      canUseLsp,
      hasLspBridge,
      isLargeFile,
      languageFeatureModel.lsp.features,
      lspReadyLanguage,
      lspStatus,
      nexusLanguageId,
      showDiagnostics,
      workspacePath,
    ],
  );

  const runEditorLspAction = useCallback(
    async (featureId, options = {}) => {
      const view = options.view || editorViewRef.current;
      const engine = lspEngineRef.current;
      const documentUri = lspDocumentUriRef.current;
      if (!view || !engine || !documentUri) {
        updateLspActionStatus({
          state: "unavailable",
          featureId,
          text: "LSP action unavailable",
          title: "No active LSP document is open.",
          tone: "text-amber-400",
        });
        return false;
      }

      let context = getLspActionContext(view, options.context || {});
      if (!context) return false;

      if (featureId === EDITOR_LSP_FEATURE_IDS.renameSymbol) {
        const defaultName = getRenameDefaultName(view);
        const nextName =
          options.newName === undefined
            ? window.prompt("Rename symbol", defaultName)
            : options.newName;
        if (!String(nextName || "").trim()) {
          updateLspActionStatus({
            state: "idle",
            featureId,
            text: "Rename cancelled",
            tone: "text-gray-500",
          });
          return true;
        }
        context = { ...context, newName: String(nextName).trim() };
      }

      const request = createEditorLspFeatureRequest(featureId, context);
      if (!request.ready) {
        updateLspActionStatus({
          state: "unavailable",
          featureId,
          text: `${request.label || "LSP action"} unavailable`,
          title: request.disabledReason || request.pendingReason || "LSP action is not ready.",
          tone: "text-amber-400",
        });
        return false;
      }

      try {
        if (featureId === EDITOR_LSP_FEATURE_IDS.goToDefinition) {
          const locations = await engine.getDefinition(documentUri, request.position, {});
          const target = getPrimaryLspLocation(locations, documentUri);
          if (!target?.range) {
            updateLspActionStatus({
              state: "empty",
              featureId,
              text: "No definition",
              tone: "text-gray-500",
            });
            return true;
          }
          if (target.external) {
            updateLspActionStatus({
              state: "external",
              featureId,
              text: "Definition in another file",
              title: target.uri,
              tone: "text-sky-300",
            });
            return true;
          }
          const range = lspRangeToCodeMirrorRange(view.state.doc, target.range);
          if (!range) return false;
          view.dispatch({
            selection: { anchor: range.from, head: Math.max(range.to, range.from) },
            effects: EditorView.scrollIntoView(range.from, { y: "center" }),
          });
          view.focus();
          updateLspActionStatus({
            state: "applied",
            featureId,
            text: "Definition selected",
            tone: "text-sky-300",
          });
          return true;
        }

        if (featureId === EDITOR_LSP_FEATURE_IDS.formatDocument) {
          const edits = await engine.formatDocument(documentUri, {
            tabSize: editorTabSize,
            insertSpaces: true,
          });
          const changes = lspTextEditsToCodeMirrorChanges(view.state.doc, edits);
          if (!changes.length) {
            updateLspActionStatus({
              state: "empty",
              featureId,
              text: "No format edits",
              tone: "text-gray-500",
            });
            return true;
          }
          view.dispatch({ changes });
          updateLspActionStatus({
            state: "applied",
            featureId,
            text: `Format applied (${changes.length})`,
            tone: "text-emerald-300",
          });
          return true;
        }

        if (featureId === EDITOR_LSP_FEATURE_IDS.renameSymbol) {
          const workspaceEdit = await engine.renameSymbol(
            documentUri,
            request.position,
            request.newName,
          );
          const result = lspWorkspaceEditToCodeMirrorChanges(
            view.state.doc,
            workspaceEdit,
            documentUri,
          );
          if (!result.appliedChangeCount) {
            updateLspActionStatus({
              state: result.hasExternalChanges ? "external" : "empty",
              featureId,
              text: result.hasExternalChanges ? "Rename spans files" : "No rename edits",
              title: result.hasExternalChanges
                ? "Cross-file workspace edits are not applied from the single-file editor yet."
                : "",
              tone: result.hasExternalChanges ? "text-amber-400" : "text-gray-500",
            });
            return true;
          }
          view.dispatch({ changes: result.changes });
          updateLspActionStatus({
            state: "applied",
            featureId,
            text: `Rename applied (${result.appliedChangeCount})`,
            title: result.hasExternalChanges
              ? `${result.externalChangeCount} external edits were left untouched.`
              : "",
            tone: result.hasExternalChanges ? "text-amber-300" : "text-emerald-300",
          });
          return true;
        }

        if (featureId === EDITOR_LSP_FEATURE_IDS.codeActions) {
          const actions = await engine.getCodeActions(documentUri, request.range, {
            diagnostics: request.diagnostics,
          });
          const titles = actions.slice(0, 4).map(readCodeActionTitle).join(" | ");
          updateLspActionStatus({
            state: actions.length ? "available" : "empty",
            featureId,
            text: actions.length ? `Actions ${actions.length}` : "No code actions",
            title: titles || "No code actions returned by the language server.",
            tone: actions.length ? "text-sky-300" : "text-gray-500",
          });
          return true;
        }
      } catch (error) {
        updateLspActionStatus({
          state: "failed",
          featureId,
          text: "LSP action failed",
          title: error?.message || "Language server action failed.",
          tone: "text-red-400",
        });
        return false;
      }

      return false;
    },
    [editorTabSize, getLspActionContext, updateLspActionStatus],
  );

  const editorLspKeymap = useMemo(
    () => [
      {
        key: "F12",
        run: (view) => {
          runEditorLspAction(EDITOR_LSP_FEATURE_IDS.goToDefinition, { view });
          return true;
        },
      },
      {
        key: "F2",
        run: (view) => {
          runEditorLspAction(EDITOR_LSP_FEATURE_IDS.renameSymbol, { view });
          return true;
        },
      },
      {
        key: "Shift-Alt-f",
        run: (view) => {
          runEditorLspAction(EDITOR_LSP_FEATURE_IDS.formatDocument, { view });
          return true;
        },
      },
      {
        key: "Mod-.",
        run: (view) => {
          runEditorLspAction(EDITOR_LSP_FEATURE_IDS.codeActions, { view });
          return true;
        },
      },
    ],
    [runEditorLspAction],
  );

  const cmTheme = useMemo(
    () =>
      createNexusCodeMirrorTheme(
        settings,
        compactViewport,
        editorFontSize,
        editorLineHeight,
        reduceEditorMotion,
      ),
    [
      compactViewport,
      editorFontSize,
      editorLineHeight,
      reduceEditorMotion,
      settings.animations_enabled,
      settings.cursor_style,
      settings.font_family,
      settings.font_weight,
      settings.letter_spacing,
      settings.primary_accent,
      settings.reduce_motion,
      settings.theme,
      settings.visual_performance_profile,
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
      search({ top: true }),
      syntaxHighlighting(editorHighlightStyle, { fallback: true }),
      keymap.of([
        ...editorLspKeymap,
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
      scrollPastEnd(),
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
        focus: () => setEditorFocused(true),
        blur: () => {
          setEditorFocused(false);
          flushPendingChange();
        },
      }),
      autocompletion({
        override: [completionSource],
        activateOnTyping: settings.autocomplete_enabled !== false && !isLargeFile,
        activateOnTypingDelay: reduceEditorMotion ? 140 : 80,
        selectOnOpen: true,
        maxRenderedOptions: Math.min(
          autocompleteMaxItems,
          reduceEditorMotion ? (compactViewport ? 28 : 42) : compactViewport ? 45 : 80,
        ),
        aboveCursor: compactViewport,
        tooltipClass: () => "nx-cm-completion-tooltip",
        closeOnBlur: true,
        interactionDelay: reduceEditorMotion ? 120 : 75,
        updateSyncTime: reduceEditorMotion ? 70 : 100,
        positionInfo: positionCompletionInfo,
      }),
      hoverTooltip(hoverSource, {
        hoverTime: reduceEditorMotion ? 420 : 260,
        hideOnChange: "touch",
      }),
      highlightSelectionMatches({
        highlightWordAroundCursor: !isLargeFile,
        minSelectionLength: 2,
        maxMatches: reduceEditorMotion ? 80 : 160,
      }),
      placeholder("Schreib Code, Markdown, JSON oder Notizen direkt hier..."),
      cmThemeCompartment.of(cmTheme),
      languageCompartment.of(activeLanguageExtension),
      diagnosticsCompartment.of(showDiagnostics ? [lintGutter()] : []),
    ];

    if (showLineNumbers) {
      extensions.push(lineNumbers(), highlightActiveLineGutter());
    }
    if (!compactViewport && !isLargeFile) extensions.push(foldGutter());
    return extensions;
  }, [
    cmTheme,
    autocompleteMaxItems,
    activeLanguageExtension,
    compactViewport,
    completionSource,
    editorLspKeymap,
    editorHighlightStyle,
    editorTabSize,
    emitEditorChange,
    flushPendingChange,
    hoverSource,
    isLargeFile,
    reduceEditorMotion,
    scheduleCursorInfoUpdate,
    scheduleLineCountUpdate,
    settings.autocomplete_enabled,
    showDiagnostics,
    showLineNumbers,
    wordWrap,
  ]);

  const handleCreateEditor = useCallback((view) => {
    editorViewRef.current = view;
    setEditorFallbackReason("");
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

  const handleEditorCrash = useCallback((error) => {
    setEditorFallbackReason(error?.message || "CodeMirror render failed");
  }, []);

  const handleFallbackChange = useCallback(
    (event) => {
      const nextValue = event.target.value;
      codeRef.current = nextValue;
      setFallbackValue(nextValue);
      setLineCount(countLines(nextValue));
      onChange(nextValue);
    },
    [onChange],
  );

  const updateFallbackCursor = useCallback((event) => {
    const target = event.currentTarget;
    const position = Number(target.selectionStart || 0);
    const beforeCursor = target.value.slice(0, position);
    const lines = beforeCursor.split(/\r\n|\r|\n/);
    setCursorInfo({
      line: Math.max(1, lines.length),
      col: Math.max(1, (lines[lines.length - 1] || "").length + 1),
    });
  }, []);

  const renderFallbackEditor = useCallback(
    (reason = editorFallbackReason) => (
      <>
        <textarea
          className="nx-code-editor-fallback"
          value={fallbackValue}
          onChange={handleFallbackChange}
          onSelect={updateFallbackCursor}
          onFocus={() => setEditorFocused(true)}
          onBlur={() => setEditorFocused(false)}
          spellCheck={false}
          aria-label="Nexus Code text editor fallback"
        />
        <div className="nx-code-editor-fallback-notice" title={reason}>
          Text fallback
        </div>
      </>
    ),
    [
      editorFallbackReason,
      fallbackValue,
      handleFallbackChange,
      updateFallbackCursor,
    ],
  );

  const handleCanvasMouseDown = useCallback((event) => {
    if (event.button !== 0) return;
    const target = event.target;
    if (
      target?.closest?.(
        ".cm-panel, .cm-tooltip, button, input, textarea, select, [contenteditable='true']",
      )
    ) {
      return;
    }
    window.requestAnimationFrame(() => {
      const view = editorViewRef.current;
      if (view && !view.hasFocus) view.focus();
    });
  }, []);

  const editorStatus = useMemo(
    () =>
      createEditorStatusModel({
        languageId: nexusLanguageId,
        languageLabel,
        lspStatus,
        lspEnabled: settings.lsp_enabled !== false,
        lspReadyLanguage,
        hasWorkspace: Boolean(workspacePath),
        hasLspBridge,
        canUseLsp,
        isLargeFile,
        diagnostics: diagnosticSummary,
        diagnosticsEnabled: showDiagnostics,
        editorFallbackReason,
      }),
    [
      canUseLsp,
      diagnosticSummary,
      editorFallbackReason,
      hasLspBridge,
      isLargeFile,
      languageLabel,
      lspReadyLanguage,
      lspStatus,
      nexusLanguageId,
      settings.lsp_enabled,
      showDiagnostics,
      workspacePath,
    ],
  );

  return (
    <div
      className="nx-code-editor-shell flex-1 flex flex-col min-h-0 w-full relative overflow-hidden bg-transparent"
      style={{ background: "transparent" }}
      data-editor-engine={editorFallbackReason ? "textarea-fallback" : "codemirror"}
      data-editor-fallback={editorFallbackReason ? "true" : "false"}
      data-cm-language-state={activeLanguageSupport.status}
      data-cm-language-id={activeLanguageSupport.grammarId}
      data-focused={editorFocused ? "true" : "false"}
      data-symbol-count={documentSymbols.length}
      data-active-symbol={editorScopeInfo.activeSymbol?.name || ""}
      data-scope-path={editorScopeInfo.pathLabel}
      data-lsp-state={editorStatus.lsp.state}
      data-lsp-capabilities={languageFeatureModel.capabilityBadge}
      data-lsp-action-state={lspActionStatus.state}
      data-lsp-action-feature={lspActionStatus.featureId}
      data-completion-sources={languageFeatureModel.completions.availableLabels.join(",")}
      data-diagnostic-count={editorStatus.diagnostics.total}
    >
      <div
        ref={editorCanvasRef}
        className="nx-code-editor-canvas flex-1 min-h-0 w-full relative overflow-hidden"
        onMouseDown={handleCanvasMouseDown}
      >
        {editorFallbackReason ? (
          renderFallbackEditor(editorFallbackReason)
        ) : (
          <CodeMirrorCrashBoundary
            resetKey={editorResetKey}
            onCrash={handleEditorCrash}
            fallback={renderFallbackEditor}
          >
            <CodeMirror
              value={code || ""}
              className="nx-code-codemirror-host"
              height="100%"
              width="100%"
              extensions={baseExtensions}
              onChange={handleChange}
              onCreateEditor={handleCreateEditor}
              basicSetup={false}
              indentWithTab
              editable
            />
          </CodeMirrorCrashBoundary>
        )}
      </div>

      <div
        className="nx-code-editor-status h-6 flex items-center justify-between gap-3 px-3 shrink-0 select-none backdrop-blur-md border-t border-white/5 z-10"
        style={{ background: "rgba(0,0,0,0.3)" }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <span
            className="text-[10px] text-gray-400 font-medium truncate"
            title={editorStatus.language.title}
          >
            {editorStatus.language.label}
          </span>
          <span
            className={`text-[10px] ${editorStatus.engine.tone}`}
            title={editorStatus.engine.title}
          >
            {editorStatus.engine.label}
          </span>
          <span
            className={`text-[10px] font-medium ${editorStatus.lsp.tone}`}
            title={editorStatus.lsp.title}
          >
            {editorStatus.lsp.text}
          </span>
          {languageFeatureModel.capabilityBadge && (
            <span
              className="text-[10px] text-gray-500"
              title={languageFeatureModel.capabilityTitle}
            >
              {languageFeatureModel.capabilityBadge}
            </span>
          )}
          <span
            className="hidden sm:inline text-[10px] text-gray-500"
            title={languageFeatureModel.completions.title}
          >
            {languageFeatureModel.completions.shortText}
          </span>
          <span
            className={`text-[10px] font-medium ${editorStatus.diagnostics.tone}`}
            title={editorStatus.diagnostics.title}
          >
            {editorStatus.diagnostics.text}
          </span>
          {lspActionStatus.text && (
            <span
              className={`hidden md:inline max-w-[16rem] truncate text-[10px] font-medium ${lspActionStatus.tone}`}
              title={lspActionStatus.title}
            >
              {lspActionStatus.text}
            </span>
          )}
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
          {editorScopeInfo.activeSymbol && (
            <span
              className="max-w-[18rem] truncate text-[10px] text-gray-500"
              title={editorScopeInfo.tooltip}
            >
              {editorScopeInfo.kindLabel} {editorScopeInfo.pathLabel}
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
          {documentSymbols.length > 0 && (
            <span
              className="text-[10px] text-gray-500"
              title={editorScopeInfo.tooltip}
            >
              {documentSymbols.length} Symbols / {editorScopeInfo.rangeLabel}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
