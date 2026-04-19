import React, { useCallback, useMemo, useState } from "react";
import { CheckSquare } from "lucide-react";
import {
  useCanvas,
  type Canvas,
  type CanvasNode,
  type CanvasNodePriority,
  type CanvasNodeStatus,
} from "../../../store/canvasStore";
import { NodeSearchSection } from "./projectPanel/NodeSearchSection";
import { NodeOutlineSection } from "./projectPanel/NodeOutlineSection";
import { NodeBulkActionsSection } from "./projectPanel/NodeBulkActionsSection";
import { SelectedNodeDetailsSection } from "./projectPanel/SelectedNodeDetailsSection";
import { TimelineSection } from "./projectPanel/TimelineSection";
import { scoreNodeMatch } from "./projectPanel/helpers";
import { type BoardLane } from "./projectPanel/types";

type CanvasProjectPanelProps = {
  open: boolean;
  canvas: Canvas | null | undefined;
  accent: string;
  rgb: string;
  mode: "dark" | "light";
  projectNodes: CanvasNode[];
  selectedNode: CanvasNode | null;
  focusNodeOnly: boolean;
  onToggleFocusOnly: () => void;
  onClose: () => void;
  lanes: BoardLane[];
  pmStatusFilter: "all" | CanvasNodeStatus;
  setPmStatusFilter: (next: "all" | CanvasNodeStatus) => void;
  timelineNodes: CanvasNode[];
  setSelectedNodeId: (id: string | null) => void;
  focusNode: (id: string) => void;
};

export function CanvasProjectPanel({
  open,
  canvas,
  accent,
  rgb,
  mode,
  projectNodes,
  selectedNode,
  focusNodeOnly,
  onToggleFocusOnly,
  onClose,
  lanes,
  pmStatusFilter,
  setPmStatusFilter,
  timelineNodes,
  setSelectedNodeId,
  focusNode,
}: CanvasProjectPanelProps) {
  if (!open || !canvas) return null;

  const [searchQuery, setSearchQuery] = useState("");
  const [bulkTagDraft, setBulkTagDraft] = useState("");
  const [bulkSelected, setBulkSelected] = useState<Record<string, true>>({});

  const bulkSelectedIds = useMemo(() => Object.keys(bulkSelected), [bulkSelected]);

  const updateNode = useCallback((nodeId: string, patch: Partial<CanvasNode>) => {
    useCanvas.getState().updateNode(nodeId, patch);
  }, []);

  const clearBulkSelection = useCallback(() => {
    setBulkSelected({});
  }, []);

  const bulkToggle = useCallback((nodeId: string) => {
    setBulkSelected((prev) => {
      if (prev[nodeId]) {
        const next = { ...prev };
        delete next[nodeId];
        return next;
      }
      return { ...prev, [nodeId]: true };
    });
  }, []);

  const bulkApplyPatch = useCallback(
    (patch: Partial<CanvasNode>) => {
      if (bulkSelectedIds.length === 0) return;
      const state = useCanvas.getState();
      bulkSelectedIds.forEach((nodeId) => state.updateNode(nodeId, patch));
    },
    [bulkSelectedIds],
  );

  const bulkDelete = useCallback(() => {
    if (bulkSelectedIds.length === 0) return;
    const state = useCanvas.getState();
    bulkSelectedIds.forEach((nodeId) => state.deleteNode(nodeId));
    setBulkSelected({});
    if (selectedNode && bulkSelectedIds.includes(selectedNode.id)) {
      setSelectedNodeId(null);
    }
  }, [bulkSelectedIds, selectedNode, setSelectedNodeId]);

  const bulkApplyTag = useCallback(() => {
    const tag = bulkTagDraft.trim();
    if (!tag || bulkSelectedIds.length === 0) return;
    const state = useCanvas.getState();
    bulkSelectedIds.forEach((nodeId) => {
      const current = canvas.nodes.find((node) => node.id === nodeId);
      if (!current) return;
      const tags = new Set(current.tags || []);
      tags.add(tag);
      state.updateNode(nodeId, { tags: Array.from(tags) });
    });
    setBulkTagDraft("");
  }, [bulkSelectedIds, bulkTagDraft, canvas.nodes]);

  const doneCount = projectNodes.filter((node) => node.status === "done").length;
  const blockedCount = projectNodes.filter((node) => node.status === "blocked").length;

  const searchedNodes = useMemo(() => {
    const q = searchQuery.trim();
    if (!q) return canvas.nodes.slice(0, 18);
    return canvas.nodes
      .map((node) => ({ node, score: scoreNodeMatch(node, q) }))
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 28)
      .map((entry) => entry.node);
  }, [canvas.nodes, searchQuery]);

  const outlineGroups = useMemo(() => {
    const groups = new Map<string, CanvasNode[]>();
    canvas.nodes.forEach((node) => {
      const key = node.type;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)?.push(node);
    });
    return Array.from(groups.entries()).sort((a, b) => b[1].length - a[1].length);
  }, [canvas.nodes]);

  const jumpToNode = useCallback(
    (nodeId: string) => {
      setSelectedNodeId(nodeId);
      focusNode(nodeId);
    },
    [focusNode, setSelectedNodeId],
  );

  const selectNodesFromSearch = useCallback(() => {
    const next: Record<string, true> = {};
    searchedNodes.forEach((node) => {
      next[node.id] = true;
    });
    setBulkSelected(next);
  }, [searchedNodes]);

  return (
    <div
      style={{
        position: "absolute",
        top: 14,
        right: 14,
        zIndex: 210,
        width: 372,
        maxHeight: "82%",
        overflow: "auto",
        borderRadius: 14,
        padding: 12,
        background: mode === "dark" ? "rgba(12,12,22,0.86)" : "rgba(255,255,255,0.92)",
        backdropFilter: "blur(18px)",
        border: "1px solid rgba(255,255,255,0.14)",
        boxShadow: "0 14px 40px rgba(0,0,0,0.35)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <CheckSquare size={14} style={{ color: accent }} />
        <div style={{ fontSize: 12, fontWeight: 800 }}>Project Canvas</div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
          <button
            onClick={onToggleFocusOnly}
            style={{
              padding: "4px 8px",
              borderRadius: 8,
              border: `1px solid ${focusNodeOnly ? accent : "rgba(255,255,255,0.14)"}`,
              background: focusNodeOnly ? `rgba(${rgb},0.16)` : "rgba(255,255,255,0.06)",
              color: focusNodeOnly ? accent : "inherit",
              fontSize: 10,
              cursor: "pointer",
            }}
          >
            Focus
          </button>
          <button
            onClick={onClose}
            style={{
              padding: "4px 8px",
              borderRadius: 8,
              border: "1px solid rgba(255,255,255,0.14)",
              background: "rgba(255,255,255,0.06)",
              fontSize: 10,
              cursor: "pointer",
              color: "inherit",
            }}
          >
            Close
          </button>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4,1fr)",
          gap: 6,
          marginBottom: 10,
        }}
      >
        {[
          { label: "Nodes", val: projectNodes.length },
          { label: "Done", val: doneCount },
          { label: "Blocked", val: blockedCount },
          { label: "Links", val: canvas.connections.length },
        ].map((item) => (
          <div
            key={item.label}
            style={{
              padding: "7px 6px",
              borderRadius: 9,
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.08)",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 14, fontWeight: 800 }}>{item.val}</div>
            <div style={{ fontSize: 9, opacity: 0.55 }}>{item.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 6, overflowX: "auto", marginBottom: 10 }}>
        <button
          onClick={() => setPmStatusFilter("all")}
          style={{
            fontSize: 10,
            padding: "4px 7px",
            borderRadius: 999,
            border: `1px solid ${pmStatusFilter === "all" ? accent : "rgba(255,255,255,0.15)"}`,
            background: pmStatusFilter === "all" ? `rgba(${rgb},0.16)` : "rgba(255,255,255,0.04)",
            color: pmStatusFilter === "all" ? accent : "inherit",
            cursor: "pointer",
          }}
        >
          all
        </button>
        {lanes.map((lane) => (
          <button
            key={lane.id}
            onClick={() => setPmStatusFilter(lane.id)}
            style={{
              fontSize: 10,
              padding: "4px 7px",
              borderRadius: 999,
              border: `1px solid ${
                pmStatusFilter === lane.id ? lane.color : "rgba(255,255,255,0.15)"
              }`,
              background: pmStatusFilter === lane.id ? `${lane.color}22` : "rgba(255,255,255,0.04)",
              color: pmStatusFilter === lane.id ? lane.color : "inherit",
              cursor: "pointer",
            }}
          >
            {lane.id}
          </button>
        ))}
      </div>

      <NodeSearchSection
        accent={accent}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        searchedNodes={searchedNodes}
        bulkSelected={bulkSelected}
        bulkToggle={bulkToggle}
        jumpToNode={jumpToNode}
      />

      <NodeOutlineSection outlineGroups={outlineGroups} jumpToNode={jumpToNode} />

      <NodeBulkActionsSection
        bulkSelectedIds={bulkSelectedIds}
        bulkTagDraft={bulkTagDraft}
        setBulkTagDraft={setBulkTagDraft}
        setBulkSelectedFromSearch={selectNodesFromSearch}
        onClearBulkSelection={clearBulkSelection}
        onApplyStatus={(status) => bulkApplyPatch({ status })}
        onApplyPriority={(priority) => bulkApplyPatch({ priority })}
        onApplyTag={bulkApplyTag}
        onDeleteSelected={bulkDelete}
      />

      {selectedNode ? (
        <SelectedNodeDetailsSection
          selectedNode={selectedNode}
          lanes={lanes}
          updateNode={updateNode}
        />
      ) : null}

      <TimelineSection timelineNodes={timelineNodes} jumpToNode={jumpToNode} />
    </div>
  );
}
