import { builtinModules } from 'node:module'
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

const APPS = {
  'Nexus Main': { slug: 'nexus-main', main: 'electron-main.cjs', name: 'nexus', product: 'Nexus v6', appId: 'com.youngjibbit95.nexus', icon: 'icons/NexusLogo1', category: 'public.app-category.productivity', prefix: 'Nexus_Main', native: ['electron-main.cjs', 'preload.cjs', 'electron'] },
  'Nexus Code': { slug: 'nexus-code', main: 'electron/main.cjs', name: 'nexus-code', product: 'Nexus Code', appId: 'com.nexus.code', icon: 'assets/icons/NexusCodeLogo', category: 'public.app-category.developer-tools', prefix: 'Nexus_Code', native: ['electron'] },
}
const builtin = new Set([...builtinModules, ...builtinModules.map(name => `node:${name}`), 'electron'])
const plain = value => value && typeof value === 'object' && !Array.isArray(value)
const digest = value => createHash('sha256').update(value).digest('hex')
const inside = (root, value) => { const relative = path.relative(root, value); return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative)) }

export function releaseApp(repoRoot, app) {
  const definition = Object.hasOwn(APPS, app) ? APPS[app] : null
  if (!definition) throw new Error('Unsupported release application')
  const source = path.join(repoRoot, app)
  const metadata = JSON.parse(fs.readFileSync(path.join(source, 'package.json'), 'utf8'))
  const lock = JSON.parse(fs.readFileSync(path.join(source, 'package-lock.json'), 'utf8'))
  const electronVersion = lock.packages?.['node_modules/electron']?.version
  if (metadata.name !== definition.name || metadata.main !== definition.main || !/^\d+\.\d+\.\d+(?:-[\w.-]+)?(?:\+[\w.-]+)?$/.test(metadata.version || '') || !/^\d+\.\d+\.\d+$/.test(electronVersion || '')) throw new Error('Unrecognized application metadata or Electron lock version')
  return { ...definition, source, version: metadata.version, electronVersion, metadata: {
    name: definition.name, version: metadata.version, main: definition.main, type: 'module',
    description: app === 'Nexus Main' ? 'Nexus productivity workspace' : 'Nexus code editor',
    author: 'youngjibbit95', homepage: 'https://nexusproject.dev', private: true,
  } }
}

// Inventory without following links before packaging. No dependency
// manager files or node_modules enter the privileged packaging project.
export function inventoryPayload(root) {
  const files = []
  let bytes = 0
  const visit = directory => {
    const stat = fs.lstatSync(directory)
    if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error('Payload root/directory must not be a link')
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const file = path.join(directory, entry.name)
      const relative = path.relative(root, file).split(path.sep).join('/')
      if (entry.isSymbolicLink() || !inside(root, file)) throw new Error('Payload links/path escape are forbidden')
      if (entry.isDirectory()) { visit(file); continue }
      if (!entry.isFile()) throw new Error('Payload contains a special file')
      if (relative.split('/').some(part => part === 'node_modules' || part.startsWith('.')) || /(?:^|\/)(?:electron-builder\.[^/]+|package-lock\.json|yarn\.lock|pnpm-lock\.yaml)$/.test(relative)) throw new Error('Payload contains packaging/dependency configuration')
      const size = fs.statSync(file).size
      bytes += size
      if (files.length >= 100_000 || size > 128 * 1024 * 1024 || bytes > 1024 * 1024 * 1024) throw new Error('Payload exceeds packaging limits')
      files.push({ relative, file, size, sha256: digest(fs.readFileSync(file)) })
    }
  }
  visit(root)
  return files.sort((a, b) => a.relative.localeCompare(b.relative, 'en'))
}

function assertNativeImports(appRoot, files) {
  for (const { relative, file } of files.filter(item => item.relative.endsWith('.cjs'))) {
    const source = fs.readFileSync(file, 'utf8')
    const imports = [...source.matchAll(/\brequire\(\s*(['"])([^'"\n]+)\1\s*\)/g)]
    for (const [, , specifier] of imports) {
      if (builtin.has(specifier)) continue
      if (!specifier.startsWith('./') && !specifier.startsWith('../')) throw new Error(`Unbundled native dependency in ${relative}`)
      const resolved = path.resolve(path.dirname(file), specifier)
      if (!inside(appRoot, resolved) || !fs.existsSync(resolved) || !fs.lstatSync(resolved).isFile()) throw new Error(`Missing/outside native module in ${relative}`)
    }
    const withoutStatic = source.replace(/\brequire\(\s*(['"])([^'"\n]+)\1\s*\)/g, 'STATIC_REQUIRE')
    if (/\brequire\s*\(|\bimport\s*\(/.test(withoutStatic)) throw new Error(`Dynamic native imports need a packaging review: ${relative}`)
  }
}

function freshOutsideCheckout(repoRoot, destination) {
  const target = path.resolve(destination)
  if (inside(fs.realpathSync(repoRoot), target) || fs.existsSync(target)) throw new Error('Build artifact destination must be new and outside the checkout')
  const parent = fs.realpathSync(path.dirname(target))
  if (inside(fs.realpathSync(repoRoot), parent)) throw new Error('Build artifact parent must be outside the checkout')
  fs.mkdirSync(target)
  return target
}

export function prepareInstallerPayload({ repoRoot, app, output }) {
  const definition = releaseApp(repoRoot, app)
  const root = freshOutsideCheckout(repoRoot, output)
  const appRoot = path.join(root, 'app'); fs.mkdirSync(appRoot)
  const copy = (source, target) => {
    const stat = fs.lstatSync(source)
    if (stat.isSymbolicLink()) throw new Error('Source payload links are forbidden')
    if (stat.isDirectory()) {
      fs.mkdirSync(target)
      for (const name of fs.readdirSync(source)) {
        if (name.endsWith('.test.cjs')) continue
        copy(path.join(source, name), path.join(target, name))
      }
    } else if (stat.isFile()) fs.copyFileSync(source, target)
    else throw new Error('Source payload special files are forbidden')
  }
  for (const item of ['dist', ...definition.native]) copy(path.join(definition.source, item), path.join(appRoot, item))
  fs.writeFileSync(path.join(appRoot, 'package.json'), `${JSON.stringify(definition.metadata, null, 2)}\n`)
  const files = inventoryPayload(appRoot)
  if (!files.some(file => file.relative === 'dist/index.html')) throw new Error('Built renderer missing')
  assertNativeImports(appRoot, files)
  fs.writeFileSync(path.join(root, 'manifest.json'), JSON.stringify({ version: 1, app, appVersion: definition.version, electronVersion: definition.electronVersion, files: files.map(({ relative, size, sha256 }) => ({ path: relative, size, sha256 })) }, null, 2) + '\n')
  return root
}

export function validateInstallerPayload({ repoRoot, app, payload }) {
  const definition = releaseApp(repoRoot, app)
  const root = fs.realpathSync(payload)
  if (fs.lstatSync(payload).isSymbolicLink()) throw new Error('Payload root links are forbidden')
  const files = inventoryPayload(root)
  if (files.some(file => file.relative !== 'manifest.json' && !file.relative.startsWith('app/'))) throw new Error('Unexpected payload root content')
  const manifestBytes = fs.readFileSync(path.join(root, 'manifest.json'))
  if (manifestBytes.length > 16 * 1024 * 1024) throw new Error('Payload manifest too large')
  const manifest = JSON.parse(manifestBytes)
  if (!plain(manifest) || manifest.version !== 1 || manifest.app !== app || manifest.appVersion !== definition.version || manifest.electronVersion !== definition.electronVersion || !Array.isArray(manifest.files)) throw new Error('Payload provenance/version mismatch')
  const actual = files.filter(file => file.relative.startsWith('app/')).map(file => ({ path: file.relative.slice(4), size: file.size, sha256: file.sha256 }))
  if (JSON.stringify(manifest.files) !== JSON.stringify(actual)) throw new Error('Payload file/digest mismatch')
  const appRoot = path.join(root, 'app')
  const metadata = JSON.parse(fs.readFileSync(path.join(appRoot, 'package.json'), 'utf8'))
  if (JSON.stringify(metadata) !== JSON.stringify(definition.metadata)) throw new Error('Artifact package scripts/configuration/metadata forbidden')
  const allowedTop = new Set(['dist', 'electron', 'package.json', ...definition.native])
  if (actual.some(file => !allowedTop.has(file.path.split('/')[0]))) throw new Error('Unexpected application payload file')
  for (const required of ['dist/index.html', definition.main, app === 'Nexus Main' ? 'preload.cjs' : 'electron/preload.cjs']) {
    if (!actual.some(file => file.path === required)) throw new Error('Required application entrypoint missing')
  }
  assertNativeImports(appRoot, actual.map(file => ({ relative: file.path, file: path.join(appRoot, file.path) })))
  return { definition, root, appRoot }
}

export function createInstallerRecipe({ repoRoot, app, payload, project, target, arch, signed = false, directoryOnly = false }) {
  if (!['win', 'mac', 'linux'].includes(target) || !['x64', 'arm64'].includes(arch) || (target !== 'mac' && arch !== 'x64')) throw new Error('Unsupported platform/architecture')
  if (typeof signed !== 'boolean' || typeof directoryOnly !== 'boolean') throw new Error('Explicit boolean packaging modes required')
  const { definition, appRoot } = validateInstallerPayload({ repoRoot, app, payload })
  const projectRoot = freshOutsideCheckout(repoRoot, project)
  const resources = path.join(projectRoot, 'packaging-resources'); fs.mkdirSync(resources)
  for (const extension of ['ico', 'icns']) fs.copyFileSync(path.join(definition.source, `${definition.icon}.${extension}`), path.join(resources, `icon.${extension}`))
  fs.copyFileSync(path.join(definition.source, 'build/entitlements.mac.plist'), path.join(resources, 'entitlements.mac.plist'))
  const png = app === 'Nexus Main' ? 'icons/512x512.png' : 'assets/icons/512x512.png'
  fs.copyFileSync(path.join(definition.source, png), path.join(resources, 'icon.png'))
  fs.writeFileSync(path.join(projectRoot, 'package.json'), JSON.stringify(definition.metadata, null, 2) + '\n')
  const artifactName = `${definition.prefix}_\${version}_\${arch}`
  const config = {
    extends: null, appId: definition.appId, productName: definition.product, electronVersion: definition.electronVersion,
    npmRebuild: false, nodeGypRebuild: false, buildDependenciesFromSource: false, asar: true, forceCodeSigning: signed,
    directories: { app: appRoot, output: path.join(projectRoot, 'release'), buildResources: resources },
    files: ['**/*'], publish: null,
    win: { icon: path.join(resources, 'icon.ico'), target: directoryOnly ? 'dir' : [{ target: 'nsis', arch: ['x64'] }], forceCodeSigning: signed },
    nsis: { oneClick: false, perMachine: false, allowElevation: false, allowToChangeInstallationDirectory: true, createDesktopShortcut: true, createStartMenuShortcut: true, artifactName: `${definition.prefix}_User_Setup_\${version}.exe`, installerIcon: path.join(resources, 'icon.ico'), uninstallerIcon: path.join(resources, 'icon.ico') },
    mac: { icon: path.join(resources, 'icon.icns'), category: definition.category, hardenedRuntime: true, gatekeeperAssess: false, entitlements: path.join(resources, 'entitlements.mac.plist'), entitlementsInherit: path.join(resources, 'entitlements.mac.plist'), target: directoryOnly ? 'dir' : [{ target: 'dmg', arch: [arch] }], ...(signed ? {} : { identity: null }) },
    dmg: { title: definition.product, icon: path.join(resources, 'icon.icns'), artifactName: `${artifactName}.dmg` },
    linux: { icon: path.join(resources, 'icon.png'), maintainer: definition.metadata.author, category: app === 'Nexus Main' ? 'Office' : 'Development', target: directoryOnly ? 'dir' : ['AppImage', 'deb'] },
    appImage: { artifactName: `${artifactName}.AppImage` }, deb: { artifactName: `${artifactName}.deb` },
  }
  const configPath = path.join(projectRoot, 'packaging.json')
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n')
  return { projectRoot, configPath, config, args: ['--projectDir', projectRoot, '--config', configPath, `--${target}`, `--${arch}`, '--publish', 'never'] }
}

export function installerNames({ repoRoot, app, target, arch }) {
  const definition = releaseApp(repoRoot, app)
  if (!['x64', 'arm64'].includes(arch) || (target !== 'mac' && arch !== 'x64')) throw new Error('Unsupported installer architecture')
  const base = `${definition.prefix}_${definition.version}_${arch}`
  if (target === 'win') return [`${definition.prefix}_User_Setup_${definition.version}.exe`]
  if (target === 'mac') return [`${base}.dmg`]
  if (target === 'linux') return [`${base}.AppImage`, `${base}.deb`]
  throw new Error('Unsupported installer target')
}

// Artifact handoffs contain distribution files only, never unpacked executable
// trees, hooks or key material. Call before entering the checksum secret step.
export function validateInstallerDistribution(options) {
  const { directory } = options
  if (!fs.lstatSync(directory).isDirectory() || fs.lstatSync(directory).isSymbolicLink()) throw new Error('Installer directory must not be a link')
  const expected = installerNames(options).sort()
  if (JSON.stringify(fs.readdirSync(directory).sort()) !== JSON.stringify(expected)) throw new Error('Unexpected/missing installer artifacts')
  for (const name of expected) {
    const stat = fs.lstatSync(path.join(directory, name))
    if (!stat.isFile() || stat.isSymbolicLink() || stat.size === 0) throw new Error('Installer must be a nonempty regular file')
  }
  return expected
}

export function collectInstallerDistribution(options) {
  const root = freshOutsideCheckout(options.repoRoot, options.output)
  for (const name of installerNames(options)) {
    const file = path.join(options.directory, name)
    const stat = fs.lstatSync(file)
    if (!stat.isFile() || stat.isSymbolicLink() || stat.size === 0) throw new Error('Missing or unsafe installer output')
    fs.copyFileSync(file, path.join(root, name))
  }
  validateInstallerDistribution({ ...options, directory: root })
  return root
}
