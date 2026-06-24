import React from "react";
import { motion } from "framer-motion";
import { Glass } from "../../../components/Glass";
import { DashboardActionButton } from "../DashboardActionButton";
import { DashboardRuntimeHealthCard } from "./DashboardRuntimeHealthCard";
import type { DashboardResumeEntry } from "./types";

export function DashboardContinueSection({
  contentMotion,
  contentFramerEase,
  t,
  resumeLane,
}: {
  contentMotion: any;
  contentFramerEase: any;
  t: any;
  resumeLane: DashboardResumeEntry[];
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
      style={{ marginBottom: 10 }}
    >
      {/*<div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) minmax(280px, 0.42fr)",
          gap: 10,
        }}
      >
        <Glass style={{ padding: "10px 12px", borderRadius: 16 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 7,
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
              Resume
            </span>
            <span style={{ fontSize: 10, opacity: 0.52 }}>
              {resumeLane.length} Einstiegspunkte
            </span>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
              gap: 7,
            }}
          >
            {resumeLane.slice(0, 3).map((entry) => (
              <DashboardActionButton
                key={`${entry.label}-${entry.title}`}
                onClick={entry.action}
                liquidColor={t.accent}
                style={{
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,0.12)",
                  background: "rgba(255,255,255,0.04)",
                  color: "inherit",
                  textAlign: "left",
                  cursor: "pointer",
                  padding: "7px 8px",
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
                {entry.reason ? (
                  <span
                    style={{
                      marginTop: 1,
                      alignSelf: "flex-start",
                      fontSize: 9,
                      fontWeight: 700,
                      opacity: 0.72,
                      padding: "2px 6px",
                      borderRadius: 999,
                      border: "1px solid rgba(255,255,255,0.14)",
                      background: "rgba(255,255,255,0.06)",
                    }}
                  >
                    {entry.reason}
                  </span>
                ) : null}
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
      </div>*/}
    </motion.div>
  );
}
