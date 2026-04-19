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
        <Layers size={12} style={{ opacity: 0.7 }} />
        <div style={{ fontSize: 11, fontWeight: 700 }}>Multi-Select / Bulk</div>
        <span style={{ marginLeft: "auto", fontSize: 10, opacity: 0.65 }}>
          {bulkSelectedIds.length} selected
        </span>
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
        <button
          onClick={setBulkSelectedFromSearch}
          style={{
            fontSize: 10,
            borderRadius: 8,
            border: "1px solid rgba(255,255,255,0.14)",
            background: "rgba(255,255,255,0.08)",
            color: "inherit",
            padding: "4px 7px",
            cursor: "pointer",
          }}
        >
          Select Search
        </button>
        <button
          onClick={onClearBulkSelection}
          style={{
            fontSize: 10,
            borderRadius: 8,
            border: "1px solid rgba(255,255,255,0.14)",
            background: "rgba(255,255,255,0.08)",
            color: "inherit",
            padding: "4px 7px",
            cursor: "pointer",
          }}
        >
          Clear
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 8 }}>
        {(["todo", "doing", "blocked", "done"] as const).map((status) => (
          <button
            key={status}
            onClick={() => onApplyStatus(status)}
            disabled={!hasSelection}
            style={{
              fontSize: 10,
              borderRadius: 8,
              border: "1px solid rgba(255,255,255,0.14)",
              background: "rgba(255,255,255,0.08)",
              color: "inherit",
              padding: "4px 7px",
              cursor: hasSelection ? "pointer" : "default",
              opacity: hasSelection ? 1 : 0.45,
            }}
          >
            status:{status}
          </button>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 8 }}>
        {PRIORITY_OPTIONS.map((priority) => (
          <button
            key={priority}
            onClick={() => onApplyPriority(priority)}
            disabled={!hasSelection}
            style={{
              fontSize: 10,
              borderRadius: 8,
              border: "1px solid rgba(255,255,255,0.14)",
              background: "rgba(255,255,255,0.08)",
              color: "inherit",
              padding: "4px 7px",
              cursor: hasSelection ? "pointer" : "default",
              opacity: hasSelection ? 1 : 0.45,
            }}
          >
            priority:{priority}
          </button>
        ))}
      </div>

      <div style={{ display: "flex", gap: 6 }}>
        <div style={{ position: "relative", flex: 1 }}>
          <Tag
            size={12}
            style={{ position: "absolute", left: 8, top: 8, opacity: 0.58 }}
          />
          <input
            value={bulkTagDraft}
            onChange={(event) => setBulkTagDraft(event.target.value)}
            placeholder="Tag hinzufügen…"
            style={{
              width: "100%",
              fontSize: 10,
              padding: "6px 7px 6px 24px",
              borderRadius: 8,
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.14)",
              color: "inherit",
            }}
          />
        </div>
        <button
          onClick={onApplyTag}
          disabled={!hasSelection || !hasTagDraft}
          style={{
            fontSize: 10,
            borderRadius: 8,
            border: "1px solid rgba(255,255,255,0.14)",
            background: "rgba(255,255,255,0.08)",
            color: "inherit",
            padding: "6px 8px",
            cursor: hasSelection && hasTagDraft ? "pointer" : "default",
            opacity: hasSelection && hasTagDraft ? 1 : 0.45,
          }}
        >
          Apply
        </button>
        <button
          onClick={onDeleteSelected}
          disabled={!hasSelection}
          style={{
            fontSize: 10,
            borderRadius: 8,
            border: "1px solid rgba(255,59,48,0.45)",
            background: "rgba(255,59,48,0.14)",
            color: "#ff938a",
            padding: "6px 8px",
            cursor: hasSelection ? "pointer" : "default",
            opacity: hasSelection ? 1 : 0.45,
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          <Trash2 size={10} /> Delete
        </button>
      </div>
    </div>
  );
}
