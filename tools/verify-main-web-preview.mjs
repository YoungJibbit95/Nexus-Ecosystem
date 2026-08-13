import assert from 'node:assert/strict'
import { brotliCompressSync, gzipSync } from 'node:zlib'
import { existsSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const MAIN_ROOT = path.join(ROOT, 'Nexus Main')
const DIST_ROOT = path.join(MAIN_ROOT, 'dist')
const MANIFEST_PATH = path.join(DIST_ROOT, 'main-manifest.json')
const liveBaseArg = process.argv
  .slice(2)
  .find((arg) => arg.startsWith('--live-base='))
  ?.slice('--live-base='.length)
const liveBase = liveBaseArg || process.env.NEXUS_MAIN_PREVIEW_LIVE_BASE || ''

const VIEW_SOURCES = [
  'CalendarView',
  'NotesView',
  'CodeView',
  'TasksView',
  'RemindersView',
  'CanvasView',
  'FilesView',
  'FluxView',
  'SettingsView',
  'InfoView',
  'DevToolsView',
]

assert(existsSync(MANIFEST_PATH), `Main web preview manifest missing: ${MANIFEST_PATH}`)
const manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'))
const records = Object.entries(manifest)
assert(records.length > 0, 'Main web preview manifest is empty')

const entryRecords = records.filter(([, record]) => record?.isEntry === true)
assert.equal(entryRecords.length, 1, 'Main web preview must have exactly one HTML entry')
const [entryKey, entryRecord] = entryRecords[0]
assert.equal(normalize(entryKey), 'index.html', 'Main web preview entry must be index.html')

for (const [key, record] of records) {
  assertRecordFilesExist(key, record)
}

const viewRecords = new Map()
for (const viewName of VIEW_SOURCES) {
  const suffix = `src/views/${viewName}.tsx`
  const match = records.find(([key]) => normalize(key).endsWith(suffix))
  assert(match, `Main web preview manifest is missing ${viewName}`)
  assert.equal(match[1].isDynamicEntry, true, `${viewName} must remain a lazy view entry`)
  viewRecords.set(viewName, match)
}

const initialKeys = collectGraphKeys(entryKey, false)
const initialFiles = collectJavaScriptFiles(initialKeys)
const forbiddenInitial = initialFiles.filter((file) =>
  /(?:CodeView|monaco|typescript|ts\.worker)/i.test(file),
)
assert.deepEqual(
  forbiddenInitial,
  [],
  `Code/Monaco/TypeScript must not be in initial JS: ${forbiddenInitial.join(', ')}`,
)

const [codeKey] = viewRecords.get('CodeView')
assert(
  isReachableDynamicImport(entryKey, codeKey),
  'CodeView must be reachable from the HTML entry through a lazy import',
)

const codeIntentKeys = collectGraphKeys(codeKey, true)
const codeIntentFiles = collectJavaScriptFiles(codeIntentKeys)
assert(
  codeIntentFiles.some((file) => /CodeView/i.test(file)),
  'Code-intent graph must contain the CodeView chunk',
)
assert(
  codeIntentFiles.some((file) => /monaco/i.test(file)),
  'Code-intent graph must contain Monaco chunks',
)
assert(
  codeIntentFiles.some((file) => /typescript/i.test(file)),
  'Code-intent graph must contain the on-demand TypeScript chunk',
)

const initial = measureFiles(initialFiles)
const codeIntent = measureFiles(codeIntentFiles)
console.log(
  `[main-web-preview] PASS entry=${entryRecord.file} views=${viewRecords.size} assets=${records.length}`,
)
console.log(
  `[main-web-preview] initial-js files=${initialFiles.length} raw=${initial.raw} gzip=${initial.gzip} brotli=${initial.brotli}`,
)
console.log(
  `[main-web-preview] code-intent-js files=${codeIntentFiles.length} raw=${codeIntent.raw} gzip=${codeIntent.gzip} brotli=${codeIntent.brotli}`,
)

if (liveBase) await verifyLivePreview(liveBase)

function normalize(value) {
  return String(value || '').replaceAll('\\', '/')
}

function resolveDistFile(relativeFile) {
  const normalized = normalize(relativeFile)
  assert(normalized && !normalized.startsWith('/') && !normalized.includes('../'), `Unsafe manifest path: ${relativeFile}`)
  const resolved = path.resolve(DIST_ROOT, normalized)
  assert(
    resolved === DIST_ROOT || resolved.startsWith(`${DIST_ROOT}${path.sep}`),
    `Manifest path escapes dist: ${relativeFile}`,
  )
  return resolved
}

function assertRecordFilesExist(key, record) {
  assert(record && typeof record === 'object', `Invalid manifest record: ${key}`)
  const files = [record.file, ...(record.css || []), ...(record.assets || [])].filter(Boolean)
  assert(files.length > 0, `Manifest record has no output: ${key}`)
  for (const file of files) {
    const resolved = resolveDistFile(file)
    assert(existsSync(resolved) && statSync(resolved).isFile(), `Manifest output missing for ${key}: ${file}`)
  }
  for (const dependency of [...(record.imports || []), ...(record.dynamicImports || [])]) {
    assert(manifest[dependency], `Manifest dependency missing for ${key}: ${dependency}`)
  }
}

function collectGraphKeys(startKey, includeDynamic) {
  const seen = new Set()
  const visit = (key) => {
    if (seen.has(key)) return
    const record = manifest[key]
    assert(record, `Unknown manifest graph key: ${key}`)
    seen.add(key)
    for (const dependency of record.imports || []) visit(dependency)
    if (includeDynamic) {
      for (const dependency of record.dynamicImports || []) visit(dependency)
    }
  }
  visit(startKey)
  return seen
}

function collectJavaScriptFiles(keys) {
  return [...new Set(
    [...keys]
      .map((key) => manifest[key]?.file)
      .filter((file) => typeof file === 'string' && file.endsWith('.js')),
  )].sort()
}

function isReachableDynamicImport(startKey, targetKey) {
  const seen = new Set()
  const visit = (key, usedDynamic) => {
    if (key === targetKey) return usedDynamic
    const marker = `${key}:${usedDynamic}`
    if (seen.has(marker)) return false
    seen.add(marker)
    const record = manifest[key]
    if (!record) return false
    for (const dependency of record.imports || []) {
      if (visit(dependency, usedDynamic)) return true
    }
    for (const dependency of record.dynamicImports || []) {
      if (visit(dependency, true)) return true
    }
    return false
  }
  return visit(startKey, false)
}

function measureFiles(files) {
  const buffers = files.map((file) => readFileSync(resolveDistFile(file)))
  return buffers.reduce(
    (totals, buffer) => ({
      raw: totals.raw + buffer.length,
      gzip: totals.gzip + gzipSync(buffer, { level: 9 }).length,
      brotli: totals.brotli + brotliCompressSync(buffer).length,
    }),
    { raw: 0, gzip: 0, brotli: 0 },
  )
}

async function verifyLivePreview(rawBase) {
  const base = new URL(rawBase)
  const isLoopback = ['127.0.0.1', 'localhost', '::1'].includes(base.hostname)
  assert(base.protocol === 'https:' || isLoopback, 'Live Main preview must use HTTPS unless it is loopback')
  if (!base.pathname.endsWith('/')) base.pathname += '/'

  const liveManifestUrl = new URL('main-manifest.json', base)
  const manifestResponse = await fetch(liveManifestUrl, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(15_000),
  })
  assert.equal(
    manifestResponse.status,
    200,
    `Live Main preview manifest returned HTTP ${manifestResponse.status}: ${liveManifestUrl}`,
  )
  const contentType = manifestResponse.headers.get('content-type') || ''
  assert.match(contentType, /json/i, `Live Main preview manifest has invalid Content-Type: ${contentType || 'missing'}`)
  const liveManifest = await manifestResponse.json()
  assert.deepEqual(liveManifest, manifest, 'Live Main preview manifest differs from the verified local build')

  const indexResponse = await fetch(base, { signal: AbortSignal.timeout(15_000) })
  assert.equal(indexResponse.status, 200, `Live Main preview index returned HTTP ${indexResponse.status}`)
  const liveIndex = await indexResponse.text()
  assert(
    liveIndex.includes(entryRecord.file),
    `Live Main preview index does not reference verified entry ${entryRecord.file}`,
  )

  const outputs = [...new Set(
    records.flatMap(([, record]) => [record.file, ...(record.css || []), ...(record.assets || [])]),
  )].sort()
  const failures = []
  let cursor = 0
  const workers = Array.from({ length: Math.min(8, outputs.length) }, async () => {
    while (cursor < outputs.length) {
      const output = outputs[cursor++]
      const url = new URL(normalize(output), base)
      try {
        const response = await fetch(url, {
          method: 'HEAD',
          cache: 'no-store',
          signal: AbortSignal.timeout(15_000),
        })
        if (!response.ok) {
          failures.push(`${output}: HTTP ${response.status}`)
          continue
        }
        const liveLength = Number(response.headers.get('content-length'))
        const localLength = statSync(resolveDistFile(output)).size
        if (Number.isFinite(liveLength) && liveLength > 0 && liveLength !== localLength) {
          failures.push(`${output}: size ${liveLength}, expected ${localLength}`)
        }
      } catch (error) {
        failures.push(`${output}: ${error?.message || error}`)
      }
    }
  })
  await Promise.all(workers)
  assert.deepEqual(failures, [], `Live Main preview assets failed:\n${failures.join('\n')}`)
  console.log(`[main-web-preview] LIVE PASS base=${base} outputs=${outputs.length}`)
}
