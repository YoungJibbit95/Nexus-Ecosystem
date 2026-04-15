import React from "react";
import { Image as ImageIcon } from "lucide-react";

export function renderBuilderElementContent(element: {
  type: string;
  label: string;
  fontSize: number;
}) {
  if (element.type === "image") {
    return (
      <div style={{ width: "100%", height: "100%", display: "grid", placeItems: "center" }}>
        <ImageIcon size={24} style={{ opacity: 0.8 }} />
      </div>
    );
  }
  if (element.type === "input") {
    return (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          opacity: 0.82,
          fontSize: element.fontSize,
        }}
      >
        {element.label}
      </div>
    );
  }
  return <span>{element.label}</span>;
}

export function InspectorRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontSize: 10, opacity: 0.55, marginBottom: 4 }}>{label}</div>
      {children}
    </div>
  );
}

export function NumberInput({
  value,
  min,
  max,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  onChange: (next: number) => void;
}) {
  return (
    <input
      type="number"
      value={Math.round(value)}
      min={min}
      max={max}
      onChange={(event) => onChange(Number(event.target.value))}
      style={{
        width: "100%",
        borderRadius: 7,
        border: "1px solid rgba(255,255,255,0.13)",
        background: "rgba(255,255,255,0.06)",
        color: "inherit",
        padding: "6px 8px",
        fontSize: 11,
      }}
    />
  );
}
