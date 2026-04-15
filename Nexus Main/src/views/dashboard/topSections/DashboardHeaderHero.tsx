import React from "react";
import { motion } from "framer-motion";
import { Code, FileText, CheckSquare, GitBranch, Layout } from "lucide-react";
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
      initial={heroMotion.allowEntry ? { opacity: 0, y: -10, scale: 0.996 } : false}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        duration: Math.max(0.16, heroMotion.timings.transformMs / 1000),
        ease: heroFramerEase,
      }}
      style={{ marginBottom: 24 }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 11,
              opacity: 0.4,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.15em",
              marginBottom: 4,
            }}
          >
            {today}
          </div>
          <h1
            style={{
              fontSize: 30,
              fontWeight: 900,
              letterSpacing: "-0.03em",
              lineHeight: 1,
              background: `linear-gradient(135deg, #fff 30%, ${t.accent})`,
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            {greeting} ✦
          </h1>
          <p style={{ fontSize: 12, opacity: 0.4, marginTop: 6 }}>
            {pendingTasks > 0 ? `${pendingTasks} offene Tasks` : "Alle Tasks erledigt ✓"}
            {overdueReminders > 0 &&
              ` · ${overdueReminders} überfällige Erinnerung${overdueReminders > 1 ? "en" : ""}`}
          </p>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <QuickChip
            icon={FileText}
            label="Neue Notiz"
            color={t.accent}
            onClick={() => setView?.("notes")}
          />
          <QuickChip
            icon={CheckSquare}
            label="Tasks"
            color="#FF9F0A"
            onClick={() => setView?.("tasks")}
          />
          <QuickChip
            icon={Code}
            label="Code"
            color="#30D158"
            onClick={() => setView?.("code")}
          />
          <QuickChip
            icon={GitBranch}
            label="Canvas"
            color={t.accent2}
            onClick={() => setView?.("canvas")}
          />
          <DashboardActionButton
            onClick={() => setEditLayout((v) => !v)}
            liquidColor={editLayout ? t.accent : t.accent2}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "7px 12px",
              borderRadius: 999,
              border: `1px solid ${editLayout ? t.accent : "rgba(255,255,255,0.14)"}`,
              background: editLayout
                ? `rgba(${hexToRgb(t.accent)},0.17)`
                : "rgba(255,255,255,0.05)",
              color: editLayout ? t.accent : "inherit",
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            <Layout size={12} />
            {editLayout ? "Editor aktiv" : "Layout bearbeiten"}
          </DashboardActionButton>
        </div>
      </div>
    </motion.div>
  );
}

