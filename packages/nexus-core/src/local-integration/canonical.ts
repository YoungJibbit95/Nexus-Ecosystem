/** RFC 8785/JCS over JSON values. No normalization, storage, crypto key or transport. */
export function canonicalJson(value: unknown): string {
  const ancestors = new Set<object>()
  const text = (input: string): string => {
    for (let i = 0; i < input.length; i++) {
      const unit = input.charCodeAt(i)
      if (unit >= 0xd800 && unit <= 0xdbff) {
        const next = input.charCodeAt(++i)
        if (!(next >= 0xdc00 && next <= 0xdfff)) throw new Error('Non-scalar Unicode')
      } else if (unit >= 0xdc00 && unit <= 0xdfff) throw new Error('Non-scalar Unicode')
    }
    return JSON.stringify(input)
  }
  const encode = (input: unknown, depth: number): string => {
    if (depth > 64) throw new Error('JSON depth exceeds 64')
    if (input === null || typeof input === 'boolean') return JSON.stringify(input)
    if (typeof input === 'string') return text(input)
    if (typeof input === 'number') {
      if (!Number.isFinite(input)) throw new Error('Non-finite number')
      return JSON.stringify(input)
    }
    if (!input || typeof input !== 'object' || ancestors.has(input)) throw new Error('Not an acyclic JSON value')
    const prototype = Object.getPrototypeOf(input)
    if (!Array.isArray(input) && prototype !== Object.prototype && prototype !== null) throw new Error('Not a plain JSON object')
    if (Object.getOwnPropertySymbols(input).length) throw new Error('Symbol properties are not JSON')
    ancestors.add(input)
    const keys = Object.keys(input)
    for (const key of keys) if (!('value' in Object.getOwnPropertyDescriptor(input, key)!)) throw new Error('Accessors are not JSON')
    let result: string
    if (Array.isArray(input)) {
      if (keys.length !== input.length || keys.some((key, i) => key !== String(i))) throw new Error('Sparse or extended array')
      result = `[${input.map(item => encode(item, depth + 1)).join(',')}]`
    } else {
      const fields = input as Record<string, unknown>
      result = `{${keys.sort().map(key => `${text(key)}:${encode(fields[key], depth + 1)}`).join(',')}}`
    }
    ancestors.delete(input)
    return result
  }
  return encode(value, 0)
}
export const canonicalBytes = (value: unknown): Uint8Array => new TextEncoder().encode(canonicalJson(value))

/** Corpus decoder: canonical UTF-8 JSON plus exactly one file-final LF. */
export function parseCanonicalFile(bytes: Uint8Array): unknown {
  if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) throw new Error('UTF-8 BOM is forbidden')
  const source = new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  const value: unknown = JSON.parse(source)
  // Also rejects duplicate keys, alternate number spellings and extra whitespace.
  if (source !== `${canonicalJson(value)}\n`) throw new Error('Non-canonical corpus bytes')
  return value
}
