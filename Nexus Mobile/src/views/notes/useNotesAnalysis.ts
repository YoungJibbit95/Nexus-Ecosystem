import { useEffect, useMemo, useRef, useState } from 'react'

type NotesAnalysisResult = {
  words: number
  chars: number
  lines: number
  lineNumbersText: string
  links: number
  tasks: number
  readMins: number
}

const fallbackAnalyzeNotes = (content: string, maxLineNumbers: number): NotesAnalysisResult => {
  const normalized = String(content || '')
  const plain = normalized.replace(/[#*`\[\]()]/g, ' ')
  const words = plain.trim() ? plain.trim().split(/\s+/).filter(Boolean).length : 0
  const chars = normalized.length
  const lines = (normalized.match(/\n/g)?.length ?? 0) + 1
  const links = (normalized.match(/\[\[.*?\]\]|\[[^\]]+\]\([^)]+\)/g) || []).length
  const tasks = (normalized.match(/^- \[[ x]\]/gm) || []).length
  const readMins = Math.max(1, Math.round(words / 220))
  const cappedLineCount = Math.min(Math.max(1, lines), Math.max(1, maxLineNumbers))
  let lineNumbersText = ''
  for (let i = 1; i <= cappedLineCount; i += 1) {
    lineNumbersText += `${i}\n`
  }
  if (lines > cappedLineCount) {
    lineNumbersText += '...\n'
  }
  return {
    words,
    chars,
    lines,
    lineNumbersText: lineNumbersText.trimEnd(),
    links,
    tasks,
    readMins,
  }
}

export const useNotesAnalysis = (
  content: string,
  maxLineNumbers: number,
  debounceMs?: number,
): NotesAnalysisResult => {
  const normalizedContent = useMemo(() => String(content || ''), [content])
  const [result, setResult] = useState<NotesAnalysisResult>(() =>
    fallbackAnalyzeNotes(normalizedContent, maxLineNumbers),
  )
  const workerRef = useRef<Worker | null>(null)
  const requestIdRef = useRef(0)

  useEffect(() => {
    if (typeof Worker === 'undefined') return
    const worker = new Worker(
      new URL('../../workers/notesAnalysisWorker.ts', import.meta.url),
      { type: 'module' },
    )
    workerRef.current = worker
    worker.onmessage = (event) => {
      const payload = event.data as {
        id?: number
        result?: NotesAnalysisResult
      }
      if (Number(payload?.id || 0) !== requestIdRef.current) return
      if (!payload?.result) return
      setResult(payload.result)
    }
    return () => {
      worker.terminate()
      workerRef.current = null
    }
  }, [])

  useEffect(() => {
    const worker = workerRef.current
    const effectiveDebounce =
      typeof debounceMs === 'number'
        ? Math.max(0, debounceMs)
        : normalizedContent.length > 3_000
          ? 200
          : 90

    if (!worker) {
      const timeoutId = window.setTimeout(() => {
        setResult(fallbackAnalyzeNotes(normalizedContent, maxLineNumbers))
      }, effectiveDebounce)
      return () => {
        window.clearTimeout(timeoutId)
      }
    }
    const timeoutId = window.setTimeout(() => {
      const requestId = requestIdRef.current + 1
      requestIdRef.current = requestId
      worker.postMessage({
        id: requestId,
        content: normalizedContent,
        maxLineNumbers,
      })
    }, effectiveDebounce)
    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [debounceMs, maxLineNumbers, normalizedContent])

  return result
}
