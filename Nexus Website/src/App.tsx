import { useCallback, useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Code2,
  Cpu,
  Globe2,
  Laptop,
  Layers,
  LayoutDashboard,
  Lock,
  LogIn,
  LogOut,
  RefreshCw,
  ServerCog,
  ShieldCheck,
  Smartphone,
  Sparkles,
  UserRound,
  Webhook,
  Wrench,
  Zap,
} from 'lucide-react'

type TabId = 'main' | 'code' | 'ecosystem' | 'control'
type Tier = 'free' | 'paid'
type AppId = 'main' | 'mobile' | 'code' | 'code-mobile'
type MessageTone = 'neutral' | 'success' | 'error' | 'warning'

type SessionCapabilities = {
  canMutate?: boolean
  isOwner?: boolean
  mutationSignatureRequired?: boolean
  ownerOnlyControlPanel?: boolean
  ownerLockEnabled?: boolean
}

type ControlSession = {
  username: string
  role: 'admin' | 'developer' | 'viewer' | 'agent' | string
  expiresAt?: string
  deviceId?: string | null
  capabilities?: SessionCapabilities
}

type BootstrapInfo = {
  service?: string
  version?: string
  ownerOnlyControlPanel?: boolean
  ownerLockEnabled?: boolean
  requireSignedMutations?: boolean
  privateRepoHint?: string
  originTrusted?: boolean
  now?: string
}

type ViewAccessResult = {
  appId: AppId
  viewId: string
  allowed: boolean
  reason: string
  userTier: Tier
  requiredTier: Tier | null
  paywallEnabled: boolean
  userTemplateKey: string | null
  evaluatedAt: string
}

type PoliciesDoc = {
  paywalls?: any
  ownerUsernames?: string[]
  controlPanelAllowedUsernames?: string[]
  ownerOnlyControlPanel?: boolean
  restrictMutationsToOwner?: boolean
  [key: string]: any
}

type PaywallEditor = {
  enabled: boolean
  defaultTier: Tier
  viewsByTier: Record<Tier, Record<AppId, string>>
  usersByTier: Record<Tier, string>
}

type BusyState = {
  handshake: boolean
  session: boolean
  workspace: boolean
  login: boolean
  save: boolean
  viewCheck: boolean
}

type ApiRequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  auth?: boolean
  signMutation?: boolean
  body?: unknown
  headers?: Record<string, string>
  timeoutMs?: number
}

const STORAGE_KEYS = {
  baseUrl: 'nexus.control.baseUrl',
  ingestKey: 'nexus.control.ingestKey',
  deviceId: 'nexus.control.deviceId',
}

const SESSION_KEYS = {
  token: 'nexus.control.token',
  signingSecret: 'nexus.control.signingSecret',
}

const PAYWALL_APP_IDS: AppId[] = ['main', 'mobile', 'code', 'code-mobile']

const DEFAULT_VIEWS_BY_APP: Record<AppId, string[]> = {
  main: ['dashboard', 'notes', 'code', 'tasks', 'settings', 'info'],
  mobile: ['dashboard', 'notes', 'code', 'tasks', 'settings', 'info'],
  code: ['editor'],
  'code-mobile': ['editor'],
}

const TAB_ITEMS: Array<{ id: TabId; label: string; icon: any }> = [
  { id: 'main', label: 'Nexus Main', icon: LayoutDashboard },
  { id: 'code', label: 'Nexus Code', icon: Code2 },
  { id: 'ecosystem', label: 'Ecosystem', icon: Layers },
  { id: 'control', label: 'Control API', icon: ServerCog },
]

const MAIN_FEATURES = [
  {
    id: 'workspace',
    title: 'Unified Workspace Core',
    blurb: 'Dashboard, Notes, Tasks, Canvas und Files greifen auf denselben Zustand und dieselben Commands.',
    points: [
      'Cross-View Kontextwechsel ohne Datenverlust',
      'Persistente Local-first Datenhaltung',
      'Live Navigation Sync mit Control Plane',
    ],
  },
  {
    id: 'smart-ui',
    title: 'Adaptive UI Surface',
    blurb: 'Nexus Main Design erweitert auf Website-Niveau mit Layering, Motion und klaren Content-Prioritäten.',
    points: [
      'Mehrstufige Hero- und Panel-Hierarchie',
      'Responsive Content-Cluster für Desktop und Mobile',
      'Akzent- und Kontrastflächen mit klaren States',
    ],
  },
  {
    id: 'automation',
    title: 'Control-aware Automation',
    blurb: 'Website spiegelt den Betriebszustand der API und kann Views/Tiers sofort validieren.',
    points: [
      'Handshake-Status direkt sichtbar',
      'View Access Tester für Rollout-/Paywall-Prüfung',
      'Mutations-Ready Feedback für Admin Flows',
    ],
  },
]

const CODE_FEATURES = [
  {
    id: 'editor',
    title: 'Editor Stack',
    blurb: 'Monaco-basierter Editor mit Fokus auf Geschwindigkeit, Struktur und Runtime-Nähe.',
    points: [
      'Spracheingaben und Workflows für produktive Sessions',
      'Code + Terminal + File-Flow eng gekoppelt',
      'Feature-Rollout über denselben Control Backbone',
    ],
  },
  {
    id: 'runtime',
    title: 'Runtime & Telemetry',
    blurb: 'Ein gemeinsamer Runtime-Layer verbindet App Navigation, Metrics und Feature Gates.',
    points: [
      'Events Batch-Ingest für Betriebstransparenz',
      'Release-/Catalog-/Schema-LiveSync',
      'Kompatibilitätsprüfung pro Client-Version',
    ],
  },
  {
    id: 'security',
    title: 'Mutation Security',
    blurb: 'Signierte Mutationen und Owner-Locks sichern sensible Control-Operationen ab.',
    points: [
      'HMAC Signature Header für Policy/Paywall Updates',
      'Role + Owner Lock Enforcement serverseitig',
      'Device-Gating für privilegierte Rollen',
    ],
  },
]

const ECOSYSTEM_NODES = [
  {
    id: 'main',
    title: 'Nexus Main',
    badge: 'Desktop Core',
    description: 'Primary productivity shell mit Dashboard/Notes/Tasks/Canvas/Files und Theme Runtime.',
    relation: 'Synchronisiert Navigation, Metrics und Feature Flags mit Control Plane.',
  },
  {
    id: 'mobile',
    title: 'Nexus Mobile',
    badge: 'Mobile Parity',
    description: 'Komplementäre mobile Oberfläche auf denselben Kern-Features und Policies.',
    relation: 'Nutzt denselben Paywall-/Tier-Policy-Mechanismus wie Main.',
  },
  {
    id: 'code',
    title: 'Nexus Code',
    badge: 'IDE Surface',
    description: 'Entwicklungsfokus mit Editor-, Workspace- und Tooling-Anbindung.',
    relation: 'Views werden über API-Schema und Release Channel gesteuert.',
  },
  {
    id: 'code-mobile',
    title: 'Nexus Code Mobile',
    badge: 'Mobile IDE',
    description: 'Code-Workflows für mobile Sessions mit denselben Kontrollmechanismen.',
    relation: 'Tier-abhängige View-Freigabe via Policies/Paywalls.',
  },
  {
    id: 'control',
    title: 'Nexus Control Plane',
    badge: 'Governance',
    description: 'Sessions, Policies, Devices, Releases, Catalogs und Audit zentral gebündelt.',
    relation: 'Liefert API-Endpunkte für Auth, Paywall- und User-Access-Verwaltung.',
  },
  {
    id: 'api',
    title: 'Nexus API Runtime',
    badge: 'Shared Runtime',
    description: 'Gemeinsamer Laufzeit-Client für LiveSync, View Validation und Performance Tracking.',
    relation: 'Bindet Website und Apps gegen denselben Control Backbone an.',
  },
]

const toHex = (buffer: ArrayBuffer) => Array
  .from(new Uint8Array(buffer))
  .map((byte) => byte.toString(16).padStart(2, '0'))
  .join('')

const normalizeCsvToken = (value: string) => String(value || '')
  .trim()
  .toLowerCase()
  .replace(/[^a-z0-9._\-:/]/g, '')
  .slice(0, 80)

const parseCsvUnique = (value: string) => {
  const out: string[] = []
  for (const raw of String(value || '').split(',')) {
    const token = normalizeCsvToken(raw)
    if (!token || out.includes(token)) continue
    out.push(token)
  }
  return out
}

const csvFromList = (items: unknown) => (Array.isArray(items) ? items.join(',') : '')

const normalizeBaseUrl = (value: string) => {
  const raw = String(value || '').trim()
  if (!raw) return ''

  try {
    const parsed = new URL(raw)
    if (!['http:', 'https:'].includes(parsed.protocol)) return ''
    if (parsed.username || parsed.password) return ''
    const pathname = parsed.pathname === '/' ? '' : parsed.pathname
    return `${parsed.protocol}//${parsed.host}${pathname}`.replace(/\/$/, '')
  } catch {
    return ''
  }
}

const createDeviceId = () => {
  const suffix = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
  return `nxdev-${suffix}`
}

const abortableFetch = async (url: string, init: RequestInit, timeoutMs: number) => {
  if (typeof AbortController === 'undefined' || !Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    return fetch(url, init)
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
    })
  } finally {
    clearTimeout(timer)
  }
}

const createDefaultPaywallEditor = (): PaywallEditor => {
  const free = Object.fromEntries(
    PAYWALL_APP_IDS.map((appId) => [appId, csvFromList(DEFAULT_VIEWS_BY_APP[appId])]),
  ) as Record<AppId, string>

  return {
    enabled: true,
    defaultTier: 'free',
    viewsByTier: {
      free,
      paid: { ...free },
    },
    usersByTier: {
      free: 'free_demo,guest_user',
      paid: 'paid_demo,premium_user',
    },
  }
}

const readViewsByTier = (doc: PoliciesDoc | null, tier: Tier, appId: AppId) => {
  const source = doc?.paywalls?.tiers?.[tier]?.viewsByApp?.[appId]
  return Array.isArray(source) ? source : DEFAULT_VIEWS_BY_APP[appId]
}

const paywallEditorFromPolicies = (doc: PoliciesDoc | null): PaywallEditor => {
  if (!doc?.paywalls || typeof doc.paywalls !== 'object') {
    return createDefaultPaywallEditor()
  }

  const users = doc.paywalls.users && typeof doc.paywalls.users === 'object' ? doc.paywalls.users : {}
  const freeUsers: string[] = []
  const paidUsers: string[] = []

  for (const [username, entry] of Object.entries(users)) {
    if (entry && typeof entry === 'object' && (entry as any).tier === 'paid') {
      paidUsers.push(username)
    } else {
      freeUsers.push(username)
    }
  }

  const out: PaywallEditor = {
    enabled: doc.paywalls.enabled === true,
    defaultTier: doc.paywalls.defaultTier === 'paid' ? 'paid' : 'free',
    viewsByTier: {
      free: {
        main: csvFromList(readViewsByTier(doc, 'free', 'main')),
        mobile: csvFromList(readViewsByTier(doc, 'free', 'mobile')),
        code: csvFromList(readViewsByTier(doc, 'free', 'code')),
        'code-mobile': csvFromList(readViewsByTier(doc, 'free', 'code-mobile')),
      },
      paid: {
        main: csvFromList(readViewsByTier(doc, 'paid', 'main')),
        mobile: csvFromList(readViewsByTier(doc, 'paid', 'mobile')),
        code: csvFromList(readViewsByTier(doc, 'paid', 'code')),
        'code-mobile': csvFromList(readViewsByTier(doc, 'paid', 'code-mobile')),
      },
    },
    usersByTier: {
      free: freeUsers.join(','),
      paid: paidUsers.join(','),
    },
  }

  if (!out.usersByTier.free && !out.usersByTier.paid) {
    out.usersByTier.free = 'free_demo,guest_user'
    out.usersByTier.paid = 'paid_demo,premium_user'
  }

  return out
}

const buildPaywallPayload = (editor: PaywallEditor) => {
  const paywalls = {
    enabled: editor.enabled,
    defaultTier: editor.defaultTier,
    tiers: {
      free: {
        label: 'Free Tier',
        viewsByApp: {
          main: parseCsvUnique(editor.viewsByTier.free.main),
          mobile: parseCsvUnique(editor.viewsByTier.free.mobile),
          code: parseCsvUnique(editor.viewsByTier.free.code),
          'code-mobile': parseCsvUnique(editor.viewsByTier.free['code-mobile']),
        },
      },
      paid: {
        label: 'Paid Tier',
        viewsByApp: {
          main: parseCsvUnique(editor.viewsByTier.paid.main),
          mobile: parseCsvUnique(editor.viewsByTier.paid.mobile),
          code: parseCsvUnique(editor.viewsByTier.paid.code),
          'code-mobile': parseCsvUnique(editor.viewsByTier.paid['code-mobile']),
        },
      },
    },
    users: {} as Record<string, { tier: Tier; note: string }>,
  }

  for (const username of parseCsvUnique(editor.usersByTier.free)) {
    paywalls.users[username] = { tier: 'free', note: 'Website free template' }
  }
  for (const username of parseCsvUnique(editor.usersByTier.paid)) {
    paywalls.users[username] = { tier: 'paid', note: 'Website paid template' }
  }

  if (Object.keys(paywalls.users).length === 0) {
    paywalls.users.free_demo = { tier: 'free', note: 'Demo Free User' }
    paywalls.users.paid_demo = { tier: 'paid', note: 'Demo Paid User' }
  }

  for (const appId of PAYWALL_APP_IDS) {
    if (paywalls.tiers.paid.viewsByApp[appId].length === 0) {
      paywalls.tiers.paid.viewsByApp[appId] = [...paywalls.tiers.free.viewsByApp[appId]]
    }
  }

  return paywalls
}

function App() {
  const envBaseUrl = String((import.meta as any).env?.VITE_NEXUS_CONTROL_URL || 'https://nexus-api.dev')

  const [activeTab, setActiveTab] = useState<TabId>('main')
  const [selectedMainFeature, setSelectedMainFeature] = useState(MAIN_FEATURES[0].id)
  const [selectedCodeFeature, setSelectedCodeFeature] = useState(CODE_FEATURES[0].id)
  const [selectedNode, setSelectedNode] = useState(ECOSYSTEM_NODES[0].id)

  const [apiBaseUrl, setApiBaseUrl] = useState(() => localStorage.getItem(STORAGE_KEYS.baseUrl) || envBaseUrl)
  const [ingestKey, setIngestKey] = useState(() => localStorage.getItem(STORAGE_KEYS.ingestKey) || '')
  const [deviceId, setDeviceId] = useState(() => localStorage.getItem(STORAGE_KEYS.deviceId) || createDeviceId())
  const [signingSecret, setSigningSecret] = useState(() => sessionStorage.getItem(SESSION_KEYS.signingSecret) || '')
  const [token, setToken] = useState(() => sessionStorage.getItem(SESSION_KEYS.token) || '')

  const [authUsername, setAuthUsername] = useState('')
  const [authPassword, setAuthPassword] = useState('')

  const [session, setSession] = useState<ControlSession | null>(null)
  const [bootstrap, setBootstrap] = useState<BootstrapInfo | null>(null)
  const [apps, setApps] = useState<any[]>([])
  const [metrics, setMetrics] = useState<any>(null)
  const [policies, setPolicies] = useState<PoliciesDoc | null>(null)
  const [paywallEditor, setPaywallEditor] = useState<PaywallEditor>(createDefaultPaywallEditor())

  const [ownerUsersCsv, setOwnerUsersCsv] = useState('youngjibbit')
  const [controlAllowedUsersCsv, setControlAllowedUsersCsv] = useState('youngjibbit')
  const [ownerOnlyControlPanel, setOwnerOnlyControlPanel] = useState(true)
  const [restrictMutationsToOwner, setRestrictMutationsToOwner] = useState(true)

  const [viewCheckForm, setViewCheckForm] = useState({
    appId: 'main' as AppId,
    viewId: 'dashboard',
    username: '',
    userId: '',
    userTier: 'free' as Tier,
  })
  const [viewCheckResult, setViewCheckResult] = useState<ViewAccessResult | null>(null)

  const [status, setStatus] = useState<{ tone: MessageTone; text: string }>({
    tone: 'neutral',
    text: 'Website bereit. Nutze den Control-Tab für API Management.',
  })

  const [busy, setBusy] = useState<BusyState>({
    handshake: false,
    session: false,
    workspace: false,
    login: false,
    save: false,
    viewCheck: false,
  })

  const normalizedBaseUrl = useMemo(() => normalizeBaseUrl(apiBaseUrl), [apiBaseUrl])

  const selectedMainFeatureData = useMemo(
    () => MAIN_FEATURES.find((item) => item.id === selectedMainFeature) || MAIN_FEATURES[0],
    [selectedMainFeature],
  )

  const selectedCodeFeatureData = useMemo(
    () => CODE_FEATURES.find((item) => item.id === selectedCodeFeature) || CODE_FEATURES[0],
    [selectedCodeFeature],
  )

  const selectedNodeData = useMemo(
    () => ECOSYSTEM_NODES.find((item) => item.id === selectedNode) || ECOSYSTEM_NODES[0],
    [selectedNode],
  )

  const markBusy = useCallback((key: keyof BusyState, value: boolean) => {
    setBusy((prev) => ({ ...prev, [key]: value }))
  }, [])

  const updateStatus = useCallback((tone: MessageTone, text: string) => {
    setStatus({ tone, text })
  }, [])

  const hydratePolicyEditors = useCallback((doc: PoliciesDoc | null) => {
    setPolicies(doc)
    setPaywallEditor(paywallEditorFromPolicies(doc))

    const owners = parseCsvUnique(csvFromList(doc?.ownerUsernames))
    const allowed = parseCsvUnique(csvFromList(doc?.controlPanelAllowedUsernames))

    setOwnerUsersCsv((owners.length > 0 ? owners : ['youngjibbit']).join(','))
    setControlAllowedUsersCsv((allowed.length > 0 ? allowed : (owners.length > 0 ? owners : ['youngjibbit'])).join(','))
    setOwnerOnlyControlPanel(doc?.ownerOnlyControlPanel !== false)
    setRestrictMutationsToOwner(doc?.restrictMutationsToOwner !== false)
  }, [])

  const createMutationHeaders = useCallback(async (method: string, path: string, bodyString: string) => {
    const role = String(session?.role || '').toLowerCase()
    const requiresSignature = session?.capabilities?.mutationSignatureRequired === true
      && (role === 'admin' || role === 'developer')

    if (!requiresSignature) {
      return {} as Record<string, string>
    }

    const secret = signingSecret.trim()
    if (!secret) {
      throw new Error('SIGNING_SECRET_MISSING')
    }

    if (!globalThis.crypto?.subtle) {
      throw new Error('WEBCRYPTO_NOT_AVAILABLE')
    }

    const timestampSec = Math.floor(Date.now() / 1000)
    const nonce = `nxdev-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
    const normalizedUsername = String(session?.username || '').trim().toLowerCase()

    const encoder = new TextEncoder()
    const payloadHashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(bodyString || '{}'))
    const payloadHash = toHex(payloadHashBuffer)

    const payload = [
      String(timestampSec),
      nonce,
      normalizedUsername,
      method,
      path,
      payloadHash,
    ].join('.')

    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign'],
    )
    const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(payload))
    const signature = toHex(signatureBuffer)

    return {
      'X-Nexus-Signature-Ts': String(timestampSec),
      'X-Nexus-Signature-Nonce': nonce,
      'X-Nexus-Signature-V1': signature,
    }
  }, [session?.capabilities?.mutationSignatureRequired, session?.role, session?.username, signingSecret])

  const apiRequest = useCallback(async (path: string, options: ApiRequestOptions = {}) => {
    if (!path.startsWith('/')) {
      throw new Error('INVALID_API_PATH')
    }

    if (!normalizedBaseUrl) {
      throw new Error('INVALID_API_BASE_URL')
    }

    const method = String(options.method || 'GET').toUpperCase() as ApiRequestOptions['method']
    const hasBody = options.body != null
    const bodyString = hasBody ? JSON.stringify(options.body) : ''

    const headers: Record<string, string> = {
      Accept: 'application/json',
      'X-Nexus-Device-Id': deviceId.trim(),
      'X-Nexus-Device-Label': 'nexus-website',
      ...(options.headers || {}),
    }

    if (ingestKey.trim() && !headers['X-Nexus-Ingest-Key']) {
      headers['X-Nexus-Ingest-Key'] = ingestKey.trim()
    }

    if (hasBody) {
      headers['Content-Type'] = 'application/json'
    }

    if (options.auth !== false && token) {
      headers.Authorization = `Bearer ${token}`
    }

    if (options.signMutation) {
      const signedHeaders = await createMutationHeaders(method || 'POST', path, bodyString || '{}')
      Object.assign(headers, signedHeaders)
    }

    const response = await abortableFetch(
      `${normalizedBaseUrl}${path}`,
      {
        method,
        headers,
        body: hasBody ? bodyString : undefined,
      },
      options.timeoutMs || 10_000,
    )

    let data: any = null
    try {
      data = await response.json()
    } catch {
      data = null
    }

    if (!response.ok) {
      const details = data?.details ? ` (${JSON.stringify(data.details)})` : ''
      throw new Error(`${data?.error || `HTTP_${response.status}`}${details}`)
    }

    return data
  }, [createMutationHeaders, deviceId, ingestKey, normalizedBaseUrl, token])

  const apiRequestWithToken = useCallback(async (path: string, tokenOverride: string | null, options: ApiRequestOptions = {}) => {
    if (!tokenOverride) {
      return apiRequest(path, options)
    }

    return apiRequest(path, {
      ...options,
      auth: false,
      headers: {
        ...(options.headers || {}),
        Authorization: `Bearer ${tokenOverride}`,
      },
    })
  }, [apiRequest])

  const runHandshake = useCallback(async () => {
    markBusy('handshake', true)
    try {
      const res = await apiRequest('/api/v1/public/bootstrap', { auth: false })
      const item = (res?.item || null) as BootstrapInfo | null
      setBootstrap(item)
      if (item) {
        updateStatus('success', `Handshake ok: ${item.service || 'nexus-control-plane'} v${item.version || '1.0.0'}`)
      } else {
        updateStatus('warning', 'Handshake Antwort ohne Nutzdaten.')
      }
    } catch (error: any) {
      setBootstrap(null)
      updateStatus('error', `Handshake fehlgeschlagen: ${error?.message || 'Unbekannter Fehler'}`)
    } finally {
      markBusy('handshake', false)
    }
  }, [apiRequest, markBusy, updateStatus])

  const refreshSession = useCallback(async (tokenOverride?: string) => {
    const activeToken = tokenOverride || token
    if (!activeToken) {
      setSession(null)
      return false
    }

    markBusy('session', true)
    try {
      const res = await apiRequest('/api/v1/session', {
        auth: false,
        headers: {
          Authorization: `Bearer ${activeToken}`,
        },
      })
      setSession((res?.session || null) as ControlSession | null)
      return true
    } catch {
      if (!tokenOverride) {
        setToken('')
      }
      setSession(null)
      return false
    } finally {
      markBusy('session', false)
    }
  }, [apiRequest, markBusy, token])

  const loadWorkspaceData = useCallback(async (tokenOverride?: string) => {
    markBusy('workspace', true)
    try {
      const tokenForRequest = tokenOverride || token || null
      const [appsRes, metricsRes, policiesRes] = await Promise.all([
        apiRequestWithToken('/api/v1/apps', tokenForRequest),
        apiRequestWithToken('/api/v1/metrics/summary', tokenForRequest),
        apiRequestWithToken('/api/v1/policies', tokenForRequest),
      ])

      setApps(Array.isArray(appsRes?.items) ? appsRes.items : [])
      setMetrics(metricsRes?.item || null)
      hydratePolicyEditors((policiesRes?.item || null) as PoliciesDoc | null)
      updateStatus('success', 'Workspace-Daten erfolgreich geladen.')
    } catch (error: any) {
      updateStatus('error', `Workspace-Laden fehlgeschlagen: ${error?.message || 'Unbekannter Fehler'}`)
    } finally {
      markBusy('workspace', false)
    }
  }, [apiRequestWithToken, hydratePolicyEditors, markBusy, token, updateStatus])

  const handleLogin = useCallback(async () => {
    const username = authUsername.trim()
    if (!username || !authPassword) {
      updateStatus('warning', 'Bitte Username und Passwort eingeben.')
      return
    }

    markBusy('login', true)
    try {
      const res = await apiRequest('/auth/login', {
        method: 'POST',
        auth: false,
        body: {
          username,
          password: authPassword,
        },
      })

      const nextToken = String(res?.token || '')
      if (!nextToken) {
        throw new Error('LOGIN_TOKEN_MISSING')
      }

      setToken(nextToken)
      setAuthPassword('')

      const sessionOk = await refreshSession(nextToken)
      if (!sessionOk) {
        throw new Error('SESSION_FETCH_FAILED')
      }

      await loadWorkspaceData(nextToken)
      updateStatus('success', `Eingeloggt als ${username}.`) 
    } catch (error: any) {
      updateStatus('error', `Login fehlgeschlagen: ${error?.message || 'Unbekannter Fehler'}`)
    } finally {
      markBusy('login', false)
    }
  }, [apiRequest, authPassword, authUsername, loadWorkspaceData, markBusy, refreshSession, updateStatus])

  const handleLogout = useCallback(async () => {
    try {
      if (token) {
        await apiRequest('/auth/logout', {
          method: 'POST',
        })
      }
    } catch {
      // Logout sollte auch bei Request-Fehler lokal fortgesetzt werden.
    }

    setToken('')
    setSession(null)
    setApps([])
    setMetrics(null)
    setPolicies(null)
    setPaywallEditor(createDefaultPaywallEditor())
    setViewCheckResult(null)
    updateStatus('neutral', 'Session beendet.')
  }, [apiRequest, token, updateStatus])

  const handleSavePolicies = useCallback(async () => {
    markBusy('save', true)
    try {
      const nextPayload: PoliciesDoc = {
        ...(policies || {}),
        paywalls: buildPaywallPayload(paywallEditor),
        ownerUsernames: (() => {
          const owners = parseCsvUnique(ownerUsersCsv)
          return owners.length > 0 ? owners : ['youngjibbit']
        })(),
        controlPanelAllowedUsernames: (() => {
          const allowed = parseCsvUnique(controlAllowedUsersCsv)
          if (allowed.length > 0) return allowed
          const owners = parseCsvUnique(ownerUsersCsv)
          return owners.length > 0 ? owners : ['youngjibbit']
        })(),
        ownerOnlyControlPanel,
        restrictMutationsToOwner,
      }

      const res = await apiRequest('/api/v1/policies', {
        method: 'PUT',
        body: nextPayload,
        signMutation: true,
      })

      hydratePolicyEditors((res?.item || nextPayload) as PoliciesDoc)
      updateStatus('success', 'Policies inklusive Paywalls gespeichert.')
    } catch (error: any) {
      updateStatus('error', `Policies speichern fehlgeschlagen: ${error?.message || 'Unbekannter Fehler'}`)
    } finally {
      markBusy('save', false)
    }
  }, [
    apiRequest,
    controlAllowedUsersCsv,
    hydratePolicyEditors,
    markBusy,
    ownerOnlyControlPanel,
    ownerUsersCsv,
    paywallEditor,
    policies,
    restrictMutationsToOwner,
    updateStatus,
  ])

  const handleValidateView = useCallback(async () => {
    const viewId = normalizeCsvToken(viewCheckForm.viewId)
    if (!viewId) {
      updateStatus('warning', 'Bitte eine gültige View ID angeben.')
      return
    }

    markBusy('viewCheck', true)
    try {
      const headers: Record<string, string> = {
        'X-Nexus-App-Id': viewCheckForm.appId,
      }
      if (token) {
        headers.Authorization = `Bearer ${token}`
      }
      if (ingestKey.trim()) {
        headers['X-Nexus-Ingest-Key'] = ingestKey.trim()
      }

      const res = await apiRequest('/api/v1/views/validate', {
        method: 'POST',
        auth: false,
        headers,
        body: {
          appId: viewCheckForm.appId,
          viewId,
          username: viewCheckForm.username.trim() || undefined,
          userId: viewCheckForm.userId.trim() || undefined,
          userTier: viewCheckForm.userTier,
        },
      })

      setViewCheckResult((res?.item || null) as ViewAccessResult | null)
      updateStatus('success', 'View-Validation erfolgreich.')
    } catch (error: any) {
      updateStatus('error', `View-Validation fehlgeschlagen: ${error?.message || 'Unbekannter Fehler'}`)
    } finally {
      markBusy('viewCheck', false)
    }
  }, [apiRequest, ingestKey, markBusy, token, updateStatus, viewCheckForm])

  const mutationSignatureRequired = Boolean(session?.capabilities?.mutationSignatureRequired)
  const signatureReady = !mutationSignatureRequired || Boolean(signingSecret.trim())
  const policySaveReady = session?.role === 'admin' && session?.capabilities?.canMutate === true && signatureReady

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.baseUrl, apiBaseUrl)
  }, [apiBaseUrl])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.ingestKey, ingestKey)
  }, [ingestKey])

  useEffect(() => {
    const nextDeviceId = deviceId.trim() || createDeviceId()
    setDeviceId(nextDeviceId)
    localStorage.setItem(STORAGE_KEYS.deviceId, nextDeviceId)
  }, [deviceId])

  useEffect(() => {
    if (token) {
      sessionStorage.setItem(SESSION_KEYS.token, token)
    } else {
      sessionStorage.removeItem(SESSION_KEYS.token)
    }
  }, [token])

  useEffect(() => {
    if (signingSecret.trim()) {
      sessionStorage.setItem(SESSION_KEYS.signingSecret, signingSecret)
    } else {
      sessionStorage.removeItem(SESSION_KEYS.signingSecret)
    }
  }, [signingSecret])

  useEffect(() => {
    void runHandshake()
    if (token) {
      void (async () => {
        const ok = await refreshSession(token)
        if (ok) {
          await loadWorkspaceData(token)
        }
      })()
    }
    // Intentionally only on first mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const messageIcon = status.tone === 'error'
    ? <AlertTriangle size={16} />
    : status.tone === 'success'
      ? <CheckCircle2 size={16} />
      : <Activity size={16} />

  return (
    <div className="nexus-site">
      <div className="site-gradient site-gradient-a" aria-hidden="true" />
      <div className="site-gradient site-gradient-b" aria-hidden="true" />
      <div className="site-grid-overlay" aria-hidden="true" />

      <div className="site-shell">
        <header className="site-hero">
          <div className="site-hero-topline">NEXUS ECOSYSTEM WEBSITE</div>
          <h1>Interaktive Product + Control Website für Nexus Main und Nexus Code</h1>
          <p>
            Separates Webprojekt mit erweitertem Nexus-Design, API-Anbindung für Account-/User-Access,
            Paywall-Management und direkter View-Validation.
          </p>

          <div className="site-chip-row">
            <span className="site-chip"><Sparkles size={14} /> Website-only Setup</span>
            <span className="site-chip"><ShieldCheck size={14} /> Control API Integration</span>
            <span className="site-chip"><Zap size={14} /> Live Paywall Support</span>
          </div>
        </header>

        <nav className="site-tabs" role="tablist" aria-label="Website Tabs">
          {TAB_ITEMS.map((tab) => {
            const Icon = tab.icon
            const active = activeTab === tab.id
            return (
              <button
                key={tab.id}
                role="tab"
                aria-selected={active}
                className={`site-tab ${active ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <Icon size={16} />
                <span>{tab.label}</span>
              </button>
            )
          })}
        </nav>

        <div className={`site-status ${status.tone}`}>
          {messageIcon}
          <span>{status.text}</span>
        </div>

        <AnimatePresence mode="wait">
          <motion.section
            key={activeTab}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="site-panel"
          >
            {activeTab === 'main' ? (
              <div className="panel-grid">
                <article className="panel-card panel-card-feature-list">
                  <div className="panel-title"><LayoutDashboard size={16} /> Nexus Main Architecture</div>
                  <h2>{selectedMainFeatureData.title}</h2>
                  <p>{selectedMainFeatureData.blurb}</p>
                  <ul>
                    {selectedMainFeatureData.points.map((point) => (
                      <li key={point}>{point}</li>
                    ))}
                  </ul>
                </article>

                <article className="panel-card panel-card-feature-select">
                  <div className="panel-title"><Wrench size={16} /> Interaktive Bereiche</div>
                  <div className="feature-select-grid">
                    {MAIN_FEATURES.map((feature) => (
                      <button
                        key={feature.id}
                        className={`feature-pill ${selectedMainFeature === feature.id ? 'active' : ''}`}
                        onClick={() => setSelectedMainFeature(feature.id)}
                      >
                        {feature.title}
                        <ArrowRight size={14} />
                      </button>
                    ))}
                  </div>
                </article>

                <article className="panel-card panel-card-kpi">
                  <div className="panel-title"><Activity size={16} /> Website KPI Preview</div>
                  <div className="kpi-grid">
                    <div><span>Tabs</span><strong>4</strong></div>
                    <div><span>Control Flows</span><strong>8+</strong></div>
                    <div><span>Paywall Apps</span><strong>{PAYWALL_APP_IDS.length}</strong></div>
                    <div><span>View Tests</span><strong>Live</strong></div>
                  </div>
                </article>
              </div>
            ) : null}

            {activeTab === 'code' ? (
              <div className="panel-grid">
                <article className="panel-card panel-card-feature-list">
                  <div className="panel-title"><Code2 size={16} /> Nexus Code Capabilities</div>
                  <h2>{selectedCodeFeatureData.title}</h2>
                  <p>{selectedCodeFeatureData.blurb}</p>
                  <ul>
                    {selectedCodeFeatureData.points.map((point) => (
                      <li key={point}>{point}</li>
                    ))}
                  </ul>
                </article>

                <article className="panel-card panel-card-feature-select">
                  <div className="panel-title"><Cpu size={16} /> Engineering Layers</div>
                  <div className="feature-select-grid">
                    {CODE_FEATURES.map((feature) => (
                      <button
                        key={feature.id}
                        className={`feature-pill ${selectedCodeFeature === feature.id ? 'active' : ''}`}
                        onClick={() => setSelectedCodeFeature(feature.id)}
                      >
                        {feature.title}
                        <ArrowRight size={14} />
                      </button>
                    ))}
                  </div>
                </article>

                <article className="panel-card panel-card-kpi">
                  <div className="panel-title"><Webhook size={16} /> Runtime Hooks</div>
                  <div className="runtime-list">
                    <div><Laptop size={16} /><span>Desktop IDE Surface</span></div>
                    <div><Smartphone size={16} /><span>Code Mobile Parity</span></div>
                    <div><ShieldCheck size={16} /><span>Mutation Signature Guard</span></div>
                    <div><Globe2 size={16} /><span>Shared Control API Contract</span></div>
                  </div>
                </article>
              </div>
            ) : null}

            {activeTab === 'ecosystem' ? (
              <div className="panel-grid ecosystem-grid">
                <article className="panel-card">
                  <div className="panel-title"><Layers size={16} /> Ecosystem Topology</div>
                  <div className="ecosystem-nodes">
                    {ECOSYSTEM_NODES.map((node) => (
                      <button
                        key={node.id}
                        className={`ecosystem-node ${selectedNode === node.id ? 'active' : ''}`}
                        onClick={() => setSelectedNode(node.id)}
                      >
                        <span>{node.title}</span>
                        <small>{node.badge}</small>
                      </button>
                    ))}
                  </div>
                </article>

                <article className="panel-card">
                  <div className="panel-title"><ServerCog size={16} /> Node Details</div>
                  <h2>{selectedNodeData.title}</h2>
                  <p>{selectedNodeData.description}</p>
                  <div className="node-relation">{selectedNodeData.relation}</div>

                  <div className="flow-track">
                    <div>Main / Mobile</div>
                    <ArrowRight size={14} />
                    <div>API Runtime</div>
                    <ArrowRight size={14} />
                    <div>Control Plane</div>
                  </div>
                </article>
              </div>
            ) : null}

            {activeTab === 'control' ? (
              <div className="control-grid">
                <article className="panel-card control-card">
                  <div className="panel-title"><Globe2 size={16} /> API Connection</div>
                  <div className="form-grid two">
                    <label>
                      API Base URL
                      <input
                        type="text"
                        value={apiBaseUrl}
                        onChange={(e) => setApiBaseUrl(e.target.value)}
                        placeholder="https://nexus-api.dev"
                      />
                    </label>
                    <label>
                      Ingest Key
                      <input
                        type="text"
                        value={ingestKey}
                        onChange={(e) => setIngestKey(e.target.value)}
                        placeholder="optional"
                      />
                    </label>
                    <label>
                      Device ID
                      <input
                        type="text"
                        value={deviceId}
                        onChange={(e) => setDeviceId(e.target.value)}
                        placeholder="nxdev-..."
                      />
                    </label>
                    <label>
                      Signing Secret
                      <input
                        type="password"
                        value={signingSecret}
                        onChange={(e) => setSigningSecret(e.target.value)}
                        placeholder="Für signierte Mutationen"
                      />
                    </label>
                  </div>
                  <div className="action-row">
                    <button onClick={() => void runHandshake()} disabled={busy.handshake}>
                      <RefreshCw size={14} className={busy.handshake ? 'spin' : ''} /> Handshake prüfen
                    </button>
                    <span className={`small-state ${normalizedBaseUrl ? 'ok' : 'warn'}`}>
                      {normalizedBaseUrl ? `Base URL: ${normalizedBaseUrl}` : 'Base URL ungültig'}
                    </span>
                  </div>
                </article>

                <article className="panel-card control-card">
                  <div className="panel-title"><UserRound size={16} /> Account & Session</div>
                  {session ? (
                    <div className="session-box">
                      <div className="session-row"><strong>{session.username}</strong><span>{session.role}</span></div>
                      <div className="session-meta">Expires: {session.expiresAt || '-'}</div>
                      <div className="session-meta">Can Mutate: {session.capabilities?.canMutate ? 'ja' : 'nein'}</div>
                      <div className="session-meta">Signatur erforderlich: {mutationSignatureRequired ? 'ja' : 'nein'}</div>
                      <div className={`small-state ${signatureReady ? 'ok' : 'warn'}`}>
                        {signatureReady ? 'Mutation Signatur bereit' : 'Signing Secret fehlt'}
                      </div>
                      <div className="action-row">
                        <button onClick={() => void refreshSession()} disabled={busy.session}>
                          <RefreshCw size={14} className={busy.session ? 'spin' : ''} /> Session refresh
                        </button>
                        <button onClick={() => void handleLogout()}>
                          <LogOut size={14} /> Logout
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="session-box">
                      <div className="form-grid two">
                        <label>
                          Username
                          <input
                            type="text"
                            value={authUsername}
                            onChange={(e) => setAuthUsername(e.target.value)}
                            placeholder="admin"
                          />
                        </label>
                        <label>
                          Passwort
                          <input
                            type="password"
                            value={authPassword}
                            onChange={(e) => setAuthPassword(e.target.value)}
                            placeholder="••••••••"
                          />
                        </label>
                      </div>
                      <button onClick={() => void handleLogin()} disabled={busy.login}>
                        <LogIn size={14} className={busy.login ? 'spin' : ''} /> Einloggen
                      </button>
                    </div>
                  )}
                </article>

                <article className="panel-card control-card">
                  <div className="panel-title"><Activity size={16} /> API Data Snapshot</div>
                  <div className="kpi-grid">
                    <div><span>Apps</span><strong>{apps.length}</strong></div>
                    <div><span>Metrics</span><strong>{metrics ? 'live' : '-'}</strong></div>
                    <div><span>Policies</span><strong>{policies ? 'geladen' : '-'}</strong></div>
                    <div><span>Paywall</span><strong>{paywallEditor.enabled ? 'aktiv' : 'inaktiv'}</strong></div>
                  </div>
                  <div className="action-row">
                    <button onClick={() => void loadWorkspaceData()} disabled={busy.workspace || !session}>
                      <RefreshCw size={14} className={busy.workspace ? 'spin' : ''} /> Daten laden
                    </button>
                  </div>
                </article>

                <article className="panel-card control-card control-card-wide">
                  <div className="panel-title"><Lock size={16} /> Paywall & User Access Management</div>

                  <div className="form-grid four">
                    <label>
                      Paywall aktiviert
                      <select
                        value={paywallEditor.enabled ? 'true' : 'false'}
                        onChange={(e) => setPaywallEditor((prev) => ({
                          ...prev,
                          enabled: e.target.value === 'true',
                        }))}
                      >
                        <option value="true">true</option>
                        <option value="false">false</option>
                      </select>
                    </label>
                    <label>
                      Default Tier
                      <select
                        value={paywallEditor.defaultTier}
                        onChange={(e) => setPaywallEditor((prev) => ({
                          ...prev,
                          defaultTier: e.target.value === 'paid' ? 'paid' : 'free',
                        }))}
                      >
                        <option value="free">free</option>
                        <option value="paid">paid</option>
                      </select>
                    </label>
                    <label>
                      Owner-Only Control Panel
                      <select
                        value={ownerOnlyControlPanel ? 'true' : 'false'}
                        onChange={(e) => setOwnerOnlyControlPanel(e.target.value === 'true')}
                      >
                        <option value="true">true</option>
                        <option value="false">false</option>
                      </select>
                    </label>
                    <label>
                      Restrict Mutations To Owner
                      <select
                        value={restrictMutationsToOwner ? 'true' : 'false'}
                        onChange={(e) => setRestrictMutationsToOwner(e.target.value === 'true')}
                      >
                        <option value="true">true</option>
                        <option value="false">false</option>
                      </select>
                    </label>
                  </div>

                  <div className="form-grid two">
                    <label>
                      Owner Usernames (CSV)
                      <input
                        type="text"
                        value={ownerUsersCsv}
                        onChange={(e) => setOwnerUsersCsv(e.target.value)}
                        placeholder="youngjibbit"
                      />
                    </label>
                    <label>
                      Control Panel Allowed Usernames (CSV)
                      <input
                        type="text"
                        value={controlAllowedUsersCsv}
                        onChange={(e) => setControlAllowedUsersCsv(e.target.value)}
                        placeholder="youngjibbit,admin"
                      />
                    </label>
                  </div>

                  <div className="paywall-grid">
                    {(['free', 'paid'] as Tier[]).map((tier) => (
                      <div key={tier} className="paywall-tier-box">
                        <h4>{tier.toUpperCase()} Tier Views</h4>
                        {PAYWALL_APP_IDS.map((appId) => (
                          <label key={`${tier}-${appId}`}>
                            {appId}
                            <input
                              type="text"
                              value={paywallEditor.viewsByTier[tier][appId]}
                              onChange={(e) => setPaywallEditor((prev) => ({
                                ...prev,
                                viewsByTier: {
                                  ...prev.viewsByTier,
                                  [tier]: {
                                    ...prev.viewsByTier[tier],
                                    [appId]: e.target.value,
                                  },
                                },
                              }))}
                            />
                          </label>
                        ))}
                      </div>
                    ))}
                  </div>

                  <div className="form-grid two">
                    <label>
                      Free Users (CSV)
                      <textarea
                        rows={3}
                        value={paywallEditor.usersByTier.free}
                        onChange={(e) => setPaywallEditor((prev) => ({
                          ...prev,
                          usersByTier: {
                            ...prev.usersByTier,
                            free: e.target.value,
                          },
                        }))}
                      />
                    </label>
                    <label>
                      Paid Users (CSV)
                      <textarea
                        rows={3}
                        value={paywallEditor.usersByTier.paid}
                        onChange={(e) => setPaywallEditor((prev) => ({
                          ...prev,
                          usersByTier: {
                            ...prev.usersByTier,
                            paid: e.target.value,
                          },
                        }))}
                      />
                    </label>
                  </div>

                  <div className="action-row">
                    <button onClick={() => void handleSavePolicies()} disabled={!policySaveReady || busy.save}>
                      <ShieldCheck size={14} className={busy.save ? 'spin' : ''} /> Policies + Paywalls speichern
                    </button>
                    {!policySaveReady ? (
                      <span className="small-state warn">
                        Save gesperrt: Admin + Mutation-Rechte + gültige Signatur nötig
                      </span>
                    ) : (
                      <span className="small-state ok">
                        Save bereit
                      </span>
                    )}
                  </div>
                </article>

                <article className="panel-card control-card control-card-wide">
                  <div className="panel-title"><Webhook size={16} /> View Access Tester</div>
                  <div className="form-grid four">
                    <label>
                      App
                      <select
                        value={viewCheckForm.appId}
                        onChange={(e) => setViewCheckForm((prev) => ({ ...prev, appId: e.target.value as AppId }))}
                      >
                        {PAYWALL_APP_IDS.map((appId) => (
                          <option key={appId} value={appId}>{appId}</option>
                        ))}
                      </select>
                    </label>
                    <label>
                      View ID
                      <input
                        type="text"
                        value={viewCheckForm.viewId}
                        onChange={(e) => setViewCheckForm((prev) => ({ ...prev, viewId: e.target.value }))}
                        placeholder="dashboard"
                      />
                    </label>
                    <label>
                      Username
                      <input
                        type="text"
                        value={viewCheckForm.username}
                        onChange={(e) => setViewCheckForm((prev) => ({ ...prev, username: e.target.value }))}
                        placeholder="viewer"
                      />
                    </label>
                    <label>
                      User Tier
                      <select
                        value={viewCheckForm.userTier}
                        onChange={(e) => setViewCheckForm((prev) => ({
                          ...prev,
                          userTier: e.target.value === 'paid' ? 'paid' : 'free',
                        }))}
                      >
                        <option value="free">free</option>
                        <option value="paid">paid</option>
                      </select>
                    </label>
                  </div>

                  <div className="action-row">
                    <button onClick={() => void handleValidateView()} disabled={busy.viewCheck}>
                      <RefreshCw size={14} className={busy.viewCheck ? 'spin' : ''} /> View prüfen
                    </button>
                  </div>

                  {viewCheckResult ? (
                    <div className={`view-result ${viewCheckResult.allowed ? 'ok' : 'blocked'}`}>
                      <div>
                        <strong>{viewCheckResult.allowed ? 'ALLOWED' : 'BLOCKED'}</strong>
                        <span>{viewCheckResult.reason}</span>
                      </div>
                      <div>
                        Tier: {viewCheckResult.userTier} | Required: {viewCheckResult.requiredTier || '-'} | Paywall:{' '}
                        {viewCheckResult.paywallEnabled ? 'on' : 'off'}
                      </div>
                    </div>
                  ) : null}
                </article>

                <article className="panel-card control-card">
                  <div className="panel-title"><Lock size={16} /> Runtime Guard State</div>
                  <div className="guard-list">
                    <div>
                      <span>Owner-only Panel</span>
                      <strong>{bootstrap?.ownerOnlyControlPanel ? 'aktiv' : 'aus'}</strong>
                    </div>
                    <div>
                      <span>Owner Lock Mutations</span>
                      <strong>{bootstrap?.ownerLockEnabled ? 'aktiv' : 'aus'}</strong>
                    </div>
                    <div>
                      <span>Signed Mutations</span>
                      <strong>{bootstrap?.requireSignedMutations ? 'aktiv' : 'aus'}</strong>
                    </div>
                    <div>
                      <span>Origin Trusted</span>
                      <strong>{bootstrap?.originTrusted ? 'ja' : 'nein'}</strong>
                    </div>
                  </div>
                </article>

                <article className="panel-card control-card">
                  <div className="panel-title"><ServerCog size={16} /> Service Snapshot</div>
                  <div className="guard-list">
                    <div><span>Service</span><strong>{bootstrap?.service || '-'}</strong></div>
                    <div><span>Version</span><strong>{bootstrap?.version || '-'}</strong></div>
                    <div><span>Private Repo Hint</span><strong>{bootstrap?.privateRepoHint || '-'}</strong></div>
                    <div><span>Now</span><strong>{bootstrap?.now || '-'}</strong></div>
                  </div>
                </article>
              </div>
            ) : null}
          </motion.section>
        </AnimatePresence>
      </div>
    </div>
  )
}

export default App
