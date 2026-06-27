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
    transition: { staggerChildren: 0.05, delayChildren: 0.06 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 320, damping: 34 },
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

function ActionCard({ icon: Icon, label, onClick }) {
  return (
    <motion.button
      type="button"
      variants={itemVariants}
      whileHover={{ y: -1 }}
      whileTap={{ scale: 0.99 }}
      onClick={onClick}
      className="group flex min-h-[4.75rem] items-center gap-3 rounded-lg p-3 text-left transition-colors"
      style={{
        background: "rgba(255,255,255,0.035)",
        border: "1px solid var(--nexus-border)",
      }}
    >
      <span
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border"
        style={{
          background: "rgba(var(--nexus-primary-rgb, 124, 140, 255), 0.1)",
          borderColor: "rgba(var(--nexus-primary-rgb, 124, 140, 255), 0.2)",
          color: "var(--nexus-primary, var(--primary))",
        }}
      >
        <Icon size={18} />
      </span>
      <span className="min-w-0 truncate text-sm font-semibold text-[var(--nexus-text)]">
        {label}
      </span>
    </motion.button>
  );
}

function StatusPill({ capability }) {
  const Icon = capabilityIcons[capability.area] || CheckCircle2;
  const statusLabel =
    IDE_CAPABILITY_STATUS_LABELS[capability.status] || capability.status;

  return (
    <div
      className="flex min-h-[3.25rem] items-center gap-2 rounded-md px-3 py-2"
      style={{
        background: "rgba(255,255,255,0.03)",
        border: "1px solid var(--nexus-border)",
      }}
    >
      <Icon
        size={14}
        className="shrink-0"
        style={{ color: "var(--nexus-primary, var(--primary))" }}
      />
      <div className="min-w-0">
        <div className="truncate text-xs font-medium text-[var(--nexus-text)]">
          {capability.label}
        </div>
        <div className="truncate text-[10px] uppercase tracking-wide text-[var(--nexus-muted)]">
          {statusLabel}
        </div>
      </div>
    </div>
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
        className="mx-auto flex min-h-full w-full max-w-6xl flex-col justify-center gap-5 px-5 py-6 sm:px-8 lg:px-10"
      >
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-stretch">
          <motion.div
            variants={itemVariants}
            className="flex min-w-0 flex-col justify-between rounded-lg p-5"
            style={{
              background: "rgba(255,255,255,0.025)",
              border: "1px solid var(--nexus-border)",
            }}
          >
            <div className="flex items-center gap-3">
              <div
                className="flex h-11 w-11 items-center justify-center rounded-lg border text-sm font-semibold"
                style={{
                  background: "rgba(var(--nexus-primary-rgb, 124, 140, 255), 0.1)",
                  borderColor:
                    "rgba(var(--nexus-primary-rgb, 124, 140, 255), 0.24)",
                  color: "var(--nexus-primary, var(--primary))",
                }}
              >
                NC
              </div>
              <div className="min-w-0">
                <h1 className="text-2xl font-semibold tracking-normal text-[var(--nexus-text)]">
                  Nexus Code
                </h1>
                <p className="mt-1 truncate text-sm text-[var(--nexus-muted)]">
                  {releaseSnapshot.language.fullIdeLabel}
                </p>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-3">
              {actionItems.map((item) => (
                <ActionCard
                  key={item.action}
                  icon={item.icon}
                  label={item.label}
                  onClick={() => handleAction(item.action)}
                />
              ))}
            </div>
          </motion.div>

          <motion.div
            variants={itemVariants}
            className="rounded-lg p-4"
            style={{
              background: "rgba(255,255,255,0.035)",
              border: "1px solid var(--nexus-border)",
            }}
          >
            <div className="text-xs font-semibold uppercase tracking-wide text-[var(--nexus-muted)]">
              Release-Stand
            </div>
            <div className="mt-3 flex items-end gap-2">
              <span className="text-3xl font-semibold text-[var(--nexus-text)]">
                {releaseSnapshot.capability.foundationReady}
              </span>
              <span className="pb-1 text-sm text-[var(--nexus-muted)]">
                / {releaseSnapshot.capability.totalCapabilities}
              </span>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-[var(--nexus-muted)]">
              {releaseSnapshot.capability.phaseOne}
            </p>
          </motion.div>
        </div>

        <motion.div
          variants={itemVariants}
          className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3"
        >
          {visibleCapabilities.map((capability) => (
            <StatusPill key={capability.id} capability={capability} />
          ))}
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
