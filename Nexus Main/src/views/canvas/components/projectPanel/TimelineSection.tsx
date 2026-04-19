import React from "react";
import { type CanvasNode } from "../../../../store/canvasStore";

type TimelineSectionProps = {
  timelineNodes: CanvasNode[];
  jumpToNode: (nodeId: string) => void;
};

export function TimelineSection({ timelineNodes, jumpToNode }: TimelineSectionProps) {
  return (
    <>
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
              onClick={() => jumpToNode(node.id)}
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
    </>
  );
}
