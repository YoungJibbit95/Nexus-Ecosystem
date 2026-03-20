export type NexusViewId =
  | 'dashboard'
  | 'notes'
  | 'code'
  | 'tasks'
  | 'reminders'
  | 'canvas'
  | 'files'
  | 'flux'
  | 'settings'
  | 'info'
  | 'devtools'

export type NexusViewMeta = {
  title: string
  subtitle: string
}

export const NEXUS_VIEW_META: Record<NexusViewId, NexusViewMeta> = {
  dashboard: { title: 'Dashboard', subtitle: 'Dein täglicher Überblick' },
  notes: { title: 'Notizen', subtitle: 'Schnell festhalten und strukturieren' },
  code: { title: 'Code', subtitle: 'Editor und Snippets an einem Ort' },
  tasks: { title: 'Tasks', subtitle: 'Prioritäten klar und fokussiert' },
  reminders: { title: 'Reminders', subtitle: 'Nichts Wichtiges verpassen' },
  canvas: { title: 'Canvas', subtitle: 'Ideen frei visualisieren' },
  files: { title: 'Dateien', subtitle: 'Alles griffbereit im Workspace' },
  flux: { title: 'Flux', subtitle: 'Live-Flow und Experimente' },
  settings: { title: 'Settings', subtitle: 'Look, Bedienung und Verhalten' },
  info: { title: 'Info', subtitle: 'Status, Version und Hinweise' },
  devtools: { title: 'DevTools', subtitle: 'Debugging und Utilities' },
}

export const NEXUS_VIEW_ORDER: NexusViewId[] = [
  'dashboard',
  'notes',
  'code',
  'tasks',
  'reminders',
  'canvas',
  'files',
  'flux',
  'settings',
  'info',
  'devtools',
]
