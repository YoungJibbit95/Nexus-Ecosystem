import { existsSync } from 'node:fs'
import { extname } from 'node:path'
import { registerHooks } from 'node:module'
import { fileURLToPath } from 'node:url'

registerHooks({
  resolve(specifier, context, nextResolve) {
    try {
      return nextResolve(specifier, context)
    } catch (error) {
      if (!specifier.startsWith('.') || extname(specifier)) throw error
      const candidate = new URL(`${specifier}.ts`, context.parentURL)
      if (!existsSync(fileURLToPath(candidate))) throw error
      return nextResolve(candidate.href, context)
    }
  },
})
