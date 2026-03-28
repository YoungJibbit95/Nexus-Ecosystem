/** @jsxRuntime classic */
/** @jsx h */
/** @jsxFrag Fragment */

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

function normalizeContent(value: string) {
  return value
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trimEnd();
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

export function CanvasMagicAlert({ content }: { content: string }) {
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

export function CanvasMagicTimeline({ content, accent, onChange }: MagicBlockProps) {
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

export function CanvasMagicGrid({ content, accent }: MagicBlockProps) {
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

export function CanvasMagicCard({ content, accent }: MagicBlockProps) {
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

export function CanvasMagicKanban({ content, accent, onChange }: MagicBlockProps) {
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

