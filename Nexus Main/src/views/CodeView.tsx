import React, { useState, useRef, useCallback, useEffect, useMemo } from "react";
import {
  Loader,
} from "lucide-react";
import { NexusMarkdown } from "../components/NexusMarkdown";
import { useApp, CodeFile } from "../store/appStore";
import { useTheme } from "../store/themeStore";
import { hexToRgb } from "../lib/utils";
import { ensureMonacoWorkers } from "../lib/monacoWorkers";
import { shallow } from "zustand/shallow";
import { LANGS, getLang } from "./code/languageRegistry";
import { executeCode } from "./code/executionEngine";
import { CodeTabStrip } from "./code/CodeTabStrip";
import { CodeOutputPanel } from "./code/CodeOutputPanel";
import {
  CodeExplorerSidebar,
  CodeQuickOpenModal,
  CodeNewFileModal,
  EmptyCodeState,
} from "./code/CodeViewSections";

// ─────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────

export function CodeView() {
  const t = useTheme();
  const rgb = hexToRgb(t.accent);
  const {
    codes,
    folders,
    activeCodeId,
    openCodeIds,
    addCode,
    updateCode,
    delCode,
    setCode,
    openCode,
    closeCode,
    saveCode,
  } = useApp(
    (s) => ({
      codes: s.codes,
      folders: s.folders,
      activeCodeId: s.activeCodeId,
      openCodeIds: s.openCodeIds,
      addCode: s.addCode,
      updateCode: s.updateCode,
      delCode: s.delCode,
      setCode: s.setCode,
      openCode: s.openCode,
      closeCode: s.closeCode,
      saveCode: s.saveCode,
    }),
    shallow,
  );

  const [output, setOutput] = useState<string[]>([]);
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState<number | null>(null);
  const [outOpen, setOutOpen] = useState(true);
  const [outH, setOutH] = useState(220);
  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [quickOpenOpen, setQuickOpenOpen] = useState(false);
  const [quickOpenQuery, setQuickOpenQuery] = useState("");
  const [fileScope, setFileScope] = useState<"all" | "open">("all");
  const [folderFilter, setFolderFilter] = useState<string>("all");
  const [newOpen, setNewOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newLang, setNewLang] = useState("javascript");
  const [preview, setPreview] = useState<"editor" | "split" | "preview">(
    "editor",
  );
  const [copiedOut, setCopiedOut] = useState(false);
  const [editorFailed, setEditorFailed] = useState(false);
  const [editorError, setEditorError] = useState<string | null>(null);
  const [MonacoEditorComponent, setMonacoEditorComponent] = useState<any>(null);
  const [monacoLoading, setMonacoLoading] = useState(false);
  const [previewDocFrame, setPreviewDocFrame] = useState("");
  const [runHistory, setRunHistory] = useState<
    Array<{ fileId: string; fileName: string; at: string; ok: boolean; ms: number }>
  >([]);
  const monacoLoadTokenRef = useRef(0);
  const outRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ y: number; h: number } | null>(null);

  const openFiles = openCodeIds
    .map((id) => codes.find((c) => c.id === id))
    .filter(Boolean) as CodeFile[];
  const active = codes.find((c) => c.id === activeCodeId);
  const activeCodeKey = active?.id ?? null;
  const lang = active ? getLang(active.lang) : null;
  const hasPreview =
    active && ["html", "css", "markdown"].includes(active.lang);
  const folderScopedCodes = useMemo(
    () =>
      codes.filter((file) =>
        folderFilter === "all" ? true : (file.folderId ?? "__root__") === folderFilter,
      ),
    [codes, folderFilter],
  );
  const quickOpenFiles = useMemo(() => {
    const query = quickOpenQuery.trim().toLowerCase();
    const openSet = new Set(openCodeIds);
    return folderScopedCodes
      .filter((file) =>
        !query
          ? true
          : `${file.name} ${file.lang} ${file.folderId ?? "root"}`
              .toLowerCase()
              .includes(query),
      )
      .sort((a, b) => {
        const aOpen = openSet.has(a.id) ? 1 : 0;
        const bOpen = openSet.has(b.id) ? 1 : 0;
        if (aOpen !== bOpen) return bOpen - aOpen;
        return a.name.localeCompare(b.name);
      })
      .slice(0, 40);
  }, [folderScopedCodes, openCodeIds, quickOpenQuery]);
  const previewDoc = useMemo(() => {
    if (!active) return "";
    if (active.lang === "css") {
      return `<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;padding:0;background:#0b1020;color:#e5e7eb;font-family:system-ui,sans-serif}body{padding:20px}${active.content}</style></head><body><div class="card"><h1>CSS Preview</h1><p>Your styles are applied to this sandbox.</p></div></body></html>`;
    }
    if (active.lang === "html") {
      const hasHtmlTag = /<html[\s>]/i.test(active.content);
      if (hasHtmlTag) return active.content;
      return `<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;padding:0;background:#0b1020;color:#e5e7eb;font-family:system-ui,sans-serif}</style></head><body>${active.content}</body></html>`;
    }
    return "";
  }, [active]);

  useEffect(() => {
    if (preview !== "split" && preview !== "preview") {
      setPreviewDocFrame(previewDoc);
      return;
    }
    const timer = window.setTimeout(() => {
      setPreviewDocFrame(previewDoc);
    }, 120);
    return () => window.clearTimeout(timer);
  }, [preview, previewDoc]);

  useEffect(() => {
    if (!hasPreview && preview !== "editor") {
      setPreview("editor");
    }
  }, [hasPreview, preview]);

  useEffect(() => {
    if (outRef.current) outRef.current.scrollTop = outRef.current.scrollHeight;
  }, [output]);

  useEffect(() => {
    if (editorFailed || !active) return;
    if (preview === "preview") return;
    if (MonacoEditorComponent || monacoLoading) return;

    let cancelled = false;
    const loadToken = ++monacoLoadTokenRef.current;
    setMonacoLoading(true);
    const timeout = window.setTimeout(() => {
      if (cancelled || monacoLoadTokenRef.current !== loadToken) return;
      setEditorFailed(true);
      setEditorError("Monaco load timed out");
      setMonacoLoading(false);
    }, 10_000);
    void (async () => {
      try {
        ensureMonacoWorkers();
        const [editorModule, monacoModule] = await Promise.all([
          import("@monaco-editor/react"),
          import("monaco-editor"),
        ]);
        const monacoNs = (monacoModule as any).default ?? monacoModule;
        editorModule.loader.config({ monaco: monacoNs });
        if (!cancelled && monacoLoadTokenRef.current === loadToken) {
          setMonacoEditorComponent(() => editorModule.default);
          setEditorFailed(false);
          setEditorError(null);
        }
      } catch (error) {
        if (!cancelled && monacoLoadTokenRef.current === loadToken) {
          setEditorFailed(true);
          setEditorError(error instanceof Error ? error.message : "Monaco import failed");
        }
      } finally {
        window.clearTimeout(timeout);
        if (!cancelled && monacoLoadTokenRef.current === loadToken) {
          setMonacoLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [MonacoEditorComponent, activeCodeKey, editorFailed, preview]);

  const run = useCallback(async () => {
    if (!active) return;
    setRunning(true);
    setOutOpen(true);
    setOutput(["▶  Executing…", ""]);
    setElapsed(null);
    await new Promise((r) => setTimeout(r, 40));
    const t0 = performance.now();
    const result = await executeCode(active);
    const elapsedMs = performance.now() - t0;
    setElapsed(elapsedMs);
    setOutput(result.split("\n"));
    setRunHistory((history) => [
      {
        fileId: active.id,
        fileName: active.name,
        at: new Date().toISOString(),
        ok: !result.includes("❌"),
        ms: elapsedMs,
      },
      ...history,
    ].slice(0, 10));
    setRunning(false);
  }, [active]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        run();
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "p") {
        e.preventDefault();
        setQuickOpenOpen(true);
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "f") {
        e.preventDefault();
        setSearchOpen((state) => !state);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "s" && active) {
        e.preventDefault();
        saveCode(active.id);
      }
      if (e.key === "Escape") {
        setQuickOpenOpen(false);
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [run, saveCode, active]);

  const startDrag = (e: React.MouseEvent) => {
    e.preventDefault();
    dragRef.current = { y: e.clientY, h: outH };
    const mv = (e: MouseEvent) => {
      if (dragRef.current)
        setOutH(
          Math.max(
            60,
            Math.min(600, dragRef.current.h + dragRef.current.y - e.clientY),
          ),
        );
    };
    const up = () => {
      dragRef.current = null;
      window.removeEventListener("mousemove", mv);
      window.removeEventListener("mouseup", up);
    };
    window.addEventListener("mousemove", mv);
    window.addEventListener("mouseup", up);
  };

  const createFile = () => {
    if (!newName.trim()) return;
    const l = getLang(newLang);
    const fname = newName.includes(".") ? newName : newName + "." + l.ext;
    const f = addCode(fname, newLang);
    updateCode(f.id, { content: l.hello });
    setNewOpen(false);
    setNewName("");
  };

  const handleCopyOut = () => {
    navigator.clipboard.writeText(output.join("\n"));
    setCopiedOut(true);
    setTimeout(() => setCopiedOut(false), 1500);
  };

  const handleCopyCode = useCallback(() => {
    if (!active) return;
    navigator.clipboard.writeText(active.content);
  }, [active]);

  const handleDownloadCode = useCallback(() => {
    if (!active) return;
    const blob = new Blob([active.content], { type: "text/plain" });
    const anchor = document.createElement("a");
    anchor.href = URL.createObjectURL(blob);
    anchor.download = active.name;
    anchor.click();
  }, [active]);

  const insertSnippet = useCallback(
    (kind: "log" | "fetch" | "todo") => {
      if (!active) return;
      const map = {
        log: '\nconsole.log("debug:", { value: true })\n',
        fetch:
          '\nconst res = await fetch("https://example.com/api")\nconst data = await res.json()\nconsole.log(data)\n',
        todo: "\n// TODO: implement\n// 1. parse input\n// 2. validate\n// 3. return output\n",
      };
      updateCode(active.id, { content: `${active.content}${map[kind]}`, dirty: true });
    },
    [active, updateCode],
  );

  const openCodeFromQuickOpen = useCallback(
    (id: string) => {
      openCode(id);
      setCode(id);
      setQuickOpenOpen(false);
      setQuickOpenQuery("");
    },
    [openCode, setCode],
  );

  return (
    <div style={{ display: "flex", height: "100%", overflow: "hidden" }}>
      <CodeExplorerSidebar
        codes={folderScopedCodes}
        activeCodeId={activeCodeId}
        openCodeIds={openCodeIds}
        search={search}
        searchOpen={searchOpen}
        rgb={rgb}
        fileScope={fileScope}
        folderFilter={folderFilter}
        folders={folders}
        setSearch={setSearch}
        setSearchOpen={setSearchOpen}
        setFileScope={setFileScope}
        setFolderFilter={setFolderFilter}
        setNewOpen={setNewOpen}
        openQuickOpen={() => setQuickOpenOpen(true)}
        openCode={openCode}
        setCode={setCode}
        delCode={delCode}
      />

      {/* ── Editor area ─────────────────────────────────── */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          minWidth: 0,
        }}
      >
        <CodeTabStrip
          openFiles={openFiles}
          activeCodeId={activeCodeId}
          active={active}
          hasPreview={Boolean(hasPreview)}
          preview={preview}
          setPreview={setPreview}
          setCode={setCode}
          closeCode={closeCode}
          onCopyCode={handleCopyCode}
          onDownloadCode={handleDownloadCode}
          onSaveCode={() => active && saveCode(active.id)}
          run={run}
          running={running}
          accent={t.accent}
        />
        {active ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "7px 10px",
              borderBottom: "1px solid rgba(255,255,255,0.06)",
              background: "rgba(0,0,0,0.08)",
              flexWrap: "wrap",
            }}
          >
            <button
              onClick={() => insertSnippet("log")}
              style={{
                padding: "5px 9px",
                borderRadius: 8,
                border: `1px solid rgba(${rgb},0.3)`,
                background: `rgba(${rgb},0.14)`,
                color: t.accent,
                fontSize: 10,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              + log()
            </button>
            <button
              onClick={() => insertSnippet("fetch")}
              style={{
                padding: "5px 9px",
                borderRadius: 8,
                border: "1px solid rgba(255,255,255,0.14)",
                background: "rgba(255,255,255,0.06)",
                color: "inherit",
                fontSize: 10,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              + fetch()
            </button>
            <button
              onClick={() => insertSnippet("todo")}
              style={{
                padding: "5px 9px",
                borderRadius: 8,
                border: "1px solid rgba(255,255,255,0.14)",
                background: "rgba(255,255,255,0.06)",
                color: "inherit",
                fontSize: 10,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              + TODO block
            </button>
            <button
              onClick={() => setQuickOpenOpen(true)}
              style={{
                padding: "5px 9px",
                borderRadius: 8,
                border: "1px solid rgba(255,255,255,0.14)",
                background: "rgba(255,255,255,0.06)",
                color: "inherit",
                fontSize: 10,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Quick Open
            </button>
            <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
              <span style={{ fontSize: 10, opacity: 0.55 }}>
                In-app scratch editor. Für große Projekte: Nexus Code.
              </span>
              {runHistory.slice(0, 3).map((runEntry, index) => (
                <button
                  key={`${runEntry.at}-${index}`}
                  onClick={() => openCodeFromQuickOpen(runEntry.fileId)}
                  style={{
                    fontSize: 10,
                    padding: "3px 7px",
                    borderRadius: 999,
                    background: runEntry.ok ? "rgba(48,209,88,0.14)" : "rgba(255,69,58,0.14)",
                    color: runEntry.ok ? "#30D158" : "#FF453A",
                    border: `1px solid ${runEntry.ok ? "rgba(48,209,88,0.3)" : "rgba(255,69,58,0.3)"}`,
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                  }}
                  title={`Last run ${new Date(runEntry.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`}
                >
                  {runEntry.fileName.split(".").pop()} {Math.round(runEntry.ms)}ms
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {/* Content */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            minHeight: 0,
          }}
        >
          {!active ? (
            <EmptyCodeState
              accent={t.accent}
              rgb={rgb}
              setNewOpen={setNewOpen}
              openQuickOpen={() => setQuickOpenOpen(true)}
            />
          ) : (
            <>
              <div
                style={{
                  flex: 1,
                  display: "flex",
                  overflow: "hidden",
                  minHeight: 0,
                }}
              >
                {/* Editor */}
                {(preview === "editor" || preview === "split") && (
                  <div
                    style={{
                      flex: 1,
                      overflow: "hidden",
                      minWidth: 0,
                      position: "relative",
                    }}
                  >
                    {editorFailed ? (
                      <div
                        style={{
                          width: "100%",
                          height: "100%",
                          display: "flex",
                          flexDirection: "column",
                          minHeight: 0,
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: 12,
                            padding: "8px 12px",
                            borderBottom: "1px solid rgba(255,255,255,0.08)",
                            background: "rgba(255,69,58,0.08)",
                          }}
                        >
                          <span style={{ fontSize: 11, opacity: 0.82 }}>
                            Monaco konnte nicht geladen werden. Fallback-Editor aktiv.
                            {editorError ? ` (${editorError})` : ""}
                          </span>
                          <button
                            onClick={() => {
                              setEditorFailed(false);
                              setEditorError(null);
                              setMonacoEditorComponent(null);
                            }}
                            style={{
                              border: "none",
                              borderRadius: 8,
                              padding: "6px 10px",
                              cursor: "pointer",
                              fontSize: 11,
                              fontWeight: 700,
                              color: "#fff",
                              background: t.accent,
                            }}
                          >
                            Monaco neu laden
                          </button>
                        </div>
                        <textarea
                          value={active.content}
                          onChange={(e) =>
                            updateCode(active.id, {
                              content: e.target.value,
                              dirty: true,
                            })
                          }
                          style={{
                            width: "100%",
                            flex: 1,
                            minHeight: 0,
                            padding: "14px 16px",
                            background: "transparent",
                            border: "none",
                            outline: "none",
                            resize: "none",
                            fontSize: t.editor.fontSize || 13,
                            lineHeight: 1.65,
                            fontFamily: "'Fira Code','JetBrains Mono',monospace",
                            color: "inherit",
                            tabSize: t.editor.tabSize || 2,
                          }}
                          onKeyDown={(e) => {
                            if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
                              e.preventDefault();
                              run();
                            }
                            if (e.key === "Tab") {
                              e.preventDefault();
                              const s = e.currentTarget;
                              const i = s.selectionStart;
                              const spaces = "  ";
                              s.value =
                                s.value.slice(0, i) +
                                spaces +
                                s.value.slice(s.selectionEnd);
                              s.selectionStart = s.selectionEnd =
                                i + spaces.length;
                              updateCode(active.id, {
                                content: s.value,
                                dirty: true,
                              });
                            }
                          }}
                          spellCheck={false}
                        />
                      </div>
                    ) : MonacoEditorComponent ? (
                      <MonacoEditorComponent
                        height="100%"
                        language={active.lang}
                        value={active.content}
                        onChange={(v: string | undefined) =>
                          updateCode(active.id, {
                            content: v ?? "",
                            dirty: true,
                          })
                        }
                        theme={t.mode === "light" ? "vs" : "vs-dark"}
                        loading={
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              height: "100%",
                              flexDirection: "column",
                              gap: 12,
                              opacity: 0.5,
                            }}
                          >
                            <Loader
                              size={20}
                              className="nx-spin"
                              style={{ color: t.accent }}
                            />
                            <span style={{ fontSize: 12 }}>
                              Editor wird geladen…
                            </span>
                          </div>
                        }
                        options={{
                          fontSize: t.editor.fontSize || 13,
                          fontFamily:
                            t.editor.fontFamily ||
                            "'Fira Code','JetBrains Mono',monospace",
                          fontLigatures: true,
                          minimap: { enabled: t.editor.minimap },
                          lineNumbers: t.editor.lineNumbers ? "on" : "off",
                          wordWrap: t.editor.wordWrap ? "on" : "off",
                          scrollBeyondLastLine: false,
                          renderLineHighlight: "gutter",
                          padding: { top: 14, bottom: 14 },
                          smoothScrolling: true,
                          cursorBlinking: t.editor.cursorAnimation
                            ? "smooth"
                            : "blink",
                          cursorSmoothCaretAnimation: "on" as any,
                          bracketPairColorization: { enabled: true },
                          guides: { bracketPairs: "active" as any },
                          quickSuggestions: true,
                          formatOnPaste: true,
                          tabSize: t.editor.tabSize || 2,
                          scrollbar: {
                            verticalScrollbarSize: 6,
                            horizontalScrollbarSize: 6,
                          },
                          overviewRulerLanes: 0,
                          hideCursorInOverviewRuler: true,
                          renderFinalNewline: "on" as any,
                        }}
                        onMount={(editor: any, monacoInstance: any) => {
                          editor.addCommand(
                            monacoInstance.KeyMod.CtrlCmd |
                              monacoInstance.KeyCode.Enter,
                            () => run(),
                          );
                          editor.addCommand(
                            monacoInstance.KeyMod.CtrlCmd |
                              monacoInstance.KeyCode.KeyS,
                            () => active && saveCode(active.id),
                          );
                          setTimeout(() => editor.focus(), 50);
                        }}
                        onValidate={() => {}}
                      />
                    ) : (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          height: "100%",
                          flexDirection: "column",
                          gap: 12,
                          opacity: 0.5,
                        }}
                      >
                        <Loader
                          size={20}
                          className="nx-spin"
                          style={{ color: t.accent }}
                        />
                        <span style={{ fontSize: 12 }}>
                          {monacoLoading
                            ? "Editor wird geladen…"
                            : "Editor wird vorbereitet…"}
                        </span>
                      </div>
                    )}
                  </div>
                )}
                {/* Preview */}
                {(preview === "split" || preview === "preview") && (
                  <div
                    style={{
                      flex: 1,
                      display: "flex",
                      flexDirection: "column",
                      borderLeft: "1px solid rgba(255,255,255,0.07)",
                      overflow: "hidden",
                      minWidth: 0,
                    }}
                  >
                    <div
                      style={{
                        padding: "6px 14px",
                        background: "rgba(0,0,0,0.14)",
                        borderBottom: "1px solid rgba(255,255,255,0.06)",
                        fontSize: 10,
                        fontWeight: 700,
                        opacity: 0.4,
                        textTransform: "uppercase",
                        letterSpacing: 0.6,
                        flexShrink: 0,
                      }}
                    >
                      Preview — {lang?.label}
                    </div>
                    <div style={{ flex: 1, overflow: "hidden", minHeight: 0 }}>
                      {active.lang === "markdown" ? (
                        <div
                          style={{
                            height: "100%",
                            overflowY: "auto",
                            padding: "20px 24px",
                            color: "inherit",
                          }}
                        >
                          <NexusMarkdown content={active.content} />
                        </div>
                      ) : (
                        <iframe
                          srcDoc={previewDocFrame}
                          style={{
                            width: "100%",
                            height: "100%",
                            border: "none",
                            background: t.mode === "dark" ? "#0b1020" : "#ffffff",
                            display: "block",
                          }}
                          sandbox="allow-scripts"
                          title="Preview"
                        />
                      )}
                    </div>
                  </div>
                )}
              </div>

              <CodeOutputPanel
                outOpen={outOpen}
                setOutOpen={setOutOpen}
                outH={outH}
                output={output}
                outRef={outRef}
                setOutput={setOutput}
                handleCopyOut={handleCopyOut}
                copiedOut={copiedOut}
                elapsed={elapsed}
                runHistory={runHistory}
                run={run}
                running={running}
                accent={t.accent}
                startDrag={startDrag}
                rgb={rgb}
              />
            </>
          )}
        </div>
      </div>

      <CodeNewFileModal
        open={newOpen}
        fileName={newName}
        fileLang={newLang}
        langs={LANGS}
        accent={t.accent}
        setOpen={setNewOpen}
        setFileName={setNewName}
        setFileLang={setNewLang}
        createFile={createFile}
      />
      <CodeQuickOpenModal
        open={quickOpenOpen}
        query={quickOpenQuery}
        files={quickOpenFiles}
        activeCodeId={activeCodeId}
        setOpen={setQuickOpenOpen}
        setQuery={setQuickOpenQuery}
        openFile={openCodeFromQuickOpen}
      />
    </div>
  );
}
