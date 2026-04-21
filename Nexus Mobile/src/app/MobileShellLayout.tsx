import React from "react";

type Props = {
  theme: any;
  motionRuntime: any;
  motionCssVars: React.CSSProperties;
  backgroundStyles: React.CSSProperties;
  lowPowerMode: boolean;
  accentRgb: string;
  accent2Rgb: string;
  fontSize: string;
  children: React.ReactNode;
};

export function MobileShellLayout({
  theme: t,
  motionRuntime,
  motionCssVars,
  backgroundStyles,
  lowPowerMode,
  accentRgb,
  accent2Rgb,
  fontSize,
  children,
}: Props) {
  return (
    <div
      className="nx-app-shell nx-motion-root"
      data-nx-motion-profile={motionRuntime?.profile || "balanced"}
      data-nx-motion-reduced={motionRuntime?.reduced ? "1" : "0"}
      style={{
        ...motionCssVars,
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
        overflow: "hidden",
        position: "relative",
        color: t.mode === "dark" ? "#fff" : "#0a0a0a",
        ...backgroundStyles,
        fontSize,
      }}
    >
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          overflow: "hidden",
          zIndex: 0,
        }}
      >
        <div
          style={{
            position: "absolute",
            top: "-18%",
            left: "-12%",
            width: "46vw",
            height: "46vw",
            maxWidth: 480,
            maxHeight: 480,
            background: `radial-gradient(circle, rgba(${accentRgb},0.18), transparent 68%)`,
            filter: lowPowerMode ? "blur(8px)" : "blur(18px)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "-16%",
            right: "-10%",
            width: "48vw",
            height: "48vw",
            maxWidth: 520,
            maxHeight: 520,
            background: `radial-gradient(circle, rgba(${accent2Rgb},0.16), transparent 68%)`,
            filter: lowPowerMode ? "blur(10px)" : "blur(20px)",
          }}
        />
      </div>
      <div
        style={{
          position: "relative",
          zIndex: 1,
          display: "flex",
          flexDirection: "column",
          width: "100%",
          height: "100%",
          minHeight: 0,
        }}
      >
        {children}
      </div>
    </div>
  );
}
