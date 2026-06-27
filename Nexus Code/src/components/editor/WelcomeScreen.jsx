import React, { useMemo, useState } from "react";
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
    transition: { staggerChildren: 0.06, delayChildren: 0.08 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 320, damping: 34 },
  },
};

const actionItems = [
  { icon: Plus, label: "Neue Datei", action: "new" },
  { icon: FolderOpen, label: "Ordner öffnen", action: "folder" },
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
  const [hovered, setHovered] = useState(false);

  return (
    <motion.button
      variants={itemVariants}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      onClick={onClick}
      className="group flex min-h-[6.25rem] flex-col items-start justify-between rounded-lg p-4 text-left transition-colors"
      style={{
        background: hovered
          ? "rgba(var(--nexus-primary-rgb, 124, 140, 255), 0.12)"
          : "rgba(255,255,255,0.035)",
        border: hovered
          ? "1px solid rgba(var(--nexus-primary-rgb, 124, 140, 255), 0.34)"
          : "1px solid var(--nexus-border)",
      }}
    >
      <Icon
        size={20}
        className="transition-transform group-hover:scale-105"
        style={{ color: "var(--nexus-primary, var(--primary))" }}
      />
      <span className="text-sm font-medium text-[var(--nexus-text)]">
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
      className="flex items-center gap-2 rounded-md px-3 py-2"
      style={{
        background: "rgba(255,255,255,0.035)",
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
        <div className="text-[10px] uppercase tracking-wide text-[var(--nexus-muted)]">
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
    releaseSnapshot.capability.visibleCapabilities.slice(0, 4);

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
        className="mx-auto flex min-h-full w-full max-w-5xl flex-col justify-center gap-8 px-5 py-8 sm:px-8 lg:px-10"
      >
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-end">
          <div className="min-w-0">
            <motion.div
              variants={itemVariants}
              className="mb-5 flex items-center gap-3"
            >
              <div
                className="flex h-10 w-10 items-center justify-center rounded-lg border text-lg font-semibold"
                style={{
                  background: "rgba(var(--nexus-primary-rgb, 124, 140, 255), 0.1)",
                  borderColor:
                    "rgba(var(--nexus-primary-rgb, 124, 140, 255), 0.24)",
                  color: "var(--nexus-primary, var(--primary))",
                }}
              >
                N
              </div>
              <div className="min-w-0">
                <h1 className="text-2xl font-semibold tracking-normal text-[var(--nexus-text)] sm:text-3xl">
                  Nexus Code
                </h1>
                <p className="mt-1 text-sm text-[var(--nexus-muted)]">
                  IDE-Fundament im Recode, direkt im Nexus-Ecosystem.
                </p>
              </div>
            </motion.div>

            <motion.div
              variants={itemVariants}
              className="grid grid-cols-1 gap-3 sm:grid-cols-3"
            >
              {actionItems.map((item) => (
                <ActionCard
                  key={item.action}
                  icon={item.icon}
                  label={item.label}
                  onClick={() => handleAction(item.action)}
                />
              ))}
            </motion.div>
          </div>

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
                von {releaseSnapshot.capability.totalCapabilities} Bausteinen
              </span>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-[var(--nexus-muted)]">
              {releaseSnapshot.capability.phaseOne}
            </p>
          </motion.div>
        </div>

        <motion.div
          variants={itemVariants}
          className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4"
        >
          {visibleCapabilities.map((capability) => (
            <StatusPill key={capability.id} capability={capability} />
          ))}
        </motion.div>

        <motion.div
          variants={itemVariants}
          className="rounded-lg px-4 py-3 text-xs leading-relaxed text-[var(--nexus-muted)]"
          style={{
            background: "rgba(var(--nexus-primary-rgb, 124, 140, 255), 0.06)",
            border: "1px solid rgba(var(--nexus-primary-rgb, 124, 140, 255), 0.16)",
          }}
        >
          Zielsprachen fuer den ersten IDE-Ausbau:{" "}
          <span className="text-[var(--nexus-text)]">
            {releaseSnapshot.language.fullIdeLabel}
          </span>
          . Weitere Sprachen bleiben zuerst Syntax- oder LSP-Next-Support.
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
