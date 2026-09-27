type Fields = Record<string, unknown>
const record = (value: unknown): value is Fields => Boolean(value) && typeof value === 'object' && !Array.isArray(value)
const fields = [['status', 'status'], ['priority', 'priority'], ['owner', 'owner'], ['dueDate', 'dueDate'], ['effort', 'estimate'], ['progress', 'progress'], ['tags', 'tags']] as const

/** Mobile's richer pm values remain canonical when present; Main projects a display subset. */
export function projectPlanningForMain(node: Fields): Fields {
  if (!record(node.pm)) return node
  const projected: Fields = { ...node }
  for (const [flat, nested] of fields) if (Object.prototype.hasOwnProperty.call(node.pm, nested)) projected[flat] = node.pm[nested]
  if (Object.prototype.hasOwnProperty.call(node.pm, 'status')) {
    const status = String(node.pm.status)
    projected.status = ['todo', 'doing', 'blocked', 'done'].includes(status) ? status : status === 'review' ? 'doing' : 'todo'
  }
  return projected
}

/** Unknown node/pm metadata and Main-only fields remain present in the returned object. */
export function projectPlanningForMobile(node: Fields): Fields {
  const pm: Fields = {}
  for (const [flat, nested] of fields) if (Object.prototype.hasOwnProperty.call(node, flat)) pm[nested] = node[flat]
  Object.assign(pm, record(node.pm) ? node.pm : {})
  return Object.keys(pm).length ? { ...node, pm } : node
}

/** Explicit Main edits update their corresponding pm field; unrelated edits retain richer statuses. */
export function applyMainPlanningPatch(node: object, patch: object): Fields {
  const current = node as Fields
  const changes = patch as Fields
  const next = { ...current, ...changes }
  if (!record(current.pm)) return next
  const pm = { ...current.pm, ...(record(changes.pm) ? changes.pm : {}) }
  for (const [flat, nested] of fields) if (Object.prototype.hasOwnProperty.call(changes, flat)) pm[nested] = changes[flat]
  return { ...next, pm }
}

export function projectCanvasPlanning<T>(canvases: T[], client: 'main' | 'mobile'): T[] {
  const project = client === 'main' ? projectPlanningForMain : projectPlanningForMobile
  return canvases.map(canvas => record(canvas) && Array.isArray(canvas.nodes)
    ? { ...canvas, nodes: canvas.nodes.map(node => record(node) ? project(node) : node) }
    : canvas) as T[]
}
