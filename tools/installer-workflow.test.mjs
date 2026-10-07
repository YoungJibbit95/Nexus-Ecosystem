import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { assertInstallerWorkflowPolicy } from './lib/installer-workflow-policy.mjs'
const workflow = fs.readFileSync(new URL('../.github/workflows/build-installers.yml', import.meta.url), 'utf8')

test('installer workflow separates unprivileged build, protected platform signing, checksum signing and publication', () => {
  assertInstallerWorkflowPolicy(workflow)
})

test('authority, artifact binding, pinning and native signature regressions fail the policy gate', () => {
  const mutations = [
    value => value.replace('contents: read', 'contents: write'),
    value => value.replace('\njobs:', '\nenv:\n  KEY: ${{ secrets.TEST_KEY }}\njobs:'),
    value => value.replace('    name: "Build payload:', '    env:\n      KEY: ${{ secrets.TEST_KEY }}\n    name: "Build payload:'),
    value => value.replaceAll('persist-credentials: false', 'persist-credentials: true'),
    value => value.replace(/actions\/checkout@[a-f0-9]{40}/g, 'actions/checkout@v5'),
    value => value.replaceAll('${{ github.run_attempt }}', 'unbound'),
    value => value.replace("if: github.event_name == 'workflow_dispatch' && github.ref == 'refs/heads/main' && inputs.publish_release_assets", 'if: always()'),
    value => value.replace('npm ci --ignore-scripts --no-audit --no-fund', 'npm ci'),
    value => value.replace('codesign --verify --deep --strict', 'codesign --verify'),
    value => value.replace('xcrun stapler validate', 'echo notarization-skipped'),
    value => value.replace('xcrun notarytool submit', 'echo notarization-skipped'),
    value => value.replace('Get-AuthenticodeSignature', 'Get-Item'),
    value => value.replaceAll('--signed', ''),
    value => value.replaceAll('--require-signature', ''),
    value => value.replace('secrets.NEXUS_INSTALLER_CHECKSUM_SIGNING_KEY_PEM', 'secrets.NEXUS_LAUNCHER_FEED_SIGNING_KEY_PEM'),
  ]
  for (const mutate of mutations) {
    const mutated = mutate(workflow)
    assert.notEqual(mutated, workflow)
    assert.throws(() => assertInstallerWorkflowPolicy(mutated))
  }
})
