import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Copy, Download, FolderOpen, MoreVertical, Search, Trash2 } from "lucide-react";
import {
  formatDevToolsArtifactKind,
  summarizeDevToolsArtifact,
  type DevToolsArtifact,
  type DevToolsArtifactKind,
} from "@nexus/core/devtools";
import { SurfaceHighlight } from "../../components/render/SurfaceHighlight";
import { useInteractiveSurfaceMotion } from "../../render/useInteractiveSurfaceMotion";
import { useTheme } from "../../store/themeStore";
import { hexToRgb } from "../../lib/utils";

type DevToolsArtifactLibraryPanelProps = {
  artifacts: DevToolsArtifact[];
  onLoad: (artifact: DevToolsArtifact) => void;
  onCopy: (artifact: DevToolsArtifact) => void;
  onDownload: (artifact: DevToolsArtifact) => void;
  onDelete: (artifactId: string) => void;
};

function ArtifactRow({
  artifact,
  onLoad,
  onCopy,
  onDownload,
  onDelete,
}: {
  artifact: DevToolsArtifact;
  onLoad: () => void;
  onCopy: () => void;
  onDownload: () => void;
  onDelete: () => void;
}) {
  const t = useTheme();
  const rgb = hexToRgb(t.accent);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [pressed, setPressed] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const interaction = useInteractiveSurfaceMotion({
    id: `devtools-artifact-${artifact.id}`,
    hovered,
    focused,
    selected: menuOpen,
    pressed,
    surfaceClass: "utility-surface",
    effectClass: "status-highlight",
    budgetPriority: menuOpen ? "high" : "normal",
    areaHint: 90,
    family: "content",
  });

  return (
    <motion.div
      initial={false}
      animate={interaction.content.animate}
      transition={interaction.content.transition}
      className="nx-devtools-artifact-row"
      style={{ position: "relative", borderRadius: 9, marginBottom: 6 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => {
        setHovered(false);
        setPressed(false);
      }}
      onFocusCapture={() => setFocused(true)}
      onBlurCapture={() => setFocused(false)}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
    >
      <SurfaceHighlight highlight={interaction.highlight} inset={1} radius={9}>
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: 9,
            border: `1px solid rgba(${rgb},0.24)`,
            background:
              "linear-gradient(140deg, rgba(255,255,255,0.09), rgba(255,255,255,0.03))",
          }}
        />
      </SurfaceHighlight>
      <div
        style={{
          borderRadius: 10,
          border: "1px solid rgba(255,255,255,0.1)",
          background: "rgba(255,255,255,0.03)",
          padding: "8px 10px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
            marginBottom: 6,
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {artifact.title}
            </div>
            <div style={{ fontSize: 9, opacity: 0.55 }}>
              {formatDevToolsArtifactKind(artifact.kind)} ·{" "}
              {summarizeDevToolsArtifact(artifact)}
            </div>
          </div>
          <button
            onClick={() => setMenuOpen((prev) => !prev)}
            aria-expanded={menuOpen}
            title="Artifact actions"
            className="nx-interactive nx-bounce-target"
            style={{
              background: "none",
              border: "none",
              color: "inherit",
              opacity: 0.55,
              cursor: "pointer",
              padding: "4px",
              borderRadius: 5,
              display: "grid",
              placeItems: "center",
            }}
          >
            <MoreVertical size={13} />
          </button>
        </div>
        {menuOpen ? (
          <div style={{ display: "grid", gap: 4 }}>
            <button
              onClick={onLoad}
              className="nx-interactive nx-bounce-target nx-menu-item"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 8px",
                borderRadius: 7,
                border: "1px solid rgba(255,255,255,0.1)",
                background: "rgba(255,255,255,0.04)",
                cursor: "pointer",
                fontSize: 10,
                fontWeight: 650,
                color: "inherit",
              }}
            >
              <FolderOpen size={11} /> Load
            </button>
            <div style={{ display: "flex", gap: 4 }}>
              <button
                onClick={onCopy}
                className="nx-interactive nx-bounce-target"
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 5,
                  padding: "6px 8px",
                  borderRadius: 7,
                  border: "1px solid rgba(255,255,255,0.1)",
                  background: "rgba(255,255,255,0.04)",
                  cursor: "pointer",
                  fontSize: 10,
                  fontWeight: 650,
                  color: "inherit",
                }}
              >
                <Copy size={11} /> Copy
              </button>
              <button
                onClick={onDownload}
                className="nx-interactive nx-bounce-target"
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 5,
                  padding: "6px 8px",
                  borderRadius: 7,
                  border: "1px solid rgba(255,255,255,0.1)",
                  background: "rgba(255,255,255,0.04)",
                  cursor: "pointer",
                  fontSize: 10,
                  fontWeight: 650,
                  color: "inherit",
                }}
              >
                <Download size={11} /> JSON
              </button>
            </div>
            <button
              onClick={onDelete}
              className="nx-interactive nx-bounce-target"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 5,
                padding: "6px 8px",
                borderRadius: 7,
                border: "1px solid rgba(255,69,58,0.35)",
                background: "rgba(255,69,58,0.1)",
                cursor: "pointer",
                fontSize: 10,
                fontWeight: 650,
                color: "#ff7b72",
              }}
            >
              <Trash2 size={11} /> Delete
            </button>
          </div>
        ) : (
          <button
            onClick={onLoad}
            className="nx-interactive nx-bounce-target"
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              padding: "6px 8px",
              borderRadius: 7,
              border: "1px solid rgba(255,255,255,0.1)",
              background: "rgba(255,255,255,0.04)",
              cursor: "pointer",
              fontSize: 10,
              fontWeight: 650,
              color: "inherit",
            }}
          >
            <FolderOpen size={11} /> Open Artifact
          </button>
        )}
      </div>
    </motion.div>
  );
}

export function DevToolsArtifactLibraryPanel({
  artifacts,
  onLoad,
  onCopy,
  onDownload,
  onDelete,
}: DevToolsArtifactLibraryPanelProps) {
  const [filter, setFilter] = useState<"all" | DevToolsArtifactKind>("all");
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return artifacts.filter((artifact) => {
      if (filter !== "all" && artifact.kind !== filter) return false;
      if (!normalizedQuery) return true;
      const haystack = [
        artifact.title,
        artifact.description,
        artifact.kind,
        summarizeDevToolsArtifact(artifact),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [artifacts, filter, query]);

  return (
    <div className="nx-devtools-artifact-library" style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div
        style={{
          padding: "10px 10px 6px",
          display: "flex",
          flexDirection: "column",
          gap: 8,
          borderBottom: "1px solid rgba(255,255,255,0.07)",
        }}
      >
        <span
          style={{
            fontSize: 10,
            fontWeight: 800,
            opacity: 0.4,
            textTransform: "uppercase",
            letterSpacing: 1,
          }}
        >
          Saved Artifacts
        </span>
        <label
          className="nx-devtools-artifact-search"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 8,
            background: "rgba(255,255,255,0.045)",
            padding: "6px 8px",
          }}
        >
          <Search size={12} opacity={0.58} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search saved work"
            style={{
              flex: 1,
              minWidth: 0,
              border: "none",
              outline: "none",
              background: "transparent",
              color: "inherit",
              fontSize: 11,
            }}
          />
        </label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
          {(["all", "recipe", "snippet", "component", "preset", "prototype"] as const).map(
            (option) => (
              <button
                key={option}
                onClick={() => setFilter(option)}
                style={{
                  padding: "3px 7px",
                  borderRadius: 6,
                  border:
                    filter === option
                      ? "1px solid rgba(255,255,255,0.25)"
                      : "1px solid rgba(255,255,255,0.1)",
                  background:
                    filter === option
                      ? "rgba(255,255,255,0.12)"
                      : "rgba(255,255,255,0.04)",
                  cursor: "pointer",
                  fontSize: 9,
                  fontWeight: 700,
                  color: "inherit",
                  textTransform: "capitalize",
                }}
              >
                {option}
              </button>
            ),
          )}
        </div>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "7px 6px" }}>
        {filtered.length === 0 ? (
          <div
            style={{
              borderRadius: 10,
              border: "1px dashed rgba(255,255,255,0.16)",
              background: "rgba(255,255,255,0.03)",
              padding: 12,
              fontSize: 11,
              opacity: 0.7,
              lineHeight: 1.5,
            }}
          >
            {artifacts.length === 0
              ? "Noch keine gespeicherten Artefakte. Speichere Snippets, Recipes oder Presets direkt aus dem Builder."
              : "Keine Artefakte fuer diesen Filter gefunden."}
          </div>
        ) : (
          filtered.map((artifact) => (
            <ArtifactRow
              key={artifact.id}
              artifact={artifact}
              onLoad={() => onLoad(artifact)}
              onCopy={() => onCopy(artifact)}
              onDownload={() => onDownload(artifact)}
              onDelete={() => onDelete(artifact.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}

