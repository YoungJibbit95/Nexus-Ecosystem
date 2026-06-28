import React, { useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  Download,
  Flag,
  RefreshCw,
  ShieldCheck,
  Sliders,
  Upload,
} from "lucide-react";
import {
  appendFeatureFlagAuditEvent,
  buildFeatureFlagEditorReport,
  createControlFeatureFlagAuditEvent,
  createDefaultControlFeatureFlagDraftState,
  createFeatureCatalogDraft,
  createReleaseRolloutPlan,
  readControlFeatureFlagDraftState,
  toggleFeatureDraft,
  updateFeatureDraft,
  validateFeatureCatalogDraft,
  validateLayoutSchemaDraft,
  writeControlFeatureFlagDraftState,
  type ControlFeatureFlagDraftState,
  type ControlFeatureFlagValidationIssue,
} from "../../app/controlFeatureFlags";
import { Glass } from "../../components/Glass";
import { hexToRgb } from "../../lib/utils";
import { useTheme } from "../../store/themeStore";

type ToastState = {
  tone: "ok" | "warn" | "error";
  message: string;
};

const safeJson = (value: unknown) => JSON.stringify(value, null, 2);

const parseJson = <T,>(value: string): T | null => {
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
};

const copyText = async (text: string) => {
  try {
    await navigator.clipboard?.writeText(text);
    return true;
  } catch {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.top = "-9999px";
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(textarea);
    return ok;
  }
};

const downloadJson = (filename: string, payload: unknown) => {
  const blob = new Blob([safeJson(payload)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

const issueColor = (severity: ControlFeatureFlagValidationIssue["severity"]) => {
  if (severity === "error") return "#ff453a";
  if (severity === "warning") return "#ffb340";
  return "#2bd4ff";
};

const riskColor = (risk: string) => {
  if (risk === "high") return "#ff453a";
  if (risk === "medium") return "#ffb340";
  return "#30d158";
};

export function FeatureFlagControlPanel() {
  const t = useTheme();
  const rgb = hexToRgb(t.accent);
  const rgb2 = hexToRgb(t.accent2);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [state, setState] = useState<ControlFeatureFlagDraftState>(() => readControlFeatureFlagDraftState());
  const [layoutText, setLayoutText] = useState(() => safeJson(readControlFeatureFlagDraftState().layoutSchema));
  const [toast, setToast] = useState<ToastState | null>(null);
  const [selectedFeatureId, setSelectedFeatureId] = useState(() => state.features[0]?.featureId || "");

  const selectedFeature = state.features.find((feature) => feature.featureId === selectedFeatureId) || state.features[0];
  const report = useMemo(() => buildFeatureFlagEditorReport(state), [state]);
  const issues = report.issues;
  const layoutIssues = useMemo(() => {
    const parsed = parseJson<ControlFeatureFlagDraftState["layoutSchema"]>(layoutText);
    return parsed ? validateLayoutSchemaDraft(parsed) : [{ severity: "error" as const, scope: "layout" as const, target: "json", message: "Layout JSON is not valid." }];
  }, [layoutText]);

  const persist = (nextState: ControlFeatureFlagDraftState, message: string, tone: ToastState["tone"] = "ok") => {
    const saved = writeControlFeatureFlagDraftState(nextState);
    setState(saved);
    setLayoutText(safeJson(saved.layoutSchema));
    setToast({ tone, message });
  };

  const validateAndSave = () => {
    const parsedLayout = parseJson<ControlFeatureFlagDraftState["layoutSchema"]>(layoutText);
    if (!parsedLayout) {
      setToast({ tone: "error", message: "Layout JSON ist ungueltig." });
      return;
    }
    const nextState = appendFeatureFlagAuditEvent(
      {
        ...state,
        layoutSchema: parsedLayout,
        catalog: createFeatureCatalogDraft(state.features),
        rolloutPlan: createReleaseRolloutPlan(state.features),
      },
      createControlFeatureFlagAuditEvent("validate", "catalog+layout", "Draft validated and saved locally."),
    );
    persist(nextState, "Draft validiert und lokal gespeichert.");
  };

  const toggle = (featureId: string) => {
    const next = toggleFeatureDraft(state, featureId);
    persist(next, "Feature-Draft aktualisiert.");
  };

  const updateSelected = (patch: Partial<typeof selectedFeature>) => {
    if (!selectedFeature) return;
    const next = updateFeatureDraft(state, selectedFeature.featureId, patch);
    setState(next);
  };

  const saveSelected = () => {
    if (!selectedFeature) return;
    const next = appendFeatureFlagAuditEvent(
      state,
      createControlFeatureFlagAuditEvent("save", selectedFeature.featureId, "Feature draft saved locally."),
    );
    persist(next, "Feature gespeichert.");
  };

  const exportReport = () => downloadJson(`nexus-control-feature-draft-${new Date().toISOString().slice(0, 10)}.json`, report);

  const copyReport = async () => {
    const ok = await copyText(safeJson(report));
    setToast({ tone: ok ? "ok" : "error", message: ok ? "Report kopiert." : "Kopieren fehlgeschlagen." });
  };

  const resetDraft = () => {
    const reset = appendFeatureFlagAuditEvent(
      createDefaultControlFeatureFlagDraftState(),
      createControlFeatureFlagAuditEvent("reset", "draft", "Local feature draft reset to Nexus v6 defaults."),
    );
    persist(reset, "Draft auf v6 Defaults zurueckgesetzt.", "warn");
    setSelectedFeatureId(reset.features[0]?.featureId || "");
  };

  const importDraft = async (file: File | null) => {
    if (!file) return;
    const text = await file.text();
    const parsed = parseJson<Partial<ControlFeatureFlagDraftState>>(text);
    if (!parsed) {
      setToast({ tone: "error", message: "Import JSON ist ungueltig." });
      return;
    }
    const imported = appendFeatureFlagAuditEvent(
      {
        ...createDefaultControlFeatureFlagDraftState(),
        ...parsed,
        features: Array.isArray(parsed.features) ? parsed.features as any : createDefaultControlFeatureFlagDraftState().features,
      },
      createControlFeatureFlagAuditEvent("import", file.name, "Feature draft imported from JSON."),
    );
    persist(imported, "Draft importiert.");
    setSelectedFeatureId(imported.features[0]?.featureId || "");
  };

  const cardStyle: React.CSSProperties = {
    border: "1px solid rgba(255,255,255,0.1)",
    background: `linear-gradient(145deg, rgba(${rgb},0.12), rgba(255,255,255,0.045))`,
    borderRadius: 14,
    boxShadow: `0 22px 70px rgba(${rgb},0.08)`,
  };

  const buttonStyle = (active = false): React.CSSProperties => ({
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    padding: "8px 11px",
    borderRadius: 8,
    border: `1px solid ${active ? `rgba(${rgb},0.42)` : "rgba(255,255,255,0.12)"}`,
    background: active ? `linear-gradient(135deg, rgba(${rgb},0.38), rgba(${rgb2},0.28))` : "rgba(255,255,255,0.06)",
    color: active ? "#fff" : "inherit",
    cursor: "pointer",
    fontSize: 11,
    fontWeight: 900,
  });

  return (
    <div className="nx-devtools-flags" style={{ flex: 1, minHeight: 0, overflow: "auto", padding: 16 }}>
      <div className="nx-devtools-flags-grid" style={{ display: "grid", gridTemplateColumns: "minmax(280px, 0.9fr) minmax(420px, 1.4fr) minmax(280px, 0.9fr)", gap: 14, minHeight: "100%" }}>
        <Glass className="nx-devtools-panel-card nx-devtools-flags-list" style={{ ...cardStyle, padding: 16, display: "flex", flexDirection: "column", minHeight: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <div style={{ width: 38, height: 38, borderRadius: 14, display: "grid", placeItems: "center", background: `rgba(${rgb},0.18)`, color: t.accent }}>
              <Flag size={18} />
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 950 }}>Feature Catalog Draft</div>
              <div style={{ fontSize: 10, opacity: 0.55 }}>Local admin preview, no production mutation</div>
            </div>
          </div>

          <div className="nx-devtools-metric-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 12 }}>
            {[
              ["Enabled", report.summary.enabled],
              ["Beta", report.summary.beta],
              ["Issues", report.summary.issues],
            ].map(([label, value]) => (
              <div key={label} style={{ border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "10px 11px", background: "rgba(0,0,0,0.12)" }}>
                <div style={{ fontSize: 9, opacity: 0.48, textTransform: "uppercase", fontWeight: 900 }}>{label}</div>
                <div style={{ fontSize: 24, fontWeight: 950, color: label === "Issues" && Number(value) > 0 ? "#ffb340" : t.accent }}>{value}</div>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 9, minHeight: 0, overflow: "auto", paddingRight: 4 }}>
            {state.features.map((feature) => (
              <button
                key={feature.featureId}
                onClick={() => setSelectedFeatureId(feature.featureId)}
                style={{
                  textAlign: "left",
                  border: `1px solid ${selectedFeature?.featureId === feature.featureId ? `rgba(${rgb},0.46)` : "rgba(255,255,255,0.1)"}`,
                  background: selectedFeature?.featureId === feature.featureId ? `rgba(${rgb},0.16)` : "rgba(255,255,255,0.045)",
                  borderRadius: 10,
                  padding: 12,
                  color: "inherit",
                  cursor: "pointer",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                  <strong style={{ fontSize: 12 }}>{feature.name}</strong>
                  <span style={{ fontSize: 9, fontWeight: 950, color: feature.enabled ? "#30d158" : "#ff453a" }}>
                    {feature.enabled ? "ON" : "OFF"}
                  </span>
                </div>
                <div style={{ marginTop: 6, fontSize: 10, opacity: 0.56, lineHeight: 1.45 }}>{feature.featureId}</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 9 }}>
                  <span style={{ fontSize: 9, padding: "4px 7px", borderRadius: 999, background: "rgba(255,255,255,0.07)" }}>{feature.rollout}</span>
                  <span style={{ fontSize: 9, padding: "4px 7px", borderRadius: 999, background: "rgba(255,255,255,0.07)", color: riskColor(feature.risk) }}>{feature.risk}</span>
                  <span style={{ fontSize: 9, padding: "4px 7px", borderRadius: 999, background: "rgba(255,255,255,0.07)" }}>{feature.rolloutPercent}%</span>
                </div>
              </button>
            ))}
          </div>
        </Glass>

        <Glass className="nx-devtools-panel-card nx-devtools-flags-editor" style={{ ...cardStyle, padding: 16, display: "flex", flexDirection: "column", minHeight: 0 }}>
          {selectedFeature && (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 14, marginBottom: 14 }}>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 950 }}>{selectedFeature.name}</div>
                  <div style={{ fontSize: 11, opacity: 0.58, marginTop: 4 }}>{selectedFeature.description}</div>
                </div>
                <button onClick={() => toggle(selectedFeature.featureId)} style={buttonStyle(selectedFeature.enabled)}>
                  <ShieldCheck size={13} /> {selectedFeature.enabled ? "Enabled" : "Disabled"}
                </button>
              </div>

              <div className="nx-devtools-field-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
                <label style={{ fontSize: 10, opacity: 0.72, fontWeight: 900 }}>
                  Rollout
                  <select value={selectedFeature.rollout} onChange={(event) => updateSelected({ rollout: event.target.value as any })} style={inputStyle}>
                    <option value="stable">stable</option>
                    <option value="beta">beta</option>
                    <option value="disabled">disabled</option>
                  </select>
                </label>
                <label style={{ fontSize: 10, opacity: 0.72, fontWeight: 900 }}>
                  Risk
                  <select value={selectedFeature.risk} onChange={(event) => updateSelected({ risk: event.target.value as any })} style={inputStyle}>
                    <option value="low">low</option>
                    <option value="medium">medium</option>
                    <option value="high">high</option>
                  </select>
                </label>
                <label style={{ fontSize: 10, opacity: 0.72, fontWeight: 900 }}>
                  Percent
                  <input type="number" min={0} max={100} value={selectedFeature.rolloutPercent} onChange={(event) => updateSelected({ rolloutPercent: Number(event.target.value) })} style={inputStyle} />
                </label>
              </div>

              <label style={{ fontSize: 10, opacity: 0.72, fontWeight: 900, marginTop: 12 }}>
                Note
                <textarea value={selectedFeature.note} onChange={(event) => updateSelected({ note: event.target.value })} style={{ ...inputStyle, minHeight: 68, resize: "vertical", lineHeight: 1.5 }} />
              </label>

              <div className="nx-devtools-action-row" style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
                <button onClick={saveSelected} style={buttonStyle(true)}><CheckCircle2 size={13} /> Save</button>
                <button onClick={validateAndSave} style={buttonStyle()}><ClipboardCheck size={13} /> Validate</button>
                <button onClick={copyReport} style={buttonStyle()}><ClipboardCheck size={13} /> Copy report</button>
                <button onClick={exportReport} style={buttonStyle()}><Download size={13} /> Export</button>
                <button onClick={() => inputRef.current?.click()} style={buttonStyle()}><Upload size={13} /> Import</button>
                <button onClick={resetDraft} style={buttonStyle()}><RefreshCw size={13} /> Reset</button>
                <input ref={inputRef} type="file" accept="application/json,.json" style={{ display: "none" }} onChange={(event) => importDraft(event.target.files?.[0] || null)} />
              </div>

              {toast && (
                <div style={{ marginTop: 12, border: `1px solid ${toast.tone === "error" ? "rgba(255,69,58,0.35)" : toast.tone === "warn" ? "rgba(255,179,64,0.35)" : `rgba(${rgb},0.28)`}`, background: "rgba(0,0,0,0.16)", borderRadius: 14, padding: "10px 12px", fontSize: 11, fontWeight: 800 }}>
                  {toast.message}
                </div>
              )}

              <div className="nx-devtools-validation-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, minHeight: 0, marginTop: 14 }}>
                <div style={{ minHeight: 0 }}>
                  <div style={sectionTitle}><AlertTriangle size={12} /> Validation</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 190, overflow: "auto" }}>
                    {issues.length === 0 ? (
                      <div style={emptyStyle}>Catalog und Layout sehen sauber aus.</div>
                    ) : issues.map((issue, index) => (
                      <div key={`${issue.target}-${index}`} style={issueStyle(issue)}>
                        <strong style={{ color: issueColor(issue.severity) }}>{issue.severity}</strong> {issue.target}: {issue.message}
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ minHeight: 0 }}>
                  <div style={sectionTitle}><Sliders size={12} /> Rollout Plan</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 190, overflow: "auto" }}>
                    {state.rolloutPlan.map((stage) => (
                      <div key={stage.id} style={{ border: "1px solid rgba(255,255,255,0.1)", borderRadius: 14, padding: 10, background: "rgba(0,0,0,0.13)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                          <strong style={{ fontSize: 11 }}>{stage.label}</strong>
                          <span style={{ color: t.accent, fontSize: 10, fontWeight: 950 }}>{stage.percent}%</span>
                        </div>
                        <div style={{ fontSize: 10, opacity: 0.55, marginTop: 5 }}>{stage.gates.join(" / ")}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div style={{ marginTop: 14, minHeight: 0 }}>
                <div style={sectionTitle}>Layout Schema Guard</div>
                <div className="nx-devtools-layout-schema-grid" style={{ display: "grid", gridTemplateColumns: "1.25fr 0.75fr", gap: 10, minHeight: 190 }}>
                  <textarea value={layoutText} onChange={(event) => setLayoutText(event.target.value)} spellCheck={false} style={{ ...inputStyle, minHeight: 190, resize: "vertical", fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace", fontSize: 10, lineHeight: 1.5 }} />
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 210, overflow: "auto" }}>
                    {layoutIssues.map((issue, index) => (
                      <div key={`${issue.target}-${index}`} style={issueStyle(issue)}>
                        <strong style={{ color: issueColor(issue.severity) }}>{issue.severity}</strong> {issue.message}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </Glass>

        <Glass className="nx-devtools-panel-card nx-devtools-flags-audit" style={{ ...cardStyle, padding: 16, display: "flex", flexDirection: "column", minHeight: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <ShieldCheck size={18} color={t.accent} />
            <div>
              <div style={{ fontSize: 15, fontWeight: 950 }}>Audit Trail</div>
              <div style={{ fontSize: 10, opacity: 0.55 }}>Local-only, redaction-safe</div>
            </div>
          </div>
          <div style={{ border: `1px solid rgba(${rgb},0.18)`, borderRadius: 16, padding: 12, background: `linear-gradient(135deg, rgba(${rgb},0.12), rgba(${rgb2},0.08))`, marginBottom: 12 }}>
            <div style={{ fontSize: 10, opacity: 0.58, lineHeight: 1.5 }}>
              Dieser Editor erzeugt eine lokale, auditierbare Control-Draft-Datei. Production-Freigaben bleiben bewusst beim Hosted Control Plane mit Admin-Auth, Server-Audit und Rollback-Token.
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 9, minHeight: 0, overflow: "auto" }}>
            {state.auditLog.map((event) => (
              <div key={event.id} style={{ border: "1px solid rgba(255,255,255,0.1)", borderRadius: 15, padding: 11, background: "rgba(255,255,255,0.045)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                  <strong style={{ fontSize: 11 }}>{event.action}</strong>
                  <span style={{ fontSize: 9, opacity: 0.48 }}>{new Date(event.at).toLocaleString()}</span>
                </div>
                <div style={{ fontSize: 10, opacity: 0.58, marginTop: 5 }}>{event.target}</div>
                <div style={{ fontSize: 10, opacity: 0.72, marginTop: 7, lineHeight: 1.45 }}>{event.detail}</div>
              </div>
            ))}
          </div>
        </Glass>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  marginTop: 6,
  color: "inherit",
  outline: "none",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 8,
  background: "rgba(0,0,0,0.18)",
  padding: "9px 10px",
  fontSize: 11,
  fontWeight: 800,
};

const sectionTitle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 7,
  fontSize: 11,
  fontWeight: 950,
  textTransform: "uppercase",
  letterSpacing: 0.7,
  opacity: 0.75,
  marginBottom: 8,
};

const emptyStyle: React.CSSProperties = {
  border: "1px solid rgba(48,209,88,0.22)",
  borderRadius: 10,
  padding: 11,
  background: "rgba(48,209,88,0.08)",
  fontSize: 11,
  fontWeight: 800,
};

const issueStyle = (issue: ControlFeatureFlagValidationIssue): React.CSSProperties => ({
  border: `1px solid ${issue.severity === "error" ? "rgba(255,69,58,0.25)" : issue.severity === "warning" ? "rgba(255,179,64,0.25)" : "rgba(43,212,255,0.22)"}`,
  borderRadius: 10,
  padding: 10,
  background: "rgba(0,0,0,0.13)",
  fontSize: 10,
  lineHeight: 1.45,
});
