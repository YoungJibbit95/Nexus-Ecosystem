/** @jsxRuntime classic */
/** @jsx h */
/** @jsxFrag Fragment */

import { useEffect, useMemo, useState } from "react";
import {
  CanvasMagicAlert,
  CanvasMagicCard,
  CanvasMagicGrid,
  CanvasMagicKanban,
  CanvasMagicTimeline,
} from './CanvasMagicBlocksA';
import {
  CanvasMagicMetrics,
  CanvasMagicQuadrant,
  CanvasMagicSteps,
} from './CanvasMagicBlocksB';


type ReactNode = any;

const Fragment = Symbol.for("react.fragment");
const h = (type: any, props: any, ...children: any[]) => ({
  $$typeof: Symbol.for("react.element"),
  type,
  key: props?.key ?? null,
  ref: props?.ref ?? null,
  props: {
    ...(props || {}),
    children: children.length <= 1 ? children[0] : children,
  },
  _owner: null,
});

declare namespace JSX {
  interface IntrinsicElements {
    [elemName: string]: any;
  }
}

const hexToRgb = (h: string) => {
  const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(h);
  return r
    ? `${parseInt(r[1], 16)},${parseInt(r[2], 16)},${parseInt(r[3], 16)}`
    : "0,0,0";
};

type MagicBlockProps = {
  content: string;
  accent: string;
  onChange?: (next: string) => void;
};

type MagicAction = {
  label: string;
  apply: (draft: string) => string;
};

function normalizeContent(value: string) {
  return value
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trimEnd();
}

function appendLine(base: string, line: string) {
  const clean = normalizeContent(base);
  return clean ? `${clean}\n${line}` : line;
}

function parsePipeRows(content: string) {
  return content
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((row) => {
      const [left = "", right = ""] = row.split("|").map((s) => s.trim());
      return { left, right };
    });
}

function joinPipeRows(rows: Array<{ left: string; right: string }>) {
  return normalizeContent(
    rows.map((row) => `${row.left} | ${row.right}`).join("\n"),
  );
}

function parseTripleRows(content: string) {
  return content
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((row) => {
      const [label = "", value = "", delta = ""] = row
        .split("|")
        .map((s) => s.trim());
      return { label, value, delta };
    });
}

function joinTripleRows(
  rows: Array<{ label: string; value: string; delta: string }>,
) {
  return normalizeContent(
    rows.map((row) => `${row.label} | ${row.value} | ${row.delta}`).join("\n"),
  );
}

function MagicShell({
  label,
  content,
  accent,
  onChange,
  actions,
  children,
}: {
  label: string;
  content: string;
  accent: string;
  onChange?: (next: string) => void;
  actions?: MagicAction[];
  children: ReactNode;
}) {
  const rgb = hexToRgb(accent);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(content);

  useEffect(() => {
    setDraft(content);
  }, [content]);

  const normalizedDraft = useMemo(() => normalizeContent(draft), [draft]);
  const canSave = normalizedDraft !== normalizeContent(content);

  const applyDraft = () => {
    if (!onChange) return;
    onChange(normalizedDraft);
    setEditing(false);
  };

  return (
    <div
      className="nx-magic-fade"
      style={{
        margin: "6px 0",
        borderRadius: 8,
        border: `1px solid rgba(${rgb},0.2)`,
        background: `linear-gradient(160deg, rgba(${rgb},0.09), rgba(${rgb},0.02))`,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 6,
          padding: "5px 7px",
          borderBottom: `1px solid rgba(${rgb},0.16)`,
          background: `rgba(${rgb},0.08)`,
        }}
      >
        <span
          style={{
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: 0.45,
            textTransform: "uppercase",
            opacity: 0.78,
            color: accent,
          }}
        >
          {label}
        </span>

        {onChange && (
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            {!editing &&
              (actions || []).slice(0, 2).map((action) => (
                <button
                  key={action.label}
                  className="node-interactive"
                  onClick={() =>
                    onChange(normalizeContent(action.apply(content)))
                  }
                  style={{
                    fontSize: 9,
                    borderRadius: 6,
                    border: `1px solid rgba(${rgb},0.32)`,
                    background: `rgba(${rgb},0.2)`,
                    color: accent,
                    padding: "2px 6px",
                    cursor: "pointer",
                    fontWeight: 600,
                  }}
                >
                  {action.label}
                </button>
              ))}
            <button
              className="node-interactive"
              onClick={() => setEditing((v) => !v)}
              style={{
                fontSize: 9,
                borderRadius: 6,
                border: `1px solid rgba(${rgb},0.35)`,
                background: editing ? accent : `rgba(${rgb},0.18)`,
                color: editing ? "#fff" : accent,
                padding: "2px 7px",
                cursor: "pointer",
                fontWeight: 700,
              }}
            >
              {editing ? "Preview" : "Edit"}
            </button>
          </div>
        )}
      </div>

      {editing && onChange ? (
        <div
          style={{
            padding: 7,
            display: "flex",
            flexDirection: "column",
            gap: 6,
          }}
        >
          <textarea
            className="node-interactive"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            spellCheck={false}
            style={{
              width: "100%",
              minHeight: 96,
              resize: "vertical",
              borderRadius: 7,
              border: `1px solid rgba(${rgb},0.24)`,
              background: "rgba(0,0,0,0.2)",
              color: "inherit",
              fontSize: 10,
              lineHeight: 1.5,
              padding: "7px 8px",
              outline: "none",
              fontFamily: "'Fira Code', monospace",
            }}
          />

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              gap: 5,
            }}
          >
            {(actions || []).map((action) => (
              <button
                key={action.label}
                className="node-interactive"
                onClick={() =>
                  setDraft((prev) => normalizeContent(action.apply(prev)))
                }
                style={{
                  fontSize: 9,
                  borderRadius: 6,
                  border: `1px solid rgba(${rgb},0.25)`,
                  background: "rgba(255,255,255,0.07)",
                  color: "inherit",
                  padding: "2px 6px",
                  cursor: "pointer",
                }}
              >
                {action.label}
              </button>
            ))}

            <div style={{ flex: 1 }} />

            <button
              className="node-interactive"
              onClick={() => {
                setDraft(content);
                setEditing(false);
              }}
              style={{
                fontSize: 9,
                borderRadius: 6,
                border: "1px solid rgba(255,255,255,0.22)",
                background: "rgba(255,255,255,0.08)",
                color: "inherit",
                padding: "2px 7px",
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              Cancel
            </button>
            <button
              className="node-interactive"
              onClick={applyDraft}
              disabled={!canSave}
              style={{
                fontSize: 9,
                borderRadius: 6,
                border: "none",
                background: canSave ? accent : "rgba(255,255,255,0.2)",
                color: "#fff",
                padding: "2px 8px",
                cursor: canSave ? "pointer" : "default",
                fontWeight: 700,
                opacity: canSave ? 1 : 0.6,
              }}
            >
              Apply
            </button>
          </div>
        </div>
      ) : (
        <div style={{ padding: "6px 7px" }}>{children}</div>
      )}
    </div>
  );
}

function CanvasMagicList({ content, accent, onChange }: MagicBlockProps) {
  const rgb = hexToRgb(accent);
  const rows = parsePipeRows(content);
  return (
    <div
      style={{
        borderRadius: 6,
        overflow: "hidden",
        border: `1px solid rgba(${rgb},0.18)`,
      }}
    >
      {rows.length === 0 && (
        <div style={{ fontSize: 10, opacity: 0.6, padding: "6px 8px" }}>
          Keine Einträge
        </div>
      )}
      {rows.map((row, i) => {
        const updateRow = (next: Partial<{ left: string; right: string }>) => {
          if (!onChange) return;
          const nextRows = [...rows];
          nextRows[i] = {
            left: next.left ?? nextRows[i].left,
            right: next.right ?? nextRows[i].right,
          };
          onChange(joinPipeRows(nextRows));
        };
        const removeRow = () => {
          if (!onChange) return;
          onChange(joinPipeRows(rows.filter((_, idx) => idx !== i)));
        };
        return (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "5px 8px",
              fontSize: 10,
              background: i % 2 === 0 ? `rgba(${rgb},0.06)` : "transparent",
            }}
          >
            {onChange ? (
              <>
                <input
                  className="node-interactive"
                  value={row.left}
                  onChange={(e) => updateRow({ left: e.target.value })}
                  placeholder="Label"
                  style={{
                    flex: 1,
                    minWidth: 0,
                    border: `1px solid rgba(${rgb},0.22)`,
                    borderRadius: 6,
                    background: "rgba(255,255,255,0.06)",
                    color: "inherit",
                    fontSize: 10,
                    padding: "3px 6px",
                    outline: "none",
                  }}
                />
                <input
                  className="node-interactive"
                  value={row.right}
                  onChange={(e) => updateRow({ right: e.target.value })}
                  placeholder="Wert"
                  style={{
                    width: 96,
                    border: `1px solid rgba(${rgb},0.22)`,
                    borderRadius: 6,
                    background: "rgba(255,255,255,0.06)",
                    color: "inherit",
                    fontSize: 10,
                    padding: "3px 6px",
                    outline: "none",
                  }}
                />
                <button
                  className="node-interactive"
                  onClick={removeRow}
                  style={{
                    border: "none",
                    borderRadius: 6,
                    background: "rgba(255,69,58,0.2)",
                    color: "#ff8b80",
                    cursor: "pointer",
                    fontSize: 10,
                    padding: "2px 6px",
                  }}
                >
                  ✕
                </button>
              </>
            ) : (
              <>
                <span style={{ fontWeight: 600 }}>{row.left}</span>
                {row.right && (
                  <span style={{ opacity: 0.6, textAlign: "right" }}>
                    {row.right}
                  </span>
                )}
              </>
            )}
          </div>
        );
      })}
      {onChange && (
        <div
          style={{
            padding: "6px 8px",
            borderTop: `1px solid rgba(${rgb},0.14)`,
          }}
        >
          <button
            className="node-interactive"
            onClick={() =>
              onChange(
                joinPipeRows([
                  ...rows,
                  { left: "Neuer Punkt", right: "Kontext" },
                ]),
              )
            }
            style={{
              border: `1px solid rgba(${rgb},0.3)`,
              borderRadius: 6,
              background: `rgba(${rgb},0.14)`,
              color: accent,
              cursor: "pointer",
              fontSize: 10,
              fontWeight: 700,
              padding: "3px 8px",
            }}
          >
            + Eintrag
          </button>
        </div>
      )}
    </div>
  );
}

function CanvasMagicProgress({ content, accent, onChange }: MagicBlockProps) {
  const rgb = hexToRgb(accent);
  const rows = parsePipeRows(content);
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 5,
      }}
    >
      {rows.length === 0 && (
        <div style={{ fontSize: 10, opacity: 0.6 }}>Keine Metriken</div>
      )}
      {rows.map((row, i) => {
        const val = Math.min(100, Math.max(0, Number(row.right) || 0));
        const updateRow = (next: Partial<{ left: string; right: string }>) => {
          if (!onChange) return;
          const nextRows = [...rows];
          nextRows[i] = {
            left: next.left ?? nextRows[i].left,
            right: next.right ?? nextRows[i].right,
          };
          onChange(joinPipeRows(nextRows));
        };
        const removeRow = () => {
          if (!onChange) return;
          onChange(joinPipeRows(rows.filter((_, idx) => idx !== i)));
        };
        return (
          <div key={i}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 9,
                marginBottom: 2,
                opacity: 0.74,
              }}
            >
              {onChange ? (
                <input
                  className="node-interactive"
                  value={row.left}
                  onChange={(e) => updateRow({ left: e.target.value })}
                  placeholder="Metrik"
                  style={{
                    flex: 1,
                    minWidth: 0,
                    border: `1px solid rgba(${rgb},0.22)`,
                    borderRadius: 6,
                    background: "rgba(255,255,255,0.06)",
                    color: "inherit",
                    fontSize: 9,
                    padding: "2px 6px",
                    outline: "none",
                  }}
                />
              ) : (
                <span>{row.left}</span>
              )}
              {onChange ? (
                <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <input
                    className="node-interactive"
                    type="number"
                    min={0}
                    max={100}
                    value={val}
                    onChange={(e) => updateRow({ right: e.target.value })}
                    style={{
                      width: 52,
                      border: `1px solid rgba(${rgb},0.22)`,
                      borderRadius: 6,
                      background: "rgba(255,255,255,0.06)",
                      color: "inherit",
                      fontSize: 9,
                      padding: "2px 6px",
                      outline: "none",
                    }}
                  />
                  <button
                    className="node-interactive"
                    onClick={removeRow}
                    style={{
                      border: "none",
                      borderRadius: 6,
                      background: "rgba(255,69,58,0.2)",
                      color: "#ff8b80",
                      cursor: "pointer",
                      fontSize: 9,
                      padding: "2px 5px",
                    }}
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <span>{val}%</span>
              )}
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
                  background: `rgba(${rgb},0.82)`,
                  borderRadius: 2,
                  transition: "width 0.24s ease",
                }}
              />
            </div>
            {onChange && (
              <input
                className="node-interactive"
                type="range"
                min={0}
                max={100}
                value={val}
                onChange={(e) => updateRow({ right: e.target.value })}
                style={{ width: "100%", marginTop: 4 }}
              />
            )}
          </div>
        );
      })}
      {onChange && (
        <button
          className="node-interactive"
          onClick={() =>
            onChange(
              joinPipeRows([...rows, { left: "Neue Metrik", right: "0" }]),
            )
          }
          style={{
            border: `1px solid rgba(${rgb},0.3)`,
            borderRadius: 6,
            background: `rgba(${rgb},0.14)`,
            color: accent,
            cursor: "pointer",
            fontSize: 10,
            fontWeight: 700,
            padding: "3px 8px",
          }}
        >
          + KPI
        </button>
      )}
    </div>
  );
}

export function CanvasNexusCodeBlock({
  className,
  children,
  accent,
  onChange,
}: {
  className?: string;
  children: ReactNode;
  accent: string;
  onChange?: (next: string) => void;
}) {
  const lang = (className || "").replace("language-", "");
  const raw = Array.isArray(children)
    ? children.join("")
    : String(children ?? "");
  const content = raw.replace(/\n$/, "");

  const renderFallback = (
    <pre
      style={{
        fontSize: 10,
        opacity: 0.74,
        overflow: "auto",
        padding: "4px 6px",
        background: "rgba(0,0,0,0.2)",
        borderRadius: 6,
      }}
    >
      <code>{content}</code>
    </pre>
  );

  const actionsByLang: Record<string, MagicAction[]> = {
    "nexus-list": [
      { label: "+ Row", apply: (d) => appendLine(d, "Neuer Punkt | Kontext") },
      {
        label: "Template",
        apply: () =>
          "Owner | Product\nStatus | In Arbeit\nNächster Schritt | Entscheidung vorbereiten",
      },
    ],
    "nexus-progress": [
      { label: "+ KPI", apply: (d) => appendLine(d, "Neue Metrik | 0") },
      {
        label: "Template",
        apply: () =>
          "Scope Fit | 70\nTeam Readiness | 60\nRelease Confidence | 40",
      },
    ],
    "nexus-alert": [
      {
        label: "Warning",
        apply: () => "warning\nBlocker prüfen und Owner definieren.",
      },
      {
        label: "Success",
        apply: () => "success\nAlle kritischen Tasks sind abgeschlossen.",
      },
    ],
    "nexus-timeline": [
      {
        label: "+ Event",
        apply: (d) =>
          appendLine(
            d,
            `${new Date().toISOString().slice(0, 10)} | Neuer Meilenstein`,
          ),
      },
      {
        label: "Template",
        apply: () =>
          "W1 | Discovery\nW2 | Architektur\nW3 | Umsetzung\nW4 | QA + Launch",
      },
    ],
    "nexus-grid": [
      {
        label: "2 Cols",
        apply: (d) => {
          const rows = normalizeContent(d).split("\n").filter(Boolean);
          const tail = rows.slice(1);
          return ["2", ...(tail.length ? tail : ["Item A", "Item B"])].join(
            "\n",
          );
        },
      },
      {
        label: "+ Item",
        apply: (d) => {
          const rows = normalizeContent(d).split("\n").filter(Boolean);
          if (rows.length === 0) return "2\nNeues Item";
          return [...rows, "Neues Item"].join("\n");
        },
      },
    ],
    "nexus-card": [
      {
        label: "Template",
        apply: () =>
          "Feature Name | Kurzbeschreibung des Nutzens | Owner: Team",
      },
      {
        label: "Decision",
        apply: () =>
          "Entscheidung | Option B bevorzugen | Grund: geringeres Risiko",
      },
    ],
    "nexus-kanban": [
      { label: "+ Task", apply: (d) => appendLine(d, "Todo | Neue Aufgabe") },
      {
        label: "Template",
        apply: () =>
          "Backlog | Scope klären\nDoing | API Integration\nReview | QA Abnahme\nDone | Deployment",
      },
    ],
    "nexus-metrics": [
      { label: "+ KPI", apply: (d) => appendLine(d, "Neue KPI | 0 | +0%") },
      {
        label: "Template",
        apply: () =>
          "MAU | 14.2k | +12%\nConversion | 4.7% | +0.8%\nNPS | 58 | +6",
      },
    ],
    "nexus-steps": [
      {
        label: "+ Step",
        apply: (d) => appendLine(d, "Neuer Schritt | Beschreibung"),
      },
      {
        label: "Template",
        apply: () =>
          "Planung | Scope und Ziele finalisieren\nBuild | Kernfunktionen umsetzen\nReview | QA und Freigabe",
      },
    ],
    "nexus-quadrant": [
      {
        label: "Template",
        apply: () =>
          "Quick Wins | Hoher Impact, geringer Aufwand\nBig Bets | Hoher Impact, hoher Aufwand\nFill-ins | Niedriger Impact, geringer Aufwand\nAvoid | Niedriger Impact, hoher Aufwand",
      },
    ],
  };

  const wrap = (label: string, body: ReactNode) => (
    <MagicShell
      label={label}
      content={content}
      accent={accent}
      onChange={onChange}
      actions={actionsByLang[lang]}
    >
      {body}
    </MagicShell>
  );

  if (lang === "nexus-list") {
    return wrap(
      "List",
      <CanvasMagicList content={content} accent={accent} onChange={onChange} />,
    );
  }
  if (lang === "nexus-alert") {
    return wrap("Alert", <CanvasMagicAlert content={content} />);
  }
  if (lang === "nexus-progress") {
    return wrap(
      "Progress",
      <CanvasMagicProgress
        content={content}
        accent={accent}
        onChange={onChange}
      />,
    );
  }
  if (lang === "nexus-timeline") {
    return wrap(
      "Timeline",
      <CanvasMagicTimeline
        content={content}
        accent={accent}
        onChange={onChange}
      />,
    );
  }
  if (lang === "nexus-grid") {
    return wrap(
      "Grid",
      <CanvasMagicGrid content={content} accent={accent} onChange={onChange} />,
    );
  }
  if (lang === "nexus-card") {
    return wrap(
      "Card",
      <CanvasMagicCard content={content} accent={accent} onChange={onChange} />,
    );
  }
  if (lang === "nexus-kanban") {
    return wrap(
      "Kanban",
      <CanvasMagicKanban
        content={content}
        accent={accent}
        onChange={onChange}
      />,
    );
  }
  if (lang === "nexus-metrics") {
    return wrap(
      "Metrics",
      <CanvasMagicMetrics
        content={content}
        accent={accent}
        onChange={onChange}
      />,
    );
  }
  if (lang === "nexus-steps") {
    return wrap(
      "Steps",
      <CanvasMagicSteps
        content={content}
        accent={accent}
        onChange={onChange}
      />,
    );
  }
  if (lang === "nexus-quadrant") {
    return wrap(
      "Quadrant",
      <CanvasMagicQuadrant
        content={content}
        accent={accent}
        onChange={onChange}
      />,
    );
  }
  return renderFallback;
}
