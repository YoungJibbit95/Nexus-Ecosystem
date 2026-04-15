import React from "react";
import { createPortal } from "react-dom";

type SurfaceDebugEntry = {
  id: string;
  areaHint: number;
  mode: string;
  motionCapability: string;
};

type OverlayRect = {
  id: string;
  areaHint: number;
  mode: string;
  motionCapability: string;
  x: number;
  y: number;
  width: number;
  height: number;
  areaDeltaRatio: number;
};

const selectorForId = (id: string) => {
  if (typeof CSS !== "undefined" && typeof CSS.escape === "function") {
    return `[data-nx-surface-id="${CSS.escape(id)}"]`;
  }
  return `[data-nx-surface-id="${id.replace(/["\\]/g, "\\$&")}"]`;
};

const collectOverlayRects = (surfaces: SurfaceDebugEntry[]): OverlayRect[] =>
  surfaces
    .map((surface) => {
      const node = document.querySelector(selectorForId(surface.id)) as HTMLElement | null;
      if (!node) return null;
      const rect = node.getBoundingClientRect();
      const width = Math.max(0, rect.width);
      const height = Math.max(0, rect.height);
      if (width < 2 || height < 2) return null;
      const actualArea = Math.max(1, Math.round(width * height));
      const hintArea = Math.max(1, Math.round(surface.areaHint || 1));
      const areaDeltaRatio = Math.abs(actualArea - hintArea) / Math.max(hintArea, actualArea);
      return {
        id: surface.id,
        areaHint: hintArea,
        mode: surface.mode,
        motionCapability: surface.motionCapability,
        x: rect.x,
        y: rect.y,
        width,
        height,
        areaDeltaRatio,
      };
    })
    .filter((entry): entry is OverlayRect => entry !== null);

export function SurfaceBoundsDebugOverlay({
  enabled,
  surfaces,
}: {
  enabled: boolean;
  surfaces: SurfaceDebugEntry[];
}) {
  const [rects, setRects] = React.useState<OverlayRect[]>([]);

  React.useEffect(() => {
    if (!enabled || typeof document === "undefined") {
      setRects([]);
      return;
    }

    let active = true;
    const refresh = () => {
      if (!active) return;
      setRects(collectOverlayRects(surfaces.slice(0, 48)));
    };

    refresh();
    const interval = window.setInterval(refresh, 360);
    const onScroll = () => refresh();
    const onResize = () => refresh();
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize, { passive: true });

    return () => {
      active = false;
      window.clearInterval(interval);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
    };
  }, [enabled, surfaces]);

  if (!enabled || typeof document === "undefined") return null;

  return createPortal(
    <div
      style={{
        position: "fixed",
        inset: 0,
        pointerEvents: "none",
        zIndex: 100000,
      }}
    >
      {rects.map((entry) => {
        const warn = entry.areaDeltaRatio > 0.32;
        const stroke = warn ? "rgba(255,120,120,0.9)" : "rgba(115,189,255,0.85)";
        const fill = warn ? "rgba(255,120,120,0.12)" : "rgba(115,189,255,0.1)";
        return (
          <React.Fragment key={entry.id}>
            <div
              style={{
                position: "fixed",
                left: entry.x,
                top: entry.y,
                width: entry.width,
                height: entry.height,
                border: `1px solid ${stroke}`,
                background: fill,
                borderRadius: 5,
                boxSizing: "border-box",
              }}
            />
            <div
              style={{
                position: "fixed",
                left: entry.x + 3,
                top: Math.max(2, entry.y - 15),
                padding: "1px 5px",
                borderRadius: 5,
                background: "rgba(6,8,14,0.86)",
                border: `1px solid ${stroke}`,
                color: "#d8ecff",
                fontSize: 8,
                lineHeight: 1.2,
                whiteSpace: "nowrap",
              }}
            >
              {entry.id} · {entry.mode}
            </div>
          </React.Fragment>
        );
      })}
    </div>,
    document.body,
  );
}
