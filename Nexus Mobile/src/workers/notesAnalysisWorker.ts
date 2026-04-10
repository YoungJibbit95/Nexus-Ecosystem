type NotesAnalysisRequest = {
  id: number
  content: string
  maxLineNumbers: number
}

type NotesAnalysisResponse = {
  id: number
  result: {
    words: number
    chars: number
    lines: number
    lineNumbersText: string
    links: number
    tasks: number
    readMins: number
  }
}

const countLines = (content: string) => {
  if (!content) return 1
  let lines = 1
  for (let i = 0; i < content.length; i += 1) {
    if (content.charCodeAt(i) === 10) lines += 1
  }
  return lines
}

const buildLineNumbersText = (lineCount: number, maxLineNumbers: number) => {
  const cappedLineCount = Math.min(Math.max(1, lineCount), Math.max(1, maxLineNumbers))
  let output = ''
  for (let i = 1; i <= cappedLineCount; i += 1) {
    output += `${i}\n`
  }
  if (lineCount > cappedLineCount) {
    output += '...\n'
  }
  return output.trimEnd()
}

const analyzeNotesContent = (content: string, maxLineNumbers: number) => {
  const normalized = String(content || '')
  const plain = normalized.replace(/[#*`\[\]()]/g, ' ')
  const words = plain.trim() ? plain.trim().split(/\s+/).filter(Boolean).length : 0
  const chars = normalized.length
  const lines = countLines(normalized)
  const links = (normalized.match(/\[\[.*?\]\]|\[[^\]]+\]\([^)]+\)/g) || []).length
  const tasks = (normalized.match(/^- \[[ x]\]/gm) || []).length
  const readMins = Math.max(1, Math.round(words / 220))

  return {
    words,
    chars,
    lines,
    lineNumbersText: buildLineNumbersText(lines, maxLineNumbers),
    links,
    tasks,
    readMins,
  }
}

self.onmessage = (event: MessageEvent<NotesAnalysisRequest>) => {
  const payload = event.data
  const id = Number(payload?.id || 0)
  const content = String(payload?.content || '')
  const maxLineNumbers = Number(payload?.maxLineNumbers || 4000)
  const response: NotesAnalysisResponse = {
    id,
    result: analyzeNotesContent(content, maxLineNumbers),
  }
  self.postMessage(response)
}
