export type NexusViewStateKind =
  | 'ready'
  | 'loading'
  | 'empty'
  | 'dirty'
  | 'saving'
  | 'saved'
  | 'offline'
  | 'error'
  | 'blocked'

export type NexusViewStateTone =
  | 'neutral'
  | 'info'
  | 'success'
  | 'warning'
  | 'danger'

export type NexusResolvedViewState = {
  viewId: string
  kind: NexusViewStateKind
  tone: NexusViewStateTone
  label: string
  title: string
  description: string
  actionLabel?: string
  retryable: boolean
  ariaLive: 'off' | 'polite' | 'assertive'
}

export type NexusViewStateOptions = {
  viewId: string
  loading?: boolean
  empty?: boolean
  dirty?: boolean
  saving?: boolean
  saved?: boolean
  offline?: boolean
  error?: unknown
  blockedReason?: string | null
  itemLabel?: string
}

const toErrorMessage = (error: unknown) => {
  if (!error) return ''
  if (error instanceof Error && error.message) return error.message
  if (typeof error === 'string') return error
  return 'Unbekannter Fehler'
}

export const resolveNexusViewState = ({
  viewId,
  loading = false,
  empty = false,
  dirty = false,
  saving = false,
  saved = false,
  offline = false,
  error,
  blockedReason,
  itemLabel = 'Eintraege',
}: NexusViewStateOptions): NexusResolvedViewState => {
  const errorMessage = toErrorMessage(error)

  if (errorMessage) {
    return {
      viewId,
      kind: 'error',
      tone: 'danger',
      label: 'Fehler',
      title: 'View konnte nicht sauber reagieren',
      description: errorMessage,
      actionLabel: 'Erneut versuchen',
      retryable: true,
      ariaLive: 'assertive',
    }
  }

  if (blockedReason) {
    return {
      viewId,
      kind: 'blocked',
      tone: 'warning',
      label: 'Blockiert',
      title: 'Aktion ist gerade nicht verfuegbar',
      description: blockedReason,
      actionLabel: 'Details anzeigen',
      retryable: false,
      ariaLive: 'polite',
    }
  }

  if (loading) {
    return {
      viewId,
      kind: 'loading',
      tone: 'info',
      label: 'Laedt',
      title: 'View wird vorbereitet',
      description: 'Daten, Layout und Interaktionen werden aufgebaut.',
      retryable: false,
      ariaLive: 'polite',
    }
  }

  if (saving) {
    return {
      viewId,
      kind: 'saving',
      tone: 'info',
      label: 'Speichert',
      title: 'Aenderungen werden gespeichert',
      description: 'Die UI bleibt bedienbar, waehrend Nexus den Zustand sichert.',
      retryable: false,
      ariaLive: 'polite',
    }
  }

  if (offline) {
    return {
      viewId,
      kind: 'offline',
      tone: 'warning',
      label: 'Offline',
      title: 'Offline Queue aktiv',
      description: 'Aenderungen bleiben lokal und werden spaeter synchronisiert.',
      retryable: true,
      actionLabel: 'Sync pruefen',
      ariaLive: 'polite',
    }
  }

  if (dirty) {
    return {
      viewId,
      kind: 'dirty',
      tone: 'warning',
      label: 'Ungesichert',
      title: 'Nicht gespeicherte Aenderungen',
      description: 'Diese View hat lokale Aenderungen, die noch bestaetigt werden muessen.',
      retryable: false,
      ariaLive: 'polite',
    }
  }

  if (saved) {
    return {
      viewId,
      kind: 'saved',
      tone: 'success',
      label: 'Gesichert',
      title: 'Aenderung abgeschlossen',
      description: 'Die letzte Aktion wurde von der Shell angenommen.',
      retryable: false,
      ariaLive: 'polite',
    }
  }

  if (empty) {
    return {
      viewId,
      kind: 'empty',
      tone: 'neutral',
      label: 'Leer',
      title: `Noch keine ${itemLabel}`,
      description: 'Die View kann sofort mit der Primaeraktion gestartet werden.',
      retryable: false,
      ariaLive: 'off',
    }
  }

  return {
    viewId,
    kind: 'ready',
    tone: 'success',
    label: 'Bereit',
    title: 'View ist bereit',
    description: 'Layout, Actions und Statussignale sind verfuegbar.',
    retryable: false,
    ariaLive: 'off',
  }
}

export type NexusViewStatusChip = {
  id: string
  label: string
  tone: NexusViewStateTone
  description?: string
}

export const buildNexusViewStatusChips = ({
  state,
  signals = [],
  maxItems = 4,
}: {
  state: NexusResolvedViewState
  signals?: readonly string[]
  maxItems?: number
}): NexusViewStatusChip[] => {
  const normalizedSignals = Array.from(
    new Set(signals.map((signal) => String(signal || '').trim()).filter(Boolean)),
  )
  const signalChips = normalizedSignals.map((signal) => ({
    id: `signal:${signal}`,
    label: signal,
    tone: 'neutral' as const,
  }))

  return [
    {
      id: `state:${state.kind}`,
      label: state.label,
      tone: state.tone,
      description: state.description,
    },
    ...signalChips,
  ].slice(0, Math.max(1, Math.floor(maxItems)))
}
