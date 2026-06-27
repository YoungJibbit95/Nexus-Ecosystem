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
}) {
  return (
    <input
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className={`rounded-md px-2 py-1.5 text-xs outline-none transition-colors ${className}`}
      style={style}
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
      className={`w-full h-1.5 rounded-full appearance-none cursor-pointer ${className}`}
      style={{ accentColor: "var(--nexus-primary, #7c8cff)" }}
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
      className="relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors duration-200 focus:outline-none"
      style={{
        background: checked
          ? "linear-gradient(135deg,var(--nexus-primary, #7c8cff),var(--nexus-accent-2, #2dd4bf))"
          : "rgba(255,255,255,0.1)",
        boxShadow: checked
          ? "0 0 6px var(--nexus-accent-glow, rgba(124,140,255,0.18))"
          : "none",
      }}
    >
      <span
        className="pointer-events-none inline-block h-4 w-4 rounded-full shadow-lg transition-transform duration-200"
        style={{
          background: "#fff",
          transform: checked ? "translateX(18px)" : "translateX(2px)",
          marginTop: "2px",
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
      className={`rounded-md px-2 py-1.5 text-xs outline-none cursor-pointer transition-colors ${className}`}
      style={{
        background: "rgba(255,255,255,0.05)",
        border: "1px solid rgba(255,255,255,0.1)",
        color: "#d1d5db",
        appearance: "none",
        WebkitAppearance: "none",
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E\")",
        backgroundRepeat: "no-repeat",
        backgroundPosition: "right 8px center",
        paddingRight: "28px",
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
  { id: "panel", label: "Panel Background", icon: Sparkles },
  { id: "background", label: "Background", icon: Monitor },
  { id: "editor", label: "Editor", icon: Code2 },
  { id: "font", label: "Schriftart", icon: Type },
  { id: "glow", label: "Glow Effects", icon: Zap },
  { id: "appearance", label: "Darstellung", icon: Monitor },
];
