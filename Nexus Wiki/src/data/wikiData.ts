export type CategoryId =
  | 'overview'
  | 'view'
  | 'markdown'
  | 'settings'
  | 'workflow'
  | 'runtime'
  | 'security'
  | 'ops'

export type AppId =
  | 'ecosystem'
  | 'main'
  | 'mobile'
  | 'code'
  | 'code-mobile'
  | 'control'
  | 'runtime'

export type GuideStep = {
  title: string
  detail: string
}

export type MarkdownSnippet = {
  label: string
  description: string
  snippet: string
}

export type WikiEntry = {
  id: string
  title: string
  app: AppId
  category: CategoryId
  summary: string
  guide: GuideStep[]
  points: string[]
  commands: string[]
  tags: string[]
  sources: string[]
  markdownSnippets?: MarkdownSnippet[]
}

export const categories: Array<{ id: CategoryId; label: string; description: string }> = [
  { id: 'overview', label: 'Overview', description: 'Architektur, Komponenten, Scope' },
  { id: 'view', label: 'View Guides', description: 'Alle Views mit Nutzungspfaden' },
  { id: 'markdown', label: 'Markdown', description: 'Notes/Canvas Markdown Referenz' },
  { id: 'settings', label: 'Settings', description: 'Theme, Layout, Motion, Editor' },
  { id: 'workflow', label: 'Workflows', description: 'Terminal, Spotlight, Productivity' },
  { id: 'runtime', label: 'Runtime/API', description: 'Live Sync, Compatibility, Contracts' },
  { id: 'security', label: 'Security', description: 'Access Governance, Account Schutz, Paywalls' },
  { id: 'ops', label: 'Ops/Deploy', description: 'Hosting, Build, Release, Verify' },
]

export const apps: Array<{ id: AppId; label: string; subtitle: string }> = [
  { id: 'ecosystem', label: 'Ecosystem', subtitle: 'Monorepo + Shared Core' },
  { id: 'main', label: 'Nexus Main', subtitle: 'Desktop Productivity App' },
  { id: 'mobile', label: 'Nexus Mobile', subtitle: 'Mobile Parity Surface' },
  { id: 'code', label: 'Nexus Code', subtitle: 'Desktop IDE Surface' },
  { id: 'code-mobile', label: 'Nexus Code Mobile', subtitle: 'Native IDE Surface' },
  { id: 'control', label: 'Control', subtitle: 'Live Sync + Paywalls UI' },
  { id: 'runtime', label: 'Runtime Plane', subtitle: 'Shared API Layer' },
]


export { entries } from './wikiEntries'
export type { MatrixRow } from './wikiViewMatrix'
export { viewMatrix } from './wikiViewMatrix'
