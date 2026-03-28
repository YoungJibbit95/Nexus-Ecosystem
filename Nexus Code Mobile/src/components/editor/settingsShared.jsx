import React from 'react';
import { Palette, Type, Code2, Monitor, Zap, Sparkles } from 'lucide-react';

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
      style={{ accentColor: "#8000ff" }}
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
          ? "linear-gradient(135deg,#8000ff,#0033ff)"
          : "rgba(255,255,255,0.1)",
        boxShadow: checked ? "0 0 8px rgba(128,0,255,0.4)" : "none",
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
  {
    id: "nexus_vibrant",
    name: "Nexus Vibrant",
    colors: ["#8000ff", "#61afef", "#c678dd"], // accent, function, keyword
  },
  {
    id: "neon_pink",
    name: "Neon Pink",
    colors: ["#ff00ff", "#ffffff", "#00ffff"],
  },
  {
    id: "ocean_light",
    name: "Ocean Light",
    colors: ["#0ea5e9", "#eef2ff", "#10b981"],
  },
  {
    id: "midnight_mystery",
    name: "Midnight Mystery",
    colors: ["#a855f7", "#f3f4f6", "#3b0764"],
  },
  {
    id: "dracula_classic",
    name: "Dracula Classic",
    colors: ["#bd93f9", "#f8f8f2", "#ff79c6"],
  },
  {
    id: "void_pitch",
    name: "Void Pitch",
    colors: ["#ffffff", "#ffffff", "#888888"],
  },
];

export const backgrounds = [
  {
    id: "nexus_dark",
    name: "Nexus Dark",
    colors: ["#03030b", "#060614", "#8000ff"],
  },
  {
    id: "neon_ultra",
    name: "Neon Ultra",
    colors: ["#050010", "#1a0033", "#ff00ff"],
  },
  {
    id: "ocean_wave",
    name: "Ocean Wave",
    colors: ["#000814", "#001d3d", "#0ea5e9"],
  },
  {
    id: "midnight_purple",
    name: "Midnight Purple",
    colors: ["#1a0b2e", "#03030b", "#a855f7"],
  },
  {
    id: "cyber_sunset",
    name: "Cyber Sunset",
    colors: ["#120458", "#ff0055", "#ff0055"],
  },
  { id: "dracula", name: "Dracula", colors: ["#282a36", "#343746", "#bd93f9"] },
  { id: "void", name: "Void", colors: ["#000000", "#0a0a0a", "#ffffff"] },
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
  { id: "background", label: "Hintergrund", icon: Sparkles },
  { id: "editor", label: "Editor", icon: Code2 },
  { id: "font", label: "Schriftart", icon: Type },
  { id: "glow", label: "Glow Effects", icon: Zap },
  { id: "appearance", label: "Darstellung", icon: Monitor },
];

