# Source secret scanning

Run from the repository root, using Node 20+ and a system `tar`:

```
node .security/scan.mjs tree
node .security/scan.mjs staged
node --test .security/scan.test.mjs .security/policy.test.mjs
```

The first command checks all tracked and repository-nonignored files, including
untracked source. The second checks full staged blobs, so a safe working copy
cannot hide a staged credential. The provided `.githooks/pre-commit` runs the staged command and propagates its
exit status. After reviewing any existing hook setup, an operator may opt in with
`git config --local core.hooksPath .githooks`. Integration does not change that
local setting automatically. Do not overwrite existing hooks or install
hooks globally. CI requires current-source and introduced-commit-content checks;
make `Source Secret Scan / source-secrets` a required branch check externally.

Staged blobs use mode-0600 disposable scanner input retaining their relative
filename, so extension-specific rules also apply. Each input file is removed
immediately after scanning. No checkout or worktree is created. Current-source
files are opened directly after alias checks; concurrent content changes fail.

Set `NEXUS_SCAN_BASE` and `NEXUS_SCAN_HEAD` to full immutable commit IDs and run
`node .security/scan.mjs range` to check additions in every commit in the range,
including a credential subsequently removed in that range. Initial pushes and
manual source runs without a base check current content only. They do not certify
past history. The default CI workflow does not install application dependencies,
receive production secrets or request write permissions.

`node .security/scan.mjs history` is a separate incident audit of all locally
available refs. The manual workflow input enables that separate job. Findings
return a failing status; they are never converted to success or a suppression
baseline. An open historical incident must remain open until operator handling
is complete. History checks do not block running the independent current-source
gate, and a reintroduced credential is still rejected.

Gitleaks 8.30.1 archives and extracted binaries are pinned by SHA-256 to verified
official releases. The runner downloads and verifies the tool before execution;
an unsupported platform, failed download, unsafe input or scanner error fails.
It discards raw scanner output and emits only rule/path/line/commit metadata.
Never run raw scanners without redaction when handling repository incidents.
No report includes matched text, secrets, account names or commit messages.

Only exact reviewed non-secret lines may appear in `synthetic-lines.json`, scoped
by path, detector rule and SHA-256 of that complete line, with a reason. This is
not a whole-file exception. Changing the line invalidates it. History/range scans
do not apply these current-line exceptions. Inline allow comments, ignore files,
environment-injected settings and blanket baselines are not accepted. Source scans
run in an empty working directory. Because upstream implicitly loads a source-root
ignore file during Git scans, range/history modes reject an existing root
`.gitleaksignore` rather than permit silently suppressed findings.

Local ignored runtime files are not opened. Tracked runtime account `data/users.json`
and runtime `.env` files fail by
name before reading; committed public browser configurations, if any, must be
listed individually in `public-env-files.json` and still undergo detection.
Source links, hardlinks, submodules and oversized inputs fail for separate review.
Gitleaks' normal binary detection rules apply; this is a source secret scanner,
not an encrypted-file, Git-LFS-object or unreachable-object audit. Historical
incidents require independent containment; an empty current report proves neither
absence of past exposure nor credential revocation.

Tool/test artifacts default to the workspace's dated `.workspace-maintenance`
directory, or `RUNNER_TEMP` in CI. Set absolute `NEXUS_SECURITY_ARTIFACTS` to choose
another approved evidence directory. `NEXUS_GITLEAKS` can point to a predownloaded
binary; its hash is still verified. Tests use random disposable credentials only.
The runner is not an OS sandbox against a concurrently malicious same-user process.
