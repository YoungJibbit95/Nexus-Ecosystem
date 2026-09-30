export const PUBLIC_PACKAGES = ['packages/nexus-core', 'Nexus Main', 'Nexus Mobile', 'Nexus Code', 'Nexus Code Mobile', 'Nexus Wiki']

/** Stop on the first unsuccessful install, including process launch errors. */
export function installPublicPackages(run, directories = PUBLIC_PACKAGES) {
  for (const directory of directories) {
    const result = run(directory)
    if (result.error || result.status !== 0) throw new Error(`Dependency installation failed for ${directory}: ${result.error?.message ?? `exit ${result.status}`}`)
  }
}
