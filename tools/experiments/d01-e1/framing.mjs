import { MAX_FRAME, DEADLINE_MS } from './protocol.mjs'

export function frame(bytes) {
  if (!bytes.length || bytes.length > MAX_FRAME) throw new Error('Frame outside experiment limits')
  const header = Buffer.alloc(4)
  header.writeUInt32BE(bytes.length)
  return Buffer.concat([header, bytes])
}

// At most one request per stream; a short absolute deadline cannot be reset by trickling bytes.
export function serveStream(socket, handle) {
  let header = Buffer.alloc(0), body = Buffer.alloc(0), size = 0, finished = false
  const deadline = setTimeout(() => socket.destroy(), DEADLINE_MS)
  const clear = () => clearTimeout(deadline)
  socket.on('close', clear)
  socket.on('error', () => {})
  socket.on('data', chunk => {
    if (finished) return socket.destroy()
    if (!size) {
      const needed = 4 - header.length
      header = Buffer.concat([header, chunk.subarray(0, needed)])
      chunk = chunk.subarray(needed)
      if (header.length < 4) return
      size = header.readUInt32BE()
      if (!size || size > MAX_FRAME) return socket.destroy()
    }
    if (body.length + chunk.length > size) return socket.destroy()
    body = Buffer.concat([body, chunk])
    if (body.length === size) {
      finished = true
      socket.end(frame(handle(body)))
    }
  })
}
