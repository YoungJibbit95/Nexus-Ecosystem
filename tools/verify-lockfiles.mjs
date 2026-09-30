import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { validateLockfile } from './lib/lockfile-contract.mjs'
import { PUBLIC_PACKAGES } from './lib/public-packages.mjs'

const root = new URL('../', import.meta.url)
let failed = false
for (const directory of PUBLIC_PACKAGES) {
  const file = new URL(`${directory}/package-lock.json`, root)
  const errors = validateLockfile(JSON.parse(readFileSync(file, 'utf8')))
  if (errors.length) {
    failed = true
    console.error(`[lockfiles] FAIL ${fileURLToPath(file)}\n${errors.map(error => ` - ${error}`).join('\n')}`)
  } else console.log(`[lockfiles] PASS ${directory}`)
}
if (failed) process.exitCode = 1
