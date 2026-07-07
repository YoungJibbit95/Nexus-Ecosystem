import React from 'react';
import { Palette, Type, Code2, Monitor, Zap, Sparkles } from 'lucide-react';
import {
  getBackgroundPresetOptions,
  getThemePresetOptions,
} from '../../theme/nexusThemeResolver.js';

export function NativeLabel({ children, className = "" }) {
  return (
    <label
      className={`text-xs font-medium leading-none select-none ${className}`}
    >
      {children}
    </label>
  );
}

export function NativeInput({
  value,
  onChange,
  placeholder = "",
  className = "",
  style = {},
  ...props
}) {
  return (
    <input
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      {...props}
      className={`min-w-0 max-w-full rounded-lg px-3 py-2 text-xs outline-none transition-[border-color,background,box-shadow] ${className}`}
      style={{
        background:
          "linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.012)), var(--nexus-input-surface, rgba(255,255,255,0.035))",
        border: "1px solid rgba(156,178,226,0.085)",
        borderRadius: "var(--nexus-radius-md, 0.75rem)",
        color: "var(--nexus-text, #d1d5db)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.032)",
        overflowWrap: "anywhere",
        ...style,
      }}
    />
  );
}

export function NativeSlider({
  value,
  onValueChange,
  min,
  max,
  step,
  className = "",
}) {
  const current = Array.isArray(value) ? value[0] : value;
  return (
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={current}
      onChange={(e) => onValueChange([Number(e.target.value)])}
      className={`h-2 w-full cursor-pointer appearance-none rounded-full ${className}`}
      style={{
        accentColor: "var(--nexus-primary, #7c8cff)",
        background:
          "linear-gradient(90deg, rgba(var(--nexus-primary-rgb,124,140,255),0.45), rgba(var(--nexus-accent-2-rgb,56,189,248),0.24)), rgba(255,255,255,0.065)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.045)",
      }}
    />
  );
}

export function NativeSwitch({ checked, onCheckedChange }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onCheckedChange(!checked)}
      className="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-[background,box-shadow,transform] focus:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(var(--nexus-primary-rgb,124,140,255),0.28)]"
      style={{
        background: checked
          ? "linear-gradient(135deg,var(--nexus-primary, #7c8cff),var(--nexus-accent-2, #38bdf8))"
          : "linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.035))",
        boxShadow: checked
          ? "0 0 var(--nexus-glow-radius-sm, 8px) var(--nexus-accent-glow, rgba(124,140,255,0.12)), inset 0 1px 0 rgba(255,255,255,0.16)"
          : "inset 0 1px 0 rgba(255,255,255,0.065)",
        transitionDuration: "var(--nx-motion-quick, 190ms)",
      }}
    >
      <span
        className="pointer-events-none inline-block h-5 w-5 rounded-full shadow-lg transition-transform"
        style={{
          background: "#fff",
          transform: checked ? "translateX(21px)" : "translateX(2px)",
          marginTop: "2px",
          transitionDuration: "var(--nx-motion-quick, 190ms)",
        }}
      />
    </button>
  );
}

export function NativeSelect({ value, onValueChange, children, className = "" }) {
  return (
    <select
      value={value}
      onChange={(e) => onValueChange(e.target.value)}
      className={`min-w-0 max-w-full cursor-pointer rounded-lg px-3 py-2 text-xs outline-none transition-[border-color,background,box-shadow] ${className}`}
      style={{
        background:
          "linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.012)), var(--nexus-input-surface, rgba(255,255,255,0.035))",
        border: "1px solid rgba(156,178,226,0.085)",
        borderRadius: "var(--nexus-radius-md, 0.75rem)",
        color: "var(--nexus-text, #d1d5db)",
        appearance: "none",
        WebkitAppearance: "none",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.032)",
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E\")",
        backgroundRepeat: "no-repeat",
        backgroundPosition: "right 8px center",
        paddingRight: "28px",
        overflowWrap: "anywhere",
      }}
    >
      {children}
    </select>
  );
}

export const themes = [
  ...getThemePresetOptions(),
];

export const backgrounds = [
  ...getBackgroundPresetOptions(),
];

export const visualPerformanceProfiles = [
  {
    id: "performance",
    label: "Performance",
    description: "8px Blur, 12% Glow, CSS-Renderer und ruhiger Caret.",
    settings: {
      panel_background_mode: "blur",
      glow_renderer: "css",
      panel_blur_strength: 8,
      panel_glow_outline: false,
      glow_intensity: 12,
      glow_radius: 8,
      text_glow: false,
      icon_glow: false,
      border_glow: false,
      cursor_glow: false,
      smooth_caret: false,
      visual_performance_profile: "performance",
    },
  },
  {
    id: "balanced",
    label: "Ausgewogen",
    description: "16px Blur, 28% Glow und normale Motion fuer taegliche Arbeit.",
    settings: {
      panel_background_mode: "blur",
      glow_renderer: "css",
      panel_blur_strength: 16,
      panel_glow_outline: false,
      glow_intensity: 28,
      glow_radius: 14,
      text_glow: false,
      icon_glow: false,
      border_glow: false,
      cursor_glow: true,
      smooth_caret: true,
      visual_performance_profile: "balanced",
    },
  },
  {
    id: "quality",
    label: "Qualitaet",
    description: "22px Blur, Outline und staerkeres Licht fuer kurze Design-Sessions.",
    settings: {
      panel_background_mode: "fake-glass",
      glow_renderer: "css",
      panel_blur_strength: 22,
      panel_glow_outline: true,
      glow_intensity: 42,
      glow_radius: 20,
      text_glow: false,
      icon_glow: true,
      border_glow: true,
      cursor_glow: true,
      smooth_caret: true,
      visual_performance_profile: "quality",
    },
  },
];

export const fonts = [
  "JetBrains Mono",
  "Fira Code",
  "Source Code Pro",
  "Cascadia Code",
  "IBM Plex Mono",
  "Consolas",
  "Monaco",
  "Menlo",
];

export const settingSections = [
  { id: "theme", label: "Theme", icon: Palette },
  { id: "panel", label: "Panels", icon: Sparkles },
  { id: "background", label: "Hintergrund", icon: Monitor },
  { id: "editor", label: "Editor", icon: Code2 },
  { id: "font", label: "Schriftart", icon: Type },
  { id: "glow", label: "Glow", icon: Zap },
  { id: "appearance", label: "Darstellung", icon: Monitor },
];
