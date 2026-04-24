import React, { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Save,
  Download,
  Upload,
} from "lucide-react";
import { useTheme } from "../store/themeStore";
import { useTerminal } from "../store/terminalStore";
import { hexToRgb } from "../lib/utils";
import { useMobile } from "../lib/useMobile";
import { buildMotionRuntime } from "../lib/motionEngine";
import { MobileSheet } from "../components/mobile/MobileViewContract";
import { MODULES } from "./settings/settingsConstants";
import {
  GlowRendererMode,
  ModuleId,
  RendererMode,
} from "./settings/settingsTypes";
import { SettingsModulePanels } from "./settings/SettingsModulePanels";
import {
  applyThemeTransferPayload,
  buildThemeTransferPayload,
  parseThemeTransferPayload,
} from "./settings/themeTransfer";

type ThemeTransferFeedback = {
  kind: "success" | "partial" | "error";
  title: string;
  details: string[];
  fileName?: string;
};

export function SettingsView({
  onOpenWalkthrough,
}: { onOpenWalkthrough?: () => void } = {}) {
  const t = useTheme();
  const mob = useMobile();
  const compactEdge = Math.min(mob.screenW, mob.screenH);
  const isTinyMobile = mob.isMobile && compactEdge <= 430;
  const isTightMobile = mob.isMobile && mob.screenH <= 900;
  const isLandscapeMobile = mob.isMobile && mob.isLandscape;
  const isCompactMobile = mob.isMobile && (isTinyMobile || isTightMobile || isLandscapeMobile);
  const terminal = useTerminal();
  const motionRuntime = useMemo(() => buildMotionRuntime(t), [t]);
  const rgb = hexToRgb(t.accent);
  const [module, setModule] = useState<ModuleId>("appearance");
  const [msg, setMsg] = useState<string | null>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [mobileActionsOpen, setMobileActionsOpen] = useState(false);
  const [presetEditorOpen, setPresetEditorOpen] = useState(false);
  const [presetNameDraft, setPresetNameDraft] = useState("");
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  const [showExperimentalSettings, setShowExperimentalSettings] = useState(false);
  const [transferFeedback, setTransferFeedback] =
    useState<ThemeTransferFeedback | null>(null);
  const [lastMaintenanceAction, setLastMaintenanceAction] = useState<
    string | null
  >(null);

  const panelRenderer: RendererMode = t.glassmorphism.panelRenderer;
  const glowRenderer: GlowRendererMode = t.glassmorphism.glowRenderer;

  const toast = (text: string) => {
    setMsg(text);
    window.setTimeout(() => setMsg(null), 1600);
  };

  const exportTheme = () => {
    const payload = JSON.stringify(buildThemeTransferPayload(t), null, 2);
    const blob = new Blob([payload], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "nexus-theme-v5.json";
    a.click();
    URL.revokeObjectURL(a.href);
    setTransferFeedback({
      kind: "success",
      title: "Theme exportiert",
      details: [
        "Datei: nexus-theme-v5.json",
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
        details: ["Datei ist größer als 2MB und wurde nicht geladen."],
      });
      toast("Theme-Datei zu groß");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result || "{}")) as unknown;
        const parsed = parseThemeTransferPayload(data);
        if (!parsed.ok) {
          setTransferFeedback({
            kind: "error",
            title: "Import fehlgeschlagen",
            fileName: file.name,
            details: ["message" in parsed ? parsed.message : "Theme-Datei ungültig"],
          });
          toast("message" in parsed ? parsed.message : "Theme-Datei ungültig");
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
    reader.readAsText(file);
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
    localStorage.setItem(key, payload);
    setPresetEditorOpen(false);
    setPresetNameDraft("");
    toast(`Preset gespeichert: ${safeName}`);
  };

  const openSaveThemeSlot = () => {
    setPresetNameDraft("");
    setPresetEditorOpen(true);
  };

  const clearSpotlight = () => {
    localStorage.removeItem("nx-spotlight-pins-v1");
    localStorage.removeItem("nx-spotlight-recents-v1");
    window.dispatchEvent(new CustomEvent("nx-spotlight-storage-updated"));
    setLastMaintenanceAction("Spotlight Cache gelöscht");
    toast("Spotlight Daten gelöscht");
  };

  const resetDashboardLayout = () => {
    localStorage.removeItem("nx-dashboard-layout-v2");
    setLastMaintenanceAction("Dashboard Layout zurückgesetzt");
    toast("Dashboard Layout zurückgesetzt");
  };

  const clearTerminalWorkspace = () => {
    terminal.clearHistory();
    useTerminal.setState({
      lastCommand: "",
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

  return (
    <div
      className="nx-mobile-view-screen"
      style={{
        display: "flex",
        flexDirection: mob.isMobile ? "column" : "row",
        gap: isCompactMobile ? 8 : 10,
        minHeight: 0,
        height: "100%",
        padding: isCompactMobile ? 8 : 12,
        fontFamily: t.globalFont,
        background:
          t.mode === "dark"
            ? "linear-gradient(180deg, rgba(10,12,19,0.96), rgba(10,12,19,0.92))"
            : "linear-gradient(180deg, #f5f6fb, #eceef7)",
      }}
    >
      {!mob.isMobile ? (
      <aside
        style={{
          width: mob.isMobile ? "100%" : "clamp(236px, 24vw, 290px)",
          borderRadius: 20,
          border: "1px solid rgba(255,255,255,0.12)",
          background:
            t.mode === "dark"
              ? "linear-gradient(180deg, rgba(24,26,34,0.9), rgba(17,20,28,0.84))"
              : "linear-gradient(180deg, rgba(255,255,255,0.95), rgba(246,247,252,0.92))",
          boxShadow:
            t.mode === "dark"
              ? "0 14px 38px rgba(0,0,0,0.34)"
              : "0 14px 30px rgba(40,52,78,0.14)",
          padding: "12px 10px",
          display: "flex",
          flexDirection: "column",
          minHeight: 0,
          maxHeight: mob.isMobile ? "38vh" : "none",
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
            ⚙️ Nexus Settings
          </div>
          <div style={{ fontSize: 11, opacity: 0.55, marginTop: 2 }}>
            Passe Nexus nach deinen Vorlieben an
          </div>
        </div>

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
          {MODULES.map((item) => {
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
      ) : null}

      <section
        style={{
          flex: 1,
          minWidth: 0,
          minHeight: 0,
          overflowY: "auto",
          borderRadius: 20,
          border: "1px solid rgba(255,255,255,0.12)",
          background:
            t.mode === "dark"
              ? "linear-gradient(180deg, rgba(20,22,32,0.93), rgba(14,16,24,0.88))"
              : "linear-gradient(180deg, rgba(255,255,255,0.98), rgba(248,249,254,0.95))",
          boxShadow:
            t.mode === "dark"
              ? "0 14px 38px rgba(0,0,0,0.3)"
              : "0 14px 30px rgba(40,52,78,0.12)",
          padding: isCompactMobile ? "10px clamp(10px, 2vw, 16px) 14px" : "14px clamp(12px, 2vw, 22px) 20px",
        }}
      >
        <div
          style={{ position: "sticky", top: 0, zIndex: 10, paddingBottom: isCompactMobile ? 7 : 10 }}
        >
          <div
            style={{
              borderRadius: 13,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(20,22,30,0.5)",
              backdropFilter: "blur(14px)",
              WebkitBackdropFilter: "blur(14px)",
              padding: isCompactMobile ? "8px 10px" : "10px 12px",
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
              <div style={{ fontSize: isCompactMobile ? 14 : 16, fontWeight: 800 }}>
                {activeModule?.title}
              </div>
              <div style={{ fontSize: isCompactMobile ? 10 : 11, opacity: 0.62, marginTop: 2 }}>
                {activeModule?.desc}
              </div>
              {mob.isMobile ? (
                <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
                  <button
                    type="button"
                    onClick={() => setMobileNavOpen(true)}
                    style={{
                      borderRadius: 8,
                      border: `1px solid rgba(${rgb},0.32)`,
                      background: `rgba(${rgb},0.14)`,
                      color: t.accent,
                      fontSize: isCompactMobile ? 10 : 11,
                      fontWeight: 700,
                      padding: isCompactMobile ? "5px 8px" : "6px 9px",
                      cursor: "pointer",
                    }}
                  >
                    Module
                  </button>
                  <button
                    type="button"
                    onClick={() => setMobileActionsOpen(true)}
                    style={{
                      borderRadius: 8,
                      border: "1px solid rgba(255,255,255,0.16)",
                      background: "rgba(255,255,255,0.06)",
                      color: "inherit",
                      fontSize: isCompactMobile ? 10 : 11,
                      fontWeight: 700,
                      padding: isCompactMobile ? "5px 8px" : "6px 9px",
                      cursor: "pointer",
                    }}
                  >
                    Theme Actions
                  </button>
                </div>
              ) : null}
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
              {!mob.isMobile ? (
                <>
                  <span>
                    Mode: <strong style={{ color: t.accent }}>{t.mode}</strong>
                  </span>
                  <span>
                    Panel: <strong>{panelRenderer}</strong>
                  </span>
                  <span>
                    Motion: <strong>{t.qol?.motionProfile ?? "balanced"}</strong>
                  </span>
                </>
              ) : null}
            </div>
          </div>
          {msg ? (
            <div
              style={{
                marginTop: 7,
                fontSize: isCompactMobile ? 10 : 11,
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
            />
          </motion.div>
        </AnimatePresence>
      </section>

      <MobileSheet
        open={mob.isMobile && mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
        title="Settings Module"
        mode="bottom"
      >
        <div style={{ padding: isCompactMobile ? "8px" : "10px", display: "grid", gap: 6 }}>
          {MODULES.map((item) => {
            const active = item.id === module;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setModule(item.id);
                  setMobileNavOpen(false);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  borderRadius: 11,
                  border: `1px solid ${active ? `rgba(${rgb},0.34)` : "rgba(255,255,255,0.12)"}`,
                  background: active ? `rgba(${rgb},0.14)` : "rgba(255,255,255,0.03)",
                  color: active ? t.accent : "inherit",
                  padding: "10px 10px",
                  textAlign: "left",
                  cursor: "pointer",
                }}
              >
                <span style={{ display: "inline-flex", opacity: active ? 1 : 0.8 }}>{item.icon}</span>
                <span style={{ display: "flex", flexDirection: "column", lineHeight: 1.25 }}>
                  <span style={{ fontSize: 13, fontWeight: 700 }}>{item.title}</span>
                  <span style={{ fontSize: 10, opacity: active ? 0.78 : 0.5 }}>{item.desc}</span>
                </span>
              </button>
            );
          })}
        </div>
      </MobileSheet>

      <MobileSheet
        open={mob.isMobile && mobileActionsOpen}
        onClose={() => setMobileActionsOpen(false)}
        title="Theme Actions"
        mode="bottom"
      >
        <div style={{ padding: "10px", display: "grid", gap: 8 }}>
          <button
            onClick={() => {
              openSaveThemeSlot();
              setMobileActionsOpen(false);
            }}
            style={{
              padding: "10px 10px",
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
            onClick={() => {
              exportTheme();
              setMobileActionsOpen(false);
            }}
            style={{
              padding: "10px 10px",
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
              padding: "10px 10px",
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
                setMobileActionsOpen(false);
              }}
            />
          </label>
        </div>
      </MobileSheet>
    </div>
  );
}
