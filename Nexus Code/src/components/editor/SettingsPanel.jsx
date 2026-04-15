import React from "react";
import {
  ArrowLeft,
  Palette,
  Type,
  Code2,
  Monitor,
  Zap,
  Sparkles,
} from "lucide-react";
import { motion } from "framer-motion";

/* ── Lightweight native replacements for the UI-kit components ───────────── */

import {
  NativeInput,
  NativeLabel,
  NativeSelect,
  NativeSlider,
  NativeSwitch,
  backgrounds,
  fonts,
  settingSections,
  themes,
} from './settingsShared';

export default function SettingsPanel({
  settings,
  onSettingsChange,
  onResetSettings,
  onClose,
}) {
  const [activeSection, setActiveSection] = React.useState("theme");

  const updateSetting = (key, value) => {
    onSettingsChange({ ...settings, [key]: value });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex-1 flex overflow-hidden rounded-2xl border border-white/5"
      style={{
        background: "var(--nexus-surface)",
        backdropFilter: "blur(20px)",
        borderColor: "var(--nexus-border)",
      }}
    >
      {/* Settings Sidebar */}
      <motion.div
        initial={{ x: -220, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="w-52 flex flex-col shrink-0 p-4"
        style={{ borderRight: "1px solid var(--nexus-border)" }}
      >
        <motion.button
          whileHover={{ x: -5 }}
          whileTap={{ scale: 0.95 }}
          onClick={onClose}
          className="flex items-center gap-2 text-gray-400 hover:text-gray-200 mb-6"
        >
          <ArrowLeft size={16} /> <span className="text-sm">Zurück</span>
        </motion.button>

        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold text-gray-500 tracking-widest uppercase">
            SETTINGS
          </span>
          <button
            onClick={onResetSettings}
            className="text-[10px] text-red-500/60 hover:text-red-500 font-bold uppercase tracking-tighter transition-colors"
          >
            Reset All
          </button>
        </div>

        {settingSections.map((section, index) => {
          const Icon = section.icon;
          const isActive = activeSection === section.id;
          return (
            <motion.button
              key={section.id}
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.1 + index * 0.05 }}
              whileHover={{ x: 5, scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setActiveSection(section.id)}
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-left mb-1 relative"
              style={{
                background: isActive ? "rgba(128,0,255,0.15)" : "transparent",
                color: isActive ? "#c084fc" : "#9ca3af",
                boxShadow: isActive ? "0 0 15px rgba(128,0,255,0.2)" : "none",
                transition: "all 0.3s ease",
              }}
            >
              {isActive && (
                <motion.div
                  layoutId="settingsActiveIndicator"
                  className="absolute left-1 top-1 bottom-1 w-0.5 rounded-full"
                  style={{
                    background: "#8000ff",
                    boxShadow: "0 0 10px #8000ff",
                  }}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
              <Icon size={16} />{" "}
              <span className="text-sm">{section.label}</span>
            </motion.button>
          );
        })}
      </motion.div>

      {/* Settings Content */}
      <motion.div
        key={activeSection}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3 }}
        className="flex-1 overflow-y-auto p-8 max-w-2xl"
      >
        {activeSection === "theme" && (
          <div className="space-y-8">
            {/* Live Preview */}
            <div
              className="rounded-xl p-6 border"
              style={{
                background: "rgba(0,0,0,0.2)",
                borderColor: "var(--nexus-border)",
              }}
            >
              <span className="text-xs text-gray-500 uppercase tracking-widest">
                Live Preview
              </span>
              <div className="flex gap-4 mt-4">
                <div
                  className="flex-1 rounded-lg p-4 border"
                  style={{
                    background: "rgba(128,0,255,0.06)",
                    borderColor: settings.primary_accent + "33",
                  }}
                >
                  <span
                    className="text-xs font-semibold"
                    style={{ color: settings.primary_accent }}
                  >
                    Panel A
                  </span>
                  <div
                    className="h-px my-2"
                    style={{ background: settings.primary_accent + "33" }}
                  />{" "}
                  <span className="text-xs text-gray-500">Sample text</span>
                </div>
                <div
                  className="flex-1 rounded-lg p-4 border"
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    borderColor: "rgba(255,255,255,0.1)",
                  }}
                >
                  <span className="text-xs font-semibold text-gray-300">
                    Panel B
                  </span>
                  <div className="h-px my-2 bg-white/10" />{" "}
                  <span className="text-xs text-gray-500">Sample text</span>
                </div>
              </div>
              <div className="flex items-center gap-3 mt-4">
                <button
                  className="px-4 py-1.5 rounded-lg text-xs font-semibold text-white"
                  style={{ background: settings.primary_accent }}
                >
                  Primary
                </button>
                <button
                  className="px-4 py-1.5 rounded-lg text-xs font-semibold border"
                  style={{
                    color: settings.primary_accent,
                    borderColor: settings.primary_accent + "44",
                  }}
                >
                  Ghost
                </button>
              </div>
            </div>

            {/* Theme Presets */}
            <div>
              <span className="text-xs text-gray-500 uppercase tracking-widest">
                Presets
              </span>
              <div className="grid grid-cols-3 gap-3 mt-3">
                {themes.map((t, index) => (
                  <motion.button
                    key={t.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      delay: 0.1 + index * 0.05,
                    }}
                    whileHover={{ scale: 1.05, y: -3 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      onSettingsChange({
                        ...settings,
                        theme: t.id,
                        background: null,
                      });
                    }}
                    className="p-3 rounded-xl border transition-all"
                    style={{
                      background:
                        settings.theme === t.id
                          ? "color-mix(in srgb, var(--primary) 15%, transparent)"
                          : "rgba(255,255,255,0.02)",
                      borderColor:
                        settings.theme === t.id
                          ? "color-mix(in srgb, var(--primary) 30%, transparent)"
                          : "rgba(255,255,255,0.05)",
                      boxShadow:
                        settings.theme === t.id
                          ? `0 0 20px ${t.colors[0]}33`
                          : "none",
                      transition: "all 0.3s ease",
                    }}
                  >
                    <span
                      className="text-xs font-semibold"
                      style={{ color: t.colors[0] }}
                    >
                      {t.name}
                    </span>
                    <div className="flex gap-1 mt-2">
                      {t.colors.map((c, i) => (
                        <motion.div
                          key={i}
                          animate={
                            settings.theme === t.id
                              ? {
                                  boxShadow: [
                                    `0 0 5px ${c}`,
                                    `0 0 10px ${c}`,
                                    `0 0 5px ${c}`,
                                  ],
                                }
                              : {}
                          }
                          transition={{ duration: 2, repeat: Infinity }}
                          className="w-4 h-4 rounded-full"
                          style={{ background: c }}
                        />
                      ))}
                    </div>
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Colors */}
            <div>
              <span className="text-xs text-gray-500 uppercase tracking-widest">
                Farben
              </span>
              <div className="grid grid-cols-2 gap-4 mt-3">
                <div>
                  <NativeLabel className="text-gray-400 mb-1.5 block">
                    Primary Accent
                  </NativeLabel>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-8 h-8 rounded-lg border border-white/10"
                      style={{ background: settings.primary_accent }}
                    />
                    <NativeInput
                      value={settings.primary_accent || "#8000ff"}
                      onChange={(e) =>
                        updateSetting("primary_accent", e.target.value)
                      }
                      className="h-8 bg-white/5 text-gray-300 font-mono w-full"
                      style={{ border: "1px solid rgba(255,255,255,0.1)" }}
                    />
                  </div>
                </div>
                <div>
                  <NativeLabel className="text-gray-400 mb-1.5 block">
                    Secondary Accent
                  </NativeLabel>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-8 h-8 rounded-lg border border-white/10"
                      style={{ background: settings.secondary_accent }}
                    />
                    <NativeInput
                      value={settings.secondary_accent || "#0033ff"}
                      onChange={(e) =>
                        updateSetting("secondary_accent", e.target.value)
                      }
                      className="h-8 bg-white/5 text-gray-300 font-mono w-full"
                      style={{ border: "1px solid rgba(255,255,255,0.1)" }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        {activeSection === "background" && (
          <div className="space-y-8">
            <div>
              <span className="text-xs text-gray-400 uppercase tracking-widest">
                Hintergrund
              </span>
              <div className="grid grid-cols-3 gap-3 mt-3">
                <motion.button
                  whileHover={{ scale: 1.05, y: -3 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => updateSetting("background", null)}
                  className="p-3 rounded-xl border"
                  style={{
                    background: !settings.background
                      ? "rgba(128,0,255,0.1)"
                      : "rgba(255,255,255,0.02)",
                    borderColor: !settings.background
                      ? "#8000ff44"
                      : "rgba(255,255,255,0.05)",
                  }}
                >
                  <span className="text-xs font-semibold text-gray-300">
                    Default
                  </span>
                  <p className="text-[9px] text-gray-500 mt-1">Vom Theme</p>
                </motion.button>

                {backgrounds.map((bg) => (
                  <motion.button
                    key={bg.id}
                    whileHover={{ scale: 1.05, y: -3 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => updateSetting("background", bg.id)}
                    className="p-3 rounded-xl border"
                    style={{
                      background:
                        settings.background === bg.id
                          ? "rgba(128,0,255,0.1)"
                          : "rgba(255,255,255,0.02)",
                      borderColor:
                        settings.background === bg.id
                          ? "#8000ff44"
                          : "rgba(255,255,255,0.05)",
                      boxShadow:
                        settings.background === bg.id
                          ? `0 0 20px ${bg.colors[2]}33`
                          : "none",
                      transition: "all 0.3s ease",
                    }}
                  >
                    <span
                      className="text-xs font-semibold"
                      style={{ color: bg.colors[2] }}
                    >
                      {bg.name}
                    </span>
                    <div className="flex gap-1 mt-2">
                      {bg.colors.slice(0, 2).map((c, i) => (
                        <div
                          key={i}
                          className="w-4 h-4 rounded-full border border-white/10"
                          style={{ background: c }}
                        />
                      ))}
                      <div
                        className="w-4 h-4 rounded-full border border-dashed border-white/20 flex items-center justify-center text-[8px] text-gray-500"
                        style={{ background: bg.colors[2] }}
                      >
                        A
                      </div>
                    </div>
                  </motion.button>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeSection === "panel" && (
          <div className="space-y-6">
            <div
              className="rounded-xl p-6 border"
              style={{
                background: "rgba(128,0,255,0.04)",
                borderColor: "rgba(128,0,255,0.1)",
              }}
            >
              <div className="flex items-center gap-3 mb-4">
                <Sparkles size={16} className="text-purple-400" />
                <span className="text-sm text-gray-300 font-medium">
                  Panel Background
                </span>
              </div>
              <p className="text-xs text-gray-500 leading-relaxed">
                Wähle zwischen Blur, Fake Glass und Glass-Shader Look.
                Glow-Renderer steuert, ob die Outline klassisch per CSS oder
                in einer intensiveren Variante gerendert wird.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {[
                { id: "blur", label: "Blur" },
                { id: "fake-glass", label: "Fake Glass" },
                { id: "glass-shader", label: "Glass" },
              ].map((mode) => {
                const active = (settings.panel_background_mode || "blur") === mode.id;
                return (
                  <button
                    key={mode.id}
                    onClick={() => updateSetting("panel_background_mode", mode.id)}
                    className="p-3 rounded-xl border text-left"
                    style={{
                      background: active ? "rgba(128,0,255,0.12)" : "rgba(255,255,255,0.02)",
                      borderColor: active ? "rgba(128,0,255,0.35)" : "rgba(255,255,255,0.08)",
                      color: active ? "#c084fc" : "#9ca3af",
                    }}
                  >
                    <div className="text-xs font-semibold">{mode.label}</div>
                    <div className="text-[10px] opacity-70 mt-1">
                      {mode.id === "blur" && "Klassisch, günstig, stabil"}
                      {mode.id === "fake-glass" && "CSS + Filter Distortion"}
                      {mode.id === "glass-shader" && "Intensiver Gradient-Glass Look"}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center justify-between">
              <NativeLabel>Glow Renderer</NativeLabel>
              <NativeSelect
                value={settings.glow_renderer || "css"}
                onValueChange={(v) => updateSetting("glow_renderer", v)}
                className="w-36"
              >
                <option value="css">CSS</option>
                <option value="three">Three-Style</option>
              </NativeSelect>
            </div>

            <div>
              <NativeLabel>
                Panel Blur Stärke: {settings.panel_blur_strength || 22}px
              </NativeLabel>
              <NativeSlider
                value={[settings.panel_blur_strength || 22]}
                onValueChange={([v]) => updateSetting("panel_blur_strength", v)}
                min={0}
                max={40}
                step={2}
                className="w-full"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <NativeLabel>Glow Outline</NativeLabel>
                <p className="text-xs text-gray-500 mt-0.5">
                  Zeichnet die Leuchtkante um Panels statt im Inneren.
                </p>
              </div>
              <NativeSwitch
                checked={settings.panel_glow_outline !== false}
                onCheckedChange={(v) => updateSetting("panel_glow_outline", v)}
              />
            </div>
          </div>
        )}

        {activeSection === "editor" && (
          <div className="space-y-6">
            <div>
              <NativeLabel>
                Schriftgröße: {settings.font_size || 14}px
              </NativeLabel>
              <NativeSlider
                value={[settings.font_size || 14]}
                onValueChange={([v]) => updateSetting("font_size", v)}
                min={10}
                max={24}
                step={1}
                className="w-full"
              />
            </div>

            <div>
              <NativeLabel className="text-gray-400 mb-2 block">
                Schriftfamilie
              </NativeLabel>
              <NativeSelect
                value={settings.font_family || "JetBrains Mono"}
                onValueChange={(v) => updateSetting("font_family", v)}
                className="w-full"
              >
                {fonts.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </NativeSelect>
            </div>

            <div>
              <NativeLabel>Tab-Größe: {settings.tab_size || 4}</NativeLabel>
              <NativeSlider
                value={[settings.tab_size || 4]}
                onValueChange={([v]) => updateSetting("tab_size", v)}
                min={2}
                max={8}
                step={2}
                className="w-full"
              />
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <NativeLabel>Zeilennummern</NativeLabel>
                <NativeSwitch
                  checked={settings.line_numbers !== false}
                  onCheckedChange={(v) => updateSetting("line_numbers", v)}
                />
              </div>
              <div className="flex items-center justify-between">
                <NativeLabel>Zeilenumbruch</NativeLabel>
                <NativeSwitch
                  checked={settings.word_wrap || false}
                  onCheckedChange={(v) => updateSetting("word_wrap", v)}
                />
              </div>
              <div className="flex items-center justify-between">
                <NativeLabel>Auto-Speichern</NativeLabel>
                <NativeSwitch
                  checked={settings.auto_save !== false}
                  onCheckedChange={(v) => updateSetting("auto_save", v)}
                />
              </div>
              <div className="flex items-center justify-between">
                <NativeLabel>
                  Zeilenhöhe: {settings.line_height || 1.6}
                </NativeLabel>
                <NativeSlider
                  value={[settings.line_height || 1.6]}
                  onValueChange={([v]) => updateSetting("line_height", v)}
                  min={1}
                  max={3}
                  step={0.1}
                  className="w-32"
                />
              </div>
              <div className="flex items-center justify-between">
                <NativeLabel>Minimap</NativeLabel>
                <NativeSwitch
                  checked={settings.minimap !== false}
                  onCheckedChange={(v) => updateSetting("minimap", v)}
                />
              </div>
              <div className="flex items-center justify-between">
                <NativeLabel>Whitespace anzeigen</NativeLabel>
                <NativeSelect
                  value={settings.render_whitespace || "none"}
                  onValueChange={(v) => updateSetting("render_whitespace", v)}
                  className="w-32"
                >
                  <option value="none">Keine</option>
                  <option value="boundary">Grenzen</option>
                  <option value="all">Alle</option>
                </NativeSelect>
              </div>
              <div className="flex items-center justify-between">
                <NativeLabel>Smooth Caret Animation</NativeLabel>
                <NativeSwitch
                  checked={settings.smooth_caret !== false}
                  onCheckedChange={(v) => updateSetting("smooth_caret", v)}
                />
              </div>
              <div className="flex items-center justify-between">
                <NativeLabel>Cursor Stil</NativeLabel>
                <NativeSelect
                  value={settings.cursor_style || "line"}
                  onValueChange={(v) => updateSetting("cursor_style", v)}
                  className="w-32"
                >
                  <option value="line">Linie</option>
                  <option value="block">Block</option>
                  <option value="underline">Unterstrichen</option>
                </NativeSelect>
              </div>
              <div className="flex items-center justify-between">
                <NativeLabel>Cursor Blinken</NativeLabel>
                <NativeSelect
                  value={settings.cursor_blinking || "solid"}
                  onValueChange={(v) => updateSetting("cursor_blinking", v)}
                  className="w-32"
                >
                  <option value="solid">Fest</option>
                  <option value="blink">Blinken</option>
                  <option value="smooth">Sanft</option>
                  <option value="phase">Phase</option>
                </NativeSelect>
              </div>
              <div className="flex items-center justify-between">
                <NativeLabel>Zeilen-Highlight</NativeLabel>
                <NativeSelect
                  value={settings.line_highlight || "all"}
                  onValueChange={(v) => updateSetting("line_highlight", v)}
                  className="w-32"
                >
                  <option value="none">Keine</option>
                  <option value="gutter">Gutter</option>
                  <option value="line">Zeile</option>
                  <option value="all">Beides</option>
                </NativeSelect>
              </div>
              <div className="flex items-center justify-between">
                <NativeLabel>Bracket Colorization</NativeLabel>
                <NativeSwitch
                  checked={settings.bracket_colorization !== false}
                  onCheckedChange={(v) =>
                    updateSetting("bracket_colorization", v)
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <NativeLabel>Font Ligatures</NativeLabel>
                <NativeSwitch
                  checked={settings.font_ligatures !== false}
                  onCheckedChange={(v) => updateSetting("font_ligatures", v)}
                />
              </div>
              <div className="flex items-center justify-between">
                <NativeLabel>Format on Paste</NativeLabel>
                <NativeSwitch
                  checked={settings.format_on_paste !== false}
                  onCheckedChange={(v) => updateSetting("format_on_paste", v)}
                />
              </div>
              <div className="flex items-center justify-between">
                <NativeLabel>Sticky Scroll</NativeLabel>
                <NativeSwitch
                  checked={settings.sticky_scroll || false}
                  onCheckedChange={(v) => updateSetting("sticky_scroll", v)}
                />
              </div>
            </div>
          </div>
        )}

        {activeSection === "font" && (
          <div className="space-y-6">
            <div>
              <NativeLabel>Schriftart</NativeLabel>
              <NativeSelect
                value={settings.font_family || "JetBrains Mono"}
                onValueChange={(v) => updateSetting("font_family", v)}
              >
                {fonts.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </NativeSelect>
            </div>

            <div>
              <NativeLabel>
                Schriftgröße: {settings.font_size || 14}px
              </NativeLabel>
              <NativeSlider
                value={[settings.font_size || 14]}
                onValueChange={([v]) => updateSetting("font_size", v)}
                min={10}
                max={28}
                step={1}
                className="w-full"
              />
              <div
                className="mt-4 p-4 rounded-lg border"
                style={{
                  background: "#0a0a20",
                  borderColor: "rgba(128,0,255,0.1)",
                }}
              >
                <p
                  className="font-mono text-gray-300"
                  style={{
                    fontSize: settings.font_size || 14,
                    fontFamily: settings.font_family || "JetBrains Mono",
                  }}
                >
                  const example = "This is a preview text";
                </p>
              </div>
            </div>

            <div>
              <NativeLabel>Schriftstärke</NativeLabel>
              <div className="grid grid-cols-4 gap-2">
                {[400, 500, 600, 700].map((weight) => (
                  <motion.button
                    key={weight}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => updateSetting("font_weight", weight)}
                    className="p-2 rounded-lg border text-sm"
                    style={{
                      background:
                        (settings.font_weight || 400) === weight
                          ? "rgba(128,0,255,0.15)"
                          : "rgba(255,255,255,0.02)",
                      borderColor:
                        (settings.font_weight || 400) === weight
                          ? "#8000ff44"
                          : "rgba(255,255,255,0.05)",
                      color:
                        (settings.font_weight || 400) === weight
                          ? "#c084fc"
                          : "#9ca3af",
                      fontWeight: weight,
                    }}
                  >
                    {weight}
                  </motion.button>
                ))}
              </div>
            </div>

            <div>
              <NativeLabel>Buchstabenabstand</NativeLabel>
              <NativeSlider
                value={[settings.letter_spacing || 0]}
                onValueChange={([v]) => updateSetting("letter_spacing", v)}
                min={-2}
                max={4}
                step={0.5}
                className="w-full"
              />
              <span className="text-xs text-gray-500 mt-1 block">
                {settings.letter_spacing || 0}px
              </span>
            </div>

            <div>
              <NativeLabel>Zeilenhöhe</NativeLabel>
              <NativeSlider
                value={[settings.line_height || 1.65]}
                onValueChange={([v]) => updateSetting("line_height", v)}
                min={1.2}
                max={2.5}
                step={0.05}
                className="w-full"
              />
              <span className="text-xs text-gray-500 mt-1 block">
                {settings.line_height || 1.65}
              </span>
            </div>
          </div>
        )}

        {activeSection === "glow" && (
          <div className="space-y-6">
            <div
              className="rounded-xl p-6 border"
              style={{
                background: "rgba(128,0,255,0.04)",
                borderColor: "rgba(128,0,255,0.1)",
              }}
            >
              <div className="flex items-center gap-3 mb-4">
                <Zap
                  size={16}
                  className="text-purple-400"
                  style={{ filter: "drop-shadow(0 0 6px #a855f7)" }}
                />{" "}
                <span className="text-sm text-gray-300 font-medium">
                  Glow Effekte
                </span>
              </div>
              <p className="text-xs text-gray-500 leading-relaxed">
                Aktiviere Leuchten und Glow-Effekte für Text, Icons und
                UI-Elemente für ein moderneres Aussehen.
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <NativeLabel>Text Glow</NativeLabel>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Leuchtender Text-Effekt
                  </p>
                </div>
                <NativeSwitch
                  checked={settings.text_glow || false}
                  onCheckedChange={(v) => updateSetting("text_glow", v)}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <NativeLabel>Icon Glow</NativeLabel>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Leuchtende Icons
                  </p>
                </div>
                <NativeSwitch
                  checked={settings.icon_glow || false}
                  onCheckedChange={(v) => updateSetting("icon_glow", v)}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <NativeLabel>Border Glow</NativeLabel>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Leuchtende Rahmen
                  </p>
                </div>
                <NativeSwitch
                  checked={settings.border_glow !== false}
                  onCheckedChange={(v) => updateSetting("border_glow", v)}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <NativeLabel>Cursor Glow</NativeLabel>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Leuchtender Cursor im Editor
                  </p>
                </div>
                <NativeSwitch
                  checked={settings.cursor_glow !== false}
                  onCheckedChange={(v) => updateSetting("cursor_glow", v)}
                />
              </div>
            </div>

            <div>
              <NativeLabel>
                Glow Intensität: {settings.glow_intensity || 50}%
              </NativeLabel>
              <NativeSlider
                value={[settings.glow_intensity || 50]}
                onValueChange={([v]) => updateSetting("glow_intensity", v)}
                min={0}
                max={100}
                step={10}
                className="w-full"
              />
            </div>
            <div>
              <NativeLabel>
                Glow Radius: {settings.glow_radius || 24}px
              </NativeLabel>
              <NativeSlider
                value={[settings.glow_radius || 24]}
                onValueChange={([v]) => updateSetting("glow_radius", v)}
                min={0}
                max={64}
                step={2}
                className="w-full"
              />
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <div
                className="p-4 rounded-lg border text-center"
                style={{
                  background: "#0a0a20",
                  borderColor: "rgba(128,0,255,0.2)",
                }}
              >
                <motion.span
                  className={`text-lg font-bold ${settings.text_glow ? "text-glow" : ""}`}
                  style={{
                    color: "#a855f7",
                    opacity: (settings.glow_intensity || 50) / 100,
                  }}
                >
                  Text Glow
                </motion.span>
              </div>
              <div
                className="p-4 rounded-lg border flex items-center justify-center"
                style={{
                  background: "#0a0a20",
                  borderColor: "rgba(128,0,255,0.2)",
                  boxShadow:
                    settings.border_glow !== false
                      ? `0 0 ${Math.round(((settings.glow_radius || 24) * (settings.glow_intensity || 50)) / 120)}px rgba(128,0,255,0.5)`
                      : "none",
                }}
              >
                <span className="text-xs text-gray-400">Border Glow</span>
              </div>
            </div>
          </div>
        )}

        {activeSection === "appearance" && (
          <div className="space-y-6">
            <div
              className="rounded-xl p-6 border"
              style={{
                background: "rgba(128,0,255,0.04)",
                borderColor: "rgba(128,0,255,0.1)",
              }}
            >
              <div className="flex items-center gap-3 mb-4">
                <Sparkles size={16} className="text-purple-400" />{" "}
                <span className="text-sm text-gray-300 font-medium">
                  Nexus Code Theme Engine
                </span>
              </div>
              <p className="text-xs text-gray-500 leading-relaxed">
                Passe das Erscheinungsbild deines Editors an. Wähle aus
                vordefinierten Themes oder erstelle dein eigenes mit
                benutzerdefinierten Farben.
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <NativeLabel>Sidebar Position</NativeLabel>
                <NativeSelect
                  value={settings.sidebar_position || "left"}
                  onValueChange={(v) => updateSetting("sidebar_position", v)}
                  className="w-32"
                >
                  <option value="left">Links</option>
                  <option value="right">Rechts</option>
                </NativeSelect>
              </div>

              <div className="flex items-center justify-between">
                <NativeLabel>Statusleiste anzeigen</NativeLabel>
                <NativeSwitch
                  checked={settings.status_bar_visible !== false}
                  onCheckedChange={(v) =>
                    updateSetting("status_bar_visible", v)
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <NativeLabel>Zen Modus</NativeLabel>
                <NativeSwitch
                  checked={settings.zen_mode || false}
                  onCheckedChange={(v) => updateSetting("zen_mode", v)}
                />
              </div>
            </div>

            <div className="pt-4 border-t border-white/5">
              <NativeLabel className="text-gray-400 mb-2 block text-[10px] uppercase tracking-widest">
                Theme Modus
              </NativeLabel>
              <p className="text-xs text-gray-500 leading-relaxed">
                Der Theme-Modus wird vollständig durch Preset und Accent-Farben gesteuert.
                Nicht-funktionale Umschalter wurden entfernt.
              </p>
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
