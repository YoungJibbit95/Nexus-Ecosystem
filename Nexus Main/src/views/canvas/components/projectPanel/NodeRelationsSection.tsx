import React from "react";
import { Network } from "lucide-react";
import { type CanvasNode } from "../../../../store/canvasStore";

type NodeRelationsSectionProps = {
  selectedNode: CanvasNode | null;
  incomingNodes: CanvasNode[];
  outgoingNodes: CanvasNode[];
  localGraphNodes: CanvasNode[];
  jumpToNode: (nodeId: string) => void;
};

const SectionList = ({
  title,
  nodes,
  jumpToNode,
}: {
  title: string;
  nodes: CanvasNode[];
  jumpToNode: (nodeId: string) => void;
}) => (
  <div>
    <div style={{ fontSize: 10, fontWeight: 700, opacity: 0.62, marginBottom: 5 }}>
      {title}
    </div>
    {nodes.length === 0 ? (
      <div style={{ fontSize: 10, opacity: 0.5, marginBottom: 6 }}>Keine Einträge.</div>
    ) : (
      <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 6 }}>
        {nodes.slice(0, 6).map((node) => (
          <button
            key={`${title}-${node.id}`}
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
    )}
  </div>
);

export function NodeRelationsSection({
  selectedNode,
  incomingNodes,
  outgoingNodes,
  localGraphNodes,
  jumpToNode,
}: NodeRelationsSectionProps) {
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
        <Network size={12} style={{ opacity: 0.7 }} />
        <div style={{ fontSize: 11, fontWeight: 700 }}>Backlinks / Local Graph</div>
      </div>
      {!selectedNode ? (
        <div style={{ fontSize: 11, opacity: 0.55 }}>
          Node auswählen, um eingehende und ausgehende Verknüpfungen zu sehen.
        </div>
      ) : (
        <>
          <SectionList title="Incoming Links" nodes={incomingNodes} jumpToNode={jumpToNode} />
          <SectionList title="Outgoing Links" nodes={outgoingNodes} jumpToNode={jumpToNode} />
          <SectionList title="Local Graph Neighbors" nodes={localGraphNodes} jumpToNode={jumpToNode} />
        </>
      )}
    </div>
  );
}
