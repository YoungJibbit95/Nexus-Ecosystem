import React from "react";
import { Compass } from "lucide-react";
import { type CanvasNode } from "../../../../store/canvasStore";
import { formatNodeMeta } from "./helpers";

type NodeOutlineSectionProps = {
  outlineGroups: [string, CanvasNode[]][];
  jumpToNode: (nodeId: string) => void;
  totalNodeCount: number;
};

export function NodeOutlineSection({
  outlineGroups,
  jumpToNode,
  totalNodeCount,
}: NodeOutlineSectionProps) {
  return (
    <section className="nx-canvas-project-section">
      <div className="nx-canvas-project-section-title">
        <Compass size={12} />
        <span>Outline</span>
        <small>
          {outlineGroups.length} groups / {totalNodeCount} nodes
        </small>
      </div>
      <div className="nx-canvas-project-outline-list">
        {outlineGroups.length === 0 ? (
          <div className="nx-canvas-project-empty">Noch keine Nodes.</div>
        ) : (
          outlineGroups.map(([type, nodes], index) => (
            <details key={type} open={index === 0 || nodes.length <= 5}>
              <summary>
                <span>{type}</span>
                <small>{nodes.length}</small>
              </summary>
              <div>
                {nodes.slice(0, 12).map((node) => (
                  <button
                    key={node.id}
                    type="button"
                    onClick={() => jumpToNode(node.id)}
                    title={node.title}
                  >
                    <strong>{node.title || "Untitled"}</strong>
                    <span>{formatNodeMeta(node)}</span>
                  </button>
                ))}
                {nodes.length > 12 ? (
                  <span className="nx-canvas-project-outline-more">
                    + {nodes.length - 12} more in this group
                  </span>
                ) : null}
              </div>
            </details>
          ))
        )}
      </div>
    </section>
  );
}
