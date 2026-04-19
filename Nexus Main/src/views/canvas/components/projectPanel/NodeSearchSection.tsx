import React from "react";
import { Search } from "lucide-react";
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
};

export function NodeSearchSection({
  accent,
  searchQuery,
  setSearchQuery,
  searchedNodes,
  bulkSelected,
  bulkToggle,
  jumpToNode,
}: NodeSearchSectionProps) {
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
        <Search size={12} style={{ opacity: 0.7 }} />
        <div style={{ fontSize: 11, fontWeight: 700 }}>Find / Jump to Node</div>
      </div>
      <input
        value={searchQuery}
        onChange={(event) => setSearchQuery(event.target.value)}
        placeholder="Titel, Typ, Tag oder Inhalt…"
        style={{
          width: "100%",
          fontSize: 11,
          padding: "7px 8px",
          borderRadius: 8,
          background: "rgba(255,255,255,0.08)",
          border: "1px solid rgba(255,255,255,0.14)",
          color: "inherit",
          marginBottom: 8,
        }}
      />
      <div style={{ maxHeight: 162, overflow: "auto", display: "flex", flexDirection: "column", gap: 6 }}>
        {searchedNodes.length === 0 ? (
          <div style={{ fontSize: 11, opacity: 0.55 }}>Keine Treffer.</div>
        ) : (
          searchedNodes.map((node) => {
            const checked = Boolean(bulkSelected[node.id]);
            return (
              <div
                key={node.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 7,
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 8,
                  background: "rgba(255,255,255,0.04)",
                  padding: "5px 7px",
                }}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => bulkToggle(node.id)}
                  style={{ width: 12, height: 12, accentColor: accent, cursor: "pointer" }}
                />
                <button
                  onClick={() => jumpToNode(node.id)}
                  style={{
                    flex: 1,
                    textAlign: "left",
                    border: "none",
                    background: "transparent",
                    color: "inherit",
                    cursor: "pointer",
                    minWidth: 0,
                  }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      overflow: "hidden",
                      whiteSpace: "nowrap",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {node.title || "Untitled"}
                  </div>
                  <div style={{ fontSize: 10, opacity: 0.58 }}>{formatNodeMeta(node)}</div>
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
