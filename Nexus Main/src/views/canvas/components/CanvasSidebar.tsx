import React, { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, FileText, Link2, Plus, Search, Trash2 } from "lucide-react";
import { Glass } from "../../../components/Glass";
import type { Canvas } from "../../../store/canvasStore";

export function CanvasSidebar({
  visible,
  mode,
  accent,
  rgb,
  canvases,
  activeCanvasId,
  activeCanvas,
  addCanvas,
  setActiveCanvas,
  deleteCanvas,
}: {
  visible: boolean;
  mode: "dark" | "light";
  accent: string;
  rgb: string;
  canvases: Canvas[];
  activeCanvasId: string | null;
  activeCanvas: Canvas | null | undefined;
  addCanvas: () => void;
  setActiveCanvas: (id: string) => void;
  deleteCanvas: (id: string) => void;
}) {
  const [canvasQuery, setCanvasQuery] = useState("");

  const canvasStats = useMemo(() => {
    return new Map(
      canvases.map((entry) => {
        const done = entry.nodes.filter((node) => node.status === "done").length;
        const blocked = entry.nodes.filter((node) => node.status === "blocked").length;
        const critical = entry.nodes.filter((node) => node.priority === "critical").length;
        return [entry.id, { done, blocked, critical }];
      }),
    );
  }, [canvases]);

  const filteredCanvases = useMemo(() => {
    const query = canvasQuery.trim().toLowerCase();
    if (!query) return canvases;

    return canvases.filter((entry) => {
      const searchable = [
        entry.name,
        ...entry.nodes.flatMap((node) => [
          node.title,
          node.type,
          node.status,
          node.priority,
          node.owner,
          ...(node.tags || []),
        ]),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return searchable.includes(query);
    });
  }, [canvasQuery, canvases]);

  const totalNodes = canvases.reduce((sum, entry) => sum + entry.nodes.length, 0);
  const totalLinks = canvases.reduce((sum, entry) => sum + entry.connections.length, 0);
  const activeStats = activeCanvas ? canvasStats.get(activeCanvas.id) : null;

  if (!visible) return null;

  return (
    <Glass
      type="panel"
      className="nx-canvas-sidebar shrink-0"
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        borderRight: `1px solid ${
          mode === "dark" ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)"
        }`,
        borderRadius: 0,
        ["--nx-canvas-sidebar-rgb" as any]: rgb,
        ["--nx-canvas-sidebar-accent" as any]: accent,
      }}
    >
      <div className="nx-canvas-sidebar-shell">
        <header className="nx-canvas-sidebar-header">
          <div className="nx-canvas-sidebar-title">
            <FileText size={14} />
            <span>Canvas Library</span>
          </div>
          <button
            type="button"
            onClick={addCanvas}
            className="nx-interactive nx-bounce-target nx-canvas-sidebar-add"
            title="Neues Canvas"
            aria-label="Neues Canvas erstellen"
          >
            <Plus size={14} />
            <span>New</span>
          </button>
        </header>

        <div className="nx-canvas-sidebar-overview">
          <span>
            <strong>{canvases.length}</strong>
            <small>Canvases</small>
          </span>
          <span>
            <strong>{totalNodes}</strong>
            <small>Nodes</small>
          </span>
          <span>
            <strong>{totalLinks}</strong>
            <small>Links</small>
          </span>
        </div>

        <label className="nx-canvas-sidebar-search">
          <Search size={13} />
          <input
            value={canvasQuery}
            onChange={(event) => setCanvasQuery(event.target.value)}
            placeholder="Search library..."
            aria-label="Canvas Library durchsuchen"
          />
        </label>

        <div className="nx-canvas-sidebar-list">
          {filteredCanvases.length === 0 ? (
            <div className="nx-canvas-sidebar-empty">No canvases match.</div>
          ) : (
            filteredCanvases.map((entry) => {
            const active = entry.id === activeCanvasId;
            const stats = canvasStats.get(entry.id);
            return (
              <div
                key={entry.id}
                role="button"
                tabIndex={0}
                onClick={() => setActiveCanvas(entry.id)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    setActiveCanvas(entry.id);
                  }
                }}
                className="nx-surface-row nx-canvas-sidebar-item"
                data-active={active ? "true" : "false"}
                title={entry.name}
                style={{
                  ["--nx-row-hover-bg" as any]: `rgba(${rgb},0.1)`,
                }}
              >
                <span className="nx-canvas-sidebar-item-main">
                  <strong>{entry.name || "Untitled Canvas"}</strong>
                  <small>
                    {entry.nodes.length} nodes / {entry.connections.length} links
                  </small>
                  <span className="nx-canvas-sidebar-status-row">
                    <span title="Done nodes">
                      <CheckCircle2 size={10} />
                      {stats?.done ?? 0}
                    </span>
                    {(stats?.blocked ?? 0) > 0 ? (
                      <span title="Blocked nodes" data-tone="danger">
                        <AlertTriangle size={10} />
                        {stats?.blocked}
                      </span>
                    ) : null}
                    {(stats?.critical ?? 0) > 0 ? (
                      <span title="Critical priority" data-tone="warning">
                        critical {stats?.critical}
                      </span>
                    ) : null}
                    {entry.connections.length > 0 ? (
                      <span title="Links">
                        <Link2 size={10} />
                        {entry.connections.length}
                      </span>
                    ) : null}
                  </span>
                </span>
                <span className="nx-canvas-sidebar-count">{entry.nodes.length}</span>
                <button
                  type="button"
                  className="nx-interactive nx-bounce-target nx-canvas-sidebar-delete"
                  onClick={(event) => {
                    event.stopPropagation();
                    if (confirm(`Canvas "${entry.name}" loeschen?`)) deleteCanvas(entry.id);
                  }}
                  aria-label={`${entry.name} loeschen`}
                  title="Canvas loeschen"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            );
          })
          )}
        </div>

        <footer className="nx-canvas-sidebar-footer">
          <span title={activeCanvas?.name || "No active canvas"}>Active</span>
          <strong>
            {activeCanvas?.nodes.length ?? 0} nodes / {activeCanvas?.connections.length ?? 0} links
            {activeStats && activeStats.blocked > 0 ? ` / ${activeStats.blocked} blocked` : ""}
          </strong>
        </footer>
      </div>
    </Glass>
  );
}
