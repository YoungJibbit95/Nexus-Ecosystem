import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Copy, Download, FolderOpen, Trash2 } from "lucide-react";
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
  const rowRef = useRef<HTMLDivElement | null>(null);
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

  useEffect(() => {
    if (!menuOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (rowRef.current?.contains(target)) return;
      setMenuOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("pointerdown", onPointerDown, true);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown, true);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  return (
    <motion.div
      ref={rowRef}
      initial={false}
      animate={interaction.content.animate}
      transition={interaction.content.transition}
      style={{ position: "relative", borderRadius: 10, marginBottom: 6 }}
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
            className="nx-interactive nx-bounce-target"
            style={{
              background: "none",
              border: "none",
              color: "inherit",
              opacity: 0.55,
              cursor: "pointer",
              fontSize: 10,
              padding: "2px 4px",
              borderRadius: 5,
            }}
          >
            More
          </button>
        </div>
        {menuOpen ? (
          <div style={{ display: "grid", gap: 4 }}>
            <button
              onClick={() => {
                setMenuOpen(false);
                onLoad();
              }}
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
                onClick={() => {
                  setMenuOpen(false);
                  onCopy();
                }}
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
                onClick={() => {
                  setMenuOpen(false);
                  onDownload();
                }}
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
              onClick={() => {
                setMenuOpen(false);
                onDelete();
              }}
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
  const filtered = useMemo(() => {
    if (filter === "all") return artifacts;
    return artifacts.filter((artifact) => artifact.kind === filter);
  }, [artifacts, filter]);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
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
            Noch keine gespeicherten Artefakte. Speichere Snippets, Recipes oder
            Presets direkt aus dem Builder.
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
