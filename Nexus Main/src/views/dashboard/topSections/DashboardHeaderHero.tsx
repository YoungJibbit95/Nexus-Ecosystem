import React from "react";
import { motion } from "framer-motion";
import { Layout } from "lucide-react";
import { DashboardActionButton } from "../DashboardActionButton";

export function DashboardHeaderHero({
  t,
  today,
  greeting,
  editLayout,
  setEditLayout,
  heroMotion,
  heroFramerEase,
}: {
  t: any;
  today: string;
  greeting: string;
  editLayout: boolean;
  setEditLayout: React.Dispatch<React.SetStateAction<boolean>>;
  heroMotion: any;
  heroFramerEase: any;
}) {
  return (
    <motion.header
      className="nx-dashboard-heading"
      initial={heroMotion.allowEntry ? { opacity: 0, y: -8 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: Math.max(0.14, heroMotion.timings.transformMs / 1000),
        ease: heroFramerEase,
      }}
    >
      <div>
        <p className="nx-dashboard-date">{today}</p>
        <h1>{greeting}</h1>
      </div>
      <DashboardActionButton
        className="nx-dashboard-control nx-dashboard-control-quiet"
        onClick={() => setEditLayout((value) => !value)}
        aria-pressed={editLayout}
        liquidColor={t.accent}
      >
        <Layout size={14} aria-hidden="true" />
        {editLayout ? "Layout fertig" : "Anpassen"}
      </DashboardActionButton>
    </motion.header>
  );
}
