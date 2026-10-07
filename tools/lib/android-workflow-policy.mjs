import assert from 'node:assert/strict'
import { assertApplicationAudit } from './dependency-audit-policy.mjs'

// Narrow repository regression contract, not a general YAML security analyzer.
export function assertAndroidWorkflowPolicy(source) {
  assert.match(source, /^permissions:\r?\n  contents: read$/m)
  assert.doesNotMatch(source.slice(0, source.indexOf('\njobs:')), /secrets\.|github\.token/)
  const jobs = Object.fromEntries([...source.slice(source.indexOf('\njobs:')).matchAll(/^  ([a-z-]+):\r?\n([\s\S]*?)(?=^  [a-z-]+:\r?\n|$(?![\s\S]))/gm)].map(([, name, body]) => [name, body]))
  assert.deepEqual(Object.keys(jobs), ['build', 'sign', 'checksums', 'publish'])
  const manual = "github.event_name == 'workflow_dispatch' && github.ref == 'refs/heads/main'"
  assert.ok(jobs.sign.includes(`    if: ${manual} && (inputs.signing_required || inputs.publish_release_assets)`))
  assert.ok(jobs.publish.includes(`    if: ${manual} && inputs.publish_release_assets`))
  assert.match(jobs.sign, /needs: build\s+if:/)
  assert.match(jobs.sign, /environment: release-android-signing/)
  assert.match(jobs.checksums, /needs: sign\s+environment: release-checksum-signing/)
  assert.match(jobs.publish, /needs: checksums/)
  assert.match(jobs.publish, /environment: release-publish/)
  assert.match(jobs.publish, /permissions:\r?\n      contents: write/)
  assert.doesNotMatch(source, /NEXUS_LAUNCHER_FEED_SIGNING|softprops\/action-gh-release|always\(\)/)
  assert.doesNotMatch(jobs.build, /secrets\.|github\.token|contents: write|environment:/)
  assert.match(jobs.build, /run: npm ci/)
  assertApplicationAudit(jobs.build)
  assert.match(jobs.build, /run: npm run build/)
  assert.match(jobs.build, /capacitor sync android/)
  assert.match(jobs.build, /bundleRelease -PnexusUnsignedCandidate=true/)
  assert.doesNotMatch(jobs.sign + jobs.checksums + jobs.publish, /run:.*(?:npm |gradlew|capacitor)|working-directory:.*Nexus/)
  assert.ok(jobs.sign.indexOf('Validate bundle before credentials') < jobs.sign.indexOf('secrets.'))
  assert.ok(jobs.checksums.indexOf('Validate signed handoff before checksum credentials') < jobs.checksums.indexOf('secrets.'))
  assert.match(jobs.sign, /run: node tools\/android-bundle.mjs sign /)
  assert.match(jobs.checksums, /run: node tools\/generate-installer-checksums.mjs [^\n]+ --require-signature/)
  assert.match(jobs.publish, /run: node tools\/publish-android.mjs /)
  for (const [name, body] of Object.entries(jobs)) {
    if (name !== 'publish') assert.doesNotMatch(body, /contents: write|github\.token/)
    assert.doesNotMatch(body.split(/^    steps:/m)[0], /secrets\./)
    for (const step of body.split(/^      - /m).slice(1)) {
      if (step.includes('actions/checkout@')) assert.match(step, /persist-credentials: false/)
      if (/actions\/(upload|download)-artifact@/.test(step)) {
        assert.match(step, /(?:name|pattern): .*\$\{\{ github.sha \}\}.*\$\{\{ github.run_attempt \}\}/)
        if (step.includes('upload-artifact@')) assert.match(step, /if-no-files-found: error/)
      }
      if (step.includes('secrets.')) {
        assert.ok(['sign', 'checksums'].includes(name))
        assert.match(step, name === 'sign' ? /^name: Sign and strictly verify Android bundle\r?\n/ : /^name: Sign Android checksums\r?\n/)
        assert.doesNotMatch(step, /run:.*(?:npm|gradlew)|FEED_SIGNING/)
        assert.doesNotMatch(step, name === 'sign' ? /CHECKSUM_SIGNING/ : /ANDROID_KEY/)
      }
    }
  }
  for (const match of source.matchAll(/^\s+- uses: (.+)$/gm)) assert.match(match[1], /^[\w.-]+\/[\w./-]+@[a-f0-9]{40}(?:\s+#.*)?$/)
}
