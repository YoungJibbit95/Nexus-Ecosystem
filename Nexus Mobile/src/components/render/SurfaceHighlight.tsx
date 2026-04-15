import React from "react";
import { motion } from "framer-motion";
import type { InteractiveHighlightMotion } from "@nexus/core";

type SurfaceHighlightProps = {
  highlight: InteractiveHighlightMotion;
  inset?: number;
  radius?: number;
  zIndex?: number;
  children?: React.ReactNode;
};

export function SurfaceHighlight({
  highlight,
  inset = 1,
  radius = 9,
  zIndex = 0,
  children,
}: SurfaceHighlightProps) {
  return (
    <motion.div
      aria-hidden="true"
      initial={false}
      animate={highlight.animate}
      transition={highlight.transition}
      style={{
        position: "absolute",
        inset,
        borderRadius: radius,
        pointerEvents: "none",
        zIndex,
        overflow: "hidden",
        transformOrigin: "50% 50%",
      }}
    >
      {children}
    </motion.div>
  );
}
