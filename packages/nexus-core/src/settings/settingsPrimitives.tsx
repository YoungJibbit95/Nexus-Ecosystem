import type { ReactNode } from "react";

export function SettingRow({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <label
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(0, 1fr) auto",
        gap: 12,
        alignItems: "center",
      }}
    >
      <span style={{ display: "grid", gap: 3 }}>
        <strong style={{ fontSize: 13 }}>{label}</strong>
        {description ? (
          <span style={{ color: "var(--text-muted)", fontSize: 11 }}>{description}</span>
        ) : null}
      </span>
      {children}
    </label>
  );
}

export function SettingToggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <SettingRow label={label} description={description}>
      <input
        aria-label={label}
        checked={checked}
        onChange={(event) => onChange(event.currentTarget.checked)}
        type="checkbox"
      />
    </SettingRow>
  );
}

export function SettingSlider({
  value,
  min,
  max,
  step = 1,
  onChange,
  label,
  description,
}: {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  label: string;
  description?: string;
}) {
  return (
    <SettingRow label={label} description={description}>
      <input
        aria-label={label}
        max={max}
        min={min}
        onChange={(event) => onChange(Number(event.currentTarget.value))}
        step={step}
        type="range"
        value={value}
      />
    </SettingRow>
  );
}

export function SettingSelect<T extends string>({
  value,
  options,
  onChange,
  label,
  description,
}: {
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (value: T) => void;
  label: string;
  description?: string;
}) {
  return (
    <SettingRow label={label} description={description}>
      <select
        aria-label={label}
        onChange={(event) => onChange(event.currentTarget.value as T)}
        value={value}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </SettingRow>
  );
}
