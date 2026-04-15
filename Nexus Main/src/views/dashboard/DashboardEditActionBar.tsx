import React from "react";
import { motion } from "framer-motion";
import { DashboardActionButton } from "./DashboardActionButton";
import type { LayoutPreset } from "./dashboardViewUtils";

export type DashboardEditActionBarProps = {
  editLayout: boolean;
  contentMotion: any;
  contentFramerEase: any;
  t: any;
  rgb: string;
  layoutLocked: boolean;
  setLayoutLocked: React.Dispatch<React.SetStateAction<boolean>>;
  undoLayoutChange: () => void;
  redoLayoutChange: () => void;
  layoutHistoryCount: number;
  layoutFutureCount: number;
  presetMenuOpen: boolean;
  setPresetMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
  applyLayoutPreset: (preset: LayoutPreset) => void;
  resetLayout: () => void;
  setEditLayout: React.Dispatch<React.SetStateAction<boolean>>;
};

export function DashboardEditActionBar({
  editLayout,
  contentMotion,
  contentFramerEase,
  t,
  rgb,
  layoutLocked,
  setLayoutLocked,
  undoLayoutChange,
  redoLayoutChange,
  layoutHistoryCount,
  layoutFutureCount,
  presetMenuOpen,
  setPresetMenuOpen,
  applyLayoutPreset,
  resetLayout,
  setEditLayout,
}: DashboardEditActionBarProps) {
  if (!editLayout) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 12, scale: 0.98 }}
      transition={
        contentMotion.allowHover
          ? {
              type: "spring",
              duration: Math.max(0.16, contentMotion.timings.transformMs / 1000),
              stiffness: contentMotion.allowStagger ? 336 : 314,
              damping: contentMotion.allowStagger ? 24 : 27,
              mass: contentMotion.allowStagger ? 0.76 : 0.82,
              ease: contentFramerEase,
            }
          : {
              type: "tween",
              duration: Math.max(0.16, contentMotion.timings.transformMs / 1000),
              ease: contentFramerEase,
            }
      }
      style={{
        position: "fixed",
        right: 22,
        bottom: 18,
        zIndex: 130,
        display: "flex",
        alignItems: "center",
        gap: 7,
        padding: "8px 10px",
        borderRadius: 14,
        border: "1px solid rgba(255,255,255,0.14)",
        background: "rgba(17,20,31,0.86)",
        backdropFilter: "blur(12px)",
        boxShadow: "0 16px 34px rgba(0,0,0,0.3)",
      }}
    >
      <DashboardActionButton
        onClick={undoLayoutChange}
        liquidColor={t.accent}
        style={{
          borderRadius: 9,
          border: "1px solid rgba(255,255,255,0.16)",
          background: "rgba(255,255,255,0.05)",
          color: "inherit",
          fontSize: 10,
          fontWeight: 700,
          padding: "5px 9px",
        }}
        disabled={layoutHistoryCount === 0 || layoutLocked}
      >
        Undo
      </DashboardActionButton>
      <DashboardActionButton
        onClick={redoLayoutChange}
        liquidColor={t.accent}
        style={{
          borderRadius: 9,
          border: "1px solid rgba(255,255,255,0.16)",
          background: "rgba(255,255,255,0.05)",
          color: "inherit",
          fontSize: 10,
          fontWeight: 700,
          padding: "5px 9px",
        }}
        disabled={layoutFutureCount === 0 || layoutLocked}
      >
        Redo
      </DashboardActionButton>
      <div style={{ position: "relative" }}>
        <DashboardActionButton
          onClick={() => setPresetMenuOpen((open) => !open)}
          liquidColor={presetMenuOpen ? t.accent : t.accent2}
          style={{
            borderRadius: 9,
            border: "1px solid rgba(255,255,255,0.16)",
            background: presetMenuOpen ? `rgba(${rgb},0.15)` : "rgba(255,255,255,0.05)",
            color: presetMenuOpen ? t.accent : "inherit",
            fontSize: 10,
            fontWeight: 700,
            padding: "5px 9px",
          }}
          disabled={layoutLocked}
        >
          Preset
        </DashboardActionButton>
        {presetMenuOpen ? (
          <div
            style={{
              position: "absolute",
              right: 0,
              bottom: "calc(100% + 7px)",
              minWidth: 128,
              borderRadius: 10,
              border: "1px solid rgba(255,255,255,0.14)",
              background: "rgba(17,20,31,0.95)",
              backdropFilter: "blur(12px)",
              padding: 6,
              display: "flex",
              flexDirection: "column",
              gap: 4,
            }}
          >
            {([
              ["balanced", "Balanced"],
              ["focus", "Focus"],
              ["planning", "Planning"],
            ] as Array<[LayoutPreset, string]>).map(([preset, label]) => (
              <DashboardActionButton
                key={preset}
                onClick={() => applyLayoutPreset(preset)}
                liquidColor={t.accent}
                style={{
                  width: "100%",
                  border: "none",
                  borderRadius: 8,
                  background: "transparent",
                  color: "inherit",
                  cursor: "pointer",
                  textAlign: "left",
                  fontSize: 11,
                  fontWeight: 650,
                  padding: "7px 8px",
                }}
              >
                {label}
              </DashboardActionButton>
            ))}
          </div>
        ) : null}
      </div>
      <DashboardActionButton
        onClick={() => setLayoutLocked((locked) => !locked)}
        liquidColor={layoutLocked ? "#ff9f0a" : t.accent}
        style={{
          borderRadius: 9,
          border: "1px solid rgba(255,255,255,0.16)",
          background: layoutLocked ? "rgba(255,159,10,0.14)" : "rgba(255,255,255,0.05)",
          color: layoutLocked ? "#ff9f0a" : "inherit",
          fontSize: 10,
          fontWeight: 700,
          padding: "5px 9px",
        }}
      >
        {layoutLocked ? "Locked" : "Lock"}
      </DashboardActionButton>
      <DashboardActionButton
        onClick={resetLayout}
        liquidColor={t.accent2}
        style={{
          borderRadius: 9,
          border: "1px solid rgba(255,255,255,0.16)",
          background: "rgba(255,255,255,0.05)",
          color: "inherit",
          fontSize: 10,
          fontWeight: 700,
          padding: "5px 9px",
        }}
        disabled={layoutLocked}
      >
        Reset
      </DashboardActionButton>
      <DashboardActionButton
        onClick={() => setEditLayout(false)}
        liquidColor={t.accent}
        style={{
          borderRadius: 9,
          border: `1px solid rgba(${rgb},0.35)`,
          background: `rgba(${rgb},0.17)`,
          color: t.accent,
          fontSize: 10,
          fontWeight: 800,
          padding: "5px 10px",
        }}
      >
        Fertig
      </DashboardActionButton>
    </motion.div>
  );
}
