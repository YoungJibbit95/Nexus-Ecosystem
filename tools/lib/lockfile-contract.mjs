import path from 'node:path'

function resolvePackage(packages, parent, dependency) {
  let cursor = parent
  while (cursor && cursor !== '.') {
    if (path.posix.basename(cursor) !== 'node_modules') {
      const found = packages[`${cursor}/node_modules/${dependency}`]
      if (found) return found
    }
    cursor = path.posix.dirname(cursor)
  }
  return packages[`node_modules/${dependency}`]
}

/** Check platform metadata independently of the host OS before npm can prune optional packages. */
export function validateLockfile(lock) {
  const failures = []
  if (!lock || lock.lockfileVersion !== 3 || !lock.packages?.['']) return ['Expected a complete npm lockfile v3']
  for (const [location, entry] of Object.entries(lock.packages)) {
    if (location && !entry.link && (typeof entry.version !== 'string' || !entry.version.trim())) failures.push(`${location}: missing package version`)
    for (const [dependency, version] of Object.entries(entry.optionalDependencies ?? {})) {
      if (!dependency.startsWith('@rolldown/binding-')) continue
      const resolved = resolvePackage(lock.packages, location, dependency)
      if (!resolved || resolved.version !== version || !resolved.resolved || !resolved.integrity) {
        failures.push(`${location}: incomplete ${dependency}@${version} platform record`)
      }
    }
  }
  return failures
}
