import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { resolveApiSource } from './lib/api-source.mjs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT = path.resolve(__dirname, '..')

const main = async () => {
  try {
    const source = await resolveApiSource({ root: ROOT, quiet: true })

    console.log('Hosted API Mode aktiv (Public Repo nutzt nur API-Client-Layer).')
    console.log(JSON.stringify({
      mode: source.mode,
      controlBaseUrl: source.controlBaseUrl,
      apiDir: source.apiDir,
    }, null, 2))
  } catch (error) {
    const message = String(error?.message || error)
    console.error(`\napi-source-status fehlgeschlagen: ${message}`)
    process.exit(1)
  }
}

main()
