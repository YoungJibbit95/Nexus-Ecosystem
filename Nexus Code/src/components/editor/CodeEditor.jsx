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
  createEditorLargeFilePolicy,
  createEditorLspActionStatus,
  createEditorLspFeatureRequest,
  createEditorScopeInfo,
  createEditorSelectionSnapshot,
  createEditorHighlightStyle,
  createEditorStatusModel,
  createEditorTextSelectionSnapshot,
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
import {
  countLines,
  createHoverTooltipDom,
  createNexusCodeMirrorTheme,
  createTypingAnimationPlugin,
  getCompactViewport,
  getEditorActionRange,
  getRenameDefaultName,
  positionCompletionInfo,
  readCodeActionTitle,
  resolveAutocompleteMaxItems,
  resolveEditorAccent,
  resolveEditorFontSize,
  resolveEditorLineHeight,
  resolveEditorReducedMotion,
  resolveEditorTabSize,
  resolveEditorTheme,
} from "./codeEditorRenderingModel.js";

const EDITOR_CHANGE_EMIT_INTERVAL_MS = 48;
const CURSOR_INFO_UPDATE_MS = 45;
const LINE_COUNT_UPDATE_MS = 80;
const EDITOR_MOUNT_WATCHDOG_MS = 1800;

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
  const [selectionInfo, setSelectionInfo] = useState(() =>
    createEditorTextSelectionSnapshot(code || "", 0, 0),
  );
  const [lspStatus, setLspStatus] = useState({
    state: "idle",
    label: "LSP",
    message: "",
  });
  const [lspActionStatus, setLspActionStatus] = useState(() =>
    createEditorLspActionStatus(),
  );
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
  const pendingSelectionInfoRef = useRef(selectionInfo);
  const lineCountTimerRef = useRef(null);
  const pendingLineCountRef = useRef(1);
  const diagnosticsHashRef = useRef("");
  const currentDiagnosticsRef = useRef([]);
  const installedExtensions = Array.isArray(settings.extensions_installed)
    ? settings.extensions_installed
    : [];
  const hasRainbowBrackets = installedExtensions.includes("rainbow-brackets");
  const codeCharCount = typeof code === "string" ? code.length : 0;
  const largeFilePolicy = useMemo(
    () =>
      createEditorLargeFilePolicy({
        charCount: codeCharCount,
        lineCount,
      }),
    [codeCharCount, lineCount],
  );
  const isLargeFile = largeFilePolicy.large;
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

  const scheduleCursorInfoUpdate = useCallback((line, col, selectionSnapshot = null) => {
    pendingCursorInfoRef.current = { line, col };
    if (selectionSnapshot) {
      pendingSelectionInfoRef.current = selectionSnapshot;
    }
    if (cursorTimerRef.current) return;
    cursorTimerRef.current = window.setTimeout(() => {
      cursorTimerRef.current = null;
      const next = pendingCursorInfoRef.current;
      setCursorInfo((prev) =>
        prev.line === next.line && prev.col === next.col ? prev : next,
      );
      const nextSelection = pendingSelectionInfoRef.current;
      setSelectionInfo((prev) =>
        prev.key === nextSelection.key ? prev : nextSelection,
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
    const resetSelection = createEditorTextSelectionSnapshot(codeRef.current, 0, 0);
    pendingSelectionInfoRef.current = resetSelection;
    setSelectionInfo(resetSelection);
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
          effects: languageCompartment.reconfigure(
            largeFilePolicy.syntaxHighlightingEnabled ? nextSupport.extension : [],
          ),
        });
      }
    });

    return () => {
      cancelled = true;
    };
  }, [fileName, languageFallback, largeFilePolicy.syntaxHighlightingEnabled, nexusLanguageId]);

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
    setLspActionStatus(createEditorLspActionStatus());
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
      if (settings.autocomplete_enabled === false || !largeFilePolicy.autocompleteEnabled) {
        return null;
      }

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
      largeFilePolicy.autocompleteEnabled,
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

      if (engine && documentUri && largeFilePolicy.hoverEnabled) {
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
    [editorAccent, largeFilePolicy.hoverEnabled, showDiagnostics],
  );

  const updateLspActionStatus = useCallback((status = {}) => {
    setLspActionStatus(createEditorLspActionStatus(status));
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
      settings.animated_typing,
      settings.animation_speed,
      settings.cursor_glow,
      settings.cursor_style,
      settings.font_family,
      settings.font_weight,
      settings.letter_spacing,
      settings.primary_accent,
      settings.reduce_motion,
      settings.smooth_caret,
      settings.text_glow,
      settings.theme,
      settings.typing_animation_style,
      settings.typing_glow,
      settings.visual_performance_profile,
    ],
  );

  const baseExtensions = useMemo(() => {
    const extensions = [
      history(),
      closeBrackets(),
      drawSelection(),
      dropCursor(),
      createTypingAnimationPlugin(settings, reduceEditorMotion),
      largeFilePolicy.activeLineEnabled ? highlightActiveLine() : [],
      highlightSpecialChars(),
      indentOnInput(),
      rectangularSelection(),
      bracketMatching(),
      search({ top: true }),
      largeFilePolicy.syntaxHighlightingEnabled
        ? syntaxHighlighting(editorHighlightStyle, { fallback: true })
        : [],
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
      EditorState.allowMultipleSelections.of(true),
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
          const selectionSnapshot = createEditorSelectionSnapshot(
            update.state.doc,
            update.state.selection,
          );
          scheduleCursorInfoUpdate(
            selectionSnapshot.cursor.line,
            selectionSnapshot.cursor.col,
            selectionSnapshot,
          );
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
        activateOnTyping:
          settings.autocomplete_enabled !== false && largeFilePolicy.autocompleteEnabled,
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
      largeFilePolicy.selectionMatchMax > 0
        ? highlightSelectionMatches({
            highlightWordAroundCursor: !isLargeFile,
            minSelectionLength: 2,
            maxMatches: largeFilePolicy.selectionMatchMax,
          })
        : [],
      placeholder("Schreib Code, Markdown, JSON oder Notizen direkt hier..."),
      cmThemeCompartment.of(cmTheme),
      languageCompartment.of(
        largeFilePolicy.syntaxHighlightingEnabled ? activeLanguageExtension : [],
      ),
      diagnosticsCompartment.of(showDiagnostics ? [lintGutter()] : []),
    ];

    if (showLineNumbers) {
      extensions.push(lineNumbers(), highlightActiveLineGutter());
    }
    if (!compactViewport && largeFilePolicy.foldGutterEnabled) extensions.push(foldGutter());
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
    largeFilePolicy,
    reduceEditorMotion,
    scheduleCursorInfoUpdate,
    scheduleLineCountUpdate,
    settings.animated_typing,
    settings.animation_speed,
    settings.autocomplete_enabled,
    settings.text_glow,
    settings.typing_animation_style,
    settings.typing_glow,
    showDiagnostics,
    showLineNumbers,
    wordWrap,
  ]);

  const handleCreateEditor = useCallback((view) => {
    editorViewRef.current = view;
    setEditorFallbackReason("");
    setLineCount(view.state.doc.lines);
    const selectionSnapshot = createEditorSelectionSnapshot(view.state.doc, view.state.selection);
    pendingSelectionInfoRef.current = selectionSnapshot;
    setSelectionInfo(selectionSnapshot);
    setCursorInfo(selectionSnapshot.cursor);
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
    const selectionSnapshot = createEditorTextSelectionSnapshot(
      target.value,
      target.selectionStart,
      target.selectionEnd,
    );
    pendingSelectionInfoRef.current = selectionSnapshot;
    setSelectionInfo(selectionSnapshot);
    setCursorInfo(selectionSnapshot.cursor);
  }, []);

  const renderFallbackEditor = useCallback(
    (reason = editorFallbackReason) => (
      <>
        <textarea
          className="nx-code-editor-fallback"
          value={fallbackValue}
          onChange={handleFallbackChange}
          onSelect={updateFallbackCursor}
          onKeyUp={updateFallbackCursor}
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
      data-editor-large-file-mode={largeFilePolicy.dataState}
      data-cm-language-state={activeLanguageSupport.status}
      data-cm-language-id={activeLanguageSupport.grammarId}
      data-cm-language-support={activeLanguageSupport.supportLevel}
      data-focused={editorFocused ? "true" : "false"}
      data-cursor-position={`${cursorInfo.line}:${cursorInfo.col}`}
      data-selection-empty={selectionInfo.empty ? "true" : "false"}
      data-selection-ranges={selectionInfo.rangeCount}
      data-selection-chars={selectionInfo.selectedCharacters}
      data-selection-range={selectionInfo.rangeLabel}
      data-symbol-count={documentSymbols.length}
      data-active-symbol={editorScopeInfo.activeSymbol?.name || ""}
      data-scope-path={editorScopeInfo.pathLabel}
      data-lsp-state={editorStatus.lsp.state}
      data-lsp-capabilities={languageFeatureModel.capabilityBadge}
      data-lsp-supported-features={languageFeatureModel.lsp.supportedFeatureIds.join(",")}
      data-lsp-active-features={languageFeatureModel.lsp.activeFeatureIds.join(",")}
      data-lsp-action-state={lspActionStatus.state}
      data-lsp-action-feature={lspActionStatus.featureId}
      data-lsp-action-contract={lspActionStatus.dataState}
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
          {!selectionInfo.empty && (
            <span
              className="hidden lg:inline max-w-[14rem] truncate text-[10px] text-sky-300/80"
              title={selectionInfo.title}
            >
              Sel {selectionInfo.statusText}
            </span>
          )}
          {isLargeFile && (
            <span
              className="text-[10px] text-amber-400/80 font-semibold"
              title={largeFilePolicy.title}
            >
              {largeFilePolicy.statusLabel}
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
          <span className="text-[10px] text-gray-400" title={selectionInfo.title}>
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
