import React, { useState } from "react";
import {
  FileCode2,
  Plus,
  Settings,
  Sparkles,
  Terminal,
  Zap,
  FolderOpen
} from "lucide-react";
import { motion } from "framer-motion";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 300, damping: 30 },
  },
};

const features = [
  { icon: Sparkles, text: "Syntax Highlighting für alle Sprachen" },
  { icon: FileCode2, text: "Autocomplete & Multi-Tab" },
  { icon: Terminal, text: "Integriertes Terminal" },
  { icon: Zap, text: "Auto-Save & Einstellungen" },
];

function ActionCard({ icon: Icon, label, onClick, delay = 0 }) {
  const [hovered, setHovered] = useState(false);

  return (
    <motion.button
      variants={itemVariants}
      whileHover={{ scale: 1.04, y: -4 }}
      whileTap={{ scale: 0.96 }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      onClick={onClick}
      className="flex flex-col items-center gap-3 p-5 rounded-2xl relative overflow-hidden"
      style={{
        background: hovered ? "color-mix(in srgb, var(--primary) 15%, transparent)" : "color-mix(in srgb, var(--primary) 6%, transparent)",
        border: hovered
          ? "1px solid color-mix(in srgb, var(--primary) 40%, transparent)"
          : "1px solid color-mix(in srgb, var(--primary) 15%, transparent)",
        boxShadow: hovered
          ? "0 0 24px color-mix(in srgb, var(--primary) 20%, transparent), 0 8px 32px rgba(0,0,0,0.3)"
          : "0 0 0px transparent",
        transition:
          "background 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease",
      }}
    >
      {/* Subtle radial glow on hover */}
      <motion.div
        animate={{ opacity: hovered ? 1 : 0 }}
        transition={{ duration: 0.25 }}
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at center, color-mix(in srgb, var(--primary) 15%, transparent) 0%, transparent 70%)",
        }}
      />

      <motion.div
        animate={
          hovered
            ? { filter: "drop-shadow(0 0 8px #a855f7)", scale: 1.15 }
            : { filter: "drop-shadow(0 0 0px #a855f7)", scale: 1 }
        }
        transition={{ duration: 0.25 }}
      >
        <Icon size={22} className="relative z-10" style={{ color: "var(--primary)" }} />
      </motion.div>

      <span className="text-xs text-gray-400 relative z-10 font-medium">
        {label}
      </span>
    </motion.button>
  );
}

export default function WelcomeScreen({ onNewFile, onOpenFolder, onOpenSettings }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="flex-1 flex items-center justify-center select-none bg-transparent"
    >
      {/* Ambient background glow */}
      <div
        className="absolute inset-0 pointer-events-none overflow-hidden"
      >
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-600/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full" />
      </div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="flex flex-col items-center text-center max-w-sm w-full relative z-10 px-6"
      >
        {/* Logo mark */}
        <motion.div variants={itemVariants} className="mb-6">
          <motion.span
            animate={{
              textShadow: [
                "0 0 20px rgba(168,85,247,0.6), 0 0 40px rgba(168,85,247,0.3)",
                "0 0 32px rgba(168,85,247,0.9), 0 0 64px rgba(168,85,247,0.5), 0 0 96px rgba(168,85,247,0.2)",
                "0 0 20px rgba(168,85,247,0.6), 0 0 40px rgba(168,85,247,0.3)",
              ],
            }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            className="text-6xl text-purple-400 font-bold leading-none"
            style={{ fontFamily: "serif" }}
          >
            ✦
          </motion.span>
        </motion.div>

        {/* Title */}
        <motion.h1
          variants={itemVariants}
          className="text-3xl font-bold mb-2 tracking-tight"
          style={{
            background:
              "linear-gradient(135deg, var(--primary) 0%, var(--nexus-function, #818cf8) 50%, var(--nexus-keyword, #60a5fa) 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          Nexus Code
        </motion.h1>

        <motion.p
          variants={itemVariants}
          className="text-sm text-gray-500 mb-10 tracking-wide"
        >
          Plan more efficient.{" "}
          <span className="text-gray-400">Code smarter.</span>
        </motion.p>

        {/* Action cards */}
        <motion.div
          variants={itemVariants}
          className="grid grid-cols-3 gap-3 w-full mb-10"
        >
          <ActionCard icon={Plus} label="Neu" onClick={onNewFile} />
          <ActionCard icon={FolderOpen} label="Öffnen" onClick={onOpenFolder} />
          <ActionCard
            icon={Settings}
            label="Setup"
            onClick={onOpenSettings}
          />
        </motion.div>

        {/* Keyboard shortcuts hint */}
        <motion.div
          variants={itemVariants}
          className="w-full rounded-xl p-4 mb-8"
          style={{
            background: "rgba(255,255,255,0.01)",
            border: "1px solid var(--nexus-border)",
          }}
        >
          <p className="text-[10px] text-gray-600 uppercase tracking-widest mb-3 font-semibold">
            Tastenkürzel
          </p>
          <div className="grid grid-cols-2 gap-y-2 gap-x-4">
            {[
              ["Ctrl + S", "Speichern"],
              ["Ctrl + B", "Sidebar"],
              ["Ctrl + `", "Terminal"],
              ["Ctrl + W", "Tab schließen"],
              ["F2", "Umbenennen"],
              ["Tab", "Einrücken"],
            ].map(([key, desc]) => (
              <div key={key} className="flex items-center gap-1.5">
                <kbd
                  className="text-[9px] font-mono px-1.5 py-0.5 rounded font-semibold shrink-0"
                  style={{
                    background: "color-mix(in srgb, var(--primary) 12%, transparent)",
                    border: "1px solid color-mix(in srgb, var(--primary) 20%, transparent)",
                    color: "var(--primary)",
                  }}
                >
                  {key}
                </kbd>
                <span className="text-[10px] text-gray-600 truncate">
                  {desc}
                </span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Feature list */}
        <motion.div variants={itemVariants} className="space-y-2 w-full">
          {features.map((f, i) => {
            const Icon = f.icon;
            return (
              <motion.div
                key={i}
                animate={{ opacity: [0.45, 0.85, 0.45] }}
                transition={{
                  duration: 2.5,
                  repeat: Infinity,
                  delay: i * 0.4,
                  ease: "easeInOut",
                }}
                className="flex items-center gap-2 justify-center"
              >
                <Icon size={11} className="text-purple-400/60 shrink-0" />
                <span className="text-[11px] text-gray-600">{f.text}</span>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Version badge */}
        <motion.div
          variants={itemVariants}
          className="mt-8 flex items-center gap-1.5"
        >
          <div
            className="w-1.5 h-1.5 rounded-full"
            style={{
              background: "#22c55e",
              boxShadow: "0 0 6px #22c55e",
            }}
          />
          <span className="text-[10px] text-gray-700 font-mono">
            Nexus Code v1.0 — bereit
          </span>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
