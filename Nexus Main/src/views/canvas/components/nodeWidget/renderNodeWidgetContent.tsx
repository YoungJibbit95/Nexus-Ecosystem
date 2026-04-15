import React from "react";
import {
  Bell,
  Calendar,
  CheckSquare,
  Copy,
  FileText,
  Flag,
  Image,
  Plus,
  Unlink,
  X,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  CanvasNexusCodeBlock,
  CanvasNexusInlineCode,
} from "@nexus/core/canvas/CanvasMagicRenderers";
import {
  CANVAS_MAGIC_HUB_QUICK_ACTIONS,
  type CanvasMagicHubQuickActionId,
} from "@nexus/core/canvas/magicHubTemplates";
import { renderNodeWidgetTaskAndPlanningContent } from "./renderNodeWidgetTaskAndPlanningContent";
import type { Theme } from "../../../../store/themeStore";
import type {
  CodeFile,
  Note,
  Reminder,
  Task,
} from "../../../../store/appStore";
import type { CanvasNode } from "../../../../store/canvasStore";

const HUB_ACTION_ICONS = {
  note: FileText,
  task: CheckSquare,
  decision: Flag,
  risk: Bell,
} as const;

export type NodeWidgetAppSlice = {
  notes: Note[];
  tasks: Task[];
  codes: CodeFile[];
  reminders: Reminder[];
  setNote: (id: string) => void;
  updateTask: (id: string, patch: Partial<Task>) => void;
  updateReminder: (id: string, patch: Partial<Reminder>) => void;
};

export type NodeWidgetContentArgs = {
  node: CanvasNode;
  theme: Theme;
  app: NodeWidgetAppSlice;
  rgb: string;
  nodeAccent: string;
  isSticky: boolean;
  fieldStyle: React.CSSProperties;
  editingContent: boolean;
  setEditingContent: React.Dispatch<React.SetStateAction<boolean>>;
  newCheckItem: string;
  setNewCheckItem: React.Dispatch<React.SetStateAction<string>>;
  updateNode: (id: string, patch: Partial<CanvasNode>) => void;
  addChecklistItem: (nodeId: string, text: string) => void;
  toggleChecklistItem: (nodeId: string, itemId: string) => void;
  deleteChecklistItem: (nodeId: string, itemId: string) => void;
  replaceMarkdownCodeBlock: (
    mdNode: any,
    className: string | undefined,
    rawChildren: React.ReactNode,
    nextBlockContent: string,
  ) => void;
  isMagicHub: boolean;
  onHubQuickAction?: (
    node: CanvasNode,
    action: CanvasMagicHubQuickActionId,
  ) => void;
};

export function renderNodeWidgetContent(args: NodeWidgetContentArgs): React.ReactNode {
  const {
    node,
    theme,
    app,
    rgb,
    nodeAccent,
    isSticky,
    fieldStyle,
    editingContent,
    setEditingContent,
    newCheckItem,
    setNewCheckItem,
    updateNode,
    addChecklistItem,
    toggleChecklistItem,
    deleteChecklistItem,
    replaceMarkdownCodeBlock,
    isMagicHub,
    onHubQuickAction,
  } = args;
  const t = theme;
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

      default:
        return renderNodeWidgetTaskAndPlanningContent(args);
    }
}
