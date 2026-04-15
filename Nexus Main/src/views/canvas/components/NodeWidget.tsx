import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Bell,
  CheckSquare,
  Trash2,
  Edit3,
  FileText,
  Flag,
  Link,
  Maximize2,
  Type,
  GripVertical,
  MoreHorizontal,
  Palette,
  Copy,
} from "lucide-react";
import { Glass } from "../../../components/Glass";
import { SurfaceHighlight } from "../../../components/render/SurfaceHighlight";
import { useCanvas, type CanvasNode } from "../../../store/canvasStore";
import { useTheme } from "../../../store/themeStore";
import { useApp } from "../../../store/appStore";
import { hexToRgb } from "../../../lib/utils";
import { useInteractiveSurfaceMotion } from "../../../render/useInteractiveSurfaceMotion";
import { shallow } from "zustand/shallow";
import {
  CANVAS_MAGIC_HUB_QUICK_ACTIONS,
  type CanvasMagicHubQuickActionId,
} from "@nexus/core/canvas/magicHubTemplates";
import { NODE_COLORS, WIDGET_TYPES } from "../constants";
import { renderNodeWidgetContent } from "./nodeWidget/renderNodeWidgetContent";

const HUB_ACTION_ICONS = {
  note: FileText,
  task: CheckSquare,
  decision: Flag,
  risk: Bell,
} as const;

function ConnPort({
  side,
  nodeId,
  onStartConnect,
  onEndConnect,
  connecting,
}: {
  side: "top" | "right" | "bottom" | "left";
  nodeId: string;
  onStartConnect: (id: string) => void;
  onEndConnect: (id: string) => void;
  connecting: boolean;
}) {
  const t = useTheme();
  const motionId = React.useId().replace(/:/g, "-");
  const accentRgb = hexToRgb(t.accent);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [pressed, setPressed] = useState(false);
  const interaction = useInteractiveSurfaceMotion({
    id: `canvas-port-${nodeId}-${side}-${motionId}`,
    hovered,
    focused,
    selected: connecting,
    pressed,
    surfaceClass: "utility-surface",
    effectClass: "status-highlight",
    budgetPriority: connecting ? "high" : "normal",
    areaHint: 18,
    family: "micro",
  });
  const isActive = hovered || focused || connecting;
  const posStyle: React.CSSProperties = {
    position: "absolute",
    width: 13,
    height: 13,
    borderRadius: "50%",
    background: isActive
      ? t.accent
      : t.mode === "dark"
        ? "rgba(255,255,255,0.25)"
        : "rgba(0,0,0,0.18)",
    border: `2px solid ${t.accent}`,
    cursor: "crosshair",
    transition:
      `background-color ${interaction.runtime.timings.quickMs}ms ${interaction.runtime.timings.easing}, box-shadow ${interaction.runtime.timings.quickMs}ms ${interaction.runtime.timings.easing}`,
    transform: "translate(-50%, -50%)",
    zIndex: 10,
    boxShadow: isActive ? `0 0 8px ${t.accent}` : "none",
    ...(side === "top" && { top: 0, left: "50%" }),
    ...(side === "right" && {
      top: "50%",
      right: -7,
      left: "auto",
      transform: "translate(50%, -50%)",
    }),
    ...(side === "bottom" && {
      bottom: -7,
      left: "50%",
      top: "auto",
      transform: "translate(-50%, 50%)",
    }),
    ...(side === "left" && { top: "50%", left: 0 }),
  };
  return (
    <motion.div
      className="nx-motion-managed"
      style={posStyle}
      animate={interaction.content.animate}
      transition={interaction.content.transition}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => {
        setHovered(false);
        setPressed(false);
      }}
      onFocus={() => setFocused(true)}
      onBlur={() => {
        setFocused(false);
        setPressed(false);
      }}
      onMouseDown={(e) => {
        e.stopPropagation();
        setPressed(true);
        onStartConnect(nodeId);
      }}
      onMouseUp={(e) => {
        e.stopPropagation();
        setPressed(false);
        onEndConnect(nodeId);
      }}
    >
      <SurfaceHighlight highlight={interaction.highlight} inset={0} radius={999}>
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "50%",
            border: `1px solid rgba(${accentRgb},0.35)`,
            background: `radial-gradient(circle at 50% 50%, rgba(${accentRgb},0.22), rgba(${accentRgb},0.08) 68%, rgba(${accentRgb},0.02) 100%)`,
          }}
        />
      </SurfaceHighlight>
    </motion.div>
  );
}

// ─── NODE WIDGET ───

const NodeWidget = React.memo(function NodeWidget({
  node,
  isSelected,
  onSelect,
  onStartConnect,
  onEndConnect,
  connectingFrom,
  snapToGrid,
  reduceEffects,
  onHubQuickAction,
}: {
  node: CanvasNode;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onStartConnect: (id: string) => void;
  onEndConnect: (id: string) => void;
  connectingFrom: string | null;
  snapToGrid?: boolean;
  reduceEffects?: boolean;
  onHubQuickAction?: (
    node: CanvasNode,
    action: CanvasMagicHubQuickActionId,
  ) => void;
}) {
  const t = useTheme();
  const app = useApp(
    (s) => ({
      notes: s.notes,
      tasks: s.tasks,
      codes: s.codes,
      reminders: s.reminders,
      setNote: s.setNote,
      updateTask: s.updateTask,
      updateReminder: s.updateReminder,
    }),
    shallow,
  );
  const widgetPreset = WIDGET_TYPES.find((entry) => entry.type === node.type);
  const nodeAccent = node.color || widgetPreset?.accent || t.accent;
  const rgb = hexToRgb(nodeAccent);
  const widgetCategory = widgetPreset?.category || "Capture";
  const widgetDescription = widgetPreset?.description || node.type;
  const isMagicHub = useMemo(() => {
    const tags = [
      ...(node.tags || []),
      ...(((node as any).pm?.tags as string[] | undefined) || []),
    ];
    return (
      tags.includes("magic-hub") ||
      tags.some((tag) => tag.startsWith("preset:"))
    );
  }, [node.tags]);
  const {
    updateNode,
    deleteNode,
    moveNode,
    resizeNode,
    addChecklistItem,
    toggleChecklistItem,
    deleteChecklistItem,
  } = useCanvas(
    (s) => ({
      updateNode: s.updateNode,
      deleteNode: s.deleteNode,
      moveNode: s.moveNode,
      resizeNode: s.resizeNode,
      addChecklistItem: s.addChecklistItem,
      toggleChecklistItem: s.toggleChecklistItem,
      deleteChecklistItem: s.deleteChecklistItem,
    }),
    shallow,
  );

  const [dragging, setDragging] = useState(false);
  const [resizing, setResizing] = useState(false);
  const [editTitle, setEditTitle] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [newCheckItem, setNewCheckItem] = useState("");
  const [editingContent, setEditingContent] = useState(
    node.type !== "markdown",
  );
  const [contentDraft, setContentDraft] = useState(node.content || "");
  const contentCommitTimerRef = useRef<number | null>(null);
  const pendingContentRef = useRef<string | null>(null);
  const [hovered, setHovered] = useState(false);
  const [dragPreview, setDragPreview] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [resizePreview, setResizePreview] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const dragStart = useRef({ x: 0, y: 0, nodeX: 0, nodeY: 0 });
  const resizeStart = useRef({ x: 0, y: 0, w: 0, h: 0 });

  const liveX = dragPreview?.x ?? node.x;
  const liveY = dragPreview?.y ?? node.y;
  const liveWidth = resizePreview?.width ?? node.width;
  const liveHeight = resizePreview?.height ?? node.height;
  const nodeForRender = useMemo(
    () =>
      node.content === contentDraft
        ? node
        : {
            ...node,
            content: contentDraft,
          },
    [contentDraft, node],
  );

  const isSticky = node.type === "text" && node.color === "#FFCC00";
  const stickyBg = isSticky
    ? `linear-gradient(145deg, #FFEE88, #FFD700)`
    : undefined;

  const flushPendingContentCommit = useCallback(() => {
    const pending = pendingContentRef.current;
    if (pending === null) return;
    pendingContentRef.current = null;
    updateNode(node.id, { content: pending });
  }, [node.id, updateNode]);

  const scheduleContentCommit = useCallback(
    (nextContent: string) => {
      setContentDraft(nextContent);
      pendingContentRef.current = nextContent;
      if (contentCommitTimerRef.current !== null) {
        window.clearTimeout(contentCommitTimerRef.current);
      }
      contentCommitTimerRef.current = window.setTimeout(() => {
        contentCommitTimerRef.current = null;
        flushPendingContentCommit();
      }, 120);
    },
    [flushPendingContentCommit],
  );

  const commitNodePatch = useCallback(
    (id: string, patch: Partial<CanvasNode>) => {
      if (id !== node.id) {
        updateNode(id, patch);
        return;
      }
      if (Object.prototype.hasOwnProperty.call(patch, "content")) {
        const nextContent = String((patch as any).content ?? "");
        scheduleContentCommit(nextContent);
        const { content: _content, ...rest } = patch;
        if (Object.keys(rest).length > 0) {
          updateNode(id, rest);
        }
        return;
      }
      updateNode(id, patch);
    },
    [node.id, scheduleContentCommit, updateNode],
  );

  useEffect(() => {
    if (pendingContentRef.current !== null) return;
    setContentDraft(node.content || "");
  }, [node.id, node.content]);

  useEffect(
    () => () => {
      if (contentCommitTimerRef.current !== null) {
        window.clearTimeout(contentCommitTimerRef.current);
        contentCommitTimerRef.current = null;
      }
      flushPendingContentCommit();
    },
    [flushPendingContentCommit],
  );

  const handleNodeWheelCapture = useCallback((event: React.WheelEvent) => {
    event.stopPropagation();
    if (event.ctrlKey || event.metaKey || event.altKey) {
      event.preventDefault();
    }
  }, []);

  // Drag
  const handleDragStart = useCallback(
    (e: React.MouseEvent) => {
      if ((e.target as HTMLElement).closest(".node-interactive")) return;
      e.stopPropagation();
      onSelect(node.id);
      setDragging(true);
      dragStart.current = {
        x: e.clientX,
        y: e.clientY,
        nodeX: node.x,
        nodeY: node.y,
      };
    },
    [node.id, node.x, node.y, onSelect],
  );

  useEffect(() => {
    if (!dragging) return;
    let raf = 0;
    let pending: { x: number; y: number } | null = null;

    const flush = () => {
      raf = 0;
      if (!pending) return;
      setDragPreview(pending);
      pending = null;
    };

    const onMove = (e: MouseEvent) => {
      const zoom = useCanvas.getState().viewport?.zoom || 1;
      const rawX =
        dragStart.current.nodeX + (e.clientX - dragStart.current.x) / zoom;
      const rawY =
        dragStart.current.nodeY + (e.clientY - dragStart.current.y) / zoom;
      const GRID = 24;
      const x = snapToGrid ? Math.round(rawX / GRID) * GRID : rawX;
      const y = snapToGrid ? Math.round(rawY / GRID) * GRID : rawY;
      pending = { x, y };
      if (!raf) {
        raf = requestAnimationFrame(flush);
      }
    };
    const onUp = () => {
      if (raf) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
      const finalPos = pending || dragPreview;
      if (finalPos) moveNode(node.id, finalPos.x, finalPos.y);
      pending = null;
      setDragPreview(null);
      setDragging(false);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [dragging, node.id, moveNode, snapToGrid, dragPreview]);

  // Resize
  const handleResizeStart = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      setResizing(true);
      resizeStart.current = {
        x: e.clientX,
        y: e.clientY,
        w: node.width,
        h: node.height,
      };
    },
    [node.width, node.height],
  );

  useEffect(() => {
    if (!resizing) return;
    let raf = 0;
    let pending: { width: number; height: number } | null = null;

    const flush = () => {
      raf = 0;
      if (!pending) return;
      setResizePreview(pending);
      pending = null;
    };

    const onMove = (e: MouseEvent) => {
      const zoom = useCanvas.getState().viewport?.zoom || 1;
      const nextWidth = Math.max(
        160,
        resizeStart.current.w + (e.clientX - resizeStart.current.x) / zoom,
      );
      const nextHeight = Math.max(
        80,
        resizeStart.current.h + (e.clientY - resizeStart.current.y) / zoom,
      );
      pending = {
        width: nextWidth,
        height: nextHeight,
      };
      if (!raf) {
        raf = requestAnimationFrame(flush);
      }
    };
    const onUp = () => {
      if (raf) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
      const finalSize = pending || resizePreview;
      if (finalSize) resizeNode(node.id, finalSize.width, finalSize.height);
      pending = null;
      setResizePreview(null);
      setResizing(false);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [resizing, node.id, resizeNode, resizePreview]);

  const duplicateNodeWithContent = useCallback(() => {
    const state = useCanvas.getState();
    state.addNode(node.type, node.x + 34, node.y + 34);
    const active = state.getActiveCanvas();
    const created = active?.nodes[active.nodes.length - 1];
    if (!created) return;
    state.updateNode(created.id, {
      title: `${node.title} Copy`,
      width: node.width,
      height: node.height,
      content: nodeForRender.content,
      color: node.color,
      items: node.items
        ? node.items.map((it) => ({
            ...it,
            id: `${it.id}-${Math.random().toString(36).slice(2, 7)}`,
          }))
        : undefined,
      codeLang: node.codeLang,
      linkedNoteId: node.linkedNoteId,
      linkedCodeId: node.linkedCodeId,
      linkedTaskId: node.linkedTaskId,
      linkedReminderId: node.linkedReminderId,
      status: node.status,
      priority: node.priority,
      progress: node.progress,
      dueDate: node.dueDate,
      owner: node.owner,
      tags: node.tags ? [...node.tags] : undefined,
      effort: node.effort,
      lane: node.lane,
      icon: node.icon,
    });
  }, [nodeForRender]);

  const fieldStyle: React.CSSProperties = {
    width: "100%",
    background:
      t.mode === "dark" ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 7,
    padding: "5px 7px",
    fontSize: 11,
    color: "inherit",
    outline: "none",
  };

  const replaceMarkdownCodeBlock = useCallback(
    (
      mdNode: any,
      className: string | undefined,
      rawChildren: React.ReactNode,
      nextBlockContent: string,
    ) => {
      const current = nodeForRender.content || "";
      const lang = (className || "").replace("language-", "");
      const raw = Array.isArray(rawChildren)
        ? rawChildren.join("")
        : String(rawChildren ?? "");
      const currentBlockContent = raw.replace(/\n$/, "");
      const normalizedNext = nextBlockContent
        .replace(/\r\n/g, "\n")
        .replace(/\n+$/, "");

      const makeFence = (block: string) =>
        `\`\`\`${lang}\n${block.replace(/\n+$/, "")}\n\`\`\``;

      const nextFence = makeFence(normalizedNext);
      const start = mdNode?.position?.start?.offset;
      const end = mdNode?.position?.end?.offset;
      if (
        Number.isFinite(start) &&
        Number.isFinite(end) &&
        start >= 0 &&
        end > start &&
        end <= current.length
      ) {
        commitNodePatch(node.id, {
          content: `${current.slice(0, start)}${nextFence}${current.slice(end)}`,
        });
        return;
      }

      const prevFence = makeFence(currentBlockContent);
      const idx = current.indexOf(prevFence);
      if (idx >= 0) {
        commitNodePatch(node.id, {
          content: `${current.slice(0, idx)}${nextFence}${current.slice(idx + prevFence.length)}`,
        });
      }
    },
    [commitNodePatch, node.id, nodeForRender.content],
  );
  const renderedContent = renderNodeWidgetContent({
    node: nodeForRender,
    theme: t,
    app,
    rgb,
    nodeAccent,
    isSticky,
    fieldStyle,
    editingContent,
    setEditingContent,
    newCheckItem,
    setNewCheckItem,
    updateNode: commitNodePatch,
    addChecklistItem,
    toggleChecklistItem,
    deleteChecklistItem,
    replaceMarkdownCodeBlock,
    isMagicHub,
    onHubQuickAction,
  });

  const TypeIcon = widgetPreset?.icon || Type;

  return (
    <div
      className="nx-canvas-node"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onWheelCapture={handleNodeWheelCapture}
      style={{
        position: "absolute",
        left: liveX,
        top: liveY,
        width: liveWidth,
        height: liveHeight,
        zIndex: isSelected ? 100 : 1,
        animation:
          reduceEffects || dragging || resizing
            ? undefined
            : "nexus-scale-in 0.22s ease-out both",
        willChange: "transform, left, top, width, height",
        backfaceVisibility: "hidden",
        transform: reduceEffects
          ? "translateZ(0)"
          : isSelected
            ? "translateZ(0) scale(1.01)"
            : hovered
              ? "translateZ(0) scale(1.004)"
              : "translateZ(0)",
        transition:
          reduceEffects || dragging || resizing
            ? "none"
            : "transform 0.16s cubic-bezier(0.2, 0.8, 0.2, 1)",
      }}
    >
      {/* Connection ports */}
      {(isSelected || connectingFrom) && (
        <>
          {(["top", "right", "bottom", "left"] as const).map((side) => (
            <ConnPort
              key={side}
              side={side}
              nodeId={node.id}
              onStartConnect={onStartConnect}
              onEndConnect={onEndConnect}
              connecting={connectingFrom === node.id}
            />
          ))}
        </>
      )}

      <Glass
        type="panel"
        glow={isSelected}
        className="h-full"
        style={{
          width: "100%",
          height: "100%",
          borderColor: isSelected ? nodeAccent : undefined,
          borderWidth: isSelected ? 2 : 1,
          overflow: "hidden",
          cursor: dragging ? "grabbing" : resizing ? "nwse-resize" : "grab",
          userSelect: dragging || resizing ? "none" : "auto",
          background: isSticky
            ? stickyBg
            : `linear-gradient(180deg, rgba(${rgb},${t.mode === "dark" ? "0.16" : "0.09"}) 0%, rgba(${rgb},0) 42%)`,
          boxShadow: isSelected
            ? `0 0 0 2px ${nodeAccent}, 0 8px 32px rgba(0,0,0,0.3), 0 0 20px ${nodeAccent}30`
            : reduceEffects
              ? `0 2px 8px rgba(0,0,0,0.15)`
              : `0 4px 16px rgba(0,0,0,0.2)`,
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            height: "100%",
            padding: 10,
            gap: 6,
          }}
        >
          {/* Header with color strip */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: 3,
              background: `linear-gradient(90deg, ${nodeAccent}, ${nodeAccent}80)`,
              borderRadius: `${t.visual.panelRadius}px ${t.visual.panelRadius}px 0 0`,
              opacity: 0.8,
            }}
          />

          <div
            onMouseDown={handleDragStart}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              cursor: dragging ? "grabbing" : "grab",
              flexShrink: 0,
              borderBottom: `1px solid ${isSticky ? "rgba(0,0,0,0.1)" : t.mode === "dark" ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)"}`,
              paddingBottom: 6,
              paddingTop: 4,
            }}
          >
            <GripVertical size={13} style={{ opacity: 0.35, flexShrink: 0 }} />
            <div
              style={{
                width: 18,
                height: 18,
                borderRadius: 6,
                background: `rgba(${rgb},0.2)`,
                border: `1px solid rgba(${rgb},0.34)`,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
              title={widgetDescription}
            >
              <TypeIcon size={11} style={{ color: nodeAccent, flexShrink: 0 }} />
            </div>

            {editTitle ? (
              <input
                autoFocus
                className="node-interactive"
                value={node.title}
                onChange={(e) => updateNode(node.id, { title: e.target.value })}
                onBlur={() => setEditTitle(false)}
                onKeyDown={(e) => e.key === "Enter" && setEditTitle(false)}
                style={{
                  flex: 1,
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  color: isSticky ? "#333" : "inherit",
                  fontWeight: 600,
                  fontSize: 12,
                  padding: 0,
                  minWidth: 0,
                }}
              />
            ) : (
              <span
                onDoubleClick={() => setEditTitle(true)}
                style={{
                  flex: 1,
                  fontWeight: 600,
                  fontSize: 12,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  color: isSticky ? "#333" : "inherit",
                }}
              >
                {node.title}
              </span>
            )}

            {!editTitle && (
              <span
                title={widgetDescription}
                style={{
                  fontSize: 9,
                  fontWeight: 700,
                  padding: "2px 7px",
                  borderRadius: 999,
                  border: `1px solid rgba(${rgb},0.42)`,
                  color: nodeAccent,
                  background: `rgba(${rgb},0.18)`,
                  letterSpacing: 0.25,
                  textTransform: "uppercase",
                  lineHeight: 1.1,
                  flexShrink: 0,
                  maxWidth: 92,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {widgetCategory}
              </span>
            )}

            {/* Context menu */}
            <div style={{ position: "relative", flexShrink: 0 }}>
              <button
                className="node-interactive"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMenu(!showMenu);
                  setShowColorPicker(false);
                }}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: isSticky ? "#666" : "inherit",
                  opacity: 0.5,
                  padding: 2,
                  display: "flex",
                  alignItems: "center",
                }}
              >
                <MoreHorizontal size={13} />
              </button>

              {showMenu && (
                <div
                  className="node-interactive"
                  style={{
                    position: "absolute",
                    top: "100%",
                    right: 0,
                    background: t.mode === "dark" ? "#1a1a2e" : "#fff",
                    border: `1px solid ${t.mode === "dark" ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)"}`,
                    borderRadius: 10,
                    padding: 4,
                    zIndex: 200,
                    minWidth: 140,
                    boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
                  }}
                >
                  <MenuBtn
                    icon={Edit3}
                    label="Rename"
                    onClick={() => {
                      setEditTitle(true);
                      setShowMenu(false);
                    }}
                  />
                  <MenuBtn
                    icon={Palette}
                    label="Color"
                    onClick={() => setShowColorPicker(!showColorPicker)}
                  />
                  <MenuBtn
                    icon={Link}
                    label="Connect"
                    onClick={() => {
                      onStartConnect(node.id);
                      setShowMenu(false);
                    }}
                  />
                  <MenuBtn
                    icon={Copy}
                    label="Duplicate"
                    onClick={() => {
                      duplicateNodeWithContent();
                      setShowMenu(false);
                    }}
                  />
                  <MenuBtn
                    icon={Maximize2}
                    label="Larger"
                    onClick={() => {
                      resizeNode(
                        node.id,
                        Math.max(node.width + 120, 320),
                        Math.max(node.height + 90, 180),
                      );
                      setShowMenu(false);
                    }}
                  />
                  <MenuBtn
                    icon={Trash2}
                    label="Delete"
                    onClick={() => deleteNode(node.id)}
                    danger
                  />

                  {showColorPicker && (
                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 4,
                        padding: "6px",
                        borderTop: `1px solid ${t.mode === "dark" ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)"}`,
                        marginTop: 4,
                      }}
                    >
                      {NODE_COLORS.map((c) => (
                        <div
                          key={c}
                          onClick={() => {
                            updateNode(node.id, { color: c });
                            setShowColorPicker(false);
                            setShowMenu(false);
                          }}
                          style={{
                            width: 18,
                            height: 18,
                            borderRadius: "50%",
                            background: c,
                            cursor: "pointer",
                            border:
                              node.color === c
                                ? "2px solid white"
                                : "2px solid transparent",
                            boxShadow: `0 0 4px ${c}`,
                          }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div
            style={{
              flex: 1,
              overflow: "hidden",
              minHeight: 0,
              position: "relative",
            }}
          >
            {isMagicHub && onHubQuickAction && (
              <div
                className="node-interactive"
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 5,
                  paddingBottom: 4,
                  marginBottom: 2,
                }}
              >
                {CANVAS_MAGIC_HUB_QUICK_ACTIONS.map(({ id, label }) => {
                  const Icon = HUB_ACTION_ICONS[id];
                  return (
                  <button
                    key={id}
                    onClick={(event) => {
                      event.stopPropagation();
                      onHubQuickAction(node, id);
                    }}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                      border: `1px solid rgba(${rgb},0.42)`,
                      background: `rgba(${rgb},0.16)`,
                      color: nodeAccent,
                      borderRadius: 999,
                      padding: "2px 8px",
                      fontSize: 10,
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    <Icon size={10} />
                    {label}
                  </button>
                  );
                })}
              </div>
            )}
            {renderedContent}
          </div>

          {/* Resize handle */}
          {(isSelected || hovered) && (
            <div
              onMouseDownCapture={handleResizeStart}
              style={{
                position: "absolute",
                right: 0,
                bottom: 0,
                width: 24,
                height: 24,
                cursor: "nwse-resize",
                display: "flex",
                alignItems: "flex-end",
                justifyContent: "flex-end",
                padding: 6,
                opacity: 0.5,
                zIndex: 50,
              }}
            >
              <svg
                width="10"
                height="10"
                viewBox="0 0 10 10"
                fill="none"
                style={{ pointerEvents: "none" }}
              >
                <path
                  d="M9 1L9 9L1 9"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          )}
        </div>
      </Glass>
    </div>
  );
});
NodeWidget.displayName = "NodeWidget";

// ─── MENU BUTTON ───

function MenuBtn({
  icon: Icon,
  label,
  onClick,
  danger,
}: {
  icon: any;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  const t = useTheme();
  const motionId = React.useId().replace(/:/g, "-");
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [pressed, setPressed] = useState(false);
  const tint = danger ? "#FF3B30" : t.accent;
  const tintRgb = hexToRgb(tint);
  const interaction = useInteractiveSurfaceMotion({
    id: `canvas-node-menu-${label}-${motionId}`,
    hovered,
    focused,
    pressed,
    surfaceClass: "utility-surface",
    effectClass: "status-highlight",
    budgetPriority: danger ? "high" : "normal",
    areaHint: 74,
    family: "micro",
  });
  return (
    <motion.button
      type="button"
      className="nx-motion-managed nx-bounce-target"
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => {
        setHovered(false);
        setPressed(false);
      }}
      onFocus={() => setFocused(true)}
      onBlur={() => {
        setFocused(false);
        setPressed(false);
      }}
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerCancel={() => setPressed(false)}
      animate={interaction.content.animate}
      transition={interaction.content.transition}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        width: "100%",
        padding: "7px 10px",
        border: "none",
        borderRadius: 7,
        cursor: "pointer",
        fontSize: 12,
        background: "transparent",
        color: danger ? "#FF3B30" : "inherit",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <SurfaceHighlight highlight={interaction.highlight} inset={0} radius={7}>
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: 7,
            border: `1px solid rgba(${tintRgb},0.22)`,
            background: `radial-gradient(circle at 50% 50%, rgba(${tintRgb},0.18), rgba(${tintRgb},0.06) 68%, rgba(${tintRgb},0.02) 100%)`,
          }}
        />
      </SurfaceHighlight>
      <Icon size={13} />
      <span style={{ position: "relative", zIndex: 1 }}>{label}</span>
    </motion.button>
  );
}

// ─── MINIMAP ───

export { NodeWidget };
