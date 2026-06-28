import React from "react";
import { CalendarClock } from "lucide-react";
import { type CanvasNode } from "../../../../store/canvasStore";
import { formatNodeMeta } from "./helpers";

type TimelineSectionProps = {
  timelineNodes: CanvasNode[];
  jumpToNode: (nodeId: string) => void;
};

export function TimelineSection({ timelineNodes, jumpToNode }: TimelineSectionProps) {
  return (
    <section className="nx-canvas-project-section">
      <div className="nx-canvas-project-section-title">
        <CalendarClock size={12} />
        <span>Timeline</span>
        <small>{timelineNodes.length} dated</small>
      </div>
      {timelineNodes.length === 0 ? (
        <div className="nx-canvas-project-empty">
          Keine Datums-Items im aktuellen Filter.
        </div>
      ) : (
        <div className="nx-canvas-project-timeline">
          {timelineNodes.map((node) => (
            <button key={node.id} type="button" onClick={() => jumpToNode(node.id)}>
              <strong>{node.title || "Untitled"}</strong>
              <span>
                {node.dueDate ? new Date(node.dueDate).toLocaleDateString() : "-"} /{" "}
                {formatNodeMeta(node)}
              </span>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
