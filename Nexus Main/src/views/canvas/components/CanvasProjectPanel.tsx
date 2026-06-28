import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CalendarClock,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  Compass,
  Layers,
  Network,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import {
  useCanvas,
  type Canvas,
  type CanvasNode,
  type CanvasNodeStatus,
} from "../../../store/canvasStore";
import { NodeSearchSection } from "./projectPanel/NodeSearchSection";
import { NodeOutlineSection } from "./projectPanel/NodeOutlineSection";
import { NodeBulkActionsSection } from "./projectPanel/NodeBulkActionsSection";
import { SelectedNodeDetailsSection } from "./projectPanel/SelectedNodeDetailsSection";
import { TimelineSection } from "./projectPanel/TimelineSection";
import { NodeRelationsSection } from "./projectPanel/NodeRelationsSection";
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
  searchFocusToken?: number;
};

type ProjectPanelSection = "search" | "outline" | "bulk" | "details" | "relations" | "timeline";

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
  searchFocusToken = 0,
}: CanvasProjectPanelProps) {
  const canvasNodes = canvas?.nodes ?? [];
  const canvasConnections = canvas?.connections ?? [];
  const [searchQuery, setSearchQuery] = useState("");
  const [bulkTagDraft, setBulkTagDraft] = useState("");
  const [bulkSelected, setBulkSelected] = useState<Record<string, true>>({});
  const [focusTrail, setFocusTrail] = useState<string[]>([]);
  const [focusTrailIndex, setFocusTrailIndex] = useState(-1);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const sectionRefs = useRef<Record<ProjectPanelSection, HTMLDivElement | null>>({
    search: null,
    outline: null,
    bulk: null,
    details: null,
    relations: null,
    timeline: null,
  });

  const bulkSelectedIds = useMemo(() => Object.keys(bulkSelected), [bulkSelected]);

  const setSectionRef = useCallback(
    (section: ProjectPanelSection) => (node: HTMLDivElement | null) => {
      sectionRefs.current[section] = node;
    },
    [],
  );

  const scrollToSection = useCallback((section: ProjectPanelSection) => {
    sectionRefs.current[section]?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  useEffect(() => {
    if (!open) return;
    const input = searchInputRef.current;
    if (!input) return;
    input.focus();
    input.select();
  }, [open, searchFocusToken]);

  const commitFocusTrail = useCallback((nodeId: string) => {
    setFocusTrail((prev) => {
      const capped =
        focusTrailIndex >= 0 ? prev.slice(0, focusTrailIndex + 1) : prev.slice();
      if (capped[capped.length - 1] === nodeId) return capped;
      const next = [...capped, nodeId];
      if (next.length > 24) return next.slice(next.length - 24);
      return next;
    });
    setFocusTrailIndex((prev) => {
      const next = prev >= 0 ? prev + 1 : 0;
      return Math.min(23, next);
    });
  }, [focusTrailIndex]);

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
      const current = canvasNodes.find((node) => node.id === nodeId);
      if (!current) return;
      const tags = new Set(current.tags || []);
      tags.add(tag);
      state.updateNode(nodeId, { tags: Array.from(tags) });
    });
    setBulkTagDraft("");
  }, [bulkSelectedIds, bulkTagDraft, canvasNodes]);

  const doneCount = projectNodes.filter((node) => node.status === "done").length;
  const blockedCount = projectNodes.filter((node) => node.status === "blocked").length;
  const criticalCount = projectNodes.filter((node) => node.priority === "critical").length;
  const completionPct =
    projectNodes.length > 0 ? Math.round((doneCount / projectNodes.length) * 100) : 0;

  const searchedNodes = useMemo(() => {
    const q = searchQuery.trim();
    if (!q) return canvasNodes.slice(0, 18);
    return canvasNodes
      .map((node) => ({ node, score: scoreNodeMatch(node, q) }))
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 28)
      .map((entry) => entry.node);
  }, [canvasNodes, searchQuery]);

  const outlineGroups = useMemo(() => {
    const groups = new Map<string, CanvasNode[]>();
    canvasNodes.forEach((node) => {
      const key = node.type;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)?.push(node);
    });
    return Array.from(groups.entries()).sort((a, b) => b[1].length - a[1].length);
  }, [canvasNodes]);

  const jumpToNode = useCallback(
    (nodeId: string, options?: { recordTrail?: boolean }) => {
      setSelectedNodeId(nodeId);
      focusNode(nodeId);
      if (options?.recordTrail !== false) commitFocusTrail(nodeId);
    },
    [commitFocusTrail, focusNode, setSelectedNodeId],
  );

  const navigateFocusTrail = useCallback((direction: -1 | 1) => {
    setFocusTrailIndex((currentIndex) => {
      const nextIndex = currentIndex + direction;
      if (nextIndex < 0 || nextIndex >= focusTrail.length) return currentIndex;
      const targetNodeId = focusTrail[nextIndex];
      if (targetNodeId) jumpToNode(targetNodeId, { recordTrail: false });
      return nextIndex;
    });
  }, [focusTrail, jumpToNode]);

  const relationSnapshot = useMemo(() => {
    if (!selectedNode) {
      return { incoming: [] as CanvasNode[], outgoing: [] as CanvasNode[], local: [] as CanvasNode[] };
    }
    const nodeById = new globalThis.Map<string, CanvasNode>();
    canvasNodes.forEach((node) => nodeById.set(node.id, node));
    const incomingIds = canvasConnections
      .filter((entry) => entry.toId === selectedNode.id)
      .map((entry) => entry.fromId);
    const outgoingIds = canvasConnections
      .filter((entry) => entry.fromId === selectedNode.id)
      .map((entry) => entry.toId);
    const toNodes = (ids: string[]) =>
      ids
        .map((id) => nodeById.get(id) ?? null)
        .filter((node): node is CanvasNode => Boolean(node));
    const incoming = toNodes(incomingIds);
    const outgoing = toNodes(outgoingIds);
    const localIds = new Set<string>([...incomingIds, ...outgoingIds]);
    [...localIds].forEach((nodeId) => {
      canvasConnections.forEach((entry) => {
        if (entry.fromId === nodeId && entry.toId !== selectedNode.id) localIds.add(entry.toId);
        if (entry.toId === nodeId && entry.fromId !== selectedNode.id) localIds.add(entry.fromId);
      });
    });
    const local = [...localIds]
      .map((id) => nodeById.get(id) ?? null)
      .filter((node): node is CanvasNode => Boolean(node))
      .slice(0, 10);
    return { incoming, outgoing, local };
  }, [canvasConnections, canvasNodes, selectedNode]);

  const selectNodesFromSearch = useCallback(() => {
    const next: Record<string, true> = {};
    searchedNodes.forEach((node) => {
      next[node.id] = true;
    });
    setBulkSelected(next);
  }, [searchedNodes]);

  const directRelationCount = relationSnapshot.incoming.length + relationSnapshot.outgoing.length;
  const panelSections: Array<{
    id: ProjectPanelSection;
    label: string;
    count: number;
    Icon: React.ComponentType<{ size?: number }>;
  }> = [
    { id: "search", label: "Search", count: searchedNodes.length, Icon: Search },
    { id: "outline", label: "Outline", count: outlineGroups.length, Icon: Compass },
    { id: "bulk", label: "Bulk", count: bulkSelectedIds.length, Icon: Layers },
    { id: "details", label: "Details", count: selectedNode ? 1 : 0, Icon: SlidersHorizontal },
    { id: "relations", label: "Relations", count: directRelationCount, Icon: Network },
    { id: "timeline", label: "Timeline", count: timelineNodes.length, Icon: CalendarClock },
  ];

  if (!open || !canvas) return null;

  return (
    <div
      className="nx-canvas-project-panel"
      data-mode={mode}
      style={{
        position: "absolute",
        top: 14,
        right: 14,
        zIndex: 210,
        width: "clamp(392px, 30vw, 460px)",
        maxHeight: "calc(100% - 28px)",
        overflow: "auto",
        borderRadius: 8,
        padding: 10,
        background: mode === "dark" ? "rgba(12,12,22,0.86)" : "rgba(255,255,255,0.92)",
        backdropFilter: "blur(18px)",
        border: "1px solid rgba(255,255,255,0.14)",
        boxShadow: "0 14px 40px rgba(0,0,0,0.35)",
        ["--nx-canvas-project-rgb" as any]: rgb,
        ["--nx-canvas-project-accent" as any]: accent,
      }}
    >
      <header className="nx-canvas-project-header">
        <CheckSquare size={15} style={{ color: accent }} />
        <div className="nx-canvas-project-title">
          <strong>Project Canvas</strong>
          <span>{canvas.name || "Untitled Canvas"}</span>
        </div>
        <div className="nx-canvas-project-actions">
          <button
            type="button"
            className="nx-canvas-icon-button"
            onClick={() => navigateFocusTrail(-1)}
            disabled={focusTrailIndex <= 0}
            title="Zurueck"
            aria-label="Vorheriger Fokus"
          >
            <ChevronLeft size={14} />
          </button>
          <button
            type="button"
            className="nx-canvas-icon-button"
            onClick={() => navigateFocusTrail(1)}
            disabled={focusTrailIndex >= focusTrail.length - 1}
            title="Weiter"
            aria-label="Naechster Fokus"
          >
            <ChevronRight size={14} />
          </button>
          <button
            type="button"
            className="nx-canvas-project-focus"
            data-active={focusNodeOnly ? "true" : "false"}
            onClick={onToggleFocusOnly}
            style={{
              border: `1px solid ${focusNodeOnly ? accent : "rgba(255,255,255,0.14)"}`,
              background: focusNodeOnly ? `rgba(${rgb},0.16)` : "rgba(255,255,255,0.06)",
              color: focusNodeOnly ? accent : "inherit",
            }}
          >
            Focus
          </button>
          <button
            type="button"
            className="nx-canvas-icon-button"
            onClick={onClose}
            title="Panel schliessen"
            aria-label="Project Panel schliessen"
          >
            <X size={14} />
          </button>
        </div>
      </header>

      <nav className="nx-canvas-project-nav" aria-label="Canvas project sections">
        {panelSections.map(({ id, label, count, Icon }) => (
          <button key={id} type="button" onClick={() => scrollToSection(id)}>
            <Icon size={12} />
            <span>{label}</span>
            <small>{count}</small>
          </button>
        ))}
      </nav>

      <div className="nx-canvas-project-stats">
        {[
          { label: "Nodes", val: projectNodes.length },
          { label: "Done", val: doneCount },
          { label: "Risk", val: blockedCount + criticalCount },
          { label: "Links", val: canvasConnections.length },
        ].map((item) => (
          <div key={item.label} className="nx-canvas-project-stat">
            <div>{item.val}</div>
            <span>{item.label}</span>
          </div>
        ))}
      </div>

      <div className="nx-canvas-project-progress">
        <div>
          <strong>{completionPct}%</strong>
          <span>
            {doneCount}/{projectNodes.length || 0} done
          </span>
        </div>
        <div aria-hidden="true">
          <span style={{ width: `${completionPct}%` }} />
        </div>
      </div>

      <div className="nx-canvas-project-filters">
        <button
          type="button"
          onClick={() => setPmStatusFilter("all")}
          data-active={pmStatusFilter === "all" ? "true" : "false"}
        >
          all
        </button>
        {lanes.map((lane) => (
          <button
            type="button"
            key={lane.id}
            onClick={() => setPmStatusFilter(lane.id)}
            data-active={pmStatusFilter === lane.id ? "true" : "false"}
            style={{
              ["--nx-canvas-lane-color" as any]: lane.color,
            }}
          >
            {lane.label}
          </button>
        ))}
      </div>

      <div ref={setSectionRef("search")} className="nx-canvas-project-anchor">
        <NodeSearchSection
          accent={accent}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          searchedNodes={searchedNodes}
          bulkSelected={bulkSelected}
          bulkToggle={bulkToggle}
          jumpToNode={jumpToNode}
          searchInputRef={searchInputRef}
          totalNodeCount={canvasNodes.length}
        />
      </div>

      <div ref={setSectionRef("outline")} className="nx-canvas-project-anchor">
        <NodeOutlineSection
          outlineGroups={outlineGroups}
          jumpToNode={jumpToNode}
          totalNodeCount={canvasNodes.length}
        />
      </div>

      <div ref={setSectionRef("bulk")} className="nx-canvas-project-anchor">
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
      </div>

      <div ref={setSectionRef("details")} className="nx-canvas-project-anchor">
        <SelectedNodeDetailsSection
          selectedNode={selectedNode}
          lanes={lanes}
          updateNode={updateNode}
        />
      </div>

      <div ref={setSectionRef("relations")} className="nx-canvas-project-anchor">
        <NodeRelationsSection
          selectedNode={selectedNode}
          incomingNodes={relationSnapshot.incoming}
          outgoingNodes={relationSnapshot.outgoing}
          localGraphNodes={relationSnapshot.local}
          jumpToNode={jumpToNode}
        />
      </div>

      <div ref={setSectionRef("timeline")} className="nx-canvas-project-anchor">
        <TimelineSection timelineNodes={timelineNodes} jumpToNode={jumpToNode} />
      </div>
    </div>
  );
}
