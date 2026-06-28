import React from "react";
import { FileText } from "lucide-react";
import {
  type CanvasNode,
  type CanvasNodePriority,
  type CanvasNodeStatus,
} from "../../../../store/canvasStore";
import { PRIORITY_OPTIONS } from "./helpers";
import { type BoardLane } from "./types";

type SelectedNodeDetailsSectionProps = {
  selectedNode: CanvasNode | null;
  lanes: BoardLane[];
  updateNode: (nodeId: string, patch: Partial<CanvasNode>) => void;
};

export function SelectedNodeDetailsSection({
  selectedNode,
  lanes,
  updateNode,
}: SelectedNodeDetailsSectionProps) {
  if (!selectedNode) {
    return (
      <section className="nx-canvas-project-section">
        <div className="nx-canvas-project-section-title">
          <FileText size={12} />
          <span>Details</span>
          <small>No selection</small>
        </div>
        <div className="nx-canvas-project-empty">
          Waehle einen Node aus, um Status, Owner, Dates und Notes zu bearbeiten.
        </div>
      </section>
    );
  }

  const tags = selectedNode.tags || [];
  const linkedItems = [
    selectedNode.linkedNoteId ? "note" : "",
    selectedNode.linkedCodeId ? "code" : "",
    selectedNode.linkedTaskId ? "task" : "",
    selectedNode.linkedReminderId ? "reminder" : "",
  ].filter(Boolean);

  return (
    <section className="nx-canvas-project-section">
      <div className="nx-canvas-project-section-title">
        <FileText size={12} />
        <span>Details</span>
        <small title={selectedNode.title}>{selectedNode.type}</small>
      </div>
      <div className="nx-canvas-project-detail-stack">
        <label className="nx-canvas-project-field nx-canvas-project-field-wide">
          <span>Title</span>
          <input
            value={selectedNode.title || ""}
            onChange={(event) => updateNode(selectedNode.id, { title: event.target.value })}
          />
        </label>

        <div className="nx-canvas-project-field-grid">
          <label className="nx-canvas-project-field">
            <span>Status</span>
            <select
              value={selectedNode.status || "todo"}
              onChange={(event) =>
                updateNode(selectedNode.id, {
                  status: event.target.value as CanvasNodeStatus,
                })
              }
            >
              {lanes.map((lane) => (
                <option key={lane.id} value={lane.id}>
                  {lane.label}
                </option>
              ))}
            </select>
          </label>
          <label className="nx-canvas-project-field">
            <span>Priority</span>
            <select
              value={selectedNode.priority || "mid"}
              onChange={(event) =>
                updateNode(selectedNode.id, {
                  priority: event.target.value as CanvasNodePriority,
                })
              }
            >
              {PRIORITY_OPTIONS.map((priority) => (
                <option key={priority} value={priority}>
                  {priority}
                </option>
              ))}
            </select>
          </label>
          <label className="nx-canvas-project-field">
            <span>Owner</span>
            <input
              value={selectedNode.owner || ""}
              placeholder="Owner"
              onChange={(event) => updateNode(selectedNode.id, { owner: event.target.value })}
            />
          </label>
          <label className="nx-canvas-project-field">
            <span>Due</span>
            <input
              type="date"
              value={selectedNode.dueDate ? selectedNode.dueDate.slice(0, 10) : ""}
              onChange={(event) =>
                updateNode(selectedNode.id, {
                  dueDate: event.target.value || undefined,
                })
              }
            />
          </label>
          <label className="nx-canvas-project-field">
            <span>Effort</span>
            <input
              type="number"
              min={0}
              value={selectedNode.effort ?? ""}
              placeholder="0"
              onChange={(event) =>
                updateNode(selectedNode.id, {
                  effort: event.target.value === "" ? undefined : Number(event.target.value),
                })
              }
            />
          </label>
          <div className="nx-canvas-project-field nx-canvas-project-field-static">
            <span>Type</span>
            <strong>{selectedNode.type}</strong>
          </div>
        </div>

        <label className="nx-canvas-project-range">
          <span>
            <span>Progress</span>
            <strong>{selectedNode.progress ?? 0}%</strong>
          </span>
          <input
            type="range"
            min={0}
            max={100}
            value={selectedNode.progress ?? 0}
            onChange={(event) =>
              updateNode(selectedNode.id, { progress: Number(event.target.value) })
            }
          />
        </label>

        <label className="nx-canvas-project-field nx-canvas-project-field-wide">
          <span>Notes</span>
          <textarea
            value={selectedNode.content || ""}
            rows={3}
            onChange={(event) => updateNode(selectedNode.id, { content: event.target.value })}
          />
        </label>

        {tags.length > 0 || linkedItems.length > 0 ? (
          <div className="nx-canvas-project-detail-chips">
            {tags.map((tag) => (
              <span key={tag}>#{tag}</span>
            ))}
            {linkedItems.map((item) => (
              <span key={item}>{item} linked</span>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
