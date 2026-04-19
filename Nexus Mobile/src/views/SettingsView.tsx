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
import { buildMotionRuntime } from "../lib/motionEngine";
import { MODULES } from "./settings/settingsConstants";
import {
  GlowRendererMode,
  ModuleId,
  RendererMode,
} from "./settings/settingsTypes";
import { SettingsModulePanels } from "./settings/SettingsModulePanels";

export function SettingsView({
  onOpenWalkthrough,
}: { onOpenWalkthrough?: () => void } = {}) {
  const t = useTheme();
  const terminal = useTerminal();
  const motionRuntime = useMemo(() => buildMotionRuntime(t), [t]);
  const rgb = hexToRgb(t.accent);
  const [module, setModule] = useState<ModuleId>("appearance");
  const [msg, setMsg] = useState<string | null>(null);

  const panelRenderer = ((t.glassmorphism as any)?.panelRenderer ??
    "blur") as RendererMode;
  const glowRenderer = ((t.glassmorphism as any).glowRenderer ??
    "css") as GlowRendererMode;

  const toast = (text: string) => {
    setMsg(text);
    window.setTimeout(() => setMsg(null), 1200);
  };

  const exportTheme = () => {
    const payload = JSON.stringify(
      {
        accent: t.accent,
        accent2: t.accent2,
        bg: t.bg,
        mode: t.mode,
        globalFont: t.globalFont,
        glow: t.glow,
        blur: t.blur,
        background: t.background,
        glassmorphism: t.glassmorphism,
        visual: t.visual,
        animations: t.animations,
        editor: t.editor,
        notes: t.notes,
        qol: t.qol,
        toolbar: t.toolbar,
      },
      null,
      2,
    );
    const blob = new Blob([payload], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "nexus-theme-v5.json";
    a.click();
    URL.revokeObjectURL(a.href);
    toast("Theme exportiert");
  };

  const importTheme = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result || "{}"));
        if (data.mode) t.setMode(data.mode);
        if (data.accent || data.accent2 || data.bg) {
          t.setColors({
            accent: data.accent,
            accent2: data.accent2,
            bg: data.bg,
          });
        }
        if (data.globalFont) t.setGlobalFont(data.globalFont);
        if (data.glow) t.setGlow(data.glow);
        if (data.blur) t.setBlur(data.blur);
        if (data.background) t.setBackground(data.background);
        if (data.glassmorphism) t.setGlassmorphism(data.glassmorphism);
        if (data.visual) t.setVisual(data.visual);
        if (data.animations) t.setAnimations(data.animations);
        if (data.editor) t.setEditor(data.editor);
        if (data.notes) t.setNotes(data.notes);
        if (data.qol) t.setQOL(data.qol);
        if (data.toolbar) t.setToolbar(data.toolbar);
        toast("Theme importiert");
      } catch {
        toast("Import fehlgeschlagen");
      }
    };
    reader.readAsText(file);
  };

  const saveThemeSlot = () => {
    const name = window.prompt("Preset Name?")?.trim();
    if (!name) return;
    const key = `nx-theme-${name}`;
    const payload = JSON.stringify({
      accent: t.accent,
      accent2: t.accent2,
      bg: t.bg,
      mode: t.mode,
      globalFont: t.globalFont,
      glow: t.glow,
      blur: t.blur,
      background: t.background,
      glassmorphism: t.glassmorphism,
      visual: t.visual,
      animations: t.animations,
      editor: t.editor,
      notes: t.notes,
      qol: t.qol,
      toolbar: t.toolbar,
    });
    localStorage.setItem(key, payload);
    toast(`Preset gespeichert: ${name}`);
  };

  const clearSpotlight = () => {
    localStorage.removeItem("nx-spotlight-pins-v1");
    localStorage.removeItem("nx-spotlight-recents-v1");
    window.dispatchEvent(new CustomEvent("nx-spotlight-storage-updated"));
    toast("Spotlight Daten gelöscht");
  };

  const resetDashboardLayout = () => {
    localStorage.removeItem("nx-dashboard-layout-v2");
    toast("Dashboard Layout zurückgesetzt");
  };

  const clearTerminalWorkspace = () => {
    terminal.clearHistory();
    useTerminal.setState({
      macros: {},
      recordingMacro: null,
      undoStack: [],
      redoStack: [],
    } as any);
    toast("Terminal Workspace bereinigt");
  };

  const activeModule = MODULES.find((m) => m.id === module);

  return (
    <div
      style={{
        display: "flex",
        gap: 10,
        minHeight: 0,
        height: "100%",
        padding: 12,
        fontFamily: t.globalFont,
        background:
          t.mode === "dark"
            ? "linear-gradient(180deg, rgba(10,12,19,0.96), rgba(10,12,19,0.92))"
            : "linear-gradient(180deg, #f5f6fb, #eceef7)",
      }}
    >
      <aside
        style={{
          width: "clamp(236px, 24vw, 290px)",
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
            onClick={saveThemeSlot}
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
              }}
            />
          </label>
        </div>
      </aside>

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
          padding: "14px clamp(12px, 2vw, 22px) 20px",
        }}
      >
        <div
          style={{ position: "sticky", top: 0, zIndex: 10, paddingBottom: 10 }}
        >
          <div
            style={{
              borderRadius: 13,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(20,22,30,0.5)",
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
              motionRuntime.pageInitial || { opacity: 0, y: 8, scale: 0.996 }
            }
            animate={motionRuntime.pageAnimate}
            exit={motionRuntime.pageExit || { opacity: 0, y: -6, scale: 1.004 }}
            transition={motionRuntime.pageTransition}
            style={{ maxWidth: 920, margin: "0 auto" }}
          >
            <SettingsModulePanels
              module={module}
              t={t}
              rgb={rgb}
              panelRenderer={panelRenderer}
              glowRenderer={glowRenderer}
              toast={toast}
              onOpenWalkthrough={onOpenWalkthrough}
              clearSpotlight={clearSpotlight}
              clearTerminalWorkspace={clearTerminalWorkspace}
              resetDashboardLayout={resetDashboardLayout}
            />
          </motion.div>
        </AnimatePresence>
      </section>
    </div>
  );
}
