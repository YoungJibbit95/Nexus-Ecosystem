import React, { useState, useEffect, useRef, useCallback } from "react";
import Editor, { useMonaco } from "@monaco-editor/react";

function getLanguage(fileName) {
  if (!fileName) return "plaintext";
  const ext = fileName.split(".").pop()?.toLowerCase() || "";
  const map = {
    js: "javascript",
    jsx: "javascript",
    ts: "typescript",
    tsx: "typescript",
    py: "python",
    html: "html",
    css: "css",
    scss: "scss",
    less: "less",
    json: "json",
    md: "markdown",
    rs: "rust",
    go: "go",
    cpp: "cpp",
    c: "cpp",
    java: "java",
    cs: "csharp",
    php: "php",
    sql: "sql",
    yaml: "yaml",
    yml: "yaml",
    xml: "xml",
    sh: "shell",
    bash: "shell",
    ps1: "powershell",
    lua: "lua",
    r: "r",
    sv: "systemverilog",
    v: "verilog",
    rb: "ruby",
    pl: "perl",
    swift: "swift",
    kotlin: "kotlin",
    dart: "dart",
    dockerfile: "dockerfile",
    makefile: "makefile",
  };
  return map[ext] || "plaintext";
}

const THEMES = {
  nexus_vibrant: { text: "#e5e7eb", accent: "#8000ff", selection: "rgba(128,0,255,0.2)", comment: "#6a9955", keyword: "#c678dd", string: "#98c379", number: "#d19a66", function: "#61afef" },
  neon_pink: { text: "#ffffff", accent: "#ff00ff", selection: "#4b1e4b", comment: "#ff00ff80", keyword: "#00ffff", string: "#ffff00", number: "#ff00ff", function: "#ff00ff" },
  ocean_light: { text: "#eef2ff", accent: "#0ea5e9", selection: "#1e3a8a", comment: "#94a3b8", keyword: "#0ea5e9", string: "#10b981", number: "#f59e0b", function: "#6366f1" },
  midnight_mystery: { text: "#f3f4f6", accent: "#a855f7", selection: "#3b0764", comment: "#a78bfa", keyword: "#d8b4fe", string: "#fbcfe8", number: "#e9d5ff", function: "#a78bfa" },
  dracula_classic: { text: "#f8f8f2", accent: "#bd93f9", selection: "#44475a", comment: "#6272a4", keyword: "#ff79c6", string: "#f1fa8c", number: "#bd93f9", function: "#50fa7b" },
  void_pitch: { text: "#ffffff", accent: "#ffffff", selection: "#333333", comment: "#888888", keyword: "#ffffff", string: "#aaaaaa", number: "#eeeeee", function: "#dddddd" },
};

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
  isMobile = false,
}) {
  const monaco = useMonaco();
  const language = getLanguage(fileName);
  const [cursorInfo, setCursorInfo] = useState({ line: 1, col: 1 });
  const editorRef = useRef(null);

  const forceTransparentEditorShell = useCallback(() => {
    const editor = editorRef.current;
    const domNode = editor?.getDomNode?.();
    if (!domNode) return;
    const selectors = [
      ".monaco-editor",
      ".monaco-editor .margin",
      ".monaco-editor .monaco-editor-background",
      ".monaco-editor-background",
      ".monaco-editor .inputarea.ime-input",
      ".monaco-editor .scroll-decoration",
      ".monaco-editor .minimap",
      ".monaco-editor .overflow-guard",
    ];
    selectors.forEach((selector) => {
      domNode.querySelectorAll(selector).forEach((node) => {
        const el = /** @type {HTMLElement} */ (node);
        el.style.backgroundColor = "transparent";
        el.style.backgroundImage = "none";
      });
    });
  }, []);

  useEffect(() => {
    if (monaco) {
      try {
        const activeTheme = THEMES[settings.theme] || THEMES.nexus_vibrant;
        const accentColor = String(settings.primary_accent || activeTheme.accent || "#8000ff").replace('#', '');
        // Monaco theme names must be strictly alphanumeric (plus - and _)
        const safeThemeBase = String(settings.theme || 'dark').replace(/[^a-z0-9]/gi, '');
        const themeName = `nexus-${safeThemeBase}-${accentColor}`;

        monaco.editor.defineTheme(themeName, {
          base: "vs-dark",
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
            "editor.foreground": activeTheme.text || "#e5e7eb",
            "editor.selectionBackground": activeTheme.selection || "#264f78",
            "editorLineNumber.foreground": "#4b5563",
            "editor.lineHighlightBackground": "#ffffff0a",
            "editorCursor.foreground": activeTheme.accent || "#8000ff",
            "editorWidget.background": "#0a0a0f",
          },
        });
        monaco.editor.setTheme(themeName);
        requestAnimationFrame(() => {
          forceTransparentEditorShell();
          editorRef.current?.layout?.();
        });
      } catch (err) {
        console.error("Monaco Theme Definition Error:", err);
        // Fallback to a built-in theme if definition fails
        monaco.editor.setTheme("vs-dark");
        requestAnimationFrame(() => forceTransparentEditorShell());
      }
    }
  }, [monaco, settings.primary_accent, settings.theme, forceTransparentEditorShell]);

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
          noSemanticValidation: false,
          noSyntaxValidation: false,
          // 2580: Cannot find name 'require'
          // 2304: Cannot find name 'module', 'process', etc.
          // 2307: Cannot find module (import/require)
          diagnosticCodesToIgnore: [2307, 2792, 1208, 2339, 2580, 2304] 
        });
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

  const handleEditorChange = (value) => {
    onChange(value || "");
  };

  const handleEditorDidMount = (editor, _monaco) => {
    editorRef.current = editor;

    // Fix for "versetzt" (offset) issue: refresh layout after a short delay
    // to ensure fonts are fully loaded.
    setTimeout(() => {
      editor.layout();
      forceTransparentEditorShell();
    }, 500);

    editor.onDidChangeCursorPosition((e) => {
      setCursorInfo({
        line: e.position.lineNumber,
        col: e.position.column,
      });
    });

    // Listen for markers (errors, warnings)
    if (_monaco) {
      const updateMarkers = () => {
        const markers = _monaco.editor.getModelMarkers({ resource: editor.getModel()?.uri });
        if (onMarkersChange) {
          onMarkersChange(markers);
        }
      };

      const disposable = _monaco.editor.onDidChangeMarkers(() => {
        updateMarkers();
      });

      // Initial check
      updateMarkers();

      return () => disposable.dispose();
    }
  };

  useEffect(() => {
    requestAnimationFrame(() => forceTransparentEditorShell());
  }, [settings.theme, settings.primary_accent, forceTransparentEditorShell]);

  const responsiveFontSize = isMobile ? Math.max(12, fontSize - 1) : fontSize;

  return (
    <div className="flex-1 flex flex-col min-h-0 w-full relative overflow-hidden bg-transparent" style={{ background: "transparent" }}>
      <div className="flex-1 min-h-0 w-full relative overflow-hidden">
        <Editor
          height="100%"
          width="100%"
          path={fileName}
          language={language}
          value={code}
          onChange={handleEditorChange}
          onMount={handleEditorDidMount}
          options={{
            fontSize: responsiveFontSize,
            fontFamily: settings.font_family
              ? `'${settings.font_family}', 'JetBrains Mono', monospace`
              : "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
            fontWeight: settings.font_weight || "400",
            letterSpacing: settings.letter_spacing || 0,
            lineHeight: settings.line_height || 1.6,
            lineNumbers: showLineNumbers ? "on" : "off",
            tabSize: settings.tab_size || 4,
            wordWrap: wordWrap ? "on" : "off",
            minimap: { enabled: minimap && !isMobile },
            cursorBlinking: settings.cursor_blinking || "solid", 
            cursorSmoothCaretAnimation: settings.smooth_caret !== false ? "on" : "off",
            cursorStyle: settings.cursor_style || "line",
            renderWhitespace: settings.render_whitespace || "none",
            formatOnPaste: settings.format_on_paste !== false,
            stickyScroll: { enabled: settings.sticky_scroll || false },
            smoothScrolling: true,
            padding: { top: isMobile ? 12 : 20, bottom: isMobile ? 12 : 20 },
            scrollBeyondLastLine: false,
            renderLineHighlight: settings.line_highlight || "all",
            bracketPairColorization: { enabled: settings.bracket_colorization !== false },
            guides: { bracketPairs: true, indentation: true },
            fontLigatures: settings.font_ligatures !== false,
            formatOnType: true,
            fixedOverflowWidgets: true,
            scrollbar: {
              verticalScrollbarSize: isMobile ? 4 : 8,
              horizontalScrollbarSize: isMobile ? 4 : 8,
              useShadows: false,
              verticalHasArrows: false,
              horizontalHasArrows: false,
            },
          }}
          loading={
            <div className="flex items-center justify-center h-full w-full bg-transparent text-purple-500/50 font-mono text-sm">
              <span className="animate-pulse tracking-widest text-xs uppercase" style={{ color: "var(--primary)" }}>Initializing Engine...</span>
            </div>
          }
        />
      </div>

      {/* Status Bar */}
      <div
        className={`${isMobile ? "h-5" : "h-6"} flex items-center justify-between px-3 shrink-0 select-none backdrop-blur-md border-t border-white/5 z-10`}
        style={{ background: "rgba(0,0,0,0.3)" }}
      >
        <div className="flex items-center gap-4">
          <span className="text-[9px] md:text-[10px] text-gray-400 font-medium">
            {language.toUpperCase() || "TEXT"}
          </span>
          {!isMobile && <span className="text-[10px] text-gray-500">UTF-8</span>}
          {settings.sticky_scroll && (
             <span className="text-[10px] text-purple-500 font-bold opacity-60">STICKY</span>
          )}
        </div>
        <div className="flex items-center gap-4">
          <span className="text-[9px] md:text-[10px] text-gray-400">
            Ln {cursorInfo.line}, Col {cursorInfo.col}
          </span>
          {!isMobile && (
            <span className="text-[10px] text-gray-500">
              {(code || "").split("\n").length} Lines
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
