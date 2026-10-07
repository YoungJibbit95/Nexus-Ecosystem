import { spawnSync } from 'node:child_process'
import { parseArgs } from 'node:util'
import { validateAndroidPublication } from './lib/android-publication.mjs'
import { validateExistingRelease } from './lib/installer-publication.mjs'

const { values } = parseArgs({ options: { directory: { type: 'string' } } })
if (process.env.GITHUB_EVENT_NAME !== 'workflow_dispatch' || process.env.GITHUB_REF !== 'refs/heads/main') throw new Error('Publishing requires a manual main workflow')
const files = validateAndroidPublication(values.directory)
const gh = args => {
  const result = spawnSync('gh', args, { encoding: 'utf8', shell: false, windowsHide: true })
  if (result.status !== 0 || result.error) throw new Error('GitHub release operation failed')
  return result.stdout
}
const repository = process.env.GITHUB_REPOSITORY
const tag = validateExistingRelease({ tag: process.env.NEXUS_RELEASE_TAG, repository, sha: process.env.GITHUB_SHA, gh })
// Intentionally no --clobber and no release/tag creation.
gh(['release', 'upload', tag, ...files, '--repo', repository])
console.log('[publish-android] Existing release assets uploaded')
