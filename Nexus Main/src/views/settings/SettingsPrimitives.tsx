import React from "react";
import { GLOBAL_FONTS, PRESETS, PRESET_PREVIEWS, useTheme } from "../../store/themeStore";
import { hexToRgb } from "../../lib/utils";

export function ModuleCard({
  title,
  desc,
  children,
}: {
  title: string;
  desc?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        borderRadius: 16,
        border: "1px solid rgba(255,255,255,0.1)",
        background:
          "linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.03))",
        padding: "14px 14px 12px",
        marginBottom: 12,
      }}
    >
      <div style={{ fontSize: 14, fontWeight: 800, letterSpacing: "-0.01em" }}>
        {title}
      </div>
      {desc ? (
        <div style={{ fontSize: 11, opacity: 0.55, marginTop: 2 }}>{desc}</div>
      ) : null}
      <div style={{ marginTop: 10 }}>{children}</div>
    </div>
  );
}

export function Row({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
        gap: 10,
      }}
    >
      {children}
    </div>
  );
}

export function Segmented({
  label,
  value,
  options,
  onChange,
}: {
  label?: string;
  value: string;
  options: Array<string | { value: string; label: string; previewFont?: string }>;
  onChange: (value: string) => void;
}) {
  const t = useTheme();
  const rgb = hexToRgb(t.accent);
  return (
    <div>
      {label ? (
        <div style={{ fontSize: 11, opacity: 0.6, marginBottom: 6 }}>
          {label}
        </div>
      ) : null}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {options.map((rawOption) => {
          const option =
            typeof rawOption === "string"
              ? { value: rawOption, label: rawOption }
              : rawOption;
          const active = option.value === value;
          return (
            <button
              key={option.value}
              onClick={() => onChange(option.value)}
              style={{
                padding: "6px 10px",
                borderRadius: 10,
                border: `1px solid ${active ? `rgba(${rgb},0.4)` : "rgba(255,255,255,0.12)"}`,
                background: active
                  ? `rgba(${rgb},0.2)`
                  : "rgba(255,255,255,0.04)",
                color: active ? t.accent : "inherit",
                fontSize: 11,
                fontWeight: 700,
                textTransform: "none",
                cursor: "pointer",
                fontFamily: option.previewFont ?? "inherit",
              }}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function ThemeLibraryGrid({
  onApply,
}: {
  onApply: (presetName: string) => void;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))",
        gap: 8,
      }}
    >
      {PRESETS.map((name) => {
        const preview = PRESET_PREVIEWS[name] || {
          mode: "dark" as const,
          accent: "#007AFF",
          accent2: "#5E5CE6",
          bg: "#12141f",
        };
        return (
          <button
            key={name}
            onClick={() => onApply(name)}
            style={{
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.12)",
              background: `linear-gradient(135deg, ${preview.bg} 0%, color-mix(in srgb, ${preview.bg} 78%, ${preview.accent} 22%) 100%)`,
              padding: 9,
              textAlign: "left",
              cursor: "pointer",
              display: "grid",
              gap: 7,
            }}
          >
            <div style={{ display: "flex", gap: 6 }}>
              <span
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: 999,
                  background: preview.accent,
                  border: "1px solid rgba(255,255,255,0.35)",
                }}
              />
              <span
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: 999,
                  background: preview.accent2,
                  border: "1px solid rgba(255,255,255,0.35)",
                }}
              />
              <span
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: 999,
                  background: preview.bg,
                  border: "1px solid rgba(255,255,255,0.35)",
                }}
              />
            </div>
            <div
              style={{
                fontSize: 12,
                fontWeight: 800,
                color: preview.mode === "light" ? "#111827" : "#eef2ff",
              }}
            >
              {name}
            </div>
          </button>
        );
      })}
    </div>
  );
}

export function FontLibrary({
  value,
  onChange,
}: {
  value: string;
  onChange: (next: string) => void;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
        gap: 8,
      }}
    >
      {GLOBAL_FONTS.map((font) => {
        const active = value === font.value;
        return (
          <button
            key={font.value}
            onClick={() => onChange(font.value)}
            style={{
              borderRadius: 12,
              border: `1px solid ${active ? "rgba(255,255,255,0.34)" : "rgba(255,255,255,0.12)"}`,
              background: active
                ? "rgba(255,255,255,0.14)"
                : "rgba(255,255,255,0.04)",
              padding: "10px 11px",
              textAlign: "left",
              cursor: "pointer",
            }}
          >
            <div
              style={{
                fontSize: 12,
                fontWeight: 800,
                fontFamily: font.value,
              }}
            >
              {font.label}
            </div>
            <div
              style={{
                marginTop: 3,
                fontSize: 13,
                opacity: 0.82,
                fontFamily: font.value,
              }}
            >
              Nexus Workspace Aa Bb Cc 123
            </div>
          </button>
        );
      })}
    </div>
  );
}

export function Toggle({
  label,
  checked,
  desc,
  onChange,
}: {
  label: string;
  checked: boolean;
  desc?: string;
  onChange: (next: boolean) => void;
}) {
  const t = useTheme();
  return (
    <button
      onClick={() => onChange(!checked)}
      style={{
        width: "100%",
        textAlign: "left",
        borderRadius: 12,
        border: `1px solid ${checked ? t.accent : "rgba(255,255,255,0.12)"}`,
        background: checked
          ? `rgba(${hexToRgb(t.accent)},0.16)`
          : "rgba(255,255,255,0.03)",
        padding: "10px 11px",
        cursor: "pointer",
      }}
    >
      <div style={{ fontSize: 12, fontWeight: 700 }}>{label}</div>
      {desc ? (
        <div style={{ fontSize: 10, opacity: 0.62, marginTop: 2 }}>{desc}</div>
      ) : null}
    </button>
  );
}

export function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  unit = "",
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (value: number) => void;
}) {
  const t = useTheme();
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 4,
        }}
      >
        <div style={{ fontSize: 11, opacity: 0.68 }}>{label}</div>
        <div style={{ fontSize: 11, fontWeight: 700, color: t.accent }}>
          {Number.isInteger(value) ? value : value.toFixed(2)}
          {unit}
        </div>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        style={{
          width: "100%",
          height: 4,
          borderRadius: 999,
          appearance: "none",
          background: `linear-gradient(to right, ${t.accent} ${pct}%, rgba(255,255,255,0.15) ${pct}%)`,
          outline: "none",
        }}
      />
    </div>
  );
}
