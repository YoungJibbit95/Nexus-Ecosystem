import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  safeJsonParse,
  safeStorageRemove,
  safeStorageSet,
  type SettingsResetScope,
} from "@nexus/core/settings";
import { AnimatePresence, motion } from "framer-motion";
import {
  Save,
  Download,
  Upload,
  Search,
} from "lucide-react";
import { useTheme } from "../../store/themeStore";
import { useTerminal } from "../../store/terminalStore";
import { hexToRgb } from "../../lib/utils";
import { buildMotionRuntime } from "../../lib/motionEngine";
import { MODULES } from "./settingsConstants";
import {
  GlowRendererMode,
  ModuleId,
  RendererMode,
} from "./settingsTypes";
import { SettingsModulePanels } from "./SettingsModulePanels";
import {
  applyThemeTransferPayload,
  buildThemeTransferPayload,
  parseThemeTransferPayload,
} from "./themeTransfer";
import {
  exportSettingsSnapshotFromTheme,
  importSettingsSnapshotIntoTheme,
  resetThemeSettingsSection,
} from "./settingsBridge";
type ThemeTransferFeedback = {
  kind: "success" | "partial" | "error";
  title: string;
  details: string[];
  fileName?: string;
};

export function SettingsShell({
  onOpenWalkthrough,
}: { onOpenWalkthrough?: () => void } = {}) {
  const t = useTheme();
  const terminal = useTerminal();
  const motionRuntime = useMemo(() => buildMotionRuntime(t), [t]);
  const rgb = hexToRgb(t.accent);
  const [module, setModule] = useState<ModuleId>("appearance");
  const [msg, setMsg] = useState<string | null>(null);
  const [presetEditorOpen, setPresetEditorOpen] = useState(false);
  const [presetNameDraft, setPresetNameDraft] = useState("");
  const [moduleQuery, setModuleQuery] = useState("");
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  const [showExperimentalSettings, setShowExperimentalSettings] = useState(false);
  const [transferFeedback, setTransferFeedback] =
    useState<ThemeTransferFeedback | null>(null);
  const [lastMaintenanceAction, setLastMaintenanceAction] = useState<
    string | null
  >(null);
  const toastTimerRef = useRef<number | null>(null);

  const panelRenderer: RendererMode = t.glassmorphism.panelRenderer;
  const glowRenderer: GlowRendererMode = t.glassmorphism.glowRenderer;

  const downloadJson = (fileName: string, payload: string) => {
    const blob = new Blob([payload], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    window.setTimeout(() => {
      URL.revokeObjectURL(url);
      a.remove();
    }, 0);
  };
  const toast = (text: string) => {
    if (toastTimerRef.current !== null) {
      window.clearTimeout(toastTimerRef.current);
    }
    setMsg(text);
    toastTimerRef.current = window.setTimeout(() => {
      setMsg(null);
      toastTimerRef.current = null;
    }, 1600);
  };

  useEffect(
    () => () => {
      if (toastTimerRef.current !== null) {
        window.clearTimeout(toastTimerRef.current);
      }
    },
    [],
  );

  const exportTheme = () => {
    const payload = JSON.stringify(buildThemeTransferPayload(t), null, 2);
    downloadJson("nexus-theme-v6.json", payload);
    setTransferFeedback({
      kind: "success",
      title: "Theme exportiert",
      details: [
        "Datei: nexus-theme-v6.json",
        "Export enthält stabile Settings plus optionale Advanced-Felder.",
      ],
    });
    toast("Theme exportiert");
  };

  const importTheme = (file: File) => {
    if (!file.name.toLowerCase().endsWith(".json")) {
      setTransferFeedback({
        kind: "error",
        title: "Import fehlgeschlagen",
        fileName: file.name,
        details: ["Nur JSON-Dateien sind erlaubt."],
      });
      toast("Nur JSON-Dateien sind erlaubt");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setTransferFeedback({
        kind: "error",
        title: "Import fehlgeschlagen",
        fileName: file.name,
        details: ["Datei ist groesser als 2MB und wurde nicht geladen."],
      });
      toast("Theme-Datei zu gross");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = safeJsonParse<unknown>(String(reader.result || "{}"), null);
        if (!data) {
          setTransferFeedback({
            kind: "error",
            title: "Import fehlgeschlagen",
            fileName: file.name,
            details: ["Datei konnte nicht als gueltiges JSON gelesen werden."],
          });
          toast("Import fehlgeschlagen");
          return;
        }
        const parsed = parseThemeTransferPayload(data);
        if (!parsed.ok) {
          setTransferFeedback({
            kind: "error",
            title: "Import fehlgeschlagen",
            fileName: file.name,
            details: ["message" in parsed ? parsed.message : "Theme-Datei ungueltig"],
          });
          toast("message" in parsed ? parsed.message : "Theme-Datei ungueltig");
          return;
        }
        applyThemeTransferPayload(t, parsed.payload, {
          includeReleaseFrozen: false,
        });
        if (parsed.warnings.length > 0) {
          console.warn("[Settings] Theme import warnings:", parsed.warnings);
          setTransferFeedback({
            kind: "partial",
            title: "Theme importiert mit Hinweisen",
            fileName: file.name,
            details: parsed.warnings,
          });
        } else {
          setTransferFeedback({
            kind: "success",
            title: "Theme importiert",
            fileName: file.name,
            details: [
              "Alle erkannten Felder wurden übernommen.",
              "Release-frozen Zonen wurden sicher respektiert.",
            ],
          });
        }
        toast(
          parsed.partial
            ? `Theme importiert (${parsed.warnings.length || 1} Hinweis${parsed.warnings.length === 1 ? "" : "e"}, sichere Fallbacks aktiv; Details in Konsole)`
            : "Theme importiert",
        );
      } catch {
        setTransferFeedback({
          kind: "error",
          title: "Import fehlgeschlagen",
          fileName: file.name,
          details: ["Datei konnte nicht als gültiges JSON gelesen werden."],
        });
        toast("Import fehlgeschlagen");
      }
    };
    reader.onerror = () => {
      setTransferFeedback({
        kind: "error",
        title: "Import fehlgeschlagen",
        fileName: file.name,
        details: ["Datei konnte vom Browser nicht gelesen werden."],
      });
      toast("Import fehlgeschlagen");
    };
    reader.readAsText(file);
  };

  const exportSettings = () => {
    downloadJson("nexus-settings-v1.json", exportSettingsSnapshotFromTheme(t, "desktop"));
    setTransferFeedback({
      kind: "success",
      title: "Settings exportiert",
      details: [
        "Datei: nexus-settings-v1.json",
        "Export nutzt das kanonische Settings-Schema.",
      ],
    });
    toast("Settings exportiert");
  };

  const importSettings = (file: File) => {
    if (!file.name.toLowerCase().endsWith(".json")) {
      setTransferFeedback({
        kind: "error",
        title: "Settings Import fehlgeschlagen",
        fileName: file.name,
        details: ["Nur JSON-Dateien sind erlaubt."],
      });
      toast("Nur JSON-Dateien sind erlaubt");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setTransferFeedback({
        kind: "error",
        title: "Settings Import fehlgeschlagen",
        fileName: file.name,
        details: ["Datei ist groesser als 2MB und wurde nicht geladen."],
      });
      toast("Settings-Datei zu gross");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const data = safeJsonParse<unknown>(String(reader.result || "{}"), null);
      if (!data) {
        setTransferFeedback({
          kind: "error",
          title: "Settings Import fehlgeschlagen",
          fileName: file.name,
          details: ["Datei konnte nicht als gueltiges JSON gelesen werden."],
        });
        toast("Settings Import fehlgeschlagen");
        return;
      }
      const parsed = importSettingsSnapshotIntoTheme(t, data, "desktop");
      if ("errors" in parsed) {
        setTransferFeedback({
          kind: "error",
          title: "Settings Import fehlgeschlagen",
          fileName: file.name,
          details: parsed.errors.map((issue) => issue.path + ": " + issue.message),
        });
        toast("Settings Import fehlgeschlagen");
        return;
      }
      setTransferFeedback({
        kind: parsed.warnings.length ? "partial" : "success",
        title: parsed.warnings.length
          ? "Settings importiert mit Hinweisen"
          : "Settings importiert",
        fileName: file.name,
        details: parsed.warnings.length
          ? parsed.warnings.map((issue) => issue.path + ": " + issue.message)
          : ["Alle validierten Settings wurden angewendet."],
      });
      toast(parsed.warnings.length ? "Settings importiert mit Fallbacks" : "Settings importiert");
    };
    reader.onerror = () => {
      setTransferFeedback({
        kind: "error",
        title: "Settings Import fehlgeschlagen",
        fileName: file.name,
        details: ["Datei konnte vom Browser nicht gelesen werden."],
      });
      toast("Settings Import fehlgeschlagen");
    };
    reader.readAsText(file);
  };

  const resetSettings = (scope: SettingsResetScope, label: string) => {
    resetThemeSettingsSection(t, scope, "desktop");
    setLastMaintenanceAction(label + " zurueckgesetzt");
    toast(label + " zurueckgesetzt");
  };
  const commitSaveThemeSlot = () => {
    const name = presetNameDraft.trim();
    if (!name) return;
    const safeName = name.toLowerCase().replace(/[^a-z0-9-_\s]/g, "").trim();
    if (!safeName) {
      toast("Ungültiger Preset-Name");
      return;
    }
    const key = `nx-theme-${safeName}`;
    const payload = JSON.stringify(buildThemeTransferPayload(t));
    const stored = safeStorageSet(key, payload);
    if (!stored) {
      toast("Preset konnte nicht gespeichert werden");
      return;
    }
    setPresetEditorOpen(false);
    setPresetNameDraft("");
    toast(`Preset gespeichert: ${safeName}`);
  };

  const openSaveThemeSlot = () => {
    setPresetNameDraft("");
    setPresetEditorOpen(true);
  };

  const clearSpotlight = () => {
    safeStorageRemove("nx-spotlight-pins-v1");
    safeStorageRemove("nx-spotlight-recents-v1");
    window.dispatchEvent(new CustomEvent("nx-spotlight-storage-updated"));
    setLastMaintenanceAction("Spotlight Cache gelöscht");
    toast("Spotlight Daten gelöscht");
  };

  const resetDashboardLayout = () => {
    safeStorageRemove("nx-dashboard-layout-v2");
    setLastMaintenanceAction("Dashboard Layout zurückgesetzt");
    toast("Dashboard Layout zurückgesetzt");
  };

  const clearTerminalWorkspace = () => {
    terminal.clearHistory();
    useTerminal.setState({
      macros: {},
      recordingMacro: null,
      undoStack: [],
      redoStack: [],
    });
    setLastMaintenanceAction("Terminal Workspace bereinigt");
    toast("Terminal Workspace bereinigt");
  };

  const toggleAdvancedSettings = () => {
    setShowAdvancedSettings((value) => {
      const next = !value;
      if (!next) setShowExperimentalSettings(false);
      return next;
    });
  };

  const toggleExperimentalSettings = () => {
    setShowAdvancedSettings((value) => (value ? value : true));
    setShowExperimentalSettings((value) => !value);
  };

  const activeModule = MODULES.find((m) => m.id === module);
  const normalizedModuleQuery = moduleQuery.trim().toLowerCase();
  const visibleModules = useMemo(
    () =>
      normalizedModuleQuery
        ? MODULES.filter((item) =>
            `${item.id} ${item.title} ${item.desc}`
              .toLowerCase()
              .includes(normalizedModuleQuery),
          )
        : MODULES,
    [normalizedModuleQuery],
  );
  const settingsSummary = [
    { label: "Mode", value: t.mode },
    { label: "Density", value: t.qol?.panelDensity ?? "comfortable" },
    { label: "Motion", value: t.qol?.motionProfile ?? "balanced" },
    { label: "Panel", value: panelRenderer },
    { label: "Bg", value: t.background?.mode ?? "solid" },
    { label: "Glass", value: `${Math.round((t.background?.overlayOpacity ?? 0.7) * 100)}%` },
  ];

  return (
    <div
      className="nx-settings-v6 nx-release-view"
      style={{
        display: "flex",
        gap: 10,
        minHeight: 0,
        height: "100%",
        padding: 12,
        fontFamily: t.globalFont,
        background:
          "radial-gradient(900px circle at 12% -18%, rgba(var(--nx-shell-accent-rgb, 34, 211, 238), 0.08), transparent 64%), transparent",
        ["--nx-settings-accent-rgb" as any]: rgb,
      }}
    >
      <aside
        className="nx-settings-sidebar"
        style={{
          width: "clamp(236px, 24vw, 290px)",
          borderRadius: 20,
          border: "1px solid rgba(255,255,255,0.12)",
          background: "var(--nx-panel-bg, rgba(14,18,30,0.42))",
          backgroundSize: "var(--nx-panel-bg-size, 100% 100%)",
          backgroundBlendMode: "var(--nx-panel-bg-blend, normal)",
          boxShadow:
            t.mode === "dark"
              ? "0 14px 38px rgba(0,0,0,0.22)"
              : "0 14px 30px rgba(40,52,78,0.14)",
          backdropFilter: `blur(${Math.max(8, Math.min(26, t.blur.sidebarBlur))}px) saturate(${Math.max(120, Math.min(220, t.glassmorphism.saturation))}%)`,
          WebkitBackdropFilter: `blur(${Math.max(8, Math.min(26, t.blur.sidebarBlur))}px) saturate(${Math.max(120, Math.min(220, t.glassmorphism.saturation))}%)`,
          padding: "12px 10px",
          display: "flex",
          flexDirection: "column",
          minHeight: 0,
        }}
      >
        <div
          style={{
            padding: "4px 8px 10px",
            borderBottom: "1px solid rgba(255,255,255,0.08)",
            marginBottom: 8,
          }}
        >
          <div
            style={{
              fontSize: 10,
              opacity: 0.5,
              textTransform: "uppercase",
              letterSpacing: 1,
            }}
          >
            Settings
          </div>
          <div style={{ fontSize: 16, fontWeight: 800, marginTop: 2 }}>
            ⚙️ Nexus Settings v6
          </div>
          <div style={{ fontSize: 11, opacity: 0.55, marginTop: 2 }}>
            Erst Preset wählen, dann sauber feinjustieren.
          </div>
        </div>

        <div
          className="nx-settings-summary"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
            gap: 6,
            marginBottom: 8,
          }}
        >
          {settingsSummary.map((entry) => (
            <div
              key={entry.label}
              style={{
                minWidth: 0,
                borderRadius: 9,
                border: "1px solid rgba(255,255,255,0.1)",
                background: "rgba(255,255,255,0.035)",
                padding: "6px 7px",
              }}
            >
              <div
                style={{
                  fontSize: 9,
                  opacity: 0.45,
                  textTransform: "uppercase",
                  letterSpacing: 0.6,
                }}
              >
                {entry.label}
              </div>
              <div
                style={{
                  marginTop: 2,
                  fontSize: 11,
                  fontWeight: 780,
                  color: entry.label === "Mode" ? t.accent : "inherit",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {entry.value}
              </div>
            </div>
          ))}
        </div>

        <label
          className="nx-settings-module-search"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 7,
            borderRadius: 11,
            border: "1px solid rgba(255,255,255,0.12)",
            background: "rgba(255,255,255,0.045)",
            padding: "8px 9px",
            marginBottom: 8,
          }}
        >
          <Search size={13} style={{ opacity: 0.5, flexShrink: 0 }} />
          <input
            value={moduleQuery}
            onChange={(event) => setModuleQuery(event.target.value)}
            placeholder="Settings suchen..."
            style={{
              width: "100%",
              minWidth: 0,
              border: "none",
              outline: "none",
              background: "transparent",
              color: "inherit",
              fontSize: 12,
            }}
          />
        </label>

        <div
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: 4,
            paddingRight: 4,
          }}
        >
          {visibleModules.map((item) => {
            const active = item.id === module;
            return (
              <button
                key={item.id}
                onClick={() => setModule(item.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  borderRadius: 11,
                  border: `1px solid ${active ? `rgba(${rgb},0.34)` : "transparent"}`,
                  background: active ? `rgba(${rgb},0.14)` : "transparent",
                  color: active ? t.accent : "inherit",
                  padding: "9px 9px",
                  textAlign: "left",
                  cursor: "pointer",
                }}
              >
                <span
                  style={{ display: "inline-flex", opacity: active ? 1 : 0.8 }}
                >
                  {item.icon}
                </span>
                <span
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    lineHeight: 1.25,
                  }}
                >
                  <span style={{ fontSize: 13, fontWeight: 700 }}>
                    {item.title}
                  </span>
                  <span style={{ fontSize: 10, opacity: active ? 0.78 : 0.5 }}>
                    {item.desc}
                  </span>
                </span>
              </button>
            );
          })}
          {visibleModules.length === 0 ? (
            <div
              style={{
                borderRadius: 11,
                border: "1px dashed rgba(255,255,255,0.14)",
                background: "rgba(255,255,255,0.025)",
                padding: "12px 10px",
                fontSize: 11,
                lineHeight: 1.45,
                opacity: 0.62,
              }}
            >
              Kein Settings-Modul passt zur Suche.
            </div>
          ) : null}
        </div>

        <div
          style={{
            borderTop: "1px solid rgba(255,255,255,0.08)",
            marginTop: 8,
            paddingTop: 8,
            display: "grid",
            gap: 6,
          }}
        >
          <button
            onClick={openSaveThemeSlot}
            style={{
              padding: "8px 10px",
              fontSize: 12,
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              gap: 7,
              border: `1px solid rgba(${rgb},0.3)`,
              borderRadius: 10,
              width: "100%",
              background: `rgba(${rgb},0.16)`,
              color: t.accent,
              cursor: "pointer",
            }}
          >
            <Save size={12} /> Preset speichern
          </button>
          <button
            onClick={exportTheme}
            style={{
              padding: "8px 10px",
              fontSize: 12,
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              gap: 7,
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 10,
              width: "100%",
              background: "rgba(255,255,255,0.04)",
              color: "inherit",
              cursor: "pointer",
            }}
          >
            <Download size={12} /> Export JSON
          </button>
          <label
            style={{
              borderRadius: 10,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(255,255,255,0.04)",
              color: "inherit",
              padding: "8px 10px",
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 7,
            }}
          >
            <Upload size={12} /> Import JSON
            <input
              type="file"
              accept=".json"
              style={{ display: "none" }}
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) importTheme(file);
                event.currentTarget.value = "";
              }}
            />
          </label>
          <div
            style={{
              fontSize: 10,
              opacity: 0.58,
              lineHeight: 1.45,
              borderRadius: 9,
              border: "1px solid rgba(255,255,255,0.1)",
              background: "rgba(255,255,255,0.03)",
              padding: "7px 9px",
            }}
          >
            Import nutzt Schema-Guard + Allowlist. Toolbar Mode/Position/Sichtbarkeit werden übernommen, eingefrorene Engine-Felder bleiben unverändert.
          </div>
          {transferFeedback ? (
            <div
              style={{
                borderRadius: 9,
                border:
                  transferFeedback.kind === "error"
                    ? "1px solid rgba(255,69,58,0.3)"
                    : transferFeedback.kind === "partial"
                      ? "1px solid rgba(255,159,10,0.32)"
                      : "1px solid rgba(48,209,88,0.28)",
                background:
                  transferFeedback.kind === "error"
                    ? "rgba(255,69,58,0.08)"
                    : transferFeedback.kind === "partial"
                      ? "rgba(255,159,10,0.08)"
                      : "rgba(48,209,88,0.08)",
                padding: "8px 9px",
                fontSize: 10,
                lineHeight: 1.45,
              }}
            >
              <div style={{ fontWeight: 800, marginBottom: 3 }}>
                {transferFeedback.title}
              </div>
              {transferFeedback.fileName ? (
                <div style={{ opacity: 0.72, marginBottom: 3 }}>
                  Datei: {transferFeedback.fileName}
                </div>
              ) : null}
              {transferFeedback.details.slice(0, 3).map((detail) => (
                <div key={detail} style={{ opacity: 0.84 }}>
                  • {detail}
                </div>
              ))}
            </div>
          ) : null}
          {lastMaintenanceAction ? (
            <div
              style={{
                fontSize: 10,
                opacity: 0.68,
                lineHeight: 1.4,
                borderRadius: 9,
                border: "1px solid rgba(255,255,255,0.1)",
                background: "rgba(255,255,255,0.03)",
                padding: "7px 9px",
              }}
            >
              Letzte Maintenance-Aktion: <strong>{lastMaintenanceAction}</strong>
            </div>
          ) : null}
          {presetEditorOpen ? (
            <div
              style={{
                borderRadius: 10,
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(255,255,255,0.03)",
                padding: 10,
                display: "grid",
                gap: 8,
              }}
            >
              <div style={{ fontSize: 11, fontWeight: 700, opacity: 0.8 }}>
                Preset Name
              </div>
              <input
                value={presetNameDraft}
                onChange={(event) => setPresetNameDraft(event.target.value)}
                placeholder="z. B. focus-laptop"
                style={{
                  width: "100%",
                  borderRadius: 8,
                  border: "1px solid rgba(255,255,255,0.14)",
                  background: "rgba(255,255,255,0.05)",
                  color: "inherit",
                  fontSize: 12,
                  padding: "7px 8px",
                  outline: "none",
                }}
              />
              <div style={{ display: "flex", gap: 6 }}>
                <button
                  onClick={commitSaveThemeSlot}
                  style={{
                    flex: 1,
                    borderRadius: 8,
                    border: `1px solid rgba(${rgb},0.32)`,
                    background: `rgba(${rgb},0.16)`,
                    color: t.accent,
                    fontSize: 11,
                    fontWeight: 700,
                    padding: "6px 8px",
                    cursor: "pointer",
                  }}
                >
                  Speichern
                </button>
                <button
                  onClick={() => {
                    setPresetEditorOpen(false);
                    setPresetNameDraft("");
                  }}
                  style={{
                    flex: 1,
                    borderRadius: 8,
                    border: "1px solid rgba(255,255,255,0.14)",
                    background: "rgba(255,255,255,0.04)",
                    color: "inherit",
                    fontSize: 11,
                    fontWeight: 700,
                    padding: "6px 8px",
                    cursor: "pointer",
                  }}
                >
                  Abbrechen
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </aside>

      <section
        className="nx-settings-content"
        style={{
          flex: 1,
          minWidth: 0,
          minHeight: 0,
          overflowY: "auto",
          borderRadius: 20,
          border: "1px solid rgba(255,255,255,0.12)",
          background: "var(--nx-panel-bg, rgba(14,18,30,0.42))",
          backgroundSize: "var(--nx-panel-bg-size, 100% 100%)",
          backgroundBlendMode: "var(--nx-panel-bg-blend, normal)",
          boxShadow:
            t.mode === "dark"
              ? "0 14px 38px rgba(0,0,0,0.2)"
              : "0 14px 30px rgba(40,52,78,0.12)",
          backdropFilter: `blur(${Math.max(8, Math.min(28, t.blur.panelBlur))}px) saturate(${Math.max(120, Math.min(220, t.glassmorphism.saturation))}%)`,
          WebkitBackdropFilter: `blur(${Math.max(8, Math.min(28, t.blur.panelBlur))}px) saturate(${Math.max(120, Math.min(220, t.glassmorphism.saturation))}%)`,
          padding: "14px clamp(12px, 2vw, 22px) 20px",
        }}
      >
        <div
          style={{ position: "sticky", top: 0, zIndex: 10, paddingBottom: 10 }}
        >
          <div
            className="nx-settings-content-header"
            style={{
              borderRadius: 13,
              border: "1px solid rgba(255,255,255,0.12)",
              background:
                t.mode === "dark"
                  ? "rgba(8, 12, 24, 0.34)"
                  : "rgba(255,255,255,0.54)",
              backdropFilter: "blur(14px)",
              WebkitBackdropFilter: "blur(14px)",
              padding: "10px 12px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 10,
                  opacity: 0.5,
                  textTransform: "uppercase",
                  letterSpacing: 1,
                }}
              >
                Current Module
              </div>
              <div style={{ fontSize: 16, fontWeight: 800 }}>
                {activeModule?.title}
              </div>
              <div style={{ fontSize: 11, opacity: 0.62, marginTop: 2 }}>
                {activeModule?.desc}
              </div>
              <div
                style={{
                  display: "flex",
                  gap: 6,
                  flexWrap: "wrap",
                  marginTop: 8,
                  fontSize: 10,
                  opacity: 0.72,
                }}
              >
                <span>Preset zuerst, Detailregler danach</span>
                <span style={{ opacity: 0.38 }}>/</span>
                <span>
                  {showAdvancedSettings ? "Advanced sichtbar" : "Einfacher Modus"}
                </span>
              </div>
            </div>
            <div
              style={{
                display: "flex",
                gap: 8,
                fontSize: 11,
                opacity: 0.8,
                flexWrap: "wrap",
              }}
            >
              <button
                type="button"
                onClick={toggleAdvancedSettings}
                style={{
                  borderRadius: 8,
                  border: `1px solid ${showAdvancedSettings ? `rgba(${rgb},0.32)` : "rgba(255,255,255,0.16)"}`,
                  background: showAdvancedSettings
                    ? `rgba(${rgb},0.16)`
                    : "rgba(255,255,255,0.06)",
                  color: showAdvancedSettings ? t.accent : "inherit",
                  fontSize: 10,
                  fontWeight: 700,
                  padding: "4px 8px",
                  cursor: "pointer",
                }}
              >
                Advanced {showAdvancedSettings ? "AN" : "OFF"}
              </button>
              <button
                type="button"
                onClick={toggleExperimentalSettings}
                title={!showAdvancedSettings ? "Aktiviert automatisch auch Advanced" : undefined}
                style={{
                  borderRadius: 8,
                  border: `1px solid ${showExperimentalSettings ? "rgba(255,159,10,0.38)" : "rgba(255,255,255,0.16)"}`,
                  background: showExperimentalSettings
                    ? "rgba(255,159,10,0.16)"
                    : "rgba(255,255,255,0.06)",
                  color: showExperimentalSettings ? "#ff9f0a" : "inherit",
                  fontSize: 10,
                  fontWeight: 700,
                  padding: "4px 8px",
                  cursor: "pointer",
                }}
              >
                Experimental {showExperimentalSettings ? "ON" : "OFF"}
              </button>
              <span>
                Mode: <strong style={{ color: t.accent }}>{t.mode}</strong>
              </span>
              <span>
                Panel: <strong>{panelRenderer}</strong>
              </span>
              <span>
                Motion: <strong>{t.qol?.motionProfile ?? "balanced"}</strong>
              </span>
            </div>
          </div>
          {msg ? (
            <div
              style={{
                marginTop: 7,
                fontSize: 11,
                color: t.accent,
                fontWeight: 700,
              }}
            >
              {msg}
            </div>
          ) : null}
        </div>

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={module}
            initial={
              t.qol?.reducedMotion
                ? false
                : motionRuntime.pageInitial || { opacity: 0, y: 8, scale: 0.996 }
            }
            animate={
              t.qol?.reducedMotion
                ? { opacity: 1, y: 0, scale: 1 }
                : motionRuntime.pageAnimate
            }
            exit={
              t.qol?.reducedMotion
                ? { opacity: 1, y: 0, scale: 1 }
                : motionRuntime.pageExit || { opacity: 0, y: -6, scale: 1.004 }
            }
            transition={t.qol?.reducedMotion ? { duration: 0 } : motionRuntime.pageTransition}
            style={{ maxWidth: 920, margin: "0 auto" }}
          >
            <SettingsModulePanels
              module={module}
              t={t}
              rgb={rgb}
              panelRenderer={panelRenderer}
              glowRenderer={glowRenderer}
              showAdvancedSettings={showAdvancedSettings}
              showExperimentalSettings={showExperimentalSettings}
              toast={toast}
              onOpenWalkthrough={onOpenWalkthrough}
              clearSpotlight={clearSpotlight}
              clearTerminalWorkspace={clearTerminalWorkspace}
              resetDashboardLayout={resetDashboardLayout}
              onExportSettings={exportSettings}
              onImportSettings={importSettings}
              onResetAppearanceSettings={() => resetSettings("appearance", "Appearance")}
              onResetLayoutSettings={() => resetSettings("layout", "Layout")}
              onResetMotionSettings={() => resetSettings("motion", "Motion")}
              onResetAllSettings={() => resetSettings("all", "Alle Settings")}
            />
          </motion.div>
        </AnimatePresence>
      </section>
    </div>
  );
}
