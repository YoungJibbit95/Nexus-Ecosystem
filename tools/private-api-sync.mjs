import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  DEFAULT_PRIVATE_API_BRANCH,
  DEFAULT_PRIVATE_API_REPO,
  resolveApiSource,
  resolvePrivateApiRoot,
  syncPrivateApiRepo,
} from './lib/api-source.mjs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT = path.resolve(__dirname, '..')

const args = process.argv.slice(2)
const opts = new Set(args)

const readOpt = (name, fallback = '') => {
  const idx = args.indexOf(name)
  if (idx < 0) return fallback
  const value = args[idx + 1]
  if (!value || value.startsWith('--')) return fallback
  return value
}

const quiet = opts.has('--quiet')
const noPull = opts.has('--no-pull')
const printSource = opts.has('--print-source')

const repoUrl = readOpt('--repo', process.env.NEXUS_PRIVATE_API_REPO || DEFAULT_PRIVATE_API_REPO)
const branch = readOpt('--branch', process.env.NEXUS_PRIVATE_API_BRANCH || DEFAULT_PRIVATE_API_BRANCH)
const targetDirRaw = readOpt('--dir', process.env.NEXUS_PRIVATE_API_DIR || '')
const targetDir = targetDirRaw
  ? (path.isAbsolute(targetDirRaw) ? targetDirRaw : path.resolve(ROOT, targetDirRaw))
  : resolvePrivateApiRoot(ROOT)

const main = async () => {
  try {
    const syncRes = await syncPrivateApiRepo({
      root: ROOT,
      repoUrl,
      branch,
      targetDir,
      pull: !noPull,
      quiet,
    })

    const source = await resolveApiSource({ root: ROOT, quiet })

    if (printSource) {
      console.log(JSON.stringify({
        mode: source.mode,
        controlPlaneDir: source.controlPlaneDir,
        apiDir: source.apiDir,
        schemasDir: source.schemasDir,
        privateRoot: source.privateRoot,
      }, null, 2))
      return
    }

    console.log('Private API Sync abgeschlossen.')
    console.log(`- repo: ${syncRes.repoUrl}`)
    console.log(`- branch: ${syncRes.branch}`)
    console.log(`- target: ${syncRes.targetDir}`)
    console.log(`- cloned: ${syncRes.cloned ? 'yes' : 'no'}`)
    console.log(`- pulled: ${syncRes.pulled ? 'yes' : 'no'}`)
    console.log(`- active source: ${source.mode}`)
    console.log(`- control plane: ${source.controlPlaneDir}`)
  } catch (error) {
    const message = String(error?.message || error)
    console.error(`\nprivate-api-sync fehlgeschlagen: ${message}`)
    process.exit(1)
  }
}

main()
