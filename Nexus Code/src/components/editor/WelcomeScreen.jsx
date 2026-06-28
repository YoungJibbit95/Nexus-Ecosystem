import React, { useMemo } from "react";
import {
  ArrowRight,
  Braces,
  Code2,
  Command,
  FileCode2,
  FolderOpen,
  GitPullRequest,
  Palette,
  Plus,
  Search,
  Settings,
  Sparkles,
  TerminalSquare,
  Zap,
} from "lucide-react";
import { motion } from "framer-motion";
import { getNexusCodeIdeReleaseSnapshot } from "../../ide/ecosystem/ideCapabilityBridge";
import { getWelcomeRecentFiles } from "../../pages/editor/welcomeScreenModel";

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
    detail: "Instant TypeScript surface",
    action: "new",
    primary: true,
    tone: "primary",
  },
  {
    icon: FolderOpen,
    label: "Open project",
    detail: "Folder, tree and Git context",
    action: "folder",
    primary: true,
    tone: "teal",
  },
  {
    icon: Settings,
    label: "Tune editor",
    detail: "Theme, glow and layout",
    action: "settings",
    primary: false,
    tone: "neutral",
  },
];

const flowItems = [
  {
    icon: Command,
    title: "Command-first editing",
    detail: "Navigation, creation and setup stay one gesture away.",
    tone: "primary",
  },
  {
    icon: Search,
    title: "Search and inspect",
    detail: "Jump from files to symbols, problems and text without panel noise.",
    tone: "neutral",
  },
  {
    icon: GitPullRequest,
    title: "Source control flow",
    detail: "Local changes, branch state and review signals stay readable.",
    tone: "teal",
  },
  {
    icon: TerminalSquare,
    title: "Integrated runtime",
    detail: "Terminal, tasks and project commands live on the same surface.",
    tone: "neutral",
  },
];

const languageTiles = [
  { label: "TypeScript", detail: "JS/TS IDE core", tone: "primary" },
  { label: "Python", detail: "Lint and syntax path", tone: "teal" },
  { label: "Rust", detail: "Structured editing", tone: "neutral" },
  { label: "Go", detail: "Fast project work", tone: "neutral" },
];

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
        borderRadius: 18,
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
        minHeight: 68,
        gap: 12,
        borderRadius: 16,
        padding: "11px 13px",
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
          borderRadius: 13,
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
        borderRadius: 14,
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
          borderRadius: 9,
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

function FlowCard({ icon: Icon, title, detail, tone = "neutral" }) {
  const toneStyle = actionTones[tone] || actionTones.neutral;

  return (
    <motion.div
      variants={itemVariants}
      whileHover={{ y: -2 }}
      transition={{ type: "spring", stiffness: 420, damping: 32 }}
      className="flex min-w-0 items-start gap-2.5"
      style={{
        minHeight: 66,
        borderRadius: 16,
        border: `1px solid ${toneStyle.border}`,
        background:
          "linear-gradient(135deg, rgba(255, 255, 255, 0.042), rgba(255, 255, 255, 0.014))",
        padding: "10px 11px",
      }}
    >
      <span
        className="flex shrink-0 items-center justify-center"
        style={{
          width: 27,
          height: 27,
          borderRadius: 10,
          border: `1px solid ${toneStyle.iconBorder}`,
          background: toneStyle.iconBg,
          color: toneStyle.iconColor,
        }}
      >
        <Icon size={14} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-xs font-semibold text-[var(--nexus-text)]">
          {title}
        </div>
        <div
          className="mt-1 text-[10px] leading-relaxed text-[var(--nexus-muted)]"
          style={{
            display: "-webkit-box",
            overflow: "hidden",
            WebkitBoxOrient: "vertical",
            WebkitLineClamp: 2,
          }}
        >
          {detail}
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
            name: "No local files yet",
            detail: "Create a scratch or open a project",
            meta: "local",
          },
        ];

  return (
    <SoftPanel
      className="nx-code-launchpad-recent flex flex-col"
      style={{ padding: 12 }}
    >
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <FileCode2
            size={14}
            className="shrink-0 text-[var(--nexus-primary,#7c8cff)]"
          />
          <span className="truncate text-xs font-semibold text-[var(--nexus-text)]">
            Recent files
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
              borderRadius: 14,
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
                borderRadius: 10,
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
            <span className="shrink-0 rounded-full border border-white/[0.06] bg-white/[0.025] px-1.5 py-0.5 text-[9px] font-semibold text-[var(--nexus-muted)]">
              {file.meta}
            </span>
          </motion.div>
        ))}
      </div>
    </SoftPanel>
  );
}

function FlowDeck() {
  return (
    <SoftPanel className="nx-code-launchpad-flow flex flex-col" style={{ padding: 12 }}>
      <div className="mb-2 flex min-w-0 items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <Sparkles
            size={14}
            className="shrink-0 text-[var(--nexus-primary,#7c8cff)]"
          />
          <span className="truncate text-xs font-semibold text-[var(--nexus-text)]">
            IDE flow
          </span>
        </div>
        <span className="shrink-0 rounded-full border border-white/[0.08] bg-white/[0.03] px-2 py-0.5 text-[10px] font-semibold text-[var(--nexus-muted)]">
          local first
        </span>
      </div>
      <div className="grid min-h-0 flex-1 gap-2 overflow-hidden sm:grid-cols-2">
        {flowItems.map((item) => (
          <FlowCard key={item.title} {...item} />
        ))}
      </div>
    </SoftPanel>
  );
}

function LanguageDeck({ fullIdeCount, syntaxCount }) {
  return (
    <SoftPanel
      className="nx-code-launchpad-languages flex flex-col"
      style={{ padding: 12 }}
    >
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <Braces
            size={14}
            className="shrink-0 text-[var(--nexus-primary,#7c8cff)]"
          />
          <span className="truncate text-xs font-semibold text-[var(--nexus-text)]">
            Language surfaces
          </span>
        </div>
        <span className="shrink-0 text-[10px] font-semibold text-[var(--nexus-muted)]">
          {fullIdeCount + syntaxCount} modes
        </span>
      </div>
      <div className="grid min-h-0 flex-1 gap-2 overflow-hidden sm:grid-cols-2">
        {languageTiles.map((tile) => (
          <FlowCard
            key={tile.label}
            icon={Code2}
            title={tile.label}
            detail={tile.detail}
            tone={tile.tone}
          />
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
  const recentFiles = useMemo(() => getWelcomeRecentFiles(4), []);
  const fullIdeCount = releaseSnapshot.language?.fullIdeLanguages?.length || 0;
  const syntaxCount = releaseSnapshot.language?.syntaxFirstLanguages?.length || 0;

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
      className="flex min-h-0 flex-1 items-center overflow-hidden bg-transparent"
      style={{
        boxSizing: "border-box",
        height: "100%",
        padding: "clamp(8px, 1.5vh, 14px) clamp(10px, 1.4vw, 18px)",
      }}
    >
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="nx-code-welcome nx-code-launchpad mx-auto grid min-h-0 w-full overflow-hidden"
        style={{
          width: "min(100%, 1180px)",
          height: "min(100%, 620px)",
          gridTemplateRows: "auto minmax(0, 1fr)",
          gap: 12,
        }}
      >
        <SoftPanel
          className="nx-code-launchpad-header"
          style={{
            padding: "14px 16px",
            background:
              "radial-gradient(circle at 16% 16%, rgba(var(--nexus-primary-rgb, 124, 140, 255), 0.18), transparent 42%), linear-gradient(135deg, rgba(var(--nexus-primary-rgb, 124, 140, 255), 0.11), rgba(255, 255, 255, 0.032) 48%, rgba(45, 212, 191, 0.055))",
          }}
        >
          <div className="grid min-w-0 items-center gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(22rem,auto)]">
            <div className="flex min-w-0 items-center gap-3">
              <div
                className="nx-code-launchpad-mark flex shrink-0 items-center justify-center border text-sm font-semibold"
                style={{
                  width: 50,
                  height: 50,
                  borderRadius: 18,
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
                    Nexus x Zed editor
                  </span>
                </div>
                <h1
                  className="mt-1 truncate font-semibold leading-none text-[var(--nexus-text)]"
                  style={{ fontSize: "clamp(1.75rem, 3vw, 2.45rem)" }}
                >
                  Nexus Code
                </h1>
                <p className="mt-1 truncate text-xs text-[var(--nexus-muted)]">
                  Fast local editing with terminal, Git, search and theme control.
                </p>
              </div>
            </div>

            <div className="grid min-w-0 grid-cols-3 gap-2">
              <MetricPill icon={Zap} label="Start" value="Local" tone="primary" />
              <MetricPill icon={FileCode2} label="Full IDE" value={fullIdeCount} />
              <MetricPill
                icon={Palette}
                label="Syntax"
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
            gridTemplateColumns: "minmax(0, 0.95fr) minmax(340px, 1.05fr)",
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

            <LanguageDeck fullIdeCount={fullIdeCount} syntaxCount={syntaxCount} />
          </div>

          <div
            className="grid min-h-0 min-w-0 gap-3"
            style={{ gridTemplateRows: "minmax(0, 1fr) minmax(0, 1fr)" }}
          >
            <FlowDeck />
            <RecentFiles files={recentFiles} />
          </div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
