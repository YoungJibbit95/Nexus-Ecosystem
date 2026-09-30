import { fileURLToPath } from 'node:url'
import { spawnNpmSync } from './lib/process-utils.mjs'
import { installPublicPackages } from './lib/public-packages.mjs'
import './verify-lockfiles.mjs'

if (!process.exitCode) {
  try {
    installPublicPackages(directory => {
      console.log(`[install:public] npm ci: ${directory}`)
      return spawnNpmSync(['ci', '--no-fund'], { cwd: fileURLToPath(new URL(`../${directory}/`, import.meta.url)), stdio: 'inherit' })
    })
  } catch (error) {
    console.error(`[install:public] ${error.message}`)
    process.exitCode = 1
  }
}
