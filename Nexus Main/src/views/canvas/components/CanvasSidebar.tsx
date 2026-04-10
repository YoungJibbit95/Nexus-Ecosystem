import React from "react";
import { Plus, X } from "lucide-react";
import { Glass } from "../../../components/Glass";
import type { Canvas } from "../../../store/canvasStore";

export function CanvasSidebar({
  visible,
  mode,
  accent,
  rgb,
  canvases,
  activeCanvasId,
  activeCanvas,
  addCanvas,
  setActiveCanvas,
  deleteCanvas,
}: {
  visible: boolean;
  mode: "dark" | "light";
  accent: string;
  rgb: string;
  canvases: Canvas[];
  activeCanvasId: string | null;
  activeCanvas: Canvas | null | undefined;
  addCanvas: () => void;
  setActiveCanvas: (id: string) => void;
  deleteCanvas: (id: string) => void;
}) {
  if (!visible) return null;

  return (
    <Glass
      type="panel"
      className="shrink-0"
      style={{
        width: 188,
        height: "100%",
        display: "flex",
        flexDirection: "column",
        borderRight: `1px solid ${
          mode === "dark" ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)"
        }`,
        borderRadius: 0,
      }}
    >
      <div
        style={{
          padding: 12,
          display: "flex",
          flexDirection: "column",
          gap: 4,
          height: "100%",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 6,
            paddingBottom: 8,
            borderBottom: `1px solid ${
              mode === "dark" ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.05)"
            }`,
          }}
        >
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              opacity: 0.45,
              textTransform: "uppercase",
              letterSpacing: 1.2,
            }}
          >
            Canvases
          </span>
          <button
            onClick={addCanvas}
            style={{
              background: `rgba(${rgb}, 0.15)`,
              border: "none",
              borderRadius: 7,
              width: 24,
              height: 24,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: accent,
              transition: "all 0.15s",
            }}
          >
            <Plus size={13} />
          </button>
        </div>

        <div
          style={{
            flex: 1,
            overflow: "auto",
            display: "flex",
            flexDirection: "column",
            gap: 1,
          }}
        >
          {canvases.map((entry) => (
            <div
              key={entry.id}
              onClick={() => setActiveCanvas(entry.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "7px 9px",
                borderRadius: 8,
                cursor: "pointer",
                background:
                  entry.id === activeCanvasId ? `rgba(${rgb}, 0.15)` : "transparent",
                borderLeft:
                  entry.id === activeCanvasId
                    ? `2px solid ${accent}`
                    : "2px solid transparent",
                transition: "all 0.15s",
              }}
              onMouseEnter={(e) => {
                if (entry.id !== activeCanvasId) {
                  e.currentTarget.style.background = "rgba(255,255,255,0.05)";
                }
              }}
              onMouseLeave={(e) => {
                if (entry.id !== activeCanvasId) {
                  e.currentTarget.style.background = "transparent";
                }
              }}
            >
              <span
                style={{
                  flex: 1,
                  fontSize: 12,
                  fontWeight: entry.id === activeCanvasId ? 600 : 400,
                  color: entry.id === activeCanvasId ? accent : undefined,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {entry.name}
              </span>
              <span
                style={{
                  fontSize: 10,
                  opacity: 0.35,
                  background: "rgba(255,255,255,0.08)",
                  padding: "1px 5px",
                  borderRadius: 4,
                }}
              >
                {entry.nodes.length}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm(`Delete "${entry.name}"?`)) deleteCanvas(entry.id);
                }}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "#FF3B30",
                  opacity: 0,
                  padding: 2,
                  transition: "opacity 0.15s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.opacity = "1";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.opacity = "0";
                }}
              >
                <X size={11} />
              </button>
            </div>
          ))}
        </div>

        <div
          style={{
            fontSize: 10,
            opacity: 0.3,
            marginTop: 4,
            paddingTop: 6,
            borderTop: `1px solid ${
              mode === "dark" ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)"
            }`,
          }}
        >
          {activeCanvas?.nodes.length ?? 0} nodes · {activeCanvas?.connections.length ?? 0} links
        </div>
      </div>
    </Glass>
  );
}
