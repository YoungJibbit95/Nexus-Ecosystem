import React, { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  KeyRound,
  Link2,
  LogOut,
  Save,
  ShieldCheck,
  Trash2,
  UserRound,
  Wifi,
} from "lucide-react";
import { getAccountSessionState, normalizeAccountSession } from "../../app/accountSession";
import {
  PANEL_INPUT_CLASS,
  PANEL_SELECT_CLASS,
  PanelBadge,
  PanelBody,
  PanelFooter,
  PanelHeader,
  PanelMetric,
  PanelShell,
} from "./panels/PanelChrome.jsx";

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

  useEffect(() => {
    setDraft(normalizedSession);
  }, [normalizedSession]);

  const statusMode = testResult?.mode || controlStatus?.mode || "offline";
  const statusMeta = STATUS_META[statusMode] || STATUS_META.degraded;
  const StatusIcon = statusMeta.icon;
  const accountLabel = sessionState.hasIdentity
    ? normalizedSession.username || normalizedSession.userId
    : sessionState.hasToken
      ? "Token session"
      : "Local session";
  const details = testResult?.details || controlStatus?.details || [];

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
        subtitle={`${controlStatus?.title || "Control API"} - ${statusMeta.label}`}
        status={<PanelBadge tone={statusMeta.tone}>{statusMeta.label}</PanelBadge>}
      >
        <div className="grid grid-cols-3 gap-1.5">
          <PanelMetric
            label="Identity"
            value={sessionState.hasIdentity ? "Set" : "Local"}
            tone={sessionState.hasIdentity ? "success" : "muted"}
          />
          <PanelMetric
            label="Token"
            value={sessionState.hasToken ? "Present" : "Empty"}
            tone={sessionState.hasToken ? "accent" : "muted"}
          />
          <PanelMetric label="Tier" value={draft.userTier || "free"} tone="accent" />
        </div>
      </PanelHeader>

      <PanelBody className="px-3 py-3">
        <div
          className="mb-3 rounded-lg border px-3 py-2"
          style={{
            background: statusMeta.background,
            borderColor: statusMeta.border,
          }}
        >
          <div className="flex min-w-0 items-start gap-2">
            <StatusIcon size={15} className="mt-0.5 shrink-0" style={{ color: statusMeta.color }} />
            <div className="min-w-0 flex-1">
              <p className="break-words text-[12px] font-semibold" style={{ color: statusMeta.color }}>
                {testResult?.message || controlStatus?.message || "Local session ready."}
              </p>
              {details.length > 0 ? (
                <p className="mt-1 break-words text-[10px] text-gray-400">
                  {details.join(", ")}
                </p>
              ) : null}
            </div>
          </div>
        </div>

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

          <Field icon={KeyRound} label="Access Token">
            <input
              className={PANEL_INPUT_CLASS}
              value={draft.token || ""}
              onChange={(event) => updateDraft("token", event.target.value)}
              placeholder="Nexus API token"
              type="password"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
            />
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
        <div className="grid grid-cols-2 gap-1.5">
          <AccountButton onClick={handleTest} disabled={busy || !onTestConnection} title="Test connection">
            <Wifi size={14} />
            {busy ? "Testing" : "Test"}
          </AccountButton>
          <AccountButton onClick={handleSave} tone="primary" title="Save session">
            <Save size={14} />
            Save
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
