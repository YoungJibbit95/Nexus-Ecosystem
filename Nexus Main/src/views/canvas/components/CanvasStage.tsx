import React from "react";
import { Link } from "lucide-react";
import type { CanvasConnection, CanvasNode } from "../../../store/canvasStore";
import { ConnectionLine } from "./ConnectionLine";
import { NodeWidget } from "./NodeWidget";

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
  snapToGrid: boolean;
  reduceNodeEffects: boolean;
}) {
  return (
    <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
      {connectingFrom && (
        <div
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
          Space + Drag (optional) · Hintergrund ziehen zum Pannen
        </div>
      )}

      <div
        ref={canvasRef}
        className="w-full h-full relative nx-canvas-grid"
        style={{
          cursor: connectingFrom ? "crosshair" : panning || wheelPanning ? "grabbing" : "grab",
          transition: panning || wheelPanning ? "none" : "background-position 0.08s ease-out, background-size 0.12s ease-out",
          backgroundPosition: `${viewport.panX}px ${viewport.panY}px`,
          backgroundSize: `${24 * viewport.zoom}px ${24 * viewport.zoom}px`,
          backgroundImage:
            gridMode === "dots"
              ? mode === "dark"
                ? "radial-gradient(circle, rgba(255,255,255,0.12) 1px, transparent 1px)"
                : "radial-gradient(circle, rgba(0,0,0,0.1) 1px, transparent 1px)"
              : gridMode === "lines"
                ? mode === "dark"
                  ? "linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)"
                  : "linear-gradient(rgba(0,0,0,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.05) 1px, transparent 1px)"
                : "none",
          touchAction: "none",
          overscrollBehavior: "none",
          contain: "layout paint",
        }}
        onMouseDown={onCanvasMouseDown}
        onWheel={onCanvasWheel}
        onDoubleClick={(e) => {
          const target = e.target as HTMLElement;
          const isCanvasBackground =
            target === e.currentTarget ||
            target.id === "nexus-canvas-inner" ||
            Boolean(target.closest("#nexus-canvas-inner"));
          if (!isCanvasBackground) return;
          const rect = canvasRef.current?.getBoundingClientRect();
          if (!rect) return;
          setQuickAddPos({
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
          });
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            right: 0,
            bottom: 0,
            transform: `translate(${viewport.panX}px, ${viewport.panY}px) scale(${viewport.zoom})`,
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
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                width: "100%",
                height: "100%",
                overflow: "visible",
                pointerEvents: reduceConnectionEffects ? "none" : "auto",
                zIndex: 0,
              }}
            >
              {!reduceConnectionEffects && (
                <defs>
                  <filter id="glow-filter" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="4" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                  </filter>
                </defs>
              )}
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

          {visibleNodes.map((node) => (
            <NodeWidget
              key={node.id}
              node={node}
              isSelected={selectedNodeId === node.id}
              onSelect={setSelectedNodeId}
              onStartConnect={handleStartConnect}
              onEndConnect={handleEndConnect}
              connectingFrom={connectingFrom}
              snapToGrid={snapToGrid}
              reduceEffects={reduceNodeEffects}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
