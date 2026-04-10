import React from "react";
import { CheckSquare } from "lucide-react";
import {
  useCanvas,
  type Canvas,
  type CanvasNode,
  type CanvasNodeStatus,
} from "../../../store/canvasStore";

type BoardLane = {
  id: CanvasNodeStatus;
  label: string;
  color: string;
};

export function CanvasProjectPanel({
  open,
  canvas,
  accent,
  rgb,
  mode,
  projectNodes,
  selectedNode,
  focusNodeOnly,
  onToggleFocusOnly,
  onClose,
  lanes,
  pmStatusFilter,
  setPmStatusFilter,
  timelineNodes,
  setSelectedNodeId,
  focusNode,
}: {
  open: boolean;
  canvas: Canvas | null | undefined;
  accent: string;
  rgb: string;
  mode: "dark" | "light";
  projectNodes: CanvasNode[];
  selectedNode: CanvasNode | null;
  focusNodeOnly: boolean;
  onToggleFocusOnly: () => void;
  onClose: () => void;
  lanes: BoardLane[];
  pmStatusFilter: "all" | CanvasNodeStatus;
  setPmStatusFilter: (next: "all" | CanvasNodeStatus) => void;
  timelineNodes: CanvasNode[];
  setSelectedNodeId: (id: string | null) => void;
  focusNode: (id: string) => void;
}) {
  if (!open || !canvas) return null;

  const updateNode = (nodeId: string, patch: Partial<CanvasNode>) => {
    useCanvas.getState().updateNode(nodeId, patch);
  };

  const doneCount = projectNodes.filter((node) => node.status === "done").length;
  const blockedCount = projectNodes.filter((node) => node.status === "blocked").length;

  return (
    <div
      style={{
        position: "absolute",
        top: 14,
        right: 14,
        zIndex: 210,
        width: 338,
        maxHeight: "78%",
        overflow: "auto",
        borderRadius: 14,
        padding: 12,
        background: mode === "dark" ? "rgba(12,12,22,0.85)" : "rgba(255,255,255,0.9)",
        backdropFilter: "blur(18px)",
        border: "1px solid rgba(255,255,255,0.14)",
        boxShadow: "0 14px 40px rgba(0,0,0,0.35)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <CheckSquare size={14} style={{ color: accent }} />
        <div style={{ fontSize: 12, fontWeight: 800 }}>Project Canvas</div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
          <button
            onClick={onToggleFocusOnly}
            style={{
              padding: "4px 8px",
              borderRadius: 8,
              border: `1px solid ${focusNodeOnly ? accent : "rgba(255,255,255,0.14)"}`,
              background: focusNodeOnly ? `rgba(${rgb},0.16)` : "rgba(255,255,255,0.06)",
              color: focusNodeOnly ? accent : "inherit",
              fontSize: 10,
              cursor: "pointer",
            }}
          >
            Focus
          </button>
          <button
            onClick={onClose}
            style={{
              padding: "4px 8px",
              borderRadius: 8,
              border: "1px solid rgba(255,255,255,0.14)",
              background: "rgba(255,255,255,0.06)",
              fontSize: 10,
              cursor: "pointer",
              color: "inherit",
            }}
          >
            Close
          </button>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4,1fr)",
          gap: 6,
          marginBottom: 10,
        }}
      >
        {[
          { label: "Nodes", val: projectNodes.length },
          { label: "Done", val: doneCount },
          { label: "Blocked", val: blockedCount },
          { label: "Links", val: canvas.connections.length },
        ].map((item) => (
          <div
            key={item.label}
            style={{
              padding: "7px 6px",
              borderRadius: 9,
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.08)",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 14, fontWeight: 800 }}>{item.val}</div>
            <div style={{ fontSize: 9, opacity: 0.55 }}>{item.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 6, overflowX: "auto", marginBottom: 10 }}>
        <button
          onClick={() => setPmStatusFilter("all")}
          style={{
            fontSize: 10,
            padding: "4px 7px",
            borderRadius: 999,
            border: `1px solid ${pmStatusFilter === "all" ? accent : "rgba(255,255,255,0.15)"}`,
            background: pmStatusFilter === "all" ? `rgba(${rgb},0.16)` : "rgba(255,255,255,0.04)",
            color: pmStatusFilter === "all" ? accent : "inherit",
            cursor: "pointer",
          }}
        >
          all
        </button>
        {lanes.map((lane) => (
          <button
            key={lane.id}
            onClick={() => setPmStatusFilter(lane.id)}
            style={{
              fontSize: 10,
              padding: "4px 7px",
              borderRadius: 999,
              border: `1px solid ${
                pmStatusFilter === lane.id ? lane.color : "rgba(255,255,255,0.15)"
              }`,
              background: pmStatusFilter === lane.id ? `${lane.color}22` : "rgba(255,255,255,0.04)",
              color: pmStatusFilter === lane.id ? lane.color : "inherit",
              cursor: "pointer",
            }}
          >
            {lane.id}
          </button>
        ))}
      </div>

      {selectedNode && (
        <div
          style={{
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 10,
            padding: 10,
            marginBottom: 10,
            background: "rgba(255,255,255,0.04)",
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 8 }}>
            Selected: {selectedNode.title}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
            <select
              value={selectedNode.status || "todo"}
              onChange={(e) =>
                updateNode(selectedNode.id, {
                  status: e.target.value as CanvasNodeStatus,
                })
              }
              style={{
                fontSize: 11,
                padding: "6px 8px",
                borderRadius: 8,
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.14)",
                color: "inherit",
              }}
            >
              {lanes.map((lane) => (
                <option key={lane.id} value={lane.id}>
                  {lane.id}
                </option>
              ))}
            </select>
            <select
              value={selectedNode.priority || "mid"}
              onChange={(e) =>
                updateNode(selectedNode.id, {
                  priority: e.target.value as "low" | "mid" | "high" | "critical",
                })
              }
              style={{
                fontSize: 11,
                padding: "6px 8px",
                borderRadius: 8,
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.14)",
                color: "inherit",
              }}
            >
              {(["low", "mid", "high", "critical"] as const).map((prio) => (
                <option key={prio} value={prio}>
                  {prio}
                </option>
              ))}
            </select>
            <input
              value={selectedNode.owner || ""}
              placeholder="Owner"
              onChange={(e) => updateNode(selectedNode.id, { owner: e.target.value })}
              style={{
                fontSize: 11,
                padding: "6px 8px",
                borderRadius: 8,
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.14)",
                color: "inherit",
              }}
            />
            <input
              type="date"
              value={selectedNode.dueDate ? selectedNode.dueDate.slice(0, 10) : ""}
              onChange={(e) =>
                updateNode(selectedNode.id, {
                  dueDate: e.target.value || undefined,
                })
              }
              style={{
                fontSize: 11,
                padding: "6px 8px",
                borderRadius: 8,
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.14)",
                color: "inherit",
              }}
            />
          </div>
          <div style={{ marginTop: 8 }}>
            <label style={{ fontSize: 10, opacity: 0.6, display: "block", marginBottom: 4 }}>
              Progress {selectedNode.progress ?? 0}%
            </label>
            <input
              type="range"
              min={0}
              max={100}
              value={selectedNode.progress ?? 0}
              onChange={(e) => updateNode(selectedNode.id, { progress: Number(e.target.value) })}
              style={{ width: "100%" }}
            />
          </div>
        </div>
      )}

      <div style={{ fontSize: 10, fontWeight: 700, opacity: 0.55, marginBottom: 6 }}>
        Timeline
      </div>
      {timelineNodes.length === 0 ? (
        <div style={{ fontSize: 11, opacity: 0.5 }}>
          Keine Datums-Items im aktuellen Filter.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {timelineNodes.map((node) => (
            <button
              key={node.id}
              onClick={() => {
                setSelectedNodeId(node.id);
                focusNode(node.id);
              }}
              style={{
                textAlign: "left",
                border: "1px solid rgba(255,255,255,0.11)",
                borderRadius: 9,
                background: "rgba(255,255,255,0.05)",
                cursor: "pointer",
                padding: "7px 8px",
                color: "inherit",
              }}
            >
              <div style={{ fontSize: 11, fontWeight: 700 }}>{node.title}</div>
              <div style={{ fontSize: 10, opacity: 0.6 }}>
                {node.dueDate ? new Date(node.dueDate).toLocaleDateString() : "-"}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
