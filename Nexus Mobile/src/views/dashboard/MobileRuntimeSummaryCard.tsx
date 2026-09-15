import React, { useEffect, useState } from 'react'
import { ArrowRight } from 'lucide-react'
import { Glass } from '../../components/Glass'
import { DashboardActionButton } from './mobileDashboardPrimitives'
import { readRenderDiagnostics, subscribeRenderDiagnostics } from '../../render/renderRuntime'
import type { MobileDashboardResumeEntry } from './useMobileDashboardDerivedData'

function RuntimeDetails() {
  const [runtimeDiagnostics, setRuntimeDiagnostics] = useState(() => readRenderDiagnostics())

  useEffect(
    () => subscribeRenderDiagnostics((next) => setRuntimeDiagnostics(next)),
    [],
  )

  return (
    <dl style={{ display: 'grid', gap: 8, fontSize: 12, margin: '4px 0 8px' }}>
      {[
        ['Leistungsprofil', runtimeDiagnostics.tier],
        ['Dynamische Flächen', String(runtimeDiagnostics.dynamicSurfaces)],
        ['Shader', String(runtimeDiagnostics.shaderSurfaces)],
        ['Renderzeit', `${runtimeDiagnostics.lastCommitDurationMs} ms`],
      ].map(([label, value]) => (
        <div key={label} style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
          <dt style={{ opacity: 0.72 }}>{label}</dt>
          <dd style={{ margin: 0 }}>{value}</dd>
        </div>
      ))}
    </dl>
  )
}

export function MobileRuntimeSummaryCard({
  t,
  rgb,
  resumeLane,
}: {
  t: any
  rgb: string
  resumeLane: MobileDashboardResumeEntry[]
}) {
  const [detailsOpen, setDetailsOpen] = useState(false)

  return (
    <Glass style={{ padding: '14px' }}>
      <h2 style={{ fontSize: 14, fontWeight: 750, margin: '0 0 10px' }}>Weiterarbeiten</h2>
      <div style={{ display: 'grid', gap: 6 }}>
        {resumeLane.slice(0, 3).map((entry) => (
          <DashboardActionButton
            key={`${entry.label}-${entry.title}`}
            onClick={entry.action}
            liquidColor={t.accent}
            style={{
              borderRadius: 10,
              border: `1px solid rgba(${rgb},0.18)`,
              background: `rgba(${rgb},0.06)`,
              color: 'inherit',
              fontSize: 13,
              minHeight: 52,
              padding: '9px 10px',
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            <span style={{ display: 'block', flex: 1, minWidth: 0 }}>
              <span style={{ display: 'block', fontSize: 11, opacity: 0.7, marginBottom: 3 }}>{entry.label}</span>
              <span style={{ display: 'block', fontWeight: 650, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{entry.title}</span>
            </span>
            <ArrowRight size={16} aria-hidden="true" style={{ flexShrink: 0, opacity: 0.65 }} />
          </DashboardActionButton>
        ))}
        {resumeLane.length === 0 ? (
          <p style={{ fontSize: 13, opacity: 0.7, margin: '0 0 4px' }}>Deine letzten Inhalte erscheinen hier.</p>
        ) : null}
      </div>

      <details
        onToggle={(event) => setDetailsOpen(event.currentTarget.open)}
        style={{ marginTop: 10, borderTop: '1px solid rgba(128,128,128,0.18)' }}
      >
        <summary style={{ minHeight: 44, padding: '13px 0', fontSize: 12, cursor: 'pointer', opacity: 0.75 }}>
          Details & Leistung
        </summary>
        {detailsOpen ? (
          <>
            {resumeLane.slice(0, 3).map((entry) => (
              <div key={`${entry.label}-${entry.title}`} style={{ fontSize: 12, marginBottom: 12, overflowWrap: 'anywhere' }}>
                <div style={{ fontWeight: 650 }}>{entry.title}</div>
                <div style={{ opacity: 0.7, marginTop: 3 }}>{entry.reason} · {entry.subtitle}</div>
              </div>
            ))}
            <RuntimeDetails />
          </>
        ) : null}
      </details>
    </Glass>
  )
}
