import React, { useEffect, useState } from 'react'
import { Glass } from '../../components/Glass'
import { DashboardActionButton } from './mobileDashboardPrimitives'
import { readRenderDiagnostics, subscribeRenderDiagnostics } from '../../render/renderRuntime'
import type { MobileDashboardResumeEntry } from './useMobileDashboardDerivedData'

export function MobileRuntimeSummaryCard({
  t,
  rgb,
  resumeLane,
}: {
  t: any
  rgb: string
  resumeLane: MobileDashboardResumeEntry[]
}) {
  const [runtimeDiagnostics, setRuntimeDiagnostics] = useState(() => readRenderDiagnostics())

  useEffect(
    () => subscribeRenderDiagnostics((next) => setRuntimeDiagnostics(next)),
    [],
  )

  return (
    <Glass style={{ padding: '10px 11px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 10, fontWeight: 800, opacity: 0.68, textTransform: 'uppercase', letterSpacing: 0.5 }}>
          Continue & Runtime
        </span>
        <span style={{ fontSize: 10, opacity: 0.58 }}>{runtimeDiagnostics.tier}</span>
      </div>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
        {resumeLane.slice(0, 3).map((entry) => (
          <DashboardActionButton
            key={`${entry.label}-${entry.title}`}
            onClick={entry.action}
            liquidColor={t.accent}
            style={{
              borderRadius: 999,
              border: `1px solid rgba(${rgb},0.28)`,
              background: `rgba(${rgb},0.14)`,
              color: t.accent,
              fontSize: 10,
              fontWeight: 700,
              padding: '5px 8px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'flex-start',
              flexDirection: 'column',
              gap: 5,
              minWidth: 112,
            }}
          >
            <span style={{ fontSize: 9, opacity: 0.72, textTransform: 'uppercase', letterSpacing: 0.35 }}>
              {entry.label}
            </span>
            <span style={{ lineHeight: 1.2 }}>{entry.title}</span>
            <span style={{ fontSize: 9, opacity: 0.62 }}>{entry.reason}</span>
            <span style={{ fontSize: 9, opacity: 0.52, lineHeight: 1.2 }}>
              {entry.subtitle}
            </span>
          </DashboardActionButton>
        ))}
        {resumeLane.length === 0 ? (
          <span style={{ fontSize: 10, opacity: 0.58 }}>Keine Resume-Elemente vorhanden.</span>
        ) : null}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 6 }}>
        {[
          ['Dynamic', String(runtimeDiagnostics.dynamicSurfaces)],
          ['Shader', String(runtimeDiagnostics.shaderSurfaces)],
          ['Commit', `${runtimeDiagnostics.lastCommitDurationMs}ms`],
        ].map(([label, value]) => (
          <div
            key={label}
            style={{
              borderRadius: 8,
              border: '1px solid rgba(255,255,255,0.09)',
              background: 'rgba(255,255,255,0.03)',
              padding: '5px 6px',
            }}
          >
            <div style={{ fontSize: 9, opacity: 0.52, textTransform: 'uppercase', letterSpacing: 0.4 }}>{label}</div>
            <div style={{ fontSize: 11, fontWeight: 700 }}>{value}</div>
          </div>
        ))}
      </div>
    </Glass>
  )
}
