import React from "react";
import { applyMotionProfile } from "../../lib/motionEngine";
import type { BgMode } from "../../store/themeStore";
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
  LiquidPresetMode,
  ModuleId,
  RendererMode,
} from "./settingsTypes";

type SettingsModulePanelsProps = {
  module: ModuleId;
  t: any;
  rgb: string;
  panelRenderer: RendererMode;
  glowRenderer: GlowRendererMode;
  liquidPreset: LiquidPresetMode;
  liquidDistortionScale: number;
  liquidDisplace: number;
  liquidSaturation: number;
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
  liquidPreset,
  liquidDistortionScale,
  liquidDisplace,
  liquidSaturation,
  toast,
  onOpenWalkthrough,
  clearSpotlight,
  clearTerminalWorkspace,
  resetDashboardLayout,
}: SettingsModulePanelsProps) {
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

                <ModuleCard title="Typography">
                  <FontLibrary
                    value={t.globalFont}
                    onChange={(font) => t.setGlobalFont(font)}
                  />
                  <div style={{ marginTop: 10 }}>
                    <Row>
                      <Slider
                        label="UI Font Size"
                        value={t.qol.fontSize}
                        min={12}
                        max={18}
                        step={1}
                        unit="px"
                        onChange={(value) => t.setQOL({ fontSize: value })}
                      />
                      <Segmented
                        label="Editor Font"
                        value={t.editor.fontFamily}
                        options={[
                          "monospace",
                          "Fira Code",
                          "Menlo",
                          "Consolas",
                          "JetBrains Mono",
                        ]}
                        onChange={(font) => t.setEditor({ fontFamily: font })}
                      />
                    </Row>
                  </div>
                </ModuleCard>
              </>
            ) : null}

            {module === "panel" ? (
              <>
                <ModuleCard
                  title="Panel Renderer"
                  desc="Nur passende Controls werden angezeigt"
                >
                  <Segmented
                    label="Panel Background"
                    value={panelRenderer}
                    options={["blur", "fake-glass", "liquid-glass", "glass-shader"]}
                    onChange={(mode) =>
                      t.setGlassmorphism({
                        panelRenderer: mode as RendererMode,
                      } as any)
                    }
                  />
                  <div style={{ height: 10 }} />
                  <Segmented
                    label="Glow Renderer"
                    value={glowRenderer}
                    options={["css", "three"]}
                    onChange={(mode) =>
                      t.setGlassmorphism({
                        glowRenderer: mode as GlowRendererMode,
                      } as any)
                    }
                  />
                  <div style={{ height: 10 }} />
                  <Row>
                    <Slider
                      label="Glow Intensity"
                      value={t.glow.intensity}
                      min={0}
                      max={1.4}
                      step={0.02}
                      onChange={(value) => t.setGlow({ intensity: value })}
                    />
                    <Slider
                      label="Glow Radius"
                      value={t.glow.radius}
                      min={0}
                      max={44}
                      step={1}
                      unit="px"
                      onChange={(value) => t.setGlow({ radius: value })}
                    />
                  </Row>
                </ModuleCard>

                {panelRenderer === "blur" ? (
                  <ModuleCard title="Blur Renderer Controls">
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

                {panelRenderer === "fake-glass" ? (
                  <ModuleCard title="Fake Glass Controls">
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

                {panelRenderer === "liquid-glass" ? (
                  <ModuleCard title="Liquid Glass Controls" desc="Nur für Buttons/Chips, Panels bleiben CSS-Blur">
                    <div style={{ fontSize: 11, opacity: 0.68, lineHeight: 1.45, marginBottom: 8 }}>
                      Liquid Glass wird in dieser Version nur auf interaktive Buttons angewendet,
                      damit Panels und View-Wechsel performant bleiben.
                    </div>
                    <Segmented
                      label="Pipeline Preset"
                      value={liquidPreset}
                      options={["fidelity", "performance", "no-shader"]}
                      onChange={(mode) =>
                        t.setGlassmorphism({
                          liquidPreset: mode as LiquidPresetMode,
                        } as any)
                      }
                    />
                    <div style={{ height: 8 }} />
                    <Row>
                      <Slider
                        label="Distortion Depth"
                        value={(t.glassmorphism as any).glassDepth ?? 0.5}
                        min={0.2}
                        max={2}
                        step={0.05}
                        unit="x"
                        onChange={(value) =>
                          t.setGlassmorphism({ glassDepth: value } as any)
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
                      <Slider
                        label="Tint Opacity"
                        value={t.glassmorphism.tintOpacity}
                        min={0}
                        max={0.45}
                        step={0.01}
                        onChange={(value) =>
                          t.setGlassmorphism({ tintOpacity: value })
                        }
                      />
                    </div>
                    <div style={{ marginTop: 8 }}>
                      <Row>
                        <Slider
                          label="Distortion Scale"
                          value={liquidDistortionScale}
                          min={-320}
                          max={320}
                          step={2}
                          onChange={(value) =>
                            t.setGlassmorphism({
                              liquidDistortionScale: value,
                            } as any)
                          }
                        />
                        <Slider
                          label="Displace"
                          value={liquidDisplace}
                          min={0}
                          max={3}
                          step={0.02}
                          onChange={(value) =>
                            t.setGlassmorphism({
                              liquidDisplace: value,
                            } as any)
                          }
                        />
                        <Slider
                          label="Liquid Saturation"
                          value={liquidSaturation}
                          min={0.8}
                          max={2.8}
                          step={0.02}
                          unit="x"
                          onChange={(value) =>
                            t.setGlassmorphism({
                              liquidSaturation: value,
                            } as any)
                          }
                        />
                      </Row>
                    </div>
                    <div style={{ marginTop: 8, display: "flex", justifyContent: "flex-end" }}>
                      <button
                        onClick={() =>
                          t.setGlassmorphism({
                            liquidDistortionScale: undefined,
                            liquidDisplace: undefined,
                            liquidSaturation: undefined,
                          } as any)
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
                        }}
                      >
                        Preset-Werte nutzen
                      </button>
                    </div>
                  </ModuleCard>
                ) : null}

                {panelRenderer === "glass-shader" ? (
                  <ModuleCard title="Glass Shader Controls">
                    <Row>
                      <Slider
                        label="Glass Depth"
                        value={(t.glassmorphism as any).glassDepth ?? 1}
                        min={0.2}
                        max={2}
                        step={0.05}
                        unit="x"
                        onChange={(value) =>
                          t.setGlassmorphism({ glassDepth: value } as any)
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
                        checked={Boolean(
                          (t.glassmorphism as any).reflectionLine,
                        )}
                        onChange={(next) =>
                          t.setGlassmorphism({ reflectionLine: next } as any)
                        }
                      />
                    </div>
                  </ModuleCard>
                ) : null}

                <ModuleCard title="Glow">
                  <div style={{ marginTop: 8 }}>
                    <Toggle
                      label="Gradient Glow"
                      checked={t.glow.gradientGlow}
                      onChange={(next) => t.setGlow({ gradientGlow: next })}
                    />
                  </div>
                  <div style={{ marginTop: 8 }}>
                    <Row>
                      <Segmented
                        label="Glow Mode"
                        value={t.glow.mode}
                        options={[
                          "outline",
                          "ambient",
                          "gradient",
                          "focus",
                          "pulse",
                          "off",
                        ]}
                        onChange={(mode) => t.setGlow({ mode: mode as any })}
                      />
                      <Toggle
                        label="Animated Glow"
                        checked={Boolean(t.glow.animated)}
                        onChange={(next) => t.setGlow({ animated: next })}
                      />
                    </Row>
                  </div>
                  <div style={{ marginTop: 8 }}>
                    <Row>
                      <div>
                        <div
                          style={{
                            fontSize: 11,
                            opacity: 0.62,
                            marginBottom: 6,
                          }}
                        >
                          Glow Color A
                        </div>
                        <input
                          type="color"
                          value={t.glow.gradientColor1}
                          onChange={(event) =>
                            t.setGlow({
                              gradientColor1: event.target.value,
                              color: event.target.value,
                            })
                          }
                          style={{
                            width: "100%",
                            height: 36,
                            borderRadius: 9,
                            border: "1px solid rgba(255,255,255,0.14)",
                            background: "transparent",
                          }}
                        />
                      </div>
                      <div>
                        <div
                          style={{
                            fontSize: 11,
                            opacity: 0.62,
                            marginBottom: 6,
                          }}
                        >
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
                            height: 36,
                            borderRadius: 9,
                            border: "1px solid rgba(255,255,255,0.14)",
                            background: "transparent",
                          }}
                        />
                      </div>
                    </Row>
                  </div>
                </ModuleCard>

                <ModuleCard title="Background">
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
                    ]}
                    onChange={(mode) => t.setBackgroundMode(mode as BgMode)}
                  />
                </ModuleCard>
              </>
            ) : null}

            {module === "layout" ? (
              <>
                <ModuleCard title="Sidebar">
                  <Row>
                    <Segmented
                      label="Style"
                      value={(t as any).sidebarStyle ?? "default"}
                      options={[
                        "default",
                        "floating",
                        "minimal",
                        "rail",
                        "hidden",
                      ]}
                      onChange={(value) => (t as any).setSidebarStyle?.(value)}
                    />
                    <Segmented
                      label="Position"
                      value={(t as any).sidebarPosition ?? "left"}
                      options={["left", "right"]}
                      onChange={(value) =>
                        (t as any).setSidebarPosition?.(value)
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
                        checked={Boolean((t as any).sidebarLabels ?? true)}
                        onChange={(next) => (t as any).setSidebarLabels?.(next)}
                      />
                      <Toggle
                        label="Sidebar Auto Hide"
                        checked={Boolean(t.qol?.sidebarAutoHide)}
                        onChange={(next) => t.setSidebarAutoHide(next)}
                      />
                    </Row>
                  </div>
                </ModuleCard>

                <ModuleCard title="Toolbar">
                  <Row>
                    <Segmented
                      label="Mode"
                      value={t.toolbar?.toolbarMode ?? "island"}
                      options={["island", "spotlight", "full-width"]}
                      onChange={(value) =>
                        t.setToolbar({ toolbarMode: value as any })
                      }
                    />
                    <Segmented
                      label="Position"
                      value={t.toolbar?.position ?? "bottom"}
                      options={["bottom", "top"]}
                      onChange={(value) =>
                        t.setToolbar({ position: value as any })
                      }
                    />
                  </Row>
                  <div style={{ marginTop: 8 }}>
                    <Row>
                      <Toggle
                        label="Toolbar Visible"
                        checked={t.toolbar?.visible ?? true}
                        onChange={(next) => t.setToolbar({ visible: next })}
                      />
                      <Toggle
                        label="High Contrast"
                        checked={Boolean(t.qol?.highContrast)}
                        onChange={(next) => t.setQOL({ highContrast: next })}
                      />
                    </Row>
                  </div>
                </ModuleCard>

                <ModuleCard title="Density & Radius">
                  <Row>
                    <Segmented
                      label="Panel Density"
                      value={t.qol?.panelDensity ?? "comfortable"}
                      options={["comfortable", "compact", "spacious"]}
                      onChange={(value) =>
                        t.setQOL({ panelDensity: value as any })
                      }
                    />
                    <Toggle
                      label="Quick Actions"
                      checked={Boolean(t.qol?.quickActions)}
                      onChange={(next) => t.setQOL({ quickActions: next })}
                    />
                  </Row>
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
                      value={(t.animations as any).entranceStyle ?? "fade"}
                      options={["fade", "slide", "scale"]}
                      onChange={(value) =>
                        t.setAnimations({ entranceStyle: value as any })
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
                <ModuleCard title="Code Editor">
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

                <ModuleCard title="Accessibility">
                  <Row>
                    <Toggle
                      label="Auto Accent Contrast"
                      checked={Boolean(
                        (t.qol as any)?.autoAccentContrast ?? true,
                      )}
                      onChange={(next) =>
                        t.setQOL({ autoAccentContrast: next } as any)
                      }
                    />
                    <Toggle
                      label="Tooltips"
                      checked={Boolean(t.qol?.showTooltips)}
                      onChange={(next) => t.setQOL({ showTooltips: next })}
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
