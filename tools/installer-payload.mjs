import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'
import { prepareInstallerPayload, validateInstallerPayload, createInstallerRecipe, collectInstallerDistribution, validateInstallerDistribution } from './lib/installer-payload.mjs'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const { values, positionals } = parseArgs({ allowPositionals: true, options: {
  app: { type: 'string' }, output: { type: 'string' }, payload: { type: 'string' },
  project: { type: 'string' }, target: { type: 'string' }, arch: { type: 'string' },
  directory: { type: 'string' },
  signed: { type: 'boolean', default: false }, dir: { type: 'boolean', default: false },
} })
const [command] = positionals
if (positionals.length !== 1 || !['prepare', 'validate', 'package', 'collect', 'validate-distribution'].includes(command)) throw new Error('Unrecognized installer command')
const options = { repoRoot, ...values, directoryOnly: values.dir }
if (command === 'prepare') prepareInstallerPayload(options)
else if (command === 'validate') validateInstallerPayload(options)
else if (command === 'collect') collectInstallerDistribution(options)
else if (command === 'validate-distribution') validateInstallerDistribution(options)
else {
  // Package only from a fresh project with fixed metadata/configuration. In
  // particular, never run electron-builder from the artifact or source cwd:
  // its CLI would otherwise discover electron-builder.env and build hooks.
  const recipe = createInstallerRecipe(options)
  const env = {}
  const allowed = new Set(['path', 'systemroot', 'windir', 'comspec', 'pathext', 'temp', 'tmp', 'tmpdir', 'home', 'userprofile', 'localappdata', 'appdata', 'lang', 'lc_all'])
  for (const name of Object.keys(process.env)) if (allowed.has(name.toLowerCase())) env[name] = process.env[name]
  Object.assign(env, { CI: 'true', NO_UPDATE_NOTIFIER: 'true', CSC_IDENTITY_AUTO_DISCOVERY: 'false' })
  if (values.signed && values.target !== 'linux') {
    const required = ['CSC_LINK', 'CSC_KEY_PASSWORD', ...(values.target === 'mac' ? ['APPLE_ID', 'APPLE_APP_SPECIFIC_PASSWORD', 'APPLE_TEAM_ID'] : [])]
    for (const name of required) {
      if (!process.env[name]?.trim()) throw new Error(`Required signing configuration missing: ${name}`)
      env[name] = process.env[name]
    }
    delete env.CSC_IDENTITY_AUTO_DISCOVERY
  }
  const builder = path.join(repoRoot, 'tools/release-packager/node_modules/electron-builder/out/cli/cli.js')
  const result = spawnSync(process.execPath, [builder, ...recipe.args], {
    cwd: recipe.projectRoot, env, stdio: 'inherit', shell: false, windowsHide: true,
  })
  if (result.error) throw result.error
  process.exitCode = result.status ?? 1
}
