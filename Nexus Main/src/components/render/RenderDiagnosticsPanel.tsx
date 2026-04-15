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
  tier: "desktop-balanced",
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

  const topSurfaces = snapshot.surfaces.slice(0, 16);

  return (
    <div
      style={{
        borderRadius: 12,
        border: "1px solid rgba(255,255,255,0.1)",
        background: "rgba(255,255,255,0.04)",
        padding: "10px 12px",
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <div style={{ fontSize: 10, opacity: 0.6, fontWeight: 700 }}>
          Render Diagnostics
        </div>
        {isDev ? (
          <div style={{ display: "inline-flex", gap: 6 }}>
            <button
              type="button"
              onClick={() => setShowSurfaceTable((prev) => !prev)}
              style={debugToggleStyle(showSurfaceTable)}
            >
              Surface Table
            </button>
            <button
              type="button"
              onClick={() => setShowBoundsOverlay((prev) => !prev)}
              style={debugToggleStyle(showBoundsOverlay)}
            >
              Bounds Overlay
            </button>
          </div>
        ) : null}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 1fr))", gap: 8 }}>
        <Metric label="Tier" value={snapshot.tier} />
        <Metric label="Phase" value={snapshot.phase} />
        <Metric label="Frame Budget" value={`${snapshot.frameBudgetMs}ms`} />
        <Metric label="Lag Pressure" value={snapshot.lagPressure.toFixed(2)} />
        <Metric label="Drops" value={snapshot.droppedFrameEstimate} />
        <Metric label="Invariant" value={snapshot.invariantViolations} />
        <Metric label="Surfaces" value={snapshot.registeredSurfaces} />
        <Metric label="Visible" value={snapshot.visibleSurfaces} />
        <Metric label="Dynamic" value={snapshot.dynamicSurfaces} />
        <Metric label="Shader" value={snapshot.shaderSurfaces} />
        <Metric label="Burst" value={snapshot.burstSurfaces} />
        <Metric label="Resolve" value={`${snapshot.resolveDurationMs}ms`} />
        <Metric label="Allocate" value={`${snapshot.allocationDurationMs}ms`} />
        <Metric label="Commit" value={`${snapshot.lastCommitDurationMs}ms`} />
        <Metric label="Listeners" value={`${snapshot.listenerNotifyDurationMs}ms`} />
        <Metric label="Eff. Dynamic" value={snapshot.effectiveDynamicBudget} />
        <Metric label="Eff. Shader" value={snapshot.effectiveShaderBudget} />
        <Metric label="Eff. Burst" value={snapshot.effectiveBurstBudget} />
        <Metric label="Eff. Backdrop" value={snapshot.effectiveBackdropBudget} />
        <Metric label="Top Surface" value={topSurfaces[0]?.id ?? "none"} />
      </div>

      {showSurfaceTable ? (
        <div
          style={{
            borderRadius: 10,
            border: "1px solid rgba(255,255,255,0.08)",
            background: "rgba(255,255,255,0.025)",
            padding: 8,
            display: "flex",
            flexDirection: "column",
            gap: 6,
            maxHeight: 260,
            overflow: "auto",
          }}
        >
          {topSurfaces.length === 0 ? (
            <div style={{ fontSize: 11, opacity: 0.58 }}>No registered surfaces.</div>
          ) : (
            topSurfaces.map((entry) => (
              <div
                key={entry.id}
                style={{
                  borderRadius: 8,
                  border: "1px solid rgba(255,255,255,0.08)",
                  background: "rgba(255,255,255,0.03)",
                  padding: "6px 8px",
                  fontSize: 10,
                  display: "grid",
                  gridTemplateColumns: "1.2fr 1fr 1fr 1fr",
                  gap: 6,
                }}
              >
                <div>
                  <div style={{ fontWeight: 700 }}>{entry.id}</div>
                  <div style={{ opacity: 0.58 }}>{entry.reason}</div>
                </div>
                <div>
                  <div style={{ opacity: 0.58 }}>mode</div>
                  <div style={{ fontWeight: 700 }}>{entry.mode}</div>
                </div>
                <div>
                  <div style={{ opacity: 0.58 }}>motion</div>
                  <div style={{ fontWeight: 700 }}>{entry.motionCapability}</div>
                </div>
                <div>
                  <div style={{ opacity: 0.58 }}>area / score</div>
                  <div style={{ fontWeight: 700 }}>
                    {entry.areaHint} · {Math.round(entry.priorityScore)}
                  </div>
                </div>
                <div style={{ gridColumn: "1 / -1", display: "flex", gap: 10, opacity: 0.66 }}>
                  <span>complexity {entry.animationComplexity}</span>
                  <span>vis {entry.visibilityState}</span>
                  <span>interaction {entry.interactionState}</span>
                </div>
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
  borderRadius: 8,
  border: `1px solid ${active ? "rgba(126,176,255,0.55)" : "rgba(255,255,255,0.14)"}`,
  background: active ? "rgba(126,176,255,0.18)" : "rgba(255,255,255,0.04)",
  color: "inherit",
  fontSize: 10,
  fontWeight: 700,
  padding: "4px 8px",
  cursor: "pointer",
});

function Metric({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div
      style={{
        borderRadius: 9,
        border: "1px solid rgba(255,255,255,0.08)",
        background: "rgba(255,255,255,0.03)",
        padding: "6px 8px",
        minWidth: 0,
      }}
    >
      <div style={{ fontSize: 9, opacity: 0.5, textTransform: "uppercase", letterSpacing: "0.06em" }}>
        {label}
      </div>
      <div style={{ fontSize: 11, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis" }}>
        {value}
      </div>
    </div>
  );
}
