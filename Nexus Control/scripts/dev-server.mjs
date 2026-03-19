import http from 'node:http'
import path from 'node:path'
import { promises as fs } from 'node:fs'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT = path.resolve(__dirname, '..')
const SERVE_DIR = path.join(ROOT, 'src')
const PORT = Number(process.env.NEXUS_CONTROL_UI_PORT || 5180)

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
}

const server = http.createServer(async (req, res) => {
  try {
    const requestPath = decodeURIComponent((req.url || '/').split('?')[0])
    const relative = requestPath === '/' ? '/index.html' : requestPath
    const filePath = path.normalize(path.join(SERVE_DIR, relative))

    if (!filePath.startsWith(SERVE_DIR)) {
      res.writeHead(403)
      res.end('Forbidden')
      return
    }

    let contentPath = filePath
    try {
      const stat = await fs.stat(contentPath)
      if (stat.isDirectory()) {
        contentPath = path.join(contentPath, 'index.html')
      }
    } catch {
      contentPath = path.join(SERVE_DIR, 'index.html')
    }

    const ext = path.extname(contentPath).toLowerCase()
    const content = await fs.readFile(contentPath)
    res.writeHead(200, {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Cache-Control': 'no-store',
    })
    res.end(content)
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' })
    res.end('Not found')
  }
})

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Nexus Control UI (dev) auf http://0.0.0.0:${PORT}`)
})
