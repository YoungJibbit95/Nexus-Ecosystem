import React, { useMemo } from "react";
import {
  ArrowRight,
  Command,
  FileCode2,
  FolderOpen,
  GitPullRequest,
  Plus,
  Search,
  Settings,
  TerminalSquare,
} from "lucide-react";
import { MotionConfig, motion } from "framer-motion";
import {
  PanelBadge,
  PanelCard,
  useNexusReducedMotion,
} from "./panels/PanelChrome";
import { getWelcomeRecentFiles } from "../../pages/editor/welcomeScreenModel";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.018, delayChildren: 0.01 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 4 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.18, ease: [0.22, 1, 0.36, 1] },
  },
};

const wrapText = {
  overflowWrap: "normal",
  wordBreak: "normal",
  hyphens: "auto",
};

const softClamp = {
  display: "block",
  overflow: "visible",
  maxWidth: "100%",
};

const launchpadText = "var(--nx-code-strong-text, #f8fafc)";
const launchpadBodyText = "var(--nx-code-text, #e5edf8)";
const launchpadMutedText = "var(--nx-code-muted-text, #9aa7ba)";

const actionItems = [
  {
    icon: Plus,
    label: "Neue Datei",
    detail: "Untitled Buffer starten.",
    action: "new",
    tone: "primary",
  },
  {
    icon: FolderOpen,
    label: "Projekt oeffnen",
    detail: "Workspace laden.",
    action: "folder",
    tone: "blue",
  },
];

const flowItems = [
  {
    icon: Command,
    title: "Command-first work",
    detail: "Dateien, Befehle und Setup ohne Seitenwechsel.",
    tone: "primary",
  },
  {
    icon: Search,
    title: "Search and inspect",
    detail: "Text, Probleme und Scopes direkt vergleichen.",
    tone: "neutral",
  },
  {
    icon: GitPullRequest,
    title: "Source control flow",
    detail: "Aenderungen, Branch und Review-Signale scannen.",
    tone: "blue",
  },
  {
    icon: TerminalSquare,
    title: "Runtime at hand",
    detail: "Tasks und Shell bleiben nah am Editor.",
    tone: "neutral",
  },
];

const actionTones = {
  primary: {
    border: "rgba(var(--nexus-primary-rgb, 124, 140, 255), 0.17)",
    bg: "linear-gradient(135deg, rgba(var(--nexus-primary-rgb, 124, 140, 255), 0.09), rgba(255, 255, 255, 0.018)), rgba(6, 10, 17, 0.72)",
    iconBg: "rgba(var(--nexus-primary-rgb, 124, 140, 255), 0.12)",
    iconBorder: "rgba(var(--nexus-primary-rgb, 124, 140, 255), 0.2)",
    iconColor: "var(--nexus-primary, #7c8cff)",
    glow: "0 10px 22px rgba(0, 0, 0, 0.2), 0 0 12px rgba(var(--nexus-primary-rgb, 124, 140, 255), 0.028)",
  },
  blue: {
    border: "rgba(56, 189, 248, 0.16)",
    bg: "linear-gradient(135deg, rgba(56, 189, 248, 0.075), rgba(255, 255, 255, 0.014)), rgba(6, 10, 17, 0.72)",
    iconBg: "rgba(56, 189, 248, 0.105)",
    iconBorder: "rgba(56, 189, 248, 0.17)",
    iconColor: "#93c5fd",
    glow: "0 10px 22px rgba(0, 0, 0, 0.2), 0 0 12px rgba(56, 189, 248, 0.028)",
  },
  neutral: {
    border: "rgba(156, 178, 226, 0.075)",
    bg: "linear-gradient(135deg, rgba(255, 255, 255, 0.03), rgba(255, 255, 255, 0.009)), rgba(6, 10, 17, 0.72)",
    iconBg: "rgba(255, 255, 255, 0.04)",
    iconBorder: "rgba(255, 255, 255, 0.075)",
    iconColor: launchpadMutedText,
    glow: "0 10px 20px rgba(0, 0, 0, 0.18)",
  },
};

function SoftPanel({ children, className = "", style = {}, tone = "muted" }) {
  return (
    <PanelCard
      as={motion.section}
      variants={itemVariants}
      tone={tone}
      className={`nx-code-launchpad-panel min-h-0 min-w-0 ${className}`}
      style={{
        padding: "var(--nx-launchpad-panel-pad, 12px)",
        overflow: "visible",
        color: launchpadBodyText,
        background:
          "linear-gradient(180deg, rgba(255,255,255,0.028), rgba(255,255,255,0.007)), rgba(6,10,17,0.72)",
        ...style,
      }}
    >
      {children}
    </PanelCard>
  );
}

function SectionLabel({ icon: Icon, title, end }) {
  return (
    <motion.div
      variants={itemVariants}
      className="nx-code-launchpad-section-label flex min-w-0 items-center justify-between gap-3"
    >
      <div className="flex min-w-0 items-center gap-2">
        {Icon ? (
          <Icon size={13} className="shrink-0 text-[var(--nx-code-muted-text,#9aa7ba)] opacity-75" />
        ) : null}
        <span className="min-w-0 text-[10px] font-semibold uppercase leading-tight text-[var(--nx-code-muted-text,#9aa7ba)]">
          {title}
        </span>
      </div>
      {end ? <div className="shrink-0">{end}</div> : null}
    </motion.div>
  );
}

function IconFrame({
  icon: Icon,
  tone = "neutral",
  size = 15,
  frameSize = 34,
  radius = 13,
}) {
  const toneStyle = actionTones[tone] || actionTones.neutral;

  return (
    <span
      className="nx-code-launchpad-icon flex shrink-0 items-center justify-center"
      style={{
        width: frameSize,
        height: frameSize,
        borderRadius: radius,
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
      transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
      onClick={onClick}
      aria-label={`${label}: ${detail}`}
      className="nx-code-launchpad-action group grid min-w-0 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[rgba(var(--nexus-primary-rgb),0.24)]"
      style={{
        minHeight: "var(--nx-launchpad-action-min, 54px)",
        gridTemplateColumns:
          "var(--nx-launchpad-action-grid, 34px minmax(0, 1fr) 14px)",
        alignItems: "center",
        gap: "var(--nx-launchpad-action-gap, 10px)",
        borderRadius: "8px",
        padding: "var(--nx-launchpad-action-pad, 10px 12px)",
        border: `1px solid ${toneStyle.border}`,
        background: toneStyle.bg,
        color: launchpadText,
        boxShadow: reduceMotion
          ? "inset 0 1px 0 rgba(255,255,255,0.04)"
          : toneStyle.glow,
        overflow: "visible",
      }}
    >
      <IconFrame icon={Icon} tone={tone} size={16} />
      <span className="nx-code-launchpad-text min-w-0">
        <span
          className="nx-code-launchpad-text block text-[13px] font-semibold leading-tight text-[var(--nx-code-strong-text,#f8fafc)]"
          style={wrapText}
        >
          {label}
        </span>
        <span
          className="sr-only"
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

function FlowCard({ icon: Icon, title, detail }) {
  return (
    <div className="flex min-w-0 items-start gap-2.5 py-2">
      <Icon size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <div
          className="text-[12px] font-semibold leading-tight text-[var(--nx-code-strong-text,#f8fafc)]"
          style={wrapText}
        >
          {title}
        </div>
        <div
          className="mt-1 text-[10px] leading-snug text-[var(--nx-code-muted-text,#9aa7ba)]"
          style={{ ...softClamp, ...wrapText }}
        >
          {detail}
        </div>
      </div>
    </div>
  );
}

function RecentFiles({ files }) {
  const rows =
    files.length > 0
      ? files
      : [
          {
            id: "empty",
            name: "Keine lokalen Dateien",
            detail: "Neue Datei erstellen oder Projekt oeffnen",
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
            className="text-xs font-semibold leading-tight text-[var(--nx-code-strong-text,#f8fafc)]"
            style={wrapText}
          >
            Letzte Dateien
          </span>
        </div>
        <PanelBadge tone="muted">{files.length || 0}</PanelBadge>
      </div>
      <div className="grid min-h-0 flex-1 content-start gap-2 overflow-visible">
        {rows.map((file) => (
          <motion.div
            key={file.id}
            variants={itemVariants}
            className="nx-code-launchpad-status-card flex min-w-0 items-center gap-2"
            style={{
              minHeight: 39,
              borderRadius: "var(--nexus-radius-lg, 18px)",
              border: "1px solid rgba(156, 178, 226, 0.06)",
              background: "rgba(255, 255, 255, 0.018)",
              color: launchpadBodyText,
              padding: "6px 8px",
              overflow: "visible",
            }}
          >
            <span
              className="flex shrink-0 items-center justify-center text-[var(--nx-code-muted-text,#9aa7ba)]"
              style={{
                width: 25,
                height: 25,
                borderRadius: 10,
                  border: "1px solid rgba(255, 255, 255, 0.065)",
                background: "rgba(0, 0, 0, 0.16)",
              }}
            >
              <FileCode2 size={12} />
            </span>
            <div className="min-w-0 flex-1">
              <div
                className="text-[11px] font-semibold leading-tight text-[var(--nx-code-strong-text,#f8fafc)]"
                style={wrapText}
              >
                {file.name}
              </div>
              <div
                className="mt-0.5 text-[10px] leading-tight text-[var(--nx-code-muted-text,#9aa7ba)]"
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

function FlowDeck() {
  return (
    <details className="nx-code-launchpad-flow min-w-0 border-t border-white/10 pt-2">
      <summary className="cursor-pointer rounded py-2 text-xs font-medium text-[var(--nx-code-muted-text,#9aa7ba)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--nexus-primary,#7c8cff)]">
        Produktive Flows
      </summary>
      <div
        className="nx-code-launchpad-grid grid min-h-0 flex-1 gap-2 overflow-visible"
        style={{
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 13rem), 1fr))",
        }}
      >
        {flowItems.map((item) => (
          <FlowCard key={item.title} {...item} />
        ))}
      </div>
    </details>
  );
}

export default function WelcomeScreen({
  onNewFile,
  onOpenFolder,
  onOpenSettings,
}) {
  const reduceMotion = useNexusReducedMotion();
  const recentFiles = useMemo(() => getWelcomeRecentFiles(2), []);

  const handleAction = (action) => {
    if (action === "new") onNewFile?.();
    if (action === "folder") onOpenFolder?.();
  };

  return (
    <MotionConfig reducedMotion={reduceMotion ? "always" : "user"}>
      <motion.div
        initial={reduceMotion ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: reduceMotion ? 0 : 0.2, ease: [0.22, 1, 0.36, 1] }}
        className="nx-code-launchpad-viewport flex min-h-0 flex-1 items-stretch overflow-x-hidden overflow-y-auto bg-transparent"
        style={{
          boxSizing: "border-box",
          height: "100%",
          color: launchpadBodyText,
          padding:
            "var(--nx-launchpad-viewport-pad-y, clamp(7px, 1.25vh, 12px)) var(--nx-launchpad-viewport-pad-x, clamp(9px, 1.25vw, 16px))",
        }}
      >
        <motion.div
          variants={containerVariants}
          initial={reduceMotion ? false : "hidden"}
          animate="visible"
          className="nx-code-welcome nx-code-launchpad mx-auto grid min-h-full w-full overflow-visible"
          style={{
            width: "min(100%, 760px)",
            minHeight: "100%",
            height: "auto",
            alignContent: "start",
            gridTemplateRows: "auto auto auto",
            gap: "var(--nx-launchpad-gap, 10px)",
          }}
        >
          <motion.section
            variants={itemVariants}
            className="nx-code-launchpad-header"
            style={{
              padding: "var(--nx-launchpad-header-pad, 12px 0 10px)",
              borderBottom: "1px solid rgba(156, 178, 226, 0.085)",
              boxShadow: "0 1px 0 rgba(var(--nexus-primary-rgb), 0.045)",
            }}
          >
            <div className="flex min-w-0 items-center gap-3">
              <div
                className="nx-code-launchpad-mark flex shrink-0 items-center justify-center border text-sm font-semibold"
                style={{
                  width: "var(--nx-launchpad-mark-size, 48px)",
                  height: "var(--nx-launchpad-mark-size, 48px)",
                  borderRadius: "var(--nx-launchpad-mark-radius, 17px)",
                  background:
                    "linear-gradient(145deg, rgba(var(--nexus-primary-rgb, 124, 140, 255), 0.72), rgba(var(--nexus-accent-2-rgb), 0.62))",
                  borderColor: "rgba(255, 255, 255, 0.14)",
                  color: "#fff",
                  boxShadow:
                    "0 0 24px rgba(var(--nexus-primary-rgb), 0.18), 0 0 28px rgba(var(--nexus-accent-2-rgb), 0.09)",
                }}
              >
                N
              </div>
              <div className="min-w-0">
                <h1
                className="nx-code-launchpad-title mt-1 text-[2rem] font-semibold leading-none text-[var(--nx-code-strong-text,#f8fafc)]"
                  style={wrapText}
                >
                  Nexus Code
                </h1>
                <p
                  className="mt-1.5 max-w-[38rem] text-[12px] leading-snug text-[var(--nx-code-muted-text,#9aa7ba)]"
                  style={wrapText}
                >
                  Lokale Bearbeitung
                </p>
              </div>
            </div>
          </motion.section>

          <div className="grid min-w-0 gap-3 overflow-visible">
            <SectionLabel
              title="Schnellstart"
              end={
                <button
                  type="button"
                  onClick={onOpenSettings}
                  aria-label="Einrichtung: Theme, Git und Extensions."
                  className="inline-flex items-center gap-1.5 rounded px-2 py-2 text-xs text-[var(--nx-code-muted-text,#9aa7ba)] hover:text-[var(--nx-code-strong-text,#f8fafc)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--nexus-primary,#7c8cff)]"
                >
                  <Settings size={13} aria-hidden="true" />
                  Einrichtung
                </button>
              }
            />
            <div
              className="nx-code-launchpad-grid grid min-w-0 gap-2.5"
              style={{
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(min(100%, 13.5rem), 1fr))",
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
          </div>

          <motion.div
            variants={itemVariants}
            className="nx-code-launchpad-grid grid min-h-0 min-w-0 gap-3 overflow-visible"
            style={{
              gridTemplateColumns: "minmax(0, 1fr)",
              gap: "var(--nx-launchpad-gap, 12px)",
            }}
          >
            <RecentFiles files={recentFiles} />

            <FlowDeck />
          </motion.div>
        </motion.div>
      </motion.div>
    </MotionConfig>
  );
}
