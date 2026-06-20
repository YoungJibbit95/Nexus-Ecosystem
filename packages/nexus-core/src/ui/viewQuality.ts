export type NexusViewQualityMetric = {
  id: string
  label: string
  value: number
  severity?: 'neutral' | 'good' | 'info' | 'warning' | 'danger'
}

export type NexusViewQualityInput = {
  totalItems?: number
  visibleItems?: number
  emptyStateReady?: boolean
  searchActive?: boolean
  filtersActive?: number
  blockedItems?: number
  staleItems?: number
  overdueItems?: number
  errorCount?: number
  synced?: boolean
  workspaceReady?: boolean
}

export type NexusViewQuality = {
  score: number
  tone: 'empty' | 'ready' | 'focused' | 'attention' | 'blocked'
  label: string
  summary: string
  actions: string[]
  metrics: NexusViewQualityMetric[]
}

const clampScore = (value: number) => Math.max(0, Math.min(100, Math.round(value)))

const plural = (count: number, singular: string, pluralLabel = `${singular}s`) =>
  `${count} ${count === 1 ? singular : pluralLabel}`

export const calculateNexusViewQuality = (input: NexusViewQualityInput): NexusViewQuality => {
  const total = Math.max(0, input.totalItems ?? 0)
  const visible = Math.max(0, input.visibleItems ?? total)
  const filters = Math.max(0, input.filtersActive ?? 0)
  const blocked = Math.max(0, input.blockedItems ?? 0)
  const stale = Math.max(0, input.staleItems ?? 0)
  const overdue = Math.max(0, input.overdueItems ?? 0)
  const errors = Math.max(0, input.errorCount ?? 0)
  const emptyStateReady = input.emptyStateReady ?? true
  const synced = input.synced ?? true
  const workspaceReady = input.workspaceReady ?? true

  let score = total > 0 ? 82 : emptyStateReady ? 70 : 45
  if (input.searchActive) score += 4
  if (filters > 0) score += Math.min(8, filters * 3)
  if (visible === 0 && total > 0) score -= 8
  if (!emptyStateReady && total === 0) score -= 14
  if (!workspaceReady) score -= 10
  if (!synced) score -= 6
  score -= Math.min(28, overdue * 4)
  score -= Math.min(24, blocked * 5)
  score -= Math.min(18, stale * 2)
  score -= Math.min(40, errors * 12)

  const safeScore = clampScore(score)
  const attentionLoad = overdue + blocked + errors
  const filtered = Boolean(input.searchActive || filters > 0)
  const tone: NexusViewQuality['tone'] =
    errors > 0 || blocked > 0
      ? 'blocked'
      : attentionLoad > 0 || !synced || !workspaceReady
        ? 'attention'
        : filtered
          ? 'focused'
          : total === 0
            ? 'empty'
            : 'ready'

  const actions: string[] = []
  if (overdue > 0) actions.push(`${plural(overdue, 'ueberfaelliges Item', 'ueberfaellige Items')} pruefen`)
  if (blocked > 0) actions.push(`${plural(blocked, 'blockiertes Item', 'blockierte Items')} entsperren`)
  if (stale > 0) actions.push(`${plural(stale, 'stales Item')} aktualisieren`)
  if (!workspaceReady) actions.push('Workspace verbinden')
  if (!synced) actions.push('Sync pruefen')
  if (visible === 0 && total > 0) actions.push('Filter zuruecksetzen')
  if (total === 0 && emptyStateReady) actions.push('Erstes Item anlegen')

  const metrics: NexusViewQualityMetric[] = [
    { id: 'total', label: 'Total', value: total, severity: total > 0 ? 'good' : 'neutral' },
    { id: 'visible', label: 'Visible', value: visible, severity: visible > 0 ? 'info' : 'neutral' },
    { id: 'attention', label: 'Attention', value: attentionLoad, severity: attentionLoad > 0 ? 'warning' : 'good' },
    { id: 'score', label: 'Readiness', value: safeScore, severity: safeScore >= 78 ? 'good' : safeScore >= 58 ? 'warning' : 'danger' },
  ]

  return {
    score: safeScore,
    tone,
    label:
      tone === 'blocked'
        ? 'Needs attention'
        : tone === 'attention'
          ? 'Review'
          : tone === 'focused'
            ? 'Focused'
            : tone === 'empty'
              ? 'Ready to start'
              : 'Production ready',
    summary:
      tone === 'blocked'
        ? 'Einige Inhalte brauchen Reparatur oder Entscheidung.'
        : tone === 'attention'
          ? 'Die View ist nutzbar, hat aber offene Qualitaetssignale.'
          : tone === 'focused'
            ? `${visible} von ${total} Items sichtbar.`
            : tone === 'empty'
              ? 'Leerer Zustand ist vorbereitet.'
              : `${total} Items sauber verfuegbar.`,
    actions,
    metrics,
  }
}
