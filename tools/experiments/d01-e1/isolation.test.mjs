import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const directory = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(directory, '../../..')
const within = (parent, target) => { const relative = path.relative(parent, target); return relative === '' || !relative.startsWith('..') && !path.isAbsolute(relative) }

test('experiment sources and native outputs are outside active Electron packaging roots', () => {
  for (const app of ['Nexus Main', 'Nexus Code']) {
    const appRoot = path.join(root, app)
    const config = JSON.parse(fs.readFileSync(path.join(appRoot, 'package.json'), 'utf8'))
    assert.equal(within(appRoot, directory), false)
    for (const entry of config.build.files) assert.equal(entry.includes('..'), false, 'Packaging cannot reach outside the app root')
    for (const item of [...config.build.extraResources || [], ...config.build.extraFiles || []]) {
      const source = path.resolve(appRoot, typeof item === 'string' ? item : item.from)
      assert.equal(within(source, directory), false, 'Experiment cannot be copied as an extra resource')
    }
  }
  assert.equal(fs.existsSync(path.join(directory, 'native', 'bin')), false)
  assert.equal(fs.existsSync(path.join(directory, 'native', 'obj')), false)
})

test('import is inert; experiment host is not imported by product/core sources', () => {
  for (const relative of ['Nexus Main/src', 'Nexus Main/electron', 'Nexus Code/src', 'Nexus Code/electron', 'packages/nexus-core/src']) {
    const inspect = location => {
      for (const entry of fs.readdirSync(location, { withFileTypes: true })) {
        const file = path.join(location, entry.name)
        if (entry.isDirectory()) inspect(file)
        else if (/\.(?:cjs|mjs|js|ts|tsx)$/.test(entry.name)) assert.doesNotMatch(fs.readFileSync(file, 'utf8'), /experiments[/\\]d01-e1/)
      }
    }
    inspect(path.join(root, relative))
  }
  const loaded = spawnSync(process.execPath, ['--input-type=module', '-e', `await import(${JSON.stringify(new URL('./host.mjs', import.meta.url).href)});console.log('inert')`], { encoding: 'utf8', timeout: 5000, windowsHide: true })
  assert.equal(loaded.status, 0, loaded.stderr)
  assert.equal(loaded.stdout.trim(), 'inert')
})
