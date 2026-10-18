/** Small, closed JSON Schema vocabulary used only by the inert wire contract. */
export type Json = null | boolean | number | string | Json[] | { [key: string]: Json }
export type Schema<T = unknown> = {
  readonly $ref?: string; readonly type?: string; readonly const?: unknown
  readonly enum?: readonly unknown[]; readonly oneOf?: readonly Schema[]
  readonly properties?: Readonly<Record<string, Schema>>; readonly required?: readonly string[]
  readonly additionalProperties?: false; readonly items?: Schema; readonly uniqueItems?: boolean
  readonly minItems?: number; readonly maxItems?: number; readonly minLength?: number
  readonly maxLength?: number; readonly pattern?: string; readonly format?: 'date-time' | 'date'
  readonly minimum?: number; readonly maximum?: number
  /** Type-only witness; never materialized in the JSON Schema. */
  readonly __type?: T
}
export type Infer<S> = S extends Schema<infer T> ? T : never
type ObjectType<P extends Record<string, Schema>, O extends keyof P> =
  { [K in Exclude<keyof P, O>]: Infer<P[K]> } & { [K in O]?: Infer<P[K]> }

export const literal = <const T extends string | number | boolean | null>(value: T): Schema<T> => ({ const: value })
export const enumeration = <const T extends readonly string[]>(...values: T): Schema<T[number]> => ({ type: 'string', enum: values })
export const string = (maxLength: number, options: Pick<Schema, 'minLength' | 'pattern' | 'format'> = {}): Schema<string> => ({ type: 'string', maxLength, ...options })
export const number = (minimum: number, maximum: number): Schema<number> => ({ type: 'number', minimum, maximum })
export const integer = (minimum: number, maximum = Number.MAX_SAFE_INTEGER): Schema<number> => ({ type: 'integer', minimum, maximum })
export const boolean: Schema<boolean> = { type: 'boolean' }
export const array = <T>(items: Schema<T>, maxItems: number, minItems = 0, uniqueItems = false): Schema<T[]> => ({ type: 'array', items, minItems, maxItems, ...(uniqueItems ? { uniqueItems: true } : {}) })
export const union = <const S extends readonly Schema[]>(...oneOf: S): Schema<Infer<S[number]>> => ({ oneOf })
export const object = <const P extends Record<string, Schema>, const O extends readonly (keyof P & string)[] = readonly []>(properties: P, optional: O = [] as unknown as O): Schema<ObjectType<P, O[number]>> => ({
  type: 'object', properties, required: Object.keys(properties).filter(key => !optional.includes(key)), additionalProperties: false,
})

export type SchemaIssue = { path: string; keyword: string }
export type Validation = { valid: true } | { valid: false; issues: SchemaIssue[] }
const own = (value: object, key: PropertyKey) => Object.prototype.hasOwnProperty.call(value, key)

function validDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match || match[0] !== value) return false
  const [, year, month, day] = match.map(Number)
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)
  return year >= 1 && month >= 1 && month <= 12 && day >= 1 && day <= [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1]
}
function validInstant(value: string): boolean {
  const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,9})?(Z|[+-]\d{2}:\d{2})$/.exec(value)
  if (!match || match[0] !== value || !validDate(match[1]) || +match[2] > 23 || +match[3] > 59 || +match[4] > 59 || match[5] === '-00:00') return false
  return match[5] === 'Z' || (+match[5].slice(1, 3) <= 23 && +match[5].slice(4) <= 59)
}

/** Stateless structure/format validation. Does not evaluate grants, epochs or domain state. */
export function validateSchema(schema: Schema, value: unknown, definitions: Readonly<Record<string, Schema>>): Validation {
  const issues: SchemaIssue[] = []
  const visit = (rule: Schema, input: unknown, path: string, depth: number): void => {
    const fail = (keyword: string) => { if (issues.length < 32) issues.push({ path, keyword }) }
    if (depth > 64) { fail('depth'); return }
    if (rule.$ref) {
      const target = definitions[rule.$ref.slice('#/$defs/'.length)]
      if (!rule.$ref.startsWith('#/$defs/') || !target) throw new Error('Unknown local schema reference')
      visit(target, input, path, depth + 1); return
    }
    if (rule.oneOf) {
      const matches = rule.oneOf.filter(branch => validateSchema(branch, input, definitions).valid).length
      if (matches !== 1) fail('oneOf')
      return
    }
    if ('const' in rule && input !== rule.const) fail('const')
    if (rule.enum && !rule.enum.includes(input)) fail('enum')
    if (rule.type === 'string') {
      if (typeof input !== 'string') { fail('type'); return }
      const length = [...input].length
      if (rule.minLength !== undefined && length < rule.minLength) fail('minLength')
      if (rule.maxLength !== undefined && length > rule.maxLength) fail('maxLength')
      if (rule.pattern && !new RegExp(rule.pattern, 'u').test(input)) fail('pattern')
      if (rule.format && !(rule.format === 'date' ? validDate(input) : validInstant(input))) fail('format')
    } else if (rule.type === 'number' || rule.type === 'integer') {
      if (typeof input !== 'number' || !Number.isFinite(input) || (rule.type === 'integer' && !Number.isSafeInteger(input))) { fail('type'); return }
      if (rule.minimum !== undefined && input < rule.minimum) fail('minimum')
      if (rule.maximum !== undefined && input > rule.maximum) fail('maximum')
    } else if (rule.type === 'boolean') {
      if (typeof input !== 'boolean') fail('type')
    } else if (rule.type === 'array') {
      if (!Array.isArray(input)) { fail('type'); return }
      if (rule.minItems !== undefined && input.length < rule.minItems) fail('minItems')
      if (rule.maxItems !== undefined && input.length > rule.maxItems) { fail('maxItems'); return }
      if (rule.items) input.forEach((item, index) => visit(rule.items!, item, `${path}/${index}`, depth + 1))
      if (rule.uniqueItems && input.some((item, index) => input.slice(0, index).some(prior => equalJson(prior, item)))) fail('uniqueItems')
    } else if (rule.type === 'object') {
      if (!input || typeof input !== 'object' || Array.isArray(input)) { fail('type'); return }
      const fields = input as Record<string, unknown>, properties = rule.properties ?? {}
      for (const key of rule.required ?? []) if (!own(fields, key)) fail('required')
      for (const key of Object.keys(fields)) {
        if (!own(properties, key)) { fail('additionalProperties'); continue }
        visit(properties[key], fields[key], `${path}/${key.replace(/~/g, '~0').replace(/\//g, '~1')}`, depth + 1)
      }
    }
  }
  visit(schema, value, '', 0)
  return issues.length ? { valid: false, issues } : { valid: true }
}
function equalJson(a: unknown, b: unknown): boolean {
  if (a === b) return true
  if (!a || !b || typeof a !== 'object' || typeof b !== 'object') return false
  if (Array.isArray(a) || Array.isArray(b)) return Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((item, i) => equalJson(item, b[i]))
  const left = a as Record<string, unknown>, right = b as Record<string, unknown>
  return Object.keys(left).length === Object.keys(right).length && Object.keys(left).every(key => own(right, key) && equalJson(left[key], right[key]))
}
