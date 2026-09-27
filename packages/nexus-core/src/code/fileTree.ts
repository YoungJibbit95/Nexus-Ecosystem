export type FileTreeNode = { id: string; parentId?: string | null; fsPath?: string | null; name?: string; type?: string; language?: string | null }

export function getFileDescendantIds(targetId: string, files: FileTreeNode[] = []): string[] {
  if (!targetId) return []
  const seen = new Set([targetId])
  const queue = [targetId]
  const children = new Map<string, string[]>()
  for (const file of files) {
    if (!file?.parentId) continue
    const group = children.get(file.parentId) ?? []
    group.push(file.id); children.set(file.parentId, group)
  }
  for (let index = 0; index < queue.length; index++) {
    for (const id of children.get(queue[index]) ?? []) if (!seen.has(id)) { seen.add(id); queue.push(id) }
  }
  return queue
}

export function renameFileNodes<T extends FileTreeNode>(files: T[], id: string, name: string, newPath?: string | null): T[] {
  const source = files.find(file => file.id === id)
  if (!source) return files
  const descendants = new Set(getFileDescendantIds(id, files))
  return files.map(file => {
    if (file.id === id) return { ...file, name, fsPath: newPath || file.fsPath, language: file.type === 'folder' ? file.language : name.split('.').pop()?.toLowerCase() || file.language, modifiedAt: new Date().toISOString() }
    if (!newPath || !source.fsPath || !file.fsPath || !descendants.has(file.id)) return file
    const suffix = file.fsPath.slice(source.fsPath.length)
    if (!file.fsPath.startsWith(source.fsPath) || !/^[\\/]/.test(suffix)) return file
    return { ...file, fsPath: newPath + suffix }
  })
}
