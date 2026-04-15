import React from "react";
import { motion } from "framer-motion";
import { Glass } from "../../../components/Glass";
import { DashboardActionButton } from "../DashboardActionButton";
import { DashboardRuntimeHealthCard } from "./DashboardRuntimeHealthCard";

export function DashboardContinueSection({
  contentMotion,
  contentFramerEase,
  t,
  resumeLane,
}: {
  contentMotion: any;
  contentFramerEase: any;
  t: any;
  resumeLane: Array<any>;
}) {
  return (
    <motion.div
      initial={contentMotion.allowEntry ? { opacity: 0, y: 8 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: Math.max(0.14, contentMotion.timings.materialMs / 1000),
        delay: 0.04,
        ease: contentFramerEase,
      }}
      style={{ marginBottom: 14 }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.3fr 1fr",
          gap: 12,
        }}
      >
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
              Continue / Resume
            </span>
            <span style={{ fontSize: 10, opacity: 0.52 }}>
              {resumeLane.length} aktive Einstiegspunkte
            </span>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
              gap: 8,
            }}
          >
            {resumeLane.slice(0, 4).map((entry) => (
              <DashboardActionButton
                key={`${entry.label}-${entry.title}`}
                onClick={entry.action}
                liquidColor={t.accent}
                style={{
                  borderRadius: 10,
                  border: "1px solid rgba(255,255,255,0.12)",
                  background: "rgba(255,255,255,0.04)",
                  color: "inherit",
                  textAlign: "left",
                  cursor: "pointer",
                  padding: "8px 9px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 3,
                }}
              >
                <span
                  style={{
                    fontSize: 10,
                    opacity: 0.55,
                    textTransform: "uppercase",
                    letterSpacing: 0.35,
                  }}
                >
                  {entry.label}
                </span>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {entry.title}
                </span>
                <span style={{ fontSize: 10, opacity: 0.58 }}>
                  {entry.subtitle}
                </span>
              </DashboardActionButton>
            ))}
            {resumeLane.length === 0 ? (
              <div
                style={{
                  gridColumn: "1 / -1",
                  fontSize: 11,
                  opacity: 0.56,
                  padding: "4px 2px",
                }}
              >
                Noch keine aktiven Elemente. Erstelle eine Note, Task, Reminder
                oder Code-Datei.
              </div>
            ) : null}
          </div>
        </Glass>

        <DashboardRuntimeHealthCard />
      </div>
    </motion.div>
  );
}

