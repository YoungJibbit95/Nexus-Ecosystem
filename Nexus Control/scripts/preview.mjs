import http from 'node:http'
import net from 'node:net'
import path from 'node:path'
import { promises as fs } from 'node:fs'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT = path.resolve(__dirname, '..')
const SERVE_DIR = path.join(ROOT, 'dist')
const PORT = Number(process.env.NEXUS_CONTROL_UI_PORT || 5181)
const HOST = '127.0.0.1'

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

const assertPortAvailable = (port, host) => new Promise((resolve, reject) => {
  const probe = net.createServer()

  probe.once('error', (error) => {
    if (error?.code === 'EADDRINUSE') {
      reject(new Error(`Port ${port} auf ${host} ist bereits belegt`))
      return
    }
    reject(error)
  })

  probe.once('listening', () => {
    probe.close((closeError) => {
      if (closeError) {
        reject(closeError)
        return
      }
      resolve(true)
    })
  })

  probe.listen(port, host)
})

let shuttingDown = false
const shutdown = (signal) => {
  if (shuttingDown) return
  shuttingDown = true
  console.log(`\nControl UI (preview) shutdown via ${signal}`)
  server.close(() => process.exit(0))
  setTimeout(() => process.exit(0), 1_000).unref()
}

server.on('error', (error) => {
  if (error?.code === 'EADDRINUSE') {
    console.error(`Control UI (preview) Start fehlgeschlagen: Port ${PORT} bereits belegt`)
    process.exit(1)
  }
  console.error('Control UI (preview) Server Fehler', error)
  process.exit(1)
})

process.on('SIGINT', () => shutdown('SIGINT'))
process.on('SIGTERM', () => shutdown('SIGTERM'))

try {
  await assertPortAvailable(PORT, HOST)
} catch (error) {
  console.error(`Control UI (preview) Start fehlgeschlagen: ${error?.message || 'Port nicht verfuegbar'}`)
  process.exit(1)
}

server.listen(PORT, HOST, () => {
  console.log(`Nexus Control UI (preview) auf http://127.0.0.1:${PORT}`)
})
