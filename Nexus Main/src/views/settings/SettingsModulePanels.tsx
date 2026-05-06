import React from "react";
import { applyMotionProfile } from "../../lib/motionEngine";
import type { BgMode, PanelBgMode, Theme } from "../../store/themeStore";
import { MODULES, MOTION_PROFILES, EXPERIENCE_PRESETS } from "./settingsConstants";
import {
  FontLibrary,
  ModuleCard,
  Row,
  Segmented,
  Slider,
  ThemeLibraryGrid,
  Toggle,
} from "./SettingsPrimitives";
import { SettingsWorkspaceModule } from "./SettingsWorkspaceModule";
import {
  GlowRendererMode,
  ModuleId,
  RendererMode,
} from "./settingsTypes";

type SettingsModulePanelsProps = {
  module: ModuleId;
  t: Theme;
  rgb: string;
  panelRenderer: RendererMode;
  glowRenderer: GlowRendererMode;
  showAdvancedSettings: boolean;
  showExperimentalSettings: boolean;
  toast: (text: string) => void;
  onOpenWalkthrough?: () => void;
  clearSpotlight: () => void;
  clearTerminalWorkspace: () => void;
  resetDashboardLayout: () => void;
};

export function SettingsModulePanels({
  module,
  t,
  rgb,
  panelRenderer,
  glowRenderer,
  showAdvancedSettings,
  showExperimentalSettings,
  toast,
  onOpenWalkthrough,
  clearSpotlight,
  clearTerminalWorkspace,
  resetDashboardLayout,
}: SettingsModulePanelsProps) {
  const panelModeHelp: Record<RendererMode, { label: string; desc: string }> = {
    blur: {
      label: "Soft Blur",
      desc: "Empfohlen für Alltag: stabil, klar und schnell.",
    },
    "fake-glass": {
      label: "Fake Glass",
      desc: "CSS/SVG-Glaslook ohne Shader, gute Balance.",
    },
    "glass-shader": {
      label: "Shader Glass",
      desc: "Höchste visuelle Tiefe, benötigt mehr Grafikleistung.",
    },
  };
  const activePanelHelp = panelModeHelp[panelRenderer];

  return (
    <>
            {module === "appearance" ? (
              <>
                <ModuleCard
                  title="Quick Presets"
                  desc="Weniger Micromanagement, mehr klare Ergebnisse"
                >
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))",
                      gap: 8,
                    }}
                  >
                    {EXPERIENCE_PRESETS.map((preset) => (
                      <button
                        key={preset.id}
                        onClick={() => {
                          preset.apply(t);
                          toast(`Preset aktiv: ${preset.title}`);
                        }}
                        style={{
                          textAlign: "left",
                          borderRadius: 12,
                          border: "1px solid rgba(255,255,255,0.14)",
                          background:
                            "linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.03))",
                          padding: "10px 11px",
                          cursor: "pointer",
                        }}
                      >
                        <div style={{ fontSize: 13, fontWeight: 800 }}>
                          {preset.title}
                        </div>
                        <div
                          style={{ fontSize: 11, opacity: 0.62, marginTop: 2 }}
                        >
                          {preset.desc}
                        </div>
                      </button>
                    ))}
                  </div>
                </ModuleCard>

                <ModuleCard
                  title="Theme Library"
                  desc="Jedes Theme zeigt Farbe vor dem Anwenden"
                >
                  <ThemeLibraryGrid
                    onApply={(name) => {
                      t.preset(name);
                      toast(`Theme aktiv: ${name}`);
                    }}
                  />
                </ModuleCard>

                <ModuleCard title="Brand Colors & Mode">
                  <Row>
                    <div>
                      <div
                        style={{ fontSize: 11, opacity: 0.62, marginBottom: 6 }}
                      >
                        Accent
                      </div>
                      <input
                        type="color"
                        value={t.accent}
                        onChange={(event) =>
                          t.setColors({ accent: event.target.value })
                        }
                        style={{
                          width: "100%",
                          height: 42,
                          borderRadius: 10,
                          border: "1px solid rgba(255,255,255,0.14)",
                          background: "transparent",
                        }}
                      />
                    </div>
                    <div>
                      <div
                        style={{ fontSize: 11, opacity: 0.62, marginBottom: 6 }}
                      >
                        Accent 2
                      </div>
                      <input
                        type="color"
                        value={t.accent2}
                        onChange={(event) =>
                          t.setColors({ accent2: event.target.value })
                        }
                        style={{
                          width: "100%",
                          height: 42,
                          borderRadius: 10,
                          border: "1px solid rgba(255,255,255,0.14)",
                          background: "transparent",
                        }}
                      />
                    </div>
                  </Row>
                  <div style={{ marginTop: 8 }}>
                    <Row>
                      <Segmented
                        label="Color Mode"
                        value={t.mode}
                        options={["dark", "light"]}
                        onChange={(mode) => t.setMode(mode as "dark" | "light")}
                      />
                      <button
                        onClick={() =>
                          t.setColors({ accent: t.accent2, accent2: t.accent })
                        }
                        style={{
                          borderRadius: 10,
                          border: "1px solid rgba(255,255,255,0.12)",
                          background: "rgba(255,255,255,0.04)",
                          color: "inherit",
                          padding: "8px 10px",
                          fontSize: 12,
                          fontWeight: 700,
                          cursor: "pointer",
                          alignSelf: "end",
                        }}
                      >
                        Accent tauschen
                      </button>
                    </Row>
                  </div>
                </ModuleCard>

                <ModuleCard
                  title="Typography"
                  desc="Globale Schrift und Grundlesbarkeit der Oberfläche"
                >
                  <FontLibrary
                    value={t.globalFont}
                    onChange={(font) => t.setGlobalFont(font)}
                  />
                  <div style={{ marginTop: 10 }}>
                    <Slider
                      label="UI Font Size"
                      value={t.qol.fontSize}
                      min={12}
                      max={18}
                      step={1}
                      unit="px"
                      onChange={(value) => t.setQOL({ fontSize: value })}
                    />
                  </div>
                </ModuleCard>

                <ModuleCard
                  title="Accessibility & Clarity"
                  desc="Kontrast und UI-Hilfen für bessere Lesbarkeit"
                >
                  <Row>
                    <Toggle
                      label="High Contrast UI"
                      checked={Boolean(t.qol?.highContrast)}
                      onChange={(next) => t.setQOL({ highContrast: next })}
                    />
                    <Toggle
                      label="Show Tooltips"
                      checked={Boolean(t.qol?.showTooltips)}
                      onChange={(next) => t.setQOL({ showTooltips: next })}
                    />
                  </Row>
                  <div style={{ marginTop: 8 }}>
                    <Toggle
                      label="Auto Accent Contrast"
                      checked={Boolean(t.qol?.autoAccentContrast ?? true)}
                      onChange={(next) => t.setQOL({ autoAccentContrast: next })}
                    />
                  </div>
                </ModuleCard>

                <ModuleCard
                  title="Workflow Shortcuts"
                  desc="Schnellzugriffe für Actions, Capture und Navigation"
                >
                  <Toggle
                    label="Quick Actions"
                    checked={Boolean(t.qol?.quickActions)}
                    onChange={(next) => t.setQOL({ quickActions: next })}
                  />
                </ModuleCard>
              </>
            ) : null}

            {module === "panel" ? (
              <>
                <ModuleCard
                  title="Panel Background"
                  desc="Stabiler Panel-Look für den Alltag. Tieferes Tuning liegt unter Advanced."
                >
                  <Segmented
                    label="Mode"
                    value={panelRenderer}
                    options={[
                      { value: "blur", label: "Soft Blur" },
                      { value: "fake-glass", label: "Fake Glass" },
                      { value: "glass-shader", label: "Shader Glass" },
                    ]}
                    onChange={(mode) =>
                      t.setGlassmorphism({
                        panelRenderer: mode as RendererMode,
                      })
                    }
                  />
                  <div style={{ marginTop: 8, fontSize: 11, opacity: 0.68 }}>
                    <strong style={{ opacity: 0.92 }}>{activePanelHelp.label}:</strong>{" "}
                    {activePanelHelp.desc}
                  </div>
                  {!showAdvancedSettings ? (
                    <div
                      style={{
                        marginTop: 9,
                        borderRadius: 10,
                        border: "1px solid rgba(255,255,255,0.12)",
                        background: "rgba(255,255,255,0.04)",
                        padding: "8px 10px",
                        fontSize: 11,
                        opacity: 0.72,
                        lineHeight: 1.45,
                      }}
                    >
                      Erweiterte Regler für Blur/Fake/Shader sind unter{" "}
                      <strong>Advanced</strong> verfügbar.
                    </div>
                  ) : null}
                </ModuleCard>

                {showAdvancedSettings && panelRenderer === "blur" ? (
                  <ModuleCard
                    title="Soft Blur Controls"
                    desc="Für ruhige, transparente Panels"
                  >
                    <Row>
                      <Slider
                        label="Panel Blur"
                        value={t.blur.panelBlur}
                        min={4}
                        max={40}
                        step={1}
                        unit="px"
                        onChange={(value) => t.setBlur({ panelBlur: value })}
                      />
                      <Slider
                        label="Sidebar Blur"
                        value={t.blur.sidebarBlur}
                        min={4}
                        max={40}
                        step={1}
                        unit="px"
                        onChange={(value) => t.setBlur({ sidebarBlur: value })}
                      />
                    </Row>
                  </ModuleCard>
                ) : null}

                {showAdvancedSettings && panelRenderer === "fake-glass" ? (
                  <ModuleCard
                    title="Fake Glass Controls"
                    desc="CSS-/SVG-Glaslook ohne Shader"
                  >
                    <Row>
                      <Slider
                        label="Border Opacity"
                        value={t.glassmorphism.borderOpacity}
                        min={0.05}
                        max={0.6}
                        step={0.01}
                        onChange={(value) =>
                          t.setGlassmorphism({ borderOpacity: value })
                        }
                      />
                      <Slider
                        label="Tint Opacity"
                        value={t.glassmorphism.tintOpacity}
                        min={0}
                        max={0.3}
                        step={0.01}
                        onChange={(value) =>
                          t.setGlassmorphism({ tintOpacity: value })
                        }
                      />
                    </Row>
                  </ModuleCard>
                ) : null}

                {showAdvancedSettings &&
                showExperimentalSettings &&
                panelRenderer === "glass-shader" ? (
                  <ModuleCard
                    title="Shader Glass Controls"
                    desc="Qualität zuerst. Für schwächere Geräte lieber Soft Blur."
                  >
                    <Row>
                      <Slider
                        label="Glass Depth"
                        value={t.glassmorphism.glassDepth ?? 1}
                        min={0.2}
                        max={2}
                        step={0.05}
                        unit="x"
                        onChange={(value) =>
                          t.setGlassmorphism({ glassDepth: value })
                        }
                      />
                      <Slider
                        label="Saturation"
                        value={t.glassmorphism.saturation}
                        min={90}
                        max={260}
                        step={5}
                        unit="%"
                        onChange={(value) =>
                          t.setGlassmorphism({ saturation: value })
                        }
                      />
                    </Row>
                    <div style={{ marginTop: 8 }}>
                      <Toggle
                        label="Reflection Line"
                        checked={Boolean(t.glassmorphism.reflectionLine)}
                        onChange={(next) =>
                          t.setGlassmorphism({ reflectionLine: next })
                        }
                      />
                    </div>
                  </ModuleCard>
                ) : null}
                {showAdvancedSettings &&
                !showExperimentalSettings &&
                panelRenderer === "glass-shader" ? (
                  <ModuleCard
                    title="Shader Glass Controls (Experimental)"
                    desc="Shader-nahe Feintuning-Regler sind bewusst hinter Experimental geschützt."
                  >
                    <div
                      style={{
                        borderRadius: 10,
                        border: "1px solid rgba(255,159,10,0.32)",
                        background: "rgba(255,159,10,0.08)",
                        padding: "8px 10px",
                        fontSize: 11,
                        lineHeight: 1.45,
                      }}
                    >
                      Aktiviere <strong>Experimental</strong>, um Shader-Regler wie
                      <strong> Glass Depth</strong> und <strong>Reflection Line</strong>{" "}
                      bewusst freizuschalten.
                    </div>
                  </ModuleCard>
                ) : null}

                <ModuleCard
                  title="Glow Lab"
                  desc="Mehr Glow-Varianten, aber mit sicheren Performance-Grenzen"
                >
                  <Segmented
                    label="Glow Mode"
                    value={t.glow.mode}
                    options={[
                      "ambient",
                      "outline",
                      "focus",
                      "gradient",
                      "pulse",
                      "off",
                    ]}
                    onChange={(value) =>
                      t.setGlow({ mode: value as Theme["glow"]["mode"] })
                    }
                  />
                  <div style={{ marginTop: 10 }}>
                    <Row>
                      <Slider
                        label="Glow Intensity"
                        value={t.glow.intensity}
                        min={0}
                        max={1.35}
                        step={0.05}
                        onChange={(value) => t.setGlow({ intensity: value })}
                      />
                      <Slider
                        label="Glow Radius"
                        value={t.glow.radius}
                        min={6}
                        max={56}
                        step={1}
                        unit="px"
                        onChange={(value) => t.setGlow({ radius: value })}
                      />
                    </Row>
                  </div>
                  <div style={{ marginTop: 10 }}>
                    <Row>
                      <Slider
                        label="Glow Spread"
                        value={t.glow.spread}
                        min={0}
                        max={18}
                        step={1}
                        unit="px"
                        onChange={(value) => t.setGlow({ spread: value })}
                      />
                      <Slider
                        label="Glow Speed"
                        value={t.glow.animationSpeed}
                        min={0.2}
                        max={3}
                        step={0.1}
                        unit="x"
                        onChange={(value) => t.setGlow({ animationSpeed: value })}
                      />
                    </Row>
                  </div>
                  <div style={{ marginTop: 10 }}>
                    <Row>
                      <Toggle
                        label="Gradient Glow"
                        checked={Boolean(t.glow.gradientGlow)}
                        onChange={(next) => t.setGlow({ gradientGlow: next })}
                      />
                      <Toggle
                        label="Animated Glow"
                        checked={Boolean(t.glow.animated)}
                        onChange={(next) => t.setGlow({ animated: next })}
                      />
                    </Row>
                  </div>
                  <div style={{ marginTop: 10 }}>
                    <Row>
                      <div>
                        <div style={{ fontSize: 11, opacity: 0.62, marginBottom: 6 }}>
                          Glow Color A
                        </div>
                        <input
                          type="color"
                          value={t.glow.gradientColor1}
                          onChange={(event) =>
                            t.setGlow({
                              color: event.target.value,
                              gradientColor1: event.target.value,
                            })
                          }
                          style={{
                            width: "100%",
                            height: 38,
                            borderRadius: 10,
                            border: "1px solid rgba(255,255,255,0.14)",
                            background: "transparent",
                          }}
                        />
                      </div>
                      <div>
                        <div style={{ fontSize: 11, opacity: 0.62, marginBottom: 6 }}>
                          Glow Color B
                        </div>
                        <input
                          type="color"
                          value={t.glow.gradientColor2}
                          onChange={(event) =>
                            t.setGlow({ gradientColor2: event.target.value })
                          }
                          style={{
                            width: "100%",
                            height: 38,
                            borderRadius: 10,
                            border: "1px solid rgba(255,255,255,0.14)",
                            background: "transparent",
                          }}
                        />
                      </div>
                    </Row>
                  </div>
                  {showAdvancedSettings ? (
                    <div style={{ marginTop: 10 }}>
                      <Row>
                        <Toggle
                          label="Border Glow"
                          checked={Boolean(t.glassmorphism.borderGlow)}
                          onChange={(next) =>
                            t.setGlassmorphism({ borderGlow: next })
                          }
                        />
                        <Toggle
                          label="Inner Shadow"
                          checked={Boolean(t.glassmorphism.innerShadow)}
                          onChange={(next) =>
                            t.setGlassmorphism({ innerShadow: next })
                          }
                        />
                      </Row>
                    </div>
                  ) : null}
                </ModuleCard>

                <ModuleCard
                  title="Release Freeze"
                  desc="Glow und feste Toolbar-Geometrie sind im Release-Zyklus eingefroren."
                >
                  <div style={{ fontSize: 11, opacity: 0.72, lineHeight: 1.5 }}>
                    Alltagseinstellungen bleiben aktiv. Toolbar Mode/Position/Sichtbarkeit
                    sind weiterhin editierbar, während engine-nahe Glow- und harte
                    Geometrie-Parameter absichtlich begrenzt bleiben.
                  </div>
                  {showExperimentalSettings ? (
                    <div
                      style={{
                        marginTop: 9,
                        borderRadius: 10,
                        border: "1px solid rgba(255,159,10,0.34)",
                        background: "rgba(255,159,10,0.08)",
                        padding: "8px 10px",
                        fontSize: 11,
                        display: "grid",
                        gap: 3,
                      }}
                    >
                      <div>
                        Glow mode: <strong>{t.glow.mode}</strong>
                      </div>
                      <div>
                        Glow engine: <strong>{glowRenderer}</strong>
                      </div>
                      <div>
                        Radius / Intensity:{" "}
                        <strong>
                          {t.glow.radius}px / {t.glow.intensity.toFixed(2)}
                        </strong>
                      </div>
                    </div>
                  ) : null}
                </ModuleCard>

                <ModuleCard
                  title="Panel Texture"
                  desc="Muster und Tints fuer Panels, Cards und Sidebars"
                >
                  <Segmented
                    label="Panel Background"
                    value={t.background.panelBgMode}
                    options={[
                      "glass",
                      "solid",
                      "gradient",
                      "mist",
                      "hologram",
                      "linen",
                      "dots",
                      "grid",
                      "stripes",
                      "noise",
                      "carbon",
                      "circuit",
                    ]}
                    onChange={(mode) => t.setPanelBgMode(mode as PanelBgMode)}
                  />
                </ModuleCard>

                <ModuleCard title="App Background">
                  <Segmented
                    label="Background Mode"
                    value={t.background.mode}
                    options={[
                      "solid",
                      "gradient",
                      "animated-gradient",
                      "mesh",
                      "aurora",
                      "noise",
                      "spotlight",
                      "prism",
                      "horizon",
                      "constellation",
                    ]}
                    onChange={(mode) => t.setBackgroundMode(mode as BgMode)}
                  />
                  <div style={{ marginTop: 10 }}>
                    <Row>
                      <Slider
                        label="Mesh / Glow Strength"
                        value={t.background.meshIntensity}
                        min={0.05}
                        max={0.85}
                        step={0.05}
                        onChange={(value) =>
                          t.setBackground({ meshIntensity: value })
                        }
                      />
                      <Slider
                        label="Noise Opacity"
                        value={t.background.noiseOpacity}
                        min={0}
                        max={0.16}
                        step={0.01}
                        onChange={(value) =>
                          t.setBackground({ noiseOpacity: value })
                        }
                      />
                    </Row>
                  </div>
                  <div style={{ marginTop: 10 }}>
                    <Row>
                      <Toggle
                        label="Vignette"
                        checked={Boolean(t.background.vignette)}
                        onChange={(next) => t.setBackground({ vignette: next })}
                      />
                      <Toggle
                        label="Scanlines"
                        checked={Boolean(t.background.scanlines)}
                        onChange={(next) => t.setBackground({ scanlines: next })}
                      />
                    </Row>
                  </div>
                </ModuleCard>
              </>
            ) : null}

            {module === "layout" ? (
              <>
                <ModuleCard title="Sidebar">
                  <Row>
                    <Segmented
                      label="Style"
                      value={t.sidebarStyle ?? "default"}
                      options={[
                        "default",
                        "floating",
                        "minimal",
                        "rail",
                        "hidden",
                      ]}
                      onChange={(value) =>
                        t.setSidebarStyle(
                          value as Theme["sidebarStyle"],
                        )
                      }
                    />
                    <Segmented
                      label="Position"
                      value={t.sidebarPosition ?? "left"}
                      options={["left", "right"]}
                      onChange={(value) =>
                        t.setSidebarPosition(
                          value as Theme["sidebarPosition"],
                        )
                      }
                    />
                  </Row>
                  <div style={{ marginTop: 8 }}>
                    <Slider
                      label="Sidebar Width"
                      value={t.sidebarWidth}
                      min={64}
                      max={380}
                      step={8}
                      unit="px"
                      onChange={(value) => t.setSidebarWidth(value)}
                    />
                  </div>
                  <div style={{ marginTop: 8 }}>
                    <Row>
                      <Toggle
                        label="Show Labels"
                        checked={Boolean(t.sidebarLabels ?? true)}
                        onChange={(next) => t.setSidebarLabels(next)}
                      />
                      <Toggle
                        label="Sidebar Auto Hide"
                        checked={Boolean(t.qol?.sidebarAutoHide)}
                        onChange={(next) => t.setSidebarAutoHide(next)}
                      />
                    </Row>
                  </div>
                </ModuleCard>

                <ModuleCard
                  title="Toolbar"
                  desc="Steuert Mode, Position und Sichtbarkeit der Toolbar."
                >
                  <Row>
                    <Segmented
                      label="Toolbar Mode"
                      value={t.toolbar.toolbarMode}
                      options={[
                        { value: "island", label: "Island" },
                        { value: "full-width", label: "Full Width" },
                        { value: "spotlight", label: "Spotlight" },
                      ]}
                      onChange={(value) =>
                        t.setToolbar({
                          toolbarMode: value as Theme["toolbar"]["toolbarMode"],
                        })
                      }
                    />
                    <Segmented
                      label="Position"
                      value={t.toolbar.position}
                      options={["top", "bottom"]}
                      onChange={(value) =>
                        t.setToolbar({
                          position: value as Theme["toolbar"]["position"],
                        })
                      }
                    />
                  </Row>
                  <div style={{ marginTop: 8 }}>
                    <Segmented
                      label="Style"
                      value={t.toolbar.mode}
                      options={[
                        { value: "pill", label: "Pill" },
                        { value: "full-width", label: "Flat Rail" },
                      ]}
                      onChange={(value) =>
                        t.setToolbar({
                          mode: value as Theme["toolbar"]["mode"],
                        })
                      }
                    />
                  </div>
                  <div style={{ marginTop: 8 }}>
                    <Toggle
                      label="Toolbar Visible"
                      checked={Boolean(t.toolbar.visible)}
                      onChange={(next) => t.setToolbar({ visible: next })}
                    />
                  </div>
                  <div
                    style={{
                      marginTop: 8,
                      fontSize: 11,
                      opacity: 0.68,
                      lineHeight: 1.45,
                    }}
                  >
                    Toolbar-Höhe und Geometrie-Feintuning bleiben im Release-Freeze fixiert.
                  </div>
                </ModuleCard>

                <ModuleCard
                  title="Density & Radius"
                  desc="Steuert Panel-Inhalt und Abstände, nicht Toolbar-Geometrie"
                >
                  <Segmented
                    label="Panel Density"
                    value={t.qol?.panelDensity ?? "comfortable"}
                    options={["comfortable", "compact", "spacious"]}
                    onChange={(value) =>
                      t.setQOL({
                        panelDensity: value as Theme["qol"]["panelDensity"],
                      })
                    }
                  />
                  <div style={{ marginTop: 8 }}>
                    <Row>
                      <Slider
                        label="Panel Radius"
                        value={t.visual.panelRadius}
                        min={0}
                        max={32}
                        step={1}
                        unit="px"
                        onChange={(value) =>
                          t.setVisual({ panelRadius: value })
                        }
                      />
                      <Slider
                        label="Shadow Depth"
                        value={t.visual.shadowDepth}
                        min={0}
                        max={1}
                        step={0.05}
                        onChange={(value) =>
                          t.setVisual({ shadowDepth: value })
                        }
                      />
                    </Row>
                  </div>
                </ModuleCard>

              </>
            ) : null}

            {module === "motion" ? (
              <>
                <ModuleCard
                  title="Motion Profiles"
                  desc="Neue Motion Engine ersetzt alten Motion-Tab vollständig"
                >
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))",
                      gap: 8,
                    }}
                  >
                    {MOTION_PROFILES.map((profile) => {
                      const active =
                        (t.qol?.motionProfile ?? "balanced") === profile.id;
                      return (
                        <button
                          key={profile.id}
                          onClick={() => {
                            applyMotionProfile(t, profile.id);
                            toast(`Motion: ${profile.label}`);
                          }}
                          style={{
                            textAlign: "left",
                            borderRadius: 12,
                            border: `1px solid ${active ? `rgba(${rgb},0.34)` : "rgba(255,255,255,0.12)"}`,
                            background: active
                              ? `rgba(${rgb},0.14)`
                              : "rgba(255,255,255,0.04)",
                            color: active ? t.accent : "inherit",
                            padding: "10px 11px",
                            cursor: "pointer",
                          }}
                        >
                          <div style={{ fontSize: 13, fontWeight: 800 }}>
                            {profile.label}
                          </div>
                          <div
                            style={{
                              fontSize: 10,
                              opacity: 0.62,
                              marginTop: 2,
                            }}
                          >
                            {profile.desc}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </ModuleCard>

                <ModuleCard title="Fine Tuning">
                  <Row>
                    <Slider
                      label="Animation Speed"
                      value={t.visual.animationSpeed}
                      min={0.7}
                      max={1.7}
                      step={0.05}
                      unit="x"
                      onChange={(value) =>
                        t.setVisual({ animationSpeed: value })
                      }
                    />
                    <Segmented
                      label="Entry Style"
                      value={t.animations.entranceStyle ?? "fade"}
                      options={["fade", "slide", "scale"]}
                      onChange={(value) =>
                        t.setAnimations({
                          entranceStyle:
                            value as Theme["animations"]["entranceStyle"],
                        })
                      }
                    />
                  </Row>
                  <div style={{ marginTop: 8 }}>
                    <Row>
                      <Toggle
                        label="Page Transitions"
                        checked={Boolean(t.animations.pageTransitions)}
                        onChange={(next) =>
                          t.setAnimations({ pageTransitions: next })
                        }
                      />
                      <Toggle
                        label="Hover Lift"
                        checked={Boolean(t.animations.hoverLift)}
                        onChange={(next) =>
                          t.setAnimations({ hoverLift: next })
                        }
                      />
                    </Row>
                  </div>
                  <div style={{ marginTop: 8 }}>
                    <Row>
                      <Toggle
                        label="Ripple Click"
                        checked={Boolean(t.animations.rippleClick)}
                        onChange={(next) =>
                          t.setAnimations({ rippleClick: next })
                        }
                      />
                      <Toggle
                        label="Reduce Motion"
                        checked={Boolean(t.qol?.reducedMotion)}
                        onChange={(next) => t.setQOL({ reducedMotion: next })}
                      />
                    </Row>
                  </div>
                </ModuleCard>
              </>
            ) : null}

            {module === "editor" ? (
              <>
                <ModuleCard
                  title="Code Editor"
                  desc="Wirkt direkt auf CodeView und Editor-Bereiche in Notes"
                >
                  <Row>
                    <Slider
                      label="Font Size"
                      value={t.editor.fontSize}
                      min={10}
                      max={22}
                      step={1}
                      unit="px"
                      onChange={(value) => t.setEditor({ fontSize: value })}
                    />
                    <Slider
                      label="Tab Size"
                      value={t.editor.tabSize}
                      min={2}
                      max={8}
                      step={1}
                      onChange={(value) => t.setEditor({ tabSize: value })}
                    />
                  </Row>
                  <div style={{ marginTop: 8 }}>
                    <Segmented
                      label="Editor Font"
                      value={t.editor.fontFamily}
                      options={[
                        { value: "monospace", label: "monospace", previewFont: "monospace" },
                        { value: "Fira Code", label: "Fira Code", previewFont: "Fira Code" },
                        { value: "Menlo", label: "Menlo", previewFont: "Menlo" },
                        { value: "Consolas", label: "Consolas", previewFont: "Consolas" },
                        { value: "JetBrains Mono", label: "JetBrains Mono", previewFont: "JetBrains Mono" },
                      ]}
                      onChange={(font) => t.setEditor({ fontFamily: font })}
                    />
                  </div>
                  <div style={{ marginTop: 8 }}>
                    <Row>
                      <Toggle
                        label="Word Wrap"
                        checked={Boolean(t.editor.wordWrap)}
                        onChange={(next) => t.setEditor({ wordWrap: next })}
                      />
                      <Toggle
                        label="Line Numbers"
                        checked={Boolean(t.editor.lineNumbers)}
                        onChange={(next) => t.setEditor({ lineNumbers: next })}
                      />
                    </Row>
                  </div>
                </ModuleCard>

                <ModuleCard
                  title="Editor Behavior"
                  desc="Autosave, Minimap und Cursor-Verhalten"
                >
                  <Row>
                    <Toggle
                      label="Autosave"
                      checked={Boolean(t.editor.autosave)}
                      onChange={(next) => t.setEditor({ autosave: next })}
                    />
                    <Toggle
                      label="Minimap"
                      checked={Boolean(t.editor.minimap)}
                      onChange={(next) => t.setEditor({ minimap: next })}
                    />
                  </Row>
                  <div style={{ marginTop: 8 }}>
                    <Row>
                      <Toggle
                        label="Cursor Animation"
                        checked={Boolean(t.editor.cursorAnimation)}
                        onChange={(next) =>
                          t.setEditor({ cursorAnimation: next })
                        }
                      />
                      <Slider
                        label="Autosave Interval"
                        value={t.editor.autosaveInterval}
                        min={500}
                        max={6000}
                        step={100}
                        unit="ms"
                        onChange={(value) =>
                          t.setEditor({ autosaveInterval: value })
                        }
                      />
                    </Row>
                  </div>
                </ModuleCard>

                <ModuleCard title="Notes">
                  <Row>
                    <Slider
                      label="Notes Font"
                      value={t.notes.fontSize}
                      min={10}
                      max={24}
                      step={1}
                      unit="px"
                      onChange={(value) => t.setNotes({ fontSize: value })}
                    />
                    <Slider
                      label="Line Height"
                      value={t.notes.lineHeight}
                      min={1}
                      max={2.4}
                      step={0.1}
                      unit="em"
                      onChange={(value) => t.setNotes({ lineHeight: value })}
                    />
                  </Row>
                </ModuleCard>

              </>
            ) : null}

            {module === "workspace" ? (
              <SettingsWorkspaceModule
                onOpenWalkthrough={onOpenWalkthrough}
                clearSpotlight={clearSpotlight}
                clearTerminalWorkspace={clearTerminalWorkspace}
                resetDashboardLayout={resetDashboardLayout}
              />
            ) : null}
    </>
  );
}
