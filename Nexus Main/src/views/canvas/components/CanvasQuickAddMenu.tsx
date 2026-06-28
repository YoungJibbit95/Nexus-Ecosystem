import React, { useEffect, useMemo, useState } from "react";
import { AlertCircle, Calendar, FileText, Search, Wand2, X } from "lucide-react";
import type { NodeType } from "../../../store/canvasStore";
import type { CanvasWidgetCategory, CanvasWidgetPreset } from "../constants";

const categoryOrder: CanvasWidgetCategory[] = [
  "Capture",
  "Execution",
  "Planning",
  "Control",
];

export function CanvasQuickAddMenu({
  quickAddPos,
  canvasSize,
  viewport,
  widgets,
  rgb,
  accent,
  mode,
  addWidgetNode,
  setQuickAddPos,
  createStarterPack,
  createMagicTemplate,
}: {
  quickAddPos: { x: number; y: number } | null;
  canvasSize: { w: number; h: number };
  viewport: { panX: number; panY: number; zoom: number };
  widgets: CanvasWidgetPreset[];
  rgb: string;
  accent: string;
  mode: "dark" | "light";
  addWidgetNode: (type: NodeType | "sticky", x?: number, y?: number) => void;
  setQuickAddPos: (next: { x: number; y: number } | null) => void;
  createStarterPack: (origin?: { x: number; y: number }) => void;
  createMagicTemplate: (payload: any) => void;
}) {
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!quickAddPos) setQuery("");
  }, [quickAddPos]);

  useEffect(() => {
    if (!quickAddPos) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setQuickAddPos(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [quickAddPos, setQuickAddPos]);

  const normalizedQuery = query.trim().toLowerCase();
  const filteredWidgets = useMemo(() => {
    if (!normalizedQuery) return widgets;
    return widgets.filter((widget) =>
      [
        widget.label,
        widget.description,
        widget.category,
        widget.type,
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery),
    );
  }, [normalizedQuery, widgets]);

  const groupedWidgets = useMemo(
    () =>
      categoryOrder
        .map((category) => ({
          category,
          items: filteredWidgets.filter((widget) => widget.category === category),
        }))
        .filter((group) => group.items.length > 0),
    [filteredWidgets],
  );

  if (!quickAddPos) return null;

  const menuW = Math.max(224, Math.min(360, canvasSize.w - 16));
  const menuH = Math.max(300, Math.min(560, canvasSize.h - 16));
  const clampedX = Math.max(8, Math.min(quickAddPos.x, canvasSize.w - menuW - 8));
  const clampedY = Math.max(8, Math.min(quickAddPos.y, canvasSize.h - menuH - 8));

  const getCanvasPoint = () => {
    const zoom = Math.max(0.15, viewport.zoom);
    return {
      x: (-viewport.panX + quickAddPos.x) / zoom,
      y: (-viewport.panY + quickAddPos.y) / zoom,
    };
  };

  const closeMenu = () => setQuickAddPos(null);

  const packButtons = [
    {
      label: "Starter",
      detail: "Core nodes",
      icon: FileText,
      onClick: () => createStarterPack(getCanvasPoint()),
      primary: true,
    },
    {
      label: "Mindmap",
      detail: "Ideas",
      icon: Wand2,
      onClick: () =>
        createMagicTemplate({
          template: "mindmap",
          title: "Mindmap Pack",
          includeNotes: true,
          includeTasks: true,
        }),
    },
    {
      label: "Roadmap",
      detail: "Milestones",
      icon: Calendar,
      onClick: () =>
        createMagicTemplate({
          template: "roadmap",
          title: "Roadmap Pack",
          includeNotes: true,
          includeTasks: true,
        }),
    },
    {
      label: "Risk",
      detail: "Matrix",
      icon: AlertCircle,
      onClick: () =>
        createMagicTemplate({
          template: "risk-matrix",
          title: "Risk Pack",
          includeNotes: true,
          includeTasks: true,
        }),
    },
  ];

  return (
    <div
      className="nx-canvas-quick-add"
      data-mode={mode}
      style={{
        position: "absolute",
        top: clampedY,
        left: clampedX,
        zIndex: 300,
        width: menuW,
        maxHeight: menuH,
        ["--nx-canvas-accent-rgb" as any]: rgb,
        ["--nx-canvas-accent" as any]: accent,
      }}
      onClick={(event) => event.stopPropagation()}
    >
      <header className="nx-canvas-quick-add-header">
        <div>
          <div className="nx-canvas-quick-add-title">Add to canvas</div>
          <div className="nx-canvas-quick-add-subtitle">Packs und Nodes</div>
        </div>
        <button
          type="button"
          className="nx-canvas-icon-button"
          onClick={closeMenu}
          title="Schliessen"
          aria-label="Quick Add schliessen"
        >
          <X size={14} />
        </button>
      </header>

      <label className="nx-canvas-quick-add-search">
        <Search size={13} />
        <input
          autoFocus
          value={query}
          onChange={(event) => setQuery(event.currentTarget.value)}
          placeholder="Node suchen..."
        />
      </label>

      <section className="nx-canvas-quick-pack-grid" aria-label="Quick packs">
        {packButtons.map(({ label, detail, icon: Icon, onClick, primary }) => (
          <button
            key={label}
            type="button"
            className="nx-canvas-quick-pack"
            data-primary={primary ? "true" : "false"}
            onClick={() => {
              onClick();
              closeMenu();
            }}
          >
            <Icon size={14} />
            <span>
              <strong>{label}</strong>
              <small>{detail}</small>
            </span>
          </button>
        ))}
      </section>

      <div className="nx-canvas-quick-add-list">
        {groupedWidgets.length === 0 ? (
          <div className="nx-canvas-quick-add-empty">Keine Elemente gefunden.</div>
        ) : (
          groupedWidgets.map(({ category, items }) => (
            <section key={category} className="nx-canvas-quick-add-category">
              <div className="nx-canvas-quick-add-category-title">{category}</div>
              {items.map(({ type, icon: WIcon, label, description, accent: widgetAccent }) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => {
                    const point = getCanvasPoint();
                    addWidgetNode(type, point.x, point.y);
                    closeMenu();
                  }}
                  className="nx-surface-row nx-canvas-quick-add-row"
                  data-active="false"
                  style={{
                    ["--nx-row-hover-bg" as any]: `rgba(${rgb},0.1)`,
                    ["--nx-widget-accent" as any]: widgetAccent,
                  }}
                >
                  <span className="nx-canvas-quick-add-icon">
                    <WIcon size={14} />
                  </span>
                  <span className="nx-canvas-quick-add-copy">
                    <strong>{label}</strong>
                    <small>{description}</small>
                  </span>
                </button>
              ))}
            </section>
          ))
        )}
      </div>
    </div>
  );
}
