import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

export const FILES_STORAGE_KEY = "nexus-code-files";
export const SETTINGS_STORAGE_KEY = "nexus-code-settings";

let _idCounter = 0;
export const generateId = () => {
  return "file_" + Date.now() + "_" + ++_idCounter;
};

export const BACKGROUNDS = {
  nexus_dark: {
    type: "solid",
    value: "#03030b",
    surface: "#060614",
    border: "rgba(128,0,255,0.15)",
  },
  neon_ultra: {
    type: "gradient",
    value: "linear-gradient(135deg, #050010 0%, #1a0033 100%)",
    surface: "#0a0020",
    border: "rgba(255,0,255,0.2)",
  },
  ocean_wave: {
    type: "gradient",
    value: "linear-gradient(135deg, #000814 0%, #001d3d 100%)",
    surface: "#001233",
    border: "rgba(0,187,249,0.2)",
  },
  midnight_purple: {
    type: "gradient",
    value: "radial-gradient(circle at center, #1a0b2e 0%, #03030b 100%)",
    surface: "#11071f",
    border: "rgba(168,85,247,0.2)",
  },
  cyber_sunset: {
    type: "gradient",
    value: "linear-gradient(135deg, #120458 0%, #ff0055 100%)",
    surface: "rgba(18,4,88,0.5)",
    border: "rgba(255,0,85,0.3)",
  },
  dracula: {
    type: "solid",
    value: "#282a36",
    surface: "#343746",
    border: "rgba(189,147,249,0.2)",
  },
  void: {
    type: "solid",
    value: "#000000",
    surface: "#0a0a0a",
    border: "rgba(255,255,255,0.1)",
  },
};

export const THEMES = {
  nexus_vibrant: {
    bg_type: "gradient",
    bg_value: "linear-gradient(135deg, #020205 0%, #0c0514 100%)",
    surface: "rgba(12, 5, 20, 0.6)",
    border: "rgba(128, 0, 255, 0.2)",
    text: "#e5e7eb",
    muted: "#6b7280",
    accent: "#8000ff",
    accent2: "#3b82f6",
    glow: "rgba(128,0,255,0.4)",
    selection: "rgba(128,0,255,0.2)",
    comment: "#6a9955",
    keyword: "#c678dd",
    string: "#98c379",
    number: "#d19a66",
    function: "#61afef",
    variable: "#e06c75",
  },
  neon_pink: {
    bg_type: "gradient",
    bg_value: "linear-gradient(135deg, #050010 0%, #1a0033 100%)",
    surface: "rgba(10, 0, 32, 0.6)",
    border: "rgba(255,0,255,0.2)",
    text: "#ffffff",
    muted: "#707070",
    accent: "#ff00ff",
    accent2: "#00ffff",
    glow: "rgba(255,0,255,0.5)",
    selection: "#4b1e4b",
    comment: "#ff00ff80",
    keyword: "#00ffff",
    string: "#ffff00",
    number: "#ff00ff",
    function: "#ff00ff",
    variable: "#ffffff",
  },
  ocean_light: {
    bg_type: "gradient",
    bg_value: "linear-gradient(135deg, #000814 0%, #001d3d 100%)",
    surface: "rgba(0, 18, 51, 0.6)",
    border: "rgba(0,187,249,0.2)",
    text: "#eef2ff",
    muted: "#64748b",
    accent: "#0ea5e9",
    accent2: "#6366f1",
    glow: "rgba(14,165,233,0.4)",
    selection: "#1e3a8a",
    comment: "#94a3b8",
    keyword: "#0ea5e9",
    string: "#10b981",
    number: "#f59e0b",
    function: "#6366f1",
    variable: "#f43f5e",
  },
  midnight_mystery: {
    bg_type: "gradient",
    bg_value: "radial-gradient(circle at center, #1a0b2e 0%, #03030b 100%)",
    surface: "rgba(17, 7, 31, 0.6)",
    border: "rgba(168,85,247,0.2)",
    text: "#f3f4f6",
    muted: "#71717a",
    accent: "#a855f7",
    accent2: "#6d28d9",
    glow: "rgba(168,85,247,0.4)",
    selection: "#3b0764",
    comment: "#a78bfa",
    keyword: "#d8b4fe",
    string: "#fbcfe8",
    number: "#e9d5ff",
    function: "#a78bfa",
    variable: "#d8b4fe",
  },
  dracula_classic: {
    bg_type: "solid",
    bg_value: "#282a36",
    surface: "rgba(52, 55, 70, 0.8)",
    border: "rgba(189,147,249,0.2)",
    text: "#f8f8f2",
    muted: "#6272a4",
    accent: "#bd93f9",
    accent2: "#ff79c6",
    glow: "rgba(189,147,249,0.4)",
    selection: "#44475a",
    comment: "#6272a4",
    keyword: "#ff79c6",
    string: "#f1fa8c",
    number: "#bd93f9",
    function: "#50fa7b",
    variable: "#ffb86c",
  },
  void_pitch: {
    bg_type: "solid",
    bg_value: "#000000",
    surface: "rgba(10, 10, 10, 0.8)",
    border: "rgba(255,255,255,0.1)",
    text: "#ffffff",
    muted: "#555555",
    accent: "#ffffff",
    accent2: "#333333",
    glow: "rgba(255,255,255,0.2)",
    selection: "#333333",
    comment: "#888888",
    keyword: "#ffffff",
    string: "#aaaaaa",
    number: "#eeeeee",
    function: "#dddddd",
    variable: "#ffffff",
  },
};

export const DEFAULT_FILES = [];

export const DEFAULT_SETTINGS = {
  theme: "nexus_vibrant",
  background: "nexus_dark",
  panel_background_mode: "blur",
  glow_renderer: "css",
  panel_blur_strength: 22,
  panel_glow_outline: true,
  font_size: 14,
  font_family: "JetBrains Mono",
  tab_size: 4,
  word_wrap: false,
  minimap: true,
  line_numbers: true,
  auto_save: true,
  line_height: 1.6,
  primary_accent: "#8000ff",
  secondary_accent: "#0033ff",
  render_whitespace: "none",
  smooth_caret: true,
  format_on_paste: true,
  sticky_scroll: false,
  cursor_style: "line",
  cursor_blinking: "solid",
  line_highlight: "all",
  bracket_colorization: true,
  font_ligatures: true,
  sidebar_position: "left",
  status_bar_visible: true,
  sidebar_visible: true,
  zen_mode: false,
  font_weight: "400",
};

export function loadFilesFromStorage() {
  try {
    const stored = localStorage.getItem(FILES_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) return parsed.filter((f) => !!f);
    }
  } catch {}
  return null;
}

export function saveFilesToStorage(files) {
  try {
    localStorage.setItem(FILES_STORAGE_KEY, JSON.stringify(files));
  } catch {}
}

/* ─── Error Boundary ─────────────────────────────────────────────────── */

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Editor Crash:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-[#03030b]">
          <div className="w-16 h-16 rounded-3xl bg-red-500/10 flex items-center justify-center mb-6 border border-red-500/20">
            <AlertTriangle size={32} className="text-red-500" />
          </div>
          <h1 className="text-xl font-bold text-white mb-2">
            Nexus Code is abgestürzt
          </h1>
          <p className="text-gray-500 text-sm max-w-md mb-8">
            Ein unerwarteter Fehler ist aufgetreten:{" "}
            {this.state.error?.message || "Unbekannter Fehler"}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="flex items-center gap-2 px-6 py-2.5 bg-white/5 hover:bg-white/10 rounded-xl transition-all border border-white/10 text-white font-medium"
          >
            <RotateCcw size={16} /> Neustarten
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

/* ─── Storage Helpers ────────────────────────────────────────────────── */

export function loadSettingsFromStorage() {
  try {
    const stored = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (stored) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
    }
  } catch {}
  return DEFAULT_SETTINGS;
}

export function saveSettingsToStorage(settings) {
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch {}
}
