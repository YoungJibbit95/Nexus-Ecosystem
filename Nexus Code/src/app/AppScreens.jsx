import { Component, useEffect, useMemo, useState } from "react";
import { normalizeAccountSession } from "./accountSession.js";
import { formatControlStatusDetails } from "./controlStatus.js";

const panelShellStyle = {
  width: "100%",
  minHeight: "100dvh",
  display: "grid",
  placeItems: "center",
  padding: "clamp(18px, 4vw, 48px)",
  color: "#edf4ff",
  fontFamily: "Inter, Segoe UI, system-ui, sans-serif",
};

const inputStyle = {
  minHeight: 44,
  borderRadius: 14,
  border: "1px solid rgba(255,255,255,0.11)",
  background: "rgba(255,255,255,0.055)",
  color: "#f5f7ff",
  padding: "0 13px",
  outline: "none",
  minWidth: 0,
};

const buttonBaseStyle = {
  minHeight: 42,
  borderRadius: 14,
  fontWeight: 780,
  cursor: "pointer",
};

const noticePalette = {
  success: {
    border: "rgba(45,212,191,0.36)",
    background: "rgba(45,212,191,0.1)",
    accent: "#7dd3fc",
  },
  warning: {
    border: "rgba(251,191,36,0.34)",
    background: "rgba(251,191,36,0.1)",
    accent: "#facc15",
  },
  danger: {
    border: "rgba(248,113,113,0.34)",
    background: "rgba(248,113,113,0.1)",
    accent: "#fca5a5",
  },
  info: {
    border: "rgba(124,140,255,0.28)",
    background: "rgba(124,140,255,0.1)",
    accent: "#93c5fd",
  },
};

const getNoticePalette = (tone) => noticePalette[tone] || noticePalette.info;

const buildGateNotice = ({ message, controlStatus, viewGuardState }) => {
  if (message) return message;
  const details = formatControlStatusDetails([
    ...(controlStatus?.details || []),
    viewGuardState?.reason ? `access:${viewGuardState.reason}` : "",
  ]);
  const firstDetail = details[0];
  if (viewGuardState?.blocked) {
    return {
      tone: controlStatus?.mode === "offline" ? "warning" : "danger",
      title: firstDetail?.title || "Nexus Code wartet auf deine Session",
      detail:
        firstDetail?.detail ||
        controlStatus?.message ||
        "Melde dich mit einem gueltigen Nexus Account an, bevor die Workbench startet.",
      details,
    };
  }
  return {
    tone: controlStatus?.mode === "online" ? "info" : "warning",
    title: "Mit Nexus Code anmelden",
    detail:
      controlStatus?.message ||
      "Nexus Code startet erst, wenn Account, API und Tier eindeutig validiert sind.",
    details,
  };
};

export function BootSequenceScreen({ progress, stage }) {
  const safeProgress = Math.max(0, Math.min(100, Math.round(progress)));
  return (
    <div
      style={{
        ...panelShellStyle,
        alignContent: "center",
        background:
          "linear-gradient(135deg, #05070d 0%, #0b101d 50%, #071016 100%)",
      }}
    >
      <section
        aria-live="polite"
        style={{
          width: "min(440px, 92vw)",
          borderRadius: 16,
          border: "1px solid rgba(112,165,255,0.2)",
          background: "rgba(8,12,24,0.7)",
          boxShadow: "0 22px 60px rgba(0,0,0,0.34)",
          padding: 18,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 30,
              height: 30,
              borderRadius: 10,
              border: "1px solid rgba(112,165,255,0.5)",
              display: "grid",
              placeItems: "center",
              fontWeight: 900,
              fontSize: 12,
            }}
          >
            NC
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 820 }}>Nexus Code</div>
            <div style={{ fontSize: 11, opacity: 0.62 }}>Sichere Session wird vorbereitet</div>
          </div>
        </div>
        <div style={{ marginTop: 14, fontSize: 12, opacity: 0.82, minHeight: 18 }}>
          {stage}
        </div>
        <div
          style={{
            marginTop: 11,
            height: 6,
            borderRadius: 999,
            background: "rgba(255,255,255,0.08)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${safeProgress}%`,
              height: "100%",
              borderRadius: 999,
              background: "linear-gradient(90deg, #70a5ff, #5e5ce6)",
              transition: "width 220ms ease",
            }}
          />
        </div>
      </section>
    </div>
  );
}

export function EditorSuspenseFallback() {
  return (
    <div
      style={{
        width: "100%",
        minHeight: "100dvh",
        display: "grid",
        placeItems: "center",
        background:
          "linear-gradient(135deg, #04050c 0%, #0b0f1c 52%, #111628 100%)",
        color: "#d7e6ff",
        fontFamily: "system-ui, sans-serif",
        fontSize: 13,
        fontWeight: 700,
      }}
    >
      Lade Editor...
    </div>
  );
}

export class EditorRouteErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidUpdate(previousProps) {
    if (previousProps.resetKey !== this.props.resetKey && this.state.error) {
      this.setState({ error: null });
    }
  }

  render() {
    if (!this.state.error) return this.props.children;
    const message = this.state.error?.message || "Editor module could not be loaded";
    const isDynamicImportError = /dynamically imported module|Failed to fetch/i.test(message);
    return (
      <BlockingGateScreen
        tone="danger"
        eyebrow="Nexus Code Start"
        title="Editor konnte nicht geladen werden"
        detail={
          isDynamicImportError
            ? "Der Renderer hat ein Editor-Modul nicht erreicht. Pruefe den Dev-Server oder lade den Renderer neu."
            : "Beim Rendern der Editor-Route ist ein Fehler aufgetreten."
        }
        code={message}
        actionLabel="Renderer neu laden"
        onAction={() => window.location.reload()}
      />
    );
  }
}

export function AccountGateScreen({
  session,
  controlStatus,
  viewGuardState,
  onSubmit,
  onClear,
}) {
  const normalizedSession = useMemo(() => normalizeAccountSession(session), [session]);
  const [draft, setDraft] = useState(() => ({
    endpoint: normalizedSession.endpoint,
    identifier: normalizedSession.email || normalizedSession.username || "",
    password: "",
    rememberSession: true,
  }));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    setDraft((prev) => ({
      ...prev,
      endpoint: normalizedSession.endpoint,
      identifier: prev.identifier || normalizedSession.email || normalizedSession.username || "",
    }));
  }, [normalizedSession.endpoint, normalizedSession.email, normalizedSession.username]);

  const updateDraft = (field, value) => {
    setDraft((prev) => ({
      ...prev,
      [field]: value,
    }));
    setMessage(null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!draft.identifier.trim() || draft.password.length < 8) {
      setMessage({
        tone: "warning",
        title: "Login unvollstaendig",
        detail: "Username oder E-Mail und ein Passwort mit mindestens 8 Zeichen sind erforderlich.",
      });
      return;
    }

    setBusy(true);
    try {
      const result = await onSubmit?.(draft);
      if (result?.ok) {
        setMessage({
          tone: "success",
          title: "Session aktiv",
          detail: "Account validiert. Nexus Code prueft jetzt Release und Zugriff.",
        });
        return;
      }
      const details = formatControlStatusDetails(result?.details || []);
      setMessage({
        tone: result?.mode === "offline" ? "warning" : "danger",
        title: result?.message || details[0]?.title || "Login fehlgeschlagen",
        detail:
          details[0]?.detail ||
          "Die API Session konnte nicht validiert werden.",
        details,
      });
    } catch (error) {
      setMessage({
        tone: "danger",
        title: "Login fehlgeschlagen",
        detail: error?.message || "Die API Session konnte nicht validiert werden.",
      });
    } finally {
      setBusy(false);
    }
  };

  const notice = buildGateNotice({ message, controlStatus, viewGuardState });
  const palette = getNoticePalette(notice.tone);

  return (
    <div
      style={{
        ...panelShellStyle,
        background:
          "linear-gradient(135deg, #050711 0%, #12182f 48%, #061f23 100%)",
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          width: "min(900px, 100%)",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 320px), 1fr))",
          gap: 18,
          alignItems: "stretch",
        }}
      >
        <section
          style={{
            minWidth: 0,
            borderRadius: 18,
            border: "1px solid rgba(255,255,255,0.12)",
            background: "linear-gradient(145deg, rgba(255,255,255,0.08), rgba(255,255,255,0.035))",
            boxShadow: "0 24px 80px rgba(0,0,0,0.36)",
            padding: "clamp(22px, 3.4vw, 32px)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 15,
              display: "grid",
              placeItems: "center",
              border: "1px solid rgba(124,140,255,0.42)",
              color: "#dbe7ff",
              fontWeight: 850,
              letterSpacing: 0,
            }}
          >
            NC
          </div>
          <h1
            style={{
              margin: "22px 0 0",
              fontSize: "clamp(30px, 4.8vw, 48px)",
              lineHeight: 1,
              letterSpacing: 0,
            }}
          >
            Code Session
          </h1>
          <p
            style={{
              margin: "13px 0 0",
              maxWidth: 420,
              color: "rgba(237,244,255,0.68)",
              fontSize: 14,
              lineHeight: 1.6,
            }}
          >
            Nexus Code rendert die Workbench erst nach einer gueltigen Nexus Session.
            So bleiben API-, Tier- und Release-Zustand eindeutig.
          </p>
          <div
            style={{
              marginTop: 20,
              borderRadius: 15,
              border: `1px solid ${palette.border}`,
              background: palette.background,
              padding: 14,
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 840, color: palette.accent }}>
              {notice.title}
            </div>
            <div style={{ marginTop: 5, color: "rgba(237,244,255,0.7)", fontSize: 12, lineHeight: 1.5 }}>
              {notice.detail}
            </div>
            {notice.details?.length > 1 ? (
              <div style={{ marginTop: 10, display: "grid", gap: 6 }}>
                {notice.details.slice(1, 4).map((detail) => (
                  <div
                    key={`${detail.raw}:${detail.title}`}
                    style={{ color: "rgba(237,244,255,0.56)", fontSize: 11, lineHeight: 1.4 }}
                  >
                    {detail.title}: {detail.detail}
                  </div>
                ))}
              </div>
            ) : null}
          </div>
          <div style={{ marginTop: 14, color: "rgba(237,244,255,0.52)", fontSize: 11, lineHeight: 1.5 }}>
            Status: {controlStatus?.title || "Account-Gate aktiv"}
          </div>
        </section>

        <section
          style={{
            minWidth: 0,
            borderRadius: 18,
            border: "1px solid rgba(255,255,255,0.12)",
            background: "rgba(7,11,24,0.72)",
            boxShadow: "0 24px 80px rgba(0,0,0,0.32)",
            padding: 20,
          }}
        >
          <div style={{ display: "grid", gap: 12 }}>
            {[
              ["endpoint", "API Endpoint", "https://nexus-api.cloud"],
              ["identifier", "Username oder E-Mail", "nexus-user"],
            ].map(([field, label, placeholder]) => (
              <label key={field} style={{ display: "grid", gap: 6, minWidth: 0 }}>
                <span style={{ fontSize: 11, fontWeight: 800, color: "rgba(237,244,255,0.54)" }}>
                  {label}
                </span>
                <input
                  value={draft[field] || ""}
                  onChange={(event) => updateDraft(field, event.target.value)}
                  type="text"
                  placeholder={placeholder}
                  autoCapitalize="off"
                  autoCorrect="off"
                  spellCheck={false}
                  style={inputStyle}
                />
              </label>
            ))}
            <label style={{ display: "grid", gap: 6, minWidth: 0 }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: "rgba(237,244,255,0.54)" }}>
                Passwort
              </span>
              <input
                value={draft.password || ""}
                onChange={(event) => updateDraft("password", event.target.value)}
                type="password"
                placeholder="Nexus Passwort"
                autoComplete="current-password"
                style={inputStyle}
              />
            </label>
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 9,
                color: "rgba(237,244,255,0.64)",
                fontSize: 12,
                lineHeight: 1.4,
              }}
            >
              <input
                checked={draft.rememberSession === true}
                onChange={(event) => updateDraft("rememberSession", event.target.checked)}
                type="checkbox"
                style={{ width: 16, height: 16, accentColor: "#7c8cff" }}
              />
              Session auf diesem Geraet merken
            </label>
          </div>

          <button
            type="submit"
            disabled={busy}
            style={{
              ...buttonBaseStyle,
              marginTop: 18,
              width: "100%",
              border: "1px solid rgba(124,140,255,0.44)",
              background: "linear-gradient(135deg, rgba(124,140,255,0.32), rgba(45,212,191,0.18))",
              color: "#f7f8ff",
              cursor: busy ? "wait" : "pointer",
            }}
          >
            {busy ? "Melde an..." : "Mit Nexus starten"}
          </button>
          <button
            type="button"
            onClick={onClear}
            disabled={busy}
            style={{
              ...buttonBaseStyle,
              marginTop: 10,
              width: "100%",
              border: "1px solid rgba(255,255,255,0.1)",
              background: "rgba(255,255,255,0.035)",
              color: "rgba(237,244,255,0.62)",
              cursor: busy ? "wait" : "pointer",
            }}
          >
            Gespeicherte Session entfernen
          </button>
        </section>
      </form>
    </div>
  );
}

export function BlockingGateScreen({
  tone = "warning",
  eyebrow = "Nexus Code",
  title,
  detail,
  code,
  rows = [],
  actionLabel,
  onAction,
}) {
  const palette = getNoticePalette(tone);
  return (
    <div
      style={{
        ...panelShellStyle,
        background: "linear-gradient(135deg, #151203 0%, #0d111c 100%)",
        color: tone === "danger" ? "#fee2e2" : "#fff3d0",
      }}
    >
      <section
        style={{
          width: "min(640px, 92vw)",
          borderRadius: 16,
          border: `1px solid ${palette.border}`,
          background: palette.background,
          padding: 18,
          fontSize: 14,
          lineHeight: 1.5,
        }}
      >
        <div style={{ fontSize: 12, fontWeight: 850, color: palette.accent }}>
          {eyebrow}
        </div>
        <h1 style={{ margin: "8px 0 8px", fontSize: 22, lineHeight: 1.15 }}>
          {title}
        </h1>
        {detail ? (
          <div style={{ color: "rgba(255,255,255,0.72)" }}>{detail}</div>
        ) : null}
        {rows.length > 0 ? (
          <div style={{ marginTop: 12, display: "grid", gap: 7 }}>
            {rows.map(([label, value]) => (
              <div key={label}>
                {label}: <code>{value || "N/A"}</code>
              </div>
            ))}
          </div>
        ) : null}
        {code ? (
          <code
            style={{
              display: "block",
              marginTop: 14,
              padding: "10px 12px",
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.1)",
              background: "rgba(0,0,0,0.24)",
              color: tone === "danger" ? "#fecaca" : "#fde68a",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              fontSize: 12,
              lineHeight: 1.45,
            }}
          >
            {code}
          </code>
        ) : null}
        {actionLabel && onAction ? (
          <button
            type="button"
            onClick={onAction}
            style={{
              ...buttonBaseStyle,
              marginTop: 16,
              border: `1px solid ${palette.border}`,
              background: "rgba(255,255,255,0.06)",
              color: "#fff",
              padding: "0 14px",
            }}
          >
            {actionLabel}
          </button>
        ) : null}
      </section>
    </div>
  );
}
