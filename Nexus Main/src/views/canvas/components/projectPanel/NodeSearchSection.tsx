import React from "react";
import { Search, X } from "lucide-react";
import { type CanvasNode } from "../../../../store/canvasStore";
import { formatNodeMeta } from "./helpers";

type NodeSearchSectionProps = {
  accent: string;
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  searchedNodes: CanvasNode[];
  bulkSelected: Record<string, true>;
  bulkToggle: (nodeId: string) => void;
  jumpToNode: (nodeId: string) => void;
  searchInputRef?: React.RefObject<HTMLInputElement | null>;
  totalNodeCount: number;
};

export function NodeSearchSection({
  accent,
  searchQuery,
  setSearchQuery,
  searchedNodes,
  bulkSelected,
  bulkToggle,
  jumpToNode,
  searchInputRef,
  totalNodeCount,
}: NodeSearchSectionProps) {
  const hasQuery = searchQuery.trim().length > 0;
  const resultLabel = hasQuery
    ? `${searchedNodes.length}/${totalNodeCount} matches`
    : `${searchedNodes.length}/${totalNodeCount} shown`;

  return (
    <section className="nx-canvas-project-section">
      <div className="nx-canvas-project-section-title">
        <Search size={12} />
        <span>Search</span>
        <small>{resultLabel}</small>
      </div>
      <label className="nx-canvas-project-search-box">
        <Search size={13} />
        <input
          ref={searchInputRef}
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Title, type, tag, owner, content..."
          className="nx-canvas-project-input"
        />
        {hasQuery ? (
          <button
            type="button"
            onClick={() => setSearchQuery("")}
            title="Suche leeren"
            aria-label="Suche leeren"
          >
            <X size={12} />
          </button>
        ) : null}
      </label>
      <div className="nx-canvas-project-result-list">
        {searchedNodes.length === 0 ? (
          <div className="nx-canvas-project-empty">Keine Treffer.</div>
        ) : (
          searchedNodes.map((node) => {
            const checked = Boolean(bulkSelected[node.id]);
            return (
              <div key={node.id} className="nx-canvas-project-result">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => bulkToggle(node.id)}
                  className="nx-canvas-project-result-check"
                  style={{ accentColor: accent }}
                  aria-label={`${node.title || "Untitled"} fuer Bulk Edit markieren`}
                />
                <button
                  type="button"
                  onClick={() => jumpToNode(node.id)}
                  className="nx-canvas-project-result-button"
                >
                  <strong>{node.title || "Untitled"}</strong>
                  <span>{formatNodeMeta(node)}</span>
                  {(node.owner || node.tags?.length) ? (
                    <small>
                      {[node.owner ? `owner: ${node.owner}` : "", ...(node.tags || []).slice(0, 2)]
                        .filter(Boolean)
                        .join(" / ")}
                    </small>
                  ) : null}
                </button>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
