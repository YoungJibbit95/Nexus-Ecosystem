import assert from 'node:assert/strict'

// Contract for the fixed build-job layout, not a general YAML interpreter.
export function assertApplicationAudit(build) {
  const steps = build.replaceAll('\r\n', '\n').split(/^      - /m).slice(1)
  const install = steps.findIndex(step => step.startsWith('name: Install application dependencies\n'))
  const audit = steps.findIndex(step => step.startsWith('name: Audit application dependencies\n'))
  const compile = steps.findIndex(step => /^name: Build (?:application without signing authority|fresh web assets)\n/.test(step))
  assert.ok(install >= 0 && audit > install && compile > audit, 'Install, audit, then build are mandatory')
  assert.equal(steps[audit].trim(), 'name: Audit application dependencies\n        working-directory: "${{ matrix.app_dir }}"\n        run: npm audit --audit-level=moderate')
  assert.doesNotMatch(build.split(/^    steps:/m)[0], /continue-on-error|if:/, 'Build job must not make dependency failures optional')
}
