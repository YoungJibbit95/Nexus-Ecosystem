import React from "react";
import {
  type CanvasNode,
  type CanvasNodePriority,
  type CanvasNodeStatus,
} from "../../../../store/canvasStore";
import { PRIORITY_OPTIONS } from "./helpers";
import { type BoardLane } from "./types";

type SelectedNodeDetailsSectionProps = {
  selectedNode: CanvasNode;
  lanes: BoardLane[];
  updateNode: (nodeId: string, patch: Partial<CanvasNode>) => void;
};

export function SelectedNodeDetailsSection({
  selectedNode,
  lanes,
  updateNode,
}: SelectedNodeDetailsSectionProps) {
  return (
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
          onChange={(event) =>
            updateNode(selectedNode.id, {
              status: event.target.value as CanvasNodeStatus,
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
          onChange={(event) =>
            updateNode(selectedNode.id, {
              priority: event.target.value as CanvasNodePriority,
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
          {PRIORITY_OPTIONS.map((priority) => (
            <option key={priority} value={priority}>
              {priority}
            </option>
          ))}
        </select>
        <input
          value={selectedNode.owner || ""}
          placeholder="Owner"
          onChange={(event) => updateNode(selectedNode.id, { owner: event.target.value })}
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
          onChange={(event) =>
            updateNode(selectedNode.id, {
              dueDate: event.target.value || undefined,
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
          onChange={(event) =>
            updateNode(selectedNode.id, { progress: Number(event.target.value) })
          }
          style={{ width: "100%" }}
        />
      </div>
    </div>
  );
}
