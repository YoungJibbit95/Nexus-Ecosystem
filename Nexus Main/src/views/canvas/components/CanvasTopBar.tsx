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
  Wand2,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import type { NodeType, Canvas } from "../../../store/canvasStore";
import type { MagicTemplatePayload } from "../CanvasMagicModal";
import { ToolBtn } from "./ToolBtn";

type WidgetType = { type: NodeType | "sticky"; icon: any; label: string };

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
  createMagicTemplate,
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
  createMagicTemplate: (payload: MagicTemplatePayload) => void;
  showProjectPanel: boolean;
  setShowProjectPanel: (next: boolean | ((prev: boolean) => boolean)) => void;
  autoLinkWikiRefs: () => void;
  duplicateSelectedNode: () => void;
  selectedNodeId: string | null;
  showMagicBuilder: boolean;
  setShowMagicBuilder: (next: boolean) => void;
  gridMode: "dots" | "lines" | "none";
  setGridMode: (next: "dots" | "lines" | "none" | ((prev: "dots" | "lines" | "none") => "dots" | "lines" | "none")) => void;
  showMiniMap: boolean;
  setShowMiniMap: (next: boolean) => void;
  snapToGrid: boolean;
  setSnapToGrid: (next: boolean | ((prev: boolean) => boolean)) => void;
  layoutMode: "mindmap" | "timeline" | "board";
  setLayoutMode: (next: "mindmap" | "timeline" | "board") => void;
  applyAutoLayout: (mode: "mindmap" | "timeline" | "board") => void;
  autoArrangeByStatus: () => void;
  fitView: () => void;
  onFocusSelection: () => void;
  viewportZoom: number;
  setZoomCentered: (nextZoom: number) => void;
  resetViewport: () => void;
  exportCanvas: () => void;
}) {
  return (
    <div
      style={{
        flexShrink: 0,
        borderBottom: `1px solid ${
          mode === "dark" ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"
        }`,
        background: mode === "dark" ? "rgba(255,255,255,0.025)" : "rgba(255,255,255,0.6)",
        backdropFilter: "blur(16px)",
        overflowX: "auto",
        overflowY: "visible",
        position: "relative",
        zIndex: 80,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 4,
          minWidth: "max-content",
          padding: "5px 8px",
          position: "relative",
        }}
      >
        <ToolBtn
          icon={FileText}
          tooltip="Toggle Sidebar"
          onClick={() => setShowCanvasList(!showCanvasList)}
          accent={accent}
          rgb={rgb}
          active={showCanvasList}
        />

        {canvas &&
          (editCanvasName ? (
            <input
              autoFocus
              value={canvas.name}
              onChange={(e) => renameCanvas(canvas.id, e.target.value)}
              onBlur={() => setEditCanvasName(false)}
              onKeyDown={(e) => e.key === "Enter" && setEditCanvasName(false)}
              style={{
                background: "transparent",
                border: "none",
                outline: "none",
                color: accent,
                fontWeight: 600,
                fontSize: 13,
                width: 130,
                padding: "1px 4px",
              }}
            />
          ) : (
            <span
              onDoubleClick={() => setEditCanvasName(true)}
              style={{
                fontWeight: 600,
                fontSize: 13,
                color: accent,
                padding: "1px 6px",
                cursor: "pointer",
                borderRadius: 4,
                maxWidth: 160,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {canvas.name}
            </span>
          ))}

        <div
          style={{
            width: 1,
            height: 18,
            background: "rgba(255,255,255,0.1)",
            margin: "0 2px",
          }}
        />

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

        <div style={{ position: "relative" }}>
          <ToolBtn
            icon={Plus}
            tooltip="Mehr Elemente"
            onClick={onOpenQuickAddMenu}
            accent={accent}
            rgb={rgb}
            active={quickAddOpen}
          />
        </div>

        <div style={{ flex: 1 }} />

        <ToolBtn
          icon={CheckSquare}
          tooltip={showProjectPanel ? "Project Panel schliessen" : "Project Panel oeffnen"}
          onClick={() => setShowProjectPanel((prev) => !prev)}
          accent={accent}
          rgb={rgb}
          active={showProjectPanel}
        />
        <ToolBtn
          icon={Link}
          tooltip="Auto-Link fuer [[Node Titel]]"
          onClick={autoLinkWikiRefs}
          accent={accent}
          rgb={rgb}
        />
        <ToolBtn
          icon={Calendar}
          tooltip="Starter Pack einfuegen"
          onClick={createStarterPack}
          accent={accent}
          rgb={rgb}
        />
        <ToolBtn
          icon={Copy}
          tooltip="Ausgewaehlten Node duplizieren"
          onClick={duplicateSelectedNode}
          accent={accent}
          rgb={rgb}
          active={Boolean(selectedNodeId)}
        />
        <ToolBtn
          icon={Wand2}
          tooltip="Magic Builder (Ctrl+M)"
          onClick={() => setShowMagicBuilder(true)}
          accent={accent}
          rgb={rgb}
          active={showMagicBuilder}
        />
        <ToolBtn
          icon={Grid}
          tooltip="Grid-Modus umschalten"
          onClick={() =>
            setGridMode((prev) =>
              prev === "dots" ? "lines" : prev === "lines" ? "none" : "dots",
            )
          }
          accent={accent}
          rgb={rgb}
          active={gridMode !== "none"}
        />
        <ToolBtn
          icon={Map}
          tooltip={showMiniMap ? "Minimap ausblenden" : "Minimap anzeigen"}
          onClick={() => setShowMiniMap(!showMiniMap)}
          accent={accent}
          rgb={rgb}
          active={showMiniMap}
        />
        <ToolBtn
          icon={AlignCenter}
          tooltip={snapToGrid ? "Snap deaktivieren" : "Snap aktivieren"}
          onClick={() => setSnapToGrid((prev) => !prev)}
          accent={accent}
          rgb={rgb}
          active={snapToGrid}
        />
        <select
          value={layoutMode}
          onChange={(e) => {
            const nextMode = e.target.value as "mindmap" | "timeline" | "board";
            setLayoutMode(nextMode);
            applyAutoLayout(nextMode);
          }}
          style={{
            background: "rgba(255,255,255,0.08)",
            border: "1px solid rgba(255,255,255,0.12)",
            color: "inherit",
            borderRadius: 7,
            padding: "5px 7px",
            fontSize: 11,
            outline: "none",
          }}
        >
          <option value="mindmap">Mindmap</option>
          <option value="timeline">Timeline</option>
          <option value="board">Board</option>
        </select>
        <ToolBtn
          icon={RotateCw}
          tooltip={`Auto Layout (${layoutMode})`}
          onClick={() => applyAutoLayout(layoutMode)}
          accent={accent}
          rgb={rgb}
        />
        <ToolBtn
          icon={AlignCenter}
          tooltip="Nach Status anordnen"
          onClick={autoArrangeByStatus}
          accent={accent}
          rgb={rgb}
        />
        <ToolBtn
          icon={Maximize2}
          tooltip="Fit to View"
          onClick={fitView}
          accent={accent}
          rgb={rgb}
        />
        <ToolBtn
          icon={LocateFixed}
          tooltip={
            selectedNodeId ? "Ausgewaehlten Node fokussieren (F)" : "Canvas fokussieren (F)"
          }
          onClick={onFocusSelection}
          accent={accent}
          rgb={rgb}
          active={Boolean(selectedNodeId)}
        />

        <div
          style={{
            width: 1,
            height: 18,
            background: "rgba(255,255,255,0.1)",
            margin: "0 2px",
          }}
        />

        <ToolBtn
          icon={ZoomOut}
          tooltip="Rauszoomen"
          onClick={() => setZoomCentered(viewportZoom - 0.15)}
          accent={accent}
          rgb={rgb}
        />
        <span
          style={{
            fontSize: 11,
            fontFamily: "monospace",
            padding: "2px 6px",
            borderRadius: 5,
            background: "rgba(255,255,255,0.06)",
            minWidth: 42,
            textAlign: "center",
            opacity: 0.8,
          }}
        >
          {Math.round(viewportZoom * 100)}%
        </span>
        <ToolBtn
          icon={ZoomIn}
          tooltip="Reinzoomen"
          onClick={() => setZoomCentered(viewportZoom + 0.15)}
          accent={accent}
          rgb={rgb}
        />
        <ToolBtn
          icon={RotateCcw}
          tooltip="Reset View (Ctrl+0)"
          onClick={resetViewport}
          accent={accent}
          rgb={rgb}
        />
        <ToolBtn
          icon={FileDown}
          tooltip="Canvas exportieren (JSON + AI-Markdown)"
          onClick={exportCanvas}
          accent={accent}
          rgb={rgb}
        />
      </div>
    </div>
  );
}
