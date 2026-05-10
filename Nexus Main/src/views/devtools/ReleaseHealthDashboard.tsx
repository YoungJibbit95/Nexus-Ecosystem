import React, { useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  Copy,
  Download,
  ExternalLink,
  PackageCheck,
  Rocket,
  ShieldCheck,
} from "lucide-react";
import {
  CONTROL_API_BASE_URL,
  MAIN_BOOT_PRIORITY_VIEWS,
  MAIN_CRITICAL_PRELOAD_VIEWS,
  MAIN_HEAVY_PRELOAD_VIEW_SET,
  MAIN_PERSISTENT_VIEW_CACHE,
  MAIN_SAFE_STARTUP_VIEWS,
} from "../../app/mainAppConfig";
import { VIEW_IDS } from "../../app/viewPreload";
import { Glass } from "../../components/Glass";
import { hexToRgb } from "../../lib/utils";
import { useTheme } from "../../store/themeStore";

const RELEASE_HEALTH_STORAGE_KEY = "nx-devtools-release-health-v1";
const APP_VERSION = String(import.meta.env?.VITE_NEXUS_APP_VERSION || "6.0.0");

type ReleaseSeverity = "blocker" | "required" | "evidence";
type ReleaseGroup =
  | "API and Auth"
  | "View Smokes"
  | "Packaging"
  | "Security"
  | "Evidence";

type ReleaseCheck = {
  id: string;
  group: ReleaseGroup;
  severity: ReleaseSeverity;
  title: string;
  detail: string;
};

const RELEASE_CHECKS: ReleaseCheck[] = [
  {
    id: "hosted-api-bootstrap",
    group: "API and Auth",
    severity: "blocker",
    title: "Hosted API bootstrap is reachable",
    detail: "Health and public bootstrap respond from nexus-api.cloud without 401/502.",
  },
  {
    id: "account-login",
    group: "API and Auth",
    severity: "blocker",
    title: "Account login and remember-me smoke",
    detail: "Create account, sign in, restart app, confirm remembered session and role state.",
  },
  {
    id: "tier-access",
    group: "API and Auth",
    severity: "required",
    title: "Free/Pro/Lifetime access matrix checked",
    detail: "Free basics, Pro/Code/Canvas/Mobile, Lifetime Pro/Flux and admin-only gates match the model.",
  },
  {
    id: "core-views",
    group: "View Smokes",
    severity: "blocker",
    title: "Core views open cleanly",
    detail: "Dashboard, Notes, Tasks, Reminders, Files and Settings open without console errors.",
  },
  {
    id: "pro-views",
    group: "View Smokes",
    severity: "required",
    title: "Pro views are usable",
    detail: "Canvas, Code, DevTools and Flux complete a basic create/edit/save flow.",
  },
  {
    id: "motion-clickability",
    group: "View Smokes",
    severity: "required",
    title: "Motion does not steal clicks",
    detail: "Menus, toolbar buttons, command center, emoji/block popovers and panels remain clickable during animations.",
  },
  {
    id: "release-gate-fast",
    group: "Packaging",
    severity: "blocker",
    title: "Fast release gate is green",
    detail: "Run npm run release:gate -- --fast on the release branch before packaging.",
  },
  {
    id: "installers-built",
    group: "Packaging",
    severity: "required",
    title: "Installers build on all targets",
    detail: "Windows NSIS, macOS DMG and Linux AppImage/deb jobs complete for Nexus Main and Nexus Code.",
  },
  {
    id: "checksums",
    group: "Packaging",
    severity: "required",
    title: "SHA256 download checksums generated",
    detail: "SHA256SUMS.txt exists beside installer artifacts before website download links go public.",
  },
  {
    id: "signing-ready",
    group: "Packaging",
    severity: "required",
    title: "Signing and notarization config checked",
    detail: "Run verify:signing and required signing gate before public release builds.",
  },
  {
    id: "devtools-gated",
    group: "Security",
    severity: "blocker",
    title: "DevTools and diagnostics are gated",
    detail: "Packaged-mode users do not see internal diagnostics unless developer/admin context allows it.",
  },
  {
    id: "secrets-clean",
    group: "Security",
    severity: "blocker",
    title: "No secrets in bundled UI",
    detail: "No DB passwords, deploy keys or admin tokens are committed or exposed in renderer bundles.",
  },
  {
    id: "electron-security",
    group: "Security",
    severity: "required",
    title: "Electron security guardrails verified",
    detail: "Context isolation, sandboxing, permission guards, navigation guards and workspace IPC limits are intact.",
  },
  {
    id: "docs-current",
    group: "Evidence",
    severity: "evidence",
    title: "Docs and Wiki match current UI",
    detail: "InfoView, Wiki, screenshots and release docs describe the current Nexus v6 surfaces.",
  },
  {
    id: "visual-evidence",
    group: "Evidence",
    severity: "evidence",
    title: "Visual evidence captured",
    detail: "Fresh screenshots/videos cover Dashboard, Notes, Tasks, Canvas, Code, Flux, Settings, Info and DevTools.",
  },
];

const COMMANDS = [
  "npm run release:gate -- --fast",
  "npm run release:gate -- --with-api-contract",
  "npm run release:gate -- --signing-required",
  'npm --prefix "Nexus Main" run build',
  'npm --prefix "Nexus Code" run build',
  'npm --prefix "Nexus Wiki" run build:ci',
];

const GROUPS: ReleaseGroup[] = [
  "API and Auth",
  "View Smokes",
  "Packaging",
  "Security",
  "Evidence",
];

const severityLabel: Record<ReleaseSeverity, string> = {
  blocker: "Blocker",
  required: "Required",
  evidence: "Evidence",
};

const severityColor: Record<ReleaseSeverity, string> = {
  blocker: "#ff453a",
  required: "#ff9f0a",
  evidence: "#32d74b",
};

const readCheckedIds = () => {
  if (typeof window === "undefined") return new Set<string>();
  try {
    const parsed = JSON.parse(window.localStorage.getItem(RELEASE_HEALTH_STORAGE_KEY) || "[]");
    return new Set<string>(Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string") : []);
  } catch {
    return new Set<string>();
  }
};

const writeCheckedIds = (ids: Set<string>) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(RELEASE_HEALTH_STORAGE_KEY, JSON.stringify([...ids]));
  } catch {
    // Release state is convenience data; failing storage should not break DevTools.
  }
};

const copyText = async (text: string) => {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return true;
  }

  if (typeof document === "undefined") return false;
  const input = document.createElement("textarea");
  input.value = text;
  input.setAttribute("readonly", "true");
  input.style.position = "fixed";
  input.style.top = "-9999px";
  document.body.appendChild(input);
  input.select();
  const ok = document.execCommand("copy");
  document.body.removeChild(input);
  return ok;
};

const downloadJson = (payload: unknown, name = "nexus-release-health") => {
  if (typeof document === "undefined") return;
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${name}-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const bucketNumber = (value: number, buckets: number[]) => {
  const safeValue = Number.isFinite(value) ? value : 0;
  const bucket = buckets.find((candidate) => safeValue <= candidate);
  return bucket ? `<=${bucket}` : `>${buckets[buckets.length - 1]}`;
};

const collectRuntimeSnapshot = () => {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return {
      environment: "server-render",
      platform: "unknown",
      language: "unknown",
      online: false,
      viewport: {
        widthBucket: "unknown",
        heightBucket: "unknown",
        pixelRatioBucket: "unknown",
      },
      hardware: {
        coresBucket: "unknown",
        memoryBucket: "unknown",
        reducedMotion: false,
      },
      storage: { knownKeysPresent: [], nexusKeyCount: 0 },
    };
  }

  const knownKeys = [
    RELEASE_HEALTH_STORAGE_KEY,
    "nx-main-walkthrough-v2",
    "nx-theme-store-v6",
    "nx-app-store-v6",
    "nx-workspace-store-v6",
  ];
  const localStorageKeys = (() => {
    try {
      return Array.from({ length: window.localStorage.length }, (_, index) => window.localStorage.key(index) || "")
        .filter(Boolean)
        .filter((key) => key.startsWith("nx-"));
    } catch {
      return [];
    }
  })();

  return {
    environment: "renderer",
    platform: navigator.platform || "unknown",
    language: navigator.language || "unknown",
    online: navigator.onLine,
    viewport: {
      widthBucket: bucketNumber(window.innerWidth, [720, 1024, 1440, 1920]),
      heightBucket: bucketNumber(window.innerHeight, [640, 900, 1200]),
      pixelRatioBucket: bucketNumber(window.devicePixelRatio || 1, [1, 1.5, 2, 3]),
    },
    hardware: {
      coresBucket: bucketNumber(Number(navigator.hardwareConcurrency || 0), [2, 4, 8, 12]),
      memoryBucket: bucketNumber(Number((navigator as any).deviceMemory || 0), [2, 4, 8, 16]),
      reducedMotion: window.matchMedia?.("(prefers-reduced-motion: reduce)").matches || false,
    },
    storage: {
      knownKeysPresent: knownKeys.filter((key) => localStorageKeys.includes(key)),
      nexusKeyCount: localStorageKeys.length,
      valuesExported: false,
    },
  };
};

const statusCardStyle = (rgb: string): React.CSSProperties => ({
  padding: "14px 15px",
  borderRadius: 18,
  border: `1px solid rgba(${rgb},0.18)`,
  background: `linear-gradient(145deg, rgba(${rgb},0.12), rgba(255,255,255,0.04))`,
  boxShadow: `0 18px 45px rgba(${rgb},0.09)`,
  minHeight: 92,
});

const smallButton = (active = false, rgb = "0,122,255"): React.CSSProperties => ({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 7,
  padding: "8px 12px",
  borderRadius: 12,
  border: `1px solid ${active ? `rgba(${rgb},0.36)` : "rgba(255,255,255,0.12)"}`,
  background: active ? `rgba(${rgb},0.2)` : "rgba(255,255,255,0.055)",
  color: active ? "#fff" : "inherit",
  cursor: "pointer",
  fontSize: 11,
  fontWeight: 900,
});

export function ReleaseHealthDashboard() {
  const t = useTheme();
  const rgb = hexToRgb(t.accent);
  const rgb2 = hexToRgb(t.accent2);
  const [checkedIds, setCheckedIds] = useState(() => readCheckedIds());
  const [copied, setCopied] = useState(false);
  const [supportCopied, setSupportCopied] = useState(false);

  const completedChecks = RELEASE_CHECKS.filter((item) => checkedIds.has(item.id));
  const openChecks = RELEASE_CHECKS.filter((item) => !checkedIds.has(item.id));
  const score = Math.round((completedChecks.length / RELEASE_CHECKS.length) * 100);
  const openBlockers = openChecks.filter((item) => item.severity === "blocker").length;
  const openRequired = openChecks.filter((item) => item.severity === "required").length;
  const openEvidence = openChecks.filter((item) => item.severity === "evidence").length;

  const viewSummary = useMemo(
    () =>
      VIEW_IDS.map((viewId) => ({
        id: viewId,
        critical: MAIN_CRITICAL_PRELOAD_VIEWS.includes(viewId),
        priority: MAIN_BOOT_PRIORITY_VIEWS.includes(viewId),
        safe: MAIN_SAFE_STARTUP_VIEWS.includes(viewId),
        heavy: MAIN_HEAVY_PRELOAD_VIEW_SET.has(viewId),
        persistent: MAIN_PERSISTENT_VIEW_CACHE.includes(viewId),
      })),
    [],
  );
  const runtimeSnapshot = useMemo(() => collectRuntimeSnapshot(), []);

  const snapshot = useMemo(
    () => ({
      app: "Nexus Main",
      version: APP_VERSION,
      generatedAt: new Date().toISOString(),
      controlApi: CONTROL_API_BASE_URL,
      score,
      openBlockers,
      openRequired,
      openEvidence,
      completed: completedChecks.map((item) => item.id),
      open: openChecks.map((item) => ({
        id: item.id,
        group: item.group,
        severity: item.severity,
        title: item.title,
      })),
      views: viewSummary,
      commands: COMMANDS,
    }),
    [completedChecks, openBlockers, openChecks, openEvidence, openRequired, score, viewSummary],
  );

  const supportBundle = useMemo(
    () => ({
      kind: "nexus-redacted-support-diagnostics",
      app: "Nexus Main",
      version: APP_VERSION,
      generatedAt: new Date().toISOString(),
      privacy: {
        redacted: true,
        includesSecrets: false,
        includesNoteContent: false,
        includesFilePaths: false,
        includesLocalStorageValues: false,
      },
      runtime: runtimeSnapshot,
      releaseHealth: {
        score,
        openBlockers,
        openRequired,
        openEvidence,
        completedCount: completedChecks.length,
        totalCount: RELEASE_CHECKS.length,
      },
      openChecks: openChecks.map((item) => ({
        id: item.id,
        group: item.group,
        severity: item.severity,
        title: item.title,
      })),
      viewMap: viewSummary,
      gateCommands: COMMANDS,
    }),
    [completedChecks.length, openBlockers, openChecks, openEvidence, openRequired, runtimeSnapshot, score, viewSummary],
  );

  const markdownReport = useMemo(() => {
    const lines = [
      `# Nexus v6 Release Health`,
      ``,
      `- App: Nexus Main ${APP_VERSION}`,
      `- API: ${CONTROL_API_BASE_URL}`,
      `- Score: ${score}% (${completedChecks.length}/${RELEASE_CHECKS.length})`,
      `- Open blockers: ${openBlockers}`,
      `- Open required: ${openRequired}`,
      `- Open evidence: ${openEvidence}`,
      ``,
      `## Open Checks`,
      ...openChecks.map((item) => `- [${severityLabel[item.severity]}] ${item.title} - ${item.detail}`),
      ``,
      `## Gate Commands`,
      ...COMMANDS.map((command) => `- \`${command}\``),
    ];
    return lines.join("\n");
  }, [completedChecks.length, openBlockers, openChecks, openEvidence, openRequired, score]);

  const supportMarkdown = useMemo(() => {
    const lines = [
      `# Nexus Support Diagnostics`,
      ``,
      `- App: Nexus Main ${APP_VERSION}`,
      `- Generated: ${supportBundle.generatedAt}`,
      `- Privacy: redacted, no secrets, no note content, no file paths, no localStorage values`,
      `- Platform: ${supportBundle.runtime.platform || "unknown"}`,
      `- Online: ${supportBundle.runtime.online ? "yes" : "no"}`,
      `- Viewport: ${supportBundle.runtime.viewport?.widthBucket || "unknown"} x ${supportBundle.runtime.viewport?.heightBucket || "unknown"}`,
      `- Release score: ${score}%`,
      `- Open blockers: ${openBlockers}`,
      `- Open required: ${openRequired}`,
      ``,
      `## What changed?`,
      `Describe the user-visible problem, the view, and the exact click/input sequence here.`,
      ``,
      `## Open checks`,
      ...openChecks.map((item) => `- [${severityLabel[item.severity]}] ${item.title}`),
      ``,
      `## Local gates to attach`,
      ...COMMANDS.map((command) => `- \`${command}\``),
    ];
    return lines.join("\n");
  }, [openBlockers, openChecks, openRequired, score, supportBundle]);

  const toggleCheck = (id: string) => {
    const next = new Set(checkedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setCheckedIds(next);
    writeCheckedIds(next);
  };

  const resetChecks = () => {
    const next = new Set<string>();
    setCheckedIds(next);
    writeCheckedIds(next);
  };

  const copyReport = () => {
    void copyText(markdownReport).then((ok) => {
      if (!ok) return;
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    });
  };

  const copySupportIssue = () => {
    void copyText(supportMarkdown).then((ok) => {
      if (!ok) return;
      setSupportCopied(true);
      window.setTimeout(() => setSupportCopied(false), 1400);
    });
  };

  const decision =
    openBlockers === 0 && openRequired === 0
      ? "Public RC ready after human QA sign-off"
      : openBlockers === 0
        ? "Internal RC possible, public release still needs required checks"
        : "Not release-ready until blockers are closed";

  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        overflow: "auto",
        padding: 18,
        background: `radial-gradient(circle at 16% 6%, rgba(${rgb},0.18), transparent 34%), radial-gradient(circle at 88% 0%, rgba(${rgb2},0.16), transparent 32%), rgba(3,8,22,0.18)`,
      }}
    >
      <div style={{ maxWidth: 1480, margin: "0 auto", display: "flex", flexDirection: "column", gap: 16 }}>
        <Glass
          type="panel"
          glow
          gradient
          performanceProfile="balanced"
          style={{
            padding: 20,
            borderRadius: 26,
            overflow: "hidden",
            position: "relative",
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              pointerEvents: "none",
              background: `linear-gradient(120deg, rgba(${rgb},0.16), transparent 48%, rgba(${rgb2},0.14))`,
            }}
          />
          <div style={{ position: "relative", display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", gap: 18 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <span
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 13,
                    display: "grid",
                    placeItems: "center",
                    background: `rgba(${rgb},0.18)`,
                    border: `1px solid rgba(${rgb},0.25)`,
                    boxShadow: `0 0 30px rgba(${rgb},0.2)`,
                  }}
                >
                  <Rocket size={18} color={t.accent} />
                </span>
                <div>
                  <div style={{ fontSize: 22, fontWeight: 950, letterSpacing: -0.5 }}>Release Health</div>
                  <div style={{ fontSize: 11, opacity: 0.58, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1 }}>
                    API, View-Smokes, Packaging, Security and Evidence
                  </div>
                </div>
              </div>
              <div style={{ maxWidth: 780, fontSize: 13, lineHeight: 1.65, opacity: 0.75 }}>
                This cockpit turns the final Nexus v6 release pass into one focused operating surface. Keep it open while
                testing accounts, checking roles, building installers and collecting evidence so the release decision stays
                visible instead of scattered across terminals, docs and memory.
              </div>
            </div>
            <div style={{ minWidth: 280, display: "grid", gap: 10 }}>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, flexWrap: "wrap" }}>
                <button onClick={copyReport} style={smallButton(copied, rgb)}>
                  {copied ? <CheckCircle2 size={14} /> : <Copy size={14} />}
                  {copied ? "Copied" : "Copy report"}
                </button>
                <button onClick={copySupportIssue} style={smallButton(supportCopied, rgb)}>
                  {supportCopied ? <CheckCircle2 size={14} /> : <ClipboardCheck size={14} />}
                  {supportCopied ? "Issue copied" : "Issue report"}
                </button>
                <button onClick={() => downloadJson(snapshot, "nexus-release-health")} style={smallButton(false, rgb)}>
                  <Download size={14} />
                  Release JSON
                </button>
                <button onClick={() => downloadJson(supportBundle, "nexus-support-diagnostics-redacted")} style={smallButton(false, rgb)}>
                  <ShieldCheck size={14} />
                  Support JSON
                </button>
                <button
                  onClick={() => window.open("https://youngjibbit95.github.io/Nexus-Ecosystem/", "_blank", "noopener,noreferrer")}
                  style={smallButton(false, rgb)}
                >
                  <ExternalLink size={14} />
                  Wiki
                </button>
              </div>
              <div
                style={{
                  padding: "12px 14px",
                  borderRadius: 18,
                  border: `1px solid rgba(${rgb},0.2)`,
                  background: "rgba(0,0,0,0.22)",
                  textAlign: "right",
                }}
              >
                <div style={{ fontSize: 11, opacity: 0.52, fontWeight: 900, textTransform: "uppercase", letterSpacing: 1 }}>
                  RC decision
                </div>
                <div style={{ marginTop: 5, fontSize: 14, fontWeight: 950 }}>{decision}</div>
              </div>
            </div>
          </div>
        </Glass>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(150px, 1fr))", gap: 12 }}>
          <div style={statusCardStyle(rgb)}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, opacity: 0.68, fontSize: 11, fontWeight: 900 }}>
              <Activity size={14} color={t.accent} />
              Health Score
            </div>
            <div style={{ marginTop: 10, fontSize: 34, fontWeight: 950, color: score >= 85 ? "#32d74b" : t.accent }}>{score}%</div>
            <div style={{ fontSize: 11, opacity: 0.54 }}>{completedChecks.length}/{RELEASE_CHECKS.length} checks closed</div>
          </div>
          <div style={statusCardStyle(rgb)}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, opacity: 0.68, fontSize: 11, fontWeight: 900 }}>
              <AlertTriangle size={14} color="#ff453a" />
              Blockers
            </div>
            <div style={{ marginTop: 10, fontSize: 34, fontWeight: 950, color: openBlockers ? "#ff453a" : "#32d74b" }}>{openBlockers}</div>
            <div style={{ fontSize: 11, opacity: 0.54 }}>must be zero for release</div>
          </div>
          <div style={statusCardStyle(rgb)}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, opacity: 0.68, fontSize: 11, fontWeight: 900 }}>
              <PackageCheck size={14} color="#ff9f0a" />
              Required
            </div>
            <div style={{ marginTop: 10, fontSize: 34, fontWeight: 950, color: openRequired ? "#ff9f0a" : "#32d74b" }}>{openRequired}</div>
            <div style={{ fontSize: 11, opacity: 0.54 }}>packaging, roles, motion</div>
          </div>
          <div style={statusCardStyle(rgb)}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, opacity: 0.68, fontSize: 11, fontWeight: 900 }}>
              <ClipboardCheck size={14} color={t.accent2} />
              Evidence
            </div>
            <div style={{ marginTop: 10, fontSize: 34, fontWeight: 950 }}>{openEvidence}</div>
            <div style={{ fontSize: 11, opacity: 0.54 }}>docs, screenshots, QA proof</div>
          </div>
          <div style={statusCardStyle(rgb)}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, opacity: 0.68, fontSize: 11, fontWeight: 900 }}>
              <ShieldCheck size={14} color="#32d74b" />
              Control API
            </div>
            <div style={{ marginTop: 12, fontSize: 13, fontWeight: 950, wordBreak: "break-word" }}>{CONTROL_API_BASE_URL}</div>
            <div style={{ fontSize: 11, opacity: 0.54, marginTop: 5 }}>Nexus Main {APP_VERSION}</div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.15fr) minmax(360px, 0.85fr)", gap: 14, alignItems: "start" }}>
          <Glass type="panel" gradient style={{ padding: 16, borderRadius: 22 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 950 }}>Release checklist</div>
                <div style={{ fontSize: 11, opacity: 0.55 }}>Persistent locally in this DevTools cockpit</div>
              </div>
              <button onClick={resetChecks} style={smallButton(false, rgb)}>
                Reset
              </button>
            </div>

            <div style={{ display: "grid", gap: 14 }}>
              {GROUPS.map((group) => {
                const items = RELEASE_CHECKS.filter((item) => item.group === group);
                const closed = items.filter((item) => checkedIds.has(item.id)).length;
                return (
                  <div key={group}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                      <div style={{ fontSize: 12, fontWeight: 950, letterSpacing: 0.2 }}>{group}</div>
                      <div style={{ fontSize: 10, opacity: 0.52, fontWeight: 900 }}>
                        {closed}/{items.length}
                      </div>
                    </div>
                    <div style={{ display: "grid", gap: 8 }}>
                      {items.map((item) => {
                        const active = checkedIds.has(item.id);
                        const color = severityColor[item.severity];
                        return (
                          <button
                            key={item.id}
                            onClick={() => toggleCheck(item.id)}
                            style={{
                              width: "100%",
                              textAlign: "left",
                              display: "grid",
                              gridTemplateColumns: "28px minmax(0, 1fr) auto",
                              alignItems: "center",
                              gap: 11,
                              padding: "12px 13px",
                              borderRadius: 16,
                              border: `1px solid ${active ? `rgba(${rgb},0.28)` : "rgba(255,255,255,0.09)"}`,
                              background: active
                                ? `linear-gradient(135deg, rgba(${rgb},0.18), rgba(50,215,75,0.08))`
                                : "rgba(255,255,255,0.035)",
                              color: "inherit",
                              cursor: "pointer",
                            }}
                          >
                            <span
                              style={{
                                width: 24,
                                height: 24,
                                borderRadius: 10,
                                display: "grid",
                                placeItems: "center",
                                border: `1px solid ${active ? "rgba(50,215,75,0.45)" : "rgba(255,255,255,0.12)"}`,
                                background: active ? "rgba(50,215,75,0.16)" : "rgba(255,255,255,0.04)",
                              }}
                            >
                              {active ? <CheckCircle2 size={14} color="#32d74b" /> : <span style={{ width: 7, height: 7, borderRadius: 99, background: color }} />}
                            </span>
                            <span>
                              <span style={{ display: "block", fontSize: 12, fontWeight: 950 }}>{item.title}</span>
                              <span style={{ display: "block", marginTop: 3, fontSize: 11, opacity: 0.58, lineHeight: 1.45 }}>{item.detail}</span>
                            </span>
                            <span
                              style={{
                                padding: "4px 8px",
                                borderRadius: 999,
                                fontSize: 9,
                                fontWeight: 950,
                                color,
                                background: `${color}20`,
                                border: `1px solid ${color}40`,
                              }}
                            >
                              {severityLabel[item.severity]}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </Glass>

          <div style={{ display: "grid", gap: 14 }}>
            <Glass type="panel" gradient style={{ padding: 16, borderRadius: 22 }}>
              <div style={{ fontSize: 16, fontWeight: 950, marginBottom: 4 }}>Runtime view map</div>
              <div style={{ fontSize: 11, opacity: 0.55, marginBottom: 13 }}>
                Shows the app shell preload strategy that matters for first-start QA and performance regressions.
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                {viewSummary.map((view) => (
                  <span
                    key={view.id}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "7px 9px",
                      borderRadius: 999,
                      fontSize: 10,
                      fontWeight: 900,
                      border: `1px solid ${view.critical ? `rgba(${rgb},0.32)` : "rgba(255,255,255,0.1)"}`,
                      background: view.critical ? `rgba(${rgb},0.16)` : "rgba(255,255,255,0.045)",
                    }}
                  >
                    {view.id}
                    {view.priority && <span style={{ color: t.accent }}>priority</span>}
                    {view.heavy && <span style={{ color: "#ff9f0a" }}>heavy</span>}
                    {view.persistent && <span style={{ color: "#32d74b" }}>cache</span>}
                  </span>
                ))}
              </div>
            </Glass>

            <Glass type="panel" gradient style={{ padding: 16, borderRadius: 22 }}>
              <div style={{ fontSize: 16, fontWeight: 950, marginBottom: 4 }}>Gate commands</div>
              <div style={{ fontSize: 11, opacity: 0.55, marginBottom: 12 }}>
                These are the commands that should be green before deployment or public download promotion.
              </div>
              <div style={{ display: "grid", gap: 8 }}>
                {COMMANDS.map((command) => (
                  <button
                    key={command}
                    onClick={() => void copyText(command)}
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 12,
                      padding: "10px 12px",
                      borderRadius: 14,
                      border: "1px solid rgba(255,255,255,0.1)",
                      background: "rgba(0,0,0,0.2)",
                      color: "inherit",
                      cursor: "pointer",
                      fontSize: 11,
                      fontFamily: "'Fira Code','JetBrains Mono',monospace",
                    }}
                  >
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{command}</span>
                    <Copy size={13} opacity={0.65} />
                  </button>
                ))}
              </div>
            </Glass>
          </div>
        </div>
      </div>
    </div>
  );
}
