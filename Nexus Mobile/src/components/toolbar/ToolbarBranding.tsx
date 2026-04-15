import React from "react";
import { Search, Zap } from "lucide-react";

export function IslandToolbarBrand({ rgb, t, spec, offset }: any) {
  const x = offset?.x ?? 0;
  const y = offset?.y ?? 0;
  return (
    <div
      style={{
        width: spec.logoSize ?? 28,
        height: spec.logoSize ?? 28,
        borderRadius: spec.radius ?? 10,
        flexShrink: 0,
        background: `linear-gradient(135deg, rgba(${rgb},0.35), rgba(${rgb},0.12))`,
        border: `1px solid rgba(${rgb},0.45)`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: `0 0 14px rgba(${rgb},0.3)`,
        transform: `translate(${x}px, ${y}px)`,
      }}
    >
      <Zap size={spec.iconSize ?? 13} style={{ color: t.accent }} />
    </div>
  );
}

export function FullWidthToolbarBrand({ rgb, t, spec, offset }: any) {
  const x = offset?.x ?? 0;
  const y = offset?.y ?? 0;
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: spec.gap ?? 8,
        transform: `translate(${x}px, ${y}px)`,
      }}
    >
      <div
        style={{
          width: spec.logoSize ?? 26,
          height: spec.logoSize ?? 26,
          borderRadius: spec.radius ?? 9,
          border: `1px solid rgba(${rgb},0.44)`,
          background: `linear-gradient(135deg, rgba(${rgb},0.32), rgba(${rgb},0.1))`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Zap size={spec.iconSize ?? 12} style={{ color: t.accent }} />
      </div>
      {spec.showWordmark ? (
        <span
          style={{
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            whiteSpace: "nowrap",
          }}
        >
          {spec.wordmark}
        </span>
      ) : null}
    </div>
  );
}

export function SpotlightToolbarBrand({ t, rgb }: any) {
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      <div
        style={{
          width: 24,
          height: 24,
          borderRadius: 9,
          border: `1px solid rgba(${rgb},0.46)`,
          background: `linear-gradient(130deg, rgba(${rgb},0.3), rgba(${rgb},0.09))`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Search size={12} style={{ color: t.accent }} />
      </div>
      <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", opacity: 0.78 }}>
        Spotlight
      </span>
    </div>
  );
}
