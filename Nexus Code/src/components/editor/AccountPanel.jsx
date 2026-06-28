import React, { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  KeyRound,
  Link2,
  LogOut,
  Save,
  Trash2,
  UserRound,
  Wifi,
} from "lucide-react";
import { getAccountSessionState, normalizeAccountSession } from "../../app/accountSession";

const STATUS_TONE = {
  online: "border-emerald-400/30 bg-emerald-500/[0.12] text-emerald-100",
  limited: "border-amber-400/35 bg-amber-500/[0.12] text-amber-100",
  offline: "border-sky-400/30 bg-sky-500/[0.12] text-sky-100",
  degraded: "border-orange-400/30 bg-orange-500/[0.12] text-orange-100",
};

const FIELD_CLASS =
  "h-9 w-full min-w-0 rounded-md border border-white/10 bg-black/[0.24] px-3 text-[12px] text-[var(--nexus-text,#f4f4f5)] outline-none transition-colors placeholder:text-zinc-500 focus:border-sky-400/50 focus:bg-black/[0.32]";

function IconButton({ children, label, onClick, disabled = false, tone = "default" }) {
  const toneClass = tone === "danger"
    ? "border-red-400/25 text-red-100 hover:bg-red-500/[0.15]"
    : "border-white/10 text-zinc-200 hover:bg-white/10";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className={`inline-flex h-9 min-w-9 max-w-full items-center justify-center gap-2 rounded-md border px-2.5 text-[12px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-45 ${toneClass}`}
    >
      {children}
    </button>
  );
}

function Field({ icon: Icon, label, children }) {
  return (
    <label className="block min-w-0">
      <span className="mb-1.5 flex min-w-0 items-center gap-1.5 px-0.5 text-[10px] font-semibold uppercase text-zinc-400">
        <Icon size={12} />
        <span className="truncate">{label}</span>
      </span>
      {children}
    </label>
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
  const [expanded, setExpanded] = useState(!sessionState.hasToken);
  const [busy, setBusy] = useState(false);
  const [testResult, setTestResult] = useState(null);

  useEffect(() => {
    setDraft(normalizedSession);
  }, [normalizedSession]);

  const statusMode = testResult?.mode || controlStatus?.mode || "offline";
  const statusTone = STATUS_TONE[statusMode] || STATUS_TONE.degraded;
  const accountLabel = sessionState.hasIdentity
    ? normalizedSession.username || normalizedSession.userId
    : sessionState.hasToken
      ? "Token session"
      : "Lokale Session";

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
    setExpanded(false);
  };

  const handleClear = () => {
    const cleared = onClearSession?.();
    setDraft(normalizeAccountSession(cleared || {}));
    setTestResult(null);
    setExpanded(true);
  };

  const handleTest = async () => {
    if (!onTestConnection || busy) return;
    setBusy(true);
    try {
      const result = await onTestConnection(draft);
      setTestResult(result);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section
      className="nx-code-account-panel isolate flex h-full min-h-0 w-full max-w-full flex-col overflow-hidden bg-transparent text-zinc-100"
      aria-label="Nexus Account"
    >
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className="flex min-h-14 w-full shrink-0 items-center gap-3 border-b border-white/5 px-4 py-2 text-left transition-colors hover:bg-white/[0.04]"
      >
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md border ${statusTone}`}>
          {statusMode === "online" ? <CheckCircle2 size={16} /> : <UserRound size={16} />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[12px] font-bold text-[var(--nexus-text,#f4f4f5)]">{accountLabel}</span>
          <span className="block truncate text-[10px] text-zinc-400">
            {controlStatus?.title || "Control API Status"} - {statusMode}
          </span>
        </span>
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-zinc-400">
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </span>
      </button>

      {expanded ? (
        <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto px-4 pb-4 pt-3">
          <div className={`mb-3 max-w-full overflow-hidden rounded-md border px-3 py-2 text-[11px] leading-5 ${statusTone}`}>
            <div className="break-words font-semibold">{testResult?.message || controlStatus?.message || "Lokale Session bereit."}</div>
            {(testResult?.details || controlStatus?.details || []).length > 0 ? (
              <div className="mt-1 break-words opacity-75">
                {(testResult?.details || controlStatus?.details || []).join(", ")}
              </div>
            ) : null}
          </div>

          <div className="grid gap-3">
            <Field icon={Link2} label="API Endpoint">
              <input
                className={FIELD_CLASS}
                value={draft.endpoint}
                onChange={(event) => updateDraft("endpoint", event.target.value)}
                placeholder="https://nexus-api.cloud"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
              />
            </Field>

            <Field icon={KeyRound} label="Access Token">
              <input
                className={FIELD_CLASS}
                value={draft.token}
                onChange={(event) => updateDraft("token", event.target.value)}
                placeholder="Nexus API token"
                type="password"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
              />
            </Field>

            <div className="grid grid-cols-1 gap-3">
              <Field icon={UserRound} label="User ID">
                <input
                  className={FIELD_CLASS}
                  value={draft.userId}
                  onChange={(event) => updateDraft("userId", event.target.value)}
                  placeholder="local-user"
                  autoCapitalize="off"
                  autoCorrect="off"
                  spellCheck={false}
                />
              </Field>
              <Field icon={UserRound} label="Tier">
                <select
                  className={FIELD_CLASS}
                  value={draft.userTier}
                  onChange={(event) => updateDraft("userTier", event.target.value)}
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
                className={FIELD_CLASS}
                value={draft.username}
                onChange={(event) => updateDraft("username", event.target.value)}
                placeholder="nexus-user"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
              />
            </Field>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex min-w-0 flex-wrap gap-2">
              <IconButton label="Test Connection" onClick={handleTest} disabled={busy}>
                <Wifi size={15} />
                <span className="hidden sm:inline">{busy ? "Testing" : "Test"}</span>
              </IconButton>
              <IconButton label="Save Session" onClick={handleSave}>
                <Save size={15} />
                <span className="hidden sm:inline">Save</span>
              </IconButton>
            </div>
            <div className="flex shrink-0 gap-2">
              <IconButton label="Clear Fields" onClick={() => setDraft(normalizeAccountSession({}))}>
                <Trash2 size={15} />
              </IconButton>
              <IconButton label="Logout" onClick={handleClear} tone="danger">
                <LogOut size={15} />
              </IconButton>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
