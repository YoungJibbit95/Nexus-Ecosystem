import React, { useMemo } from "react";
import {
  Copy,
  LocateFixed,
  SlidersHorizontal,
  Trash2,
  X,
} from "lucide-react";
import type {
  CanvasNode,
  CanvasNodePriority,
  CanvasNodeStatus,
} from "../../../store/canvasStore";
import { NODE_COLORS, getWidgetPreset } from "../constants";

type CanvasInspectorProps = {
  node: CanvasNode | null;
  mode: "dark" | "light";
  accent: string;
  rgb: string;
  onUpdateNode: (patch: Partial<CanvasNode>) => void;
  onMoveNode: (x: number, y: number) => void;
  onResizeNode: (width: number, height: number) => void;
  onDuplicateNode: () => void;
  onDeleteNode: () => void;
  onFocusNode: () => void;
  onClose: () => void;
};

const STATUS_OPTIONS: CanvasNodeStatus[] = ["todo", "doing", "blocked", "done"];
const PRIORITY_OPTIONS: CanvasNodePriority[] = ["low", "mid", "high", "critical"];

const clampNumber = (value: number, fallback: number, min: number, max: number) => {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, value));
};

const parseTagsInput = (value: string) =>
  value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .slice(0, 40);

const baseButtonStyle: React.CSSProperties = {
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 8,
  background: "rgba(255,255,255,0.06)",
  color: "inherit",
  cursor: "pointer",
  height: 32,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 7,
  padding: "0 10px",
  fontSize: 11,
  fontWeight: 800,
};

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label
      style={{
        display: "block",
        marginBottom: 5,
        fontSize: 10,
        fontWeight: 800,
        opacity: 0.62,
        textTransform: "uppercase",
      }}
    >
      {children}
    </label>
  );
}

function NumberField({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <input
        type="number"
        value={Math.round(value)}
        min={min}
        max={max}
        onChange={(event) =>
          onChange(clampNumber(Number(event.currentTarget.value), value, min, max))
        }
        style={fieldStyle}
      />
    </div>
  );
}

const fieldStyle: React.CSSProperties = {
  width: "100%",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 8,
  background: "rgba(255,255,255,0.065)",
  color: "inherit",
  padding: "8px 9px",
  fontSize: 12,
  outline: "none",
};

export const CanvasInspector = React.memo(function CanvasInspector({
  node,
  mode,
  accent,
  rgb,
  onUpdateNode,
  onMoveNode,
  onResizeNode,
  onDuplicateNode,
  onDeleteNode,
  onFocusNode,
  onClose,
}: CanvasInspectorProps) {
  const preset = useMemo(
    () => (node ? getWidgetPreset(node.type) : null),
    [node],
  );
  const tagsValue = useMemo(() => (node?.tags || []).join(", "), [node?.tags]);

  if (!node) return null;

  const nodeAccent = node.color || preset?.accent || accent;
  const contentLabel =
    node.type === "image" ? "Bild URL" : node.type === "code" ? "Code" : "Inhalt";

  return (
    <aside
      className="nx-canvas-inspector"
      style={{
        ["--nx-canvas-inspector-rgb" as any]: rgb,
        ["--nx-canvas-inspector-accent" as any]: nodeAccent,
        ["--nx-canvas-inspector-bg" as any]:
          mode === "dark" ? "rgba(8,12,24,0.9)" : "rgba(255,255,255,0.92)",
      }}
    >
      <div className="nx-canvas-inspector-header">
        <div
          className="nx-canvas-inspector-icon"
          style={{
            color: nodeAccent,
          }}
        >
          <SlidersHorizontal size={15} />
        </div>
        <div className="nx-canvas-inspector-title">
          <div>
            Inspector
          </div>
          <span>
            {preset?.label || node.type}
          </span>
        </div>
        <div className="nx-canvas-inspector-node">
          <strong>{node.title || "Untitled node"}</strong>
          <span>{node.type}</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          title="Inspector schliessen"
          aria-label="Inspector schliessen"
          style={{
            ...baseButtonStyle,
            width: 30,
            padding: 0,
            borderRadius: 9,
          }}
        >
          <X size={14} />
        </button>
      </div>

      <div className="nx-canvas-inspector-body">
        <section className="nx-canvas-inspector-section nx-canvas-inspector-section--title">
          <FieldLabel>Titel</FieldLabel>
          <input
            value={node.title}
            onChange={(event) => onUpdateNode({ title: event.currentTarget.value })}
            style={{ ...fieldStyle, fontWeight: 800 }}
          />
        </section>

        <section className="nx-canvas-inspector-section nx-canvas-inspector-section--content">
          <FieldLabel>{contentLabel}</FieldLabel>
          <textarea
            value={node.content || ""}
            onChange={(event) => onUpdateNode({ content: event.currentTarget.value })}
            spellCheck={node.type !== "code"}
            style={{
              ...fieldStyle,
              minHeight: node.type === "code" ? 148 : 116,
              resize: "vertical",
              fontFamily:
                node.type === "code"
                  ? "ui-monospace, SFMono-Regular, Menlo, monospace"
                  : undefined,
              lineHeight: 1.45,
            }}
          />
        </section>

        {node.type === "code" && (
          <section className="nx-canvas-inspector-section nx-canvas-inspector-section--language">
            <FieldLabel>Sprache</FieldLabel>
            <input
              value={node.codeLang || ""}
              placeholder="typescript"
              onChange={(event) => onUpdateNode({ codeLang: event.currentTarget.value })}
              style={fieldStyle}
            />
          </section>
        )}

        <section
          className="nx-canvas-inspector-section nx-canvas-inspector-section--state"
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 9,
          }}
        >
          <div>
            <FieldLabel>Status</FieldLabel>
            <select
              value={node.status || "todo"}
              onChange={(event) =>
                onUpdateNode({ status: event.currentTarget.value as CanvasNodeStatus })
              }
              style={fieldStyle}
            >
              {STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>
          <div>
            <FieldLabel>Prioritaet</FieldLabel>
            <select
              value={node.priority || "mid"}
              onChange={(event) =>
                onUpdateNode({
                  priority: event.currentTarget.value as CanvasNodePriority,
                })
              }
              style={fieldStyle}
            >
              {PRIORITY_OPTIONS.map((priority) => (
                <option key={priority} value={priority}>
                  {priority}
                </option>
              ))}
            </select>
          </div>
        </section>

        <section className="nx-canvas-inspector-section nx-canvas-inspector-section--progress">
          <FieldLabel>Progress {Math.round(node.progress ?? 0)}%</FieldLabel>
          <input
            type="range"
            min={0}
            max={100}
            value={node.progress ?? 0}
            onChange={(event) => onUpdateNode({ progress: Number(event.currentTarget.value) })}
            style={{ width: "100%", accentColor: nodeAccent }}
          />
        </section>

        <section
          className="nx-canvas-inspector-section nx-canvas-inspector-section--owner"
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 9,
          }}
        >
          <div>
            <FieldLabel>Owner</FieldLabel>
            <input
              value={node.owner || ""}
              onChange={(event) => onUpdateNode({ owner: event.currentTarget.value })}
              style={fieldStyle}
            />
          </div>
          <div>
            <FieldLabel>Faellig</FieldLabel>
            <input
              type="date"
              value={node.dueDate || ""}
              onChange={(event) => onUpdateNode({ dueDate: event.currentTarget.value || undefined })}
              style={fieldStyle}
            />
          </div>
        </section>

        <section className="nx-canvas-inspector-section nx-canvas-inspector-section--tags">
          <FieldLabel>Tags</FieldLabel>
          <input
            value={tagsValue}
            onChange={(event) => onUpdateNode({ tags: parseTagsInput(event.currentTarget.value) })}
            placeholder="release, design, blocker"
            style={fieldStyle}
          />
        </section>

        <section className="nx-canvas-inspector-section nx-canvas-inspector-section--color">
          <FieldLabel>Farbe</FieldLabel>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gap: 6 }}>
            {NODE_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => onUpdateNode({ color })}
                title={color}
                aria-label={`Farbe ${color}`}
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 999,
                  border:
                    nodeAccent.toLowerCase() === color.toLowerCase()
                      ? "2px solid white"
                      : "1px solid rgba(255,255,255,0.18)",
                  background: color,
                  cursor: "pointer",
                  boxShadow:
                    nodeAccent.toLowerCase() === color.toLowerCase()
                      ? `0 0 0 2px ${color}55`
                      : "none",
                }}
              />
            ))}
          </div>
        </section>

        <section
          className="nx-canvas-inspector-section nx-canvas-inspector-section--geometry"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            gap: 9,
          }}
        >
          <NumberField label="X" value={node.x} min={-100000} max={100000} onChange={(x) => onMoveNode(x, node.y)} />
          <NumberField label="Y" value={node.y} min={-100000} max={100000} onChange={(y) => onMoveNode(node.x, y)} />
          <NumberField label="Breite" value={node.width} min={120} max={1600} onChange={(width) => onResizeNode(width, node.height)} />
          <NumberField label="Hoehe" value={node.height} min={80} max={1400} onChange={(height) => onResizeNode(node.width, height)} />
        </section>

        <section className="nx-canvas-inspector-section nx-canvas-inspector-actions">
          <button type="button" onClick={onFocusNode} style={baseButtonStyle}>
            <LocateFixed size={13} />
            Fokus
          </button>
          <button type="button" onClick={onDuplicateNode} style={baseButtonStyle}>
            <Copy size={13} />
            Kopie
          </button>
          <button
            type="button"
            onClick={onDeleteNode}
            style={{
              ...baseButtonStyle,
              color: "#FF453A",
              borderColor: "rgba(255,69,58,0.26)",
              background: "rgba(255,69,58,0.1)",
            }}
          >
            <Trash2 size={13} />
            Loeschen
          </button>
        </section>
      </div>
    </aside>
  );
});
