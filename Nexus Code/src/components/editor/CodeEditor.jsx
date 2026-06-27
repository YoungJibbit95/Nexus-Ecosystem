import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Editor, { useMonaco } from "@monaco-editor/react";
import { ensureMonacoWorkers } from "../../lib/monacoWorkers";
import { THEMES as EDITOR_THEMES } from "../../pages/editor/editorShared.jsx";
import { createMonacoModelPath } from "../../ide/editor/monacoModelUri.js";
import { detectMonacoLanguageId } from "../../ide/languages/languageIds.js";

const IGNORED_DIAGNOSTIC_CODES = new Set([2307, 2792, 1208, 2339, 2580, 2304]);
const EDITOR_CHANGE_EMIT_INTERVAL_MS = 60;
const CURSOR_INFO_UPDATE_MS = 50;
const LINE_COUNT_UPDATE_MS = 80;
const LARGE_FILE_CHAR_THRESHOLD = 180_000;
const COMPACT_VIEWPORT_WIDTH = 920;
const DEFAULT_EDITOR_FONT_STACK =
  "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace";
const TRANSPARENT_EDITOR_SELECTORS = [
  ".monaco-editor",
  ".monaco-editor .margin",
  ".monaco-editor .monaco-editor-background",
  ".monaco-editor-background",
  ".monaco-editor .inputarea.ime-input",
  ".monaco-editor .scroll-decoration",
  ".monaco-editor .minimap",
  ".monaco-editor .overflow-guard",
];

function extractRgbTuple(value) {
  if (!value || typeof value !== "string") return null;
  const hexMatch = value.match(/#([0-9a-fA-F]{6})/);
  if (hexMatch) {
    const hex = hexMatch[1];
    return [
      Number.parseInt(hex.slice(0, 2), 16),
      Number.parseInt(hex.slice(2, 4), 16),
      Number.parseInt(hex.slice(4, 6), 16),
    ];
  }
  const rgbMatch = value.match(
    /rgba?\(\s*([0-9.]+)\s*,\s*([0-9.]+)\s*,\s*([0-9.]+)/i,
  );
  if (!rgbMatch) return null;
  return [
    Number.parseFloat(rgbMatch[1]),
    Number.parseFloat(rgbMatch[2]),
    Number.parseFloat(rgbMatch[3]),
  ];
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

function resolveEditorFontSize(settings, fallbackFontSize) {
  return Math.round(
    clampNumber(settings.font_size ?? fallbackFontSize, 11, 22, 14),
  );
}

function resolveEditorLineHeight(settings, resolvedFontSize) {
  const raw = clampNumber(settings.line_height, 1.2, 34, 1.55);
  const pixelValue = raw <= 3 ? raw * resolvedFontSize : raw;
  return Math.round(
    Math.max(resolvedFontSize + 4, Math.min(40, pixelValue)),
  );
}

function resolveEditorLetterSpacing(settings) {
  return clampNumber(settings.letter_spacing, 0, 1.5, 0);
}

function resolveEditorTabSize(settings, fallbackTabSize) {
  return Math.round(
    clampNumber(settings.tab_size ?? fallbackTabSize, 2, 8, 4),
  );
}

function resolveEditorFontFamily(settings) {
  const configured = String(settings.font_family || "").trim();
  if (!configured) return DEFAULT_EDITOR_FONT_STACK;
  return `'${configured.replace(/'/g, "")}', ${DEFAULT_EDITOR_FONT_STACK}`;
}

function buildStableThemeName(themeId, accent) {
  const base =
    String(themeId || "dark")
      .replace(/[^a-z0-9_-]/gi, "")
      .slice(0, 32) || "dark";
  const accentToken =
    String(accent || "8000ff")
      .replace(/[^a-z0-9]/gi, "")
      .slice(0, 24) || "accent";
  return `nexus-${base}-${accentToken}`;
}

function pickReadableColorSource(...values) {
  for (const value of values) {
    const normalized = typeof value === "string" ? value.trim() : "";
    if (!normalized) continue;
    if (extractRgbTuple(normalized)) return normalized;
  }
  for (const value of values) {
    const normalized = typeof value === "string" ? value.trim() : "";
    if (normalized) return normalized;
  }
  return "#0b1020";
}

function getLuminance(rgb) {
  if (!rgb) return 0;
  const channels = rgb.map((v) => {
    const normalized = Math.max(0, Math.min(255, v)) / 255;
    return normalized <= 0.03928
      ? normalized / 12.92
      : ((normalized + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function normalizeEditorTextColor(value, background) {
  const bg = extractRgbTuple(background);
  const fg = extractRgbTuple(value);
  if (!bg) return "#f3f4f6";
  // Keep editor text bright by default; only switch to dark on very bright surfaces.
  if (getLuminance(bg) < 0.72) return "#f3f4f6";
  if (fg && getLuminance(fg) > 0.42) return value;
  return "#111827";
}

function isIgnoredDiagnosticCode(rawCode) {
  const normalized =
    typeof rawCode === "object" && rawCode !== null ? rawCode.value : rawCode;
  const numeric = Number(normalized);
  return Number.isFinite(numeric) && IGNORED_DIAGNOSTIC_CODES.has(numeric);
}

export default function CodeEditor({
  code,
  onChange,
  fileName,
  fontSize = 14,
  showLineNumbers = true,
  tabSize = 4,
  wordWrap = false,
  minimap = false,
  onMarkersChange,
  settings = /** @type {any} */ ({}),
}) {
  useEffect(() => {
    ensureMonacoWorkers();
  }, []);

  const monaco = useMonaco();
  const language = useMemo(() => detectMonacoLanguageId(fileName), [fileName]);
  const modelPath = useMemo(() => createMonacoModelPath({ fileName }), [fileName]);
  const [cursorInfo, setCursorInfo] = useState({ line: 1, col: 1 });
  const [lineCount, setLineCount] = useState(1);
  const [compactViewport, setCompactViewport] = useState(getCompactViewport);
  const editorRef = useRef(null);
  const markerTimerRef = useRef(null);
  const markerHashRef = useRef("");
  const changeEmitTimerRef = useRef(null);
  const pendingChangeRef = useRef(null);
  const cursorTimerRef = useRef(null);
  const pendingCursorInfoRef = useRef({ line: 1, col: 1 });
  const lineCountTimerRef = useRef(null);
  const pendingLineCountRef = useRef(1);
  const markerListenerDisposableRef = useRef(null);
  const cursorListenerDisposableRef = useRef(null);
  const blurListenerDisposableRef = useRef(null);
  const contentListenerDisposableRef = useRef(null);
  const installedExtensions = Array.isArray(settings.extensions_installed)
    ? settings.extensions_installed
    : [];
  const hasPrettier = installedExtensions.includes("prettier");
  const hasRainbowBrackets = installedExtensions.includes("rainbow-brackets");
  const isLargeFile = typeof code === "string" && code.length > LARGE_FILE_CHAR_THRESHOLD;
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
  const editorOptions = useMemo(
    () => ({
      fontSize: editorFontSize,
      fontFamily: resolveEditorFontFamily(settings),
      fontWeight: String(settings.font_weight || "400"),
      letterSpacing: resolveEditorLetterSpacing(settings),
      lineHeight: editorLineHeight,
      lineNumbers: showLineNumbers ? "on" : "off",
      lineDecorationsWidth: compactViewport ? 8 : 14,
      glyphMargin: false,
      tabSize: editorTabSize,
      insertSpaces: true,
      detectIndentation: true,
      wordWrap: wordWrap ? "on" : "off",
      wrappingIndent: "same",
      minimap: {
        enabled: (settings.minimap === true || minimap === true) && !isLargeFile && !compactViewport,
        renderCharacters: false,
        maxColumn: 90,
      },
      cursorBlinking: settings.cursor_blinking || "solid",
      cursorSmoothCaretAnimation: settings.smooth_caret === true ? "on" : "off",
      cursorStyle: settings.cursor_style || "line",
      renderWhitespace: settings.render_whitespace || "none",
      renderControlCharacters: false,
      formatOnPaste: hasPrettier || settings.format_on_paste === true,
      formatOnType: hasPrettier || settings.format_on_type === true,
      stickyScroll: { enabled: settings.sticky_scroll === true && !compactViewport },
      smoothScrolling: !isLargeFile,
      automaticLayout: true,
      largeFileOptimizations: true,
      renderValidationDecorations: "editable",
      padding: {
        top: compactViewport ? 14 : 20,
        bottom: compactViewport ? 14 : 20,
      },
      scrollBeyondLastLine: false,
      renderLineHighlight: settings.line_highlight || "all",
      renderLineHighlightOnlyWhenFocus: false,
      bracketPairColorization: {
        enabled: hasRainbowBrackets || settings.bracket_colorization === true,
      },
      guides: {
        bracketPairs: !isLargeFile,
        indentation: true,
        highlightActiveIndentation: !isLargeFile,
      },
      fontLigatures: settings.font_ligatures !== false,
      selectionHighlight: !isLargeFile,
      occurrencesHighlight: "off",
      codeLens: false,
      folding: !isLargeFile,
      foldingHighlight: !isLargeFile,
      links: false,
      colorDecorators: !isLargeFile,
      hover: {
        delay: 350,
        sticky: true,
      },
      quickSuggestions: !isLargeFile,
      inlayHints: { enabled: "off" },
      fixedOverflowWidgets: true,
      hideCursorInOverviewRuler: isLargeFile,
      overviewRulerLanes: isLargeFile ? 0 : 2,
      mouseWheelScrollSensitivity: 1,
      fastScrollSensitivity: 4,
      scrollbar: {
        verticalScrollbarSize: compactViewport ? 7 : 9,
        horizontalScrollbarSize: compactViewport ? 7 : 9,
        useShadows: false,
        verticalHasArrows: false,
        horizontalHasArrows: false,
        alwaysConsumeMouseWheel: false,
      },
    }),
    [
      compactViewport,
      editorFontSize,
      editorLineHeight,
      editorTabSize,
      hasPrettier,
      hasRainbowBrackets,
      isLargeFile,
      minimap,
      settings.bracket_colorization,
      settings.cursor_blinking,
      settings.cursor_style,
      settings.font_family,
      settings.font_ligatures,
      settings.font_weight,
      settings.format_on_paste,
      settings.format_on_type,
      settings.letter_spacing,
      settings.line_highlight,
      settings.minimap,
      settings.render_whitespace,
      settings.smooth_caret,
      settings.sticky_scroll,
      showLineNumbers,
      wordWrap,
    ],
  );

  const forceTransparentEditorShell = useCallback(() => {
    const editor = editorRef.current;
    const domNode = editor?.getDomNode?.();
    if (!domNode) return;
    domNode.classList.add("nx-code-monaco-mounted");
    TRANSPARENT_EDITOR_SELECTORS.forEach((selector) => {
      domNode.querySelectorAll(selector).forEach((node) => {
        const el = /** @type {HTMLElement} */ (node);
        if (el.style.backgroundColor !== "transparent") {
          el.style.backgroundColor = "transparent";
        }
        if (el.style.backgroundImage !== "none") {
          el.style.backgroundImage = "none";
        }
      });
    });
  }, []);

  const disposeEditorListeners = useCallback(() => {
    markerListenerDisposableRef.current?.dispose?.();
    markerListenerDisposableRef.current = null;
    cursorListenerDisposableRef.current?.dispose?.();
    cursorListenerDisposableRef.current = null;
    blurListenerDisposableRef.current?.dispose?.();
    blurListenerDisposableRef.current = null;
    contentListenerDisposableRef.current?.dispose?.();
    contentListenerDisposableRef.current = null;
  }, []);

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
    if (monaco) {
      try {
        const activeTheme = EDITOR_THEMES[settings.theme] || EDITOR_THEMES.nexus_vibrant;
        const rootStyles = getComputedStyle(document.documentElement);
        const cssEditorText =
          rootStyles.getPropertyValue("--nexus-editor-foreground").trim() ||
          rootStyles.getPropertyValue("--nexus-text").trim();
        const cssEditorSurface =
          rootStyles.getPropertyValue("--nexus-panel-surface").trim() ||
          rootStyles.getPropertyValue("--nexus-bg-value").trim();
        const monacoBase = "vs-dark";
        const editorTextColor = normalizeEditorTextColor(
          pickReadableColorSource(cssEditorText, activeTheme.text, "#f3f4f6"),
          cssEditorSurface,
        );
        const editorLineNumberColor = "#9ca3af";
        const editorWidgetBackground = "#0a0a0f";
        const themeName = buildStableThemeName(
          settings.theme,
          settings.primary_accent || activeTheme.accent,
        );

        monaco.editor.defineTheme(themeName, {
          base: monacoBase,
          inherit: true,
          rules: [
            { token: "comment", foreground: String(activeTheme.comment || "#6a9955").replace('#', ''), fontStyle: "italic" },
            { token: "keyword", foreground: String(activeTheme.keyword || "#569cd6").replace('#', '') },
            { token: "string", foreground: String(activeTheme.string || "#ce9178").replace('#', '') },
            { token: "number", foreground: String(activeTheme.number || "#b5cea8").replace('#', '') },
            { token: "identifier.function", foreground: String(activeTheme.function || "#61afef").replace('#', '') },
            { token: "type", foreground: String(activeTheme.keyword || "#569cd6").replace('#', '') },
          ],
          colors: {
            "editor.background": "#00000000",
            "editorGutter.background": "#00000000",
            "minimap.background": "#00000000",
            "editorOverviewRuler.background": "#00000000",
            "editor.lineHighlightBorder": "#00000000",
            "editor.foreground": editorTextColor,
            "editor.selectionBackground": activeTheme.selection || "#264f78",
            "editorLineNumber.foreground": editorLineNumberColor,
            "editor.lineHighlightBackground": "#ffffff0a",
            "editorCursor.foreground": activeTheme.accent || "#8000ff",
            "editorWidget.background": editorWidgetBackground,
          },
        });
        monaco.editor.setTheme(themeName);
        requestAnimationFrame(() => forceTransparentEditorShell());
      } catch (err) {
        console.error("Monaco Theme Definition Error:", err);
        // Fallback to a built-in theme if definition fails
        monaco.editor.setTheme("vs-dark");
        requestAnimationFrame(() => forceTransparentEditorShell());
      }
    }
  }, [
    monaco,
    settings.primary_accent,
    settings.theme,
    settings.background,
    settings.panel_background_mode,
    settings.panel_blur_strength,
    forceTransparentEditorShell,
  ]);

  // Compiler options for TS/JSX
  useEffect(() => {
    if (monaco) {
      try {
        // @ts-ignore
        const tsDefaults = monaco.languages.typescript.typescriptDefaults;
        // @ts-ignore
        const jsDefaults = monaco.languages.typescript.javascriptDefaults;

        tsDefaults.setCompilerOptions({
          // @ts-ignore
          target: monaco.languages.typescript.ScriptTarget.ESNext,
          allowNonTsExtensions: true,
          // @ts-ignore
          moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
          // @ts-ignore
          module: monaco.languages.typescript.ModuleKind.CommonJS,
          noEmit: true,
          esModuleInterop: true,
          allowSyntheticDefaultImports: true,
          // @ts-ignore
          jsx: monaco.languages.typescript.JsxEmit.React,
          reactNamespace: "React",
          allowJs: true,
        });

        jsDefaults.setCompilerOptions({
          // @ts-ignore
          target: monaco.languages.typescript.ScriptTarget.ESNext,
          noEmit: true,
          allowJs: true,
          // @ts-ignore
          jsx: monaco.languages.typescript.JsxEmit.React,
        });

        tsDefaults.setDiagnosticsOptions({
          noSemanticValidation: true,
          noSyntaxValidation: false,
          noSuggestionDiagnostics: true,
          // 2580: Cannot find name 'require'
          // 2304: Cannot find name 'module', 'process', etc.
          // 2307: Cannot find module (import/require)
          diagnosticCodesToIgnore: [...IGNORED_DIAGNOSTIC_CODES],
        });
        if (typeof jsDefaults?.setDiagnosticsOptions === "function") {
          jsDefaults.setDiagnosticsOptions({
            noSemanticValidation: true,
            noSyntaxValidation: false,
            noSuggestionDiagnostics: true,
            diagnosticCodesToIgnore: [...IGNORED_DIAGNOSTIC_CODES],
          });
        }
      } catch (err) {
        console.error("Monaco TS Config Error:", err);
      }
    }
  }, [monaco]);

  // Snippets integration
  useEffect(() => {
    if (monaco) {
      const snippets = [
        {
          label: "nexus-component",
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: [
            "import React from 'react';",
            "import { motion } from 'framer-motion';",
            "",
            "export default function ${1:ComponentName}() {",
            "  return (",
            "    <motion.div",
            "      initial={{ opacity: 0, y: 10 }}",
            "      animate={{ opacity: 1, y: 0 }}",
            "      className=\"nexus-glass p-6 rounded-2xl\"",
            "    >",
            "      <h1 className=\"text-2xl font-bold\">${2:Hello World}</h1>",
            "    </motion.div>",
            "  );",
            "}",
          ].join("\n"),
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: "Create a premium Nexus UI component",
        },
        {
          label: "clg",
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: "console.log(${1:object});",
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: "Console log",
        },
      ];

      const disposable = monaco.languages.registerCompletionItemProvider("javascript", {
        provideCompletionItems: (model, position) => {
          const word = model.getWordUntilPosition(position);
          const range = {
            startLineNumber: position.lineNumber,
            endLineNumber: position.lineNumber,
            startColumn: word.startColumn,
            endColumn: word.endColumn,
          };
          return {
            suggestions: snippets.map((s) => ({ ...s, range })),
          };
        },
      });

      return () => disposable.dispose();
    }
  }, [monaco]);

  useEffect(() => {
    if (editorRef.current && settings._revealLine) {
      const { line, col } = settings._revealLine;
      editorRef.current.revealLineInCenter(line);
      editorRef.current.setPosition({ lineNumber: line, column: col });
      editorRef.current.focus();
    }
  }, [settings._revealLine]);

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

  const flushCursorInfo = useCallback(() => {
    if (cursorTimerRef.current) {
      window.clearTimeout(cursorTimerRef.current);
      cursorTimerRef.current = null;
    }
    const next = pendingCursorInfoRef.current;
    setCursorInfo((prev) =>
      prev.line === next.line && prev.col === next.col ? prev : next,
    );
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

  const emitEditorChange = useCallback((value) => {
    pendingChangeRef.current = value;
    if (changeEmitTimerRef.current) return;
    changeEmitTimerRef.current = window.setTimeout(() => {
      changeEmitTimerRef.current = null;
      if (pendingChangeRef.current === null) return;
      const nextValue = pendingChangeRef.current;
      pendingChangeRef.current = null;
      onChange(nextValue);
    }, EDITOR_CHANGE_EMIT_INTERVAL_MS);
  }, [onChange]);

  useEffect(() => {
    return () => {
      disposeEditorListeners();
      if (markerTimerRef.current) {
        window.clearTimeout(markerTimerRef.current);
        markerTimerRef.current = null;
      }
      if (cursorTimerRef.current) {
        window.clearTimeout(cursorTimerRef.current);
        cursorTimerRef.current = null;
      }
      if (lineCountTimerRef.current) {
        window.clearTimeout(lineCountTimerRef.current);
        lineCountTimerRef.current = null;
      }
      flushPendingChange();
      flushCursorInfo();
    };
  }, [disposeEditorListeners, flushPendingChange, flushCursorInfo]);

  const handleEditorChange = (value) => {
    emitEditorChange(value || "");
  };

  const handleEditorDidMount = (editor, _monaco) => {
    editorRef.current = editor;
    disposeEditorListeners();
    setLineCount(Math.max(1, Number(editor.getModel()?.getLineCount?.() || 1)));

    const refreshEditorShell = () => {
      editor.layout();
      forceTransparentEditorShell();
    };
    requestAnimationFrame(refreshEditorShell);
    if (document.fonts?.ready) {
      document.fonts.ready
        .then(() => requestAnimationFrame(refreshEditorShell))
        .catch(() => {});
    } else {
      window.setTimeout(refreshEditorShell, 220);
    }

    cursorListenerDisposableRef.current = editor.onDidChangeCursorPosition((e) => {
      scheduleCursorInfoUpdate(e.position.lineNumber, e.position.column);
    });
    contentListenerDisposableRef.current = editor.onDidChangeModelContent(() => {
      const nextCount = editor.getModel()?.getLineCount?.() || 1;
      scheduleLineCountUpdate(nextCount);
    });
    blurListenerDisposableRef.current = editor.onDidBlurEditorText(() => {
      flushPendingChange();
      flushCursorInfo();
    });

    // Listen for markers (errors, warnings)
    if (_monaco) {
      const updateMarkers = () => {
        const modelUri = editor.getModel()?.uri;
        if (!modelUri) {
          if (onMarkersChange && markerHashRef.current !== "__empty__") {
            markerHashRef.current = "__empty__";
            onMarkersChange([]);
          }
          return;
        }
        const markers = _monaco.editor
          .getModelMarkers({ resource: modelUri })
          .filter((marker) => {
            if (marker?.severity < _monaco.MarkerSeverity.Error) return false;
            if (isIgnoredDiagnosticCode(marker?.code)) return false;
            return true;
          })
          .slice(0, 120);
        if (onMarkersChange) {
          const hash = markers
            .map(
              (marker) =>
                `${marker.severity}|${String(marker.code || "")}|${marker.startLineNumber}|${marker.startColumn}|${marker.endLineNumber}|${marker.endColumn}|${marker.message || ""}`,
            )
            .join("::");
          if (hash === markerHashRef.current) return;
          markerHashRef.current = hash;
          if (markerTimerRef.current) {
            window.clearTimeout(markerTimerRef.current);
          }
          markerTimerRef.current = window.setTimeout(() => {
            markerTimerRef.current = null;
            onMarkersChange(markers);
          }, 220);
        }
      };

      markerListenerDisposableRef.current = _monaco.editor.onDidChangeMarkers(() => {
        updateMarkers();
      });

      // Initial check
      updateMarkers();
    }
  };

  useEffect(() => {
    const editorLineCount = editorRef.current?.getModel?.()?.getLineCount?.();
    if (Number.isFinite(editorLineCount) && editorLineCount > 0) {
      setLineCount(editorLineCount);
      return;
    }
    if (!code) {
      setLineCount(1);
      return;
    }
    let lines = 1;
    for (let i = 0; i < code.length; i += 1) {
      if (code.charCodeAt(i) === 10) lines += 1;
    }
    setLineCount(lines);
  }, [code, fileName]);

  useEffect(() => {
    requestAnimationFrame(() => forceTransparentEditorShell());
  }, [settings.theme, settings.primary_accent, forceTransparentEditorShell]);

  return (
    <div className="nx-code-editor-shell flex-1 flex flex-col min-h-0 w-full relative overflow-hidden bg-transparent" style={{ background: "transparent" }}>
      <div className="nx-code-editor-canvas flex-1 min-h-0 w-full relative overflow-hidden">
        <Editor
          height="100%"
          width="100%"
          path={modelPath}
          language={language}
          value={code}
          onChange={handleEditorChange}
          onMount={handleEditorDidMount}
          options={editorOptions}
          loading={
            <div className="flex items-center justify-center h-full w-full bg-transparent text-purple-500/50 font-mono text-sm">
              <span className="animate-pulse tracking-widest text-xs uppercase" style={{ color: "var(--primary)" }}>Editor wird geladen...</span>
            </div>
          }
        />
      </div>

      {/* Status Bar */}
      <div
        className="nx-code-editor-status h-6 flex items-center justify-between gap-3 px-3 shrink-0 select-none backdrop-blur-md border-t border-white/5 z-10"
        style={{ background: "rgba(0,0,0,0.3)" }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-[10px] text-gray-400 font-medium">
            {language.toUpperCase() || "TEXT"}
          </span>
          <span className="text-[10px] text-gray-500">UTF-8</span>
          {settings.sticky_scroll && (
             <span className="text-[10px] text-purple-500 font-bold opacity-60">STICKY</span>
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
