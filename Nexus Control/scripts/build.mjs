import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT = path.resolve(__dirname, '..')
const SRC = path.join(ROOT, 'src')
const DIST = path.join(ROOT, 'dist')

await fs.rm(DIST, { recursive: true, force: true })
await fs.mkdir(DIST, { recursive: true })
await fs.cp(SRC, DIST, { recursive: true })

console.log(`Nexus Control Build bereit: ${DIST}`)
