export type CodeExecutionFile = {
  lang: string
  content: string
  name?: string
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

const NATIVE_EXEC_LANGS = new Set(['javascript', 'typescript', 'python', 'bash'])

const previewExpression = (value: string, maxLength = 160) => String(value || '')
  .trim()
  .replace(/^["'`]|["'`]$/g, '')
  .replace(/\\n/g, '\n')
  .slice(0, maxLength)

const countMatches = (code: string, pattern: RegExp) => (code.match(pattern) || []).length

const firstMatches = (code: string, pattern: RegExp, max = 8) => [...code.matchAll(pattern)].slice(0, max)

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
    'Code was not executed in this renderer fallback.',
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

async function tryNativeExecution(file: CodeExecutionFile): Promise<string | null> {
  if (!NATIVE_EXEC_LANGS.has(file.lang)) return null
  const api = (globalThis as any)?.window?.api?.code?.execute as
    | ((payload: { lang: string; code: string; fileName?: string }) => Promise<NativeExecutionResult>)
    | undefined
  if (!api) return null

  try {
    const result = (await api({
      lang: file.lang,
      code: file.content,
      fileName: file.name,
    })) as NativeExecutionResult

    if (!result || result.unsupported) return null

    const runtime = result.runtime ? ` (${result.runtime})` : ''
    const header = `Native runtime${runtime}`
    const body = (result.output || '').trimEnd()

    if (result.ok) {
      if (body) return `${header}\n\n${body}`
      return `${header}\n\nProcess exited successfully`
    }

    const failReason =
      result.error ||
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

export async function executeCode(file: CodeExecutionFile): Promise<string> {
  const native = await tryNativeExecution(file)
  if (native) return native

  switch (file.lang) {
    case 'javascript':
    case 'typescript':
      return runJavaScriptPreview(file.lang, file.content)
    case 'json':
      return runJSON(file.content)
    case 'html':
      return `HTML preview available in the Preview tab.\n\nParsed: ${(file.content.match(/<[a-z][^>]*>/gi) || []).length} HTML tags`
    case 'css':
      return `CSS preview available in the Preview tab.\n\nRules: ${(file.content.match(/\{[^}]*\}/g) || []).length}`
    case 'markdown':
      return `Markdown preview available in the Preview tab.\n\nHeadings: ${(file.content.match(/^#{1,6}\s/gm) || []).length}`
    default:
      return simulateLang(file.lang, file.content)
  }
}
