// Explicit subpath only: no import from core's product-facing barrel or runtime.
export * from './contracts'
export { canonicalJson, canonicalBytes, parseCanonicalFile } from './canonical'
export type { Json, Validation, SchemaIssue } from './schema'
