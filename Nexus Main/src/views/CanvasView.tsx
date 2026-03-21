import React, {
  Suspense,
  lazy,
  useState,
  useRef,
  useCallback,
  useEffect,
  useMemo,
} from "react";
import {
  Plus,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Trash2,
  Edit3,
  Link,
  Type,
  FileText,
  CheckSquare,
  Image,
  Code,
  X,
  GripVertical,
  MoreHorizontal,
  Palette,
  Unlink,
  Grid,
  Map,
  RotateCcw,
  RotateCw,
  StickyNote,
  Sun,
  Copy,
  AlignCenter,
  Bell,
  Wand2,
  Flag,
  AlertCircle,
  GitBranch,
  Calendar,
} from "lucide-react";
import { Glass } from "../components/Glass";
import {
  useCanvas,
  NodeType,
  CanvasNode,
  CanvasConnection,
  CanvasNodeStatus,
} from "../store/canvasStore";
import { useTheme } from "../store/themeStore";
import { useApp } from "../store/appStore";
import { hexToRgb } from "../lib/utils";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { shallow } from "zustand/shallow";
import { CanvasNexusCodeBlock } from "./canvas/CanvasMagicRenderers";
import type { MagicTemplateId, MagicTemplatePayload } from "./canvas/CanvasMagicModal";

const CanvasMagicModal = lazy(() =>
  import("./canvas/CanvasMagicModal").then((m) => ({ default: m.CanvasMagicModal })),
);

// ─── CONSTANTS ───

const NODE_COLORS = [
  "#007AFF",
  "#FF3B30",
  "#34C759",
  "#FF9500",
  "#AF52DE",
  "#00C7BE",
  "#FF2D55",
  "#5856D6",
  "#FFCC00",
  "#64D2FF",
  "#FF6B35",
  "#30D158",
  "#BF5AF2",
  "#FF6B9E",
  "#FFE600",
];

const WIDGET_TYPES: { type: NodeType | "sticky"; icon: any; label: string }[] =
  [
    { type: "text", icon: Type, label: "Text" },
    { type: "markdown", icon: FileText, label: "Markdown" },
    { type: "checklist", icon: CheckSquare, label: "Checklist" },
    { type: "image", icon: Image, label: "Bild" },
    { type: "code", icon: Code, label: "Code" },
    { type: "sticky", icon: StickyNote, label: "Sticky" },
    { type: "note", icon: FileText, label: "Notiz" },
    { type: "codefile", icon: Code, label: "Code-Datei" },
    { type: "task", icon: CheckSquare, label: "Aufgabe" },
    { type: "reminder", icon: Bell, label: "Reminder" },
    { type: "project", icon: FileText, label: "Projekt" },
    { type: "goal", icon: Sun, label: "Goal" },
    { type: "milestone", icon: Flag, label: "Milestone" },
    { type: "decision", icon: GitBranch, label: "Decision" },
    { type: "risk", icon: AlertCircle, label: "Risk" },
  ];

const QUICK_WIDGET_TYPES: Array<NodeType | "sticky"> = [
  "text",
  "markdown",
  "checklist",
  "task",
  "note",
  "project",
  "sticky",
];

const BOARD_LANES: Array<{
  id: CanvasNodeStatus;
  label: string;
  color: string;
}> = [
  { id: "todo", label: "To Do", color: "#8E8E93" },
  { id: "doing", label: "Doing", color: "#0A84FF" },
  { id: "blocked", label: "Blocked", color: "#FF453A" },
  { id: "done", label: "Done", color: "#30D158" },
];

const PRIORITY_WEIGHT: Record<string, number> = {
  low: 0,
  mid: 1,
  high: 2,
  critical: 3,
};

const parseDueDateTs = (value?: string) => {
  if (!value) return 9e15;
  const ts = new Date(value).getTime();
  return Number.isFinite(ts) ? ts : 9e15;
};

const timelineSortKey = (node: CanvasNode, index: number) => {
  const dueScore = parseDueDateTs(node.dueDate);
  const statusScore =
    node.status === "done"
      ? 3
      : node.status === "blocked"
        ? 2
        : node.status === "doing"
          ? 1
          : 0;
  const prioScore = PRIORITY_WEIGHT[node.priority || "mid"] ?? 1;
  return dueScore * 10 + statusScore * 2 - prioScore + index * 0.0001;
};

const laneForNode = (node: CanvasNode, index: number): CanvasNodeStatus => {
  if (node.status) return node.status;
  if (typeof node.progress === "number") {
    if (node.progress >= 100) return "done";
    if (node.progress >= 20) return "doing";
  }
  if (node.type === "risk") return "blocked";
  if (node.type === "milestone" || node.type === "task") return "doing";
  if (node.type === "goal" || node.type === "project") return "doing";
  const fallback: CanvasNodeStatus[] = ["todo", "doing", "blocked", "done"];
  return fallback[index % fallback.length];
};

const CANVAS_NODE_OVERSCAN_PX = 560;

// ─── CONNECTION LINE ───

const ConnectionLine = React.memo(function ConnectionLine({
  conn,
  nodes,
  zoom,
  onDelete,
}: {
  conn: CanvasConnection;
  nodes: CanvasNode[];
  zoom: number;
  onDelete: (id: string) => void;
}) {
  const t = useTheme();
  const fromNode = nodes.find((n) => n.id === conn.fromId);
  const toNode = nodes.find((n) => n.id === conn.toId);
  if (!fromNode || !toNode) return null;

  const x1 = fromNode.x + fromNode.width / 2;
  const y1 = fromNode.y + fromNode.height / 2;
  const x2 = toNode.x + toNode.width / 2;
  const y2 = toNode.y + toNode.height / 2;
  const dx = Math.abs(x2 - x1) * 0.5;
  const path = `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;

  const [hovered, setHovered] = useState(false);
  const connColor = conn.color || t.accent;

  return (
    <g
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <path
        d={path}
        stroke="transparent"
        strokeWidth={18 / zoom}
        fill="none"
        style={{ cursor: "pointer" }}
      />
      {/* Glow layer */}
      {hovered && (
        <path
          d={path}
          stroke={connColor}
          strokeWidth={6 / zoom}
          fill="none"
          opacity={0.2}
          style={{ filter: `blur(${3 / zoom}px)` }}
        />
      )}
      <path
        d={path}
        stroke={connColor}
        strokeWidth={(hovered ? 2.5 : 1.5) / zoom}
        fill="none"
        strokeDasharray={hovered ? "none" : `${8 / zoom} ${4 / zoom}`}
        opacity={hovered ? 1 : 0.55}
        style={{
          transition: "all 0.2s",
          filter: hovered
            ? `drop-shadow(0 0 ${4 / zoom}px ${connColor})`
            : "none",
        }}
      />
      {/* Arrowhead */}
      {hovered &&
        (() => {
          const angle = Math.atan2(y2 - y1, x2 - x1);
          const ax = x2 - (8 / zoom) * Math.cos(angle);
          const ay = y2 - (8 / zoom) * Math.sin(angle);
          return (
            <polygon
              points={`${x2},${y2} ${ax - (5 / zoom) * Math.sin(angle)},${ay + (5 / zoom) * Math.cos(angle)} ${ax + (5 / zoom) * Math.sin(angle)},${ay - (5 / zoom) * Math.cos(angle)}`}
              fill={connColor}
              opacity={0.9}
            />
          );
        })()}
      {/* Midpoint delete */}
      {hovered && (
        <g
          transform={`translate(${(x1 + x2) / 2},${(y1 + y2) / 2})`}
          onClick={(e) => {
            e.stopPropagation();
            onDelete(conn.id);
          }}
          style={{ cursor: "pointer" }}
        >
          <circle r={10 / zoom} fill="#FF3B30" opacity={0.9} />
          <line
            x1={-4 / zoom}
            y1={-4 / zoom}
            x2={4 / zoom}
            y2={4 / zoom}
            stroke="white"
            strokeWidth={1.5 / zoom}
          />
          <line
            x1={4 / zoom}
            y1={-4 / zoom}
            x2={-4 / zoom}
            y2={4 / zoom}
            stroke="white"
            strokeWidth={1.5 / zoom}
          />
        </g>
      )}
      {conn.label && (
        <text
          x={(x1 + x2) / 2}
          y={(y1 + y2) / 2 - 14 / zoom}
          textAnchor="middle"
          fill={t.mode === "dark" ? "#fff" : "#000"}
          fontSize={11 / zoom}
          opacity={0.7}
        >
          {conn.label}
        </text>
      )}
    </g>
  );
});
ConnectionLine.displayName = "ConnectionLine";

// ─── CONNECTION PORT ───

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
  const [hovered, setHovered] = useState(false);
  const posStyle: React.CSSProperties = {
    position: "absolute",
    width: 13,
    height: 13,
    borderRadius: "50%",
    background:
      hovered || connecting
        ? t.accent
        : t.mode === "dark"
          ? "rgba(255,255,255,0.25)"
          : "rgba(0,0,0,0.18)",
    border: `2px solid ${t.accent}`,
    cursor: "crosshair",
    transition: "all 0.15s",
    transform: "translate(-50%, -50%)",
    zIndex: 10,
    boxShadow: hovered || connecting ? `0 0 8px ${t.accent}` : "none",
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
    <div
      style={posStyle}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onMouseDown={(e) => {
        e.stopPropagation();
        onStartConnect(nodeId);
      }}
      onMouseUp={(e) => {
        e.stopPropagation();
        onEndConnect(nodeId);
      }}
    />
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
}: {
  node: CanvasNode;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onStartConnect: (id: string) => void;
  onEndConnect: (id: string) => void;
  connectingFrom: string | null;
  snapToGrid?: boolean;
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
  const rgb = hexToRgb(node.color || t.accent);
  const nodeAccent = node.color || t.accent;
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
  const [hovered, setHovered] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, nodeX: 0, nodeY: 0 });
  const resizeStart = useRef({ x: 0, y: 0, w: 0, h: 0 });

  const isSticky = node.type === "text" && node.color === "#FFCC00";
  const stickyBg = isSticky
    ? `linear-gradient(145deg, #FFEE88, #FFD700)`
    : undefined;

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
      moveNode(node.id, pending.x, pending.y);
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
      if (pending) {
        moveNode(node.id, pending.x, pending.y);
        pending = null;
      }
      setDragging(false);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [dragging, node.id, moveNode, snapToGrid]);

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
      resizeNode(node.id, pending.width, pending.height);
      pending = null;
    };

    const onMove = (e: MouseEvent) => {
      const zoom = useCanvas.getState().viewport?.zoom || 1;
      pending = {
        width:
          resizeStart.current.w + (e.clientX - resizeStart.current.x) / zoom,
        height:
          resizeStart.current.h + (e.clientY - resizeStart.current.y) / zoom,
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
      if (pending) {
        resizeNode(node.id, pending.width, pending.height);
        pending = null;
      }
      setResizing(false);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [resizing, node.id, resizeNode]);

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
      content: node.content,
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
  }, [node]);

  const statusColor = (status?: string) => {
    if (status === "done") return "#30D158";
    if (status === "blocked") return "#FF453A";
    if (status === "doing") return "#0A84FF";
    return "#8E8E93";
  };

  const priorityColor = (priority?: string) => {
    if (priority === "critical") return "#FF375F";
    if (priority === "high") return "#FF9F0A";
    if (priority === "mid") return "#64D2FF";
    return "#8E8E93";
  };

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
      const current = node.content || "";
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
        updateNode(node.id, {
          content: `${current.slice(0, start)}${nextFence}${current.slice(end)}`,
        });
        return;
      }

      const prevFence = makeFence(currentBlockContent);
      const idx = current.indexOf(prevFence);
      if (idx >= 0) {
        updateNode(node.id, {
          content: `${current.slice(0, idx)}${nextFence}${current.slice(idx + prevFence.length)}`,
        });
      }
    },
    [node.content, node.id, updateNode],
  );

  const renderContent = () => {
    switch (node.type) {
      case "text":
        return (
          <textarea
            className="node-interactive"
            value={node.content}
            onChange={(e) => updateNode(node.id, { content: e.target.value })}
            placeholder="Text eingeben..."
            style={{
              width: "100%",
              height: "100%",
              resize: "none",
              background: "transparent",
              border: "none",
              outline: "none",
              color: isSticky ? "#333" : "inherit",
              fontFamily: "inherit",
              fontSize: 13,
              lineHeight: 1.6,
              padding: 0,
            }}
          />
        );

      case "markdown":
        return editingContent ? (
          <div
            className="node-interactive"
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                marginBottom: 4,
              }}
            >
              <button
                onClick={() => setEditingContent(false)}
                style={{
                  fontSize: 10,
                  padding: "2px 8px",
                  borderRadius: 6,
                  background: `rgba(${rgb}, 0.2)`,
                  border: "none",
                  color: node.color || t.accent,
                  cursor: "pointer",
                }}
              >
                Preview
              </button>
            </div>
            <textarea
              value={node.content}
              onChange={(e) => updateNode(node.id, { content: e.target.value })}
              placeholder="# Markdown..."
              style={{
                flex: 1,
                width: "100%",
                resize: "none",
                background: "transparent",
                border: "none",
                outline: "none",
                color: "inherit",
                fontFamily: "'Fira Code', monospace",
                fontSize: 12,
                lineHeight: 1.5,
                padding: 0,
              }}
            />
          </div>
        ) : (
          <div
            className="node-interactive"
            style={{
              width: "100%",
              height: "100%",
              overflow: "auto",
              cursor: "text",
            }}
            onDoubleClick={() => setEditingContent(true)}
          >
            {node.content ? (
              <div
                style={{ fontSize: 13, lineHeight: 1.6 }}
                className="canvas-md"
              >
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    pre: ({ children }: any) => <>{children}</>,
                    code: ({ node: mdNode, className, children }: any) => (
                      <CanvasNexusCodeBlock
                        className={className}
                        accent={node.color || t.accent}
                        onChange={(next) =>
                          replaceMarkdownCodeBlock(
                            mdNode,
                            className,
                            children,
                            next,
                          )
                        }
                      >
                        {children}
                      </CanvasNexusCodeBlock>
                    ),
                  }}
                >
                  {node.content}
                </ReactMarkdown>
              </div>
            ) : (
              <div style={{ opacity: 0.4, fontSize: 13 }}>
                Doppelklick zum Bearbeiten...
              </div>
            )}
            <button
              onClick={() => setEditingContent(true)}
              style={{
                position: "absolute",
                bottom: 8,
                right: 8,
                fontSize: 10,
                padding: "2px 8px",
                borderRadius: 6,
                background: `rgba(${rgb}, 0.2)`,
                border: "none",
                color: node.color || t.accent,
                cursor: "pointer",
              }}
            >
              Edit
            </button>
          </div>
        );

      case "checklist":
        return (
          <div
            className="node-interactive"
            style={{ width: "100%", height: "100%", overflow: "auto" }}
          >
            {(node.items || []).map((item) => (
              <div
                key={item.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "4px 0",
                  borderBottom: `1px solid ${t.mode === "dark" ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}`,
                }}
              >
                <input
                  type="checkbox"
                  checked={item.done}
                  onChange={() => toggleChecklistItem(node.id, item.id)}
                  style={{
                    accentColor: node.color || t.accent,
                    cursor: "pointer",
                    flexShrink: 0,
                    width: 14,
                    height: 14,
                  }}
                />
                <span
                  style={{
                    flex: 1,
                    fontSize: 12,
                    textDecoration: item.done ? "line-through" : "none",
                    opacity: item.done ? 0.45 : 1,
                    transition: "all 0.2s",
                  }}
                >
                  {item.text}
                </span>
                <button
                  onClick={() => deleteChecklistItem(node.id, item.id)}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "#FF3B30",
                    opacity: 0.6,
                    padding: 2,
                  }}
                >
                  <X size={11} />
                </button>
              </div>
            ))}
            {/* Progress bar */}
            {(node.items || []).length > 0 && (
              <div
                style={{
                  height: 3,
                  background: "rgba(255,255,255,0.08)",
                  borderRadius: 2,
                  marginTop: 6,
                  marginBottom: 4,
                }}
              >
                <div
                  style={{
                    height: "100%",
                    borderRadius: 2,
                    background: node.color || t.accent,
                    width: `${((node.items || []).filter((i) => i.done).length / ((node.items || []).length || 1)) * 100}%`,
                    transition: "width 0.3s ease",
                  }}
                />
              </div>
            )}
            <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
              <input
                type="text"
                value={newCheckItem}
                onChange={(e) => setNewCheckItem(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newCheckItem.trim()) {
                    addChecklistItem(node.id, newCheckItem.trim());
                    setNewCheckItem("");
                  }
                }}
                placeholder="Neuer Eintrag..."
                style={{
                  flex: 1,
                  background:
                    t.mode === "dark"
                      ? "rgba(255,255,255,0.06)"
                      : "rgba(0,0,0,0.04)",
                  border: "none",
                  borderRadius: 6,
                  padding: "4px 8px",
                  color: "inherit",
                  fontSize: 12,
                  outline: "none",
                }}
              />
              <button
                onClick={() => {
                  if (newCheckItem.trim()) {
                    addChecklistItem(node.id, newCheckItem.trim());
                    setNewCheckItem("");
                  }
                }}
                style={{
                  background: `rgba(${rgb}, 0.2)`,
                  border: "none",
                  borderRadius: 6,
                  padding: "4px 8px",
                  cursor: "pointer",
                  color: node.color || t.accent,
                  fontSize: 12,
                }}
              >
                <Plus size={14} />
              </button>
            </div>
          </div>
        );

      case "image":
        return (
          <div
            className="node-interactive"
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              flexDirection: "column",
              gap: 6,
            }}
          >
            <input
              type="text"
              value={node.content}
              onChange={(e) => updateNode(node.id, { content: e.target.value })}
              placeholder="Bild-URL eingeben..."
              style={{
                width: "100%",
                background:
                  t.mode === "dark"
                    ? "rgba(255,255,255,0.06)"
                    : "rgba(0,0,0,0.04)",
                border: "none",
                borderRadius: 6,
                padding: "4px 8px",
                color: "inherit",
                fontSize: 11,
                outline: "none",
                flexShrink: 0,
              }}
            />
            {node.content ? (
              <img
                src={node.content}
                alt={node.title}
                style={{
                  flex: 1,
                  width: "100%",
                  objectFit: "contain",
                  borderRadius: 8,
                  minHeight: 0,
                }}
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            ) : (
              <div
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: 0.3,
                }}
              >
                <Image size={32} />
              </div>
            )}
          </div>
        );

      case "code":
        return (
          <div
            className="node-interactive"
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              flexDirection: "column",
              gap: 4,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <select
                value={node.codeLang || "javascript"}
                onChange={(e) =>
                  updateNode(node.id, { codeLang: e.target.value })
                }
                style={{
                  flex: 1,
                  background:
                    t.mode === "dark"
                      ? "rgba(255,255,255,0.08)"
                      : "rgba(0,0,0,0.04)",
                  border: "none",
                  borderRadius: 6,
                  padding: "3px 6px",
                  color: "inherit",
                  fontSize: 10,
                  outline: "none",
                  cursor: "pointer",
                }}
              >
                {[
                  "javascript",
                  "typescript",
                  "python",
                  "html",
                  "css",
                  "json",
                  "rust",
                  "go",
                  "java",
                  "c",
                  "cpp",
                  "sql",
                  "bash",
                  "markdown",
                  "yaml",
                ].map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
              <button
                onClick={() => {
                  navigator.clipboard?.writeText(node.content);
                }}
                title="Copy code"
                style={{
                  background: `rgba(${rgb},0.15)`,
                  border: "none",
                  borderRadius: 5,
                  padding: "3px 6px",
                  cursor: "pointer",
                  color: node.color || t.accent,
                  fontSize: 10,
                  display: "flex",
                  alignItems: "center",
                  gap: 3,
                }}
              >
                <Copy size={10} /> Copy
              </button>
            </div>
            <textarea
              value={node.content}
              onChange={(e) => updateNode(node.id, { content: e.target.value })}
              placeholder="// Code eingeben..."
              spellCheck={false}
              style={{
                flex: 1,
                width: "100%",
                resize: "none",
                background:
                  t.mode === "dark" ? "rgba(0,0,0,0.35)" : "rgba(0,0,0,0.03)",
                border: "none",
                outline: "none",
                borderRadius: 6,
                padding: 8,
                color: "inherit",
                fontFamily: "'Fira Code', 'Consolas', monospace",
                fontSize: 12,
                lineHeight: 1.5,
              }}
              onKeyDown={(e) => {
                if (e.key === "Tab") {
                  e.preventDefault();
                  const ta = e.target as HTMLTextAreaElement;
                  const s = ta.selectionStart,
                    end = ta.selectionEnd;
                  updateNode(node.id, {
                    content:
                      ta.value.substring(0, s) + "  " + ta.value.substring(end),
                  });
                  setTimeout(() => {
                    ta.selectionStart = ta.selectionEnd = s + 2;
                  }, 0);
                }
              }}
            />
          </div>
        );

      case "note": {
        const linkedNote = app.notes.find((n) => n.id === node.linkedNoteId);
        if (!linkedNote) {
          return (
            <div className="node-interactive p-3 flex flex-col gap-2 h-full justify-center">
              <span className="text-xs opacity-60">Notiz verknüpfen:</span>
              <select
                className="bg-white/10 text-xs p-1.5 rounded outline-none w-full"
                value=""
                onChange={(e) =>
                  updateNode(node.id, { linkedNoteId: e.target.value })
                }
              >
                <option value="">-- Auswählen --</option>
                {app.notes.map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.title || "Ohne Titel"}
                  </option>
                ))}
              </select>
            </div>
          );
        }
        return (
          <div className="node-interactive w-full h-full overflow-y-auto p-3 flex flex-col gap-2">
            <div
              className="font-bold text-sm border-b border-white/10 pb-1 mb-1 truncate flex justify-between items-center cursor-pointer hover:text-blue-400 transition-colors"
              onDoubleClick={() => app.setNote(linkedNote.id)}
            >
              <span>{linkedNote.title || "Ohne Titel"}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  updateNode(node.id, { linkedNoteId: undefined });
                }}
                className="opacity-50 hover:opacity-100"
                title="Verknüpfung aufheben"
              >
                <Unlink size={12} />
              </button>
            </div>
            <div
              className="text-xs flex-1 overflow-y-auto canvas-md"
              style={{ opacity: 0.85 }}
            >
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {linkedNote.content.slice(0, 500) +
                  (linkedNote.content.length > 500 ? "\n..." : "")}
              </ReactMarkdown>
            </div>
          </div>
        );
      }

      case "codefile": {
        const linkedCode = app.codes.find((c) => c.id === node.linkedCodeId);
        if (!linkedCode) {
          return (
            <div className="node-interactive p-3 flex flex-col gap-2 h-full justify-center">
              <span className="text-xs opacity-60">Code-Datei verknüpfen:</span>
              <select
                className="bg-white/10 text-xs p-1.5 rounded outline-none w-full"
                value=""
                onChange={(e) =>
                  updateNode(node.id, { linkedCodeId: e.target.value })
                }
              >
                <option value="">-- Auswählen --</option>
                {app.codes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name || "Ohne Titel"} ({c.lang})
                  </option>
                ))}
              </select>
            </div>
          );
        }
        return (
          <div className="node-interactive w-full h-full p-2 flex flex-col gap-2">
            <div className="font-bold text-xs border-b border-white/10 pb-1 mb-1 truncate flex justify-between items-center opacity-70">
              <span>
                {linkedCode.name || "Ohne Titel"} ({linkedCode.lang})
              </span>
              <button
                onClick={() => updateNode(node.id, { linkedCodeId: undefined })}
                className="hover:opacity-100"
              >
                <Unlink size={10} />
              </button>
            </div>
            <pre className="text-[10px] opacity-80 flex-1 overflow-auto bg-black/20 p-2 rounded m-0 font-mono">
              <code>
                {(linkedCode.content || "").slice(0, 800) +
                  ((linkedCode.content || "").length > 800 ? "\n..." : "")}
              </code>
            </pre>
          </div>
        );
      }

      case "task": {
        const linkedTask = app.tasks.find((t) => t.id === node.linkedTaskId);
        if (!linkedTask) {
          return (
            <div className="node-interactive p-3 flex flex-col gap-2 h-full justify-center">
              <span className="text-xs opacity-60">Task verknüpfen:</span>
              <select
                className="bg-white/10 text-xs p-1.5 rounded outline-none w-full"
                value=""
                onChange={(e) =>
                  updateNode(node.id, { linkedTaskId: e.target.value })
                }
              >
                <option value="">-- Auswählen --</option>
                {app.tasks.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title}
                  </option>
                ))}
              </select>
            </div>
          );
        }
        const isTaskDone = linkedTask.status === "done";
        return (
          <div className="node-interactive w-full h-full p-3 flex flex-col gap-2 overflow-y-auto">
            <div className="flex justify-between items-start gap-2 border-b border-white/10 pb-2">
              <div
                className="flex gap-2 items-center text-sm font-semibold w-full"
                style={{
                  textDecoration: isTaskDone ? "line-through" : "none",
                  opacity: isTaskDone ? 0.5 : 1,
                }}
              >
                <input
                  type="checkbox"
                  checked={isTaskDone}
                  onChange={(e) =>
                    app.updateTask(linkedTask.id, {
                      status: e.target.checked ? "done" : "todo",
                    })
                  }
                  style={{ accentColor: node.color || t.accent }}
                  className="shrink-0"
                />
                <span className="truncate flex-1">{linkedTask.title}</span>
              </div>
              <button
                onClick={() => updateNode(node.id, { linkedTaskId: undefined })}
                className="opacity-50 hover:opacity-100 shrink-0"
              >
                <Unlink size={12} />
              </button>
            </div>
            {linkedTask.desc && (
              <div className="text-xs opacity-70 mt-1 line-clamp-3">
                {linkedTask.desc}
              </div>
            )}
            {linkedTask.subtasks && linkedTask.subtasks.length > 0 && (
              <div className="mt-2 flex flex-col gap-1">
                {linkedTask.subtasks.map((st) => (
                  <div
                    key={st.id}
                    className="flex gap-1.5 items-center text-[11px] opacity-80"
                    style={{
                      textDecoration: st.done ? "line-through" : "none",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={st.done}
                      onChange={() => {
                        const newSt = (linkedTask.subtasks || []).map((x) =>
                          x.id === st.id ? { ...x, done: !x.done } : x,
                        );
                        app.updateTask(linkedTask.id, { subtasks: newSt });
                      }}
                      style={{ accentColor: node.color || t.accent }}
                      className="w-2.5 h-2.5 shrink-0"
                    />
                    <span className="truncate">{st.title}</span>
                  </div>
                ))}
              </div>
            )}
            {linkedTask.deadline && (
              <div className="text-[10px] opacity-50 mt-auto pt-2 border-t border-white/5">
                Fällig: {new Date(linkedTask.deadline).toLocaleDateString()}
              </div>
            )}
          </div>
        );
      }

      case "reminder": {
        const linkedReminder = app.reminders.find(
          (r) => r.id === node.linkedReminderId,
        );
        if (!linkedReminder) {
          return (
            <div className="node-interactive p-3 flex flex-col gap-2 h-full justify-center">
              <span className="text-xs opacity-60">Reminder verknüpfen:</span>
              <select
                className="bg-white/10 text-xs p-1.5 rounded outline-none w-full"
                value=""
                onChange={(e) =>
                  updateNode(node.id, { linkedReminderId: e.target.value })
                }
              >
                <option value="">-- Auswählen --</option>
                {app.reminders.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.title}
                  </option>
                ))}
              </select>
            </div>
          );
        }
        const isRemDone = linkedReminder.done;
        return (
          <div
            className="node-interactive w-full h-full p-3 flex flex-col gap-2 justify-center items-center text-center relative"
            style={{ opacity: isRemDone ? 0.5 : 1 }}
          >
            <button
              onClick={() =>
                updateNode(node.id, { linkedReminderId: undefined })
              }
              className="absolute top-2 right-2 opacity-50 hover:opacity-100 z-10"
            >
              <Unlink size={12} />
            </button>
            <Bell
              size={24}
              style={{
                color: node.color || t.accent,
                opacity: isRemDone ? 0.3 : 1,
              }}
              className={
                !isRemDone && new Date(linkedReminder.datetime) < new Date()
                  ? "nx-glow-pulse"
                  : ""
              }
            />
            <div
              className="font-semibold text-sm mt-1"
              style={{ textDecoration: isRemDone ? "line-through" : "none" }}
            >
              {linkedReminder.title}
            </div>
            {linkedReminder.msg && (
              <div className="text-xs opacity-70 line-clamp-2">
                {linkedReminder.msg}
              </div>
            )}
            {linkedReminder.datetime && (
              <div className="text-[10px] opacity-60 mt-auto bg-black/20 px-2 py-1 rounded w-full">
                {new Date(linkedReminder.datetime).toLocaleString()}
              </div>
            )}
            <div className="mt-2 text-[10px]">
              <label className="flex items-center gap-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isRemDone}
                  onChange={(e) =>
                    app.updateReminder(linkedReminder.id, {
                      done: e.target.checked,
                    })
                  }
                  style={{ accentColor: node.color || t.accent }}
                />
                Erledigt
              </label>
            </div>
          </div>
        );
      }

      case "project": {
        const progress = Math.max(0, Math.min(100, Number(node.progress ?? 0)));
        const status = node.status || "doing";
        const pColor = priorityColor(node.priority || "mid");
        const sColor = statusColor(status);
        return (
          <div
            className="node-interactive"
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
              <span
                style={{
                  fontSize: 9,
                  padding: "2px 7px",
                  borderRadius: 999,
                  background: `${sColor}22`,
                  border: `1px solid ${sColor}50`,
                  color: sColor,
                  fontWeight: 700,
                }}
              >
                {status.toUpperCase()}
              </span>
              <span
                style={{
                  fontSize: 9,
                  padding: "2px 7px",
                  borderRadius: 999,
                  background: `${pColor}22`,
                  border: `1px solid ${pColor}50`,
                  color: pColor,
                  fontWeight: 700,
                }}
              >
                {(node.priority || "mid").toUpperCase()}
              </span>
              {node.owner && (
                <span
                  style={{
                    fontSize: 9,
                    padding: "2px 7px",
                    borderRadius: 999,
                    background: "rgba(255,255,255,0.12)",
                    border: "1px solid rgba(255,255,255,0.16)",
                    opacity: 0.75,
                  }}
                >
                  {node.owner}
                </span>
              )}
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 6,
              }}
            >
              <select
                value={status}
                onChange={(e) =>
                  updateNode(node.id, { status: e.target.value as any })
                }
                style={fieldStyle}
              >
                <option value="todo">Todo</option>
                <option value="doing">Doing</option>
                <option value="blocked">Blocked</option>
                <option value="done">Done</option>
              </select>
              <input
                type="date"
                value={node.dueDate ? node.dueDate.slice(0, 10) : ""}
                onChange={(e) =>
                  updateNode(node.id, { dueDate: e.target.value })
                }
                style={fieldStyle}
              />
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 6,
              }}
            >
              <input
                type="text"
                value={node.owner || ""}
                placeholder="Owner"
                onChange={(e) => updateNode(node.id, { owner: e.target.value })}
                style={fieldStyle}
              />
              <select
                value={node.priority || "mid"}
                onChange={(e) =>
                  updateNode(node.id, { priority: e.target.value as any })
                }
                style={fieldStyle}
              >
                <option value="low">Low</option>
                <option value="mid">Mid</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
            <input
              type="text"
              value={(node.tags || []).join(", ")}
              placeholder="Tags (comma separated)"
              onChange={(e) => {
                const tags = e.target.value
                  .split(",")
                  .map((x) => x.trim())
                  .filter(Boolean)
                  .slice(0, 6);
                updateNode(node.id, { tags });
              }}
              style={fieldStyle}
            />
            <div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 10,
                  opacity: 0.72,
                  marginBottom: 3,
                }}
              >
                <span>Progress</span>
                <span>{progress}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={progress}
                onChange={(e) =>
                  updateNode(node.id, { progress: Number(e.target.value) })
                }
                style={{ width: "100%" }}
              />
            </div>
            <textarea
              value={node.content}
              placeholder="Projektziele, Scope, KPI..."
              onChange={(e) => updateNode(node.id, { content: e.target.value })}
              style={{
                flex: 1,
                width: "100%",
                resize: "none",
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 8,
                padding: 8,
                color: "inherit",
                fontSize: 11,
                lineHeight: 1.5,
                outline: "none",
              }}
            />
          </div>
        );
      }

      case "goal": {
        const progress = Math.max(0, Math.min(100, Number(node.progress ?? 0)));
        const pColor = priorityColor(node.priority || "mid");
        return (
          <div
            className="node-interactive"
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
              <span
                style={{
                  fontSize: 9,
                  padding: "2px 7px",
                  borderRadius: 999,
                  background: `${pColor}22`,
                  border: `1px solid ${pColor}50`,
                  color: pColor,
                  fontWeight: 700,
                }}
              >
                PRIORITY {(node.priority || "mid").toUpperCase()}
              </span>
              {node.dueDate && (
                <span
                  style={{
                    fontSize: 9,
                    padding: "2px 7px",
                    borderRadius: 999,
                    background: "rgba(255,255,255,0.12)",
                    border: "1px solid rgba(255,255,255,0.18)",
                    opacity: 0.8,
                  }}
                >
                  Due {new Date(node.dueDate).toLocaleDateString()}
                </span>
              )}
            </div>
            <textarea
              value={node.content}
              placeholder="Warum ist dieses Ziel wichtig?"
              onChange={(e) => updateNode(node.id, { content: e.target.value })}
              style={{
                flex: 1,
                width: "100%",
                resize: "none",
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 8,
                padding: 8,
                color: "inherit",
                fontSize: 11,
                lineHeight: 1.5,
                outline: "none",
              }}
            />
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr auto",
                gap: 6,
                alignItems: "center",
              }}
            >
              <input
                type="range"
                min={0}
                max={100}
                value={progress}
                onChange={(e) =>
                  updateNode(node.id, { progress: Number(e.target.value) })
                }
                style={{ width: "100%" }}
              />
              <span
                style={{ fontSize: 11, fontWeight: 700, color: nodeAccent }}
              >
                {progress}%
              </span>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 6,
              }}
            >
              <select
                value={node.priority || "mid"}
                onChange={(e) =>
                  updateNode(node.id, { priority: e.target.value as any })
                }
                style={fieldStyle}
              >
                <option value="low">Low</option>
                <option value="mid">Mid</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
              <input
                type="date"
                value={node.dueDate ? node.dueDate.slice(0, 10) : ""}
                onChange={(e) =>
                  updateNode(node.id, { dueDate: e.target.value })
                }
                style={fieldStyle}
              />
            </div>
          </div>
        );
      }

      case "milestone": {
        const status = node.status || "todo";
        const sColor = statusColor(status);
        const progress = Math.max(0, Math.min(100, Number(node.progress ?? 0)));
        return (
          <div
            className="node-interactive"
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              flexDirection: "column",
              gap: 7,
            }}
          >
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
              <span
                style={{
                  fontSize: 9,
                  padding: "2px 7px",
                  borderRadius: 999,
                  background: `${sColor}22`,
                  border: `1px solid ${sColor}50`,
                  color: sColor,
                  fontWeight: 700,
                }}
              >
                {status.toUpperCase()}
              </span>
              <span
                style={{
                  fontSize: 9,
                  padding: "2px 7px",
                  borderRadius: 999,
                  background: "rgba(255,255,255,0.1)",
                  border: "1px solid rgba(255,255,255,0.15)",
                }}
              >
                {progress}%
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Flag size={12} style={{ color: nodeAccent }} />
              <select
                value={node.status || "todo"}
                onChange={(e) =>
                  updateNode(node.id, { status: e.target.value as any })
                }
                style={{ ...fieldStyle, flex: 1 }}
              >
                <option value="todo">Geplant</option>
                <option value="doing">In Arbeit</option>
                <option value="blocked">Blockiert</option>
                <option value="done">Abgeschlossen</option>
              </select>
            </div>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <Calendar size={12} style={{ opacity: 0.6 }} />
              <input
                type="date"
                value={node.dueDate ? node.dueDate.slice(0, 10) : ""}
                onChange={(e) =>
                  updateNode(node.id, { dueDate: e.target.value })
                }
                style={{ ...fieldStyle, flex: 1 }}
              />
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr auto",
                gap: 6,
                alignItems: "center",
              }}
            >
              <input
                type="range"
                min={0}
                max={100}
                value={progress}
                onChange={(e) =>
                  updateNode(node.id, { progress: Number(e.target.value) })
                }
                style={{ width: "100%" }}
              />
              <span
                style={{ fontSize: 11, fontWeight: 700, color: nodeAccent }}
              >
                {progress}%
              </span>
            </div>
            <textarea
              value={node.content}
              placeholder="Done-Kriterien, Deliverables, Abhängigkeiten"
              onChange={(e) => updateNode(node.id, { content: e.target.value })}
              style={{
                flex: 1,
                width: "100%",
                resize: "none",
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 8,
                padding: 8,
                color: "inherit",
                fontSize: 11,
                lineHeight: 1.5,
                outline: "none",
              }}
            />
          </div>
        );
      }

      case "decision": {
        const sColor = statusColor(node.status || "todo");
        const pColor = priorityColor(node.priority || "mid");
        return (
          <div
            className="node-interactive"
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              flexDirection: "column",
              gap: 7,
            }}
          >
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
              <span
                style={{
                  fontSize: 9,
                  padding: "2px 7px",
                  borderRadius: 999,
                  background: `${sColor}22`,
                  border: `1px solid ${sColor}50`,
                  color: sColor,
                  fontWeight: 700,
                }}
              >
                {(node.status || "todo").toUpperCase()}
              </span>
              <span
                style={{
                  fontSize: 9,
                  padding: "2px 7px",
                  borderRadius: 999,
                  background: `${pColor}22`,
                  border: `1px solid ${pColor}50`,
                  color: pColor,
                  fontWeight: 700,
                }}
              >
                {(node.priority || "mid").toUpperCase()}
              </span>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 6,
              }}
            >
              <select
                value={node.status || "todo"}
                onChange={(e) =>
                  updateNode(node.id, { status: e.target.value as any })
                }
                style={fieldStyle}
              >
                <option value="todo">Offen</option>
                <option value="doing">In Review</option>
                <option value="done">Entschieden</option>
              </select>
              <select
                value={node.priority || "mid"}
                onChange={(e) =>
                  updateNode(node.id, { priority: e.target.value as any })
                }
                style={fieldStyle}
              >
                <option value="low">Low Impact</option>
                <option value="mid">Mid Impact</option>
                <option value="high">High Impact</option>
                <option value="critical">Critical</option>
              </select>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 6,
              }}
            >
              <input
                type="text"
                value={node.owner || ""}
                placeholder="Decision Owner"
                onChange={(e) => updateNode(node.id, { owner: e.target.value })}
                style={fieldStyle}
              />
              <input
                type="date"
                value={node.dueDate ? node.dueDate.slice(0, 10) : ""}
                onChange={(e) =>
                  updateNode(node.id, { dueDate: e.target.value })
                }
                style={fieldStyle}
              />
            </div>
            <textarea
              value={node.content}
              placeholder={
                "Option A:\nOption B:\nKriterien:\n- ...\nEntscheidung:"
              }
              onChange={(e) => updateNode(node.id, { content: e.target.value })}
              style={{
                flex: 1,
                width: "100%",
                resize: "none",
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 8,
                padding: 8,
                color: "inherit",
                fontSize: 11,
                lineHeight: 1.5,
                outline: "none",
              }}
            />
          </div>
        );
      }

      case "risk": {
        const pColor = priorityColor(node.priority || "high");
        const sColor = statusColor(node.status || "blocked");
        const probability = Math.max(
          0,
          Math.min(100, Number(node.progress ?? 45)),
        );
        const impact = Math.max(1, Math.min(10, Number(node.effort ?? 7)));
        return (
          <div
            className="node-interactive"
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              flexDirection: "column",
              gap: 7,
            }}
          >
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
              <span
                style={{
                  fontSize: 9,
                  padding: "2px 7px",
                  borderRadius: 999,
                  background: `${pColor}22`,
                  border: `1px solid ${pColor}50`,
                  color: pColor,
                  fontWeight: 700,
                }}
              >
                {String(node.priority || "high").toUpperCase()}
              </span>
              <span
                style={{
                  fontSize: 9,
                  padding: "2px 7px",
                  borderRadius: 999,
                  background: `${sColor}22`,
                  border: `1px solid ${sColor}50`,
                  color: sColor,
                  fontWeight: 700,
                }}
              >
                {String(node.status || "blocked").toUpperCase()}
              </span>
              <span
                style={{
                  fontSize: 9,
                  padding: "2px 7px",
                  borderRadius: 999,
                  background: "rgba(255,69,58,0.15)",
                  border: "1px solid rgba(255,69,58,0.35)",
                  color: "#FF453A",
                  fontWeight: 700,
                }}
              >
                Risk Score {Math.round((probability / 10) * impact)}
              </span>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 6,
              }}
            >
              <select
                value={node.priority || "high"}
                onChange={(e) =>
                  updateNode(node.id, { priority: e.target.value as any })
                }
                style={fieldStyle}
              >
                <option value="low">Niedrig</option>
                <option value="mid">Mittel</option>
                <option value="high">Hoch</option>
                <option value="critical">Kritisch</option>
              </select>
              <select
                value={node.status || "blocked"}
                onChange={(e) =>
                  updateNode(node.id, { status: e.target.value as any })
                }
                style={fieldStyle}
              >
                <option value="todo">Beobachten</option>
                <option value="doing">In Bearbeitung</option>
                <option value="blocked">Aktiv</option>
                <option value="done">Mitigiert</option>
              </select>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr auto",
                gap: 6,
                alignItems: "center",
              }}
            >
              <input
                type="range"
                min={0}
                max={100}
                value={probability}
                onChange={(e) =>
                  updateNode(node.id, { progress: Number(e.target.value) })
                }
                style={{ width: "100%" }}
              />
              <span style={{ fontSize: 10, opacity: 0.75 }}>
                Prob {probability}%
              </span>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr auto",
                gap: 6,
                alignItems: "center",
              }}
            >
              <input
                type="range"
                min={1}
                max={10}
                value={impact}
                onChange={(e) =>
                  updateNode(node.id, { effort: Number(e.target.value) })
                }
                style={{ width: "100%" }}
              />
              <span style={{ fontSize: 10, opacity: 0.75 }}>
                Impact {impact}/10
              </span>
            </div>
            <textarea
              value={node.content}
              placeholder={
                "Risiko:\nImpact:\nWahrscheinlichkeit:\nMitigation / Fallback:"
              }
              onChange={(e) => updateNode(node.id, { content: e.target.value })}
              style={{
                flex: 1,
                width: "100%",
                resize: "none",
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 8,
                padding: 8,
                color: "inherit",
                fontSize: 11,
                lineHeight: 1.5,
                outline: "none",
              }}
            />
          </div>
        );
      }

      default:
        return null;
    }
  };

  const TypeIcon = WIDGET_TYPES.find((w) => w.type === node.type)?.icon || Type;

  return (
    <div
      className="nx-canvas-node"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: "absolute",
        left: node.x,
        top: node.y,
        width: node.width,
        height: node.height,
        zIndex: isSelected ? 100 : 1,
        animation:
          "nexus-scale-in 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) both",
        willChange: "transform, left, top, width, height",
        backfaceVisibility: "hidden",
        transform: isSelected
          ? "translateZ(0) scale(1.01)"
          : hovered
            ? "translateZ(0) scale(1.004)"
            : "translateZ(0)",
        transition:
          dragging || resizing
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
          cursor: dragging ? "grabbing" : "grab",
          userSelect: dragging ? "none" : "auto",
          background: isSticky ? stickyBg : undefined,
          boxShadow: isSelected
            ? `0 0 0 2px ${nodeAccent}, 0 8px 32px rgba(0,0,0,0.3), 0 0 20px ${nodeAccent}30`
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
            <TypeIcon size={13} style={{ color: nodeAccent, flexShrink: 0 }} />

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
            {renderContent()}
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
  const [h, setH] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
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
        background: h ? "rgba(255,255,255,0.08)" : "transparent",
        color: danger ? "#FF3B30" : "inherit",
      }}
    >
      <Icon size={13} />
      {label}
    </button>
  );
}

// ─── MINIMAP ───

function MiniMap({
  nodes,
  viewport,
  canvasW,
  canvasH,
}: {
  nodes: CanvasNode[];
  viewport: { panX: number; panY: number; zoom: number };
  canvasW: number;
  canvasH: number;
}) {
  const t = useTheme();
  const MAP_W = 160;
  const MAP_H = 110;
  const PADDING = 40;

  if (nodes.length === 0) return null;

  const minX = Math.min(...nodes.map((n) => n.x)) - PADDING;
  const maxX = Math.max(...nodes.map((n) => n.x + n.width)) + PADDING;
  const minY = Math.min(...nodes.map((n) => n.y)) - PADDING;
  const maxY = Math.max(...nodes.map((n) => n.y + n.height)) + PADDING;

  const rangeX = Math.max(maxX - minX, 100);
  const rangeY = Math.max(maxY - minY, 100);
  const scale = Math.min(MAP_W / rangeX, MAP_H / rangeY) * 0.85;

  const toMapX = (x: number) =>
    (x - minX) * scale + (MAP_W - rangeX * scale) / 2;
  const toMapY = (y: number) =>
    (y - minY) * scale + (MAP_H - rangeY * scale) / 2;

  // Viewport rect
  const vpLeft =
    (-viewport.panX / viewport.zoom - minX) * scale +
    (MAP_W - rangeX * scale) / 2;
  const vpTop =
    (-viewport.panY / viewport.zoom - minY) * scale +
    (MAP_H - rangeY * scale) / 2;
  const vpW = (canvasW / viewport.zoom) * scale;
  const vpH = (canvasH / viewport.zoom) * scale;

  return (
    <div
      style={{
        position: "absolute",
        bottom: 16,
        right: 16,
        zIndex: 50,
        width: MAP_W,
        height: MAP_H,
        borderRadius: 10,
        background:
          t.mode === "dark" ? "rgba(10,10,20,0.8)" : "rgba(240,240,255,0.85)",
        backdropFilter: "blur(12px)",
        border: `1px solid ${t.mode === "dark" ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}`,
        overflow: "hidden",
        boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
      }}
    >
      <svg width={MAP_W} height={MAP_H}>
        {nodes.map((node) => (
          <rect
            key={node.id}
            x={toMapX(node.x)}
            y={toMapY(node.y)}
            width={Math.max(node.width * scale, 4)}
            height={Math.max(node.height * scale, 3)}
            rx={2}
            fill={node.color || t.accent}
            opacity={0.7}
          />
        ))}
        {/* Viewport indicator */}
        <rect
          x={vpLeft}
          y={vpTop}
          width={Math.min(vpW, MAP_W)}
          height={Math.min(vpH, MAP_H)}
          fill="none"
          stroke={t.accent}
          strokeWidth={1}
          opacity={0.8}
          rx={2}
        />
      </svg>
      <div
        style={{
          position: "absolute",
          bottom: 3,
          right: 5,
          fontSize: 9,
          opacity: 0.4,
          fontFamily: "monospace",
          letterSpacing: 0.5,
        }}
      >
        MINIMAP
      </div>
    </div>
  );
}

// ─── TOOLBAR BUTTON ───

function ToolBtn({
  icon: Icon,
  tooltip,
  onClick,
  accent,
  rgb,
  active,
}: {
  icon: any;
  tooltip: string;
  onClick: () => void;
  accent: string;
  rgb: string;
  active?: boolean;
}) {
  const [h, setH] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
      title={tooltip}
      style={{
        background: h || active ? `rgba(${rgb}, 0.18)` : "transparent",
        border: active
          ? `1px solid rgba(${rgb}, 0.3)`
          : "1px solid transparent",
        borderRadius: 7,
        width: 30,
        height: 30,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        color: h || active ? accent : "inherit",
        transition: "all 0.15s",
        opacity: h || active ? 1 : 0.65,
      }}
    >
      <Icon size={14} />
    </button>
  );
}

// ─── MAIN CANVAS VIEW ───

export function CanvasView() {
  const t = useTheme();
  const rgb = hexToRgb(t.accent);
  const {
    canvases,
    activeCanvasId,
    viewport,
    addCanvas,
    deleteCanvas,
    setActiveCanvas,
    renameCanvas,
    addNode,
    deleteConnection,
    setPan,
    setZoom,
    resetViewport,
    addConnection,
    getActiveCanvas,
  } = useCanvas();

  const canvas = getActiveCanvas();
  const canvasRef = useRef<HTMLDivElement>(null);

  const [panning, setPanning] = useState(false);
  const [spaceHeld, setSpaceHeld] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [connectingFrom, setConnectingFrom] = useState<string | null>(null);
  const [editCanvasName, setEditCanvasName] = useState(false);
  const [showCanvasList, setShowCanvasList] = useState(true);
  const [gridMode, setGridMode] = useState<"dots" | "lines" | "none">("dots");
  const [showMiniMap, setShowMiniMap] = useState(true);
  const [canvasSize, setCanvasSize] = useState({ w: 800, h: 600 });
  const [quickAddPos, setQuickAddPos] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [showWidgetMenu, setShowWidgetMenu] = useState(false);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [showMagicBuilder, setShowMagicBuilder] = useState(false);
  const [layoutMode, setLayoutMode] = useState<
    "mindmap" | "timeline" | "board"
  >("mindmap");
  const [wheelPanning, setWheelPanning] = useState(false);

  const panStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const wheelPanRaf = useRef<number>(0);
  const wheelPanDelta = useRef({ x: 0, y: 0 });
  const wheelPanReleaseTimeout = useRef<number>(0);

  const visibleBounds = useMemo(() => {
    const zoom = Math.max(0.0001, viewport.zoom);
    const worldLeft = -viewport.panX / zoom;
    const worldTop = -viewport.panY / zoom;
    const worldRight = worldLeft + canvasSize.w / zoom;
    const worldBottom = worldTop + canvasSize.h / zoom;
    return {
      left: worldLeft - CANVAS_NODE_OVERSCAN_PX,
      top: worldTop - CANVAS_NODE_OVERSCAN_PX,
      right: worldRight + CANVAS_NODE_OVERSCAN_PX,
      bottom: worldBottom + CANVAS_NODE_OVERSCAN_PX,
    };
  }, [viewport.panX, viewport.panY, viewport.zoom, canvasSize.w, canvasSize.h]);

  const visibleNodes = useMemo(() => {
    if (!canvas) return [] as CanvasNode[];
    return canvas.nodes.filter((node) => {
      const right = node.x + node.width;
      const bottom = node.y + node.height;
      return !(
        right < visibleBounds.left ||
        node.x > visibleBounds.right ||
        bottom < visibleBounds.top ||
        node.y > visibleBounds.bottom
      );
    });
  }, [canvas, visibleBounds]);

  const visibleNodeIds = useMemo(
    () => new Set(visibleNodes.map((node) => node.id)),
    [visibleNodes],
  );

  const visibleConnections = useMemo(() => {
    if (!canvas) return [] as CanvasConnection[];
    return canvas.connections.filter(
      (conn) => visibleNodeIds.has(conn.fromId) && visibleNodeIds.has(conn.toId),
    );
  }, [canvas, visibleNodeIds]);

  // Track canvas size
  useEffect(() => {
    if (!canvasRef.current) return;
    const obs = new ResizeObserver((entries) => {
      for (const e of entries) {
        setCanvasSize({ w: e.contentRect.width, h: e.contentRect.height });
      }
    });
    obs.observe(canvasRef.current);
    return () => obs.disconnect();
  }, []);

  // Keyboard
  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      const targetTag = (e.target as HTMLElement).tagName;
      const isEditing =
        targetTag === "INPUT" ||
        targetTag === "TEXTAREA" ||
        (e.target as HTMLElement).isContentEditable;
      if (e.code === "Space" && !isEditing) {
        e.preventDefault();
        setSpaceHeld(true);
      }
      if (e.key === "Delete" && selectedNodeId && !isEditing) {
        useCanvas.getState().deleteNode(selectedNodeId);
        setSelectedNodeId(null);
      }
      if (e.key === "Escape") {
        setConnectingFrom(null);
        setSelectedNodeId(null);
        setShowWidgetMenu(false);
        setQuickAddPos(null);
        setShowMagicBuilder(false);
      }
      // Undo / Redo
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !isEditing) {
        e.preventDefault();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "y" && !isEditing) {
        e.preventDefault();
      }
      // Center view
      if ((e.ctrlKey || e.metaKey) && e.key === "0") {
        resetViewport();
      }
      if (
        (e.ctrlKey || e.metaKey) &&
        e.key.toLowerCase() === "m" &&
        !isEditing
      ) {
        e.preventDefault();
        setShowMagicBuilder(true);
      }
    };
    const onUp = (e: KeyboardEvent) => {
      if (e.code === "Space") setSpaceHeld(false);
    };
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
    };
  }, [selectedNodeId, resetViewport]);

  // Pan
  const handleCanvasMouseDown = useCallback(
    (e: React.MouseEvent) => {
      setQuickAddPos(null);
      setShowWidgetMenu(false);
      if (e.button === 1 || (e.button === 0 && spaceHeld)) {
        e.preventDefault();
        setPanning(true);
        panStart.current = {
          x: e.clientX,
          y: e.clientY,
          panX: viewport.panX,
          panY: viewport.panY,
        };
      } else if (
        e.button === 0 &&
        (e.target === e.currentTarget ||
          (e.target as HTMLElement).id === "nexus-canvas-inner")
      ) {
        setSelectedNodeId(null);
        setConnectingFrom(null);
      }
    },
    [spaceHeld, viewport.panX, viewport.panY],
  );

  useEffect(() => {
    if (!panning) return;
    let raf = 0;
    let pending: { x: number; y: number } | null = null;

    const flush = () => {
      raf = 0;
      if (!pending) return;
      setPan(pending.x, pending.y);
      pending = null;
    };

    const onMove = (e: MouseEvent) => {
      pending = {
        x: panStart.current.panX + e.clientX - panStart.current.x,
        y: panStart.current.panY + e.clientY - panStart.current.y,
      };
      if (!raf) raf = requestAnimationFrame(flush);
    };

    const onUp = () => {
      if (raf) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
      if (pending) {
        setPan(pending.x, pending.y);
        pending = null;
      }
      setPanning(false);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [panning, setPan]);

  const applyZoomAtPoint = useCallback(
    (clientX: number, clientY: number, scaleFactor: number) => {
      const el = canvasRef.current;
      if (!el) return;
      const vp = useCanvas.getState().viewport;
      const rect = el.getBoundingClientRect();
      const localX = clientX - rect.left;
      const localY = clientY - rect.top;
      const nextZoom = Math.max(0.15, Math.min(3, vp.zoom * scaleFactor));
      if (Math.abs(nextZoom - vp.zoom) < 0.0001) return;
      const worldX = (localX - vp.panX) / vp.zoom;
      const worldY = (localY - vp.panY) / vp.zoom;
      const nextPanX = localX - worldX * nextZoom;
      const nextPanY = localY - worldY * nextZoom;
      useCanvas.setState({
        viewport: {
          ...vp,
          zoom: nextZoom,
          panX: nextPanX,
          panY: nextPanY,
        },
      });
    },
    [],
  );

  const setZoomCentered = useCallback(
    (nextZoom: number) => {
      const el = canvasRef.current;
      const vp = useCanvas.getState().viewport;
      const clamped = Math.max(0.15, Math.min(3, nextZoom));
      if (!el) {
        setZoom(clamped);
        return;
      }
      const rect = el.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const factor = clamped / Math.max(0.0001, vp.zoom);
      applyZoomAtPoint(centerX, centerY, factor);
    },
    [applyZoomAtPoint, setZoom],
  );

  // Trackpad-friendly wheel: pan by default, zoom only with pinch/Ctrl.
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const deltaScale =
        e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? canvasSize.h : 1;
      const rawDx = e.deltaX * deltaScale;
      const rawDy = e.deltaY * deltaScale;
      const dx = Math.max(-240, Math.min(240, rawDx));
      const dy = Math.max(-240, Math.min(240, rawDy));
      if (Math.abs(dx) < 0.001 && Math.abs(dy) < 0.001) return;

      if (e.ctrlKey || e.metaKey) {
        const isTrackpadPinch = e.deltaMode === 0 && Math.abs(rawDy) < 24;
        const factor = Math.exp(-dy * (isTrackpadPinch ? 0.0021 : 0.00135));
        applyZoomAtPoint(e.clientX, e.clientY, factor);
        return;
      }

      wheelPanDelta.current.x -= dx;
      wheelPanDelta.current.y -= dy;
      setWheelPanning(true);
      if (!wheelPanRaf.current) {
        wheelPanRaf.current = requestAnimationFrame(() => {
          wheelPanRaf.current = 0;
          const vp = useCanvas.getState().viewport;
          const delta = wheelPanDelta.current;
          wheelPanDelta.current = { x: 0, y: 0 };
          if (delta.x || delta.y) {
            useCanvas.setState({
              viewport: {
                ...vp,
                panX: vp.panX + delta.x,
                panY: vp.panY + delta.y,
              },
            });
          }
        });
      }

      if (wheelPanReleaseTimeout.current) {
        window.clearTimeout(wheelPanReleaseTimeout.current);
      }
      wheelPanReleaseTimeout.current = window.setTimeout(() => {
        setWheelPanning(false);
      }, 110);
    },
    [applyZoomAtPoint, canvasSize.h],
  );

  useEffect(
    () => () => {
      if (wheelPanRaf.current) {
        cancelAnimationFrame(wheelPanRaf.current);
      }
      if (wheelPanReleaseTimeout.current) {
        window.clearTimeout(wheelPanReleaseTimeout.current);
      }
    },
    [],
  );

  const handleStartConnect = useCallback(
    (nodeId: string) => setConnectingFrom(nodeId),
    [],
  );
  const handleEndConnect = useCallback(
    (nodeId: string) => {
      if (connectingFrom && connectingFrom !== nodeId)
        addConnection(connectingFrom, nodeId);
      setConnectingFrom(null);
    },
    [connectingFrom, addConnection],
  );

  // Fit view to all nodes
  const fitView = useCallback(() => {
    if (!canvas || canvas.nodes.length === 0) {
      resetViewport();
      return;
    }
    const cW = canvasSize.w,
      cH = canvasSize.h;
    const minX = Math.min(...canvas.nodes.map((n) => n.x));
    const maxX = Math.max(...canvas.nodes.map((n) => n.x + n.width));
    const minY = Math.min(...canvas.nodes.map((n) => n.y));
    const maxY = Math.max(...canvas.nodes.map((n) => n.y + n.height));
    const pad = 60;
    const z = Math.min(
      (cW - pad * 2) / (maxX - minX),
      (cH - pad * 2) / (maxY - minY),
      1.5,
    );
    const cx = (minX + maxX) / 2,
      cy = (minY + maxY) / 2;
    setZoom(z);
    setPan(cW / 2 - cx * z, cH / 2 - cy * z);
  }, [canvas, canvasSize, resetViewport, setZoom, setPan]);

  const addWidgetNode = useCallback(
    (type: NodeType | "sticky", x?: number, y?: number) => {
      if (type === "sticky") {
        const state = useCanvas.getState();
        state.addNode("text", x, y);
        const c = state.getActiveCanvas();
        const last = c?.nodes[c.nodes.length - 1];
        if (last)
          state.updateNode(last.id, { color: "#FFCC00", title: "Sticky Note" });
        return;
      }
      addNode(type as NodeType, x, y);
    },
    [addNode],
  );

  const spawnNode = useCallback(
    (
      type: NodeType,
      opts: {
        x: number;
        y: number;
        title?: string;
        patch?: Partial<CanvasNode>;
      },
    ) => {
      const state = useCanvas.getState();
      state.addNode(type, opts.x, opts.y);
      const active = state.getActiveCanvas();
      const created = active?.nodes[active.nodes.length - 1];
      if (!created) return null;
      const patch: Partial<CanvasNode> = { ...(opts.patch || {}) };
      if (opts.title) patch.title = opts.title;
      if (Object.keys(patch).length) state.updateNode(created.id, patch);
      return created.id;
    },
    [],
  );

  const connectNodes = useCallback(
    (links: Array<[string | null, string | null]>) => {
      const state = useCanvas.getState();
      links.forEach(([from, to]) => {
        if (from && to) state.addConnection(from, to);
      });
    },
    [],
  );

  const createMagicTemplate = useCallback(
    (payload: MagicTemplatePayload) => {
      const centerX = (-viewport.panX + canvasSize.w * 0.5) / viewport.zoom;
      const centerY = (-viewport.panY + canvasSize.h * 0.45) / viewport.zoom;
      const day = (offset: number) => {
        const d = new Date();
        d.setDate(d.getDate() + offset);
        return d.toISOString().slice(0, 10);
      };

      const mk = (
        type: NodeType,
        dx: number,
        dy: number,
        title?: string,
        patch?: Partial<CanvasNode>,
      ) => spawnNode(type, { x: centerX + dx, y: centerY + dy, title, patch });

      const state = useCanvas.getState();
      let rootId: string | null = null;

      if (payload.template === "ai-project") {
        const prompt = (payload.aiPrompt || "").trim();
        const depth = payload.aiDepth || "balanced";
        const maxGoals = depth === "light" ? 3 : depth === "deep" ? 6 : 4;
        const maxMilestones = depth === "light" ? 3 : depth === "deep" ? 6 : 4;
        const maxRisks = depth === "light" ? 2 : depth === "deep" ? 5 : 3;

        const tokens = prompt
          .toLowerCase()
          .replace(/[^a-z0-9äöüß\s-]/gi, " ")
          .split(/\s+/)
          .filter((w) => w.length > 3);
        const stopWords = new Set([
          "with",
          "that",
          "this",
          "from",
          "into",
          "über",
          "oder",
          "aber",
          "project",
          "produkt",
          "projekt",
          "platform",
          "feature",
          "features",
          "system",
          "tool",
        ]);
        const freq = new globalThis.Map<string, number>();
        tokens.forEach((w) => {
          if (stopWords.has(w)) return;
          freq.set(w, (freq.get(w) || 0) + 1);
        });
        const keywords = [...freq.entries()]
          .sort((a, b) => b[1] - a[1])
          .slice(0, 8)
          .map(([w]) => w);

        const goalTitles =
          keywords.length > 0
            ? keywords.slice(0, maxGoals).map((w) => `Goal: ${w}`)
            : ["Goal: Product Value", "Goal: Delivery", "Goal: Quality"];
        const milestoneTitles = [
          "Milestone: Discovery",
          "Milestone: Architecture",
          "Milestone: Build",
          "Milestone: QA",
          "Milestone: Beta",
          "Milestone: Launch",
        ].slice(0, maxMilestones);
        const riskTitles = [
          "Risk: Scope Drift",
          "Risk: Integration Delay",
          "Risk: Performance Regression",
          "Risk: UX Adoption",
          "Risk: Quality Gap",
        ].slice(0, maxRisks);

        rootId = mk("project", 0, 0, payload.title, {
          color: "#5E5CE6",
          status: "doing",
          priority: "high",
          progress: 8,
          content: prompt
            ? `AI Prompt:\n${prompt}\n\nAuto-generated map with ${depth} depth.`
            : "AI-generated project map.",
        });

        const goalIds = goalTitles.map((title, idx) =>
          mk("goal", -420 + idx * 210, -220, title, {
            color: "#30D158",
            status: "todo",
            progress: 5 + idx * 6,
            dueDate: day(14 + idx * 7),
          }),
        );
        const milestoneIds = milestoneTitles.map((title, idx) =>
          mk("milestone", -460 + idx * 185, 40, title, {
            color: "#FF9F0A",
            status: idx === 0 ? "doing" : "todo",
            dueDate: day(5 + idx * 6),
            progress: idx === 0 ? 20 : 0,
          }),
        );
        const riskIds = riskTitles.map((title, idx) =>
          mk("risk", -300 + idx * 230, 300, title, {
            color: "#FF453A",
            priority: idx === 0 ? "critical" : "high",
            status: idx === 0 ? "blocked" : "todo",
          }),
        );

        goalIds.forEach((goal) => connectNodes([[rootId, goal]]));
        milestoneIds.forEach((ms) => connectNodes([[rootId, ms]]));
        riskIds.forEach((risk) => connectNodes([[rootId, risk]]));

        if (payload.includeNotes) {
          const context = mk("markdown", 420, -80, "AI Context Board", {
            color: "#64D2FF",
            content:
              "```nexus-list\nProblem | Welches Problem wird gelöst?\nPrimary User | Für wen bauen wir?\nSuccess Metric | Welche Metrik beweist Erfolg?\n```\n\n" +
              "```nexus-progress\nDiscovery | 30\nDelivery Plan | 20\nQA Readiness | 10\n```\n\n" +
              "```nexus-timeline\nW1 | Scope + Discovery\nW2 | Architektur festziehen\nW3 | Kernfunktionen bauen\nW4 | QA + Hardening\nW5 | Rollout\n```",
          });
          connectNodes([[rootId, context]]);
        }

        if (payload.includeTasks) {
          const execution = mk("checklist", 420, 190, "Execution Plan", {
            color: "#30D158",
          });
          if (execution) {
            [
              "Kickoff + Scope lock",
              "Architecture review",
              "Implementation sprint",
              "QA + hardening",
              "Go-live checklist",
            ]
              .slice(0, depth === "deep" ? 5 : 4)
              .forEach((task) => state.addChecklistItem(execution, task));
            connectNodes([[rootId, execution]]);
          }
        }
      }

      if (payload.template === "mindmap") {
        rootId = mk("project", 0, 0, payload.title, {
          color: "#64D2FF",
          progress: 12,
          status: "doing",
          content: "Vision, Scope, Kernfragen und Stakeholder",
        });
        const g1 = mk("goal", -300, -170, "Core Goal", {
          color: "#30D158",
          progress: 20,
          dueDate: day(14),
        });
        const g2 = mk("goal", 290, -170, "User Value", {
          color: "#5E5CE6",
          progress: 10,
          dueDate: day(21),
        });
        const d1 = mk("decision", 330, 130, "Open Decision", {
          color: "#BF5AF2",
        });
        const r1 = mk("risk", -320, 130, "Main Risk", {
          color: "#FF453A",
          priority: "high",
        });
        const m1 = mk("milestone", 0, -240, "Milestone #1", {
          color: "#FF9F0A",
          dueDate: day(7),
        });
        connectNodes([
          [rootId, g1],
          [rootId, g2],
          [rootId, d1],
          [rootId, r1],
          [rootId, m1],
        ]);

        if (payload.includeNotes) {
          const note = mk("markdown", 0, 230, "Knowledge Hub", {
            color: "#64D2FF",
            content:
              "```nexus-grid\n2\nVision\nStakeholder\nAbhängigkeiten\nOffene Fragen\n```\n\n" +
              "```nexus-list\nOwner | @product\nRisiko-Level | Mittel\nNächstes Review | Freitag\n```\n\n" +
              "```nexus-timeline\nW1 | Discovery\nW2 | Architektur\nW3 | Umsetzung\nW4 | Review + Entscheidung\n```",
          });
          connectNodes([[rootId, note]]);
        }

        if (payload.includeTasks) {
          const checklist = mk("checklist", 320, 280, "Execution Checklist", {
            color: "#30D158",
          });
          if (checklist) {
            state.addChecklistItem(checklist, "Kickoff vorbereiten");
            state.addChecklistItem(checklist, "Scope finalisieren");
            state.addChecklistItem(checklist, "Metriken definieren");
            connectNodes([[rootId, checklist]]);
          }
        }
      }

      if (payload.template === "roadmap") {
        rootId = mk("project", -40, -30, payload.title, {
          color: "#30D158",
          progress: 18,
          status: "doing",
          content: "Roadmap-Owner, Zielbild, KPI und Scope",
        });
        const goal = mk("goal", -360, -50, "North Star", {
          color: "#64D2FF",
          dueDate: day(45),
          progress: 15,
        });
        const ms1 = mk("milestone", -130, -240, "Alpha", {
          color: "#FF9F0A",
          dueDate: day(10),
        });
        const ms2 = mk("milestone", 120, -240, "Beta", {
          color: "#FF9F0A",
          dueDate: day(24),
        });
        const ms3 = mk("milestone", 370, -240, "Launch", {
          color: "#FF9F0A",
          dueDate: day(40),
        });
        const timeline = mk("markdown", 270, 30, "Timeline", {
          color: "#BF5AF2",
          content:
            "```nexus-timeline\nPhase 1 | Discovery + Scope Lock\nPhase 2 | Core Build\nPhase 3 | Beta + QA\nPhase 4 | Launch + Monitoring\n```",
        });
        const risk = mk("risk", -360, 210, "Rollout Risk", {
          color: "#FF453A",
          priority: "critical",
        });
        connectNodes([
          [rootId, goal],
          [rootId, ms1],
          [rootId, ms2],
          [rootId, ms3],
          [rootId, timeline],
          [rootId, risk],
        ]);

        if (payload.includeNotes) {
          const brief = mk("markdown", 40, 250, "Roadmap Notes", {
            content:
              "```nexus-list\nOwners | Product + Eng\nDependencies | API, Design, QA\nGo-Live Gate | Performance + QA signoff\n```\n\n" +
              "```nexus-progress\nScope Fit | 70\nTeam Readiness | 60\nRelease Confidence | 45\n```",
          });
          connectNodes([[rootId, brief]]);
        }

        if (payload.includeTasks) {
          const todos = mk("checklist", 500, 200, "Launch Tasks");
          if (todos) {
            state.addChecklistItem(todos, "Launch Plan finalisieren");
            state.addChecklistItem(todos, "Go/No-Go Meeting");
            state.addChecklistItem(todos, "Post-Launch Monitoring");
            connectNodes([
              [rootId, todos],
              [ms3, todos],
            ]);
          }
        }
      }

      if (payload.template === "sprint") {
        rootId = mk("project", 20, -210, `${payload.title} Sprint`, {
          color: "#FF9F0A",
          status: "doing",
          progress: 30,
          content: "Sprint Goal, Capacity, Definition of Done",
        });
        const backlog = mk("checklist", -450, 20, "Backlog", {
          color: "#8E8E93",
        });
        const doing = mk("checklist", -130, 20, "Doing", { color: "#007AFF" });
        const review = mk("checklist", 190, 20, "Review", { color: "#BF5AF2" });
        const done = mk("checklist", 510, 20, "Done", { color: "#30D158" });
        connectNodes([
          [rootId, backlog],
          [rootId, doing],
          [rootId, review],
          [rootId, done],
        ]);

        if (backlog) {
          state.addChecklistItem(backlog, "Feature Spec schärfen");
          state.addChecklistItem(backlog, "Tech Spike");
        }
        if (doing) {
          state.addChecklistItem(doing, "Implementierung API");
          state.addChecklistItem(doing, "UI Integration");
        }
        if (review) state.addChecklistItem(review, "QA + Demo");
        if (done) state.addChecklistItem(done, "Definition of Done erfüllt");

        if (payload.includeNotes) {
          const standup = mk("markdown", 20, 290, "Daily Standup", {
            content:
              "```nexus-kanban\nYesterday | Erledigte Tasks + Ergebnis\nToday | Wichtigste 1-2 Deliverables\nBlocker | Owner + ETA für Entblockung\n```\n\n" +
              "```nexus-alert\ninfo\nSprint Scope bleibt stabil, neue Requests nur per Tradeoff-Entscheidung.\n```",
          });
          connectNodes([[rootId, standup]]);
        }

        if (payload.includeTasks) {
          const risk = mk("risk", -300, 290, "Sprint Risk", {
            priority: "high",
            color: "#FF453A",
          });
          connectNodes([[rootId, risk]]);
        }
      }

      if (payload.template === "risk-matrix") {
        rootId = mk("project", 0, -230, `${payload.title} Risk Matrix`, {
          color: "#FF453A",
          status: "doing",
          content: "Risiken priorisieren und mitigieren",
        });
        const rLow = mk("risk", -360, 20, "Low Impact / Low Prob", {
          priority: "low",
          status: "todo",
        });
        const rMed = mk("risk", -60, 20, "High Prob / Low Impact", {
          priority: "mid",
          status: "todo",
        });
        const rHigh = mk("risk", 250, 20, "Low Prob / High Impact", {
          priority: "high",
          status: "doing",
        });
        const rCritical = mk("risk", 560, 20, "High Impact / High Prob", {
          priority: "critical",
          status: "blocked",
          color: "#FF453A",
        });
        connectNodes([
          [rootId, rLow],
          [rootId, rMed],
          [rootId, rHigh],
          [rootId, rCritical],
        ]);

        const matrix = mk("markdown", 90, 260, "Matrix Legende", {
          content:
            "```nexus-grid\n2\nNiedriger Impact\nHoher Impact\nNiedrige Wahrscheinlichkeit\nHohe Wahrscheinlichkeit\n```\n\n" +
            "```nexus-list\nCritical Risiken | Tägliches Tracking\nHigh Risiken | 2x pro Woche Review\nOwner Pflicht | Ja, für jedes Risiko\n```\n\n" +
            "```nexus-alert\nwarning\nFür alle Critical-Risiken innerhalb von 24h einen Mitigation-Owner setzen.\n```",
        });
        connectNodes([[rootId, matrix]]);
      }

      if (payload.template === "decision-flow") {
        rootId = mk("decision", 0, -40, `${payload.title} Entscheidung`, {
          color: "#BF5AF2",
          status: "doing",
          priority: "high",
          content: "Welche Option erfüllt Ziel + Risiken am besten?",
        });
        const optA = mk("markdown", -320, -30, "Option A", {
          content:
            "```nexus-card\nOption A|Schneller Start|Mehr technisches Risiko\n```",
          color: "#64D2FF",
        });
        const optB = mk("markdown", 320, -30, "Option B", {
          content:
            "```nexus-card\nOption B|Stabiler Rollout|Höherer Initialaufwand\n```",
          color: "#30D158",
        });
        const criteria = mk("checklist", 0, 170, "Kriterien", {
          color: "#FF9F0A",
        });
        const next = mk("milestone", 0, 360, "Nächster Schritt", {
          dueDate: day(5),
          status: "todo",
        });
        const risk = mk("risk", -350, 320, "Tradeoff Risk", {
          priority: "high",
        });
        const outcome = mk("goal", 350, 320, "Expected Outcome", {
          progress: 5,
          dueDate: day(30),
        });
        connectNodes([
          [rootId, optA],
          [rootId, optB],
          [rootId, criteria],
          [criteria, next],
          [rootId, risk],
          [rootId, outcome],
        ]);
        if (criteria) {
          state.addChecklistItem(criteria, "User Impact");
          state.addChecklistItem(criteria, "Engineering Effort");
          state.addChecklistItem(criteria, "Risk / Compliance");
        }
      }

      if (rootId) setSelectedNodeId(rootId);
      setShowMagicBuilder(false);
      setQuickAddPos(null);
      setTimeout(() => fitView(), 80);
    },
    [
      canvasSize,
      viewport.panX,
      viewport.panY,
      viewport.zoom,
      spawnNode,
      connectNodes,
      fitView,
    ],
  );

  const applyAutoLayout = useCallback(
    (mode: "mindmap" | "timeline" | "board", opts?: { fitView?: boolean }) => {
      const state = useCanvas.getState();
      const active = state.getActiveCanvas();
      if (!active || active.nodes.length === 0) return;

      const nodes = [...active.nodes];
      if (nodes.length === 1) {
        if (opts?.fitView !== false) requestAnimationFrame(() => fitView());
        return;
      }

      const minX = Math.min(...nodes.map((n) => n.x));
      const minY = Math.min(...nodes.map((n) => n.y));

      if (mode === "timeline") {
        const ordered = nodes
          .map((node, index) => ({ node, index }))
          .sort((a, b) => timelineSortKey(a.node, a.index) - timelineSortKey(b.node, b.index))
          .map((entry) => entry.node);
        const startX = minX + 80;
        const baseY = minY + 80;
        ordered.forEach((n, i) => {
          const stepX = startX + i * 320;
          const stepY = baseY + (i % 2 === 0 ? 0 : 115);
          state.moveNode(n.id, stepX, stepY);
        });
        if (opts?.fitView !== false) requestAnimationFrame(() => fitView());
        return;
      }

      if (mode === "board") {
        const laneIndexById = new globalThis.Map(
          BOARD_LANES.map((lane, index) => [lane.id, index] as const),
        );
        const buckets = BOARD_LANES.reduce(
          (acc, lane) => {
            acc[lane.id] = [];
            return acc;
          },
          {} as Record<CanvasNodeStatus, CanvasNode[]>,
        );

        nodes.forEach((n, i) => {
          const lane = laneForNode(n, i);
          buckets[lane].push(n);
        });

        BOARD_LANES.forEach((lane) => {
          const laneNodes = buckets[lane.id];
          const laneIndex = laneIndexById.get(lane.id) || 0;
          laneNodes.forEach((n, i) => {
            state.moveNode(n.id, minX + laneIndex * 340, minY + i * 240 + 72);
          });
        });
        if (opts?.fitView !== false) requestAnimationFrame(() => fitView());
        return;
      }

      const root = nodes[0];
      const others = nodes.slice(1);
      const radius = Math.max(240, others.length * 40);
      others.forEach((n, i) => {
        const angle = (Math.PI * 2 * i) / Math.max(others.length, 1);
        const x = root.x + Math.cos(angle) * radius;
        const y = root.y + Math.sin(angle) * Math.max(180, radius * 0.62);
        state.moveNode(n.id, x, y);
      });
      if (opts?.fitView !== false) requestAnimationFrame(() => fitView());
    },
    [fitView],
  );

  const layoutGuides = useMemo(() => {
    if (!canvas || canvas.nodes.length === 0 || layoutMode === "mindmap") {
      return null as
        | null
        | {
            type: "timeline";
            points: Array<{ id: string; x: number; y: number; label: string }>;
            axisY: number;
          }
        | {
            type: "board";
            lanes: Array<{
              id: CanvasNodeStatus;
              label: string;
              color: string;
              x: number;
              y: number;
              width: number;
              height: number;
            }>;
          };
    }

    const minX = Math.min(...canvas.nodes.map((n) => n.x));
    const minY = Math.min(...canvas.nodes.map((n) => n.y));
    const maxY = Math.max(...canvas.nodes.map((n) => n.y + n.height));

    if (layoutMode === "timeline") {
      const ordered = canvas.nodes
        .map((node, index) => ({ node, index }))
        .sort((a, b) => timelineSortKey(a.node, a.index) - timelineSortKey(b.node, b.index))
        .map((entry) => entry.node);
      const points = ordered.map((node, index) => ({
        id: node.id,
        x: minX + 120 + index * 320,
        y: minY + 24 + (index % 2 === 0 ? 0 : 115),
        label: node.title || `Step ${index + 1}`,
      }));
      return { type: "timeline", points, axisY: minY + 70 };
    }

    const lanes = BOARD_LANES.map((lane, laneIndex) => ({
      id: lane.id,
      label: lane.label,
      color: lane.color,
      x: minX + laneIndex * 340 - 16,
      y: minY + 20,
      width: 316,
      height: Math.max(300, maxY - minY + 260),
    }));
    return { type: "board", lanes };
  }, [canvas, layoutMode]);

  useEffect(() => {
    const onCanvasCommand = (event: Event) => {
      const detail = (event as CustomEvent<any>).detail || {};

      if (detail.action === "focus") {
        fitView();
        return;
      }

      if (detail.action === "layout") {
        const mode = detail.mode as "mindmap" | "timeline" | "board";
        if (mode === "mindmap" || mode === "timeline" || mode === "board") {
          setLayoutMode(mode);
          applyAutoLayout(mode);
        }
        return;
      }

      if (detail.action === "template") {
        const template = detail.template as MagicTemplateId;
        if (!template) return;
        createMagicTemplate({
          template,
          title: detail.title || "Terminal Template",
          includeNotes: detail.includeNotes !== false,
          includeTasks: detail.includeTasks !== false,
        });
      }
    };
    window.addEventListener(
      "nx-canvas-command",
      onCanvasCommand as EventListener,
    );
    return () =>
      window.removeEventListener(
        "nx-canvas-command",
        onCanvasCommand as EventListener,
      );
  }, [createMagicTemplate, applyAutoLayout, fitView]);

  // Empty state
  if (canvases.length === 0) {
    return (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 20,
        }}
      >
        <div
          style={{
            fontSize: 72,
            opacity: 0.12,
            background: `linear-gradient(135deg, ${t.accent}, ${t.accent2})`,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            animation: "nexus-float 3s ease-in-out infinite",
          }}
        >
          ✦
        </div>
        <div style={{ fontSize: 18, fontWeight: 700, opacity: 0.7 }}>
          Kein Canvas vorhanden
        </div>
        <div
          style={{
            fontSize: 13,
            opacity: 0.4,
            maxWidth: 300,
            textAlign: "center",
          }}
        >
          Erstelle ein neues Canvas, um Ideen, Pläne und Mindmaps visuell zu
          organisieren.
        </div>
        <button
          onClick={() => addCanvas()}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "12px 28px",
            borderRadius: 14,
            border: "none",
            background: `linear-gradient(135deg, ${t.accent}, ${t.accent2})`,
            color: "#fff",
            fontWeight: 700,
            fontSize: 15,
            cursor: "pointer",
            boxShadow: `0 6px 24px rgba(${rgb}, 0.35)`,
            transition: "transform 0.15s ease",
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.transform = "scale(1.04)")
          }
          onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
        >
          <Plus size={20} /> Neues Canvas
        </button>
      </div>
    );
  }

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        overflow: "hidden",
      }}
    >
      {/* ── Sidebar ── */}
      {showCanvasList && (
        <Glass
          type="panel"
          className="shrink-0"
          style={{
            width: 188,
            height: "100%",
            display: "flex",
            flexDirection: "column",
            borderRight: `1px solid ${t.mode === "dark" ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)"}`,
            borderRadius: 0,
          }}
        >
          <div
            style={{
              padding: 12,
              display: "flex",
              flexDirection: "column",
              gap: 4,
              height: "100%",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 6,
                paddingBottom: 8,
                borderBottom: `1px solid ${t.mode === "dark" ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.05)"}`,
              }}
            >
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  opacity: 0.45,
                  textTransform: "uppercase",
                  letterSpacing: 1.2,
                }}
              >
                Canvases
              </span>
              <button
                onClick={() => addCanvas()}
                style={{
                  background: `rgba(${rgb}, 0.15)`,
                  border: "none",
                  borderRadius: 7,
                  width: 24,
                  height: 24,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  color: t.accent,
                  transition: "all 0.15s",
                }}
              >
                <Plus size={13} />
              </button>
            </div>

            <div
              style={{
                flex: 1,
                overflow: "auto",
                display: "flex",
                flexDirection: "column",
                gap: 1,
              }}
            >
              {canvases.map((c) => (
                <div
                  key={c.id}
                  onClick={() => setActiveCanvas(c.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "7px 9px",
                    borderRadius: 8,
                    cursor: "pointer",
                    background:
                      c.id === activeCanvasId
                        ? `rgba(${rgb}, 0.15)`
                        : "transparent",
                    borderLeft:
                      c.id === activeCanvasId
                        ? `2px solid ${t.accent}`
                        : "2px solid transparent",
                    transition: "all 0.15s",
                  }}
                  onMouseEnter={(e) => {
                    if (c.id !== activeCanvasId)
                      (e.currentTarget as HTMLDivElement).style.background =
                        "rgba(255,255,255,0.05)";
                  }}
                  onMouseLeave={(e) => {
                    if (c.id !== activeCanvasId)
                      (e.currentTarget as HTMLDivElement).style.background =
                        "transparent";
                  }}
                >
                  <span
                    style={{
                      flex: 1,
                      fontSize: 12,
                      fontWeight: c.id === activeCanvasId ? 600 : 400,
                      color: c.id === activeCanvasId ? t.accent : undefined,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {c.name}
                  </span>
                  <span
                    style={{
                      fontSize: 10,
                      opacity: 0.35,
                      background: "rgba(255,255,255,0.08)",
                      padding: "1px 5px",
                      borderRadius: 4,
                    }}
                  >
                    {c.nodes.length}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`Delete "${c.name}"?`)) deleteCanvas(c.id);
                    }}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: "#FF3B30",
                      opacity: 0,
                      padding: 2,
                      transition: "opacity 0.15s",
                    }}
                    onMouseEnter={(e) =>
                      ((e.currentTarget as HTMLButtonElement).style.opacity =
                        "1")
                    }
                    onMouseLeave={(e) =>
                      ((e.currentTarget as HTMLButtonElement).style.opacity =
                        "0")
                    }
                  >
                    <X size={11} />
                  </button>
                </div>
              ))}
            </div>

            <div
              style={{
                fontSize: 10,
                opacity: 0.3,
                marginTop: 4,
                paddingTop: 6,
                borderTop: `1px solid ${t.mode === "dark" ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)"}`,
              }}
            >
              {canvas?.nodes.length ?? 0} nodes ·{" "}
              {canvas?.connections.length ?? 0} links
            </div>
          </div>
        </Glass>
      )}

      {/* ── Main Canvas ── */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* ── Top Bar ── */}
        <div
          style={{
            flexShrink: 0,
            borderBottom: `1px solid ${t.mode === "dark" ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}`,
            background:
              t.mode === "dark"
                ? "rgba(255,255,255,0.025)"
                : "rgba(255,255,255,0.6)",
            backdropFilter: "blur(16px)",
            overflowX: "auto",
            overflowY: "hidden",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              minWidth: "max-content",
              padding: "5px 8px",
              position: "relative",
            }}
          >
            <ToolBtn
              icon={FileText}
              tooltip="Toggle Sidebar"
              onClick={() => setShowCanvasList(!showCanvasList)}
              accent={t.accent}
              rgb={rgb}
              active={showCanvasList}
            />

            {/* Canvas name */}
            {canvas &&
              (editCanvasName ? (
                <input
                  autoFocus
                  value={canvas.name}
                  onChange={(e) => renameCanvas(canvas.id, e.target.value)}
                  onBlur={() => setEditCanvasName(false)}
                  onKeyDown={(e) =>
                    e.key === "Enter" && setEditCanvasName(false)
                  }
                  style={{
                    background: "transparent",
                    border: "none",
                    outline: "none",
                    color: t.accent,
                    fontWeight: 600,
                    fontSize: 13,
                    width: 130,
                    padding: "1px 4px",
                  }}
                />
              ) : (
                <span
                  onDoubleClick={() => setEditCanvasName(true)}
                  style={{
                    fontWeight: 600,
                    fontSize: 13,
                    color: t.accent,
                    padding: "1px 6px",
                    cursor: "pointer",
                    borderRadius: 4,
                    maxWidth: 160,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {canvas.name}
                </span>
              ))}

            <div
              style={{
                width: 1,
                height: 18,
                background: "rgba(255,255,255,0.1)",
                margin: "0 2px",
              }}
            />

            {/* Add node buttons */}
            {WIDGET_TYPES.filter((w) =>
              QUICK_WIDGET_TYPES.includes(w.type),
            ).map(({ type, icon: WIcon, label }) => (
              <ToolBtn
                key={type}
                icon={WIcon}
                tooltip={label}
                onClick={() => addWidgetNode(type)}
                accent={t.accent}
                rgb={rgb}
              />
            ))}
            <div style={{ position: "relative" }}>
              <ToolBtn
                icon={Plus}
                tooltip="Mehr Elemente"
                onClick={() => setShowWidgetMenu((s) => !s)}
                accent={t.accent}
                rgb={rgb}
                active={showWidgetMenu}
              />
              {showWidgetMenu && (
                <div
                  style={{
                    position: "absolute",
                    top: "calc(100% + 6px)",
                    left: 0,
                    zIndex: 500,
                    minWidth: 190,
                    maxHeight: 320,
                    overflowY: "auto",
                    borderRadius: 12,
                    padding: 6,
                    background:
                      t.mode === "dark"
                        ? "rgba(10,12,20,0.96)"
                        : "rgba(255,255,255,0.96)",
                    border: `1px solid ${t.mode === "dark" ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.1)"}`,
                    boxShadow: "0 16px 40px rgba(0,0,0,0.45)",
                  }}
                >
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 800,
                      opacity: 0.5,
                      textTransform: "uppercase",
                      letterSpacing: 0.8,
                      padding: "4px 8px 6px",
                    }}
                  >
                    Element hinzufügen
                  </div>
                  {WIDGET_TYPES.map(({ type, icon: WIcon, label }) => (
                    <button
                      key={type}
                      onClick={() => {
                        addWidgetNode(type);
                        setShowWidgetMenu(false);
                      }}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        width: "100%",
                        textAlign: "left",
                        padding: "7px 8px",
                        border: "none",
                        borderRadius: 8,
                        cursor: "pointer",
                        background: "transparent",
                        color: "inherit",
                        fontSize: 12,
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background =
                          t.mode === "dark"
                            ? "rgba(255,255,255,0.08)"
                            : "rgba(0,0,0,0.06)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "transparent";
                      }}
                    >
                      <WIcon size={13} style={{ color: t.accent }} />
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div style={{ flex: 1 }} />

            {/* Canvas tools */}
            <ToolBtn
              icon={Wand2}
              tooltip="Magic Builder (Ctrl+M)"
              onClick={() => setShowMagicBuilder(true)}
              accent={t.accent}
              rgb={rgb}
              active={showMagicBuilder}
            />
            <ToolBtn
              icon={Grid}
              tooltip="Grid-Modus umschalten"
              onClick={() =>
                setGridMode((g) =>
                  g === "dots" ? "lines" : g === "lines" ? "none" : "dots",
                )
              }
              accent={t.accent}
              rgb={rgb}
              active={gridMode !== "none"}
            />
            <ToolBtn
              icon={Map}
              tooltip={showMiniMap ? "Minimap ausblenden" : "Minimap anzeigen"}
              onClick={() => setShowMiniMap(!showMiniMap)}
              accent={t.accent}
              rgb={rgb}
              active={showMiniMap}
            />
            <ToolBtn
              icon={AlignCenter}
              tooltip={snapToGrid ? "Snap deaktivieren" : "Snap aktivieren"}
              onClick={() => setSnapToGrid((s) => !s)}
              accent={t.accent}
              rgb={rgb}
              active={snapToGrid}
            />
            <select
              value={layoutMode}
              onChange={(e) => {
                const nextMode = e.target.value as "mindmap" | "timeline" | "board";
                setLayoutMode(nextMode);
                applyAutoLayout(nextMode);
              }}
              style={{
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.12)",
                color: "inherit",
                borderRadius: 7,
                padding: "5px 7px",
                fontSize: 11,
                outline: "none",
              }}
            >
              <option value="mindmap">Mindmap</option>
              <option value="timeline">Timeline</option>
              <option value="board">Board</option>
            </select>
            <ToolBtn
              icon={RotateCw}
              tooltip={`Auto Layout (${layoutMode})`}
              onClick={() => applyAutoLayout(layoutMode)}
              accent={t.accent}
              rgb={rgb}
            />
            <ToolBtn
              icon={Maximize2}
              tooltip="Fit to View"
              onClick={fitView}
              accent={t.accent}
              rgb={rgb}
            />

            <div
              style={{
                width: 1,
                height: 18,
                background: "rgba(255,255,255,0.1)",
                margin: "0 2px",
              }}
            />

            {/* Zoom */}
            <ToolBtn
              icon={ZoomOut}
              tooltip="Rauszoomen"
              onClick={() => setZoomCentered(viewport.zoom - 0.15)}
              accent={t.accent}
              rgb={rgb}
            />
            <span
              style={{
                fontSize: 11,
                fontFamily: "monospace",
                padding: "2px 6px",
                borderRadius: 5,
                background: "rgba(255,255,255,0.06)",
                minWidth: 42,
                textAlign: "center",
                opacity: 0.8,
              }}
            >
              {Math.round(viewport.zoom * 100)}%
            </span>
            <ToolBtn
              icon={ZoomIn}
              tooltip="Reinzoomen"
              onClick={() => setZoomCentered(viewport.zoom + 0.15)}
              accent={t.accent}
              rgb={rgb}
            />
            <ToolBtn
              icon={RotateCcw}
              tooltip="Reset View (Ctrl+0)"
              onClick={resetViewport}
              accent={t.accent}
              rgb={rgb}
            />
          </div>
        </div>

        {/* ── Canvas Surface ── */}
        <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
          {/* Connect mode toast */}
          {connectingFrom && (
            <div
              style={{
                position: "absolute",
                bottom: 20,
                left: "50%",
                transform: "translateX(-50%)",
                zIndex: 200,
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 18px",
                borderRadius: 12,
                background: `rgba(${rgb}, 0.25)`,
                border: `1px solid ${t.accent}`,
                backdropFilter: "blur(12px)",
                fontSize: 12,
                fontWeight: 500,
                boxShadow: `0 4px 20px rgba(${rgb}, 0.3)`,
                animation: "nexus-fade-up 0.25s both",
              }}
            >
              <Link size={14} style={{ color: t.accent }} />
              Klicke auf einen anderen Node zum Verbinden
              <button
                onClick={() => setConnectingFrom(null)}
                style={{
                  background: "rgba(255,255,255,0.12)",
                  border: "none",
                  borderRadius: 6,
                  padding: "2px 10px",
                  cursor: "pointer",
                  color: "inherit",
                  fontSize: 11,
                }}
              >
                Abbrechen
              </button>
            </div>
          )}

          {/* Space hint */}
          {spaceHeld && (
            <div
              style={{
                position: "absolute",
                top: 12,
                left: "50%",
                transform: "translateX(-50%)",
                zIndex: 200,
                padding: "4px 12px",
                borderRadius: 8,
                background: "rgba(0,0,0,0.5)",
                fontSize: 11,
                opacity: 0.7,
                pointerEvents: "none",
              }}
            >
              Hold Space + Drag to Pan
            </div>
          )}

          <div
            ref={canvasRef}
            className="w-full h-full relative nx-canvas-grid"
            style={{
              cursor: connectingFrom
                ? "crosshair"
                : spaceHeld
                  ? panning
                    ? "grabbing"
                    : "grab"
                  : wheelPanning
                    ? "grabbing"
                    : "default",
              transition: panning || wheelPanning
                ? "none"
                : "background-position 0.08s ease-out, background-size 0.12s ease-out",
              backgroundPosition: `${viewport.panX}px ${viewport.panY}px`, // viewport.x, viewport.y replaced with viewport.panX, viewport.panY
              backgroundSize: `${24 * viewport.zoom}px ${24 * viewport.zoom}px`,
              backgroundImage:
                gridMode === "dots"
                  ? t.mode === "dark"
                    ? "radial-gradient(circle, rgba(255,255,255,0.12) 1px, transparent 1px)"
                    : "radial-gradient(circle, rgba(0,0,0,0.1) 1px, transparent 1px)"
                  : gridMode === "lines"
                    ? t.mode === "dark"
                      ? "linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)"
                      : "linear-gradient(rgba(0,0,0,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.05) 1px, transparent 1px)"
                    : "none",
              touchAction: "none",
              overscrollBehavior: "none",
              contain: "layout paint",
            }}
            onMouseDown={handleCanvasMouseDown}
            onWheel={handleWheel}
            onDoubleClick={(e) => {
              if (
                e.target !== e.currentTarget &&
                (e.target as HTMLElement).id !== "nexus-canvas-inner"
              )
                return;
              const rect = canvasRef.current?.getBoundingClientRect();
              if (!rect) return;
              setQuickAddPos({
                x: e.clientX - rect.left,
                y: e.clientY - rect.top,
              });
            }}
          >
            {/* ── TRANSFORM LAYER ── */}
            <div
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                right: 0,
                bottom: 0,
                transform: `translate(${viewport.panX}px, ${viewport.panY}px) scale(${viewport.zoom})`, // viewport.x, viewport.y replaced with viewport.panX, viewport.panY
                transformOrigin: "0 0",
                willChange: "transform",
                backfaceVisibility: "hidden",
              }}
            >
              {layoutGuides?.type === "board" && (
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    pointerEvents: "none",
                    zIndex: 0,
                  }}
                >
                  {layoutGuides.lanes.map((lane) => (
                    <div
                      key={lane.id}
                      style={{
                        position: "absolute",
                        left: lane.x,
                        top: lane.y,
                        width: lane.width,
                        height: lane.height,
                        borderRadius: 14,
                        border: `1px solid ${lane.color}40`,
                        background: `${lane.color}10`,
                        boxShadow: `inset 0 0 0 1px ${lane.color}14`,
                      }}
                    >
                      <div
                        style={{
                          position: "sticky",
                          top: 0,
                          margin: 10,
                          padding: "4px 9px",
                          borderRadius: 999,
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          background: `${lane.color}24`,
                          border: `1px solid ${lane.color}55`,
                          color: lane.color,
                          fontSize: 10,
                          fontWeight: 700,
                          letterSpacing: 0.2,
                        }}
                      >
                        <span
                          style={{
                            width: 7,
                            height: 7,
                            borderRadius: "50%",
                            background: lane.color,
                            boxShadow: `0 0 10px ${lane.color}`,
                          }}
                        />
                        {lane.label}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {layoutGuides?.type === "timeline" && (
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    pointerEvents: "none",
                    zIndex: 0,
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      left: layoutGuides.points[0]?.x ?? 0,
                      top: layoutGuides.axisY,
                      width: Math.max(0, layoutGuides.points.length - 1) * 320 + 120,
                      height: 2,
                      borderRadius: 999,
                      background: `linear-gradient(90deg, ${t.accent}, ${t.accent2})`,
                      opacity: 0.5,
                    }}
                  />
                  {layoutGuides.points.map((point) => (
                    <div
                      key={point.id}
                      style={{
                        position: "absolute",
                        left: point.x - 8,
                        top: point.y - 6,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 6,
                        width: 220,
                      }}
                    >
                      <div
                        style={{
                          width: 14,
                          height: 14,
                          borderRadius: "50%",
                          background: `linear-gradient(135deg, ${t.accent}, ${t.accent2})`,
                          border: "1px solid rgba(255,255,255,0.48)",
                          boxShadow: `0 0 14px rgba(${rgb},0.45)`,
                        }}
                      />
                      <div
                        style={{
                          padding: "3px 8px",
                          borderRadius: 999,
                          fontSize: 10,
                          fontWeight: 700,
                          maxWidth: 220,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          background: "rgba(0,0,0,0.35)",
                          border: "1px solid rgba(255,255,255,0.2)",
                        }}
                        title={point.label}
                      >
                        {point.label}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* SVG Layer for Connections */}
              {canvas && visibleConnections.length > 0 && (
                <svg
                  style={{
                    position: "absolute",
                    left: 0,
                    top: 0,
                    width: "100%",
                    height: "100%",
                    overflow: "visible",
                    pointerEvents: "auto",
                    zIndex: 0,
                  }}
                  >
                  <defs>
                    <filter
                      id="glow-filter"
                      x="-20%"
                      y="-20%"
                      width="140%"
                      height="140%"
                    >
                      <feGaussianBlur stdDeviation="4" result="blur" />
                      <feComposite
                        in="SourceGraphic"
                        in2="blur"
                        operator="over"
                      />
                    </filter>
                  </defs>
                  {visibleConnections.map((conn) => (
                    <ConnectionLine
                      key={conn.id}
                      conn={conn}
                      nodes={visibleNodes}
                      zoom={viewport.zoom}
                      onDelete={deleteConnection}
                    />
                  ))}
                </svg>
              )}

              {/* Nodes */}
              {visibleNodes.map((node) => (
                <NodeWidget
                  key={node.id}
                  node={node}
                  isSelected={selectedNodeId === node.id}
                  onSelect={setSelectedNodeId}
                  onStartConnect={handleStartConnect}
                  onEndConnect={handleEndConnect}
                  connectingFrom={connectingFrom}
                  snapToGrid={snapToGrid}
                />
              ))}
            </div>
          </div>

          {/* Quick Add Context Menu */}
          {quickAddPos &&
            (() => {
              const menuW = 168;
              const menuH = Math.min(420, 70 + WIDGET_TYPES.length * 34);
              const clampedX = Math.max(
                8,
                Math.min(quickAddPos.x, canvasSize.w - menuW - 8),
              );
              const clampedY = Math.max(
                8,
                Math.min(quickAddPos.y, canvasSize.h - menuH - 8),
              );
              return (
                <div
                  style={{
                    position: "absolute",
                    top: clampedY,
                    left: clampedX,
                    zIndex: 300,
                    background: t.mode === "dark" ? "#1a1a2e" : "#fff",
                    border: `1px solid ${t.mode === "dark" ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)"}`,
                    borderRadius: 12,
                    padding: 6,
                    width: 150,
                    boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
                    animation:
                      "nexus-scale-in 0.15s cubic-bezier(0.4,0,0.2,1) both",
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      opacity: 0.5,
                      padding: "4px 8px",
                      textTransform: "uppercase",
                    }}
                  >
                    Add Element
                  </div>
                  {WIDGET_TYPES.map(({ type, icon: WIcon, label }) => (
                    <button
                      key={type}
                      onClick={() => {
                        const canvasX =
                          (-viewport.panX + quickAddPos.x) / viewport.zoom;
                        const canvasY =
                          (-viewport.panY + quickAddPos.y) / viewport.zoom;
                        addWidgetNode(type, canvasX, canvasY);
                        setQuickAddPos(null);
                      }}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        width: "100%",
                        padding: "6px 8px",
                        border: "none",
                        borderRadius: 8,
                        cursor: "pointer",
                        fontSize: 13,
                        background: "transparent",
                        color: t.mode === "dark" ? "#fff" : "#000",
                        textAlign: "left",
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.background =
                          "rgba(128,128,128,0.1)")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.background = "transparent")
                      }
                    >
                      <WIcon size={14} style={{ color: t.accent }} /> {label}
                    </button>
                  ))}
                </div>
              );
            })()}

          {/* Mini-map */}
          {showMiniMap && canvas && canvas.nodes.length > 0 && (
            <MiniMap
              nodes={canvas.nodes}
              viewport={viewport}
              canvasW={canvasSize.w}
              canvasH={canvasSize.h}
            />
          )}

          {/* Zoom tooltip */}
          {viewport.zoom !== 1 && (
            <div
              style={{
                position: "absolute",
                bottom: 16,
                left: "50%",
                transform: "translateX(-50%)",
                fontSize: 10,
                opacity: 0.35,
                pointerEvents: "none",
                background: "rgba(0,0,0,0.4)",
                padding: "2px 8px",
                borderRadius: 6,
                fontFamily: "monospace",
              }}
            >
              {Math.round(viewport.zoom * 100)}% · Scroll to pan · Pinch/Ctrl + Scroll to zoom · Render {visibleNodes.length}/{canvas?.nodes.length ?? 0}
            </div>
          )}
        </div>
      </div>
      {showMagicBuilder && (
        <Suspense fallback={null}>
          <CanvasMagicModal
            open={showMagicBuilder}
            onClose={() => setShowMagicBuilder(false)}
            onCreate={createMagicTemplate}
          />
        </Suspense>
      )}
    </div>
  );
}
