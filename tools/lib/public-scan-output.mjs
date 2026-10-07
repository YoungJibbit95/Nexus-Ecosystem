// Finding metadata only: never interpolate source lines or raw matcher output.
export function formatPublicFinding({ file, line, label }) {
  return `${file}:${line} [${label}] [content redacted]`
}
