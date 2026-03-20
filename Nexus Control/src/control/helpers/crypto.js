const encoder = new TextEncoder()

export const toHex = (buffer) => Array
  .from(new Uint8Array(buffer))
  .map((byte) => byte.toString(16).padStart(2, '0'))
  .join('')

export const createDeviceId = () => {
  const suffix = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
  return `nxdev-${suffix}`
}

export const sha256Hex = async (value) => {
  if (!globalThis.crypto?.subtle) {
    throw new Error('WebCrypto nicht verfuegbar. Signierte Mutationen sind in diesem Browser nicht moeglich.')
  }
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(value))
  return toHex(digest)
}

export const hmacSha256Hex = async (secret, value) => {
  if (!globalThis.crypto?.subtle) {
    throw new Error('WebCrypto nicht verfuegbar. Signierte Mutationen sind in diesem Browser nicht moeglich.')
  }

  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )

  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(value))
  return toHex(signature)
}
