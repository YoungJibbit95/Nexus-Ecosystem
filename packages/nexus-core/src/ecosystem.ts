export type NexusAppTarget = {
  id: 'main' | 'mobile' | 'code' | 'code-mobile' | 'api'
  title: string
  workspacePath: string
  platform: string
  defaultPort?: number
}

export const NEXUS_ECOSYSTEM_APPS: NexusAppTarget[] = [
  {
    id: 'main',
    title: 'Nexus Main',
    workspacePath: 'Nexus Main',
    platform: 'Desktop (Electron + React)',
    defaultPort: 5173,
  },
  {
    id: 'mobile',
    title: 'Nexus Mobile',
    workspacePath: 'Nexus Mobile',
    platform: 'Mobile Shell (Capacitor + React)',
    defaultPort: 5174,
  },
  {
    id: 'code',
    title: 'Nexus Code',
    workspacePath: 'Nexus Code',
    platform: 'Code Workspace (Desktop)',
    defaultPort: 5175,
  },
  {
    id: 'code-mobile',
    title: 'Nexus Code Mobile',
    workspacePath: 'Nexus Code Mobile',
    platform: 'Code Workspace (Mobile)',
    defaultPort: 5176,
  },
  {
    id: 'api',
    title: 'Nexus API',
    workspacePath: 'API',
    platform: 'Backend / Service Layer',
  },
]

export const NEXUS_ECOSYSTEM_VERSION = '2026.03'
export const NEXUS_GLOBAL_ASSETS_PATH = 'assets/global'
export const NEXUS_SHARED_PACKAGES = ['@nexus/core', '@nexus/api'] as const
export const NEXUS_API_PACKAGE_PATH = 'API/nexus-api'
