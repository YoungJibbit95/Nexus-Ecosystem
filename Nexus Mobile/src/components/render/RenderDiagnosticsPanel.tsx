import React from "react";
import { subscribeRenderDiagnostics } from "../../render/renderRuntime";
import { SurfaceBoundsDebugOverlay } from "./SurfaceBoundsDebugOverlay";

type SurfaceDebugEntry = {
  id: string;
  mode: string;
  motionCapability: string;
  animationComplexity: string;
  visibilityState: string;
  interactionState: string;
  areaHint: number;
  priorityScore: number;
  reason: string;
};

type RenderSnapshot = {
  phase: string;
  tier: string;
  registeredSurfaces: number;
  visibleSurfaces: number;
  dynamicSurfaces: number;
  shaderSurfaces: number;
  burstSurfaces: number;
  frameBudgetMs: number;
  lagPressure: number;
  effectiveDynamicBudget: number;
  effectiveShaderBudget: number;
  effectiveBurstBudget: number;
  effectiveBackdropBudget: number;
  droppedFrameEstimate: number;
  lastCommitDurationMs: number;
  allocationDurationMs: number;
  resolveDurationMs: number;
  listenerNotifyDurationMs: number;
  invariantViolations: number;
  surfaces: SurfaceDebugEntry[];
};

const DEFAULT_SNAPSHOT: RenderSnapshot = {
  phase: "idle",
  tier: "mobile-balanced",
  registeredSurfaces: 0,
  visibleSurfaces: 0,
  dynamicSurfaces: 0,
  shaderSurfaces: 0,
  burstSurfaces: 0,
  frameBudgetMs: 16.6,
  lagPressure: 0,
  effectiveDynamicBudget: 0,
  effectiveShaderBudget: 0,
  effectiveBurstBudget: 0,
  effectiveBackdropBudget: 0,
  droppedFrameEstimate: 0,
  lastCommitDurationMs: 0,
  allocationDurationMs: 0,
  resolveDurationMs: 0,
  listenerNotifyDurationMs: 0,
  invariantViolations: 0,
  surfaces: [],
};

export function RenderDiagnosticsPanel() {
  const [snapshot, setSnapshot] = React.useState<RenderSnapshot>(DEFAULT_SNAPSHOT);
  const [showSurfaceTable, setShowSurfaceTable] = React.useState(false);
  const [showBoundsOverlay, setShowBoundsOverlay] = React.useState(false);
  const isDev = Boolean((import.meta as any).env?.DEV);

  React.useEffect(() => subscribeRenderDiagnostics((next) => {
    const safeSurfaces = Array.isArray((next as any).surfaces)
      ? ((next as any).surfaces as SurfaceDebugEntry[])
      : [];
    setSnapshot({
      ...DEFAULT_SNAPSHOT,
      ...(next as any),
      surfaces: safeSurfaces,
    });
  }), []);

  const topSurfaces = snapshot.surfaces.slice(0, 10);

  return (
    <div
      style={{
        borderRadius: 12,
        border: "1px solid rgba(255,255,255,0.1)",
        background: "rgba(255,255,255,0.04)",
        padding: "9px 10px",
        display: "flex",
        flexDirection: "column",
        gap: 7,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <div style={{ fontSize: 10, opacity: 0.6, fontWeight: 700 }}>
          Render Diagnostics
        </div>
        {isDev ? (
          <div style={{ display: "inline-flex", gap: 6 }}>
            <button type="button" onClick={() => setShowSurfaceTable((prev) => !prev)} style={debugToggleStyle(showSurfaceTable)}>
              Table
            </button>
            <button type="button" onClick={() => setShowBoundsOverlay((prev) => !prev)} style={debugToggleStyle(showBoundsOverlay)}>
              Bounds
            </button>
          </div>
        ) : null}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 6 }}>
        <Metric label="Tier" value={snapshot.tier} />
        <Metric label="Phase" value={snapshot.phase} />
        <Metric label="Dynamic" value={snapshot.dynamicSurfaces} />
        <Metric label="Shader" value={snapshot.shaderSurfaces} />
        <Metric label="Burst" value={snapshot.burstSurfaces} />
        <Metric label="Frame" value={`${snapshot.frameBudgetMs}ms`} />
        <Metric label="Lag" value={snapshot.lagPressure.toFixed(2)} />
        <Metric label="Resolve" value={`${snapshot.resolveDurationMs}ms`} />
        <Metric label="Allocate" value={`${snapshot.allocationDurationMs}ms`} />
        <Metric label="Commit" value={`${snapshot.lastCommitDurationMs}ms`} />
        <Metric label="Eff D" value={snapshot.effectiveDynamicBudget} />
        <Metric label="Eff S" value={snapshot.effectiveShaderBudget} />
        <Metric label="Eff B" value={snapshot.effectiveBurstBudget} />
        <Metric label="Eff Bd" value={snapshot.effectiveBackdropBudget} />
        <Metric label="Invariant" value={snapshot.invariantViolations} />
        <Metric label="Top Surface" value={topSurfaces[0]?.id ?? "none"} />
        <Metric label="Drops" value={snapshot.droppedFrameEstimate} />
      </div>

      {showSurfaceTable ? (
        <div
          style={{
            borderRadius: 9,
            border: "1px solid rgba(255,255,255,0.08)",
            background: "rgba(255,255,255,0.03)",
            padding: 6,
            display: "flex",
            flexDirection: "column",
            gap: 5,
            maxHeight: 200,
            overflow: "auto",
          }}
        >
          {topSurfaces.length === 0 ? (
            <div style={{ fontSize: 10, opacity: 0.58 }}>No registered surfaces.</div>
          ) : (
            topSurfaces.map((entry) => (
              <div
                key={entry.id}
                style={{
                  borderRadius: 7,
                  border: "1px solid rgba(255,255,255,0.08)",
                  background: "rgba(255,255,255,0.03)",
                  padding: "5px 6px",
                  fontSize: 10,
                  display: "flex",
                  flexDirection: "column",
                  gap: 2,
                }}
              >
                <div style={{ fontWeight: 700 }}>{entry.id}</div>
                <div style={{ opacity: 0.7 }}>
                  {entry.mode} · {entry.motionCapability} · area {entry.areaHint}
                </div>
                <div style={{ opacity: 0.56 }}>{entry.reason}</div>
              </div>
            ))
          )}
        </div>
      ) : null}

      {isDev ? <SurfaceBoundsDebugOverlay enabled={showBoundsOverlay} surfaces={snapshot.surfaces} /> : null}
    </div>
  );
}

const debugToggleStyle = (active: boolean): React.CSSProperties => ({
  borderRadius: 7,
  border: `1px solid ${active ? "rgba(126,176,255,0.55)" : "rgba(255,255,255,0.14)"}`,
  background: active ? "rgba(126,176,255,0.18)" : "rgba(255,255,255,0.04)",
  color: "inherit",
  fontSize: 10,
  fontWeight: 700,
  padding: "3px 7px",
  cursor: "pointer",
});

function Metric({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div
      style={{
        borderRadius: 8,
        border: "1px solid rgba(255,255,255,0.08)",
        background: "rgba(255,255,255,0.03)",
        padding: "5px 7px",
      }}
    >
      <div style={{ fontSize: 9, opacity: 0.5, textTransform: "uppercase", letterSpacing: "0.06em" }}>
        {label}
      </div>
      <div style={{ fontSize: 11, fontWeight: 700 }}>{value}</div>
    </div>
  );
}
