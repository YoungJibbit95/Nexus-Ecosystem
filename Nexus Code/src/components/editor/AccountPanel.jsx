import React, { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Eye,
  EyeOff,
  KeyRound,
  Link2,
  LogOut,
  RotateCcw,
  Save,
  ShieldCheck,
  Trash2,
  UserRound,
  Wifi,
} from "lucide-react";
import {
  ACCOUNT_AUTH_MODES,
  getAccountSessionState,
  normalizeAccountSession,
  normalizeNexusApiEndpoint,
  resolveAccountConnectionStatusMode,
} from "../../app/accountSession";
import {
  PanelActionButton,
  PANEL_INPUT_CLASS,
  PANEL_SELECT_CLASS,
  PanelBadge,
  PanelBody,
  PanelFooter,
  PanelHeader,
  PanelNotice,
  PanelShell,
} from "./panels/PanelChrome.jsx";

const HOSTED_ENDPOINT = "https://nexus-api.cloud";
const LOCAL_ENDPOINT = "http://127.0.0.1:17890";
const ACCOUNT_FIELD_CLASS =
  `${PANEL_INPUT_CLASS} !min-h-8 !rounded-xl !border-white/[0.075] !bg-black/20 !px-2.5 !py-1.5 !text-[11px] focus:!border-cyan-300/30 focus:!bg-black/25 focus:!ring-cyan-300/10 placeholder:!text-gray-600`;
const ACCOUNT_SELECT_CLASS =
  `${PANEL_SELECT_CLASS} !min-h-8 !rounded-xl !border-white/[0.075] !bg-black/20 !px-2.5 !py-1.5 !text-[11px] focus:!border-cyan-300/30 focus:!bg-black/25 focus:!ring-cyan-300/10`;

const STATUS_META = {
  online: {
    tone: "success",
    icon: CheckCircle2,
    label: "Online",
    color: "#67e8f9",
    background: "rgba(34,211,238,0.09)",
    border: "rgba(34,211,238,0.2)",
  },
  active: {
    tone: "success",
    icon: CheckCircle2,
    label: "Active",
    color: "#67e8f9",
    background: "rgba(34,211,238,0.09)",
    border: "rgba(34,211,238,0.2)",
  },
  limited: {
    tone: "warning",
    icon: ShieldCheck,
    label: "Limited",
    color: "#fbbf24",
    background: "rgba(251,191,36,0.09)",
    border: "rgba(251,191,36,0.24)",
  },
  offline: {
    tone: "muted",
    icon: UserRound,
    label: "Offline",
    color: "#93c5fd",
    background: "rgba(59,130,246,0.08)",
    border: "rgba(59,130,246,0.2)",
  },
  degraded: {
    tone: "danger",
    icon: ShieldCheck,
    label: "Degraded",
    color: "#fdba74",
    background: "rgba(249,115,22,0.1)",
    border: "rgba(249,115,22,0.24)",
  },
};

function Field({ icon: Icon, label, children }) {
  return (
    <label className="block min-w-0">
      <span
        className="mb-1 flex min-w-0 items-center gap-1.5 px-0.5 text-[10px] font-semibold uppercase text-gray-500"
        style={{ letterSpacing: 0 }}
      >
        <Icon size={12} className="shrink-0" />
        <span className="min-w-0 break-words" style={{ overflowWrap: "anywhere" }}>
          {label}
        </span>
      </span>
      {children}
    </label>
  );
}

function AccountButton({ children, onClick, disabled, tone = "default", title, className = "" }) {
  const danger = tone === "danger";
  const primary = tone === "primary";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`nx-code-account-button flex min-h-8 min-w-0 max-w-full flex-wrap items-center justify-center gap-1.5 rounded-2xl border px-2.5 py-1 text-center text-[11px] font-semibold leading-tight transition-colors disabled:cursor-not-allowed disabled:opacity-45 [&>svg]:shrink-0 ${className}`}
      style={{
        background: primary
          ? "rgba(34,211,238,0.1)"
          : danger
            ? "rgba(239,68,68,0.06)"
            : "rgba(2,6,23,0.26)",
        borderColor: primary
          ? "rgba(34,211,238,0.18)"
          : danger
            ? "rgba(239,68,68,0.16)"
            : "rgba(148,163,184,0.1)",
        color: primary
          ? "#67e8f9"
          : danger
            ? "#fca5a5"
            : "#d1d5db",
        borderRadius: "var(--nexus-radius-lg, 18px)",
      }}
    >
      {children}
    </button>
  );
}

function AccountMiniStat({ label, value, tone = "muted", title }) {
  const toneColor =
    tone === "accent"
      ? "#a5b4fc"
      : tone === "success"
        ? "#67e8f9"
        : tone === "warning"
          ? "#fbbf24"
          : "#9ca3af";

  return (
    <div
      title={title}
      className="min-w-0 rounded-2xl border border-white/[0.06] bg-black/[0.2] px-2.5 py-1.5"
      style={{ borderRadius: "var(--nexus-radius-lg, 18px)" }}
    >
      <div
        className="text-[9px] font-semibold uppercase leading-none text-gray-600"
        style={{ letterSpacing: 0 }}
      >
        {label}
      </div>
      <div
        className="mt-1 min-w-0 break-words text-[11px] font-semibold leading-tight"
        style={{ color: toneColor, overflowWrap: "anywhere" }}
      >
        {value}
      </div>
    </div>
  );
}

function CompactAccountNotice({ className = "", ...props }) {
  return (
    <PanelNotice
      className={`!rounded-2xl !px-2.5 !py-2 ${className}`}
      {...props}
    />
  );
}

export default function AccountPanel({
  session,
  controlStatus,
  onSaveSession,
  onClearSession,
  onTestConnection,
}) {
  const normalizedSession = useMemo(() => normalizeAccountSession(session), [session]);
  const sessionState = useMemo(
    () => getAccountSessionState(normalizedSession),
    [normalizedSession],
  );
  const [draft, setDraft] = useState(normalizedSession);
  const [busy, setBusy] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [showToken, setShowToken] = useState(false);
  const draftState = useMemo(() => getAccountSessionState(draft), [draft]);

  useEffect(() => {
    setDraft(normalizedSession);
  }, [normalizedSession]);

  const connectionDisplay = useMemo(
    () =>
      resolveAccountConnectionStatusMode({
        session: normalizedSession,
        controlStatus,
        testResult,
      }),
    [controlStatus, normalizedSession, testResult],
  );
  const statusMode = connectionDisplay.mode;
  const statusMeta = STATUS_META[statusMode] || STATUS_META.degraded;
  const StatusIcon = statusMeta.icon;
  const accountLabel = sessionState.hasIdentity
    ? normalizedSession.username || normalizedSession.userId
    : sessionState.hasToken
      ? "API session"
      : "Signed out";
  const authModeLabel = sessionState.isLocal
    ? "Local"
    : normalizedSession.authMode === ACCOUNT_AUTH_MODES.nexus
      ? "Nexus"
      : "Signed out";
  const details =
    connectionDisplay.source === "session"
      ? []
      : testResult?.details || controlStatus?.details || [];
  const normalizedDraftEndpoint = normalizeNexusApiEndpoint(draft.endpoint);
  const endpointWillNormalize =
    Boolean(draft.endpoint) && normalizedDraftEndpoint !== String(draft.endpoint || "").trim();
  const isDirty = JSON.stringify(draft) !== JSON.stringify(normalizedSession);
  const savedLabel = normalizedSession.savedAt
    ? new Date(normalizedSession.savedAt).toLocaleString()
    : "Not saved";
  const detailPreview = details
    .filter(Boolean)
    .slice(0, 2)
    .join(" / ");
  const hiddenDetailCount = Math.max(details.length - 2, 0);
  const statusDetail =
    connectionDisplay.source === "session"
      ? `${accountLabel} - Session gespeichert; Control API Recheck steht aus.`
      : detailPreview
        ? `${detailPreview}${hiddenDetailCount ? ` (+${hiddenDetailCount})` : ""}`
        : `${accountLabel} - ${savedLabel}`;
  const statusTitle =
    connectionDisplay.source === "session"
      ? "Nexus Session aktiv"
      : testResult?.message || controlStatus?.message || "Nexus session required.";
  const sessionGateTitle = sessionState.canStartWorkbench
    ? "Nexus Session aktiv"
    : sessionState.isLocal
      ? "Local mode ist kein Login"
      : sessionState.isExpired
        ? "Session abgelaufen"
        : sessionState.hasToken
          ? "Identitaet fehlt"
          : "Session fehlt";
  const sessionGateDetail = sessionState.canStartWorkbench
    ? "Workbench und API-Features laufen ueber eine gueltige Nexus Session."
    : sessionState.isLocal
      ? "Lokale Profile bleiben gesperrt; fuer Workbench-Zugriff ist eine Nexus Session mit Token erforderlich."
      : sessionState.isExpired
        ? "Melde dich erneut an oder speichere eine frische Nexus API Session."
        : sessionState.hasToken
          ? "Ergaenze User ID oder Username, damit der Token einer Identitaet zugeordnet ist."
          : "Speichere nur eine Nexus Session mit Token und Identitaet; Endpoint-Presets allein entsperren nichts.";
  const draftSaveReady = draftState.canStartWorkbench;

  const updateDraft = (field, value) => {
    setDraft((prev) => ({
      ...prev,
      [field]: value,
    }));
    setTestResult(null);
  };

  const handleSave = () => {
    if (!draftSaveReady) {
      setTestResult({
        mode: "limited",
        message: "Session nicht speicherbar",
        details: [sessionGateDetail],
      });
      return;
    }
    const saved = onSaveSession?.(draft);
    setDraft(normalizeAccountSession(saved || draft));
  };

  const handleClear = () => {
    const cleared = onClearSession?.();
    setDraft(normalizeAccountSession(cleared || {}));
    setTestResult(null);
  };

  const applyEndpointPreset = (endpoint) => {
    updateDraft("endpoint", endpoint);
  };

  const handleTest = async () => {
    if (!onTestConnection || busy) return;
    setBusy(true);
    try {
      const result = await onTestConnection(draft);
      setTestResult(result);
    } catch (error) {
      setTestResult({
        mode: "degraded",
        message: error?.message || "Connection test failed.",
        details: [],
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <PanelShell ariaLabel="Nexus Account">
      <PanelHeader
        icon={UserRound}
        title="Account"
        subtitle={`${accountLabel} - ${
          connectionDisplay.source === "session"
            ? "Session bereit"
            : controlStatus?.title || "Control API"
        }`}
        status={<PanelBadge tone={statusMeta.tone}>{statusMeta.label}</PanelBadge>}
      >
        <div className="grid grid-cols-2 gap-1.5">
          <AccountMiniStat
            label="Identity"
            value={accountLabel}
            tone={sessionState.hasIdentity ? "success" : "muted"}
          />
          <AccountMiniStat
            label={authModeLabel}
            value={sessionState.canStartWorkbench ? "Ready" : "Locked"}
            tone={sessionState.hasToken ? "accent" : "muted"}
          />
        </div>
      </PanelHeader>

      <PanelBody className="px-3 py-2.5">
        <CompactAccountNotice
          icon={StatusIcon}
          tone={statusMeta.tone}
          title={statusTitle}
          detail={statusDetail}
          className="mb-2"
        />
        <CompactAccountNotice
          icon={ShieldCheck}
          tone={sessionState.canStartWorkbench ? "success" : "warning"}
          title={sessionGateTitle}
          detail={sessionGateDetail}
          className="mb-2.5"
        />

        <div className="nx-code-account-presets mb-2.5 grid grid-cols-2 gap-1.5">
          <PanelActionButton
            icon={Link2}
            onClick={() => applyEndpointPreset(HOSTED_ENDPOINT)}
            tone={draft.endpoint === HOSTED_ENDPOINT ? "accent" : "muted"}
          >
            Hosted API
          </PanelActionButton>
          <PanelActionButton
            icon={Wifi}
            onClick={() => applyEndpointPreset(LOCAL_ENDPOINT)}
            tone={draft.endpoint === LOCAL_ENDPOINT ? "accent" : "muted"}
          >
            Local API
          </PanelActionButton>
        </div>

        {endpointWillNormalize ? (
          <CompactAccountNotice
            icon={AlertTriangle}
            tone="warning"
            title="Endpoint wird normalisiert"
            detail={`Beim Speichern wird "${draft.endpoint}" zu "${normalizedDraftEndpoint}" bereinigt.`}
            className="mb-2.5"
          />
        ) : null}

        <div className="grid gap-2.5">
          <Field icon={Link2} label="API Endpoint">
            <input
              className={ACCOUNT_FIELD_CLASS}
              value={draft.endpoint || ""}
              onChange={(event) => updateDraft("endpoint", event.target.value)}
              placeholder="https://nexus-api.cloud"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
            />
          </Field>

          <Field icon={KeyRound} label="Session Token (Advanced)">
            <div className="grid grid-cols-[1fr_auto] gap-1.5">
              <input
                className={ACCOUNT_FIELD_CLASS}
                value={draft.token || ""}
                onChange={(event) => updateDraft("token", event.target.value)}
                placeholder="Nexus API token"
                type={showToken ? "text" : "password"}
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
              />
              <button
                type="button"
                onClick={() => setShowToken((value) => !value)}
                className="grid h-8 w-8 place-items-center rounded-xl border border-white/[0.075] bg-black/20 text-gray-500 transition-colors hover:bg-white/[0.06] hover:text-gray-200"
                title={showToken ? "Token verbergen" : "Token anzeigen"}
              >
                {showToken ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </Field>

          <div className="grid grid-cols-2 gap-2">
            <Field icon={UserRound} label="User ID">
              <input
                className={ACCOUNT_FIELD_CLASS}
                value={draft.userId || ""}
                onChange={(event) => updateDraft("userId", event.target.value)}
                placeholder="local-user"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
              />
            </Field>
            <Field icon={ShieldCheck} label="Tier">
              <select
                className={ACCOUNT_SELECT_CLASS}
                value={draft.userTier || "free"}
                onChange={(event) => updateDraft("userTier", event.target.value)}
                style={{ colorScheme: "dark" }}
              >
                <option value="free">free</option>
                <option value="pro">pro</option>
                <option value="lifetime">lifetime</option>
                <option value="lifetime_pro">lifetime_pro</option>
              </select>
            </Field>
          </div>

          <Field icon={UserRound} label="Username">
            <input
              className={ACCOUNT_FIELD_CLASS}
              value={draft.username || ""}
              onChange={(event) => updateDraft("username", event.target.value)}
              placeholder="nexus-user"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
            />
          </Field>
        </div>
      </PanelBody>

      <PanelFooter className="px-3 py-2">
        <div className="mb-2 flex items-center justify-between gap-2 text-[10px] text-gray-500">
          <span className="flex min-w-0 items-center gap-1 truncate">
            <Clock size={10} className="shrink-0" />
            <span className="truncate">{isDirty ? "Unsaved changes" : savedLabel}</span>
          </span>
          <button
            type="button"
            onClick={() => setDraft(normalizedSession)}
            disabled={!isDirty}
            className="flex shrink-0 items-center gap-1 rounded-xl px-1.5 py-0.5 font-semibold text-gray-500 transition-colors hover:bg-white/[0.06] hover:text-gray-200 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <RotateCcw size={10} />
            Revert
          </button>
        </div>
        <div className="nx-code-account-actions grid grid-cols-2 gap-1.5">
          <AccountButton onClick={handleTest} disabled={busy || !onTestConnection} title="Test connection">
            <Wifi size={14} />
            {busy ? "Testing" : "Test"}
          </AccountButton>
          <AccountButton
            onClick={handleSave}
            disabled={!draftSaveReady}
            tone="primary"
            title={draftSaveReady ? "Save session" : "Token and identity required"}
          >
            <Save size={14} />
            Save
          </AccountButton>
          <AccountButton onClick={() => setDraft(normalizeAccountSession({}))} title="Clear fields">
            <Trash2 size={14} />
            Clear
          </AccountButton>
          <AccountButton onClick={handleClear} tone="danger" title="Logout" className="col-span-2">
            <LogOut size={14} />
            Logout
          </AccountButton>
        </div>
      </PanelFooter>
    </PanelShell>
  );
}
