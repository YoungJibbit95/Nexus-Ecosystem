import React, { useMemo } from "react";
import {
  Activity,
  ArrowRight,
  Braces,
  CheckCircle2,
  CircleDot,
  Command,
  FileCode2,
  FolderOpen,
  GitBranch,
  Layers3,
  PanelLeftOpen,
  Plus,
  Settings,
  Sparkles,
  Terminal,
  Zap,
} from "lucide-react";
import { motion } from "framer-motion";
import {
  IDE_CAPABILITY_STATUS_LABELS,
  getNexusCodeIdeReleaseSnapshot,
} from "../../ide/ecosystem/ideCapabilityBridge";
import {
  WELCOME_WORKSPACE_ITEMS,
  getWelcomeRecentFiles,
} from "../../pages/editor/welcomeScreenModel";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.035, delayChildren: 0.04 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 360, damping: 34 },
  },
};

const actionItems = [
  {
    icon: Plus,
    label: "New scratch",
    detail: "TypeScript ready",
    action: "new",
    primary: true,
    tone: "primary",
  },
  {
    icon: FolderOpen,
    label: "Open workspace",
    detail: "Local project",
    action: "folder",
    primary: true,
    tone: "teal",
  },
  {
    icon: Settings,
    label: "Tune shell",
    detail: "Editor setup",
    action: "settings",
    primary: false,
    tone: "neutral",
  },
];

const capabilityIcons = {
  languages: Braces,
  terminal: Terminal,
  git: GitBranch,
  github: GitBranch,
  theme: Layers3,
  editor: FileCode2,
};

const workspaceIcons = {
  workspace: PanelLeftOpen,
  drafts: FileCode2,
  shell: Command,
};

const actionTones = {
  primary: {
    border: "rgba(var(--nexus-primary-rgb, 124, 140, 255), 0.34)",
    bg: "linear-gradient(135deg, rgba(var(--nexus-primary-rgb, 124, 140, 255), 0.18), rgba(255, 255, 255, 0.035))",
    iconBg: "rgba(var(--nexus-primary-rgb, 124, 140, 255), 0.16)",
    iconBorder: "rgba(var(--nexus-primary-rgb, 124, 140, 255), 0.32)",
    iconColor: "var(--nexus-primary, #7c8cff)",
    glow: "0 14px 34px rgba(var(--nexus-primary-rgb, 124, 140, 255), 0.12)",
  },
  teal: {
    border: "rgba(45, 212, 191, 0.28)",
    bg: "linear-gradient(135deg, rgba(45, 212, 191, 0.12), rgba(255, 255, 255, 0.03))",
    iconBg: "rgba(45, 212, 191, 0.12)",
    iconBorder: "rgba(45, 212, 191, 0.26)",
    iconColor: "#5eead4",
    glow: "0 14px 34px rgba(45, 212, 191, 0.09)",
  },
  neutral: {
    border: "rgba(255, 255, 255, 0.09)",
    bg: "linear-gradient(135deg, rgba(255, 255, 255, 0.046), rgba(255, 255, 255, 0.018))",
    iconBg: "rgba(255, 255, 255, 0.055)",
    iconBorder: "rgba(255, 255, 255, 0.105)",
    iconColor: "var(--nexus-muted, #99a3b7)",
    glow: "0 14px 34px rgba(0, 0, 0, 0.14)",
  },
};

function SoftPanel({ children, className = "", style = {} }) {
  return (
    <motion.section
      variants={itemVariants}
      className={`min-h-0 min-w-0 overflow-hidden ${className}`}
      style={{
        borderRadius: 8,
        border: "1px solid rgba(255, 255, 255, 0.075)",
        background:
          "linear-gradient(180deg, rgba(255, 255, 255, 0.045), rgba(255, 255, 255, 0.016))",
        boxShadow:
          "0 18px 46px rgba(0, 0, 0, 0.18), inset 0 1px 0 rgba(255, 255, 255, 0.06)",
        ...style,
      }}
    >
      {children}
    </motion.section>
  );
}

function ActionButton({
  icon: Icon,
  label,
  detail,
  onClick,
  primary = false,
  tone = "neutral",
}) {
  const toneStyle = actionTones[tone] || actionTones.neutral;

  return (
    <motion.button
      type="button"
      variants={itemVariants}
      whileHover={{ y: -2, scale: 1.01 }}
      whileTap={{ scale: 0.985 }}
      transition={{ type: "spring", stiffness: 430, damping: 30 }}
      onClick={onClick}
      className={`nx-code-launchpad-action group flex min-w-0 items-center text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-purple-500/60 ${
        primary ? "nx-code-welcome-action-primary" : "nx-code-welcome-action"
      }`}
      style={{
        minHeight: 66,
        gap: 10,
        borderRadius: 8,
        padding: "10px 12px",
        border: `1px solid ${toneStyle.border}`,
        background: toneStyle.bg,
        boxShadow: toneStyle.glow,
      }}
    >
      <span
        className="flex shrink-0 items-center justify-center"
        style={{
          width: 36,
          height: 36,
          borderRadius: 8,
          border: `1px solid ${toneStyle.iconBorder}`,
          background: toneStyle.iconBg,
          color: toneStyle.iconColor,
        }}
      >
        <Icon size={17} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-[var(--nexus-text)]">
          {label}
        </span>
        <span className="mt-0.5 block truncate text-[11px] text-[var(--nexus-muted)]">
          {detail}
        </span>
      </span>
      <ArrowRight
        size={15}
        className="shrink-0 text-[var(--nexus-muted)] opacity-55 transition-opacity group-hover:opacity-100"
      />
    </motion.button>
  );
}

function MetricPill({ icon: Icon, label, value, tone = "primary" }) {
  const toneStyle = actionTones[tone] || actionTones.primary;

  return (
    <motion.div
      variants={itemVariants}
      className="flex min-w-0 items-center gap-2"
      style={{
        minHeight: 34,
        borderRadius: 8,
        border: "1px solid rgba(255, 255, 255, 0.075)",
        background: "rgba(255, 255, 255, 0.035)",
        padding: "6px 9px",
      }}
    >
      <span
        className="flex shrink-0 items-center justify-center"
        style={{
          width: 22,
          height: 22,
          borderRadius: 7,
          border: `1px solid ${toneStyle.iconBorder}`,
          background: toneStyle.iconBg,
          color: toneStyle.iconColor,
        }}
      >
        <Icon size={12} />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-[10px] font-medium text-[var(--nexus-muted)]">
          {label}
        </span>
        <span className="block truncate text-xs font-semibold text-[var(--nexus-text)]">
          {value}
        </span>
      </span>
    </motion.div>
  );
}

function WorkspaceCard({ item }) {
  const Icon = workspaceIcons[item.id] || CircleDot;

  return (
    <motion.div
      variants={itemVariants}
      className="flex min-w-0 items-center gap-2"
      style={{
        minHeight: 58,
        borderRadius: 8,
        border: "1px solid rgba(255, 255, 255, 0.065)",
        background: "rgba(0, 0, 0, 0.12)",
        padding: "9px 10px",
      }}
    >
      <span
        className="flex shrink-0 items-center justify-center text-[var(--nexus-primary,#7c8cff)]"
        style={{
          width: 30,
          height: 30,
          borderRadius: 8,
          border: "1px solid rgba(var(--nexus-primary-rgb, 124, 140, 255), 0.2)",
          background: "rgba(var(--nexus-primary-rgb, 124, 140, 255), 0.08)",
        }}
      >
        <Icon size={15} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-2">
          <span className="shrink-0 text-[10px] font-semibold text-[var(--nexus-muted)]">
            {item.label}
          </span>
          <span className="h-px min-w-4 flex-1 bg-white/[0.06]" />
        </div>
        <div className="mt-0.5 truncate text-xs font-semibold text-[var(--nexus-text)]">
          {item.title}
        </div>
        <div className="mt-0.5 truncate text-[10px] text-[var(--nexus-muted)]">
          {item.detail}
        </div>
      </div>
    </motion.div>
  );
}

function RecentFiles({ files }) {
  const rows =
    files.length > 0
      ? files
      : [
          {
            id: "empty",
            name: "No local recents",
            detail: "Open a folder or create a scratch",
            meta: "ready",
          },
        ];

  return (
    <SoftPanel className="nx-code-launchpad-recent flex flex-col" style={{ padding: 12 }}>
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <FileCode2
            size={14}
            className="shrink-0 text-[var(--nexus-primary,#7c8cff)]"
          />
          <span className="truncate text-xs font-semibold text-[var(--nexus-text)]">
            Recent
          </span>
        </div>
        <span className="shrink-0 text-[10px] font-semibold text-[var(--nexus-muted)]">
          {files.length || 0}
        </span>
      </div>
      <div className="grid min-h-0 flex-1 content-start gap-2 overflow-hidden">
        {rows.map((file) => (
          <motion.div
            key={file.id}
            variants={itemVariants}
            className="flex min-w-0 items-center gap-2"
            style={{
              minHeight: 42,
              borderRadius: 8,
              border: "1px solid rgba(255, 255, 255, 0.06)",
              background: "rgba(255, 255, 255, 0.026)",
              padding: "7px 9px",
            }}
          >
            <span
              className="flex shrink-0 items-center justify-center text-[var(--nexus-muted)]"
              style={{
                width: 26,
                height: 26,
                borderRadius: 7,
                border: "1px solid rgba(255, 255, 255, 0.075)",
                background: "rgba(0, 0, 0, 0.13)",
              }}
            >
              <FileCode2 size={13} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-semibold text-[var(--nexus-text)]">
                {file.name}
              </div>
              <div className="truncate text-[10px] text-[var(--nexus-muted)]">
                {file.detail}
              </div>
            </div>
            <span className="shrink-0 rounded-md border border-white/[0.06] bg-white/[0.025] px-1.5 py-0.5 text-[9px] font-semibold text-[var(--nexus-muted)]">
              {file.meta}
            </span>
          </motion.div>
        ))}
      </div>
    </SoftPanel>
  );
}

function CapabilitySignal({ capability }) {
  const Icon = capabilityIcons[capability.area] || CheckCircle2;
  const statusLabel =
    IDE_CAPABILITY_STATUS_LABELS[capability.status] || capability.status;

  return (
    <motion.div
      variants={itemVariants}
      className="flex min-w-0 items-center gap-2"
      style={{
        minHeight: 42,
        borderRadius: 8,
        border: "1px solid rgba(255, 255, 255, 0.06)",
        background: "rgba(0, 0, 0, 0.11)",
        padding: "7px 9px",
      }}
    >
      <span
        className="flex shrink-0 items-center justify-center"
        style={{
          width: 27,
          height: 27,
          borderRadius: 7,
          border: "1px solid rgba(var(--nexus-primary-rgb, 124, 140, 255), 0.18)",
          background: "rgba(var(--nexus-primary-rgb, 124, 140, 255), 0.08)",
          color: "var(--nexus-primary, #7c8cff)",
        }}
      >
        <Icon size={14} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-xs font-semibold text-[var(--nexus-text)]">
          {capability.label}
        </div>
        <div className="mt-0.5 flex min-w-0 items-center gap-1.5 text-[10px] text-[var(--nexus-muted)]">
          <CircleDot size={8} className="shrink-0" />
          <span className="truncate">{statusLabel}</span>
        </div>
      </div>
    </motion.div>
  );
}

function ReadinessPanel({ releaseSnapshot }) {
  const ready = releaseSnapshot.capability.foundationReady;
  const total = releaseSnapshot.capability.totalCapabilities;
  const progress = total > 0 ? Math.round((ready / total) * 100) : 0;

  return (
    <SoftPanel
      className="nx-code-launchpad-readiness"
      style={{
        minHeight: 148,
        padding: 13,
        border: "1px solid rgba(45, 212, 191, 0.16)",
        background:
          "linear-gradient(180deg, rgba(45, 212, 191, 0.07), rgba(255, 255, 255, 0.017))",
      }}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <Activity size={14} className="shrink-0 text-emerald-300" />
          <span className="truncate text-xs font-semibold text-[var(--nexus-text)]">
            Readiness
          </span>
        </div>
        <span
          className="shrink-0 rounded-md px-2 py-1 text-[10px] font-semibold text-emerald-200"
          style={{
            border: "1px solid rgba(45, 212, 191, 0.22)",
            background: "rgba(45, 212, 191, 0.1)",
          }}
        >
          {progress}%
        </span>
      </div>

      <div className="mt-3 flex items-end gap-2">
        <span className="text-4xl font-semibold text-[var(--nexus-text)]">
          {ready}
        </span>
        <span className="pb-1.5 text-xs text-[var(--nexus-muted)]">
          / {total} foundation-ready
        </span>
      </div>

      <div
        className="mt-3 overflow-hidden"
        style={{
          height: 7,
          borderRadius: 999,
          background: "rgba(255, 255, 255, 0.07)",
        }}
      >
        <div
          style={{
            width: `${progress}%`,
            height: "100%",
            borderRadius: 999,
            background:
              "linear-gradient(90deg, rgba(var(--nexus-primary-rgb, 124, 140, 255), 0.84), rgba(45, 212, 191, 0.9))",
            boxShadow: "0 0 14px rgba(45, 212, 191, 0.28)",
          }}
        />
      </div>

      <p
        className="mt-3 text-[11px] leading-relaxed text-[var(--nexus-muted)]"
        style={{
          display: "-webkit-box",
          overflow: "hidden",
          WebkitBoxOrient: "vertical",
          WebkitLineClamp: 2,
        }}
      >
        {releaseSnapshot.capability.phaseOne}
      </p>
    </SoftPanel>
  );
}

function SignalPanel({ capabilities }) {
  return (
    <SoftPanel className="nx-code-launchpad-signals flex flex-col" style={{ padding: 12 }}>
      <div className="mb-2 flex min-w-0 items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <CheckCircle2
            size={14}
            className="shrink-0 text-[var(--nexus-primary,#7c8cff)]"
          />
          <span className="truncate text-xs font-semibold text-[var(--nexus-text)]">
            Workbench signals
          </span>
        </div>
        <span className="shrink-0 text-[10px] font-semibold text-[var(--nexus-muted)]">
          {capabilities.length} live
        </span>
      </div>
      <div className="grid min-h-0 flex-1 content-start gap-2 overflow-hidden">
        {capabilities.map((capability) => (
          <CapabilitySignal key={capability.id} capability={capability} />
        ))}
      </div>
    </SoftPanel>
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
  const recentFiles = useMemo(() => getWelcomeRecentFiles(3), []);
  const fullIdeCount = releaseSnapshot.language.fullIdeLanguages.length;
  const syntaxCount = releaseSnapshot.language.syntaxFirstLanguages.length;

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
      className="flex-1 min-h-0 overflow-hidden bg-transparent"
      style={{
        boxSizing: "border-box",
        height: "100%",
        padding: "clamp(8px, 1.7vh, 14px) 14px",
      }}
    >
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="nx-code-welcome nx-code-launchpad mx-auto grid min-h-0 w-full"
        style={{
          width: "min(100%, 1120px)",
          height: "min(100%, 600px)",
          gridTemplateRows: "auto minmax(0, 1fr)",
          gap: 10,
        }}
      >
        <SoftPanel
          className="nx-code-launchpad-header"
          style={{
            padding: "12px 14px",
            background:
              "linear-gradient(135deg, rgba(var(--nexus-primary-rgb, 124, 140, 255), 0.105), rgba(255, 255, 255, 0.032) 46%, rgba(45, 212, 191, 0.047))",
          }}
        >
          <div className="grid min-w-0 items-center gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(22rem,auto)]">
            <div className="flex min-w-0 items-center gap-3">
              <div
                className="nx-code-launchpad-mark flex shrink-0 items-center justify-center border text-sm font-semibold"
                style={{
                  width: 46,
                  height: 46,
                  borderRadius: 8,
                  background:
                    "linear-gradient(145deg, rgba(var(--nexus-primary-rgb, 124, 140, 255), 0.17), rgba(255, 255, 255, 0.05))",
                  borderColor:
                    "rgba(var(--nexus-primary-rgb, 124, 140, 255), 0.3)",
                  color: "var(--nexus-primary, #7c8cff)",
                  boxShadow:
                    "0 0 24px rgba(var(--nexus-primary-rgb, 124, 140, 255), 0.14)",
                }}
              >
                NC
              </div>
              <div className="min-w-0">
                <div className="flex min-w-0 items-center gap-2">
                  <Sparkles
                    size={13}
                    className="shrink-0 text-[var(--nexus-primary,#7c8cff)]"
                  />
                  <span className="truncate text-[11px] font-semibold text-[var(--nexus-muted)]">
                    Nexus x Zed shell
                  </span>
                </div>
                <h1 className="mt-1 truncate text-3xl font-semibold text-[var(--nexus-text)]">
                  Nexus Code
                </h1>
                <p className="mt-1 truncate text-xs text-[var(--nexus-muted)]">
                  {releaseSnapshot.language.fullIdeLabel}
                </p>
              </div>
            </div>

            <div className="grid min-w-0 grid-cols-3 gap-2">
              <MetricPill
                icon={Zap}
                label="Ready core"
                value={`${releaseSnapshot.capability.foundationReady}/${releaseSnapshot.capability.totalCapabilities}`}
                tone="primary"
              />
              <MetricPill
                icon={FileCode2}
                label="Full IDE"
                value={fullIdeCount}
                tone="neutral"
              />
              <MetricPill
                icon={Layers3}
                label="Syntax tier"
                value={syntaxCount}
                tone="teal"
              />
            </div>
          </div>
        </SoftPanel>

        <motion.div
          variants={itemVariants}
          className="grid min-h-0 min-w-0 gap-3"
          style={{
            gridTemplateColumns: "minmax(0, 1.18fr) minmax(288px, 0.82fr)",
          }}
        >
          <div
            className="grid min-h-0 min-w-0 gap-3"
            style={{ gridTemplateRows: "auto minmax(0, 1fr)" }}
          >
            <div className="grid min-w-0 gap-2 lg:grid-cols-3">
              {actionItems.map((item) => (
                <ActionButton
                  key={item.action}
                  icon={item.icon}
                  label={item.label}
                  detail={item.detail}
                  primary={item.primary}
                  tone={item.tone}
                  onClick={() => handleAction(item.action)}
                />
              ))}
            </div>

            <div className="grid min-h-0 min-w-0 gap-3 lg:grid-cols-[0.9fr_1.1fr]">
              <SoftPanel
                className="nx-code-launchpad-workspace flex flex-col"
                style={{ padding: 12 }}
              >
                <div className="mb-2 flex min-w-0 items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <PanelLeftOpen
                      size={14}
                      className="shrink-0 text-[var(--nexus-primary,#7c8cff)]"
                    />
                    <span className="truncate text-xs font-semibold text-[var(--nexus-text)]">
                      Workspace
                    </span>
                  </div>
                  <span className="shrink-0 text-[10px] font-semibold text-[var(--nexus-muted)]">
                    focused
                  </span>
                </div>
                <div className="grid min-h-0 flex-1 content-start gap-2 overflow-hidden">
                  {WELCOME_WORKSPACE_ITEMS.map((item) => (
                    <WorkspaceCard key={item.id} item={item} />
                  ))}
                </div>
              </SoftPanel>

              <RecentFiles files={recentFiles} />
            </div>
          </div>

          <div
            className="grid min-h-0 min-w-0 gap-3"
            style={{ gridTemplateRows: "auto minmax(0, 1fr)" }}
          >
            <ReadinessPanel releaseSnapshot={releaseSnapshot} />
            <SignalPanel capabilities={visibleCapabilities} />
          </div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
