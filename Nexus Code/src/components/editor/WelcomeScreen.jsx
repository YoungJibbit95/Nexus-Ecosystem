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
  Sparkles,
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
    detail: "Leere Datei erstellen.",
    action: "new",
    tone: "primary",
  },
  {
    icon: FolderOpen,
    label: "Projekt oeffnen",
    detail: "Ordner auswaehlen.",
    action: "folder",
    tone: "blue",
  },
  {
    icon: Settings,
    label: "Einrichtung",
    detail: "Theme und Erweiterungen.",
    action: "settings",
    tone: "neutral",
  },
];

const flowItems = [
  {
    icon: Command,
    title: "Command-first work",
    detail: "Dateien oeffnen, Workspace durchsuchen, Setup starten.",
    tone: "primary",
  },
  {
    icon: Search,
    title: "Search and inspect",
    detail: "Symbole, Probleme und Text mit der Panel-Ansicht finden.",
    tone: "neutral",
  },
  {
    icon: GitPullRequest,
    title: "Source control flow",
    detail: "Aenderungen, Branch und Review-Signale ruhig scannen.",
    tone: "blue",
  },
  {
    icon: TerminalSquare,
    title: "Runtime at hand",
    detail: "Terminal und Projektbefehle bleiben nah am Editor.",
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
        minHeight: "var(--nx-launchpad-action-min, 62px)",
        gridTemplateColumns:
          "var(--nx-launchpad-action-grid, 34px minmax(0, 1fr) 14px)",
        alignItems: "center",
        gap: "var(--nx-launchpad-action-gap, 10px)",
        borderRadius: "var(--nexus-radius-lg, 14px)",
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
          className="nx-code-launchpad-text nx-code-launchpad-fineprint mt-1 block text-[10px] leading-snug text-[var(--nx-code-muted-text,#9aa7ba)]"
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

function FlowCard({ icon: Icon, title, detail, tone = "neutral", reduceMotion }) {
  const toneStyle = actionTones[tone] || actionTones.neutral;

  return (
    <motion.div
      variants={itemVariants}
      whileHover={reduceMotion ? undefined : { y: -1 }}
      transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
        className="nx-code-launchpad-signal flex min-w-0 items-start gap-2.5"
      style={{
        minHeight: "var(--nx-launchpad-signal-min, 60px)",
        borderRadius: "var(--nexus-radius-lg, 14px)",
        border: `1px solid ${toneStyle.border}`,
        background:
          "linear-gradient(135deg, rgba(255, 255, 255, 0.026), rgba(255, 255, 255, 0.007)), rgba(6, 10, 17, 0.7)",
        color: launchpadBodyText,
        padding: "var(--nx-launchpad-signal-pad, 9px 10px)",
        overflow: "visible",
      }}
    >
      <IconFrame icon={Icon} tone={tone} size={13} frameSize={30} radius={12} />
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
            className="text-xs font-semibold leading-tight text-[var(--nx-code-strong-text,#f8fafc)]"
            style={wrapText}
          >
            Produktive Flows
          </span>
        </div>
        <PanelBadge tone="success">lokal</PanelBadge>
      </div>
      <div
        className="nx-code-launchpad-grid grid min-h-0 flex-1 gap-2 overflow-visible"
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

export default function WelcomeScreen({
  onNewFile,
  onOpenFolder,
  onOpenSettings,
}) {
  const reduceMotion = useNexusReducedMotion();
  const recentFiles = useMemo(() => getWelcomeRecentFiles(3), []);

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
            width: "min(100%, 1120px)",
            minHeight: "100%",
            height: "auto",
            alignContent: "start",
            gridTemplateRows: "auto auto minmax(0, 1fr)",
            gap: "var(--nx-launchpad-gap, 10px)",
          }}
        >
          <motion.section
            variants={itemVariants}
            className="nx-code-launchpad-header"
            style={{
              padding: "var(--nx-launchpad-header-pad, 16px 0 15px)",
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
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <Sparkles
                    size={13}
                    className="shrink-0 text-[var(--nexus-accent-2,#38bdf8)]"
                  />
                  <span
                    className="text-[10px] font-semibold uppercase leading-tight text-[var(--nexus-accent-2,#38bdf8)]"
                    style={wrapText}
                  >
                    Nexus x 2nd Edition
                  </span>
                </div>
                <h1
                className="nx-code-launchpad-title mt-1 text-[2rem] font-semibold leading-none text-[var(--nx-code-strong-text,#f8fafc)]"
                  style={wrapText}
                >
                  Nexus Code
                </h1>
                <p
                  className="mt-2 max-w-[40rem] text-sm leading-snug text-[var(--nx-code-muted-text,#9aa7ba)]"
                  style={wrapText}
                >
                  Lokale Bearbeitung mit integriertem Terminal, Git-Unterstuetzung,
                  Theme-Kontrolle und mehr.
                </p>
              </div>
            </div>
          </motion.section>

          <div className="grid min-w-0 gap-3 overflow-visible">
            <SectionLabel title="Schnellstart" />
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
              gridTemplateColumns:
                "repeat(auto-fit, minmax(min(100%, 22rem), 1fr))",
              gap: "var(--nx-launchpad-gap, 12px)",
            }}
          >
            <RecentFiles files={recentFiles} />

            <div
              className="grid min-h-0 min-w-0 gap-3 overflow-visible"
              style={{ gridTemplateRows: "minmax(0, 1fr)" }}
            >
              <FlowDeck reduceMotion={reduceMotion} />
            </div>
          </motion.div>
        </motion.div>
      </motion.div>
    </MotionConfig>
  );
}
