# Repository map

Baseline and limitations: [00](00-executive-summary.md). Paths below are repository-relative. This is a multi-project repository orchestrated with `npm --prefix`, not a root npm-workspaces dependency graph: root `package.json` contains scripts but no `workspaces` declaration. Each application has its own manifest, lockfile and installed dependency tree. Core is mostly consumed as source through aliases.

## Applications and execution roots

| Area | Entry / actual runtime | Build relationship | Important directories |
| --- | --- | --- | --- |
| Nexus Main | `src/main.tsx` → `App.tsx`; Electron starts `electron-main.cjs` from `package.json:main` | React/Vite renderer; `test:release-ui`, `tsc -b`, Vite and web-preview guard precede packaged builds | `src/app`, `store`, `views`, `render`; `electron/{main-window,ipc-handlers,security}.cjs`; root `preload.cjs` |
| Nexus Mobile | `src/main.tsx` → `App.tsx`; Capacitor serves `dist` | React/Vite; security/UI tests and TS check before Vite; Capacitor sync/open are distinct native steps | Mobile shell/nav; local stores; `lib/mobileReminderService.ts`; `android`, `ios` |
| Nexus Code | `src/main.jsx` → `App.jsx` → `app/useNexusCodeBoot.js` → `pages/Editor.jsx`; Electron `electron/main.cjs` | React/Vite, CodeMirror 6, Electron; build runs markup tests and a narrow TS config; separate JS typecheck and smoke scripts | `src/ide`, `pages/editor`, `components/editor`, `theme`, `testing`; `electron/services` |
| Nexus Code Mobile | `src/main.jsx` → `App.jsx` → `pages/Editor.jsx`; Capacitor `dist` | React/Vite, Monaco; build runs `test:security` then Vite, with no typecheck step | `lib/nativeFS.js`, `components/editor`, local-storage editor persistence, native project trees |
| `packages/nexus-core` | `src/index.ts`, plus direct subpath imports and `src/api` alias | `main: src/index.ts`, no compiled distribution/exports boundary; peer React 18/19; checks reuse a client's TypeScript binary | render, motion, API, views/liveSync, canvas, settings, notes, code, reminders, devtools |
| Nexus Wiki | `src/main.tsx`, Wiki pages and data catalogs | Independent Vite project; `build:ci` adds bundle budget and i18n checks | `src/data/wikiEntries*`, `src/pages`, `scripts`; Pages workflow |
| Root orchestration | root `package.json`, `tools/*` | Setup/dev/build/release commands invoke projects; some commands discover sibling/private tools | CI YAML, release evidence, signing/checksum scripts |

The shared source aliases in all four Vite configurations map `@nexus/core` to `../packages/nexus-core/src` and `@nexus/api` to its `api` subtree. Main/Mobile also explicitly deduplicate and alias React. These are source-resolution conventions, not separately versioned installed package contracts. The single-React verifier passed.

The workspace's other repositories are not part of this audit. Public orchestration scripts reference optional or required sibling control/launcher/website projects; those references are build coupling, not evidence that their implementations are contained here. The existing ecosystem verifier conditionally read sibling checks on this host. No private backend audit or Cloud certification is implied.

## Tracked-source census

Method: `git ls-files -z` at `d39cfa2`; count tracked `.ts/.tsx/.js/.jsx/.mjs/.cjs/.css` text using newline splitting. Exclude `android`, `ios`, `dist`, `build`, `release`, `node_modules`, `assets`, and `public` directory contents. Counts include blank lines, comments, declaration files, local tests/configuration and retained scaffold code. A trailing newline counts an extra split item. They estimate maintenance surface, not executable or unique LOC.

| Area | Files | Approximate lines |
| --- | ---: | ---: |
| Nexus Main | 207 | 87,559 |
| Nexus Mobile | 121 | 39,525 |
| Nexus Code | 191 | 66,241 |
| Nexus Code Mobile | 98 | 16,233 |
| Shared core source | 91 | 15,599 |
| Shared core tests | 4 | 334 |
| Wiki | 20 | 6,643 |
| Root tools | 34 | 6,014 |
| Total screened text | 766 | 238,148 |

There were 1,050 tracked files before this audit. 157 are under native Android/iOS trees. Those contain real configuration alongside generated/template infrastructure; inspect app IDs, permissions, lifecycle hooks and packaging, but do not count platform boilerplate as domain architecture. Lockfiles and `.tsbuildinfo` are dependency/build evidence, not authored feature implementation.

Useful distribution within the text census:

| Subsystem grouping | Approximate lines | Interpretation |
| --- | ---: | --- |
| Main views / stores / app composition | 47,678 / 4,880 / 3,823 | View directory includes substantial feature CSS and controller logic |
| Main root `index.css` | 18,357 | Dominant global styling surface; separate analysis in 08 |
| Mobile views / stores | 23,307 / 3,734 | Significant independent domain/UI implementation |
| Code page/model directory / components / IDE | 17,337 / 26,044 / 3,365 | Models and editor engine already provide extraction boundaries |
| Code Electron / testing / scripts | 5,057 / 6,372 / 1,882 | Platform services and test harnesses must not be mistaken for view bloat |
| Code Mobile components / pages | 12,152 / 1,853 | Includes copied UI scaffolding |
| Core canvas / API / render / settings / motion | 3,867 / 3,078 / 2,625 / 905 / 725 | Core contains both pure contracts and React/browser runtime code |

Do not infer rewrite priority from these figures. Code's largest source-text file is the 3,632-line `src/testing/ideCoreSmoke.mjs`, a test asset. Many `components/ui/*` files in the two Code clients are copied Radix-style primitives and are not reached from current production imports. The inventory counts them conservatively; it does not claim all are live product source. Copy/reachability methodology is in 06/08.

## Build and native boundaries

- Main's active CJS bootstrap and root CJS preload coexist with TS/JS alternatives and `tsconfig.electron.json`. The manifest points at CJS; no current package build command invokes the Electron TS config. The alternate paths need explicit reachability confirmation before deletion.
- Native projects use stock Capacitor host entry files and app-specific configuration. `Nexus Mobile/capacitor.config.ts` and `Nexus Code Mobile/capacitor.config.ts` set `webDir: dist`. Mobile file persistence in Main's companion is still web storage; Code Mobile adds Capacitor filesystem operations.
- Native notification integration is present in tracked configuration: Mobile declares `@capacitor/local-notifications`, Android includes `:capacitor-local-notifications` in `capacitor.settings.gradle` and `app/capacitor.build.gradle`, and iOS declares `CapacitorLocalNotifications` in `App/Podfile`. This establishes intended native linkage, not successful permission/background delivery. Generated configuration is excluded from product LOC but remains relevant runtime evidence. The app manifest alone is not the merged Android manifest, so omitted permission declarations there are not sufficient to claim a broken plugin.
- Host installer commands differ: Main's `electron:build:all-platforms` currently delegates to host packaging; Code's corresponding installer script chains macOS, Windows and Linux. A script name is not a platform guarantee.
- Wiki's manifest includes `nexus-workspace: file:../..`, outside the public repository root, and root setup does not list Wiki among `EXTRA_PROJECTS`. Treat public clean-clone reproducibility separately from this populated workspace.

Evidence: each application's `package.json`, Vite/TS configs, native configs; `tools/setup-ecosystem.mjs`, `tools/build-ecosystem.mjs`, `tools/release-gate.mjs`, `tools/lib/api-source.mjs`, and `.github/workflows/*`.

## Tests and documentation

Test families are Node tests, IDE model smoke scenarios, Vite/browser visual harnesses, Electron/security scripts, source-pattern gates and template native tests. There is no single root behavioral test suite covering all feature lifecycles. The definitive inventory/results and missing protections are in [09](09-test-protection-plan.md).

Documentation spans root governance/product docs, `docs/*`, Main's architecture/guides, each application README, Code's testing/release docs, Wiki data, historical prompts/plans and timestamped release evidence. These are different authority levels. [10](10-documentation-drift.md) classifies them without editing or deleting historical documents.
