import { useCanvas, type Canvas, type CanvasNode, type NodeType, type ProjectStatus } from '../../store/canvasStore'

const PM_STATUS_ORDER: ProjectStatus[] = ['idea', 'backlog', 'todo', 'doing', 'review', 'done', 'blocked']

const toFileSafeSlug = (value: string) =>
  (value || 'canvas')
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'canvas'

const triggerTextDownload = (filename: string, content: string, mime = 'text/plain;charset=utf-8') => {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export const exportCanvasFiles = (
  canvas: Canvas | undefined,
  viewport: { panX: number; panY: number; zoom: number },
) => {
  if (!canvas) return

  const exportedAt = new Date().toISOString()
  const stamp = exportedAt.slice(0, 19).replace(/[:T]/g, '-')
  const slug = toFileSafeSlug(canvas.name)
  const baseName = `${slug}-${stamp}`

  const jsonPayload = {
    version: 1,
    app: 'nexus-canvas',
    exportedAt,
    viewport,
    canvas: {
      id: canvas.id,
      name: canvas.name,
      created: canvas.created,
      updated: canvas.updated,
      nodes: canvas.nodes,
      connections: canvas.connections,
    },
  }

  const readable: string[] = []
  readable.push(`# Canvas Export: ${canvas.name}`)
  readable.push(`exported_at: ${exportedAt}`)
  readable.push(`canvas_id: ${canvas.id}`)
  readable.push(`nodes: ${canvas.nodes.length}`)
  readable.push(`connections: ${canvas.connections.length}`)
  readable.push('')
  readable.push('## Nodes')
  canvas.nodes.forEach((node, index) => {
    readable.push(`### ${index + 1}. ${node.title || 'Untitled'} (${node.type})`)
    readable.push(`id: ${node.id}`)
    readable.push(`position: x=${Math.round(node.x)}, y=${Math.round(node.y)}`)
    readable.push(`size: w=${Math.round(node.width)}, h=${Math.round(node.height)}`)
    if (node.pm?.status) readable.push(`status: ${node.pm.status}`)
    if (node.pm?.priority) readable.push(`priority: ${node.pm.priority}`)
    if (typeof node.pm?.progress === 'number') readable.push(`progress: ${node.pm.progress}`)
    if (node.pm?.dueDate) readable.push(`due_date: ${node.pm.dueDate}`)
    if (node.pm?.owner) readable.push(`owner: ${node.pm.owner}`)
    if (node.pm?.tags?.length) readable.push(`tags: ${node.pm.tags.join(', ')}`)
    if (node.items?.length) {
      readable.push('checklist:')
      node.items.forEach((item) => {
        readable.push(`- [${item.done ? 'x' : ' '}] ${item.text}`)
      })
    }
    if (node.content?.trim()) {
      readable.push('content:')
      readable.push('```text')
      readable.push(node.content.trimEnd())
      readable.push('```')
    }
    readable.push('')
  })
  readable.push('## Connections')
  canvas.connections.forEach((conn, index) => {
    const from = canvas.nodes.find((n) => n.id === conn.fromId)
    const to = canvas.nodes.find((n) => n.id === conn.toId)
    readable.push(`${index + 1}. ${from?.title || conn.fromId} -> ${to?.title || conn.toId}${conn.label ? ` (${conn.label})` : ''}`)
  })
  readable.push('')
  readable.push('## Raw JSON')
  readable.push('```json')
  readable.push(JSON.stringify(jsonPayload, null, 2))
  readable.push('```')

  triggerTextDownload(`${baseName}.nexus-canvas.json`, JSON.stringify(jsonPayload, null, 2), 'application/json;charset=utf-8')
  triggerTextDownload(`${baseName}.nexus-canvas.md`, readable.join('\n'), 'text/markdown;charset=utf-8')
}

export const duplicateSelectedCanvasNode = (
  selectedNodeId: string | null,
  setSelectedNodeId: (id: string | null) => void,
) => {
  if (!selectedNodeId) return
  const state = useCanvas.getState()
  const active = state.getActiveCanvas()
  const source = active?.nodes.find(node => node.id === selectedNodeId)
  if (!source) return

  state.addNode(source.type, source.x + 56, source.y + 56)
  const c = state.getActiveCanvas()
  const created = c?.nodes[c.nodes.length - 1]
  if (!created) return
  state.updateNode(created.id, {
    title: `${source.title} Copy`,
    width: source.width,
    height: source.height,
    content: source.content,
    color: source.color,
    items: source.items?.map((item, idx) => ({ ...item, id: `${item.id}-copy-${idx}-${Date.now().toString(36)}` })),
    codeLang: source.codeLang,
    linkedNoteId: source.linkedNoteId,
    linkedCodeId: source.linkedCodeId,
    linkedTaskId: source.linkedTaskId,
    linkedReminderId: source.linkedReminderId,
    pm: source.pm ? { ...source.pm, tags: source.pm.tags ? [...source.pm.tags] : undefined } : undefined,
  })
  setSelectedNodeId(created.id)
}

export const createCanvasProjectTemplate = (input: {
  canvas: Canvas | undefined
  viewport: { panX: number; panY: number; zoom: number }
  canvasSize: { w: number; h: number }
  fitView: () => void
  setSelectedNodeId: (id: string | null) => void
}) => {
  if (!input.canvas) return
  const state = useCanvas.getState()
  const viewportCenterX = (-input.viewport.panX + input.canvasSize.w * 0.5) / input.viewport.zoom
  const viewportCenterY = (-input.viewport.panY + input.canvasSize.h * 0.45) / input.viewport.zoom
  const templateSize = { w: 1680, h: 1180 }
  const candidateOffsets: Array<[number, number]> = [[0, 0]]
  const ringStepX = Math.max(540, Math.round(templateSize.w * 0.54))
  const ringStepY = Math.max(420, Math.round(templateSize.h * 0.48))
  for (let ring = 1; ring <= 6; ring += 1) {
    const points = 8 + ring * 6
    const radiusX = ringStepX * ring
    const radiusY = ringStepY * ring
    for (let index = 0; index < points; index += 1) {
      const angle = (index / points) * Math.PI * 2
      const jitter = index % 2 === 0 ? 0.15 : -0.09
      candidateOffsets.push([
        Math.round(Math.cos(angle + jitter) * radiusX),
        Math.round(Math.sin(angle + jitter) * radiusY),
      ])
    }
  }
  const overlapScore = (centerX: number, centerY: number) => {
    if (!input.canvas?.nodes.length) return 0
    const margin = 92
    const left = centerX - templateSize.w * 0.5 - margin
    const top = centerY - templateSize.h * 0.5 - margin
    const right = centerX + templateSize.w * 0.5 + margin
    const bottom = centerY + templateSize.h * 0.5 + margin
    let score = 0
    input.canvas.nodes.forEach((node) => {
      const nodeLeft = node.x - 40
      const nodeTop = node.y - 40
      const nodeRight = node.x + node.width + 40
      const nodeBottom = node.y + node.height + 40
      const intersects =
        nodeLeft < right
        && nodeRight > left
        && nodeTop < bottom
        && nodeBottom > top
      if (!intersects) return
      score += 1
      const overlapW = Math.max(0, Math.min(right, nodeRight) - Math.max(left, nodeLeft))
      const overlapH = Math.max(0, Math.min(bottom, nodeBottom) - Math.max(top, nodeTop))
      score += (overlapW * overlapH) / (templateSize.w * templateSize.h + 1)
      const nodeCenterX = node.x + node.width * 0.5
      const nodeCenterY = node.y + node.height * 0.5
      const distX = Math.abs(nodeCenterX - centerX)
      const distY = Math.abs(nodeCenterY - centerY)
      const softRangeX = templateSize.w * 0.65
      const softRangeY = templateSize.h * 0.62
      if (distX < softRangeX && distY < softRangeY) {
        const proximity = 1 - Math.max(distX / softRangeX, distY / softRangeY)
        score += 0.35 * proximity
      }
    })
    return score
  }
  let baseX = viewportCenterX
  let baseY = viewportCenterY
  let bestScore = Number.POSITIVE_INFINITY
  candidateOffsets.forEach(([dx, dy]) => {
    const candX = viewportCenterX + dx
    const candY = viewportCenterY + dy
    const score = overlapScore(candX, candY)
    if (score < bestScore) {
      bestScore = score
      baseX = candX
      baseY = candY
    }
  })
  baseX = Math.round(baseX / 10) * 10
  baseY = Math.round(baseY / 10) * 10
  const make = (type: NodeType, x: number, y: number, patch: Partial<CanvasNode>) => {
    state.addNode(type, x, y)
    const c = state.getActiveCanvas()
    const last = c?.nodes[c.nodes.length - 1]
    if (!last) return null
    state.updateNode(last.id, patch)
    return last.id
  }

  const root = make('project', baseX, baseY, {
    title: 'Project Core',
    content: 'KPI, Scope, Stakeholder, Deliverables',
    pm: { status: 'doing', priority: 'high', owner: 'lead', progress: 12, tags: ['project'] },
    width: 380,
    height: 250,
  })
  const brief = make('markdown', baseX - 480, baseY - 30, {
    title: 'Projekt Brief',
    content: '# Zielbild\n\n- Scope\n- Timeline\n- Risiken\n- Rollout',
    pm: { status: 'idea', priority: 'high', owner: 'you', progress: 5, tags: ['brief', 'scope'] },
    width: 360,
    height: 260,
  })
  const sprint = make('checklist', baseX + 460, baseY - 20, {
    title: 'Sprint Backlog',
    items: [
      { id: `i-${Date.now()}-1`, text: 'UI Polish abschließen', done: false },
      { id: `i-${Date.now()}-2`, text: 'QA Testcases schreiben', done: false },
      { id: `i-${Date.now()}-3`, text: 'Release Notes vorbereiten', done: false },
    ],
    pm: { status: 'backlog', priority: 'mid', owner: 'team', progress: 0, tags: ['sprint'] },
    width: 320,
    height: 240,
  })
  const taskApi = make('task', baseX - 220, baseY + 340, {
    title: 'API Integration',
    pm: {
      status: 'doing',
      priority: 'high',
      owner: 'backend',
      dueDate: new Date(Date.now() + 3 * 86400000).toISOString(),
      estimate: 8,
      progress: 45,
      tags: ['api', 'integration'],
    },
  })
  const taskQa = make('task', baseX + 180, baseY + 340, {
    title: 'Mobile QA',
    pm: {
      status: 'todo',
      priority: 'mid',
      owner: 'qa',
      dueDate: new Date(Date.now() + 5 * 86400000).toISOString(),
      estimate: 5,
      progress: 0,
      tags: ['qa', 'mobile'],
    },
  })
  const milestone = make('milestone', baseX + 620, baseY + 80, {
    title: 'Milestone Beta',
    content: 'Beta Release + QA-Freigabe',
    pm: {
      status: 'review',
      priority: 'critical',
      owner: 'pm',
      dueDate: new Date(Date.now() + 10 * 86400000).toISOString(),
      milestone: 'Beta v1',
      progress: 70,
      tags: ['milestone'],
    },
    width: 320,
    height: 220,
    color: '#BF5AF2',
  })
  const risk = make('risk', baseX + 40, baseY + 640, {
    title: 'Top Risk',
    content: 'API-Runtime Drift\nMitigation: Contract Smoke + Alerting',
    pm: {
      status: 'blocked',
      priority: 'high',
      owner: 'backend',
      progress: 20,
      tags: ['risk'],
    },
    width: 340,
    height: 220,
    color: '#FF453A',
  })

  ;[
    [root, brief],
    [root, sprint],
    [root, taskApi],
    [root, taskQa],
    [root, milestone],
    [root, risk],
  ].forEach(([from, to]) => {
    if (!from || !to) return
    state.addConnection(from, to)
  })

  if (root) input.setSelectedNodeId(root)
  if (sprint) {
    state.addChecklistItem(sprint, 'Kickoff + Scope finalisieren')
    state.addChecklistItem(sprint, 'API + UI Integration')
    state.addChecklistItem(sprint, 'QA + UAT')
    state.addChecklistItem(sprint, 'Launch Gate')
  }
  setTimeout(() => input.fitView(), 10)
}

export const autoArrangeCanvasByStatus = (fitView: () => void) => {
  const state = useCanvas.getState()
  const c = state.getActiveCanvas()
  if (!c) return
  const columns = PM_STATUS_ORDER
  const laneX = (idx: number) => 120 + idx * 300
  const laneYStart = 140
  const laneGap = 170
  const counters: Record<ProjectStatus, number> = {
    idea: 0, backlog: 0, todo: 0, doing: 0, review: 0, done: 0, blocked: 0,
  }
  c.nodes.forEach((n) => {
    const s = n.pm?.status || 'idea'
    const x = laneX(columns.indexOf(s))
    const y = laneYStart + counters[s] * laneGap
    counters[s] += 1
    state.moveNode(n.id, x, y)
  })
  fitView()
}

export const autoLinkCanvasWikiRefs = () => {
  const state = useCanvas.getState()
  const c = state.getActiveCanvas()
  if (!c) return
  const byTitle = new globalThis.Map(c.nodes.map(n => [n.title.trim().toLowerCase(), n.id] as const))
  c.nodes.forEach((n) => {
    const refs = Array.from((n.content || '').matchAll(/\[\[([^\]]+)\]\]/g)).map((m) => m[1].trim().toLowerCase())
    refs.forEach((r) => {
      const toId = byTitle.get(r)
      if (toId && toId !== n.id) state.addConnection(n.id, toId)
    })
  })
}
