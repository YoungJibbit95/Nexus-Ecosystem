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

export function CanvasMagicMetrics({ content, accent, onChange }: MagicBlockProps) {
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

export function CanvasMagicSteps({ content, accent, onChange }: MagicBlockProps) {
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

export function CanvasMagicQuadrant({ content, accent, onChange }: MagicBlockProps) {
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

