import { motion, useMotionTemplate, useMotionValue } from "motion/react";
import React, { MouseEvent } from "react";

export function SpotlightCard({ children, className = "", spotlightColor = "rgba(255,255,255,0.08)" }: { children: React.ReactNode, className?: string, spotlightColor?: string }) {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  function handleMouseMove({ currentTarget, clientX, clientY }: MouseEvent) {
    const { left, top } = currentTarget.getBoundingClientRect();
    mouseX.set(clientX - left);
    mouseY.set(clientY - top);
  }

  return (
    <div
      className={`relative group overflow-hidden ${className}`}
      onMouseMove={handleMouseMove}
    >
      <motion.div
        className="pointer-events-none absolute -inset-px rounded-xl opacity-0 transition duration-300 group-hover:opacity-100 z-30"
        style={{
          background: useMotionTemplate`
            radial-gradient(
              400px circle at ${mouseX}px ${mouseY}px,
              ${spotlightColor},
              transparent 80%
            )
          `,
          willChange: "background, opacity"
        }}
      />
      {children}
    </div>
  );
}
