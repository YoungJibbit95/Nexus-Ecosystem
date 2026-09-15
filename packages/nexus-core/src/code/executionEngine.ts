export type CodeExecutionFile = {
  lang: string
  content: string
  name?: string
}

export type CodeExecutionOptions = {
  signal?: AbortSignal
  timeoutMs?: number
}

type NativeExecutionResult = {
  ok: boolean
  output: string
  error?: string
  exitCode?: number
  runtime?: string
  timeout?: boolean
  unsupported?: boolean
}

const NATIVE_EXEC_LANGS = new Set(['javascript', 'typescript', 'python', 'bash', 'c', 'cpp', 'java', 'rust', 'go'])

export const CODE_EXECUTION_MAX_INPUT_CHARS = 200_000
export const CODE_EXECUTION_MAX_FILE_NAME_CHARS = 240
export const CODE_EXECUTION_MAX_LANG_CHARS = 40
export const CODE_EXECUTION_MAX_OUTPUT_CHARS = 64_000
export const CODE_EXECUTION_MAX_ANALYSIS_MATCHES = 10_000
export const CODE_EXECUTION_MAX_ANALYSIS_CHARS = 8_192
export const CODE_EXECUTION_DEFAULT_TIMEOUT_MS = 15_000

const CODE_EXECUTION_MIN_TIMEOUT_MS = 50
const CODE_EXECUTION_MAX_TIMEOUT_MS = 30_000

const boundExecutionOutput = (value: string) => {
  if (value.length <= CODE_EXECUTION_MAX_OUTPUT_CHARS) return value
  const marker = `\n\n[Output truncated at ${CODE_EXECUTION_MAX_OUTPUT_CHARS} characters.]`
  return `${value.slice(0, CODE_EXECUTION_MAX_OUTPUT_CHARS - marker.length)}${marker}`
}

const validateExecutionFile = (file: CodeExecutionFile) => {
  if (!file || typeof file !== 'object') return 'Execution blocked: file payload is invalid.'
  if (typeof file.lang !== 'string' || !file.lang.trim()) return 'Execution blocked: language is missing.'
  if (file.lang.length > CODE_EXECUTION_MAX_LANG_CHARS) {
    return `Execution blocked: language exceeds ${CODE_EXECUTION_MAX_LANG_CHARS} characters.`
  }
  if (typeof file.content !== 'string') return 'Execution blocked: file content must be text.'
  if (file.content.length > CODE_EXECUTION_MAX_INPUT_CHARS) {
    return `Execution blocked: input exceeds ${CODE_EXECUTION_MAX_INPUT_CHARS} characters.`
  }
  if (file.name != null && (
    typeof file.name !== 'string'
    || file.name.length > CODE_EXECUTION_MAX_FILE_NAME_CHARS
  )) {
    return `Execution blocked: file name exceeds ${CODE_EXECUTION_MAX_FILE_NAME_CHARS} characters.`
  }
  return null
}

const previewExpression = (value: string, maxLength = 160) => String(value || '')
  .trim()
  .replace(/^["'`]|["'`]$/g, '')
  .replace(/\\n/g, '\n')
  .slice(0, maxLength)

const countMatches = (
  code: string,
  pattern: RegExp,
  max = CODE_EXECUTION_MAX_ANALYSIS_MATCHES,
) => {
  const analysisCode = code.slice(0, CODE_EXECUTION_MAX_ANALYSIS_CHARS)
  pattern.lastIndex = 0
  let count = 0
  let match: RegExpExecArray | null
  while ((match = pattern.exec(analysisCode)) !== null) {
    count += 1
    if (count >= max) break
    if (match[0] === '') pattern.lastIndex += 1
  }
  pattern.lastIndex = 0
  return count
}

const firstMatches = (code: string, pattern: RegExp, max = 8) => {
  const analysisCode = code.slice(0, CODE_EXECUTION_MAX_ANALYSIS_CHARS)
  pattern.lastIndex = 0
  const matches: RegExpExecArray[] = []
  let match: RegExpExecArray | null
  while (matches.length < max && (match = pattern.exec(analysisCode)) !== null) {
    matches.push(match)
    if (match[0] === '') pattern.lastIndex += 1
  }
  pattern.lastIndex = 0
  return matches
}

const analysisWindowNotice = (code: string) => code.length > CODE_EXECUTION_MAX_ANALYSIS_CHARS
  ? `\n\nStatic analysis limited to the first ${CODE_EXECUTION_MAX_ANALYSIS_CHARS} of ${code.length} characters.`
  : ''

function runJavaScriptPreview(lang: string, code: string): string {
  const lines = code.split('\n')
  const consoleCalls = firstMatches(
    code,
    /console\.(log|warn|error|info|table|dir|assert)\s*\((.*?)\)/gs,
  ).map((match) => `  - console.${match[1]}(${previewExpression(match[2] || '')})`)

  const imports = countMatches(code, /\bimport\s.+?\bfrom\b|\brequire\s*\(/g)
  const functions = countMatches(code, /\bfunction\s+\w+|\([^)]*\)\s*=>|\b\w+\s*=>/g)
  const asyncHints = countMatches(code, /\bawait\b|\bPromise\b|\bsetTimeout\b|\bsetInterval\b/g)

  return [
    `Native ${lang} runtime unavailable; safe static preview only.`,
    '',
    `Lines: ${lines.length}`,
    `Imports/requires: ${imports}`,
    `Functions/lambdas: ${functions}`,
    `Async hints: ${asyncHints}`,
    '',
    consoleCalls.length
      ? `Console calls detected:\n${consoleCalls.join('\n')}`
      : 'No console calls detected.',
    '',
    `Code was not executed in this renderer fallback.${analysisWindowNotice(code)}`,
  ].join('\n')
}

function runJSON(code: string): string {
  try {
    const parsed = JSON.parse(code)
    const kind = Array.isArray(parsed)
      ? `Array[${parsed.length}]`
      : typeof parsed === 'object' && parsed
        ? `Object{${Object.keys(parsed).length} keys}`
        : typeof parsed

    return [
      'Valid JSON',
      `Shape: ${kind}`,
      '',
      JSON.stringify(parsed, null, 2),
    ].join('\n')
  } catch (e: any) {
    const match = String(e?.message || '').match(/position (\d+)/)
    const pos = match ? Number.parseInt(match[1], 10) : -1
    const lines = [`Invalid JSON: ${e?.message || 'parse failed'}`]
    if (pos >= 0) {
      const before = code.slice(Math.max(0, pos - 20), pos)
      const after = code.slice(pos, pos + 20)
      lines.push(`   ...${before}>${after}...`)
    }
    return lines.join('\n')
  }
}

function simulateLang(lang: string, code: string): string {
  const runtimes: Record<string, string> = {
    python: 'Python interpreter',
    java: 'JDK',
    cpp: 'g++',
    c: 'gcc',
    rust: 'rustc',
    go: 'Go compiler',
    bash: 'bash',
    sql: 'database connection',
  }
  const header = `${lang} requires ${runtimes[lang] || 'a runtime'}; showing safe static preview only.\n\n`

  switch (lang) {
    case 'python': {
      const out = firstMatches(code, /^(\s*)print\s*\((.+)\)\s*$/gm)
        .map((match) => previewExpression(match[2]))
      return header + (out.length ? out.join('\n') : '(no print() calls found)')
    }
    case 'java': {
      const out = firstMatches(code, /System\.out\.print(?:ln)?\s*\(\s*(.*?)\s*\)\s*;/g)
        .map((match) => previewExpression(match[1]))
      return header + (out.length ? out.join('\n') : '(no System.out.println() calls found)')
    }
    case 'cpp':
    case 'c': {
      const couts = firstMatches(code, /cout\s*<<\s*(.*?)\s*(?:<<\s*(?:endl|"\\n")|\s*;)/g)
        .map((match) => previewExpression(match[1]))
        .filter(Boolean)
      const printfs = firstMatches(code, /printf\s*\(\s*"(.*?)"/g)
        .map((match) => previewExpression(match[1]).replace(/%[sdif]/g, '?'))
      return header + ([...couts, ...printfs].join('\n') || '(no cout/printf found)')
    }
    case 'rust': {
      const out = firstMatches(code, /println!\s*\(\s*"(.*?)"(?:,\s*(.*?))?\s*\)/g)
        .map((match) => {
          let text = previewExpression(match[1])
          if (match[2]) text = text.replace('{}', previewExpression(match[2])).replace('{:?}', previewExpression(match[2]))
          return text
        })
      return header + (out.length ? out.join('\n') : '(no println!() calls found)')
    }
    case 'go': {
      const out = firstMatches(code, /fmt\.Print(?:ln|f)?\s*\(\s*(.*?)\s*\)/g)
        .map((match) => previewExpression(match[1]).split(',')[0].trim())
      return header + (out.length ? out.join('\n') : '(no fmt.Print calls found)')
    }
    case 'bash': {
      const out = firstMatches(code, /^echo\s+["']?([^"'\n]+)["']?/gm)
        .map((match) => previewExpression(match[1]))
      return header + (out.length ? out.join('\n') : '(no echo calls found)')
    }
    case 'sql': {
      const statements = code
        .replace(/--[^\n]*/g, '')
        .split(';')
        .map((statement) => statement.trim())
        .filter(Boolean)
        .map((statement) => `  - ${statement.slice(0, 60)}${statement.length > 60 ? '...' : ''}`)
      return header + (statements.length ? `Statements detected:\n${statements.join('\n')}` : '(no SQL statements found)')
    }
    default:
      return `No runtime available for "${lang}" in this safe preview.\n\nCode length: ${code.length} chars`
  }
}

const waitForNativeResult = (
  promise: Promise<NativeExecutionResult>,
  options: CodeExecutionOptions,
): Promise<
  | { status: 'completed'; result: NativeExecutionResult }
  | { status: 'cancelled' | 'timeout' | 'failed' }
> => new Promise((resolve) => {
  let settled = false
  const requestedTimeoutMs = Number.isFinite(options.timeoutMs)
    ? Number(options.timeoutMs)
    : CODE_EXECUTION_DEFAULT_TIMEOUT_MS
  const timeoutMs = Math.max(
    CODE_EXECUTION_MIN_TIMEOUT_MS,
    Math.min(CODE_EXECUTION_MAX_TIMEOUT_MS, Math.floor(requestedTimeoutMs)),
  )
  let timeout: ReturnType<typeof setTimeout> | null = null

  const finish = (result:
    | { status: 'completed'; result: NativeExecutionResult }
    | { status: 'cancelled' | 'timeout' | 'failed' },
  ) => {
    if (settled) return
    settled = true
    if (timeout) clearTimeout(timeout)
    options.signal?.removeEventListener('abort', onAbort)
    resolve(result)
  }
  const onAbort = () => finish({ status: 'cancelled' })

  if (options.signal?.aborted) {
    finish({ status: 'cancelled' })
    return
  }
  options.signal?.addEventListener('abort', onAbort, { once: true })
  timeout = setTimeout(() => finish({ status: 'timeout' }), timeoutMs)
  void promise.then(
    (result) => finish({ status: 'completed', result }),
    () => finish({ status: 'failed' }),
  )
})

async function tryNativeExecution(
  file: CodeExecutionFile,
  options: CodeExecutionOptions,
): Promise<string | null> {
  if (!NATIVE_EXEC_LANGS.has(file.lang)) return null
  const api = (globalThis as any)?.window?.api?.code?.execute as
    | ((payload: { lang: string; code: string; fileName?: string }) => Promise<NativeExecutionResult>)
    | undefined
  if (!api) return null

  try {
    const boundary = await waitForNativeResult(api({
      lang: file.lang,
      code: file.content,
      fileName: file.name,
    }), options)

    if (boundary.status === 'cancelled') return 'Execution cancelled.'
    if (boundary.status === 'timeout') return 'Execution stopped: native runtime timed out.'
    if (boundary.status !== 'completed') return null
    const result = boundary.result

    if (!result || result.unsupported) return null

    const runtimeValue = typeof result.runtime === 'string' ? result.runtime.slice(0, 120) : ''
    const runtime = runtimeValue ? ` (${runtimeValue})` : ''
    const header = `Native runtime${runtime}`
    const body = (typeof result.output === 'string' ? result.output : '').trimEnd()

    if (result.ok) {
      if (body) return `${header}\n\n${body}`
      return `${header}\n\nProcess exited successfully`
    }

    const failReason =
      (typeof result.error === 'string' ? result.error.slice(0, 2_000) : '') ||
      (result.timeout ? 'Execution timed out' : '') ||
      (typeof result.exitCode === 'number'
        ? `Process exited with code ${result.exitCode}`
        : 'Execution failed')

    if (body) {
      return `${header}\n\n${body}\n\n${failReason}`
    }
    return `${header}\n\n${failReason}`
  } catch {
    return null
  }
}

export async function executeCode(
  file: CodeExecutionFile,
  options: CodeExecutionOptions = {},
): Promise<string> {
  const validationError = validateExecutionFile(file)
  if (validationError) return validationError
  if (options.signal?.aborted) return 'Execution cancelled.'

  const native = await tryNativeExecution(file, options)
  if (native) return boundExecutionOutput(native)

  let output: string
  switch (file.lang) {
    case 'javascript':
    case 'typescript':
      output = runJavaScriptPreview(file.lang, file.content)
      break
    case 'json':
      output = runJSON(file.content)
      break
    case 'html':
      output = `HTML preview available in the Preview tab.\n\nParsed: ${countMatches(file.content, /<[a-z][^>]*>/gi)} HTML tags${analysisWindowNotice(file.content)}`
      break
    case 'css':
      output = `CSS preview available in the Preview tab.\n\nRules: ${countMatches(file.content, /\{[^}]*\}/g)}${analysisWindowNotice(file.content)}`
      break
    case 'markdown':
      output = `Markdown preview available in the Preview tab.\n\nHeadings: ${countMatches(file.content, /^#{1,6}\s/gm)}${analysisWindowNotice(file.content)}`
      break
    default:
      output = simulateLang(file.lang, file.content)
  }
  return boundExecutionOutput(output)
}
