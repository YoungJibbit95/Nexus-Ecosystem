import { promises as fs } from 'node:fs'
import path from 'node:path'
import { spawnProcessSync } from './process-utils.mjs'

export const DEFAULT_PRIVATE_API_REPO = 'https://github.com/YoungJibbit95/NexusAPI.git'
export const DEFAULT_PRIVATE_API_BRANCH = 'main'
export const DEFAULT_PRIVATE_API_DIR = '.nexus-private/NexusAPI'

const exists = async (targetPath) => {
  try {
    await fs.access(targetPath)
    return true
  } catch {
    return false
  }
}

const parseBool = (value, fallback = false) => {
  if (value == null) return fallback
  const normalized = String(value).trim().toLowerCase()
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false
  return fallback
}

const readJsonFile = async (filePath) => {
  try {
    const raw = await fs.readFile(filePath, 'utf8')
    return JSON.parse(raw)
  } catch {
    return null
  }
}

const hasControlPlaneSchemaDependency = async (controlPlaneDir) =>
  exists(path.resolve(controlPlaneDir, 'src', '../../schemas/src/contracts.mjs'))

const toModePrefix = () => '[api-source:private]'

const detectControlPlaneDirFromBase = async (baseDir) => {
  const candidates = [
    path.join(baseDir, 'nexus-control-plane'),
    path.join(baseDir, 'API', 'nexus-control-plane'),
    baseDir,
  ]

  for (const candidate of candidates) {
    const pkgFile = path.join(candidate, 'package.json')
    const pkg = await readJsonFile(pkgFile)
    if (!pkg) continue
    const name = String(pkg.name || '').toLowerCase()
    if (name.includes('control-plane') && await hasControlPlaneSchemaDependency(candidate)) {
      return candidate
    }
  }

  return null
}

const findPackageDir = async ({ baseDir, packageNames = [] }) => {
  if (!baseDir) return null

  const candidates = [
    ...packageNames.map((name) => path.join(baseDir, name)),
    ...packageNames.map((name) => path.join(baseDir, 'API', name)),
  ]

  for (const candidate of candidates) {
    const pkg = await readJsonFile(path.join(candidate, 'package.json'))
    if (pkg) return candidate
  }

  return null
}

const runGit = (args, cwd) => {
  const printable = ['git', ...args].join(' ')
  const result = spawnProcessSync('git', args, {
    cwd,
    stdio: 'pipe',
    env: process.env,
    encoding: 'utf8',
    shell: false,
  })

  if (result.error) {
    const err = new Error(`Git command failed: ${printable} (${result.error.message})`)
    err.cause = result.error
    throw err
  }

  if (result.status !== 0) {
    const stderr = String(result.stderr || '').trim()
    const stdout = String(result.stdout || '').trim()
    const output = stderr || stdout || 'unknown git error'
    throw new Error(`Git command failed (${result.status}): ${printable}\n${output}`)
  }

  return {
    stdout: String(result.stdout || ''),
    stderr: String(result.stderr || ''),
  }
}

const isMissingBranchError = (message) => (
  message.includes('Remote branch')
  || message.includes('couldn\'t find remote ref')
  || message.includes('unknown revision')
)

export const resolvePrivateApiRoot = (root) => {
  const configured = String(process.env.NEXUS_PRIVATE_API_DIR || '').trim()
  if (!configured) return path.join(root, DEFAULT_PRIVATE_API_DIR)
  return path.isAbsolute(configured) ? configured : path.resolve(root, configured)
}

export const resolveApiSource = async ({
  root,
  requirePrivate = parseBool(process.env.NEXUS_PRIVATE_API_REQUIRED, true),
  quiet = true,
} = {}) => {
  if (!root) throw new Error('resolveApiSource benoetigt root')

  const privateRoot = resolvePrivateApiRoot(root)

  if (!(await exists(privateRoot))) {
    throw new Error(
      `Private NexusAPI Checkout nicht gefunden: ${privateRoot}. ` +
      'Fuehre zuerst `npm run api:private:sync` aus.'
    )
  }

  const controlPlaneDir = await detectControlPlaneDirFromBase(privateRoot)
  const apiDir = await findPackageDir({ baseDir: privateRoot, packageNames: ['nexus-api'] })
  const schemasDir = await findPackageDir({ baseDir: privateRoot, packageNames: ['schemas'] })

  const missing = []
  if (!controlPlaneDir) missing.push('Control Plane')
  if (!apiDir) missing.push('nexus-api')
  if (!schemasDir) missing.push('schemas')

  if (missing.length > 0) {
    throw new Error(
      `Private NexusAPI Checkout ist unvollstaendig (${missing.join(', ')} fehlt). ` +
      `Pfad: ${privateRoot}`
    )
  }

  const source = {
    mode: 'private',
    root,
    privateRoot,
    controlPlaneDir,
    apiDir,
    schemasDir,
  }

  if (!requirePrivate) {
    // keep explicit for API compatibility with existing callers
  }

  if (!quiet) {
    const prefix = toModePrefix()
    const cpDisplay = path.relative(root, source.controlPlaneDir) || '.'
    console.log(`${prefix} Control Plane: ${cpDisplay}`)
  }

  return source
}

export const syncPrivateApiRepo = async ({
  root,
  repoUrl = process.env.NEXUS_PRIVATE_API_REPO || DEFAULT_PRIVATE_API_REPO,
  branch = process.env.NEXUS_PRIVATE_API_BRANCH || DEFAULT_PRIVATE_API_BRANCH,
  targetDir = resolvePrivateApiRoot(root),
  pull = true,
  quiet = false,
} = {}) => {
  if (!root) throw new Error('syncPrivateApiRepo benoetigt root')
  const normalizedRepo = String(repoUrl || '').trim()
  if (!normalizedRepo) throw new Error('NEXUS_PRIVATE_API_REPO ist leer')

  const targetParent = path.dirname(targetDir)
  await fs.mkdir(targetParent, { recursive: true })

  const gitDir = path.join(targetDir, '.git')
  const hasGitCheckout = await exists(gitDir)

  if (!hasGitCheckout) {
    if (!quiet) {
      console.log(`[api-source] Klone private API Repo nach ${targetDir}`)
    }
    try {
      runGit(['clone', '--branch', branch, '--single-branch', normalizedRepo, targetDir], root)
      return { cloned: true, pulled: false, targetDir, branch, repoUrl: normalizedRepo }
    } catch (error) {
      const message = String(error?.message || '')
      if (!isMissingBranchError(message)) {
        throw error
      }

      if (!quiet) {
        console.warn(`[api-source] Branch ${branch} nicht gefunden, nutze Default-Branch vom Remote.`)
      }
      runGit(['clone', normalizedRepo, targetDir], root)
      return { cloned: true, pulled: false, targetDir, branch: 'remote-default', repoUrl: normalizedRepo }
    }
  }

  if (pull) {
    if (!quiet) {
      console.log(`[api-source] Aktualisiere private API Repo in ${targetDir}`)
    }
    try {
      runGit(['-C', targetDir, 'fetch', 'origin', branch], root)
      runGit(['-C', targetDir, 'checkout', branch], root)
      runGit(['-C', targetDir, 'pull', '--ff-only', 'origin', branch], root)
      return { cloned: false, pulled: true, targetDir, branch, repoUrl: normalizedRepo }
    } catch (error) {
      const message = String(error?.message || '')
      if (!isMissingBranchError(message)) {
        throw error
      }

      if (!quiet) {
        console.warn(`[api-source] Branch ${branch} nicht gefunden, aktualisiere ohne Branch-Bindung.`)
      }
      runGit(['-C', targetDir, 'fetch', 'origin'], root)
      return { cloned: false, pulled: false, targetDir, branch: 'branch-missing', repoUrl: normalizedRepo }
    }
  }

  return { cloned: false, pulled: false, targetDir, branch, repoUrl: normalizedRepo }
}

export const resolveControlPlanePrefixArg = async ({ root, quiet = true } = {}) => {
  const source = await resolveApiSource({ root, quiet })
  return {
    source,
    prefixArgs: ['--prefix', source.controlPlaneDir],
  }
}
