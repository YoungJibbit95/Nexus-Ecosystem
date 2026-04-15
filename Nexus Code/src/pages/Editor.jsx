import React, { Suspense, useState, useEffect, useCallback, useRef } from "react";
import { AlertTriangle, RotateCcw, AlertCircle } from "lucide-react";
import TitleBar from "../components/editor/TitleBar";
import Sidebar from "../components/editor/Sidebar";
import FileExplorer from "../components/editor/FileExplorer";
import TabBar from "../components/editor/TabBar";
import CodeEditor from "../components/editor/CodeEditor";
import Terminal from "../components/editor/Terminal";
import WelcomeScreen from "../components/editor/WelcomeScreen";
import SearchPanel from "../components/editor/SearchPanel";
import GitPanel from "../components/editor/GitPanel";
import DebugPanel from "../components/editor/DebugPanel";
import ExtensionsPanel from "../components/editor/ExtensionsPanel";
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
} from './editor/editorShared.jsx';
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
const loadSettingsPanel = () => import("../components/editor/SettingsPanel");
const SettingsPanel = React.lazy(() => loadSettingsPanel());

function isEditableEventTarget(target) {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const editable = target.closest(
    'input, textarea, [contenteditable="true"], [role="textbox"]',
  );
  return Boolean(editable);
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

function ensureReadableEditorTextColor(value) {
  const rgb = extractRgbTuple(value);
  if (!rgb) return "#e5e7eb";
  return relativeLuminance(rgb) < 0.38 ? "#e5e7eb" : value;
}

export default function Editor() {
  // @ts-ignore
  const isElectron = typeof window !== "undefined" && !!window.electronAPI;
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
  const [editorCode, setEditorCode] = useState("");
  const autoSaveRef = useRef(null);
  const filesPersistTimerRef = useRef(null);
  const settingsPersistTimerRef = useRef(null);
  const codeCommitTimerRef = useRef(null);
  const filesRef = useRef([]);
  const activeTabIdRef = useRef(null);
  const editorCodeRef = useRef("");
  const previousActiveTabRef = useRef(null);

  const [files, setFiles] = useState(() => {
    const stored = loadFilesFromStorage();
    return stored || DEFAULT_FILES;
  });

  const [settings, setSettings] = useState(loadSettingsFromStorage);
  const [workspacePath, setWorkspacePath] = useState(null);
  const initialPanelRef = useRef("explorer");
  const firstViewSwitchTrackedRef = useRef(false);
  const settingsOpenTrackedRef = useRef(false);

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
      // @ts-ignore
      const path = await window.electronAPI.openFolder();
      if (!path) return;

      setWorkspacePath(path);
      setOpenTabs([]);
      setActiveTabId(null);

      // @ts-ignore
      const entries = await window.electronAPI.readDir(path);
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
            language: entry.isDirectory
              ? null
              : name.split(".").pop() || "text",
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
            // @ts-ignore
            const entries = await window.electronAPI.readDir(folder.fsPath);
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
    const root = document.documentElement;
    const theme = THEMES[settings.theme] || THEMES.nexus_vibrant;
    const accent = settings.primary_accent || theme.accent;
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
        ? `blur(${Math.max(8, panelBlur)}px) saturate(185%) contrast(112%)`
        : panelMode === "fake-glass"
          ? `blur(${Math.max(6, panelBlur * 0.7)}px) saturate(150%)`
          : `blur(${Math.max(4, panelBlur)}px) saturate(135%)`;
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
    const safeEditorText = ensureReadableEditorTextColor(resolvedText);
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
      .nexus-panel-surface {
        background: var(--nexus-panel-surface) !important;
        backdrop-filter: var(--nexus-panel-filter);
        -webkit-backdrop-filter: var(--nexus-panel-filter);
        box-shadow: var(--nexus-panel-outline);
      }
      .monaco-editor,
      .monaco-editor .margin,
      .monaco-editor .monaco-editor-background,
      .monaco-editor-background,
      .monaco-editor .inputarea.ime-input,
      .monaco-editor .overflow-guard,
      .monaco-editor .minimap,
      .monaco-editor .scroll-decoration {
        background: transparent !important;
        background-color: transparent !important;
        background-image: none !important;
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

      // Ctrl+B — toggle sidebar
      if (hasPrimaryMod && key === "b") {
        e.preventDefault();
        setActivePanel((prev) => (prev ? null : "explorer"));
        return;
      }

      // Ctrl+` — toggle terminal
      if (hasPrimaryMod && e.key === "`") {
        e.preventDefault();
        setTerminalOpen((prev) => !prev);
        return;
      }

      // Ctrl+Shift+` — open terminal
      if (hasPrimaryMod && e.shiftKey && e.key === "`") {
        e.preventDefault();
        setTerminalOpen(true);
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
        setShowSettings(true);
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
  }, [activeTabId, handleTabClose, setTabModified]);

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
          handleCreateFileRequest("typescript", "language");
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
    [handleCreateFileRequest, handleFileSelect],
  );

  const activeFile = files.find((f) => f.id === activeTabId);
  const currentCode = activeTabId ? editorCode : "";

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-transparent text-[#e5e7eb] font-sans">
      <TitleBar
        onNewFile={() => handleCreateFileRequest("typescript", "language")}
        onSaveAll={handleSaveAll}
        onOpenFolder={handleOpenFolder}
        onToggleSidebar={handleToggleSidebar}
        onToggleSidebarVisibility={handleToggleSidebarVisibility}
        onToggleZenMode={handleToggleZenMode}
        onToggleTerminal={() => setTerminalOpen(!terminalOpen)}
        onOpenCommandPalette={() => setCommandPaletteOpen(true)}
        onOpenSettings={() => setShowSettings(true)}
        workspaceName={
          workspacePath ? workspacePath.split(/[\\/]/).pop() : null
        }
      />

      <div className="flex-1 flex overflow-hidden min-h-0">
        {!settings.zen_mode &&
          settings.sidebar_visible &&
          settings.sidebar_position === "left" && (
            <div
              className="relative z-40 h-full min-h-0 overflow-visible flex flex-col border-r border-white/5 shrink-0 nexus-panel-surface"
              style={{
                background: "var(--nexus-panel-surface)",
                backdropFilter: "var(--nexus-panel-filter)",
                boxShadow: "var(--nexus-panel-outline)",
              }}
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
            className="flex-1 m-4 rounded-2xl overflow-hidden animate-in fade-in zoom-in duration-300 border border-white/5 nexus-panel-surface"
            style={{
              background: "var(--nexus-panel-surface)",
              backdropFilter: "var(--nexus-panel-filter)",
              boxShadow: "var(--nexus-panel-outline)",
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
              {!settings.zen_mode && activePanel && (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  className="relative z-20 w-72 min-h-0 backdrop-blur-xl border-r border-white/5 overflow-visible"
                  style={{ background: "rgba(255,255,255,0.01)", willChange: "transform, opacity" }}
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
                      workspacePath={workspacePath}
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
                </motion.div>
              )}
            </AnimatePresence>

            {/* Main Editor Area */}
            <div className="flex-1 flex flex-col min-w-0 min-h-0 bg-transparent">
              <div
                className="h-9 backdrop-blur-md border-b border-white/5 shrink-0"
                style={{ background: "rgba(0,0,0,0.2)" }}
              >
                <TabBar
                  tabs={openTabs}
                  activeTabId={activeTabId}
                  onTabSelect={setActiveTabId}
                  onTabClose={handleTabClose}
                  onCreateFile={handleCreateFileRequest}
                  onSaveAll={handleSaveAll}
                  onToggleTerminal={() => setTerminalOpen((prev) => !prev)}
                  onOpenCommandPalette={() => setCommandPaletteOpen(true)}
                />
              </div>

              <div className="flex-1 relative overflow-hidden flex flex-col min-h-0">
                <div className="absolute top-4 right-4 z-50 flex gap-2">
                  {problems.length > 0 && (
                    <button
                      onClick={() => setActivePanel("problems")}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-full backdrop-blur-md transition-all group"
                    >
                      <AlertCircle
                        size={14}
                        className="text-red-500 group-hover:scale-110 transition-transform"
                      />
                      <span className="text-[10px] font-bold text-red-500">
                        {problems.length} Problems
                      </span>
                    </button>
                  )}
                </div>

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
                      minimap={settings.minimap !== false}
                      settings={settings}
                    />
                  ) : (
                    <WelcomeScreen
                      onNewFile={() =>
                        handleCreateFileRequest("typescript", "language")
                      }
                      onOpenFolder={handleOpenFolder}
                      onOpenSettings={() => setShowSettings(true)}
                    />
                  )}
                </ErrorBoundary>
              </div>

              {settings.status_bar_visible !== false && (
                <div
                  className="shrink-0 border-t border-white/5 min-h-0"
                  style={{
                    background: "var(--nexus-panel-surface)",
                    backdropFilter: "var(--nexus-panel-filter)",
                  }}
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

            {!settings.zen_mode &&
              settings.sidebar_visible &&
              settings.sidebar_position === "right" && (
                <div
                  className="relative z-40 h-full min-h-0 overflow-visible flex flex-col border-l border-white/5 backdrop-blur-xl shrink-0 nexus-panel-surface"
                  style={{
                    background: "var(--nexus-panel-surface)",
                    backdropFilter: "var(--nexus-panel-filter)",
                    boxShadow: "var(--nexus-panel-outline)",
                  }}
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
