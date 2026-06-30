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
  createLocalAccountSession,
  getAccountSessionState,
  normalizeAccountSession,
  normalizeNexusApiEndpoint,
} from "../../app/accountSession";
import {
  PanelActionButton,
  PANEL_INPUT_CLASS,
  PANEL_SELECT_CLASS,
  PanelBadge,
  PanelBody,
  PanelFooter,
  PanelHeader,
  PanelMetric,
  PanelNotice,
  PanelShell,
} from "./panels/PanelChrome.jsx";

const HOSTED_ENDPOINT = "https://nexus-api.cloud";
const LOCAL_ENDPOINT = "http://127.0.0.1:17890";

const STATUS_META = {
  online: {
    tone: "success",
    icon: CheckCircle2,
    label: "Online",
    color: "#86efac",
    background: "rgba(34,197,94,0.1)",
    border: "rgba(34,197,94,0.22)",
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
      <span className="mb-1.5 flex min-w-0 items-center gap-1.5 px-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-500">
        <Icon size={12} className="shrink-0" />
        <span className="truncate">{label}</span>
      </span>
      {children}
    </label>
  );
}

function AccountButton({ children, onClick, disabled, tone = "default", title }) {
  const danger = tone === "danger";
  const primary = tone === "primary";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="flex h-8 min-w-0 items-center justify-center gap-1.5 rounded-md border px-2.5 text-[11px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-45"
      style={{
        background: primary
          ? "rgba(var(--nexus-primary-rgb, 124, 140, 255), 0.16)"
          : danger
            ? "rgba(239,68,68,0.1)"
            : "rgba(255,255,255,0.04)",
        borderColor: primary
          ? "rgba(var(--nexus-primary-rgb, 124, 140, 255), 0.28)"
          : danger
            ? "rgba(239,68,68,0.24)"
            : "rgba(255,255,255,0.09)",
        color: primary
          ? "var(--nexus-primary, #7c8cff)"
          : danger
            ? "#fca5a5"
            : "#d1d5db",
      }}
    >
      {children}
    </button>
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

  useEffect(() => {
    setDraft(normalizedSession);
  }, [normalizedSession]);

  const statusMode = testResult?.mode || controlStatus?.mode || "offline";
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
  const details = testResult?.details || controlStatus?.details || [];
  const normalizedDraftEndpoint = normalizeNexusApiEndpoint(draft.endpoint);
  const endpointWillNormalize =
    Boolean(draft.endpoint) && normalizedDraftEndpoint !== String(draft.endpoint || "").trim();
  const isDirty = JSON.stringify(draft) !== JSON.stringify(normalizedSession);
  const savedLabel = normalizedSession.savedAt
    ? new Date(normalizedSession.savedAt).toLocaleString()
    : "Not saved";

  const updateDraft = (field, value) => {
    setDraft((prev) => ({
      ...prev,
      [field]: value,
    }));
    setTestResult(null);
  };

  const handleSave = () => {
    const saved = onSaveSession?.(draft);
    setDraft(normalizeAccountSession(saved || draft));
  };

  const handleClear = () => {
    const cleared = onClearSession?.();
    setDraft(normalizeAccountSession(cleared || {}));
    setTestResult(null);
  };

  const handleUseLocalWorkspace = () => {
    const saved = onSaveSession?.(createLocalAccountSession());
    setDraft(normalizeAccountSession(saved || createLocalAccountSession()));
    setTestResult({
      mode: "offline",
      message: "Lokaler Workspace ist aktiv.",
      details: ["account:LOCAL_WORKSPACE"],
    });
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
        subtitle={`${accountLabel} - ${controlStatus?.title || "Control API"} - ${statusMeta.label}`}
        status={<PanelBadge tone={statusMeta.tone}>{statusMeta.label}</PanelBadge>}
      >
        <div className="grid grid-cols-2 gap-1.5">
          <PanelMetric
            label="Mode"
            value={authModeLabel}
            tone={sessionState.hasIdentity ? "success" : "muted"}
          />
          <PanelMetric
            label="Session"
            value={sessionState.canStartWorkbench ? "Ready" : "Locked"}
            tone={sessionState.hasToken ? "accent" : "muted"}
          />
          <PanelMetric label="Tier" value={draft.userTier || "free"} tone="accent" />
          <PanelMetric
            label="Saved"
            value={normalizedSession.savedAt ? "Yes" : "No"}
            tone={normalizedSession.savedAt ? "success" : "muted"}
            title={savedLabel}
          />
        </div>
      </PanelHeader>

      <PanelBody className="px-3 py-3">
        <PanelNotice
          icon={StatusIcon}
          tone={statusMeta.tone}
          title={testResult?.message || controlStatus?.message || "Local session ready."}
          detail={details.length > 0 ? details.join(", ") : `${accountLabel} - ${savedLabel}`}
          className="mb-3"
        />
        <PanelNotice
          icon={ShieldCheck}
          tone={sessionState.isLocal ? "teal" : sessionState.canStartWorkbench ? "success" : "warning"}
          title={sessionState.isLocal ? "Lokaler IDE-Modus" : sessionState.canStartWorkbench ? "Nexus Session aktiv" : "Session fehlt"}
          detail={sessionState.isLocal
            ? "Editor, Dateien, Suche und Terminal starten lokal. Cloud-, Sync- und Billing-nahe Features bleiben deaktiviert."
            : sessionState.canStartWorkbench
              ? "Die Workbench darf starten; API-Features folgen den Entitlements deiner Nexus Session."
              : "Nutze den Startscreen fuer Username/Passwort Login oder setze hier einen lokalen Workspace."}
          className="mb-3"
        />

        <div className="mb-3 grid grid-cols-2 gap-1.5">
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
          <PanelNotice
            icon={AlertTriangle}
            tone="warning"
            title="Endpoint wird normalisiert"
            detail={`Beim Speichern wird "${draft.endpoint}" zu "${normalizedDraftEndpoint}" bereinigt.`}
            className="mb-3"
          />
        ) : null}

        <div className="grid gap-3">
          <Field icon={Link2} label="API Endpoint">
            <input
              className={PANEL_INPUT_CLASS}
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
                className={PANEL_INPUT_CLASS}
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
                className="grid h-8 w-8 place-items-center rounded-md border border-white/10 bg-white/[0.04] text-gray-500 transition-colors hover:bg-white/[0.08] hover:text-gray-200"
                title={showToken ? "Token verbergen" : "Token anzeigen"}
              >
                {showToken ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </Field>

          <div className="grid grid-cols-2 gap-2">
            <Field icon={UserRound} label="User ID">
              <input
                className={PANEL_INPUT_CLASS}
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
                className={PANEL_SELECT_CLASS}
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
              className={PANEL_INPUT_CLASS}
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

      <PanelFooter>
        <div className="mb-2 flex items-center justify-between gap-2 text-[10px] text-gray-500">
          <span className="flex min-w-0 items-center gap-1 truncate">
            <Clock size={10} className="shrink-0" />
            <span className="truncate">{isDirty ? "Unsaved changes" : savedLabel}</span>
          </span>
          <button
            type="button"
            onClick={() => setDraft(normalizedSession)}
            disabled={!isDirty}
            className="flex shrink-0 items-center gap-1 rounded px-1.5 py-0.5 font-semibold text-gray-500 transition-colors hover:bg-white/[0.06] hover:text-gray-200 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <RotateCcw size={10} />
            Revert
          </button>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          <AccountButton onClick={handleUseLocalWorkspace} disabled={busy} title="Lokalen Workspace ohne Cloud starten">
            <UserRound size={14} />
            Local
          </AccountButton>
          <AccountButton onClick={handleTest} disabled={busy || !onTestConnection} title="Test connection">
            <Wifi size={14} />
            {busy ? "Testing" : "Test"}
          </AccountButton>
          <AccountButton onClick={handleSave} tone="primary" title="Save session">
            <Save size={14} />
            {isDirty ? "Save changes" : "Save"}
          </AccountButton>
          <AccountButton onClick={() => setDraft(normalizeAccountSession({}))} title="Clear fields">
            <Trash2 size={14} />
            Clear
          </AccountButton>
          <AccountButton onClick={handleClear} tone="danger" title="Logout">
            <LogOut size={14} />
            Logout
          </AccountButton>
        </div>
      </PanelFooter>
    </PanelShell>
  );
}
