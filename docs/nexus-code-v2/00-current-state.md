# Nexus Code V2 — Wave 0 baseline

Historical audit date: 2026-09-30 (Europe/Berlin). The snapshot below is Phase 0 / Wave 0. The [2026-10-01 Wave 1 foundation](12-wave-1-foundation.md) is complete; UI redesign has not started.

Historical snapshot: retain the evidence below. On 2026-10-01, [current-main reconciliation](11-main-reconciliation.md) established `0cb408b` as the Wave 1 base and verified the original native harness at 10/10. The historical Windows quoting failure is subsequently fixed; other unverified acceptance remains explicitly open.

## Starting point and isolation

- Primary checkout: `F:/Coding/Nexus Workspace/Nexus-Ecosystem`; branch `dev`; HEAD `10f8684c2da530ddc5549f2298f2794123a093d7`.
- An existing merge is pending, MERGE_HEAD `6458915ba3c5c1e4c71f2e07280dc4d7f9357f38`. Unmerged paths: root `package.json`, `docs/architecture/implementation-status.md`, `docs/architecture/next-session.md`. Other staged work concerns package locks, persistence release acceptance, public installation tooling and CI. See [original status](evidence/primary-status-before.txt) and [staged summary](evidence/primary-staged-stat.txt).
- Audit checkout: `F:/Coding/Nexus Workspace/Nexus-Code-v2-audit`; branch `recode/nexus-code-v2-wave-0`; created from the exact primary HEAD. The existing index, merge, branch and staged changes are preserved. No merge resolution, stash, reset, main update, push or PR creation was performed.
- The desktop-managed worktree tool rejected the workspace root because that parent is not a Git repository. A normal `git worktree add -b` against the actual repository created this checkout.
- Installed dependency directories are junctions to the primary checkout. No dependency installation or version change was performed. This measures the current installed environment, **not a clean lockfile install**. Host Node `26.3.1`, npm `11.3.0`; installed React `19.2.8`, Electron `42.11.3`, Vite `8.2.2`, TypeScript `6.0.3`, CodeMirror React wrapper `4.25.11`. CI uses Node 24.

## Source and prior evidence

Read the existing `docs/NEXUS_CODE_IDE_RECODE_PLAN.md`, architecture recovery packet, current storage/restore contracts and both sides of the conflicted continuation ledgers. The July plan's completed checklists and permission to push main are historical; the current request requires dedicated branches and explicit wave checkpoints. Its glass/glow emphasis also conflicts with the present restrained UI direction. This V2 packet supersedes those product and migration claims, without rewriting the historical document.

Committed persistence repairs are already present: `ca69d57` (generations/revision-bound saves), `9fabe12` (save-before-mutation), `72a78e3` (backup/recovery), `699a06b` (validated runtime imports), `10f8684` (mutation guard cleanup). Preserve these; do not replay the older architecture-recovery packet's now-repaired file migration bug as a current defect.

GitHub read-only inspection confirmed [PR #396](https://github.com/YoungJibbit95/Nexus-Ecosystem/pull/396) merged on September 27 as `7b15c6936fb53b18c3a99f24f0b0190baa979e93`; its final PR checks included failed Contract Parity and Release Gate runs. [PR #418](https://github.com/YoungJibbit95/Nexus-Ecosystem/pull/418) merged on September 30 as `6458915ba3c5c1e4c71f2e07280dc4d7f9357f38`, with successful final PR checks repairing installation/release tooling. That commit is the primary checkout's pending incoming merge, not this audit's base. Raw metadata: [396](evidence/pr-396.json), [418](evidence/pr-418.json), [open PRs](evidence/open-prs.json), [main runs](evidence/main-ci.json). GitHub returned HTTP 422 for check runs on the local-only audit base, so there is **no remote CI result for this exact SHA**. Dependabot runs on main are not an application gate result.

Open Nexus Code PRs at inspection: #423 Electron stack, #419 moment, #409 React Query, #408 motion, #407 tooling, #405 React stack. Do not incorporate them into a recode merely to refresh versions. Code Mobile #422 and shared core #416 can affect later integration. None was modified or attached as this chat's work.

## Actual architecture

`src/main.jsx` mounts React StrictMode and global CSS. `App.jsx` uses HashRouter, a lazy Editor route and route error boundary. `app/useNexusCodeBoot.js` coordinates session validation, API bootstrap, release compatibility, tier/view access, shared runtime lifecycle and performance metrics. No signed-out/offline editor bypass is supported.

`pages/Editor.jsx` remains the workbench orchestrator: 88,702 bytes, 2,363 lines, 21 direct useState calls and 12 direct effects. It owns workspace roots/files/tabs, settings/theme, docking, commands, keyboard handlers and panel composition, and injects Electron IO into the shared persistence hook. Valuable pure models already exist under `pages/editor`, `ide/editor`, `ide/lsp`, `ide/languages`, panel chrome and split settings/GitHub components. Preserve their contracts rather than replacing them with duplicate abstractions.

`CodeEditor.jsx` mounts CodeMirror but also owns language imports, document synchronization, LSP transport/engine lifecycle, completion/hover, diagnostics, editor commands, status and performance policy. Native services already separate Git, GitHub auth/token storage, process environment and LSP processes from `electron/main.cjs`; main still registers filesystem/window/terminal and every IPC domain.

Persistence is now shared: `localFileRepository`, `documentSaveQueue`, `useEditorPersistence`, `EditorMutationGuard` in `packages/nexus-core/src/storage`; Code's `localFileStorage.js` is an adapter. Settings still use the older queued writer in `storageManager.js` and swallow write errors. This is not the current file persistence owner.

## Evidence limits and entry points

The audit covers the major source domains and consumer paths; [source inventory](evidence/source-inventory.json) records all app code files, imports, exact sizes and diagnostic counts. [Subsystem audit](subsystem-audit.md) provides purpose, behavior, risks, target, classification and migration for each major area. [Feature status](feature-status.md) is the product-truth ledger. [Target architecture](03-target-architecture.md) defines owners. [Test strategy/results](09-test-strategy.md) records actual exits and coverage boundaries. [Next session](10-next-session.md) is the continuation contract.

Fixture screenshots do not prove live authenticated workflows. Native tests use an isolated profile and temporary repository; no real user projects, credentials, account login, GitHub mutations or installed-client upgrades were used. The audit is not a full vulnerability scan or a performance certification.
