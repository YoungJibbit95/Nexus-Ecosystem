import React from "react";
import {
  AlignCenter,
  Calendar,
  CheckSquare,
  Copy,
  FileDown,
  FileText,
  Grid,
  Link,
  LocateFixed,
  Map,
  Maximize2,
  Plus,
  RotateCcw,
  RotateCw,
  Search,
  Wand2,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import type { NodeType, Canvas } from "../../../store/canvasStore";
import { ToolBtn } from "./ToolBtn";

type WidgetType = { type: NodeType | "sticky"; icon: any; label: string };
type LayoutMode = "mindmap" | "timeline" | "board";
type GridMode = "dots" | "lines" | "none";

const layoutLabels: Record<LayoutMode, string> = {
  mindmap: "Mindmap",
  timeline: "Timeline",
  board: "Board",
};

const gridLabels: Record<GridMode, string> = {
  dots: "Dots",
  lines: "Lines",
  none: "Off",
};

function ToolbarGroup({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="nx-canvas-toolbar-group" aria-label={label}>
      <span className="nx-canvas-toolbar-group-label">{label}</span>
      <div className="nx-canvas-toolbar-group-actions">{children}</div>
    </div>
  );
}

function StatusChip({
  value,
  label,
  title,
}: {
  value: React.ReactNode;
  label: string;
  title: string;
}) {
  return (
    <span className="nx-canvas-status-chip" title={title}>
      <strong>{value}</strong>
      <span>{label}</span>
    </span>
  );
}

export function CanvasTopBar({
  mode,
  accent,
  rgb,
  canvas,
  showCanvasList,
  setShowCanvasList,
  editCanvasName,
  setEditCanvasName,
  renameCanvas,
  quickWidgetTypes,
  widgets,
  addWidgetNode,
  onOpenQuickAddMenu,
  quickAddOpen,
  createStarterPack,
  openProjectSearch,
  showProjectPanel,
  setShowProjectPanel,
  autoLinkWikiRefs,
  duplicateSelectedNode,
  selectedNodeId,
  showMagicBuilder,
  setShowMagicBuilder,
  gridMode,
  setGridMode,
  showMiniMap,
  setShowMiniMap,
  snapToGrid,
  setSnapToGrid,
  layoutMode,
  setLayoutMode,
  applyAutoLayout,
  autoArrangeByStatus,
  fitView,
  onFocusSelection,
  viewportZoom,
  setZoomCentered,
  resetViewport,
  exportCanvas,
}: {
  mode: "dark" | "light";
  accent: string;
  rgb: string;
  canvas: Canvas | null | undefined;
  showCanvasList: boolean;
  setShowCanvasList: (next: boolean) => void;
  editCanvasName: boolean;
  setEditCanvasName: (next: boolean) => void;
  renameCanvas: (id: string, name: string) => void;
  quickWidgetTypes: Array<NodeType | "sticky">;
  widgets: WidgetType[];
  addWidgetNode: (type: NodeType | "sticky") => void;
  onOpenQuickAddMenu: () => void;
  quickAddOpen: boolean;
  createStarterPack: () => void;
  openProjectSearch: () => void;
  showProjectPanel: boolean;
  setShowProjectPanel: (next: boolean | ((prev: boolean) => boolean)) => void;
  autoLinkWikiRefs: () => void;
  duplicateSelectedNode: () => void;
  selectedNodeId: string | null;
  showMagicBuilder: boolean;
  setShowMagicBuilder: (next: boolean) => void;
  gridMode: GridMode;
  setGridMode: (next: GridMode | ((prev: GridMode) => GridMode)) => void;
  showMiniMap: boolean;
  setShowMiniMap: (next: boolean) => void;
  snapToGrid: boolean;
  setSnapToGrid: (next: boolean | ((prev: boolean) => boolean)) => void;
  layoutMode: LayoutMode;
  setLayoutMode: (next: LayoutMode) => void;
  applyAutoLayout: (mode: LayoutMode) => void;
  autoArrangeByStatus: () => void;
  fitView: () => void;
  onFocusSelection: () => void;
  viewportZoom: number;
  setZoomCentered: (nextZoom: number) => void;
  resetViewport: () => void;
  exportCanvas: () => void;
}) {
  const nodeCount = canvas?.nodes.length ?? 0;
  const linkCount = canvas?.connections.length ?? 0;
  const zoomLabel = `${Math.round(viewportZoom * 100)}%`;
  const nodeLabel = nodeCount === 1 ? "node" : "nodes";
  const linkLabel = linkCount === 1 ? "link" : "links";
  const gridLabel = gridLabels[gridMode];

  return (
    <div
      className="nx-canvas-topbar"
      data-mode={mode}
      style={{
        flexShrink: 0,
        borderBottom: `1px solid ${
          mode === "dark" ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"
        }`,
        background:
          mode === "dark"
            ? `linear-gradient(90deg, rgba(${rgb},0.09), rgba(255,255,255,0.018))`
            : "rgba(255,255,255,0.66)",
        backdropFilter: "blur(14px)",
        overflowX: "auto",
        overflowY: "hidden",
        position: "relative",
        zIndex: 80,
      }}
    >
      <div
        className="nx-canvas-topbar-inner"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          minWidth: 0,
          padding: "6px 8px",
          position: "relative",
        }}
      >
        <section className="nx-canvas-toolbar-context" aria-label="Canvas context">
          <ToolBtn
            icon={FileText}
            tooltip={showCanvasList ? "Canvas-Liste schliessen" : "Canvas-Liste oeffnen"}
            onClick={() => setShowCanvasList(!showCanvasList)}
            accent={accent}
            rgb={rgb}
            active={showCanvasList}
            label="Canvas"
          />

          <div className="nx-canvas-title-area">
            {canvas &&
              (editCanvasName ? (
                <input
                  autoFocus
                  className="nx-canvas-title-input"
                  value={canvas.name}
                  onChange={(event) => renameCanvas(canvas.id, event.target.value)}
                  onBlur={() => setEditCanvasName(false)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") setEditCanvasName(false);
                    if (event.key === "Escape") setEditCanvasName(false);
                  }}
                  style={{
                    color: accent,
                  }}
                />
              ) : (
                <button
                  type="button"
                  className="nx-canvas-title-chip"
                  onClick={() => setEditCanvasName(true)}
                  style={{
                    color: accent,
                  }}
                  title="Canvas umbenennen"
                >
                  {canvas.name || "Untitled Canvas"}
                </button>
              ))}
            <div className="nx-canvas-status-chips" aria-label="Canvas status">
              <StatusChip
                value={nodeCount}
                label={nodeLabel}
                title={`${nodeCount} ${nodeLabel}`}
              />
              <StatusChip
                value={linkCount}
                label={linkLabel}
                title={`${linkCount} ${linkLabel}`}
              />
              <StatusChip
                value={layoutLabels[layoutMode]}
                label="layout"
                title={`Layout: ${layoutLabels[layoutMode]}`}
              />
            </div>
          </div>

          <button
            type="button"
            className="nx-canvas-jump-button"
            onClick={openProjectSearch}
            title="Node-Suche oeffnen"
          >
            <Search size={13} />
            <span>Search</span>
          </button>
        </section>

        <div className="nx-canvas-toolbar-groups">
          <ToolbarGroup label="Add">
            {widgets
              .filter((entry) => quickWidgetTypes.includes(entry.type))
              .map(({ type, icon: WIcon, label }) => (
                <ToolBtn
                  key={type}
                  icon={WIcon}
                  tooltip={label}
                  onClick={() => addWidgetNode(type)}
                  accent={accent}
                  rgb={rgb}
                />
              ))}
            <ToolBtn
              icon={Plus}
              tooltip="Quick-Add-Menue"
            onClick={onOpenQuickAddMenu}
            accent={accent}
            rgb={rgb}
            active={quickAddOpen}
            label="More"
          />
        </ToolbarGroup>

          <ToolbarGroup label="Work">
            <ToolBtn
              icon={CheckSquare}
              tooltip={showProjectPanel ? "Project Panel schliessen" : "Project Panel oeffnen"}
              onClick={() => setShowProjectPanel((prev) => !prev)}
              accent={accent}
              rgb={rgb}
              active={showProjectPanel}
              label="Project"
            />
            <ToolBtn
              icon={Link}
              tooltip="Auto-Link fuer [[Node Titel]]"
              onClick={autoLinkWikiRefs}
              accent={accent}
              rgb={rgb}
              label="Link"
            />
            <ToolBtn
              icon={Calendar}
              tooltip="Starter Pack einfuegen"
              onClick={createStarterPack}
              accent={accent}
              rgb={rgb}
              label="Starter"
            />
            <ToolBtn
              icon={Copy}
              tooltip="Ausgewaehlten Node duplizieren"
              onClick={duplicateSelectedNode}
              accent={accent}
              rgb={rgb}
              active={Boolean(selectedNodeId)}
              disabled={!selectedNodeId}
              label="Copy"
            />
            <ToolBtn
              icon={Wand2}
              tooltip="Magic Builder"
              onClick={() => setShowMagicBuilder(true)}
              accent={accent}
              rgb={rgb}
              active={showMagicBuilder}
              label="Magic"
            />
          </ToolbarGroup>

          <ToolbarGroup label="Layout">
            <select
              className="nx-canvas-layout-select"
              value={layoutMode}
              aria-label="Layout-Modus"
              onChange={(event) => {
                const nextMode = event.target.value as LayoutMode;
                setLayoutMode(nextMode);
                applyAutoLayout(nextMode);
              }}
            >
              <option value="mindmap">Mindmap</option>
              <option value="timeline">Timeline</option>
              <option value="board">Board</option>
            </select>
            <ToolBtn
              icon={RotateCw}
              tooltip={`Auto Layout (${layoutLabels[layoutMode]})`}
              onClick={() => applyAutoLayout(layoutMode)}
              accent={accent}
              rgb={rgb}
              label="Auto"
            />
            <ToolBtn
              icon={AlignCenter}
              tooltip="Nach Status anordnen"
              onClick={autoArrangeByStatus}
              accent={accent}
              rgb={rgb}
              label="Status"
            />
          </ToolbarGroup>

          <ToolbarGroup label="View">
            <ToolBtn
              icon={Grid}
              tooltip={`Grid: ${gridLabel}`}
              onClick={() =>
                setGridMode((prev) =>
                  prev === "dots" ? "lines" : prev === "lines" ? "none" : "dots",
                )
              }
              accent={accent}
              rgb={rgb}
              active={gridMode !== "none"}
              label="Grid"
            />
            <ToolBtn
              icon={Map}
              tooltip={showMiniMap ? "Minimap ausblenden" : "Minimap anzeigen"}
              onClick={() => setShowMiniMap(!showMiniMap)}
              accent={accent}
              rgb={rgb}
              active={showMiniMap}
              label="Map"
            />
            <ToolBtn
              icon={AlignCenter}
              tooltip={snapToGrid ? "Snap deaktivieren" : "Snap aktivieren"}
              onClick={() => setSnapToGrid((prev) => !prev)}
              accent={accent}
              rgb={rgb}
              active={snapToGrid}
              label="Snap"
            />
            <ToolBtn
              icon={Maximize2}
              tooltip="Alles einpassen"
              onClick={fitView}
              accent={accent}
              rgb={rgb}
              label="Fit"
            />
            <ToolBtn
              icon={LocateFixed}
              tooltip={selectedNodeId ? "Auswahl fokussieren" : "Canvas fokussieren"}
              onClick={onFocusSelection}
              accent={accent}
              rgb={rgb}
              active={Boolean(selectedNodeId)}
              label="Focus"
            />
            <ToolBtn
              icon={ZoomOut}
              tooltip="Rauszoomen"
              onClick={() => setZoomCentered(viewportZoom - 0.15)}
              accent={accent}
              rgb={rgb}
            />
            <span className="nx-canvas-zoom-chip">{zoomLabel}</span>
            <ToolBtn
              icon={ZoomIn}
              tooltip="Reinzoomen"
              onClick={() => setZoomCentered(viewportZoom + 0.15)}
              accent={accent}
              rgb={rgb}
            />
            <ToolBtn
              icon={RotateCcw}
              tooltip="Ansicht zuruecksetzen"
              onClick={resetViewport}
              accent={accent}
              rgb={rgb}
            />
            <ToolBtn
              icon={FileDown}
              tooltip="Canvas exportieren"
              onClick={exportCanvas}
              accent={accent}
              rgb={rgb}
              label="Export"
            />
          </ToolbarGroup>
        </div>
      </div>
    </div>
  );
}
