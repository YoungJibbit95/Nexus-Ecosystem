import React from "react";
import { motion } from "framer-motion";
import { CheckSquare, FileText, Layout } from "lucide-react";
import { hexToRgb } from "../../../lib/utils";
import { QuickChip } from "../dashboardUi";
import { DashboardActionButton } from "../DashboardActionButton";

export function DashboardHeaderHero({
  t,
  rgb,
  today,
  greeting,
  pendingTasks,
  overdueReminders,
  setView,
  editLayout,
  setEditLayout,
  heroMotion,
  heroFramerEase,
}: {
  t: any;
  rgb: string;
  today: string;
  greeting: string;
  pendingTasks: number;
  overdueReminders: number;
  setView?: (v: string) => void;
  editLayout: boolean;
  setEditLayout: React.Dispatch<React.SetStateAction<boolean>>;
  heroMotion: any;
  heroFramerEase: any;
}) {
  return (
    <motion.div
      initial={heroMotion.allowEntry ? { opacity: 0, y: -8, scale: 0.998 } : false}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        duration: Math.max(0.14, heroMotion.timings.transformMs / 1000),
        ease: heroFramerEase,
      }}
      style={{ marginBottom: 10 }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 10,
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontSize: 10,
              opacity: 0.5,
              fontWeight: 720,
              textTransform: "uppercase",
              letterSpacing: "0.14em",
              marginBottom: 3,
            }}
          >
            {today}
          </div>
          <h1
            style={{
              margin: 0,
              fontSize: 24,
              fontWeight: 900,
              letterSpacing: "-0.035em",
              lineHeight: 1,
              background: `linear-gradient(135deg, #fff 30%, ${t.accent})`,
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            {greeting}
          </h1>
          <p style={{ fontSize: 11, opacity: 0.5, marginTop: 4 }}>
            {pendingTasks > 0 ? `${pendingTasks} offene Tasks` : "Alle Tasks erledigt"}
            {overdueReminders > 0
              ? ` / ${overdueReminders} ueberfaellige Erinnerung${overdueReminders > 1 ? "en" : ""}`
              : ""}
          </p>
        </div>

        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <QuickChip
            icon={FileText}
            label="New Note"
            color={t.accent}
            onClick={() => setView?.("notes")}
          />
          <QuickChip
            icon={CheckSquare}
            label="Tasks"
            color="#FF9F0A"
            onClick={() => setView?.("tasks")}
          />
          <DashboardActionButton
            onClick={() => setEditLayout((v) => !v)}
            liquidColor={editLayout ? t.accent : t.accent2}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 10px",
              borderRadius: 999,
              border: `1px solid ${editLayout ? t.accent : "rgba(255,255,255,0.14)"}`,
              background: editLayout
                ? `rgba(${hexToRgb(t.accent)},0.17)`
                : "rgba(255,255,255,0.05)",
              color: editLayout ? t.accent : "inherit",
              fontSize: 11,
              fontWeight: 760,
              cursor: "pointer",
            }}
          >
            <Layout size={12} />
            {editLayout ? "Edit on" : "Layout"}
          </DashboardActionButton>
        </div>
      </div>
    </motion.div>
  );
}
