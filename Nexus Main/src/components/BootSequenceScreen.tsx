import React from "react";

export function BootSequenceScreen({
  appName,
  progress,
  stage,
  accent,
  accent2,
}: {
  appName: string;
  progress: number;
  stage: string;
  accent: string;
  accent2: string;
}) {
  const safeProgress = Math.max(0, Math.min(100, Math.round(progress)));
  return (
    <div
      style={{
        width: "100%",
        minHeight: "100dvh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background:
          "radial-gradient(circle at 20% 15%, rgba(38,53,110,0.45), transparent 45%), linear-gradient(135deg, #04050c 0%, #0b0f1c 45%, #111628 100%)",
        color: "#d7e6ff",
        fontFamily: "system-ui, sans-serif",
        padding: 24,
      }}
    >
      <div
        style={{
          width: "min(560px, 92vw)",
          borderRadius: 20,
          border: "1px solid rgba(255,255,255,0.14)",
          background: "rgba(8,12,24,0.68)",
          backdropFilter: "blur(18px) saturate(140%)",
          WebkitBackdropFilter: "blur(18px) saturate(140%)",
          boxShadow:
            "0 30px 90px rgba(0,0,0,0.46), inset 0 1px 0 rgba(255,255,255,0.18)",
          padding: 22,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 12,
              border: `1px solid ${accent}66`,
              background: `linear-gradient(135deg, ${accent}44, ${accent2}30)`,
              display: "grid",
              placeItems: "center",
              fontWeight: 900,
              fontSize: 16,
            }}
          >
            ✦
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800 }}>{appName}</div>
            <div style={{ fontSize: 11, opacity: 0.62 }}>Boot Sequence</div>
          </div>
        </div>
        <div style={{ marginTop: 14, fontSize: 13, opacity: 0.88, minHeight: 20 }}>
          {stage}
        </div>
        <div
          style={{
            marginTop: 12,
            height: 10,
            borderRadius: 999,
            background: "rgba(255,255,255,0.08)",
            overflow: "hidden",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <div
            style={{
              width: `${safeProgress}%`,
              height: "100%",
              borderRadius: 999,
              background: `linear-gradient(90deg, ${accent}, ${accent2})`,
              boxShadow: `0 0 12px ${accent}88`,
              transition: "width 260ms cubic-bezier(0.2, 0.7, 0.2, 1)",
            }}
          />
        </div>
        <div style={{ marginTop: 8, fontSize: 11, opacity: 0.7 }}>
          {safeProgress}% geladen
        </div>
      </div>
    </div>
  );
}
