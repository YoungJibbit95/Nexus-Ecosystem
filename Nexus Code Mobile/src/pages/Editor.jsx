import React, { useState, useEffect, useCallback, useRef } from "react";
import { AlertTriangle, RotateCcw, AlertCircle } from "lucide-react";
import { nativeFS, SEP } from "../lib/nativeFS";
import TitleBar from "../components/editor/TitleBar";
import Sidebar, { MobileBottomNav } from "../components/editor/Sidebar";
import FileExplorer from "../components/editor/FileExplorer";
import TabBar from "../components/editor/TabBar";
import CodeEditor from "../components/editor/CodeEditor";
import Terminal from "../components/editor/Terminal";
import WelcomeScreen from "../components/editor/WelcomeScreen";
import SettingsPanel from "../components/editor/SettingsPanel";
import SearchPanel from "../components/editor/SearchPanel";
import GitPanel from "../components/editor/GitPanel";
import DebugPanel from "../components/editor/DebugPanel";
import ExtensionsPanel from "../components/editor/ExtensionsPanel";
import CommandPalette from "../components/editor/CommandPalette";
import SpotlightSearch from "../components/editor/SpotlightSearch";
import ProblemsPanel from "../components/editor/ProblemsPanel";
import { motion, AnimatePresence } from "framer-motion";
import { useMobile } from "../hook/useMobile";

import {
  BACKGROUNDS,
  DEFAULT_SETTINGS,
  DEFAULT_FILES,
  ErrorBoundary,
  SETTINGS_STORAGE_KEY,
  THEMES,
  generateId,
  loadFilesFromStorage,
  loadSettingsFromStorage,
  saveFilesToStorage,
  saveSettingsToStorage,
} from './editor/editorShared.jsx';

export default function Editor() {
  // @ts-ignore
  const isElectron = nativeFS.isAvailable;
  const isMobile = useMobile();
  const [activePanel, setActivePanel] = useState("explorer");
  const [showSettings, setShowSettings] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [spotlightOpen, setSpotlightOpen] = useState(false);
  const lastShiftTime = useRef(0);
  const [terminalOpen, setTerminalOpen] = useState(false);
  const [bottomTab, setBottomTab] = useState("terminal"); // "terminal" | "problems"
  const [problems, setProblems] = useState([]);
  const [openTabs, setOpenTabs] = useState([]);
  const [activeTabId, setActiveTabId] = useState(null);
  const autoSaveRef = useRef(null);

  const [files, setFiles] = useState(() => {
    const stored = loadFilesFromStorage();
    return stored || DEFAULT_FILES;
  });

  const [settings, setSettings] = useState(loadSettingsFromStorage);
  const [workspacePath, setWorkspacePath] = useState(null);

  // Persist files whenever they change (only if not in a workspace for now, or unified)
  useEffect(() => {
    if (!workspacePath) {
      saveFilesToStorage(files);
    }
  }, [files, workspacePath]);

  const handleToggleZenMode = useCallback(() => {
    setSettings((prev) => ({ ...prev, zen_mode: !prev.zen_mode }));
  }, []);

  const handleToggleSidebarVisibility = useCallback(() => {
    setSettings((prev) => ({
      ...prev,
      sidebar_visible: !prev.sidebar_visible,
    }));
  }, []);

  const handleToggleSidebar = useCallback(() => {
    setActivePanel((prev) => (prev ? null : "explorer"));
  }, []);

  const handleOpenFolder = useCallback(async () => {
    if (!isElectron) return;
    try {
      const path = await nativeFS.openFolder();
      if (!path) return;

      setWorkspacePath(path);
      setOpenTabs([]);
      setActiveTabId(null);

      const entries = await nativeFS.readDir(path);
      if (Array.isArray(entries)) {
        const rootFiles = entries.map((entry) => {
          const id = "fs_" + entry.path;
          const name = entry.name || "unnamed";
          return {
            id,
            name,
            type: entry.isDirectory ? "folder" : "file",
            parentId: null,
            isOpen: false,
            fsPath: entry.path,
            language: entry.isDirectory ? null : name.split(".").pop() || "text",
          };
        });
        setFiles(rootFiles);
        setActivePanel("explorer");
      }
    } catch (err) {
      console.error("Open folder failed", err);
    }
  }, [isElectron]);

  const handleToggleFolder = useCallback(
    async (id) => {
      const folder = files.find((f) => f.id === id);
      if (!folder) return;

      // Lazy loading for disk folders
      if (!folder.isOpen && folder.fsPath && isElectron) {
        const hasLoadedChildren = files.some((f) => f.parentId === id);
        if (!hasLoadedChildren) {
          try {
            const entries = await nativeFS.readDir(folder.fsPath);
            if (Array.isArray(entries)) {
              const children = entries
                .map((entry) => {
                  const childId = "fs_" + entry.path;
                  const name = entry.name || "unnamed";
                  return {
                    id: childId,
                    name,
                    type: entry.isDirectory ? "folder" : "file",
                    parentId: id,
                    isOpen: false,
                    fsPath: entry.path,
                    language: entry.isDirectory
                      ? null
                      : name.split(".").pop() || "text",
                  };
                })
                .filter((child) => !files.some((f) => f.id === child.id));

              if (children.length > 0) {
                setFiles((prev) => [...prev, ...children]);
              }
            }
          } catch (err) {
            console.error("Failed to lazy load folder", err);
          }
        }
      }

      setFiles((prev) =>
        prev.map((f) => (f.id === id ? { ...f, isOpen: !f.isOpen } : f)),
      );
    },
    [files, isElectron],
  );
  useEffect(() => {
    saveSettingsToStorage(settings);

    const root = document.documentElement;
    const theme = THEMES[settings.theme] || THEMES.nexus_vibrant;
    const accent = settings.primary_accent || theme.accent;

    // Core Layout (Background from Theme or Override)
    const bgOverride = BACKGROUNDS && BACKGROUNDS[settings.background];
    const bgType = bgOverride ? bgOverride.type : theme.bg_type || "solid";
    let bgValue = bgOverride ? bgOverride.value : theme.bg_value;

    // Special logic for theme-based accent gradient if requested/default
    if (!settings.background && theme.accent && theme.accent2) {
      bgValue = `linear-gradient(135deg, color-mix(in srgb, ${theme.accent} 20%, #000) 0%, color-mix(in srgb, ${theme.accent2} 20%, #000) 100%)`;
    }

    const surface = bgOverride ? bgOverride.surface : theme.surface;
    const border = bgOverride ? bgOverride.border : theme.border;

    // Apply to CSS variables
    root.style.setProperty("--nexus-bg-type", bgType);
    root.style.setProperty("--nexus-bg-value", bgValue);
    root.style.setProperty("--nexus-surface", surface || "#060614");
    root.style.setProperty("--nexus-border", border || "rgba(255,255,255,0.1)");

    // Theme (Colors & Syntax)
    root.style.setProperty("--nexus-text", theme.text || "#e5e7eb");
    root.style.setProperty("--nexus-muted", theme.muted || "#4b5563");

    // Accents & Glows
    root.style.setProperty("--primary", accent);
    root.style.setProperty("--nexus-purple", accent);
    root.style.setProperty(
      "--nexus-accent-glow",
      theme.glow || "rgba(128,0,255,0.4)",
    );

    // Expanded Syntax & UI colors
    root.style.setProperty(
      "--nexus-selection",
      theme.selection || "rgba(255,255,255,0.1)",
    );
    root.style.setProperty("--nexus-comment", theme.comment || "#6a9955");
    root.style.setProperty("--nexus-keyword", theme.keyword || "#569cd6");
    root.style.setProperty("--nexus-string", theme.string || "#ce9178");
    root.style.setProperty("--nexus-number", theme.number || "#b5cea8");
    root.style.setProperty("--nexus-function", theme.function || "#61afef");
    root.style.setProperty("--nexus-variable", theme.variable || "#e06c75");

    // Add Scrollbar colors
    root.style.setProperty("--nexus-scrollbar-thumb", accent + "33");
    root.style.setProperty("--nexus-scrollbar-hover", accent + "66");

    // Topology
    root.style.setProperty(
      "--nexus-font-weight",
      settings.font_weight || "400",
    );

    // Global Style Injection (Most reliable for body/html)
    let styleTag = document.getElementById("nexus-theme-styles");
    if (!styleTag) {
      styleTag = document.createElement("style");
      styleTag.id = "nexus-theme-styles";
      document.head.appendChild(styleTag);
    }

    const bgStyle =
      bgType === "gradient"
        ? `background: ${bgValue} fixed no-repeat !important; background-size: cover !important;`
        : `background: ${bgValue} !important;`;

    styleTag.innerHTML = `
      :root {
        --nexus-bg-value: ${bgValue};
        --nexus-bg-type: ${bgType};
      }
      html, body {
        margin: 0;
        padding: 0;
        min-height: 100vh;
        width: 100%;
        ${bgStyle}
        color: var(--nexus-text);
        font-family: var(--nexus-font-family, 'JetBrains Mono'), monospace;
        font-weight: var(--nexus-font-weight, 400);
      }
      #root {
        background: transparent !important;
        min-height: 100vh;
      }
      ::-webkit-scrollbar { width: 10px; height: 10px; }
      ::-webkit-scrollbar-track { background: transparent; }
      ::-webkit-scrollbar-thumb {
        background: var(--nexus-scrollbar-thumb);
        border-radius: 5px;
        border: 2px solid transparent;
        background-clip: padding-box;
      }
      ::-webkit-scrollbar-thumb:hover { background: var(--nexus-scrollbar-hover); background-clip: padding-box; }
      ::selection { background: var(--nexus-selection); color: white; }
    `;
  }, [settings]);

  const openFileTab = useCallback((file) => {
    setOpenTabs((prev) => {
      if (prev.find((t) => t.id === file.id)) return prev;
      return [...prev, { id: file.id, name: file.name, modified: false }];
    });
    setActiveTabId(file.id);
  }, []);

  const handleTabClose = useCallback(
    (tabId) => {
      setOpenTabs((prev) => {
        const newTabs = prev.filter((t) => t.id !== tabId);
        if (activeTabId === tabId) {
          setActiveTabId(
            newTabs.length > 0 ? newTabs[newTabs.length - 1].id : null,
          );
        }
        return newTabs;
      });
    },
    [activeTabId, setActiveTabId],
  );

  // Global keyboard shortcuts
  useEffect(() => {
    const handler = (e) => {
      // Ctrl+S — save active file
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        if (activeTabId) {
          setOpenTabs((prev) =>
            prev.map((t) =>
              t.id === activeTabId ? { ...t, modified: false } : t,
            ),
          );
        }
      }
      // Ctrl+B — toggle sidebar
      if ((e.ctrlKey || e.metaKey) && e.key === "b") {
        e.preventDefault();
        setActivePanel((prev) => (prev ? null : "explorer"));
      }
      // Ctrl+` — toggle terminal
      if ((e.ctrlKey || e.metaKey) && e.key === "`") {
        e.preventDefault();
        setTerminalOpen((prev) => !prev);
      }
      // Ctrl+W — close active tab
      if ((e.ctrlKey || e.metaKey) && e.key === "w") {
        e.preventDefault();
        if (activeTabId) handleTabClose(activeTabId);
      }
      // Ctrl+Shift+P — toggle command palette
      if (
        (e.ctrlKey || e.metaKey) &&
        e.shiftKey &&
        e.key.toLowerCase() === "p"
      ) {
        e.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
      }
      // Ctrl+P — quick open (also command palette for now)
      if (
        (e.ctrlKey || e.metaKey) &&
        !e.shiftKey &&
        e.key.toLowerCase() === "p"
      ) {
        e.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
      }
    };
    const shiftHandler = (e) => {
      if (e.key === "Shift") {
        const now = Date.now();
        if (now - lastShiftTime.current < 400) {
          setSpotlightOpen(true);
          lastShiftTime.current = 0; // reset
        } else {
          lastShiftTime.current = now;
        }
      }
    };
    window.addEventListener("keydown", handler);
    window.addEventListener("keyup", shiftHandler);
    return () => {
      window.removeEventListener("keydown", handler);
      window.removeEventListener("keyup", shiftHandler);
    };
  }, [activeTabId, handleTabClose, terminalOpen]);

  const handleCreateFile = useCallback(
    async (name, parentId = null) => {
      if (!name) return;
      const ext = name.split(".").pop()?.toLowerCase() || "";
      let fsPath = null;

      if (workspacePath && isElectron) {
        const parent = files.find((f) => f.id === parentId);
        const basePath = parent?.fsPath || workspacePath;
        fsPath = `${basePath}${SEP}${name}`;
        await nativeFS.writeFile(fsPath, "");
      }

      const newFile = {
        id: fsPath ? `fs_${fsPath}` : generateId(),
        name,
        type: "file",
        parentId: parentId || null,
        language: ext,
        content: "",
        fsPath,
        createdAt: new Date().toISOString(),
        modifiedAt: new Date().toISOString(),
      };
      setFiles((prev) => [...prev, newFile]);
      openFileTab(newFile);
    },
    [openFileTab, workspacePath, files],
  );

  const handleCreateFolder = useCallback(
    async (name, parentId = null) => {
      let fsPath = null;
      if (workspacePath && isElectron) {
        const parent = files.find((f) => f.id === parentId);
        const basePath = parent?.fsPath || workspacePath;
        fsPath = `${basePath}${SEP}${name}`;
        await nativeFS.mkdir(fsPath);
      }

      const newFolder = {
        id: fsPath ? `fs_${fsPath}` : generateId(),
        name,
        type: "folder",
        parentId: parentId || null,
        isOpen: true,
        fsPath,
        createdAt: new Date().toISOString(),
      };
      setFiles((prev) => [...prev, newFolder]);
    },
    [workspacePath, files, isElectron],
  );

  const handleRenameFile = useCallback(
    async (id, newName) => {
      const file = files.find((f) => f.id === id);
      let newFsPath = null;

      if (file && file.fsPath && isElectron) {
        const parentPath = file.fsPath.substring(0, file.fsPath.lastIndexOf(SEP));
        newFsPath = `${parentPath}${SEP}${newName}`;
        try {
          await nativeFS.rename(file.fsPath, newFsPath);
        } catch (err) {
          console.error("Rename failed", err);
          return;
        }
      }

      setFiles((prev) =>
        prev.map((f) =>
          f.id === id
            ? {
                ...f,
                name: newName,
                fsPath: newFsPath || f.fsPath,
                language: newName.split(".").pop()?.toLowerCase() || f.language,
                modifiedAt: new Date().toISOString(),
              }
            : f,
        ),
      );
      setOpenTabs((prev) =>
        prev.map((t) => (t.id === id ? { ...t, name: newName } : t)),
      );
    },
    [files],
  );

  const handleDeleteFile = useCallback(
    async (id) => {
      const file = files.find((f) => f.id === id);
      if (file && file.fsPath && isElectron) {
        try {
          await nativeFS.delete(file.fsPath);
        } catch (err) {
          console.error("Delete failed", err);
          return;
        }
      }

      const getIdsToDelete = (targetId, allFiles) => {
        const ids = [targetId];
        const children = allFiles.filter((f) => f.parentId === targetId);
        children.forEach((child) => {
          ids.push(...getIdsToDelete(child.id, allFiles));
        });
        return ids;
      };

      setFiles((prev) => {
        const idsToRemove = getIdsToDelete(id, prev);
        const remaining = prev.filter((f) => !idsToRemove.includes(f.id));

        setOpenTabs((prevTabs) => {
          const newTabs = prevTabs.filter((t) => !idsToRemove.includes(t.id));
          if (idsToRemove.includes(activeTabId)) {
            setActiveTabId(
              newTabs.length > 0 ? newTabs[newTabs.length - 1].id : null,
            );
          }
          return newTabs;
        });

        return remaining;
      });
    },
    [activeTabId, setOpenTabs, setActiveTabId, files],
  );

  // handleToggleFolder is now above...

  const handleFileSelect = useCallback(
    async (fileOrId) => {
      try {
        const file =
          typeof fileOrId === "string"
            ? files.find((f) => f.id === fileOrId)
            : fileOrId;
        if (!file) return;

        if (file.type === "folder") {
          handleToggleFolder(file.id);
          return;
        }

        let fileToOpen = { ...file };
        if (file.fsPath && !file.content && isElectron) {
          const content = await nativeFS.readFile(file.fsPath);
          setFiles((prev) =>
            prev.map((f) => (f.id === file.id ? { ...f, content } : f)),
          );
          fileToOpen.content = content;
        }

        openFileTab(fileToOpen);
      } catch (err) {
        console.error("Failed to select/open file:", err);
      }
    },
    [files, handleToggleFolder, openFileTab, isElectron],
  );

  const handleCodeChange = useCallback(
    (newCode) => {
      if (!activeTabId) return;

      setFiles((prev) =>
        prev.map((f) =>
          f.id === activeTabId
            ? { ...f, content: newCode, modifiedAt: new Date().toISOString() }
            : f,
        ),
      );

      setOpenTabs((prev) =>
        prev.map((t) => (t.id === activeTabId ? { ...t, modified: true } : t)),
      );

      // Save to disk if workspace file
      const file = files.find((f) => f.id === activeTabId);
      if (file && file.fsPath) {
        if (autoSaveRef.current) clearTimeout(autoSaveRef.current);
        autoSaveRef.current = setTimeout(async () => {
          await nativeFS.writeFile(file.fsPath, newCode);
          setOpenTabs((prev) =>
            prev.map((t) =>
              t.id === activeTabId ? { ...t, modified: false } : t,
            ),
          );
        }, 1000);
      } else if (settings.auto_save) {
        // Local storage auto-save
        if (autoSaveRef.current) clearTimeout(autoSaveRef.current);
        autoSaveRef.current = setTimeout(() => {
          setOpenTabs((prev) =>
            prev.map((t) =>
              t.id === activeTabId ? { ...t, modified: false } : t,
            ),
          );
        }, 1500);
      }
    },
    [activeTabId, settings.auto_save, files],
  );

  const handleSettingsChange = useCallback((newSettings) => {
    setSettings(newSettings);
  }, []);

  const handleResetSettings = useCallback(() => {
    if (confirm("Möchtest du wirklich alle Einstellungen zurücksetzen?")) {
      setSettings(DEFAULT_SETTINGS);
      localStorage.removeItem(SETTINGS_STORAGE_KEY);
      window.location.reload();
    }
  }, []);

  const handleCommandPaletteAction = useCallback(
    (actionId, payload) => {
      switch (actionId) {
        case "open-file":
          handleFileSelect(payload);
          break;
        case "new-file":
          handleCreateFile("untitled.js");
          break;
        case "change-theme":
          setShowSettings(true);
          break;
        case "toggle-terminal":
          setTerminalOpen((prev) => !prev);
          break;
        case "open-settings":
          setShowSettings(true);
          break;
        case "toggle-sidebar":
          setActivePanel((prev) => (prev ? null : "explorer"));
          break;
        case "github-sync":
          setActivePanel("git");
          break;
        default:
          break;
      }
    },
    [handleCreateFile, handleFileSelect],
  );

  const activeFile = files.find((f) => f.id === activeTabId);
  const currentCode = activeFile?.content ?? "";

  /* ─── Panel content helper ──────────────────────────────────────── */
  const renderPanelContent = () => (
    <>
      {activePanel === "explorer" && (
        <FileExplorer
          files={files}
          activeFileId={activeTabId}
          onFileSelect={(f) => {
            handleFileSelect(f);
            // On mobile, close the panel after opening a file
            if (isMobile) setActivePanel(null);
          }}
          onCreateFile={handleCreateFile}
          onCreateFolder={handleCreateFolder}
          onRenameFile={handleRenameFile}
          onDeleteFile={handleDeleteFile}
          onToggleFolder={handleToggleFolder}
          workspacePath={workspacePath}
        />
      )}
      {activePanel === "search" && (
        <SearchPanel files={files} onFileSelect={handleFileSelect} />
      )}
      {activePanel === "git" && <GitPanel files={files} />}
      {activePanel === "debug" && (
        <DebugPanel activeFile={activeFile} _code={currentCode} />
      )}
      {activePanel === "extensions" && <ExtensionsPanel />}
      {activePanel === "problems" && (
        <ProblemsPanel
          problems={problems}
          onSelectProblem={(p) => {
            if (activeTabId) {
              setSettings((prev) => ({
                ...prev,
                _revealLine: {
                  line: p.startLineNumber,
                  col: p.startColumn,
                  timestamp: Date.now(),
                },
              }));
            }
          }}
        />
      )}
    </>
  );

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-transparent text-[#e5e7eb] font-sans">
      <TitleBar
        onOpenFolder={handleOpenFolder}
        onToggleSidebar={handleToggleSidebar}
        onToggleSidebarVisibility={handleToggleSidebarVisibility}
        onToggleZenMode={handleToggleZenMode}
        onToggleTerminal={() => setTerminalOpen(!terminalOpen)}
        onOpenCommandPalette={() => setCommandPaletteOpen(true)}
        onOpenSettings={() => setShowSettings(true)}
        workspaceName={
          workspacePath ? workspacePath.split(/[\/]/).pop() : null
        }
      />

      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* ── Desktop left sidebar ── */}
        {!isMobile &&
          !settings.zen_mode &&
          settings.sidebar_visible &&
          settings.sidebar_position === "left" && (
            <div
              className="flex flex-col border-r border-white/5 shrink-0"
              style={{ background: "var(--nexus-surface)", backdropFilter: "blur(20px)" }}
            >
              <Sidebar
                activePanel={activePanel}
                setActivePanel={setActivePanel}
                onOpenSettings={() => setShowSettings(true)}
              />
            </div>
          )}

        {showSettings ? (
          <div
            className="flex-1 m-2 md:m-4 rounded-2xl overflow-hidden animate-in fade-in zoom-in duration-300 border border-white/5"
            style={{ background: "var(--nexus-surface)", backdropFilter: "blur(40px)" }}
          >
            <SettingsPanel
              settings={settings}
              onSettingsChange={handleSettingsChange}
              onResetSettings={handleResetSettings}
              onClose={() => setShowSettings(false)}
            />
          </div>
        ) : (
          <>
            {/* ── Desktop side panel ── */}
            {!isMobile && (
              <AnimatePresence mode="wait">
                {!settings.zen_mode && activePanel && (
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    className="w-72 backdrop-blur-xl border-r border-white/5 overflow-hidden"
                    style={{ background: "rgba(255,255,255,0.01)" }}
                  >
                    {renderPanelContent()}
                  </motion.div>
                )}
              </AnimatePresence>
            )}

            {/* ── Mobile panel drawer & backdrop ── */}
            {isMobile && (
              <AnimatePresence>
                {activePanel && (
                  <>
                    {/* Backdrop */}
                    <motion.div
                      key="drawer-backdrop"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-30"
                      onClick={() => setActivePanel(null)}
                    />
                    {/* Drawer */}
                    <motion.div
                      key="drawer-panel"
                      initial={{ x: "-100%" }}
                      animate={{ x: 0 }}
                      exit={{ x: "-100%" }}
                      transition={{ type: "spring", stiffness: 320, damping: 36 }}
                      className="fixed top-0 left-0 bottom-0 z-40 overflow-hidden flex flex-col"
                      style={{
                        width: "min(300px, 85vw)",
                        background: "var(--nexus-surface)",
                        backdropFilter: "blur(40px)",
                        borderRight: "1px solid var(--nexus-border)",
                        paddingTop: "env(safe-area-inset-top, 0px)",
                      }}
                    >
                      {/* Drawer header */}
                      <div
                        className="flex items-center justify-between px-4 py-3 border-b border-white/5 shrink-0"
                        style={{ background: "rgba(0,0,0,0.2)" }}
                      >
                        <span className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--primary)" }}>
                          {activePanel}
                        </span>
                        <motion.button
                          whileTap={{ scale: 0.9 }}
                          onClick={() => setActivePanel(null)}
                          className="w-7 h-7 rounded-full flex items-center justify-center"
                          style={{ background: "rgba(255,255,255,0.08)" }}
                        >
                          <span className="text-gray-400 text-sm leading-none">✕</span>
                        </motion.button>
                      </div>
                      <div className="flex-1 overflow-hidden">
                        {renderPanelContent()}
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            )}

            {/* ── Main editor area ── */}
            <div className="flex-1 flex flex-col min-w-0 min-h-0 bg-transparent">
              {/* Tab bar */}
              <div
                className="backdrop-blur-md border-b border-white/5 shrink-0"
                style={{ background: "rgba(0,0,0,0.2)" }}
              >
                <TabBar
                  tabs={openTabs}
                  activeTabId={activeTabId}
                  onTabSelect={setActiveTabId}
                  onTabClose={handleTabClose}
                />
              </div>

              <div className="flex-1 relative overflow-hidden flex flex-col min-h-0">
                {/* Problems badge */}
                {problems.length > 0 && (
                  <div className="absolute top-3 right-3 z-50 flex gap-2">
                    <button
                      onClick={() => setActivePanel("problems")}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-full backdrop-blur-md transition-all group"
                    >
                      <AlertCircle size={14} className="text-red-500 group-hover:scale-110 transition-transform" />
                      <span className="text-[10px] font-bold text-red-500">
                        {problems.length} Problems
                      </span>
                    </button>
                  </div>
                )}

                <ErrorBoundary>
                  {activeTabId && activeFile ? (
                    <CodeEditor
                      code={currentCode}
                      onChange={handleCodeChange}
                      fileName={activeFile.name}
                      onMarkersChange={(m) => setProblems(m)}
                      fontSize={settings.font_size || 14}
                      showLineNumbers={settings.line_numbers !== false}
                      tabSize={settings.tab_size || 4}
                      wordWrap={settings.word_wrap || false}
                      minimap={settings.minimap !== false && !isMobile}
                      settings={{ ...settings, minimap: isMobile ? false : settings.minimap }}
                    />
                  ) : (
                    <WelcomeScreen
                      onNewFile={() => handleCreateFile("untitled.js")}
                      onOpenFolder={handleOpenFolder}
                      onOpenSettings={() => setShowSettings(true)}
                    />
                  )}
                </ErrorBoundary>
              </div>

              {/* Terminal — hidden on mobile when closed, compact toggle */}
              {settings.status_bar_visible !== false && (
                <div
                  className="shrink-0 border-t border-white/5 min-h-0"
                  style={{ background: "var(--nexus-surface)" }}
                >
                  <Terminal
                    isOpen={terminalOpen}
                    onToggle={() => setTerminalOpen(!terminalOpen)}
                    activeFile={activeFile}
                    code={currentCode}
                    workspacePath={workspacePath}
                  />
                </div>
              )}
            </div>

            {/* ── Desktop right sidebar ── */}
            {!isMobile &&
              !settings.zen_mode &&
              settings.sidebar_visible &&
              settings.sidebar_position === "right" && (
                <div
                  className="flex flex-col border-l border-white/5 backdrop-blur-xl shrink-0"
                  style={{ background: "var(--nexus-surface)" }}
                >
                  <Sidebar
                    activePanel={activePanel}
                    setActivePanel={setActivePanel}
                    onOpenSettings={() => setShowSettings(true)}
                  />
                </div>
              )}
          </>
        )}
      </div>

      {/* ── Mobile bottom nav ── */}
      {isMobile && !settings.zen_mode && !showSettings && (
        <MobileBottomNav
          activePanel={activePanel}
          setActivePanel={setActivePanel}
          onOpenSettings={() => setShowSettings(true)}
        />
      )}

      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        onAction={handleCommandPaletteAction}
      />

      <SpotlightSearch
        isOpen={spotlightOpen}
        onClose={() => setSpotlightOpen(false)}
        onAction={handleCommandPaletteAction}
        files={files}
      />
    </div>
  );
}
