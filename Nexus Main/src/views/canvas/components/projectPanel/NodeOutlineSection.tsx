import React from "react";
import { Compass } from "lucide-react";
import { type CanvasNode } from "../../../../store/canvasStore";

type NodeOutlineSectionProps = {
  outlineGroups: [string, CanvasNode[]][];
  jumpToNode: (nodeId: string) => void;
};

export function NodeOutlineSection({ outlineGroups, jumpToNode }: NodeOutlineSectionProps) {
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
      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 8 }}>
        <Compass size={12} style={{ opacity: 0.7 }} />
        <div style={{ fontSize: 11, fontWeight: 700 }}>Outline / Navigator</div>
      </div>
      <div style={{ maxHeight: 154, overflow: "auto", display: "flex", flexDirection: "column", gap: 6 }}>
        {outlineGroups.map(([type, nodes]) => (
          <details key={type} open={nodes.length <= 4}>
            <summary style={{ fontSize: 10, fontWeight: 700, opacity: 0.78, cursor: "pointer" }}>
              {type} · {nodes.length}
            </summary>
            <div style={{ marginTop: 5, display: "flex", flexDirection: "column", gap: 4 }}>
              {nodes.slice(0, 9).map((node) => (
                <button
                  key={node.id}
                  onClick={() => jumpToNode(node.id)}
                  style={{
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 7,
                    background: "rgba(255,255,255,0.04)",
                    color: "inherit",
                    fontSize: 10,
                    textAlign: "left",
                    padding: "4px 7px",
                    cursor: "pointer",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                  title={node.title}
                >
                  {node.title || "Untitled"}
                </button>
              ))}
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}
