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
import { MotionConfig, motion } from "framer-motion";
import {
  PanelBadge,
  PanelCard,
  useNexusReducedMotion,
} from "./panels/PanelChrome";
import { getNexusCodeIdeReleaseSnapshot } from "../../ide/ecosystem/ideCapabilityBridge";
import { getWelcomeRecentFiles } from "../../pages/editor/welcomeScreenModel";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.026, delayChildren: 0.025 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 5 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.18, ease: [0.4, 0, 0.2, 1] },
  },
};

const wrapText = {
  overflowWrap: "anywhere",
  wordBreak: "normal",
};

const softClamp = {
  display: "-webkit-box",
  overflow: "hidden",
  WebkitBoxOrient: "vertical",
  WebkitLineClamp: 2,
};

const actionItems = [
  {
    icon: Plus,
    label: "New scratch file",
    detail: "Start a clean editing surface instantly.",
    action: "new",
    tone: "primary",
  },
  {
    icon: FolderOpen,
    label: "Open project folder",
    detail: "Load files, Git state and terminal context.",
    action: "folder",
    tone: "teal",
  },
  {
    icon: Settings,
    label: "Tune editor setup",
    detail: "Theme, glow, layout and workspace feel.",
    action: "settings",
    tone: "neutral",
  },
];

const flowItems = [
  {
    icon: Command,
    title: "Command-first work",
    detail: "Create files, jump across the workspace and keep setup close.",
    tone: "primary",
  },
  {
    icon: Search,
    title: "Search and inspect",
    detail: "Move from files to symbols, problems and text with less panel noise.",
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
    title: "Runtime at hand",
    detail: "Terminal, project commands and editor context share one surface.",
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
    border: "rgba(var(--nexus-primary-rgb, 124, 140, 255), 0.28)",
    bg: "linear-gradient(135deg, rgba(var(--nexus-primary-rgb, 124, 140, 255), 0.15), rgba(255, 255, 255, 0.03))",
    iconBg: "rgba(var(--nexus-primary-rgb, 124, 140, 255), 0.14)",
    iconBorder: "rgba(var(--nexus-primary-rgb, 124, 140, 255), 0.24)",
    iconColor: "var(--nexus-primary, #7c8cff)",
    glow: "0 12px 28px rgba(var(--nexus-primary-rgb, 124, 140, 255), 0.1)",
  },
  teal: {
    border: "rgba(45, 212, 191, 0.24)",
    bg: "linear-gradient(135deg, rgba(45, 212, 191, 0.105), rgba(255, 255, 255, 0.028))",
    iconBg: "rgba(45, 212, 191, 0.105)",
    iconBorder: "rgba(45, 212, 191, 0.22)",
    iconColor: "#5eead4",
    glow: "0 12px 28px rgba(45, 212, 191, 0.075)",
  },
  neutral: {
    border: "rgba(255, 255, 255, 0.075)",
    bg: "linear-gradient(135deg, rgba(255, 255, 255, 0.044), rgba(255, 255, 255, 0.016))",
    iconBg: "rgba(255, 255, 255, 0.052)",
    iconBorder: "rgba(255, 255, 255, 0.09)",
    iconColor: "var(--nexus-muted, #99a3b7)",
    glow: "0 12px 28px rgba(0, 0, 0, 0.12)",
  },
};

function SoftPanel({ children, className = "", style = {}, tone = "muted" }) {
  return (
    <PanelCard
      as={motion.section}
      variants={itemVariants}
      tone={tone}
      className={`min-h-0 overflow-hidden ${className}`}
      style={{
        padding: 12,
        ...style,
      }}
    >
      {children}
    </PanelCard>
  );
}

function IconFrame({ icon: Icon, tone = "neutral", size = 15 }) {
  const toneStyle = actionTones[tone] || actionTones.neutral;

  return (
    <span
      className="flex shrink-0 items-center justify-center"
      style={{
        width: 34,
        height: 34,
        borderRadius: 13,
        border: `1px solid ${toneStyle.iconBorder}`,
        background: toneStyle.iconBg,
        color: toneStyle.iconColor,
      }}
    >
      <Icon size={size} />
    </span>
  );
}

function ActionButton({
  icon: Icon,
  label,
  detail,
  onClick,
  tone = "neutral",
  reduceMotion = false,
}) {
  const toneStyle = actionTones[tone] || actionTones.neutral;

  return (
    <motion.button
      type="button"
      variants={itemVariants}
      whileHover={reduceMotion ? undefined : { y: -1 }}
      whileTap={reduceMotion ? undefined : { scale: 0.992 }}
      transition={{ duration: 0.16, ease: [0.4, 0, 0.2, 1] }}
      onClick={onClick}
      className="nx-code-launchpad-action group grid min-w-0 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-purple-400/35"
      style={{
        minHeight: 62,
        gridTemplateColumns: "34px minmax(0, 1fr) auto",
        alignItems: "center",
        gap: 11,
        borderRadius: 18,
        padding: "10px 12px",
        border: `1px solid ${toneStyle.border}`,
        background: toneStyle.bg,
        boxShadow: toneStyle.glow,
      }}
    >
      <IconFrame icon={Icon} tone={tone} size={16} />
      <span className="min-w-0">
        <span
          className="block text-[13px] font-semibold leading-tight text-[var(--nexus-text)]"
          style={wrapText}
        >
          {label}
        </span>
        <span
          className="mt-1 block text-[10px] leading-snug text-[var(--nexus-muted)]"
          style={{ ...softClamp, ...wrapText }}
        >
          {detail}
        </span>
      </span>
      <ArrowRight
        size={14}
        className="shrink-0 text-[var(--nexus-muted)] opacity-55 transition-opacity group-hover:opacity-100"
      />
    </motion.button>
  );
}

function MetricPill({ icon: Icon, label, value, tone = "primary" }) {
  return (
    <motion.div
      variants={itemVariants}
      className="flex min-w-0 items-center gap-2"
      style={{
        minHeight: 34,
        borderRadius: 16,
        border: "1px solid rgba(255, 255, 255, 0.065)",
        background: "rgba(255, 255, 255, 0.032)",
        padding: "6px 9px",
      }}
    >
      <IconFrame icon={Icon} tone={tone} size={12} />
      <span className="min-w-0">
        <span
          className="block text-[10px] font-medium leading-tight text-[var(--nexus-muted)]"
          style={wrapText}
        >
          {label}
        </span>
        <span
          className="block text-xs font-semibold leading-tight text-[var(--nexus-text)]"
          style={wrapText}
        >
          {value}
        </span>
      </span>
    </motion.div>
  );
}

function FlowCard({ icon: Icon, title, detail, tone = "neutral", reduceMotion }) {
  const toneStyle = actionTones[tone] || actionTones.neutral;

  return (
    <motion.div
      variants={itemVariants}
      whileHover={reduceMotion ? undefined : { y: -1 }}
      transition={{ duration: 0.16, ease: [0.4, 0, 0.2, 1] }}
      className="flex min-w-0 items-start gap-2.5"
      style={{
        minHeight: 60,
        borderRadius: 17,
        border: `1px solid ${toneStyle.border}`,
        background:
          "linear-gradient(135deg, rgba(255, 255, 255, 0.04), rgba(255, 255, 255, 0.014))",
        padding: "9px 10px",
      }}
    >
      <IconFrame icon={Icon} tone={tone} size={13} />
      <div className="min-w-0 flex-1">
        <div
          className="text-[12px] font-semibold leading-tight text-[var(--nexus-text)]"
          style={wrapText}
        >
          {title}
        </div>
        <div
          className="mt-1 text-[10px] leading-snug text-[var(--nexus-muted)]"
          style={{ ...softClamp, ...wrapText }}
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
            detail: "Create a scratch file or open a project folder",
            meta: "local",
          },
        ];

  return (
    <SoftPanel className="nx-code-launchpad-recent flex flex-col">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <FileCode2
            size={14}
            className="shrink-0 text-[var(--nexus-primary,#7c8cff)]"
          />
          <span
            className="text-xs font-semibold leading-tight text-[var(--nexus-text)]"
            style={wrapText}
          >
            Recent files
          </span>
        </div>
        <PanelBadge tone="muted">{files.length || 0}</PanelBadge>
      </div>
      <div className="grid min-h-0 flex-1 content-start gap-2 overflow-hidden">
        {rows.map((file) => (
          <motion.div
            key={file.id}
            variants={itemVariants}
            className="flex min-w-0 items-center gap-2"
            style={{
              minHeight: 39,
              borderRadius: 15,
              border: "1px solid rgba(255, 255, 255, 0.052)",
              background: "rgba(255, 255, 255, 0.024)",
              padding: "6px 8px",
            }}
          >
            <span
              className="flex shrink-0 items-center justify-center text-[var(--nexus-muted)]"
              style={{
                width: 25,
                height: 25,
                borderRadius: 10,
                border: "1px solid rgba(255, 255, 255, 0.065)",
                background: "rgba(0, 0, 0, 0.11)",
              }}
            >
              <FileCode2 size={12} />
            </span>
            <div className="min-w-0 flex-1">
              <div
                className="text-[11px] font-semibold leading-tight text-[var(--nexus-text)]"
                style={wrapText}
              >
                {file.name}
              </div>
              <div
                className="mt-0.5 text-[10px] leading-tight text-[var(--nexus-muted)]"
                style={{ ...softClamp, WebkitLineClamp: 1, ...wrapText }}
              >
                {file.detail}
              </div>
            </div>
            <PanelBadge tone="muted" title={file.meta}>
              {file.meta}
            </PanelBadge>
          </motion.div>
        ))}
      </div>
    </SoftPanel>
  );
}

function FlowDeck({ reduceMotion }) {
  return (
    <SoftPanel className="nx-code-launchpad-flow flex flex-col">
      <div className="mb-2 flex min-w-0 items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <Sparkles
            size={14}
            className="shrink-0 text-[var(--nexus-primary,#7c8cff)]"
          />
          <span
            className="text-xs font-semibold leading-tight text-[var(--nexus-text)]"
            style={wrapText}
          >
            Productive flows
          </span>
        </div>
        <PanelBadge tone="success">local first</PanelBadge>
      </div>
      <div
        className="grid min-h-0 flex-1 gap-2 overflow-hidden"
        style={{
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 13rem), 1fr))",
        }}
      >
        {flowItems.map((item) => (
          <FlowCard key={item.title} {...item} reduceMotion={reduceMotion} />
        ))}
      </div>
    </SoftPanel>
  );
}

function CapabilityDeck({ fullIdeCount, syntaxCount, reduceMotion }) {
  return (
    <SoftPanel className="nx-code-launchpad-languages flex flex-col">
      <div className="mb-2 flex min-w-0 items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <Braces
            size={14}
            className="shrink-0 text-[var(--nexus-primary,#7c8cff)]"
          />
          <span
            className="text-xs font-semibold leading-tight text-[var(--nexus-text)]"
            style={wrapText}
          >
            Ready surfaces
          </span>
        </div>
        <div className="flex min-w-0 flex-wrap justify-end gap-1">
          <PanelBadge tone="accent">{fullIdeCount} full IDE</PanelBadge>
          <PanelBadge tone="teal">{syntaxCount} syntax</PanelBadge>
        </div>
      </div>
      <div
        className="grid min-h-0 flex-1 gap-2 overflow-hidden"
        style={{
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 9.5rem), 1fr))",
        }}
      >
        {languageTiles.map((tile) => (
          <FlowCard
            key={tile.label}
            icon={Code2}
            title={tile.label}
            detail={tile.detail}
            tone={tile.tone}
            reduceMotion={reduceMotion}
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
  const reduceMotion = useNexusReducedMotion();
  const releaseSnapshot = useMemo(getNexusCodeIdeReleaseSnapshot, []);
  const recentFiles = useMemo(() => getWelcomeRecentFiles(3), []);
  const fullIdeCount = releaseSnapshot.language?.fullIdeLanguages?.length || 0;
  const syntaxCount = releaseSnapshot.language?.syntaxFirstLanguages?.length || 0;

  const handleAction = (action) => {
    if (action === "new") onNewFile?.();
    if (action === "folder") onOpenFolder?.();
    if (action === "settings") onOpenSettings?.();
  };

  return (
    <MotionConfig reducedMotion={reduceMotion ? "always" : "user"}>
      <motion.div
        initial={reduceMotion ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: reduceMotion ? 0 : 0.16, ease: [0.4, 0, 0.2, 1] }}
        className="flex min-h-0 flex-1 items-center overflow-hidden bg-transparent"
        style={{
          boxSizing: "border-box",
          height: "100%",
          padding: "clamp(7px, 1.25vh, 12px) clamp(9px, 1.25vw, 16px)",
        }}
      >
        <motion.div
          variants={containerVariants}
          initial={reduceMotion ? false : "hidden"}
          animate="visible"
          className="nx-code-welcome nx-code-launchpad mx-auto grid min-h-0 w-full overflow-hidden"
          style={{
            width: "min(100%, 1100px)",
            height: "100%",
            gridTemplateRows: "auto minmax(0, 1fr)",
            gap: 10,
          }}
        >
          <SoftPanel
            className="nx-code-launchpad-header"
            style={{
              padding: "12px 14px",
              background:
                "radial-gradient(circle at 10% 10%, rgba(var(--nexus-primary-rgb, 124, 140, 255), 0.15), transparent 38%), linear-gradient(135deg, rgba(var(--nexus-primary-rgb, 124, 140, 255), 0.095), rgba(255, 255, 255, 0.028) 50%, rgba(45, 212, 191, 0.05))",
            }}
          >
            <div
              className="grid min-w-0 items-center gap-3"
              style={{
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(min(100%, 22rem), 1fr))",
              }}
            >
              <div className="flex min-w-0 items-center gap-3">
                <div
                  className="nx-code-launchpad-mark flex shrink-0 items-center justify-center border text-sm font-semibold"
                  style={{
                    width: 46,
                    height: 46,
                    borderRadius: 17,
                    background:
                      "linear-gradient(145deg, rgba(var(--nexus-primary-rgb, 124, 140, 255), 0.15), rgba(255, 255, 255, 0.045))",
                    borderColor:
                      "rgba(var(--nexus-primary-rgb, 124, 140, 255), 0.24)",
                    color: "var(--nexus-primary, #7c8cff)",
                    boxShadow:
                      "0 0 22px rgba(var(--nexus-primary-rgb, 124, 140, 255), 0.11)",
                  }}
                >
                  NC
                </div>
                <div className="min-w-0">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <Sparkles
                      size={13}
                      className="shrink-0 text-[var(--nexus-primary,#7c8cff)]"
                    />
                    <span
                      className="text-[11px] font-semibold leading-tight text-[var(--nexus-muted)]"
                      style={wrapText}
                    >
                      Nexus x Zed editor
                    </span>
                  </div>
                  <h1
                    className="mt-1 text-[2rem] font-semibold leading-none text-[var(--nexus-text)]"
                    style={wrapText}
                  >
                    Nexus Code
                  </h1>
                  <p
                    className="mt-1 max-w-[38rem] text-xs leading-snug text-[var(--nexus-muted)]"
                    style={wrapText}
                  >
                    Local editing with terminal, Git, search and theme control.
                  </p>
                </div>
              </div>

              <div
                className="grid min-w-0 gap-2"
                style={{
                  gridTemplateColumns:
                    "repeat(auto-fit, minmax(min(100%, 6.8rem), 1fr))",
                }}
              >
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
            className="grid min-h-0 min-w-0 gap-3 overflow-hidden"
            style={{
              gridTemplateColumns:
                "repeat(auto-fit, minmax(min(100%, 22rem), 1fr))",
            }}
          >
            <div
              className="grid min-h-0 min-w-0 gap-3 overflow-hidden"
              style={{ gridTemplateRows: "auto minmax(0, 1fr)" }}
            >
              <div
                className="grid min-w-0 gap-2"
                style={{
                  gridTemplateColumns:
                    "repeat(auto-fit, minmax(min(100%, 9.6rem), 1fr))",
                }}
              >
                {actionItems.map((item) => (
                  <ActionButton
                    key={item.action}
                    icon={item.icon}
                    label={item.label}
                    detail={item.detail}
                    tone={item.tone}
                    reduceMotion={reduceMotion}
                    onClick={() => handleAction(item.action)}
                  />
                ))}
              </div>

              <RecentFiles files={recentFiles} />
            </div>

            <div
              className="grid min-h-0 min-w-0 gap-3 overflow-hidden"
              style={{ gridTemplateRows: "minmax(0, 1fr) minmax(0, 0.92fr)" }}
            >
              <FlowDeck reduceMotion={reduceMotion} />
              <CapabilityDeck
                fullIdeCount={fullIdeCount}
                syntaxCount={syntaxCount}
                reduceMotion={reduceMotion}
              />
            </div>
          </motion.div>
        </motion.div>
      </motion.div>
    </MotionConfig>
  );
}
