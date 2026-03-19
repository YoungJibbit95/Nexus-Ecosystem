import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT = path.resolve(__dirname, '..')
const DIST = path.join(ROOT, 'dist')

const copyIfExists = async (from, to) => {
  try {
    await fs.access(from)
  } catch {
    return false
  }

  await fs.mkdir(path.dirname(to), { recursive: true })
  await fs.cp(from, to, { recursive: true })
  return true
}

await fs.rm(DIST, { recursive: true, force: true })
await fs.mkdir(DIST, { recursive: true })

await copyIfExists(path.join(ROOT, 'src'), path.join(DIST, 'src'))
await copyIfExists(path.join(ROOT, 'guides'), path.join(DIST, 'guides'))
await copyIfExists(path.join(ROOT, 'data'), path.join(DIST, 'data'))
await copyIfExists(path.join(ROOT, 'README.md'), path.join(DIST, 'README.md'))

console.log(`Control Plane Build bereit: ${DIST}`)
