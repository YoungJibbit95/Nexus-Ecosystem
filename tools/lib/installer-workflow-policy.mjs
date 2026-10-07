import assert from 'node:assert/strict'
import { assertApplicationAudit } from './dependency-audit-policy.mjs'

// A deliberately narrow regression contract for this repository-owned workflow.
// This is not a general YAML parser or a substitute for protected environments.
export function assertInstallerWorkflowPolicy(source) {
  assert.match(source, /^permissions:\r?\n  contents: read$/m)
  assert.doesNotMatch(source.slice(0, source.indexOf('\njobs:')), /secrets\.|github\.token/)
  const jobEntries = [...source.slice(source.indexOf('\njobs:')).matchAll(/^  ([a-z-]+):\r?\n([\s\S]*?)(?=^  [a-z-]+:\r?\n|$(?![\s\S]))/gm)]
  const jobs = Object.fromEntries(jobEntries.map(([, name, body]) => [name, body]))
  assert.deepEqual(Object.keys(jobs), ['build', 'package', 'checksums', 'publish'])
  assert.doesNotMatch(source, /NEXUS_LAUNCHER_FEED_SIGNING|softprops\/action-gh-release/)
  const manual = "github.event_name == 'workflow_dispatch' && github.ref == 'refs/heads/main'"
  assert.match(jobs.publish, new RegExp(`    if: ${manual.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} && inputs.publish_release_assets`))
  assert.match(jobs.publish, /environment: release-publish/)
  assert.match(jobs.publish, /permissions:\r?\n      contents: write/)
  assert.doesNotMatch(jobs.build, /secrets\.|github\.token|contents: write|environment:/)
  assert.match(jobs.build, /run: npm ci/)
  assertApplicationAudit(jobs.build)
  assert.match(jobs.build, /run: npm run build/)
  assert.match(jobs.package, /needs: build/)
  assert.match(jobs.checksums, /needs: package/)
  assert.match(jobs.publish, /needs: checksums/)
  assert.match(jobs.package, /release-platform-signing/)
  assert.match(jobs.checksums, /release-checksum-signing/)
  for (const [name, body] of Object.entries(jobs)) {
    if (name !== 'publish') assert.doesNotMatch(body, /contents: write|github\.token/)
    const header = body.split(/^    steps:/m)[0]
    assert.doesNotMatch(header, /secrets\./)
    const steps = body.split(/^      - /m).slice(1)
    for (const step of steps) {
      if (step.includes('actions/checkout@')) assert.match(step, /persist-credentials: false/)
      if (/actions\/(?:upload|download)-artifact@/.test(step)) {
        assert.match(step, /(?:name|pattern): .*\$\{\{ github.sha \}\}.*\$\{\{ github.run_attempt \}\}/)
        if (step.includes('upload-artifact@')) assert.match(step, /if-no-files-found: error/)
      }
      if (/secrets\./.test(step)) {
        assert.ok(step.includes(manual), 'Every secret step must be manual main only')
        if (name === 'package') {
          assert.match(step, /^name: (?:Package and sign Windows|Package, sign and notarize macOS|Notarize macOS distribution)\r?\n/)
          if (step.startsWith('name: Notarize macOS distribution')) {
            assert.match(step, /xcrun notarytool submit "\$dmg"[^\n]+--wait/)
            assert.match(step, /xcrun stapler staple "\$dmg"/)
            assert.match(step, /xcrun stapler validate "\$dmg"/)
            assert.doesNotMatch(step, /CSC_LINK/)
          } else assert.match(step, /run: node tools\/installer-payload.mjs package [^\n]+ --signed\s*$/)
          assert.doesNotMatch(step, /CHECKSUM_SIGNING|FEED_SIGNING|npm |\n          (?:run|working-directory):/)
        } else {
          assert.equal(name, 'checksums')
          assert.match(step, /^name: Sign installer checksums\r?\n/)
          assert.match(step, /run: node tools\/generate-installer-checksums.mjs [^\n]+--require-signature/)
          assert.doesNotMatch(step, /CSC_LINK|APPLE_|FEED_SIGNING|npm /)
        }
      }
    }
  }
  const installs = [...jobs.package.matchAll(/^        run: npm (.+)$/gm)].map(match => match[1])
  assert.deepEqual(installs, ['ci --ignore-scripts --no-audit --no-fund'])
  assert.doesNotMatch(jobs.package.replace('npm ci --ignore-scripts --no-audit --no-fund', ''), /\bnpm\s/)
  assert.match(jobs.package, /working-directory: tools\/release-packager/)
  assert.ok(jobs.package.indexOf('Validate payload before credentials') < jobs.package.indexOf('secrets.'))
  assert.ok(jobs.checksums.indexOf('Validate distribution before checksum credentials') < jobs.checksums.indexOf('secrets.'))
  assert.doesNotMatch(jobs.checksums + jobs.publish, /run: npm|working-directory:.*Nexus/)
  assert.match(jobs.package, /codesign --verify --deep --strict/)
  assert.match(jobs.package, /xcrun stapler validate/)
  assert.match(jobs.package, /name: Notarize macOS distribution/)
  assert.match(jobs.package, /Get-AuthenticodeSignature/)
  for (const arch of ['arm64', 'x64']) assert.match(jobs.package, new RegExp(`target: "mac"\\s+arch: "${arch}"`))
  for (const match of source.matchAll(/^\s+uses: (.+)$/gm)) assert.match(match[1], /^[\w.-]+\/[\w.-]+@[a-f0-9]{40}(?:\s+#.*)?$/)
  for (const match of source.matchAll(/^\s+- uses: (.+)$/gm)) assert.match(match[1], /^[\w.-]+\/[\w.-]+@[a-f0-9]{40}(?:\s+#.*)?$/)
}
