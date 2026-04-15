import React from "react";
import type { NodeWidgetContentArgs } from "./renderNodeWidgetContent";

export function renderNodeWidgetRiskContent(
  args: NodeWidgetContentArgs,
): React.ReactNode {
  const { node, nodeAccent, fieldStyle, updateNode } = args;

  const statusColor = (status?: string) => {
    if (status === "done") return "#30D158";
    if (status === "blocked") return "#FF453A";
    if (status === "doing") return "#0A84FF";
    return "#8E8E93";
  };

  const priorityColor = (priority?: string) => {
    if (priority === "critical") return "#FF375F";
    if (priority === "high") return "#FF9F0A";
    if (priority === "mid") return "#64D2FF";
    return "#8E8E93";
  };

  switch (node.type) {
      case "risk": {
        const pColor = priorityColor(node.priority || "high");
        const sColor = statusColor(node.status || "blocked");
        const probability = Math.max(
          0,
          Math.min(100, Number(node.progress ?? 45)),
        );
        const impact = Math.max(1, Math.min(10, Number(node.effort ?? 7)));
        return (
          <div
            className="node-interactive"
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              flexDirection: "column",
              gap: 7,
            }}
          >
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
              <span
                style={{
                  fontSize: 9,
                  padding: "2px 7px",
                  borderRadius: 999,
                  background: `${pColor}22`,
                  border: `1px solid ${pColor}50`,
                  color: pColor,
                  fontWeight: 700,
                }}
              >
                {String(node.priority || "high").toUpperCase()}
              </span>
              <span
                style={{
                  fontSize: 9,
                  padding: "2px 7px",
                  borderRadius: 999,
                  background: `${sColor}22`,
                  border: `1px solid ${sColor}50`,
                  color: sColor,
                  fontWeight: 700,
                }}
              >
                {String(node.status || "blocked").toUpperCase()}
              </span>
              <span
                style={{
                  fontSize: 9,
                  padding: "2px 7px",
                  borderRadius: 999,
                  background: "rgba(255,69,58,0.15)",
                  border: "1px solid rgba(255,69,58,0.35)",
                  color: "#FF453A",
                  fontWeight: 700,
                }}
              >
                Risk Score {Math.round((probability / 10) * impact)}
              </span>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 6,
              }}
            >
              <select
                value={node.priority || "high"}
                onChange={(e) =>
                  updateNode(node.id, { priority: e.target.value as any })
                }
                style={fieldStyle}
              >
                <option value="low">Niedrig</option>
                <option value="mid">Mittel</option>
                <option value="high">Hoch</option>
                <option value="critical">Kritisch</option>
              </select>
              <select
                value={node.status || "blocked"}
                onChange={(e) =>
                  updateNode(node.id, { status: e.target.value as any })
                }
                style={fieldStyle}
              >
                <option value="todo">Beobachten</option>
                <option value="doing">In Bearbeitung</option>
                <option value="blocked">Aktiv</option>
                <option value="done">Mitigiert</option>
              </select>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr auto",
                gap: 6,
                alignItems: "center",
              }}
            >
              <input
                type="range"
                min={0}
                max={100}
                value={probability}
                onChange={(e) =>
                  updateNode(node.id, { progress: Number(e.target.value) })
                }
                style={{ width: "100%" }}
              />
              <span style={{ fontSize: 10, opacity: 0.75 }}>
                Prob {probability}%
              </span>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr auto",
                gap: 6,
                alignItems: "center",
              }}
            >
              <input
                type="range"
                min={1}
                max={10}
                value={impact}
                onChange={(e) =>
                  updateNode(node.id, { effort: Number(e.target.value) })
                }
                style={{ width: "100%" }}
              />
              <span style={{ fontSize: 10, opacity: 0.75 }}>
                Impact {impact}/10
              </span>
            </div>
            <textarea
              value={node.content}
              placeholder={
                "Risiko:\nImpact:\nWahrscheinlichkeit:\nMitigation / Fallback:"
              }
              onChange={(e) => updateNode(node.id, { content: e.target.value })}
              style={{
                flex: 1,
                width: "100%",
                resize: "none",
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 8,
                padding: 8,
                color: "inherit",
                fontSize: 11,
                lineHeight: 1.5,
                outline: "none",
              }}
            />
          </div>
        );
      }

    default:
      return null;
  }
}
