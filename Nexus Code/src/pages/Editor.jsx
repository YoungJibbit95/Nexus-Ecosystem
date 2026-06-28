import React, { Suspense, useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  AlertCircle,
  AlertTriangle,
  CircleDot,
  FileText,
  Folder,
  TerminalSquare,
  XCircle,
} from "lucide-react";
import TitleBar from "../components/editor/TitleBar";
import Sidebar from "../components/editor/Sidebar";
import FileExplorer from "../components/editor/FileExplorer";
import TabBar from "../components/editor/TabBar";
import Terminal from "../components/editor/Terminal";
import WelcomeScreen from "../components/editor/WelcomeScreen";
import SearchPanel from "../components/editor/SearchPanel";
import GitPanel from "../components/editor/GitPanel";
import DebugPanel from "../components/editor/DebugPanel";
import ExtensionsPanel from "../components/editor/ExtensionsPanel";
import AccountPanel from "../components/editor/AccountPanel";
import CommandPalette from "../components/editor/CommandPalette";
import SpotlightSearch from "../components/editor/SpotlightSearch";
import ProblemsPanel from "../components/editor/ProblemsPanel";
import { motion, AnimatePresence } from "framer-motion";

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
  resolveNexusTheme,
} from './editor/editorShared.jsx';
import { createFileNodesFromEntries } from "./editor/fileTreeModel";
import {
  getBottomPanelClassName,
  getMainEditorClassName,
  getPanelMeta,
  getRailClassName,
  getShellModeLabel,
  getSidePanelClassName,
} from "./editor/editorShellLayout";
import {
  beginPerfMetric,
  endPerfMetric,
} from "../lib/perfMetrics";

const LANGUAGE_EXTENSIONS = {
  typescript: "ts",
  javascript: "js",
  python: "py",
  html: "html",
  css: "css",
  json: "json",
  markdown: "md",
  rust: "rs",
  go: "go",
};

const FILES_PERSIST_DEBOUNCE_MS = 3_200;
const SETTINGS_PERSIST_DEBOUNCE_MS = 900;
const EDITOR_BUFFER_COMMIT_MS = 8_000;
const WORKSPACE_AUTOSAVE_MS = 5_200;
const LOCAL_AUTOSAVE_MS = 6_200;
const CODE_COMPACT_VIEWPORT_WIDTH = 980;
const loadSettingsPanel = () => import("../components/editor/SettingsPanel");
const loadCodeEditor = () => import("../components/editor/CodeEditor");
const SettingsPanel = React.lazy(() => loadSettingsPanel());
const CodeEditor = React.lazy(() => loadCodeEditor());

function getIsCompactCodeViewport() {
  if (typeof window === "undefined") return false;
  return window.innerWidth < CODE_COMPACT_VIEWPORT_WIDTH;
}

function isEditableEventTarget(target) {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const editable = target.closest(
    'input, textarea, [contenteditable="true"], [role="textbox"]',
  );
  return Boolean(editable);
}

function getPathBasename(value) {
  if (!value) return "";
  const parts = String(value).split(/[\\/]/).filter(Boolean);
  return parts[parts.length - 1] || "";
}

function getRelativePathLabel(file, workspacePath) {
  const rawPath = file?.fsPath || file?.name || "";
  if (!rawPath) return "Keine Datei";
  if (!workspacePath || !file?.fsPath) return rawPath;
  const normalizedWorkspace = String(workspacePath).replace(/[\\/]+$/, "");
  const normalizedPath = String(file.fsPath);
  if (normalizedPath.toLowerCase().startsWith(normalizedWorkspace.toLowerCase())) {
    const relative = normalizedPath
      .slice(normalizedWorkspace.length)
      .replace(/^[\\/]+/, "");
    return relative || getPathBasename(normalizedPath);
  }
  return getPathBasename(normalizedPath) || normalizedPath;
}

function getFileExtensionLabel(file) {
  const name = file?.name || file?.fsPath || "";
  const extension = String(name).split(".").pop()?.toUpperCase();
  if (!extension || extension === String(name).toUpperCase()) return "TXT";
  return extension.slice(0, 8);
}

function getFileTreeErrorMessage(error, fallback = "Workspace tree could not be read.") {
  const message = error?.message || String(error || "");
  return message.trim() || fallback;
}

function waitForFileTreeFrame() {
  if (
    typeof window === "undefined" ||
    typeof window.requestAnimationFrame !== "function"
  ) {
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    window.requestAnimationFrame(() => resolve());
  });
}

function mergeFileTreeNode(node, previousById, options = {}) {
  const previous = previousById.get(node.id);
  if (!previous) return node;

  const openTabIds = options.openTabIds instanceof Set ? options.openTabIds : null;
  const shouldPreserveContent =
    node.type !== "folder" &&
    previous.content != null &&
    (!openTabIds || openTabIds.has(node.id));

  return {
    ...previous,
    ...node,
    content: shouldPreserveContent ? previous.content : node.content,
    createdAt: previous.createdAt || node.createdAt,
    modifiedAt: previous.modifiedAt || node.modifiedAt,
    isOpen: node.type === "folder" ? Boolean(previous.isOpen) : Boolean(node.isOpen),
  };
}

function getProblemSummary(problems) {
  return problems.reduce(
    (acc, problem) => {
      if (problem?.severity === 8) acc.errors += 1;
      else if (problem?.severity === 4) acc.warnings += 1;
      else acc.infos += 1;
      return acc;
    },
    { errors: 0, warnings: 0, infos: 0 },
  );
}

function StatusItem({
  icon: Icon,
  label,
  value,
  tone = "muted",
  onClick,
  title,
  iconOnly = false,
  className = "",
}) {
  const toneClass =
    tone === "danger"
      ? "text-red-300 border-red-500/20 bg-red-500/10"
      : tone === "warning"
        ? "text-amber-200 border-amber-500/20 bg-amber-500/10"
        : tone === "active"
          ? "text-white border-white/15 bg-white/10"
          : "text-gray-400 border-white/10 bg-white/[0.025]";
  const Comp = onClick ? "button" : "div";

  return (
    <Comp
      type={onClick ? "button" : undefined}
      onClick={onClick}
      title={title || label}
      className={`nx-code-status-item h-7 min-w-0 max-w-full rounded-md border px-2 flex items-center justify-center gap-1.5 text-[10px] font-medium leading-none ${toneClass} ${onClick ? "hover:bg-white/10 transition-colors" : ""} ${iconOnly ? "nx-code-status-item-icon w-7 px-0" : ""} ${className}`}
    >
      {Icon ? <Icon size={12} className="shrink-0" /> : null}
      {iconOnly ? (
        <span className="sr-only">{value || label}</span>
      ) : (
        <span className="truncate">{value || label}</span>
      )}
    </Comp>
  );
}

function SidePanelFrame({ panelId, onClose, children }) {
  const meta = getPanelMeta(panelId);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div
        className="flex h-11 shrink-0 items-center gap-3 border-b border-white/5 px-3"
        style={{ background: "rgba(0,0,0,0.14)" }}
      >
        <div className="min-w-0 flex-1">
          <div className="truncate text-[11px] font-semibold uppercase text-[var(--nexus-text)]">
            {meta.title}
          </div>
          <div className="truncate text-[10px] text-[var(--nexus-muted)]">
            {meta.detail}
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-white/10 text-gray-500 transition-colors hover:border-white/20 hover:bg-white/10 hover:text-gray-200"
          title="Panel schliessen"
        >
          <XCircle size={13} />
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
    </div>
  );
}

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
  if (rgbMatch) {
    return [
      Number.parseFloat(rgbMatch[1]),
      Number.parseFloat(rgbMatch[2]),
      Number.parseFloat(rgbMatch[3]),
    ];
  }
  return null;
}

function relativeLuminance(rgb) {
  if (!rgb) return 0;
  const channels = rgb.map((v) => {
    const normalized = Math.max(0, Math.min(255, v)) / 255;
    return normalized <= 0.03928
      ? normalized / 12.92
      : ((normalized + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrastRatio(foreground, background) {
  const fgLum = relativeLuminance(foreground);
  const bgLum = relativeLuminance(background);
  const light = Math.max(fgLum, bgLum);
  const dark = Math.min(fgLum, bgLum);
  return (light + 0.05) / (dark + 0.05);
}

function getReadableColor(preferred, background, muted = false) {
  const bgRgb = extractRgbTuple(background);
  const fgRgb = extractRgbTuple(preferred);
  if (!bgRgb) return preferred;
  const backgroundIsDark = relativeLuminance(bgRgb) < 0.34;
  const fallback = muted
    ? backgroundIsDark
      ? "#94a3b8"
      : "#4b5563"
    : backgroundIsDark
      ? "#f3f4f6"
      : "#111827";
  if (!fgRgb) return fallback;
  const minContrast = muted ? 2.5 : 4.2;
  return contrastRatio(fgRgb, bgRgb) >= minContrast ? preferred : fallback;
}

function pickReadableSurface(...values) {
  for (const value of values) {
    if (extractRgbTuple(value)) return value;
  }
  return values.find((value) => Boolean(String(value || "").trim())) || "#0b1020";
}

function toRgbaColor(value, alpha = 1) {
  const rgb = extractRgbTuple(value);
  if (!rgb) return `rgba(128, 0, 255, ${alpha})`;
  const [r, g, b] = rgb.map((channel) =>
    Math.max(0, Math.min(255, Math.round(channel))),
  );
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function ensureReadableEditorTextColor(preferred, background) {
  const bgRgb = extractRgbTuple(background);
  const fgRgb = extractRgbTuple(preferred);
  if (!bgRgb) return "#f3f4f6";
  const bgLum = relativeLuminance(bgRgb);
  // Nexus Code should default to bright text and only flip on truly bright surfaces.
  if (bgLum < 0.72) return "#f3f4f6";
  if (fgRgb && relativeLuminance(fgRgb) > 0.42) return preferred;
  return "#111827";
}

export default function Editor({
  accountSession = null,
  controlStatus = null,
  onSaveAccountSession,
  onClearAccountSession,
  onTestAccountConnection,
} = {}) {
  // @ts-ignore
  const isElectron = typeof window !== "undefined" && !!window.electronAPI;
  const [activePanel, setActivePanel] = useState("explorer");
  const [showSettings, setShowSettings] = useState(false);
  const [isCompactViewport, setIsCompactViewport] = useState(
    getIsCompactCodeViewport,
  );
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [spotlightOpen, setSpotlightOpen] = useState(false);
  const lastShiftTime = useRef(0);
  const [terminalOpen, setTerminalOpen] = useState(false);
  const [bottomTab, setBottomTab] = useState("terminal"); // "terminal" | "problems"
  const [problems, setProblems] = useState([]);
  const [openTabs, setOpenTabs] = useState([]);
  const [activeTabId, setActiveTabId] = useState(null);
  const [editorCode, setEditorCode] = useState("");
  const autoSaveRef = useRef(null);
  const filesPersistTimerRef = useRef(null);
  const settingsPersistTimerRef = useRef(null);
  const codeCommitTimerRef = useRef(null);
  const filesRef = useRef([]);
  const openTabsRef = useRef([]);
  const activeTabIdRef = useRef(null);
  const editorCodeRef = useRef("");
  const previousActiveTabRef = useRef(null);

  const [files, setFiles] = useState(() => {
    const stored = loadFilesFromStorage();
    return stored || DEFAULT_FILES;
  });

  const [settings, setSettings] = useState(loadSettingsFromStorage);
  const [workspacePath, setWorkspacePath] = useState(null);
  const [workspaceLoading, setWorkspaceLoading] = useState(false);
  const [workspaceError, setWorkspaceError] = useState("");
  const fileTreeRequestIdRef = useRef(0);
  const initialPanelRef = useRef("explorer");
  const firstViewSwitchTrackedRef = useRef(false);
  const settingsOpenTrackedRef = useRef(false);

  useEffect(() => {
    let frame = 0;
    const handleResize = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        const next = getIsCompactCodeViewport();
        setIsCompactViewport((prev) => (prev === next ? prev : next));
      });
    };
    window.addEventListener("resize", handleResize, { passive: true });
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      void loadSettingsPanel();
    }, 1_200);
    return () => {
      window.clearTimeout(timerId);
    };
  }, []);

  useEffect(() => {
    beginPerfMetric("code.first_view_switch");
    beginPerfMetric("code.settings_open");
  }, []);

  useEffect(() => {
    if (firstViewSwitchTrackedRef.current) return;
    if (activePanel === initialPanelRef.current) return;
    firstViewSwitchTrackedRef.current = true;
    endPerfMetric("code.first_view_switch", {
      source: "editor",
      panel: activePanel || "none",
    });
  }, [activePanel]);

  useEffect(() => {
    if (settingsOpenTrackedRef.current) return;
    if (!showSettings) return;
    settingsOpenTrackedRef.current = true;
    endPerfMetric("code.settings_open", {
      source: "editor",
    });
  }, [showSettings]);

  useEffect(() => {
    const onExtensionsChanged = (event) => {
      const installed = Array.isArray(event?.detail?.installed)
        ? event.detail.installed
        : [];
      setSettings((prev) => {
        const current = Array.isArray(prev.extensions_installed)
          ? prev.extensions_installed
          : [];
        if (
          current.length === installed.length &&
          current.every((entry, index) => entry === installed[index])
        ) {
          return prev;
        }
        return { ...prev, extensions_installed: installed };
      });
    };
    window.addEventListener("nx-code-extensions-changed", onExtensionsChanged);
    return () => {
      window.removeEventListener(
        "nx-code-extensions-changed",
        onExtensionsChanged,
      );
    };
  }, []);

  // Persist files whenever they change (only if not in a workspace for now, or unified)
  useEffect(() => {
    if (workspacePath) return;
    if (filesPersistTimerRef.current) {
      window.clearTimeout(filesPersistTimerRef.current);
    }
    filesPersistTimerRef.current = window.setTimeout(() => {
      saveFilesToStorage(files);
    }, FILES_PERSIST_DEBOUNCE_MS);
    return () => {
      if (filesPersistTimerRef.current) {
        window.clearTimeout(filesPersistTimerRef.current);
        filesPersistTimerRef.current = null;
      }
    };
  }, [files, workspacePath]);

  useEffect(() => {
    if (settingsPersistTimerRef.current) {
      window.clearTimeout(settingsPersistTimerRef.current);
    }
    settingsPersistTimerRef.current = window.setTimeout(() => {
      saveSettingsToStorage(settings);
    }, SETTINGS_PERSIST_DEBOUNCE_MS);
    return () => {
      if (settingsPersistTimerRef.current) {
        window.clearTimeout(settingsPersistTimerRef.current);
        settingsPersistTimerRef.current = null;
      }
    };
  }, [settings]);

  useEffect(() => {
    filesRef.current = files;
  }, [files]);

  useEffect(() => {
    openTabsRef.current = openTabs;
  }, [openTabs]);

  useEffect(() => {
    activeTabIdRef.current = activeTabId;
  }, [activeTabId]);

  useEffect(() => {
    editorCodeRef.current = editorCode;
  }, [editorCode]);

  const commitBufferToFile = useCallback((targetTabId, content) => {
    if (!targetTabId) return;
    setFiles((prev) => {
      const idx = prev.findIndex((f) => f.id === targetTabId);
      if (idx === -1) return prev;
      const current = prev[idx];
      const previousContent = current.content || "";
      if (previousContent === content) return prev;
      const next = prev.slice();
      next[idx] = {
        ...current,
        content,
        modifiedAt: new Date().toISOString(),
      };
      return next;
    });
  }, []);

  const flushEditorBuffer = useCallback(
    (targetTabId = activeTabIdRef.current) => {
      if (!targetTabId) return;
      if (codeCommitTimerRef.current) {
        window.clearTimeout(codeCommitTimerRef.current);
        codeCommitTimerRef.current = null;
      }
      setEditorCode((prev) =>
        prev === editorCodeRef.current ? prev : editorCodeRef.current,
      );
      commitBufferToFile(targetTabId, editorCodeRef.current);
    },
    [commitBufferToFile],
  );

  useEffect(() => {
    const previousTabId = previousActiveTabRef.current;
    if (previousTabId && previousTabId !== activeTabId) {
      flushEditorBuffer(previousTabId);
    }
    previousActiveTabRef.current = activeTabId;

    const activeFile = files.find((f) => f.id === activeTabId);
    const nextCode = activeFile?.content || "";
    setEditorCode(nextCode);
    editorCodeRef.current = nextCode;
  }, [activeTabId, files, flushEditorBuffer]);

  useEffect(() => {
    return () => {
      flushEditorBuffer();
      if (autoSaveRef.current) window.clearTimeout(autoSaveRef.current);
      if (codeCommitTimerRef.current) window.clearTimeout(codeCommitTimerRef.current);
    };
  }, [flushEditorBuffer]);

  const handleToggleZenMode = useCallback(() => {
    setShowSettings(false);
    setSettings((prev) => ({ ...prev, zen_mode: !prev.zen_mode }));
  }, []);

  const handleToggleSidebarVisibility = useCallback(() => {
    setShowSettings(false);
    setSettings((prev) => ({
      ...prev,
      sidebar_visible: !prev.sidebar_visible,
      zen_mode: prev.sidebar_visible ? prev.zen_mode : false,
    }));
  }, []);

  const handleToggleSidebar = useCallback(() => {
    setShowSettings(false);
    setSettings((prev) =>
      prev.sidebar_visible
        ? prev
        : {
            ...prev,
            sidebar_visible: true,
            zen_mode: false,
          },
    );
    setActivePanel((prev) => (prev ? null : "explorer"));
  }, []);

  const handleToggleTerminalPanel = useCallback(() => {
    setShowSettings(false);
    setBottomTab("terminal");
    setTerminalOpen((prev) => (bottomTab === "terminal" ? !prev : true));
  }, [bottomTab]);

  const handleOpenTerminalPanel = useCallback(() => {
    setShowSettings(false);
    setBottomTab("terminal");
    setTerminalOpen(true);
  }, []);

  const handleOpenProblemsPanel = useCallback(() => {
    setShowSettings(false);
    setBottomTab("problems");
    setTerminalOpen(true);
  }, []);

  const handleOpenWorkbenchPanel = useCallback((panelId) => {
    setShowSettings(false);
    setSettings((prev) => ({
      ...prev,
      sidebar_visible: true,
      zen_mode: false,
    }));
    setActivePanel(panelId);
  }, []);

  const handleSidebarPanelChange = useCallback((panelId) => {
    setShowSettings(false);
    if (panelId) {
      setSettings((prev) => ({
        ...prev,
        sidebar_visible: true,
        zen_mode: false,
      }));
    }
    setActivePanel(panelId);
  }, []);

  const handleFocusEditor = useCallback(() => {
    setShowSettings(false);
    setActivePanel(null);
  }, []);

  const handleOpenSettingsPanel = useCallback(() => {
    setActivePanel(null);
    setShowSettings(true);
  }, []);

  const readDirectoryNodes = useCallback(
    async (targetPath, parentId = null, options = {}) => {
      if (!isElectron || !targetPath) return [];
      // @ts-ignore
      const entries = await window.electronAPI.readDir(targetPath);
      await waitForFileTreeFrame();
      const existingIds =
        options.existingIds instanceof Set
          ? options.existingIds
          : new Set((options.existingFiles || []).map((file) => file.id));
      const previousById =
        options.previousById instanceof Map ? options.previousById : new Map();
      const openTabIds =
        options.openTabIds instanceof Set ? options.openTabIds : new Set();
      return createFileNodesFromEntries(entries, {
        parentId,
        existingIds,
      }).map((node) => mergeFileTreeNode(node, previousById, { openTabIds }));
    },
    [isElectron],
  );

  const handleRefreshWorkspace = useCallback(async () => {
    if (!workspacePath || !isElectron) {
      setWorkspaceError("Kein Workspace geoeffnet.");
      return;
    }
    const requestId = fileTreeRequestIdRef.current + 1;
    fileTreeRequestIdRef.current = requestId;
    setWorkspaceError("");
    setWorkspaceLoading(true);
    try {
      flushEditorBuffer();
      await waitForFileTreeFrame();

      const bufferedFiles = filesRef.current.map((file) =>
        file.id === activeTabIdRef.current
          ? { ...file, content: editorCodeRef.current }
          : file,
      );
      const previousById = new Map(
        bufferedFiles.map((file) => [file.id, file]),
      );
      const openTabIds = new Set(openTabsRef.current.map((tab) => tab.id));
      const openFolderIds = new Set(
        bufferedFiles
          .filter((file) => file.type === "folder" && file.isOpen && file.fsPath)
          .map((file) => file.id),
      );
      const nextFiles = [];
      const nextById = new Map();

      const appendDirectory = async (targetPath, parentId = null) => {
        const nodes = await readDirectoryNodes(targetPath, parentId, {
          existingIds: new Set(nextById.keys()),
          previousById,
          openTabIds,
        });
        if (requestId !== fileTreeRequestIdRef.current) return [];
        for (const node of nodes) {
          if (nextById.has(node.id)) continue;
          nextById.set(node.id, node);
          nextFiles.push(node);
        }
        return nodes;
      };

      const rootFiles = await appendDirectory(workspacePath, null);
      const folderQueue = rootFiles.filter(
        (file) => file.type === "folder" && file.fsPath && openFolderIds.has(file.id),
      );

      while (folderQueue.length > 0) {
        if (requestId !== fileTreeRequestIdRef.current) return;
        const folder = folderQueue.shift();
        const children = await appendDirectory(folder.fsPath, folder.id);
        for (const child of children) {
          if (
            child.type === "folder" &&
            child.fsPath &&
            openFolderIds.has(child.id)
          ) {
            folderQueue.push(child);
          }
        }
      }

      if (requestId !== fileTreeRequestIdRef.current) return;
      setFiles(nextFiles);
      setOpenTabs((prevTabs) => {
        const nextTabs = prevTabs.filter((tab) => nextById.has(tab.id));
        if (activeTabIdRef.current && !nextById.has(activeTabIdRef.current)) {
          setActiveTabId(
            nextTabs.length > 0 ? nextTabs[nextTabs.length - 1].id : null,
          );
        }
        return nextTabs;
      });
      setSettings((prev) => ({
        ...prev,
        sidebar_visible: true,
        zen_mode: false,
      }));
      setActivePanel("explorer");
    } catch (err) {
      console.error("Refresh workspace failed", err);
      if (requestId === fileTreeRequestIdRef.current) {
        setWorkspaceError(
          getFileTreeErrorMessage(err, "Workspace konnte nicht aktualisiert werden."),
        );
      }
    } finally {
      if (requestId === fileTreeRequestIdRef.current) {
        setWorkspaceLoading(false);
      }
    }
  }, [flushEditorBuffer, isElectron, readDirectoryNodes, workspacePath]);

  const handleOpenFolder = useCallback(async () => {
    if (!isElectron) return;
    const requestId = fileTreeRequestIdRef.current + 1;
    fileTreeRequestIdRef.current = requestId;
    setWorkspaceError("");
    try {
      // @ts-ignore
      const path = await window.electronAPI.openFolder();
      if (!path) return;

      setWorkspaceLoading(true);
      setWorkspacePath(path);
      setFiles([]);
      setOpenTabs([]);
      setActiveTabId(null);

      const rootFiles = await readDirectoryNodes(path, null, {});
      if (requestId !== fileTreeRequestIdRef.current) return;
      setFiles(rootFiles);
      setSettings((prev) => ({
        ...prev,
        sidebar_visible: true,
        zen_mode: false,
      }));
      setActivePanel("explorer");
    } catch (err) {
      console.error("Open folder failed", err);
      if (requestId === fileTreeRequestIdRef.current) {
        setWorkspaceError(
          getFileTreeErrorMessage(err, "Workspace konnte nicht geladen werden."),
        );
      }
    } finally {
      if (requestId === fileTreeRequestIdRef.current) {
        setWorkspaceLoading(false);
      }
    }
  }, [isElectron, readDirectoryNodes]);

  const handleToggleFolder = useCallback(
    async (id) => {
      const currentFiles = filesRef.current;
      const folder = currentFiles.find((f) => f.id === id);
      if (!folder) return;

      // Lazy loading for disk folders
      if (!folder.isOpen && folder.fsPath && isElectron) {
        const hasLoadedChildren = currentFiles.some((f) => f.parentId === id);
        if (!hasLoadedChildren) {
          const requestId = fileTreeRequestIdRef.current + 1;
          fileTreeRequestIdRef.current = requestId;
          setWorkspaceError("");
          setWorkspaceLoading(true);
          try {
            const latestFiles = filesRef.current;
            const children = await readDirectoryNodes(folder.fsPath, id, {
              existingFiles: latestFiles,
              previousById: new Map(latestFiles.map((file) => [file.id, file])),
              openTabIds: new Set(openTabsRef.current.map((tab) => tab.id)),
            });
            if (requestId !== fileTreeRequestIdRef.current) return;
            if (children.length > 0) {
              setFiles((prev) => {
                const existingIds = new Set(prev.map((file) => file.id));
                const newChildren = children.filter(
                  (child) => !existingIds.has(child.id),
                );
                return newChildren.length > 0 ? [...prev, ...newChildren] : prev;
              });
            }
          } catch (err) {
            console.error("Failed to lazy load folder", err);
            if (requestId === fileTreeRequestIdRef.current) {
              setWorkspaceError(
                getFileTreeErrorMessage(err, "Ordner konnte nicht geladen werden."),
              );
            }
            return;
          } finally {
            if (requestId === fileTreeRequestIdRef.current) {
              setWorkspaceLoading(false);
            }
          }
        }
      }

      setFiles((prev) =>
        prev.map((f) => (f.id === id ? { ...f, isOpen: !f.isOpen } : f)),
      );
    },
    [isElectron, readDirectoryNodes],
  );
  useEffect(() => {
    const root = document.documentElement;
    const resolvedTheme = resolveNexusTheme(settings);
    for (const [name, value] of Object.entries(resolvedTheme.cssVars || {})) {
      root.style.setProperty(name, value);
    }

    const theme = THEMES[resolvedTheme.id] || THEMES.nexus_vibrant;
    const accent = resolvedTheme.colors.primary || settings.primary_accent || theme.accent;
    const secondaryAccent =
      resolvedTheme.colors.secondary || settings.secondary_accent || theme.accent2;
    const panelMode = settings.panel_background_mode || "blur";
    const panelBlur = Number(settings.panel_blur_strength || 22);

    // Core Layout (Background from Theme or Override)
    const bgOverride = BACKGROUNDS && BACKGROUNDS[settings.background];
    const bgType = bgOverride ? bgOverride.type : theme.bg_type || "solid";
    let bgValue = bgOverride ? bgOverride.value : theme.bg_value;

    // Special logic for theme-based accent gradient if requested/default
    if (!settings.background && theme.accent && theme.accent2) {
      bgValue = `linear-gradient(135deg, ${toRgbaColor(theme.accent, 0.2)} 0%, ${toRgbaColor(theme.accent2, 0.2)} 100%), #05060f`;
    }

    const surface = bgOverride ? bgOverride.surface : theme.surface;
    const border = bgOverride ? bgOverride.border : theme.border;
    const panelFilter =
      panelMode === "glass-shader"
        ? `blur(${Math.max(6, Math.min(16, panelBlur * 0.55))}px) saturate(145%) contrast(104%)`
        : panelMode === "fake-glass"
          ? `blur(${Math.max(5, Math.min(13, panelBlur * 0.5))}px) saturate(132%)`
          : `blur(${Math.max(4, Math.min(12, panelBlur * 0.45))}px) saturate(122%)`;
    const panelSurface =
      panelMode === "glass-shader"
        ? `linear-gradient(135deg, ${toRgbaColor(accent, 0.16)}, ${surface})`
        : panelMode === "fake-glass"
          ? `linear-gradient(135deg, rgba(255,255,255,0.08), ${surface})`
          : (surface || "#060614");
    const glowIntensity = Math.max(
      0,
      Math.min(1.4, Number(settings.glow_intensity ?? 50) / 100),
    );
    const glowRadius = Math.max(
      0,
      Math.min(64, Number(settings.glow_radius ?? 24)),
    );
    const glowRingOpacity = 0.2 + glowIntensity * 0.28;
    const glowBloomOpacity = 0.12 + glowIntensity * 0.22;
    const panelOutline =
      settings.panel_glow_outline === false
        ? "none"
        : settings.glow_renderer === "three"
          ? `0 0 0 1px ${toRgbaColor(accent, Math.min(0.62, glowRingOpacity + 0.1))}, 0 0 ${Math.round(glowRadius * 1.6)}px ${toRgbaColor(accent, Math.min(0.5, glowBloomOpacity + 0.14))}`
          : `0 0 0 1px ${toRgbaColor(accent, Math.min(0.46, glowRingOpacity))}, 0 0 ${Math.round(glowRadius)}px ${toRgbaColor(accent, Math.min(0.34, glowBloomOpacity))}`;
    const contrastSurface = pickReadableSurface(panelSurface, surface, bgValue);
    const resolvedText = getReadableColor(
      theme.text || "#e5e7eb",
      contrastSurface,
      false,
    );
    const safeEditorText = ensureReadableEditorTextColor(
      resolvedText,
      contrastSurface,
    );
    const resolvedMuted = getReadableColor(
      theme.muted || "#6b7280",
      contrastSurface,
      true,
    );

    // Apply to CSS variables
    root.style.setProperty("--nexus-bg-type", bgType);
    root.style.setProperty("--nexus-bg-value", bgValue);
    root.style.setProperty("--nexus-surface", surface || "#060614");
    root.style.setProperty("--nexus-panel-surface", panelSurface);
    root.style.setProperty("--nexus-panel-filter", panelFilter);
    root.style.setProperty("--nexus-panel-outline", panelOutline);
    root.style.setProperty("--nexus-border", border || "rgba(255,255,255,0.1)");

    // Theme (Colors & Syntax)
    root.style.setProperty("--nexus-text", safeEditorText);
    root.style.setProperty("--nexus-muted", resolvedMuted);
    root.style.setProperty("--nexus-editor-foreground", safeEditorText);

    // Accents & Glows
    root.style.setProperty("--nexus-primary", accent);
    root.style.setProperty("--nexus-primary-rgb", resolvedTheme.colors.primaryRgb);
    root.style.setProperty("--nexus-primary-hsl", resolvedTheme.colors.primaryHsl);
    root.style.setProperty("--nexus-accent-2", secondaryAccent);
    root.style.setProperty("--nexus-accent-2-rgb", resolvedTheme.colors.secondaryRgb);
    root.style.setProperty("--nexus-accent-2-hsl", resolvedTheme.colors.secondaryHsl);
    root.style.setProperty("--nexus-secondary-accent", secondaryAccent);
    root.style.setProperty("--primary-rgb", resolvedTheme.colors.primaryRgb);
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
      "--nexus-font-family",
      settings.font_family || "Inter",
    );
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

    const nextThemeStyles = `
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
      .nexus-panel-surface {
        background: var(--nexus-panel-surface) !important;
        backdrop-filter: var(--nexus-panel-filter);
        -webkit-backdrop-filter: var(--nexus-panel-filter);
        box-shadow: var(--nexus-panel-outline);
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
    if (styleTag.textContent !== nextThemeStyles) {
      styleTag.textContent = nextThemeStyles;
    }
  }, [
    settings.background,
    settings.font_family,
    settings.font_weight,
    settings.glow_intensity,
    settings.glow_radius,
    settings.glow_renderer,
    settings.panel_background_mode,
    settings.panel_blur_strength,
    settings.panel_glow_outline,
    settings.primary_accent,
    settings.secondary_accent,
    settings.theme,
  ]);

  const openFileTab = useCallback((file) => {
    setOpenTabs((prev) => {
      if (prev.find((t) => t.id === file.id)) return prev;
      return [...prev, { id: file.id, name: file.name, modified: false }];
    });
    setActiveTabId(file.id);
  }, []);

  const setTabModified = useCallback((tabId, modified) => {
    if (!tabId) return;
    setOpenTabs((prev) => {
      const idx = prev.findIndex((tab) => tab.id === tabId);
      if (idx === -1) return prev;
      if (Boolean(prev[idx].modified) === modified) return prev;
      const next = prev.slice();
      next[idx] = { ...prev[idx], modified };
      return next;
    });
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
      const key = String(e.key || "").toLowerCase();
      const hasPrimaryMod = e.ctrlKey || e.metaKey;
      const isEditable = isEditableEventTarget(e.target);

      // Ctrl+S — save active file
      if (hasPrimaryMod && key === "s") {
        e.preventDefault();
        if (activeTabId) {
          setTabModified(activeTabId, false);
        }
        return;
      }

      // Avoid hijacking browser/editor text inputs for non-critical shortcuts
      if (isEditable) {
        return;
      }

      // Ctrl+N — new file (language preset)
      if (hasPrimaryMod && key === "n") {
        e.preventDefault();
        window.dispatchEvent(
          new CustomEvent("nx-code-create-file", {
            detail: { language: "typescript" },
          }),
        );
        return;
      }

      // Ctrl+O - open workspace folder
      if (hasPrimaryMod && key === "o") {
        e.preventDefault();
        handleOpenFolder();
        return;
      }

      // Ctrl+B - toggle active side panel
      if (hasPrimaryMod && key === "b") {
        e.preventDefault();
        handleToggleSidebar();
        return;
      }

      // Ctrl+Shift+` - open terminal
      if (hasPrimaryMod && e.shiftKey && e.key === "`") {
        e.preventDefault();
        handleOpenTerminalPanel();
        return;
      }

      // Ctrl+` - toggle terminal
      if (hasPrimaryMod && e.key === "`") {
        e.preventDefault();
        handleToggleTerminalPanel();
        return;
      }

      // Ctrl+Shift+F - open workspace search
      if (hasPrimaryMod && e.shiftKey && key === "f") {
        e.preventDefault();
        handleOpenWorkbenchPanel("search");
        return;
      }


      // Ctrl+W — close active tab
      if (hasPrimaryMod && key === "w") {
        e.preventDefault();
        if (activeTabId) handleTabClose(activeTabId);
        return;
      }

      // Ctrl+, — settings
      if (hasPrimaryMod && key === ",") {
        e.preventDefault();
        handleOpenSettingsPanel();
        return;
      }

      // F1 — command palette
      if (e.key === "F1") {
        e.preventDefault();
        setCommandPaletteOpen(true);
        return;
      }

      // Ctrl+Shift+P — toggle command palette
      if (hasPrimaryMod && e.shiftKey && key === "p") {
        e.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
        return;
      }

      // Ctrl+P — quick open (also command palette for now)
      if (hasPrimaryMod && !e.shiftKey && key === "p") {
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
  }, [
    activeTabId,
    handleOpenFolder,
    handleOpenSettingsPanel,
    handleOpenTerminalPanel,
    handleOpenWorkbenchPanel,
    handleTabClose,
    handleToggleSidebar,
    handleToggleTerminalPanel,
    setTabModified,
  ]);

  const handleCreateFile = useCallback(
    async (name, parentId = null) => {
      if (!name) return;
      const ext = name.split(".").pop()?.toLowerCase() || "";
      let fsPath = null;

      if (workspacePath && isElectron) {
        const parent = files.find((f) => f.id === parentId);
        const basePath = parent?.fsPath || workspacePath;
        // @ts-ignore
        const sep = window.electronAPI.platform === "win32" ? "\\" : "/";
        fsPath = `${basePath}${sep}${name}`;
        // @ts-ignore
        await window.electronAPI.writeFile(fsPath, "");
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

  const getNextUntitledName = useCallback(
    (extension = "txt") => {
      const ext = String(extension || "txt").replace(/^\./, "");
      const existingNames = new Set(
        files.filter((f) => f.type === "file").map((f) => f.name.toLowerCase()),
      );
      let idx = 1;
      while (idx < 1000) {
        const candidate = idx === 1 ? `untitled.${ext}` : `untitled-${idx}.${ext}`;
        if (!existingNames.has(candidate.toLowerCase())) return candidate;
        idx += 1;
      }
      return `untitled-${Date.now()}.${ext}`;
    },
    [files],
  );

  const handleCreateFileRequest = useCallback(
    (value, mode = "name", parentId = null) => {
      if (mode === "name") {
        const manual = String(value || "").trim();
        if (!manual) return;
        handleCreateFile(manual, parentId);
        return;
      }
      const languageId = String(value || "").toLowerCase();
      const extension = LANGUAGE_EXTENSIONS[languageId] || languageId || "txt";
      handleCreateFile(getNextUntitledName(extension), parentId);
    },
    [getNextUntitledName, handleCreateFile],
  );

  const handleSaveAll = useCallback(async () => {
    flushEditorBuffer();
    const mergedFiles = filesRef.current.map((f) =>
      f.id === activeTabIdRef.current
        ? { ...f, content: editorCodeRef.current, modifiedAt: new Date().toISOString() }
        : f,
    );
    setFiles(mergedFiles);
    if (workspacePath && isElectron) {
      const diskFiles = mergedFiles.filter((f) => f.type === "file" && f.fsPath);
      await Promise.all(
        diskFiles.map((f) => {
          // @ts-ignore
          return window.electronAPI.writeFile(f.fsPath, f.content || "");
        }),
      );
    }
    setOpenTabs((prev) => prev.map((tab) => ({ ...tab, modified: false })));
  }, [flushEditorBuffer, workspacePath, isElectron]);

  useEffect(() => {
    const onCreateFile = (event) => {
      const detail = event?.detail || {};
      handleCreateFileRequest(detail.language || "typescript", "language");
    };
    window.addEventListener("nx-code-create-file", onCreateFile);
    return () => {
      window.removeEventListener("nx-code-create-file", onCreateFile);
    };
  }, [handleCreateFileRequest]);

  const handleCreateFolder = useCallback(
    async (name, parentId = null) => {
      let fsPath = null;
      if (workspacePath && isElectron) {
        const parent = files.find((f) => f.id === parentId);
        const basePath = parent?.fsPath || workspacePath;
        // @ts-ignore
        const sep = window.electronAPI.platform === "win32" ? "\\" : "/";
        fsPath = `${basePath}${sep}${name}`;
        // @ts-ignore
        await window.electronAPI.mkdir(fsPath);
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
        // @ts-ignore
        const sep = window.electronAPI.platform === "win32" ? "\\" : "/";
        const parentPath = file.fsPath.substring(
          0,
          file.fsPath.lastIndexOf(sep),
        );
        newFsPath = `${parentPath}${sep}${newName}`;
        try {
          // @ts-ignore
          await window.electronAPI.rename(file.fsPath, newFsPath);
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
          // @ts-ignore
          await window.electronAPI.delete(file.fsPath);
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
          // @ts-ignore
          const content = await window.electronAPI.readFile(file.fsPath);
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
      editorCodeRef.current = newCode;

      setTabModified(activeTabId, true);

      if (codeCommitTimerRef.current) {
        window.clearTimeout(codeCommitTimerRef.current);
      }
      const activeId = activeTabIdRef.current;
      codeCommitTimerRef.current = window.setTimeout(() => {
        commitBufferToFile(activeId, editorCodeRef.current);
        codeCommitTimerRef.current = null;
      }, EDITOR_BUFFER_COMMIT_MS);

      // Save to disk if workspace file
      const activeFile = filesRef.current.find(
        (f) => f.id === activeTabIdRef.current,
      );
      if (activeFile && activeFile.fsPath) {
        if (autoSaveRef.current) clearTimeout(autoSaveRef.current);
        autoSaveRef.current = setTimeout(async () => {
          const currentTabId = activeTabIdRef.current;
          if (!currentTabId) return;
          const currentCode = editorCodeRef.current;
          commitBufferToFile(currentTabId, currentCode);
          const file = filesRef.current.find((f) => f.id === currentTabId);
          if (!file?.fsPath) return;
          // @ts-ignore
          await window.electronAPI.writeFile(file.fsPath, currentCode);
          setTabModified(currentTabId, false);
        }, WORKSPACE_AUTOSAVE_MS);
      } else if (settings.auto_save) {
        // Local storage auto-save
        if (autoSaveRef.current) clearTimeout(autoSaveRef.current);
        autoSaveRef.current = setTimeout(() => {
          const currentTabId = activeTabIdRef.current;
          if (!currentTabId) return;
          commitBufferToFile(currentTabId, editorCodeRef.current);
          setTabModified(currentTabId, false);
        }, LOCAL_AUTOSAVE_MS);
      }
    },
    [activeTabId, commitBufferToFile, setTabModified, settings.auto_save],
  );

  const handleSettingsChange = useCallback((newSettings) => {
    setSettings(newSettings);
  }, []);

  const handleResetSettings = useCallback(() => {
    if (confirm("Moechtest du wirklich alle Einstellungen zuruecksetzen?")) {
      setSettings(DEFAULT_SETTINGS);
      localStorage.removeItem(SETTINGS_STORAGE_KEY);
      window.location.reload();
    }
  }, []);

  const handleCommandPaletteAction = useCallback(
    (actionId, payload) => {
      const commandHandlers = {
        "open-file": () => handleFileSelect(payload),
        "new-file": () => handleCreateFileRequest("typescript", "language"),
        "open-folder": handleOpenFolder,
        "open-explorer": () => handleOpenWorkbenchPanel("explorer"),
        "open-search": () => handleOpenWorkbenchPanel("search"),
        "change-theme": handleOpenSettingsPanel,
        "toggle-terminal": handleToggleTerminalPanel,
        "open-problems": handleOpenProblemsPanel,
        "open-extensions": () => handleOpenWorkbenchPanel("extensions"),
        "open-account": () => handleOpenWorkbenchPanel("account"),
        "toggle-zen": handleToggleZenMode,
        "open-settings": handleOpenSettingsPanel,
        "toggle-sidebar": handleToggleSidebar,
        "github-sync": () => handleOpenWorkbenchPanel("git"),
        "focus-editor": handleFocusEditor,
      };

      commandHandlers[actionId]?.();
    },
    [
      handleCreateFileRequest,
      handleFileSelect,
      handleFocusEditor,
      handleOpenFolder,
      handleOpenProblemsPanel,
      handleOpenSettingsPanel,
      handleOpenWorkbenchPanel,
      handleToggleSidebar,
      handleToggleTerminalPanel,
      handleToggleZenMode,
    ],
  );

  const activeFile = files.find((f) => f.id === activeTabId);
  const currentCode = activeTabId ? editorCode : "";
  const activeTab = openTabs.find((tab) => tab.id === activeTabId);
  const modifiedTabsCount = useMemo(
    () => openTabs.filter((tab) => tab.modified).length,
    [openTabs],
  );
  const problemSummary = useMemo(() => getProblemSummary(problems), [problems]);
  const activePathLabel = useMemo(
    () => getRelativePathLabel(activeFile, workspacePath),
    [activeFile, workspacePath],
  );
  const workspaceLabel = workspacePath
    ? getPathBasename(workspacePath)
    : "Kein Workspace";
  const fileExtensionLabel = getFileExtensionLabel(activeFile);
  const statusStripVisible = settings.status_bar_visible !== false;
  const bottomPanelVisible = terminalOpen;
  const zenMode = Boolean(settings.zen_mode);
  const sidebarVisible = settings.sidebar_visible !== false;
  const sidebarSide = settings.sidebar_position === "right" ? "right" : "left";
  const sideRailVisible = !zenMode && sidebarVisible;
  const sidePanelVisible = Boolean(!showSettings && sideRailVisible && activePanel);
  const visibleActivePanel = sidePanelVisible ? activePanel : null;
  const shellModeLabel = getShellModeLabel({
    showSettings,
    zenMode,
    activePanel: visibleActivePanel,
  });
  const activePanelMeta = getPanelMeta(visibleActivePanel);
  const sidePanelClassName = getSidePanelClassName({
    compact: isCompactViewport,
  });
  const mainEditorClassName = getMainEditorClassName();
  const bottomPanelClassName = getBottomPanelClassName({
    compact: isCompactViewport,
  });

  return (
    <div
      className={`nx-code-shell h-screen min-h-0 flex flex-col overflow-hidden bg-transparent text-[#e5e7eb] font-sans ${isCompactViewport ? "nx-code-shell-compact" : ""}`}
    >
      <div className="nx-code-titlebar-wrap relative z-50 shrink-0">
        <TitleBar
          compact={isCompactViewport}
          onNewFile={() => handleCreateFileRequest("typescript", "language")}
          onSaveAll={handleSaveAll}
          onOpenFolder={handleOpenFolder}
          onToggleSidebar={handleToggleSidebar}
          onToggleSidebarVisibility={handleToggleSidebarVisibility}
          onToggleZenMode={handleToggleZenMode}
          onToggleTerminal={handleToggleTerminalPanel}
          onOpenCommandPalette={() => setCommandPaletteOpen(true)}
          onOpenSettings={handleOpenSettingsPanel}
          onFocusEditor={handleFocusEditor}
          sidebarVisible={sideRailVisible}
          zenMode={zenMode}
          terminalOpen={bottomPanelVisible}
          shellModeLabel={shellModeLabel}
          activePanelLabel={visibleActivePanel ? activePanelMeta.title : "Editor"}
          workspaceName={
            workspacePath ? workspacePath.split(/[\\/]/).pop() : null
          }
        />
      </div>

      <div
        className="nx-code-workbench flex-1 min-h-0 overflow-hidden relative"
        style={{ background: "rgba(0,0,0,0.08)" }}
      >
        <div className="flex h-full min-h-0 w-full overflow-hidden">
        {sideRailVisible && sidebarSide === "left" && (
            <div
              className={getRailClassName("left")}
              style={{
                background: "var(--nexus-panel-surface)",
                backdropFilter: "var(--nexus-panel-filter)",
                boxShadow: "var(--nexus-panel-outline)",
                order: 0,
              }}
            >
              <Sidebar
                activePanel={activePanel}
                setActivePanel={handleSidebarPanelChange}
                onOpenSettings={handleOpenSettingsPanel}
                side={sidebarSide}
                compact={isCompactViewport}
                problemCount={problems.length}
                controlStatus={controlStatus}
              />
            </div>
        )}

        {showSettings ? (
          <div
            className={`nx-code-settings-host flex-1 min-w-0 min-h-0 ${isCompactViewport ? "m-2 rounded-lg" : "m-3 rounded-lg"} overflow-hidden animate-in fade-in zoom-in duration-300 border border-white/10 nexus-panel-surface`}
            style={{
              background: "var(--nexus-panel-surface)",
              backdropFilter: "var(--nexus-panel-filter)",
              boxShadow: "var(--nexus-panel-outline)",
              order: 20,
            }}
          >
            <Suspense
              fallback={
                <div className="h-full w-full flex items-center justify-center text-xs text-zinc-400">
                  Settings werden geladen...
                </div>
              }
            >
              <SettingsPanel
                settings={settings}
                onSettingsChange={handleSettingsChange}
                onResetSettings={handleResetSettings}
                onClose={() => setShowSettings(false)}
              />
            </Suspense>
          </div>
        ) : (
          <>
            {/* Side Panels */}
            <AnimatePresence mode="wait">
              {sidePanelVisible && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ type: "tween", duration: 0.18, ease: [0.2, 0.7, 0.2, 1] }}
                  className={`nx-code-side-panel ${sidePanelClassName} z-30 min-h-0 overflow-hidden border-x border-white/5`}
                  style={{
                    position: isCompactViewport ? "absolute" : "relative",
                    top: isCompactViewport ? 0 : "auto",
                    right: isCompactViewport && sidebarSide === "right" ? "3.25rem" : "auto",
                    bottom: isCompactViewport ? 0 : "auto",
                    left: isCompactViewport && sidebarSide !== "right" ? "3.25rem" : "auto",
                    height: "100%",
                    width: isCompactViewport
                      ? "min(22rem, calc(100vw - 3.25rem))"
                      : undefined,
                    maxWidth: isCompactViewport
                      ? "calc(100vw - 3.25rem)"
                      : undefined,
                    flexShrink: isCompactViewport ? undefined : 0,
                    background: "var(--nexus-panel-surface)",
                    backdropFilter: "var(--nexus-panel-filter)",
                    boxShadow: isCompactViewport ? "0 18px 48px rgba(0,0,0,0.35)" : "none",
                    order: sidebarSide === "right" ? 30 : 5,
                    willChange: "opacity",
                  }}
                >
                  <SidePanelFrame
                    panelId={activePanel}
                    onClose={() => setActivePanel(null)}
                  >
                    {activePanel === "explorer" && (
                      <FileExplorer
                        files={files}
                        activeFileId={activeTabId}
                        onFileSelect={handleFileSelect}
                        onCreateFile={handleCreateFile}
                        onCreateFolder={handleCreateFolder}
                        onRenameFile={handleRenameFile}
                        onDeleteFile={handleDeleteFile}
                        onToggleFolder={handleToggleFolder}
                        onRefresh={handleRefreshWorkspace}
                        workspacePath={workspacePath}
                        isLoading={workspaceLoading}
                        error={workspaceError}
                      />
                    )}
                    {activePanel === "search" && (
                      <SearchPanel
                        files={files}
                        onFileSelect={handleFileSelect}
                      />
                    )}
                    {activePanel === "git" && <GitPanel files={files} />}
                    {activePanel === "debug" && (
                      <DebugPanel
                        activeFile={activeFile}
                        _code={currentCode}
                        problems={problems}
                      />
                    )}
                    {activePanel === "extensions" && (
                      <ExtensionsPanel
                        onInstalledChange={(installedList) => {
                          setSettings((prev) => ({
                            ...prev,
                            extensions_installed: Array.isArray(installedList)
                              ? installedList
                              : [],
                          }));
                        }}
                      />
                    )}
                    {activePanel === "account" && (
                      <AccountPanel
                        session={accountSession}
                        controlStatus={controlStatus}
                        onSaveSession={onSaveAccountSession}
                        onClearSession={onClearAccountSession}
                        onTestConnection={onTestAccountConnection}
                      />
                    )}
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
                  </SidePanelFrame>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Main Editor Area */}
            <div
              className={mainEditorClassName}
              style={{ order: 20 }}
            >
              <div
                className="h-11 border-b border-white/5 shrink-0"
                style={{ background: "rgba(0,0,0,0.16)" }}
              >
                <TabBar
                  tabs={openTabs}
                  activeTabId={activeTabId}
                  onTabSelect={setActiveTabId}
                  onTabClose={handleTabClose}
                  onCreateFile={handleCreateFileRequest}
                  onSaveAll={handleSaveAll}
                  onToggleTerminal={handleToggleTerminalPanel}
                  onOpenCommandPalette={() => setCommandPaletteOpen(true)}
                  bottomPanelOpen={bottomPanelVisible}
                  bottomTab={bottomTab}
                  compact={isCompactViewport}
                  zenMode={zenMode}
                />
              </div>

              <div className="flex-1 relative overflow-hidden flex flex-col min-h-0">
                <div className="nx-code-problems-float absolute top-3 right-3 z-40 flex gap-2">
                  {problems.length > 0 && (
                    <button
                      onClick={handleOpenProblemsPanel}
                      className="flex h-8 items-center gap-1.5 rounded-md border border-red-500/30 bg-red-500/10 px-2.5 text-[10px] font-semibold text-red-300 backdrop-blur-md transition-colors hover:bg-red-500/20"
                      title="Problems anzeigen"
                    >
                      <AlertCircle
                        size={14}
                        className="text-red-400"
                      />
                      <span className="hidden sm:inline">
                        {problems.length} Problems
                      </span>
                    </button>
                  )}
                </div>

                <ErrorBoundary>
                  {activeTabId && activeFile ? (
                    <Suspense
                      fallback={
                        <div className="flex h-full w-full items-center justify-center bg-transparent text-xs uppercase tracking-[0.18em] text-gray-600">
                          Editor wird geladen...
                        </div>
                      }
                    >
                      <CodeEditor
                        code={currentCode}
                        onChange={handleCodeChange}
                        fileName={activeFile.name}
                        filePath={activeFile.fsPath || null}
                        workspacePath={workspacePath}
                        onMarkersChange={(m) => setProblems(m)}
                        fontSize={settings.font_size || 14}
                        showLineNumbers={settings.line_numbers !== false}
                        tabSize={settings.tab_size || 4}
                        wordWrap={settings.word_wrap || false}
                        minimap={settings.minimap !== false}
                        settings={settings}
                      />
                    </Suspense>
                  ) : (
                    <WelcomeScreen
                      onNewFile={() =>
                        handleCreateFileRequest("typescript", "language")
                      }
                      onOpenFolder={handleOpenFolder}
                      onOpenSettings={handleOpenSettingsPanel}
                    />
                  )}
                </ErrorBoundary>
              </div>

              {(statusStripVisible || bottomPanelVisible) && (
                <div
                  className="nx-code-bottom-stack shrink-0 border-t border-white/5 min-h-0 overflow-hidden"
                  style={{
                    background: "var(--nexus-panel-surface)",
                    backdropFilter: "var(--nexus-panel-filter)",
                  }}
                >
                  {statusStripVisible && (
                    <div
                      className="nx-code-status-strip min-h-10 px-3 py-1.5 flex items-center gap-2 border-b border-white/5 overflow-hidden"
                      style={{ background: "rgba(0,0,0,0.18)" }}
                    >
                      <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-hidden">
                        <StatusItem
                          icon={Folder}
                          label="Workspace"
                          value={workspaceLabel}
                          title={workspacePath || "Kein Workspace ausgewaehlt"}
                          className={isCompactViewport ? "max-w-[8.5rem]" : "max-w-[14rem]"}
                        />
                        <StatusItem
                          icon={FileText}
                          label="Datei"
                          value={activePathLabel}
                          title={activePathLabel}
                          className="flex-1"
                        />
                        {!isCompactViewport && (
                          <StatusItem
                            icon={CircleDot}
                            label="Typ"
                            value={fileExtensionLabel}
                          />
                        )}
                        {modifiedTabsCount > 0 ? (
                          <StatusItem
                            tone="warning"
                            label="Ungespeichert"
                            value={`${modifiedTabsCount} modified`}
                            title="Geaenderte Tabs"
                            className="shrink-0"
                          />
                        ) : (
                          !isCompactViewport && (
                            <StatusItem
                              label="Saved"
                              value={activeTab ? "saved" : "idle"}
                            />
                          )
                        )}
                      </div>
                      <div className="flex shrink-0 items-center gap-1.5 pl-1">
                        <StatusItem
                          icon={XCircle}
                          tone={problemSummary.errors > 0 ? "danger" : "muted"}
                          label="Errors"
                          value={`${problemSummary.errors}`}
                          onClick={handleOpenProblemsPanel}
                          iconOnly={isCompactViewport}
                        />
                        <StatusItem
                          icon={AlertTriangle}
                          tone={problemSummary.warnings > 0 ? "warning" : "muted"}
                          label="Warnings"
                          value={`${problemSummary.warnings}`}
                          onClick={handleOpenProblemsPanel}
                          iconOnly={isCompactViewport}
                        />
                        <StatusItem
                          icon={TerminalSquare}
                          tone={bottomPanelVisible && bottomTab === "terminal" ? "active" : "muted"}
                          label="Terminal"
                          value="Terminal"
                          onClick={handleToggleTerminalPanel}
                          iconOnly={isCompactViewport}
                        />
                        <StatusItem
                          icon={AlertCircle}
                          tone={bottomPanelVisible && bottomTab === "problems" ? "active" : "muted"}
                          label="Problems"
                          value="Problems"
                          onClick={handleOpenProblemsPanel}
                          iconOnly={isCompactViewport}
                        />
                      </div>
                    </div>
                  )}
                  {bottomPanelVisible && bottomTab === "terminal" && (
                    <div className={bottomPanelClassName}>
                      <Terminal
                        isOpen
                        onToggle={handleToggleTerminalPanel}
                        activeFile={activeFile}
                        code={currentCode}
                        workspacePath={workspacePath}
                      />
                    </div>
                  )}
                  {bottomPanelVisible && bottomTab === "problems" && (
                    <div className={`${bottomPanelClassName} border-t border-white/5`}>
                      <ProblemsPanel
                        problems={problems}
                        onSelectProblem={(p) => {
                          if (!activeTabId) return;
                          setSettings((prev) => ({
                            ...prev,
                            _revealLine: {
                              line: p.startLineNumber,
                              col: p.startColumn,
                              timestamp: Date.now(),
                            },
                          }));
                        }}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            {sideRailVisible && sidebarSide === "right" && (
                <div
                  className={getRailClassName("right")}
                  style={{
                    background: "var(--nexus-panel-surface)",
                    backdropFilter: "var(--nexus-panel-filter)",
                    boxShadow: "var(--nexus-panel-outline)",
                    order: 40,
                  }}
                >
                  <Sidebar
                    activePanel={activePanel}
                    setActivePanel={handleSidebarPanelChange}
                    onOpenSettings={handleOpenSettingsPanel}
                    side={sidebarSide}
                    compact={isCompactViewport}
                    problemCount={problems.length}
                    controlStatus={controlStatus}
                  />
                </div>
              )}
          </>
        )}
        </div>
      </div>

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
