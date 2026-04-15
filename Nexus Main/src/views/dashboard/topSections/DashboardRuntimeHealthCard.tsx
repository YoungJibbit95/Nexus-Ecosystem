import React, { useEffect, useState } from "react";
import { Glass } from "../../../components/Glass";
import {
  readRenderDiagnostics,
  subscribeRenderDiagnostics,
} from "../../../render/renderRuntime";

export function DashboardRuntimeHealthCard() {
  const [runtimeDiagnostics, setRuntimeDiagnostics] = useState(() =>
    readRenderDiagnostics(),
  );

  useEffect(
    () => subscribeRenderDiagnostics((next) => setRuntimeDiagnostics(next)),
    [],
  );

  return (
    <Glass style={{ padding: "12px 14px" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 8,
        }}
      >
        <span
          style={{
            fontSize: 11,
            fontWeight: 800,
            opacity: 0.74,
            textTransform: "uppercase",
            letterSpacing: 0.5,
          }}
        >
          Engine Health
        </span>
        <span style={{ fontSize: 10, opacity: 0.52 }}>
          {runtimeDiagnostics.phase}
        </span>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
          gap: 7,
        }}
      >
        {[
          ["Tier", runtimeDiagnostics.tier],
          ["Dynamic", String(runtimeDiagnostics.dynamicSurfaces)],
          ["Shader", String(runtimeDiagnostics.shaderSurfaces)],
          ["Burst", String(runtimeDiagnostics.burstSurfaces)],
          ["Commit", `${runtimeDiagnostics.lastCommitDurationMs}ms`],
          ["Invariants", String(runtimeDiagnostics.invariantViolations)],
        ].map(([label, value]) => (
          <div
            key={label}
            style={{
              borderRadius: 9,
              border: "1px solid rgba(255,255,255,0.09)",
              background: "rgba(255,255,255,0.03)",
              padding: "6px 8px",
            }}
          >
            <div
              style={{
                fontSize: 9,
                opacity: 0.54,
                textTransform: "uppercase",
                letterSpacing: 0.4,
              }}
            >
              {label}
            </div>
            <div style={{ fontSize: 11, fontWeight: 700 }}>{value}</div>
          </div>
        ))}
      </div>
    </Glass>
  );
}

