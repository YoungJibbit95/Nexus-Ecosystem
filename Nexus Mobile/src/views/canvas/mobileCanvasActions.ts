import { useCanvas, type Canvas, type CanvasNode, type NodeType, type ProjectStatus } from '../../store/canvasStore'
import type { CanvasMagicTemplatePayload } from '@nexus/core/canvas/magicHubTemplates'
import {
  buildCanvasMagicTemplate,
  normalizeCanvasMagicTemplatePayload,
} from '@nexus/core/canvas/magicHubTemplates'

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

const resolveCanvasTemplateScale = (canvasSize: { w: number; h: number }) => {
  const edge = Math.min(canvasSize.w, canvasSize.h)
  if (edge <= 340) return 0.56
  if (edge <= 390) return 0.62
  if (edge <= 430) return 0.68
  if (edge <= 520) return 0.8
  if (edge <= 620) return 0.9
  return 1
}

const scaleTemplateSize = (value: number, scale: number, min: number) =>
  Math.max(min, Math.round(value * scale))

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

export const createCanvasMagicHubTemplate = (input: {
  payload: CanvasMagicTemplatePayload
  viewport: { panX: number; panY: number; zoom: number }
  canvasSize: { w: number; h: number }
  fitView: () => void
  setSelectedNodeId: (id: string | null) => void
}) => {
  const state = useCanvas.getState()
  const centerX = (-input.viewport.panX + input.canvasSize.w * 0.5) / input.viewport.zoom
  const centerY = (-input.viewport.panY + input.canvasSize.h * 0.45) / input.viewport.zoom
  const x = Math.round(centerX / 20) * 20
  const y = Math.round(centerY / 20) * 20
  const templateScale = resolveCanvasTemplateScale(input.canvasSize)
  const payload = normalizeCanvasMagicTemplatePayload(input.payload)
  let template: ReturnType<typeof buildCanvasMagicTemplate>
  try {
    template = buildCanvasMagicTemplate(payload)
  } catch (error) {
    console.error('[Mobile Canvas Magic] template build failed, falling back to mindmap', {
      error,
      payload,
    })
    const fallbackPayload = normalizeCanvasMagicTemplatePayload({
      ...input.payload,
      template: 'mindmap',
      title: 'Mindmap Core',
    })
    template = buildCanvasMagicTemplate(fallbackPayload)
  }

  const applyChecklist = (nodeId: string, items: string[]) => {
    if (!items.length) return
    items.forEach((item) => state.addChecklistItem(nodeId, item))
  }

  if (template.kind === 'ai-project') {
    const graph = template.graph
    const idMap = new globalThis.Map<string, string | null>()
    const scaledOffsetX = (offset: number) => Math.round(offset * templateScale)
    graph.nodes.forEach((node) => {
      state.addNode(node.type as NodeType, x + scaledOffsetX(node.x), y + scaledOffsetX(node.y))
      const activeCanvas = state.getActiveCanvas()
      const created = activeCanvas?.nodes[activeCanvas.nodes.length - 1]
      if (!created) {
        idMap.set(node.id, null)
        return
      }
      state.updateNode(created.id, {
        title: node.title,
        width: scaleTemplateSize(node.width, templateScale, 180),
        height: scaleTemplateSize(node.height, templateScale, 120),
        color: node.color,
        content: node.content,
        pm: {
          ...(created.pm || {}),
          status: node.meta?.status || created.pm?.status || 'todo',
          priority: node.meta?.priority || created.pm?.priority || 'mid',
          progress: typeof node.meta?.progress === 'number' ? node.meta.progress : created.pm?.progress,
          dueDate: node.meta?.dueDate || created.pm?.dueDate,
          owner: node.meta?.owner || created.pm?.owner,
          tags: Array.from(
            new Set([
              ...(created.pm?.tags || []),
              ...(node.meta?.tags || []),
              'magic-ai-project',
            ]),
          ),
        },
      })
      applyChecklist(created.id, node.checklistItems || [])
      idMap.set(node.id, created.id)
    })
    graph.links.forEach((link) => {
      const from = idMap.get(link.from)
      const to = idMap.get(link.to)
      if (from && to) state.addConnection(from, to)
    })
    input.setSelectedNodeId(idMap.get(graph.rootId) || null)
    setTimeout(() => input.fitView(), 30)
    return
  }

  state.addNode('markdown', x - Math.round(380 * templateScale), y - Math.round(300 * templateScale))
  const active = state.getActiveCanvas()
  const created = active?.nodes[active.nodes.length - 1]
  if (!created) return

  state.updateNode(created.id, {
    title: template.title,
    width: scaleTemplateSize(760, templateScale, 420),
    height: scaleTemplateSize(600, templateScale, 320),
    color: template.meta.color,
    content: template.markdown,
    pm: {
      ...(created.pm || {}),
      tags: Array.from(
        new Set([...(created.pm?.tags || []), 'magic-hub', `preset:${template.templateId}`]),
      ),
      status: created.pm?.status || 'idea',
      priority: created.pm?.priority || 'mid',
    },
  })

  input.setSelectedNodeId(created.id)
  setTimeout(() => input.fitView(), 30)
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
  const templateScale = resolveCanvasTemplateScale(input.canvasSize)
  const scaled = (value: number) => Math.round(value * templateScale)
  const scaledSize = (value: number, min: number) => scaleTemplateSize(value, templateScale, min)
  const viewportCenterX = (-input.viewport.panX + input.canvasSize.w * 0.5) / input.viewport.zoom
  const viewportCenterY = (-input.viewport.panY + input.canvasSize.h * 0.45) / input.viewport.zoom
  const templateSize = { w: scaled(2180), h: scaled(1460) }
  const candidateOffsets: Array<[number, number]> = [[0, 0]]
  const ringStepX = Math.max(scaled(560), Math.round(templateSize.w * 0.62))
  const ringStepY = Math.max(scaled(460), Math.round(templateSize.h * 0.56))
  for (let ring = 1; ring <= 8; ring += 1) {
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
    const margin = scaled(140)
    const left = centerX - templateSize.w * 0.5 - margin
    const top = centerY - templateSize.h * 0.5 - margin
    const right = centerX + templateSize.w * 0.5 + margin
    const bottom = centerY + templateSize.h * 0.5 + margin
    let score = 0
    input.canvas.nodes.forEach((node) => {
      const bleed = scaled(72)
      const nodeLeft = node.x - bleed
      const nodeTop = node.y - bleed
      const nodeRight = node.x + node.width + bleed
      const nodeBottom = node.y + node.height + bleed
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
        score += 0.6 * proximity
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
  baseX = Math.round(baseX / 20) * 20
  baseY = Math.round(baseY / 20) * 20
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
    width: scaledSize(380, 220),
    height: scaledSize(250, 150),
  })
  const brief = make('markdown', baseX - scaled(620), baseY - scaled(90), {
    title: 'Projekt Brief',
    content: '# Zielbild\n\n- Scope\n- Timeline\n- Risiken\n- Rollout',
    pm: { status: 'idea', priority: 'high', owner: 'you', progress: 5, tags: ['brief', 'scope'] },
    width: scaledSize(390, 230),
    height: scaledSize(280, 180),
  })
  const sprint = make('checklist', baseX + scaled(640), baseY - scaled(80), {
    title: 'Sprint Backlog',
    items: [
      { id: `i-${Date.now()}-1`, text: 'UI Polish abschließen', done: false },
      { id: `i-${Date.now()}-2`, text: 'QA Testcases schreiben', done: false },
      { id: `i-${Date.now()}-3`, text: 'Release Notes vorbereiten', done: false },
    ],
    pm: { status: 'backlog', priority: 'mid', owner: 'team', progress: 0, tags: ['sprint'] },
    width: scaledSize(360, 220),
    height: scaledSize(260, 170),
  })
  const taskApi = make('task', baseX - scaled(340), baseY + scaled(430), {
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
  const taskQa = make('task', baseX + scaled(340), baseY + scaled(430), {
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
  const milestone = make('milestone', baseX + scaled(860), baseY + scaled(140), {
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
    width: scaledSize(340, 210),
    height: scaledSize(230, 150),
    color: '#BF5AF2',
  })
  const risk = make('risk', baseX + scaled(40), baseY + scaled(780), {
    title: 'Top Risk',
    content: 'API-Runtime Drift\nMitigation: Contract Smoke + Alerting',
    pm: {
      status: 'blocked',
      priority: 'high',
      owner: 'backend',
      progress: 20,
      tags: ['risk'],
    },
    width: scaledSize(360, 220),
    height: scaledSize(230, 150),
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
