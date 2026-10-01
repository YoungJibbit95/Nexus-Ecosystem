# Target product and scope

Nexus Code V2 is a desktop IDE for opening repositories, editing reliably, discovering code, running commands and working with Git/GitHub. Keep CodeMirror 6. Retain the implemented strict Nexus account/release/tier policy. An authenticated editor must dominate the window; failures must explain the unavailable capability and offer a useful next action.

## Core

Workspace selection/recent projects; lazy Explorer; independent documents and tabs; acknowledged saves and recovery; editor search; bounded workspace text search with explicit completeness; shared Problems; Tier 1 language providers; one command palette/quick-open system; keyboard navigation; simple docking; useful status; searchable validated settings; real command execution; local Git status/diff/stage/commit/branches/history; GitHub account/repository/issues/PR workflows.

Tier 1 is TypeScript, JavaScript, JSON, HTML and CSS. Today only TS/JS in that tier have native LSP presets. Tier 2 is Python. Tier 3 is Rust, Go, C/C++. Other grammars remain syntax-only or limited fallback until provider evidence exists. Grammar count never means IDE intelligence coverage.

## Advanced and experimental

Advanced: real workspace rename/code actions, safe multi-file replacements, Git network operations, selective diffs and richer GitHub reviews, each after its own acceptance tests. Experimental: one real Node DAP path, then Python; declarative local extension contributions; PTY integration until signed packaging, resize/input/termination and platform checks pass. A feature may graduate only on explicit evidence.

## Out of scope

VS Code executable extension compatibility, a simulated marketplace, synthetic debugging, language support inferred from syntax alone, cloud IDE/container orchestration, collaboration inferred from the local ecosystem bus, complex recursive docking, simultaneous engine replacement, and a desktop UI compressed into phone widths. Nexus Code Mobile remains separate; shared persistence changes require its compatibility suite.

## Product truth policy

Use the statuses in [feature-status](feature-status.md): STABLE, BETA, EXPERIMENTAL, NOT IMPLEMENTED. Record platform/prerequisites and evidence independently. In-product readiness must be the intersection of implemented provider, available platform, current workspace/session and server capabilities. A button, advertised manifest or synthetic fixture is not evidence that a runtime works.

The current debugger simulation and missing-bridge terminal simulation must leave production-facing capability claims at the first bounded truth-cleanup checkpoint (planned Wave 1 prerequisites/adapters, removal in the relevant wave). Do not reproduce synthetic stacks as characterization requirements. Keep synthetic data strictly in test fixtures when useful.

## Interaction and copy

Primary actions: Open Folder, Open Recent, New File/Scratch. Show Clone only after a real service exists. Essential keyboard routes: command palette, quick open, save/Save All, close/switch tab, search, format/rename/definition when available, terminal and Problems focus. Pick English as the initial coherent workbench language; retain German legacy strings until their component migrates. Extract copy at those boundaries so a future localization system is possible; no repository-wide translation rewrite in Wave 1.

Errors distinguish account/session expiry, API unreachable, release incompatible, permission/tier denial, missing language server and runtime failure. Preserve fail-closed access and disabled automatic workspace live-sync. Describe the recovery action in ordinary language; technical diagnostics belong in a bounded detail/export view.

## Done for V2

The seven flows in [test strategy](09-test-strategy.md) pass on supported platforms or clearly expose an unavailable feature. No production simulation; no dirty-state clearance before matching revision acknowledgment; no silent external overwrite; no unsupported marketplace claims. Supported releases pass native upgrade/restart, keyboard/reduced-motion and installer acceptance. An internal refactor alone does not make this done.
