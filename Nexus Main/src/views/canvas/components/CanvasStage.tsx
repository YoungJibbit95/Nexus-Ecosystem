import React from "react";
import { Link } from "lucide-react";
import type { CanvasConnection, CanvasNode } from "../../../store/canvasStore";
import { ConnectionLine } from "./ConnectionLine";
import { NodeWidget } from "./NodeWidget";

const GRID_BASE_SIZE = 24;
const MIN_ZOOM = 0.15;
const MAX_ZOOM = 3;
const ZOOM_PRECISION = 1000;
const PIXEL_PRECISION = 2;

const stabilizeZoom = (zoom: number) =>
  Math.round(Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom)) * ZOOM_PRECISION) /
  ZOOM_PRECISION;
const stabilizePixel = (value: number) =>
  Math.round(value * PIXEL_PRECISION) / PIXEL_PRECISION;

export function CanvasStage({
  canvasRef,
  mode,
  accent,
  accent2,
  rgb,
  connectingFrom,
  setConnectingFrom,
  spaceHeld,
  panning,
  wheelPanning,
  gridMode,
  viewport,
  onCanvasMouseDown,
  onCanvasWheel,
  setQuickAddPos,
  layoutGuides,
  reduceConnectionEffects,
  visibleConnections,
  visibleNodeById,
  deleteConnection,
  visibleNodes,
  selectedNodeId,
  setSelectedNodeId,
  handleStartConnect,
  handleEndConnect,
  onHubQuickAction,
  snapToGrid,
  reduceNodeEffects,
}: {
  canvasRef: React.RefObject<HTMLDivElement>;
  mode: "dark" | "light";
  accent: string;
  accent2: string;
  rgb: string;
  connectingFrom: string | null;
  setConnectingFrom: (next: string | null) => void;
  spaceHeld: boolean;
  panning: boolean;
  wheelPanning: boolean;
  gridMode: "dots" | "lines" | "none";
  viewport: { panX: number; panY: number; zoom: number };
  onCanvasMouseDown: (event: React.MouseEvent<HTMLDivElement>) => void;
  onCanvasWheel: (event: React.WheelEvent<HTMLDivElement>) => void;
  setQuickAddPos: (next: { x: number; y: number } | null) => void;
  layoutGuides: any;
  reduceConnectionEffects: boolean;
  visibleConnections: CanvasConnection[];
  visibleNodeById: globalThis.Map<string, CanvasNode>;
  deleteConnection: (id: string) => void;
  visibleNodes: CanvasNode[];
  selectedNodeId: string | null;
  setSelectedNodeId: (next: string | null) => void;
  handleStartConnect: (id: string) => void;
  handleEndConnect: (id: string) => void;
  onHubQuickAction: (
    node: CanvasNode,
    action: "note" | "task" | "decision" | "risk",
  ) => void;
  snapToGrid: boolean;
  reduceNodeEffects: boolean;
}) {
  const stableZoom = stabilizeZoom(viewport.zoom);
  const stablePanX = stabilizePixel(viewport.panX);
  const stablePanY = stabilizePixel(viewport.panY);
  const stableGridSize = Math.max(
    8,
    stabilizePixel(GRID_BASE_SIZE * stableZoom),
  );
  const gridAlpha =
    stableZoom < 0.65 ? 0.055 : stableZoom > 1.35 ? 0.075 : 0.065;
  const gridColor =
    mode === "dark"
      ? `rgba(255,255,255,${gridAlpha})`
      : `rgba(0,0,0,${gridAlpha + 0.01})`;
  const dotColor =
    mode === "dark"
      ? `rgba(255,255,255,${Math.min(gridAlpha + 0.045, 0.12)})`
      : `rgba(0,0,0,${Math.min(gridAlpha + 0.035, 0.11)})`;
  const gridBackgroundImage =
    gridMode === "dots"
      ? `radial-gradient(circle, ${dotColor} 1px, transparent 1px)`
      : gridMode === "lines"
        ? `linear-gradient(${gridColor} 1px, transparent 1px), linear-gradient(90deg, ${gridColor} 1px, transparent 1px)`
        : "none";
  const sceneTransform = `translate(${stablePanX}px, ${stablePanY}px) scale(${stableZoom})`;

  return (
    <div
      className="nx-canvas-stage-wrap"
      style={{ flex: 1, position: "relative", overflow: "hidden" }}
    >
      {connectingFrom && (
        <div
          className="nx-canvas-connection-banner"
          style={{
            position: "absolute",
            bottom: 20,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 200,
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "10px 18px",
            borderRadius: 12,
            background: `rgba(${rgb}, 0.25)`,
            border: `1px solid ${accent}`,
            backdropFilter: "blur(12px)",
            fontSize: 12,
            fontWeight: 500,
            boxShadow: `0 4px 20px rgba(${rgb}, 0.3)`,
            animation: "nexus-fade-up 0.25s both",
          }}
        >
          <Link size={14} style={{ color: accent }} />
          Klicke auf einen anderen Node zum Verbinden
          <button
            type="button"
            onClick={() => setConnectingFrom(null)}
            style={{
              background: "rgba(255,255,255,0.12)",
              border: "none",
              borderRadius: 6,
              padding: "2px 10px",
              cursor: "pointer",
              color: "inherit",
              fontSize: 11,
            }}
          >
            Abbrechen
          </button>
        </div>
      )}

      {spaceHeld && (
        <div
          className="nx-canvas-pan-banner"
          style={{
            position: "absolute",
            top: 12,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 200,
            padding: "4px 12px",
            borderRadius: 8,
            background: "rgba(0,0,0,0.5)",
            fontSize: 11,
            opacity: 0.7,
            pointerEvents: "none",
          }}
        >
          Canvas pan active
        </div>
      )}

      {!connectingFrom && (
        <div
          className="nx-canvas-hint-pill"
          style={{
            position: "absolute",
            left: 14,
            bottom: 14,
            zIndex: 190,
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "6px 10px",
            borderRadius: 999,
            background: mode === "dark" ? "rgba(6,10,24,0.52)" : "rgba(255,255,255,0.68)",
            border: "1px solid rgba(255,255,255,0.12)",
            backdropFilter: "blur(14px)",
            fontSize: 10,
            fontWeight: 700,
            opacity: 0.72,
            pointerEvents: "none",
          }}
        >
          Canvas ready
          <span style={{ opacity: 0.42 }}>/</span>
          Add nodes
          <span style={{ opacity: 0.42 }}>/</span>
          Link ideas
        </div>
      )}

      <div
        ref={canvasRef}
        className="w-full h-full relative nx-canvas-grid nx-canvas-stage-surface"
        style={{
          cursor: connectingFrom ? "crosshair" : panning || wheelPanning ? "grabbing" : "grab",
          touchAction: "none",
          overscrollBehavior: "none",
          contain: "layout paint",
        }}
        onMouseDown={onCanvasMouseDown}
        onWheel={onCanvasWheel}
        onDoubleClick={(event) => {
          const target = event.target as HTMLElement;
          const isInsideNode = Boolean(target.closest(".nx-canvas-node"));
          const isCanvasBackground =
            !isInsideNode &&
            (target === event.currentTarget ||
              target.dataset.canvasScene === "true" ||
              Boolean(target.closest("#nexus-canvas-inner")));
          if (!isCanvasBackground) return;
          const rect = canvasRef.current?.getBoundingClientRect();
          if (!rect) return;
          setQuickAddPos({
            x: event.clientX - rect.left,
            y: event.clientY - rect.top,
          });
        }}
      >
        <div
          aria-hidden="true"
          data-canvas-layer="background-grid"
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            backgroundImage: gridBackgroundImage,
            backgroundPosition: `${stablePanX}px ${stablePanY}px`,
            backgroundSize: `${stableGridSize}px ${stableGridSize}px`,
            transition:
              panning || wheelPanning
                ? "none"
                : "background-position 0.08s ease-out, background-size 0.12s ease-out",
            willChange: panning || wheelPanning ? "background-position" : "auto",
          }}
        />
        <div
          id="nexus-canvas-inner"
          data-canvas-scene="true"
          data-canvas-layer="scene"
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            right: 0,
            bottom: 0,
            transform: sceneTransform,
            transformOrigin: "0 0",
            willChange: "transform",
            backfaceVisibility: "hidden",
          }}
        >
          {layoutGuides?.type === "board" && !reduceConnectionEffects && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                pointerEvents: "none",
                zIndex: 0,
              }}
              data-canvas-layer="guides"
            >
              {layoutGuides.lanes.map((lane: any) => (
                <div
                  key={lane.id}
                  style={{
                    position: "absolute",
                    left: lane.x,
                    top: lane.y,
                    width: lane.width,
                    height: lane.height,
                    borderRadius: 14,
                    border: `1px solid ${lane.color}40`,
                    background: `${lane.color}10`,
                    boxShadow: `inset 0 0 0 1px ${lane.color}14`,
                  }}
                >
                  <div
                    style={{
                      position: "sticky",
                      top: 0,
                      margin: 10,
                      padding: "4px 9px",
                      borderRadius: 999,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      background: `${lane.color}24`,
                      border: `1px solid ${lane.color}55`,
                      color: lane.color,
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: 0.2,
                    }}
                  >
                    <span
                      style={{
                        width: 7,
                        height: 7,
                        borderRadius: "50%",
                        background: lane.color,
                        boxShadow: `0 0 10px ${lane.color}`,
                      }}
                    />
                    {lane.label}
                  </div>
                </div>
              ))}
            </div>
          )}

          {layoutGuides?.type === "timeline" && !reduceConnectionEffects && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                pointerEvents: "none",
                zIndex: 0,
              }}
              data-canvas-layer="guides"
            >
              <div
                style={{
                  position: "absolute",
                  left: layoutGuides.points[0]?.x ?? 0,
                  top: layoutGuides.axisY,
                  width: Math.max(0, layoutGuides.points.length - 1) * 320 + 120,
                  height: 2,
                  borderRadius: 999,
                  background: `linear-gradient(90deg, ${accent}, ${accent2})`,
                  opacity: 0.5,
                }}
              />
              {layoutGuides.points.map((point: any) => (
                <div
                  key={point.id}
                  style={{
                    position: "absolute",
                    left: point.x - 8,
                    top: point.y - 6,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 6,
                    width: 220,
                  }}
                >
                  <div
                    style={{
                      width: 14,
                      height: 14,
                      borderRadius: "50%",
                      background: `linear-gradient(135deg, ${accent}, ${accent2})`,
                      border: "1px solid rgba(255,255,255,0.48)",
                      boxShadow: `0 0 14px rgba(${rgb},0.45)`,
                    }}
                  />
                  <div
                    style={{
                      padding: "3px 8px",
                      borderRadius: 999,
                      fontSize: 10,
                      fontWeight: 700,
                      maxWidth: 220,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      background: "rgba(0,0,0,0.35)",
                      border: "1px solid rgba(255,255,255,0.2)",
                    }}
                    title={point.label}
                  >
                    {point.label}
                  </div>
                </div>
              ))}
            </div>
          )}

          {visibleConnections.length > 0 && (
            <svg
              data-canvas-layer="edges"
              shapeRendering="geometricPrecision"
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                width: "100%",
                height: "100%",
                overflow: "visible",
                pointerEvents: reduceConnectionEffects ? "none" : "auto",
                zIndex: 1,
              }}
            >
              {visibleConnections.map((conn) => (
                <ConnectionLine
                  key={conn.id}
                  conn={conn}
                  nodeById={visibleNodeById}
                  zoom={viewport.zoom}
                  onDelete={deleteConnection}
                  reduceEffects={reduceConnectionEffects}
                />
              ))}
            </svg>
          )}

          <div
            data-canvas-layer="nodes"
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 2,
              pointerEvents: "none",
            }}
          >
            {visibleNodes.map((node) => (
              <NodeWidget
                key={node.id}
                node={node}
                isSelected={selectedNodeId === node.id}
                onSelect={setSelectedNodeId}
                onStartConnect={handleStartConnect}
                onEndConnect={handleEndConnect}
                connectingFrom={connectingFrom}
                onHubQuickAction={onHubQuickAction}
                snapToGrid={snapToGrid}
                reduceEffects={reduceNodeEffects}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
