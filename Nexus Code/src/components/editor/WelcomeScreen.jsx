import React, { useMemo } from "react";
import {
  Braces,
  CheckCircle2,
  FileCode2,
  FolderOpen,
  GitBranch,
  Layers3,
  Plus,
  Settings,
  Terminal,
} from "lucide-react";
import { motion } from "framer-motion";
import {
  IDE_CAPABILITY_STATUS_LABELS,
  getNexusCodeIdeReleaseSnapshot,
} from "../../ide/ecosystem/ideCapabilityBridge";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.04, delayChildren: 0.05 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 340, damping: 34 },
  },
};

const actionItems = [
  { icon: Plus, label: "Neue Datei", action: "new" },
  { icon: FolderOpen, label: "Ordner oeffnen", action: "folder" },
  { icon: Settings, label: "Setup", action: "settings" },
];

const capabilityIcons = {
  languages: Braces,
  terminal: Terminal,
  git: GitBranch,
  github: GitBranch,
  theme: Layers3,
  editor: FileCode2,
};

function ActionButton({ icon: Icon, label, onClick }) {
  return (
    <motion.button
      type="button"
      variants={itemVariants}
      whileHover={{ x: 2 }}
      whileTap={{ scale: 0.99 }}
      onClick={onClick}
      className="group flex h-10 min-w-0 items-center gap-2 rounded-md px-2.5 text-left outline-none transition-colors hover:bg-white/[0.055] focus-visible:ring-2 focus-visible:ring-purple-500/60"
      style={{
        border: "1px solid rgba(255,255,255,0.065)",
        background: "rgba(255,255,255,0.025)",
      }}
    >
      <Icon
        size={15}
        className="shrink-0 text-[var(--nexus-primary,#7c8cff)]"
      />
      <span className="min-w-0 truncate text-xs font-semibold text-[var(--nexus-text)]">
        {label}
      </span>
    </motion.button>
  );
}

function CapabilityRow({ capability }) {
  const Icon = capabilityIcons[capability.area] || CheckCircle2;
  const statusLabel =
    IDE_CAPABILITY_STATUS_LABELS[capability.status] || capability.status;

  return (
    <motion.div
      variants={itemVariants}
      className="grid min-h-[2.4rem] grid-cols-[1.15rem_minmax(0,1fr)_minmax(4.75rem,max-content)] items-center gap-2 border-b border-white/[0.055] py-2 last:border-b-0"
    >
      <Icon
        size={14}
        className="shrink-0"
        style={{ color: "var(--nexus-primary, #7c8cff)" }}
      />
      <div className="min-w-0 truncate text-xs font-medium text-[var(--nexus-text)]">
        {capability.label}
      </div>
      <div className="min-w-0 justify-self-end truncate rounded border border-white/[0.07] bg-white/[0.025] px-2 py-0.5 text-right text-[9px] font-semibold uppercase tracking-wide text-[var(--nexus-muted)]">
        {statusLabel}
      </div>
    </motion.div>
  );
}

export default function WelcomeScreen({
  onNewFile,
  onOpenFolder,
  onOpenSettings,
}) {
  const releaseSnapshot = useMemo(getNexusCodeIdeReleaseSnapshot, []);
  const visibleCapabilities =
    releaseSnapshot.capability.visibleCapabilities.slice(0, 6);

  const handleAction = (action) => {
    if (action === "new") onNewFile?.();
    if (action === "folder") onOpenFolder?.();
    if (action === "settings") onOpenSettings?.();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="flex-1 overflow-y-auto bg-transparent"
    >
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="mx-auto flex min-h-full w-full max-w-5xl flex-col justify-start gap-5 px-5 py-6 sm:px-8 md:justify-center lg:px-10"
      >
        <motion.section
          variants={itemVariants}
          className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-start"
        >
          <div className="min-w-0">
            <div className="mb-4 flex items-center gap-3">
              <div
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md border text-sm font-semibold"
                style={{
                  background: "rgba(var(--nexus-primary-rgb, 124, 140, 255), 0.1)",
                  borderColor:
                    "rgba(var(--nexus-primary-rgb, 124, 140, 255), 0.24)",
                  color: "var(--nexus-primary, #7c8cff)",
                }}
              >
                NC
              </div>
              <div className="min-w-0">
                <h1 className="text-3xl font-semibold tracking-normal text-[var(--nexus-text)] sm:text-4xl">
                  Nexus Code
                </h1>
                <p className="mt-1 truncate text-sm text-[var(--nexus-muted)]">
                  {releaseSnapshot.language.fullIdeLabel}
                </p>
              </div>
            </div>

            <div
              className="h-px w-full"
              style={{
                background:
                  "linear-gradient(90deg, rgba(var(--nexus-primary-rgb,124,140,255),0.5), rgba(255,255,255,0.08), transparent)",
              }}
            />

            <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
              {actionItems.map((item) => (
                <ActionButton
                  key={item.action}
                  icon={item.icon}
                  label={item.label}
                  onClick={() => handleAction(item.action)}
                />
              ))}
            </div>
          </div>

          <motion.div
            variants={itemVariants}
            className="rounded-lg border border-white/[0.07] bg-white/[0.026] p-3"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="text-[10px] font-semibold uppercase tracking-wide text-[var(--nexus-muted)]">
                Release
              </div>
              <div className="min-w-0 max-w-[8rem] shrink-0 truncate rounded border border-emerald-400/20 bg-emerald-400/10 px-2 py-0.5 text-[9px] font-semibold text-emerald-300">
                Foundation
              </div>
            </div>
            <div className="mt-2 flex items-end gap-2">
              <span className="text-3xl font-semibold text-[var(--nexus-text)]">
                {releaseSnapshot.capability.foundationReady}
              </span>
              <span className="pb-1 text-xs text-[var(--nexus-muted)]">
                / {releaseSnapshot.capability.totalCapabilities}
              </span>
            </div>
            <p className="mt-2 line-clamp-2 text-[11px] leading-relaxed text-[var(--nexus-muted)]">
              {releaseSnapshot.capability.phaseOne}
            </p>
          </motion.div>
        </motion.section>

        <motion.section
          variants={itemVariants}
          className="rounded-lg border border-white/[0.06] bg-white/[0.018] px-3"
        >
          {visibleCapabilities.map((capability) => (
            <CapabilityRow key={capability.id} capability={capability} />
          ))}
        </motion.section>
      </motion.div>
    </motion.div>
  );
}
