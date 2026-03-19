import React from "react";
import { hexToRgb } from "../../lib/utils";

function CanvasMagicList({
  content,
  accent,
}: {
  content: string;
  accent: string;
}) {
  const rgb = hexToRgb(accent);
  return (
    <div
      style={{
        margin: "6px 0",
        borderRadius: 8,
        overflow: "hidden",
        border: `1px solid rgba(${rgb},0.2)`,
      }}
    >
      {content
        .trim()
        .split("\n")
        .filter(Boolean)
        .map((row, i) => {
          const [label, detail] = row.split("|").map((s) => s.trim());
          return (
            <div
              key={i}
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "5px 8px",
                fontSize: 10,
                background: i % 2 === 0 ? `rgba(${rgb},0.06)` : "transparent",
              }}
            >
              <span style={{ fontWeight: 600 }}>{label}</span>
              {detail && <span style={{ opacity: 0.55 }}>{detail}</span>}
            </div>
          );
        })}
    </div>
  );
}

function CanvasMagicProgress({
  content,
  accent,
}: {
  content: string;
  accent: string;
}) {
  const rgb = hexToRgb(accent);
  return (
    <div
      style={{
        margin: "6px 0",
        display: "flex",
        flexDirection: "column",
        gap: 5,
      }}
    >
      {content
        .trim()
        .split("\n")
        .filter(Boolean)
        .map((row, i) => {
          const [label, pct] = row.split("|").map((s) => s.trim());
          const val = Math.min(100, Math.max(0, Number(pct) || 0));
          return (
            <div key={i}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 9,
                  marginBottom: 2,
                  opacity: 0.7,
                }}
              >
                <span>{label}</span>
                <span>{val}%</span>
              </div>
              <div
                style={{
                  height: 4,
                  borderRadius: 2,
                  background: `rgba(${rgb},0.15)`,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${val}%`,
                    height: "100%",
                    background: `rgba(${rgb},0.8)`,
                    borderRadius: 2,
                  }}
                />
              </div>
            </div>
          );
        })}
    </div>
  );
}

function CanvasMagicAlert({ content }: { content: string }) {
  const lines = content.trim().split("\n");
  const type = lines[0]?.trim().toLowerCase() || "info";
  const msg = lines.slice(1).join(" ").trim();
  const colors: Record<string, string> = {
    info: "#007AFF",
    success: "#30D158",
    warning: "#FF9F0A",
    error: "#FF453A",
  };
  const c = colors[type] || colors.info;
  return (
    <div
      style={{
        margin: "6px 0",
        padding: "6px 8px",
        borderRadius: 6,
        background: `${c}15`,
        border: `1px solid ${c}40`,
        fontSize: 10,
        color: c,
      }}
    >
      <strong style={{ textTransform: "capitalize" }}>{type}:</strong> {msg}
    </div>
  );
}

function CanvasMagicTimeline({
  content,
  accent,
}: {
  content: string;
  accent: string;
}) {
  const rgb = hexToRgb(accent);
  const rows = content.trim().split("\n").filter(Boolean);
  return (
    <div
      style={{
        margin: "8px 0",
        paddingLeft: 10,
        borderLeft: `2px solid rgba(${rgb},0.35)`,
      }}
    >
      {rows.map((row, i) => {
        const [when, what] = row.split("|").map((s) => s.trim());
        return (
          <div
            key={i}
            style={{ position: "relative", paddingLeft: 12, marginBottom: 8 }}
          >
            <div
              style={{
                position: "absolute",
                left: -6,
                top: 2,
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: i === 0 ? accent : `rgba(${rgb},0.35)`,
                boxShadow: i === 0 ? `0 0 8px ${accent}` : "none",
              }}
            />
            <div
              style={{
                fontSize: 9,
                opacity: 0.6,
                color: accent,
                fontWeight: 700,
              }}
            >
              {when}
            </div>
            <div style={{ fontSize: 10, lineHeight: 1.45 }}>{what}</div>
          </div>
        );
      })}
    </div>
  );
}

function CanvasMagicGrid({
  content,
  accent,
}: {
  content: string;
  accent: string;
}) {
  const rgb = hexToRgb(accent);
  const lines = content.trim().split("\n").filter(Boolean);
  const cols = Math.max(1, Math.min(4, Number(lines[0]) || 2));
  const items = lines.slice(1);
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${cols}, minmax(0,1fr))`,
        gap: 6,
        margin: "6px 0",
      }}
    >
      {items.map((item, i) => (
        <div
          key={i}
          style={{
            borderRadius: 6,
            border: `1px solid rgba(${rgb},0.2)`,
            background: `rgba(${rgb},0.08)`,
            padding: "6px 8px",
            fontSize: 10,
            lineHeight: 1.4,
          }}
        >
          {item}
        </div>
      ))}
    </div>
  );
}

function CanvasMagicCard({
  content,
  accent,
}: {
  content: string;
  accent: string;
}) {
  const rgb = hexToRgb(accent);
  const [title, desc, meta] = content
    .trim()
    .split("|")
    .map((s) => s.trim());
  return (
    <div
      style={{
        margin: "6px 0",
        borderRadius: 8,
        border: `1px solid rgba(${rgb},0.26)`,
        background: `linear-gradient(145deg, rgba(${rgb},0.18), rgba(${rgb},0.06))`,
        padding: "8px 9px",
      }}
    >
      <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 3 }}>
        {title || "Card"}
      </div>
      {desc && (
        <div style={{ fontSize: 10, opacity: 0.8, lineHeight: 1.45 }}>
          {desc}
        </div>
      )}
      {meta && (
        <div style={{ marginTop: 5, fontSize: 9, opacity: 0.6 }}>{meta}</div>
      )}
    </div>
  );
}

function CanvasMagicKanban({
  content,
  accent,
}: {
  content: string;
  accent: string;
}) {
  const rgb = hexToRgb(accent);
  const lines = content.trim().split("\n").filter(Boolean);
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 4,
        margin: "6px 0",
      }}
    >
      {lines.map((row, i) => {
        const [lane, task] = row.split("|").map((s) => s.trim());
        return (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: 10,
              borderRadius: 6,
              padding: "5px 6px",
              border: `1px solid rgba(${rgb},0.2)`,
              background: `rgba(${rgb},0.07)`,
            }}
          >
            <span
              style={{
                fontSize: 9,
                padding: "1px 6px",
                borderRadius: 999,
                background: `rgba(${rgb},0.2)`,
                color: accent,
                fontWeight: 700,
              }}
            >
              {lane}
            </span>
            <span style={{ opacity: 0.84 }}>{task}</span>
          </div>
        );
      })}
    </div>
  );
}

export function CanvasNexusCodeBlock({
  className,
  children,
  accent,
}: {
  className?: string;
  children: React.ReactNode;
  accent: string;
}) {
  const lang = (className || "").replace("language-", "");
  const raw = Array.isArray(children)
    ? children.join("")
    : String(children ?? "");
  const content = raw.replace(/\n$/, "");
  if (lang === "nexus-list")
    return <CanvasMagicList content={content} accent={accent} />;
  if (lang === "nexus-alert") return <CanvasMagicAlert content={content} />;
  if (lang === "nexus-progress")
    return <CanvasMagicProgress content={content} accent={accent} />;
  if (lang === "nexus-timeline")
    return <CanvasMagicTimeline content={content} accent={accent} />;
  if (lang === "nexus-grid")
    return <CanvasMagicGrid content={content} accent={accent} />;
  if (lang === "nexus-card")
    return <CanvasMagicCard content={content} accent={accent} />;
  if (lang === "nexus-kanban")
    return <CanvasMagicKanban content={content} accent={accent} />;
  return (
    <pre
      style={{
        fontSize: 10,
        opacity: 0.7,
        overflow: "auto",
        padding: "4px 6px",
        background: "rgba(0,0,0,0.2)",
        borderRadius: 6,
      }}
    >
      <code>{content}</code>
    </pre>
  );
}
