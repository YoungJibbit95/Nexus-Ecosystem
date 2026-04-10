import { useCanvas, type CanvasNode, type NodeType } from '../../../store/canvasStore'
import {
  createMagicTemplate as createStandardMagicTemplate,
  type CanvasTemplateContext,
} from '../templates/canvasTemplates'
import type { MagicTemplatePayload } from '../CanvasMagicModal'

type SpawnNodeFn = (
  type: NodeType,
  options?: {
    x?: number
    y?: number
    title?: string
    patch?: Partial<CanvasNode>
  },
) => string | null

type ConnectNodesFn = (
  pairs: Array<[string | null | undefined, string | null | undefined]>,
) => void

type CreateMagicTemplateParams = {
  payload: MagicTemplatePayload
  canvasSize: { w: number; h: number }
  viewport: { panX: number; panY: number; zoom: number }
  spawnNode: SpawnNodeFn
  connectNodes: ConnectNodesFn
  fitView: () => void
  setSelectedNodeId: (id: string | null) => void
  setShowMagicBuilder: (value: boolean) => void
  setQuickAddPos: (value: { x: number; y: number } | null) => void
}

const getViewportCenter = (params: CreateMagicTemplateParams) => {
  const centerX = (-params.viewport.panX + params.canvasSize.w * 0.5) / params.viewport.zoom
  const centerY = (-params.viewport.panY + params.canvasSize.h * 0.45) / params.viewport.zoom
  return {
    x: Math.round(centerX / 20) * 20,
    y: Math.round(centerY / 20) * 20,
  }
}

const day = (offset: number) => {
  const d = new Date()
  d.setDate(d.getDate() + offset)
  return d.toISOString().slice(0, 10)
}

const createMeetingHubTemplate = (params: CreateMagicTemplateParams) => {
  const { payload, spawnNode, connectNodes } = params
  const state = useCanvas.getState()
  const center = getViewportCenter(params)
  const title = payload.title || 'Meeting Hub'

  const rootId = spawnNode('project', {
    x: center.x,
    y: center.y - 260,
    title: `${title} Meeting`,
    patch: {
      color: '#64D2FF',
      status: 'doing',
      priority: 'mid',
      progress: 24,
      content: 'Meeting Hub: Agenda, Entscheidungen, Owner und Follow-up.',
    },
  })

  const agenda = spawnNode('markdown', {
    x: center.x - 520,
    y: center.y - 20,
    title: 'Agenda',
    patch: {
      color: '#64D2FF',
      content:
        '```nexus-steps\\n1 | Ziel und Scope klären\\n2 | Offene Punkte priorisieren\\n3 | Entscheidung treffen\\n4 | Action Items bestätigen\\n```',
    },
  })

  const decisions = spawnNode('decision', {
    x: center.x,
    y: center.y + 40,
    title: 'Hauptentscheidung',
    patch: {
      color: '#BF5AF2',
      status: 'doing',
      priority: 'high',
    },
  })

  const actions = spawnNode('checklist', {
    x: center.x + 520,
    y: center.y - 20,
    title: 'Action Items',
    patch: { color: '#30D158' },
  })

  const followUp = spawnNode('milestone', {
    x: center.x,
    y: center.y + 340,
    title: 'Follow-up Termin',
    patch: {
      color: '#FF9F0A',
      dueDate: day(3),
      status: 'todo',
    },
  })

  connectNodes([
    [rootId, agenda],
    [rootId, decisions],
    [rootId, actions],
    [rootId, followUp],
  ])

  if (actions) {
    state.addChecklistItem(actions, 'Owner pro Action Item setzen')
    state.addChecklistItem(actions, 'ETA für kritische Tasks festlegen')
    state.addChecklistItem(actions, 'Follow-up Termin bestätigen')
  }

  if (payload.includeNotes) {
    const notes = spawnNode('markdown', {
      x: center.x - 120,
      y: center.y + 330,
      title: 'Meeting Notes',
      patch: {
        content:
          '```nexus-list\\nModerator | @owner\\nEntscheidungsrahmen | Impact + Aufwand\\nNächstes Sync | In 3 Tagen\\n```',
      },
    })
    connectNodes([[rootId, notes]])
  }

  return rootId
}

const createDeliveryMapTemplate = (params: CreateMagicTemplateParams) => {
  const { payload, spawnNode, connectNodes } = params
  const state = useCanvas.getState()
  const center = getViewportCenter(params)
  const title = payload.title || 'Delivery Map'

  const rootId = spawnNode('project', {
    x: center.x,
    y: center.y - 280,
    title: `${title} Delivery`,
    patch: {
      color: '#30D158',
      status: 'doing',
      priority: 'high',
      progress: 28,
      content: 'Delivery Pipeline von Backlog bis Launch.',
    },
  })

  const backlog = spawnNode('checklist', { x: center.x - 620, y: center.y + 20, title: 'Backlog', patch: { color: '#8E8E93' } })
  const build = spawnNode('checklist', { x: center.x - 220, y: center.y + 20, title: 'Build', patch: { color: '#007AFF' } })
  const qa = spawnNode('checklist', { x: center.x + 180, y: center.y + 20, title: 'QA', patch: { color: '#BF5AF2' } })
  const launch = spawnNode('checklist', { x: center.x + 580, y: center.y + 20, title: 'Launch', patch: { color: '#FF9F0A' } })

  const risk = spawnNode('risk', {
    x: center.x,
    y: center.y + 380,
    title: 'Delivery Risk',
    patch: {
      color: '#FF453A',
      status: 'blocked',
      priority: 'high',
    },
  })

  connectNodes([
    [rootId, backlog],
    [rootId, build],
    [rootId, qa],
    [rootId, launch],
    [rootId, risk],
  ])

  if (backlog) {
    state.addChecklistItem(backlog, 'Anforderungen priorisieren')
    state.addChecklistItem(backlog, 'Abhängigkeiten validieren')
  }
  if (build) {
    state.addChecklistItem(build, 'Implementierung Kernflow')
    state.addChecklistItem(build, 'Performance Smoke lokal')
  }
  if (qa) {
    state.addChecklistItem(qa, 'Regressionstest')
    state.addChecklistItem(qa, 'Edge Cases prüfen')
  }
  if (launch) {
    state.addChecklistItem(launch, 'Release Notes')
    state.addChecklistItem(launch, 'Monitoring aktivieren')
  }

  if (payload.includeNotes) {
    const metrics = spawnNode('markdown', {
      x: center.x,
      y: center.y + 220,
      title: 'Delivery KPIs',
      patch: {
        content:
          '```nexus-metrics\\nLead Time | 5d | -1d\\nDeploy Success | 97% | +2%\\nP1 Bugs | 2 | -3\\n```',
      },
    })
    connectNodes([[rootId, metrics]])
  }

  return rootId
}

const finalizeTemplate = (params: CreateMagicTemplateParams, rootId: string | null) => {
  params.setSelectedNodeId(rootId)
  params.setShowMagicBuilder(false)
  params.setQuickAddPos(null)
  window.setTimeout(() => params.fitView(), 80)
}

const toTemplateContext = (params: CreateMagicTemplateParams): CanvasTemplateContext => ({
  viewport: params.viewport,
  canvasSize: params.canvasSize,
  fitView: params.fitView,
  setSelectedNodeId: params.setSelectedNodeId,
  setShowMagicBuilder: params.setShowMagicBuilder,
  setQuickAddPos: params.setQuickAddPos,
})

export function createMagicTemplateFromPayload(params: CreateMagicTemplateParams) {
  if (params.payload.template === 'meeting-hub') {
    const rootId = createMeetingHubTemplate(params)
    finalizeTemplate(params, rootId)
    return
  }

  if (params.payload.template === 'delivery-map') {
    const rootId = createDeliveryMapTemplate(params)
    finalizeTemplate(params, rootId)
    return
  }

  createStandardMagicTemplate(params.payload, toTemplateContext(params))
}
