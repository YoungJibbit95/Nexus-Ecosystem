export type NexusIdeCapabilityStatus =
  | 'planned'
  | 'foundation'
  | 'preview'
  | 'stable'
  | 'external'

export type NexusIdeCapabilityArea =
  | 'editor'
  | 'languages'
  | 'terminal'
  | 'git'
  | 'github'
  | 'theme'
  | 'ecosystem'

export type NexusIdeCapability = {
  id: string
  area: NexusIdeCapabilityArea
  label: string
  summary: string
  status: NexusIdeCapabilityStatus
  releasePhase: 'foundation' | 'ide-preview' | 'native-path'
  userVisible: boolean
}

export type NexusIdeLanguageTier = 'full-ide' | 'lsp-next' | 'syntax-first'

export type NexusIdeLanguage = {
  id: string
  label: string
  extensions: string[]
  monacoLanguage: string
  tier: NexusIdeLanguageTier
  serverCommand?: string
  capabilities: Array<'syntax' | 'completion' | 'hover' | 'diagnostics' | 'definition' | 'rename' | 'formatting'>
}

export const NEXUS_CODE_IDE_LANGUAGES: NexusIdeLanguage[] = [
  {
    id: 'typescript',
    label: 'TypeScript',
    extensions: ['ts', 'tsx'],
    monacoLanguage: 'typescript',
    tier: 'full-ide',
    serverCommand: 'typescript-language-server',
    capabilities: ['syntax', 'completion', 'hover', 'diagnostics', 'definition', 'rename', 'formatting'],
  },
  {
    id: 'javascript',
    label: 'JavaScript',
    extensions: ['js', 'jsx', 'mjs', 'cjs'],
    monacoLanguage: 'javascript',
    tier: 'full-ide',
    serverCommand: 'typescript-language-server',
    capabilities: ['syntax', 'completion', 'hover', 'diagnostics', 'definition', 'rename', 'formatting'],
  },
  {
    id: 'python',
    label: 'Python',
    extensions: ['py', 'pyw'],
    monacoLanguage: 'python',
    tier: 'full-ide',
    serverCommand: 'pyright-langserver',
    capabilities: ['syntax', 'completion', 'hover', 'diagnostics', 'definition', 'rename', 'formatting'],
  },
  {
    id: 'rust',
    label: 'Rust',
    extensions: ['rs'],
    monacoLanguage: 'rust',
    tier: 'full-ide',
    serverCommand: 'rust-analyzer',
    capabilities: ['syntax', 'completion', 'hover', 'diagnostics', 'definition', 'rename', 'formatting'],
  },
  {
    id: 'go',
    label: 'Go',
    extensions: ['go'],
    monacoLanguage: 'go',
    tier: 'full-ide',
    serverCommand: 'gopls',
    capabilities: ['syntax', 'completion', 'hover', 'diagnostics', 'definition', 'rename', 'formatting'],
  },
  {
    id: 'cpp',
    label: 'C/C++',
    extensions: ['c', 'cc', 'cpp', 'cxx', 'h', 'hpp', 'hh'],
    monacoLanguage: 'cpp',
    tier: 'full-ide',
    serverCommand: 'clangd',
    capabilities: ['syntax', 'completion', 'hover', 'diagnostics', 'definition', 'rename', 'formatting'],
  },
  {
    id: 'web-markup',
    label: 'HTML/CSS/JSON/Markdown/YAML',
    extensions: ['html', 'css', 'scss', 'less', 'json', 'md', 'markdown', 'yaml', 'yml'],
    monacoLanguage: 'plaintext',
    tier: 'syntax-first',
    capabilities: ['syntax', 'formatting'],
  },
  {
    id: 'secondary-languages',
    label: 'Java, C#, PHP, Ruby, Lua, SQL, Shell',
    extensions: ['java', 'cs', 'php', 'rb', 'lua', 'sql', 'sh', 'bash', 'ps1'],
    monacoLanguage: 'plaintext',
    tier: 'lsp-next',
    capabilities: ['syntax'],
  },
]

export const NEXUS_CODE_IDE_CAPABILITIES: NexusIdeCapability[] = [
  {
    id: 'editor-engine-contract',
    area: 'editor',
    label: 'Editor Engine Contract',
    summary: 'Austauschbare Editor-Schicht fuer Monaco heute und native Engine spaeter.',
    status: 'foundation',
    releasePhase: 'foundation',
    userVisible: false,
  },
  {
    id: 'tier-one-lsp',
    area: 'languages',
    label: 'Tier-1 LSP',
    summary: 'Completion, Hover, Diagnostics, Definition, Rename und Formatting fuer TS/JS, Python, Rust, Go und C/C++.',
    status: 'planned',
    releasePhase: 'ide-preview',
    userVisible: true,
  },
  {
    id: 'workspace-terminal',
    area: 'terminal',
    label: 'Workspace Terminal',
    summary: 'Mehrere Terminals, Tasks und workspace-gebundene Prozessausfuehrung.',
    status: 'foundation',
    releasePhase: 'foundation',
    userVisible: true,
  },
  {
    id: 'local-git-source-control',
    area: 'git',
    label: 'Lokales Source Control',
    summary: 'Git-Status, Diff, Stage, Commit, Branch, Pull, Push und Stash ueber lokale Git-CLI.',
    status: 'foundation',
    releasePhase: 'foundation',
    userVisible: true,
  },
  {
    id: 'github-workflows',
    area: 'github',
    label: 'GitHub Workflows',
    summary: 'OAuth Device Flow, Issues, Pull Requests, Checks und sichere Token-Ablage im Backend.',
    status: 'foundation',
    releasePhase: 'ide-preview',
    userVisible: true,
  },
  {
    id: 'nexus-zed-theme-system',
    area: 'theme',
    label: 'Nexus x Zed Theme System',
    summary: 'Ruhigere IDE-Dichte mit Nexus-Charakter, semantischen Tokens und stabilen Editorfarben.',
    status: 'foundation',
    releasePhase: 'foundation',
    userVisible: true,
  },
  {
    id: 'ecosystem-capability-bridge',
    area: 'ecosystem',
    label: 'Ecosystem Capability Bridge',
    summary: 'Gemeinsames Manifest fuer Nexus Main, Website, Launcher und Nexus Code.',
    status: 'foundation',
    releasePhase: 'foundation',
    userVisible: false,
  },
]

export const NEXUS_CODE_IDE_STRATEGY = {
  product: 'Nexus Code',
  direction: 'Eigene proprietaere IDE-Plattform mit Nexus-visuellem Design und Zed-inspirierter Ruhe.',
  licenseBoundary:
    'Kein Zed-GPL-Code, keine Zed-Assets und keine direkte Zed-Editor-Wiederverwendung in Nexus Code. Native Ideen nur als Clean-Room-Architektur.',
  phaseOne:
    'Bestehende Electron/React-App zur vollstaendigen IDE mit austauschbarem EditorEngine-Contract ausbauen.',
  nativePath:
    'Native Engine nur ueber proprietaer-sicheren Sidecar/Adapter im bestehenden Nexus-Code-Produkt, nicht als separater Produktordner.',
} as const

export function getNexusCodeLanguageByExtension(ext: string): NexusIdeLanguage | null {
  const normalized = ext.replace(/^\./, '').toLowerCase()
  return (
    NEXUS_CODE_IDE_LANGUAGES.find((language) =>
      language.extensions.includes(normalized),
    ) ?? null
  )
}

export function getNexusCodeIdeCapability(id: string): NexusIdeCapability | null {
  return NEXUS_CODE_IDE_CAPABILITIES.find((capability) => capability.id === id) ?? null
}
