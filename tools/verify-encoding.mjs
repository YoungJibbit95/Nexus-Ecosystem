import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const TARGETS = [
  'Nexus Main/src',
  'Nexus Mobile/src',
  'Nexus Code/src',
  'Nexus Code Mobile/src',
  'Nexus Wiki/src',
  'packages/nexus-core/src',
  'docs',
]

const TEXT_EXTENSIONS = new Set([
  '.css',
  '.cjs',
  '.html',
  '.js',
  '.json',
  '.jsx',
  '.md',
  '.mjs',
  '.ts',
  '.tsx',
  '.txt',
  '.yaml',
  '.yml',
])

const SKIP_DIRS = new Set([
  '.git',
  '.vite',
  'android',
  'build',
  'dist',
  'ios',
  'node_modules',
  'out',
  'release',
  'target',
])

const MOJIBAKE_SIGNATURES = [
  'Ã',
  'Â',
  'â€™',
  'â€œ',
  'â€',
  'â€“',
  'â€”',
  'â€¦',
  '�',
]

const walk = async (root) => {
  const entries = await readdir(root, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue
      files.push(...(await walk(path.join(root, entry.name))))
      continue
    }
    if (!entry.isFile()) continue
    if (!TEXT_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) continue
    files.push(path.join(root, entry.name))
  }
  return files
}

const findLine = (content, index) => {
  const before = content.slice(0, index)
  const line = before.split(/\r?\n/u).length
  const lineStart = Math.max(content.lastIndexOf('\n', index - 1) + 1, 0)
  const lineEnd = content.indexOf('\n', index)
  const snippet = content.slice(lineStart, lineEnd === -1 ? undefined : lineEnd).trim()
  return { line, snippet }
}

const failures = []
for (const target of TARGETS) {
  const root = path.join(ROOT, target)
  let files = []
  try {
    files = await walk(root)
  } catch {
    continue
  }

  for (const file of files) {
    const content = await readFile(file, 'utf8')
    for (const signature of MOJIBAKE_SIGNATURES) {
      const index = content.indexOf(signature)
      if (index === -1) continue
      const hit = findLine(content, index)
      failures.push({
        file: path.relative(ROOT, file),
        signature,
        ...hit,
      })
    }
  }
}

if (failures.length > 0) {
  console.error('verify-encoding: Mojibake signatures found')
  for (const failure of failures.slice(0, 40)) {
    console.error(
      `- ${failure.file}:${failure.line} (${failure.signature}) ${failure.snippet}`,
    )
  }
  if (failures.length > 40) {
    console.error(`...and ${failures.length - 40} more`)
  }
  process.exit(1)
}

console.log('verify-encoding: OK')
