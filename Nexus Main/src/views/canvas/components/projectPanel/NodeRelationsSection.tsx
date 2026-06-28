import React from "react";
import { Network } from "lucide-react";
import { type CanvasNode } from "../../../../store/canvasStore";
import { formatNodeMeta } from "./helpers";

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
  <div className="nx-canvas-project-relation-list">
    <div>
      <span>{title}</span>
      <small>{nodes.length}</small>
    </div>
    {nodes.length === 0 ? (
      <span>Keine Eintraege.</span>
    ) : (
      nodes.slice(0, 6).map((node) => (
        <button
          key={`${title}-${node.id}`}
          type="button"
          onClick={() => jumpToNode(node.id)}
          title={node.title}
        >
          <strong>{node.title || "Untitled"}</strong>
          <span>{formatNodeMeta(node)}</span>
        </button>
      ))
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
    <section className="nx-canvas-project-section">
      <div className="nx-canvas-project-section-title">
        <Network size={12} />
        <span>Relations</span>
        <small>{incomingNodes.length + outgoingNodes.length} direct</small>
      </div>
      {!selectedNode ? (
        <div className="nx-canvas-project-empty">
          Waehle einen Node aus, um Links und Nachbarn zu sehen.
        </div>
      ) : (
        <>
          <div className="nx-canvas-project-relation-focus">
            <span>Selected</span>
            <strong title={selectedNode.title}>{selectedNode.title || "Untitled"}</strong>
          </div>
          <div className="nx-canvas-project-relations-grid">
            <SectionList title="Incoming" nodes={incomingNodes} jumpToNode={jumpToNode} />
            <SectionList title="Outgoing" nodes={outgoingNodes} jumpToNode={jumpToNode} />
            <SectionList title="Neighbors" nodes={localGraphNodes} jumpToNode={jumpToNode} />
          </div>
        </>
      )}
    </section>
  );
}
