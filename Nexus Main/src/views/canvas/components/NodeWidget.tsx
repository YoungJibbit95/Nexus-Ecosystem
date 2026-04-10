import React, { useCallback, useEffect, useRef, useState } from "react";
import {
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
  Plus,
  Copy,
  Bell,
  Flag,
  Calendar,
} from "lucide-react";
import { Glass } from "../../../components/Glass";
import { useCanvas, type CanvasNode } from "../../../store/canvasStore";
import { useTheme } from "../../../store/themeStore";
import { useApp } from "../../../store/appStore";
import { hexToRgb } from "../../../lib/utils";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { shallow } from "zustand/shallow";
import {
  CanvasNexusCodeBlock,
  CanvasNexusInlineCode,
} from "@nexus/core/canvas/CanvasMagicRenderers";
import { NODE_COLORS, WIDGET_TYPES } from "../constants";

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
  reduceEffects,
}: {
  node: CanvasNode;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onStartConnect: (id: string) => void;
  onEndConnect: (id: string) => void;
  connectingFrom: string | null;
  snapToGrid?: boolean;
  reduceEffects?: boolean;
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
                    code: ({
                      node: mdNode,
                      inline,
                      className,
                      children,
                    }: any) =>
                      inline || !className ? (
                        <CanvasNexusInlineCode accent={node.color || t.accent}>
                          {children}
                        </CanvasNexusInlineCode>
                      ) : (
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
            <div
              className="node-interactive w-full h-full p-2 flex flex-col gap-2"
              style={{ minHeight: 0 }}
            >
              <div style={{ fontSize: 10, opacity: 0.65, fontWeight: 700 }}>
                Local Note (optional mit Notes verknüpfen)
              </div>
              <select
                className="bg-white/10 text-xs p-1.5 rounded outline-none w-full"
                value={node.linkedNoteId || ""}
                onChange={(e) =>
                  updateNode(node.id, { linkedNoteId: e.target.value })
                }
              >
                <option value="">Local Note</option>
                {app.notes.map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.title || "Ohne Titel"}
                  </option>
                ))}
              </select>
              <div
                style={{
                  flex: 1,
                  minHeight: 0,
                  borderRadius: 8,
                  border: "1px solid rgba(255,255,255,0.08)",
                  background: "rgba(0,0,0,0.16)",
                  padding: 8,
                  overflow: "auto",
                }}
              >
                {editingContent ? (
                  <textarea
                    value={node.content}
                    onChange={(e) =>
                      updateNode(node.id, { content: e.target.value })
                    }
                    placeholder="# Lokale Notiz&#10;&#10;```nexus-checklist&#10;Task A | done&#10;Task B | todo&#10;```"
                    style={{
                      width: "100%",
                      height: "100%",
                      minHeight: 96,
                      resize: "none",
                      background: "transparent",
                      border: "none",
                      outline: "none",
                      color: "inherit",
                      fontFamily: "'Fira Code', monospace",
                      fontSize: 12,
                      lineHeight: 1.5,
                    }}
                  />
                ) : (
                  <div className="canvas-md" style={{ fontSize: 12, lineHeight: 1.55 }}>
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        pre: ({ children }: any) => <>{children}</>,
                        code: ({ inline, className, children }: any) =>
                          inline || !className ? (
                            <CanvasNexusInlineCode accent={node.color || t.accent}>
                              {children}
                            </CanvasNexusInlineCode>
                          ) : (
                            <CanvasNexusCodeBlock
                              className={className}
                              accent={node.color || t.accent}
                            >
                              {children}
                            </CanvasNexusCodeBlock>
                          ),
                      }}
                    >
                      {node.content || "_Leere Notiz_"}
                    </ReactMarkdown>
                  </div>
                )}
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button
                  onClick={() => setEditingContent((prev) => !prev)}
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
                  {editingContent ? "Preview" : "Edit"}
                </button>
              </div>
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
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  pre: ({ children }: any) => <>{children}</>,
                  code: ({ inline, className, children }: any) =>
                    inline || !className ? (
                      <CanvasNexusInlineCode accent={node.color || t.accent}>
                        {children}
                      </CanvasNexusInlineCode>
                    ) : (
                      <CanvasNexusCodeBlock
                        className={className}
                        accent={node.color || t.accent}
                      >
                        {children}
                      </CanvasNexusCodeBlock>
                    ),
                }}
              >
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
            <div className="node-interactive w-full h-full p-2 flex flex-col gap-2">
              <div style={{ fontSize: 10, opacity: 0.65, fontWeight: 700 }}>
                Local Code (optional mit Nexus Code verknüpfen)
              </div>
              <select
                className="bg-white/10 text-xs p-1.5 rounded outline-none w-full"
                value={node.linkedCodeId || ""}
                onChange={(e) =>
                  updateNode(node.id, { linkedCodeId: e.target.value })
                }
              >
                <option value="">Local Code</option>
                {app.codes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name || "Ohne Titel"} ({c.lang})
                  </option>
                ))}
              </select>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <select
                  value={node.codeLang || "javascript"}
                  onChange={(e) =>
                    updateNode(node.id, { codeLang: e.target.value })
                  }
                  style={{ ...fieldStyle, flex: 1 }}
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
                  ].map((lang) => (
                    <option key={lang} value={lang}>
                      {lang}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => navigator.clipboard?.writeText(node.content)}
                  style={{
                    background: `rgba(${rgb},0.15)`,
                    border: "none",
                    borderRadius: 6,
                    padding: "4px 8px",
                    cursor: "pointer",
                    color: node.color || t.accent,
                    fontSize: 10,
                  }}
                >
                  Copy
                </button>
              </div>
              <textarea
                value={node.content}
                onChange={(e) => updateNode(node.id, { content: e.target.value })}
                spellCheck={false}
                placeholder="// Local code snippet..."
                style={{
                  flex: 1,
                  minHeight: 110,
                  width: "100%",
                  resize: "none",
                  background: "rgba(0,0,0,0.28)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 8,
                  padding: 8,
                  color: "inherit",
                  fontFamily: "'Fira Code', 'Consolas', monospace",
                  fontSize: 11,
                  lineHeight: 1.5,
                  outline: "none",
                }}
              />
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
          const localProgress = Math.max(
            0,
            Math.min(100, Number(node.progress ?? 0)),
          );
          return (
            <div className="node-interactive w-full h-full p-2 flex flex-col gap-2">
              <div style={{ fontSize: 10, opacity: 0.65, fontWeight: 700 }}>
                Local Task (oder verknüpfen)
              </div>
              <select
                className="bg-white/10 text-xs p-1.5 rounded outline-none w-full"
                value={node.linkedTaskId || ""}
                onChange={(e) =>
                  updateNode(node.id, { linkedTaskId: e.target.value })
                }
              >
                <option value="">Local Task</option>
                {app.tasks.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title}
                  </option>
                ))}
              </select>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                <select
                  value={node.status || "todo"}
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
                type="date"
                value={node.dueDate ? node.dueDate.slice(0, 10) : ""}
                onChange={(e) => updateNode(node.id, { dueDate: e.target.value })}
                style={fieldStyle}
              />
              <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 6, alignItems: "center" }}>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={localProgress}
                  onChange={(e) =>
                    updateNode(node.id, { progress: Number(e.target.value) })
                  }
                  style={{ width: "100%" }}
                />
                <span style={{ fontSize: 10, fontWeight: 700, color: nodeAccent }}>
                  {localProgress}%
                </span>
              </div>
              <textarea
                value={node.content}
                onChange={(e) => updateNode(node.id, { content: e.target.value })}
                placeholder="Aktion, Kontext, nächste Schritte..."
                style={{
                  flex: 1,
                  minHeight: 84,
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
            <div className="node-interactive w-full h-full p-2 flex flex-col gap-2">
              <div style={{ fontSize: 10, opacity: 0.65, fontWeight: 700 }}>
                Local Reminder (oder verknüpfen)
              </div>
              <select
                className="bg-white/10 text-xs p-1.5 rounded outline-none w-full"
                value={node.linkedReminderId || ""}
                onChange={(e) =>
                  updateNode(node.id, { linkedReminderId: e.target.value })
                }
              >
                <option value="">Local Reminder</option>
                {app.reminders.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.title}
                  </option>
                ))}
              </select>
              <input
                type="datetime-local"
                value={
                  node.dueDate
                    ? new Date(node.dueDate).toISOString().slice(0, 16)
                    : ""
                }
                onChange={(e) =>
                  updateNode(node.id, {
                    dueDate: e.target.value
                      ? new Date(e.target.value).toISOString()
                      : undefined,
                  })
                }
                style={fieldStyle}
              />
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 7,
                  fontSize: 11,
                  opacity: 0.88,
                }}
              >
                <input
                  type="checkbox"
                  checked={node.status === "done"}
                  onChange={(e) =>
                    updateNode(node.id, {
                      status: e.target.checked ? "done" : "todo",
                    })
                  }
                  style={{ accentColor: nodeAccent }}
                />
                Erledigt
              </label>
              <textarea
                value={node.content}
                onChange={(e) => updateNode(node.id, { content: e.target.value })}
                placeholder="Reminder-Notiz oder kurze Message..."
                style={{
                  flex: 1,
                  minHeight: 92,
                  width: "100%",
                  resize: "none",
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 8,
                  padding: 8,
                  color: "inherit",
                  fontSize: 11,
                  lineHeight: 1.45,
                  outline: "none",
                }}
              />
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

  const TypeIcon = widgetPreset?.icon || Type;

  return (
    <div
      className="nx-canvas-node"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
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

export { NodeWidget };
