/** @jsxRuntime classic */
/** @jsx h */
/** @jsxFrag Fragment */

import { useEffect, useMemo, useState } from "react";

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

function CanvasMagicAlert({ content }: { content: string }) {
  const lines = content
    .trim()
    .split("\n")
    .filter((line) => line.length > 0);
  const type = lines[0]?.trim().toLowerCase() || "info";
  const msg = lines.slice(1).join(" ").trim() || "Kein Hinweistext";
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
        padding: "6px 8px",
        borderRadius: 6,
        background: `${c}15`,
        border: `1px solid ${c}44`,
        fontSize: 10,
        color: c,
      }}
    >
      <strong style={{ textTransform: "capitalize" }}>{type}:</strong> {msg}
    </div>
  );
}

function CanvasMagicTimeline({ content, accent, onChange }: MagicBlockProps) {
  const rgb = hexToRgb(accent);
  const rows = parsePipeRows(content);
  return (
    <div
      style={{
        paddingLeft: 10,
        borderLeft: `2px solid rgba(${rgb},0.35)`,
      }}
    >
      {rows.length === 0 && (
        <div style={{ fontSize: 10, opacity: 0.62, padding: "2px 0" }}>
          Keine Timeline-Events
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
                opacity: 0.68,
                color: accent,
                fontWeight: 700,
              }}
            >
              {onChange ? (
                <input
                  className="node-interactive"
                  value={row.left}
                  onChange={(e) => updateRow({ left: e.target.value })}
                  placeholder="Zeitpunkt"
                  style={{
                    width: "100%",
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
                row.left
              )}
            </div>
            {onChange ? (
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <input
                  className="node-interactive"
                  value={row.right}
                  onChange={(e) => updateRow({ right: e.target.value })}
                  placeholder="Event"
                  style={{
                    flex: 1,
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
                    fontSize: 9,
                    padding: "2px 5px",
                  }}
                >
                  ✕
                </button>
              </div>
            ) : (
              <div style={{ fontSize: 10, lineHeight: 1.45 }}>{row.right}</div>
            )}
          </div>
        );
      })}
      {onChange && (
        <button
          className="node-interactive"
          onClick={() =>
            onChange(
              joinPipeRows([
                ...rows,
                {
                  left: new Date().toISOString().slice(0, 10),
                  right: "Neues Event",
                },
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
          + Event
        </button>
      )}
    </div>
  );
}

function CanvasMagicGrid({ content, accent }: MagicBlockProps) {
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
      }}
    >
      {items.length === 0 && (
        <div style={{ fontSize: 10, opacity: 0.58 }}>Keine Grid-Items</div>
      )}
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

function CanvasMagicCard({ content, accent }: MagicBlockProps) {
  const rgb = hexToRgb(accent);
  const [title, desc, meta] = content
    .trim()
    .split("|")
    .map((s) => s.trim());
  return (
    <div
      style={{
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
        <div style={{ fontSize: 10, opacity: 0.82, lineHeight: 1.45 }}>
          {desc}
        </div>
      )}
      {meta && (
        <div style={{ marginTop: 5, fontSize: 9, opacity: 0.62 }}>{meta}</div>
      )}
    </div>
  );
}

function CanvasMagicKanban({ content, accent, onChange }: MagicBlockProps) {
  const rgb = hexToRgb(accent);
  const rows = parsePipeRows(content);
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 4,
      }}
    >
      {rows.length === 0 && (
        <div style={{ fontSize: 10, opacity: 0.6 }}>Keine Karten</div>
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
                flexShrink: 0,
              }}
            >
              {onChange ? (
                <select
                  className="node-interactive"
                  value={row.left || "Todo"}
                  onChange={(e) => updateRow({ left: e.target.value })}
                  style={{
                    border: "none",
                    background: "transparent",
                    color: accent,
                    fontSize: 9,
                    fontWeight: 700,
                    outline: "none",
                  }}
                >
                  {[
                    "Backlog",
                    "Todo",
                    "Doing",
                    "Review",
                    "Done",
                    "Blocked",
                  ].map((lane) => (
                    <option key={lane} value={lane}>
                      {lane}
                    </option>
                  ))}
                </select>
              ) : (
                row.left || "Lane"
              )}
            </span>
            {onChange ? (
              <>
                <input
                  className="node-interactive"
                  value={row.right}
                  onChange={(e) => updateRow({ right: e.target.value })}
                  placeholder="Task"
                  style={{
                    flex: 1,
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
                    fontSize: 9,
                    padding: "2px 5px",
                  }}
                >
                  ✕
                </button>
              </>
            ) : (
              <span style={{ opacity: 0.84 }}>{row.right || "Task"}</span>
            )}
          </div>
        );
      })}
      {onChange && (
        <button
          className="node-interactive"
          onClick={() =>
            onChange(
              joinPipeRows([...rows, { left: "Todo", right: "Neue Aufgabe" }]),
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
          + Task
        </button>
      )}
    </div>
  );
}

function CanvasMagicMetrics({ content, accent, onChange }: MagicBlockProps) {
  const rgb = hexToRgb(accent);
  const rows = parseTripleRows(content);
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
        gap: 6,
      }}
    >
      {rows.length === 0 && (
        <div style={{ fontSize: 10, opacity: 0.6 }}>Keine Kennzahlen</div>
      )}
      {rows.map((row, i) => {
        const updateRow = (
          next: Partial<{ label: string; value: string; delta: string }>,
        ) => {
          if (!onChange) return;
          const nextRows = [...rows];
          nextRows[i] = {
            label: next.label ?? nextRows[i].label,
            value: next.value ?? nextRows[i].value,
            delta: next.delta ?? nextRows[i].delta,
          };
          onChange(joinTripleRows(nextRows));
        };
        const removeRow = () => {
          if (!onChange) return;
          onChange(joinTripleRows(rows.filter((_, idx) => idx !== i)));
        };
        return (
          <div
            key={i}
            style={{
              borderRadius: 7,
              border: `1px solid rgba(${rgb},0.24)`,
              background: `linear-gradient(160deg, rgba(${rgb},0.18), rgba(${rgb},0.06))`,
              padding: 7,
              display: "flex",
              flexDirection: "column",
              gap: 4,
            }}
          >
            {onChange ? (
              <>
                <input
                  className="node-interactive"
                  value={row.label}
                  onChange={(e) => updateRow({ label: e.target.value })}
                  placeholder="Label"
                  style={{
                    border: `1px solid rgba(${rgb},0.22)`,
                    borderRadius: 6,
                    background: "rgba(255,255,255,0.08)",
                    color: "inherit",
                    fontSize: 9,
                    padding: "2px 5px",
                    outline: "none",
                  }}
                />
                <div style={{ display: "flex", gap: 4 }}>
                  <input
                    className="node-interactive"
                    value={row.value}
                    onChange={(e) => updateRow({ value: e.target.value })}
                    placeholder="Wert"
                    style={{
                      flex: 1,
                      border: `1px solid rgba(${rgb},0.22)`,
                      borderRadius: 6,
                      background: "rgba(255,255,255,0.08)",
                      color: "inherit",
                      fontSize: 9,
                      padding: "2px 5px",
                      outline: "none",
                    }}
                  />
                  <input
                    className="node-interactive"
                    value={row.delta}
                    onChange={(e) => updateRow({ delta: e.target.value })}
                    placeholder="+0%"
                    style={{
                      width: 52,
                      border: `1px solid rgba(${rgb},0.22)`,
                      borderRadius: 6,
                      background: "rgba(255,255,255,0.08)",
                      color: "inherit",
                      fontSize: 9,
                      padding: "2px 5px",
                      outline: "none",
                    }}
                  />
                </div>
                <button
                  className="node-interactive"
                  onClick={removeRow}
                  style={{
                    marginTop: 2,
                    border: "none",
                    borderRadius: 6,
                    background: "rgba(255,69,58,0.2)",
                    color: "#ff8b80",
                    cursor: "pointer",
                    fontSize: 9,
                    padding: "2px 5px",
                    alignSelf: "flex-end",
                  }}
                >
                  Entfernen
                </button>
              </>
            ) : (
              <>
                <div
                  style={{
                    fontSize: 9,
                    opacity: 0.7,
                    textTransform: "uppercase",
                  }}
                >
                  {row.label || `KPI ${i + 1}`}
                </div>
                <div style={{ fontSize: 16, fontWeight: 800 }}>
                  {row.value || "0"}
                </div>
                {row.delta && (
                  <div
                    style={{
                      fontSize: 9,
                      fontWeight: 700,
                      color: accent,
                      background: `rgba(${rgb},0.2)`,
                      borderRadius: 999,
                      alignSelf: "flex-start",
                      padding: "1px 6px",
                    }}
                  >
                    {row.delta}
                  </div>
                )}
              </>
            )}
          </div>
        );
      })}
      {onChange && (
        <button
          className="node-interactive"
          onClick={() =>
            onChange(
              joinTripleRows([
                ...rows,
                { label: "Neue KPI", value: "0", delta: "+0%" },
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
            height: 30,
          }}
        >
          + KPI
        </button>
      )}
    </div>
  );
}

function CanvasMagicSteps({ content, accent, onChange }: MagicBlockProps) {
  const rgb = hexToRgb(accent);
  const rows = parsePipeRows(content);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {rows.length === 0 && (
        <div style={{ fontSize: 10, opacity: 0.6 }}>Keine Steps</div>
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
            style={{ display: "flex", alignItems: "flex-start", gap: 6 }}
          >
            <div
              style={{
                width: 18,
                height: 18,
                borderRadius: "50%",
                background: `rgba(${rgb},0.22)`,
                border: `1px solid rgba(${rgb},0.46)`,
                color: accent,
                fontSize: 9,
                fontWeight: 800,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginTop: 2,
                flexShrink: 0,
              }}
            >
              {i + 1}
            </div>
            <div
              style={{
                flex: 1,
                borderRadius: 6,
                border: `1px solid rgba(${rgb},0.2)`,
                background: "rgba(255,255,255,0.04)",
                padding: "5px 6px",
                display: "flex",
                flexDirection: "column",
                gap: 4,
              }}
            >
              {onChange ? (
                <>
                  <input
                    className="node-interactive"
                    value={row.left}
                    onChange={(e) => updateRow({ left: e.target.value })}
                    placeholder="Step"
                    style={{
                      border: `1px solid rgba(${rgb},0.22)`,
                      borderRadius: 6,
                      background: "rgba(255,255,255,0.08)",
                      color: "inherit",
                      fontSize: 9,
                      padding: "2px 5px",
                      outline: "none",
                    }}
                  />
                  <input
                    className="node-interactive"
                    value={row.right}
                    onChange={(e) => updateRow({ right: e.target.value })}
                    placeholder="Detail"
                    style={{
                      border: `1px solid rgba(${rgb},0.22)`,
                      borderRadius: 6,
                      background: "rgba(255,255,255,0.08)",
                      color: "inherit",
                      fontSize: 9,
                      padding: "2px 5px",
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
                      alignSelf: "flex-end",
                    }}
                  >
                    Entfernen
                  </button>
                </>
              ) : (
                <>
                  <div style={{ fontSize: 10, fontWeight: 700 }}>
                    {row.left || `Step ${i + 1}`}
                  </div>
                  {row.right && (
                    <div
                      style={{ fontSize: 9, opacity: 0.78, lineHeight: 1.4 }}
                    >
                      {row.right}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        );
      })}
      {onChange && (
        <button
          className="node-interactive"
          onClick={() =>
            onChange(
              joinPipeRows([
                ...rows,
                { left: "Neuer Schritt", right: "Detail" },
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
            alignSelf: "flex-start",
          }}
        >
          + Step
        </button>
      )}
    </div>
  );
}

function CanvasMagicQuadrant({ content, accent, onChange }: MagicBlockProps) {
  const rgb = hexToRgb(accent);
  const rows = parsePipeRows(content);
  while (rows.length < 4)
    rows.push({ left: `Quadrant ${rows.length + 1}`, right: "" });
  const visible = rows.slice(0, 4);

  const updateRow = (
    index: number,
    next: Partial<{ left: string; right: string }>,
  ) => {
    if (!onChange) return;
    const nextRows = [...visible];
    nextRows[index] = {
      left: next.left ?? nextRows[index].left,
      right: next.right ?? nextRows[index].right,
    };
    onChange(joinPipeRows(nextRows));
  };

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 6,
      }}
    >
      {visible.map((row, i) => (
        <div
          key={i}
          style={{
            minHeight: 72,
            borderRadius: 7,
            border: `1px solid rgba(${rgb},0.24)`,
            background: `rgba(${rgb},0.12)`,
            padding: 6,
            display: "flex",
            flexDirection: "column",
            gap: 4,
          }}
        >
          {onChange ? (
            <>
              <input
                className="node-interactive"
                value={row.left}
                onChange={(e) => updateRow(i, { left: e.target.value })}
                placeholder={`Quadrant ${i + 1}`}
                style={{
                  border: `1px solid rgba(${rgb},0.22)`,
                  borderRadius: 6,
                  background: "rgba(255,255,255,0.08)",
                  color: "inherit",
                  fontSize: 9,
                  padding: "2px 5px",
                  outline: "none",
                }}
              />
              <textarea
                className="node-interactive"
                value={row.right}
                onChange={(e) => updateRow(i, { right: e.target.value })}
                rows={2}
                placeholder="Inhalt"
                style={{
                  border: `1px solid rgba(${rgb},0.22)`,
                  borderRadius: 6,
                  background: "rgba(255,255,255,0.08)",
                  color: "inherit",
                  fontSize: 9,
                  padding: "3px 5px",
                  outline: "none",
                  resize: "vertical",
                }}
              />
            </>
          ) : (
            <>
              <div style={{ fontSize: 10, fontWeight: 700, color: accent }}>
                {row.left || `Quadrant ${i + 1}`}
              </div>
              <div style={{ fontSize: 9, opacity: 0.78, lineHeight: 1.4 }}>
                {row.right || "Inhalt"}
              </div>
            </>
          )}
        </div>
      ))}
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
