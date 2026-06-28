import React from "react";
import { Layers, Tag, Trash2 } from "lucide-react";
import { type CanvasNodePriority, type CanvasNodeStatus } from "../../../../store/canvasStore";
import { PRIORITY_OPTIONS } from "./helpers";

type NodeBulkActionsSectionProps = {
  bulkSelectedIds: string[];
  bulkTagDraft: string;
  setBulkTagDraft: (value: string) => void;
  setBulkSelectedFromSearch: () => void;
  onClearBulkSelection: () => void;
  onApplyStatus: (status: CanvasNodeStatus) => void;
  onApplyPriority: (priority: CanvasNodePriority) => void;
  onApplyTag: () => void;
  onDeleteSelected: () => void;
};

export function NodeBulkActionsSection({
  bulkSelectedIds,
  bulkTagDraft,
  setBulkTagDraft,
  setBulkSelectedFromSearch,
  onClearBulkSelection,
  onApplyStatus,
  onApplyPriority,
  onApplyTag,
  onDeleteSelected,
}: NodeBulkActionsSectionProps) {
  const hasSelection = bulkSelectedIds.length > 0;
  const hasTagDraft = bulkTagDraft.trim().length > 0;

  return (
    <section className="nx-canvas-project-section">
      <div className="nx-canvas-project-section-title">
        <Layers size={12} />
        <span>Bulk Edit</span>
        <small>{bulkSelectedIds.length} selected</small>
      </div>

      <div className="nx-canvas-project-inline-actions">
        <button type="button" onClick={setBulkSelectedFromSearch}>
          Select results
        </button>
        <button type="button" onClick={onClearBulkSelection}>
          Clear
        </button>
      </div>

      <div className="nx-canvas-project-button-grid">
        {(["todo", "doing", "blocked", "done"] as const).map((status) => (
          <button
            key={status}
            type="button"
            onClick={() => onApplyStatus(status)}
            disabled={!hasSelection}
          >
            status: {status}
          </button>
        ))}
      </div>

      <div className="nx-canvas-project-button-grid">
        {PRIORITY_OPTIONS.map((priority) => (
          <button
            key={priority}
            type="button"
            onClick={() => onApplyPriority(priority)}
            disabled={!hasSelection}
          >
            priority: {priority}
          </button>
        ))}
      </div>

      <div className="nx-canvas-project-tag-row">
        <label>
          <Tag size={12} />
          <input
            value={bulkTagDraft}
            onChange={(event) => setBulkTagDraft(event.target.value)}
            placeholder="Tag hinzufuegen..."
          />
        </label>
        <button
          type="button"
          onClick={onApplyTag}
          disabled={!hasSelection || !hasTagDraft}
        >
          Apply
        </button>
        <button
          type="button"
          onClick={onDeleteSelected}
          disabled={!hasSelection}
          className="nx-canvas-project-danger"
        >
          <Trash2 size={10} /> Delete
        </button>
      </div>
    </section>
  );
}
