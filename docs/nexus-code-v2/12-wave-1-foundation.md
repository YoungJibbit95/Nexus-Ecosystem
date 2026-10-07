# Wave 1 foundation — implemented boundaries

Date: 2026-10-01. Integration base: `0cb408b02f4ba54f0626b4031d73541b8cb94287`. Historical audit: `642bde6`, implementation `10f8684`. [Reconciliation](11-main-reconciliation.md) preserves the original finding/evidence and verifies the already integrated Windows runner fix. Wave 2 has not started.

## Platform contract and compatibility

`Nexus Code/src/platform/contracts.ts`, `platform.ts`, `bridgeAdapter.ts` and `errors.ts` define six ports: **window, workspace, terminal, git, github, lsp**. They invoke only the existing named preload functions. Main/preload/channel validation and production account policy are unchanged. There is no parallel IPC or global bridge declaration to disguise legacy errors.

Each operation returns `PlatformResult<T>`: `{ok:true,data:T}` or `{ok:false,error:PlatformError}`. Errors contain a stable `code`, safe `message`, `operation`, `retryable`, and optional allowlisted `technical.kind/nativeCode`. Raw host paths/messages/stacks/tokens are never copied into the public result. Existing thrown filesystem/preload errors and native service envelopes normalize here; localization of the existing workspace-selection denial is covered by actual native regression. Existing outer error/retry/revision handling continues to receive a safe `PlatformOperationError` via `requirePlatformData`.

| Contract | Exact semantics |
| --- | --- |
| Capability | `available/degraded/unavailable` plus missing operations. Measures bridge function presence, not server installation, account connection or successful process launch |
| Browser | Explicit browser adapter reports desktop capabilities unavailable. Existing browser virtual-file behavior remains in its owner; this adapter invents no native success |
| Test | `createTestPlatform(bridge)` explicitly identifies injected doubles; a browser fixture object without the actual `isElectron:true` marker is not selected as production |
| Workspace | Picker cancellation stays `null`; text stays UTF-8 string including empty/Unicode/EOL. Directory entries validate name/path/directory fields. Mutations require the existing `true` acknowledgment; false/missing acknowledgments cannot clean a dirty document |
| Window/terminal/LSP notify | Existing send operations acknowledge dispatch only. They do not certify completion. Process exit/output and window query/events remain separate |
| Git/GitHub/LSP requests | Existing `{ok,data/error}` envelopes are required. Unmigrated domain payloads remain `unknown`; callers must validate them before use. Git/GitHub options are JSON values; device-flow string and object forms remain supported |
| Subscriptions | Typed payload filtering, session IDs where already present, idempotent disposer and safe teardown result; late callbacks after disposal are ignored. No new CustomEvent/IPC transport |

Migrated production consumers: **all 12 raw bridge references in Editor** (workspace folder/read/write/mkdir/rename/delete and OS separator) and **five window operations in TitleBar** (query, subscription, minimize, maximize, close). The injected `writeFile` still serves the existing shared save queue. Terminal/Git/GitHub/LSP UI and their legacy transports are not broadly migrated; their ports establish the contract for later waves.

## One command authority and one extracted responsibility

`src/workbench/commands/commandRegistry.ts` owns stable identities, aliases, title/category/default shortcut/search terms, dynamic availability/disabled reason, and exactly one handler dispatch. Duplicate identities/aliases fail registration. Unknown/disabled commands and thrown handlers/availability checks yield safe results. The legacy editor command descriptions continues supplying localized labels/icons/ranking for compatibility; it is not the handler authority for this slice.

`workbenchCommandController.ts` extracts **panel/settings command routing only** from Editor. Its `WorkbenchCommandOwner` reads/writes the existing dock state and accepts the existing open/toggle dock functions and React setters. No mirrored state/store, document controller or new writer was introduced.

| Canonical ID | Preserved aliases | Existing paths now sharing dispatch |
| --- | --- | --- |
| `workbench.toggleSidebar` | `toggle-sidebar` | Ctrl+B, TitleBar view/workbench menus/buttons, palette/Spotlight |
| `workbench.openSettings` | `open-settings`, `change-theme` | Ctrl+comma, TitleBar Tools/workbench menus, palette/Spotlight, existing extension settings route |
| `terminal.toggle` | `toggle-terminal` | Ctrl+backtick, TitleBar Tools/workbench/buttons, palette/Spotlight, existing bottom/status callbacks |
| `terminal.open` | `terminal.new` | Ctrl+Shift+backtick and existing extension terminal route; this opens the existing panel, not a new PTY/session |
| `workbench.openExplorer` | `open-explorer` | Palette/Spotlight |
| `workbench.openSearch` | `open-search` | Ctrl+Shift+F, palette/Spotlight |

Palette and Spotlight retain separate components/visuals/ranking. Both models overlay registry availability; disabled selection does not invoke a handler. TitleBar menus and keyboard callbacks use the same Editor registry wrappers. Their existing display metadata remains compatible; complete menu/keybinding metadata migration is deferred. File/save/format/rename/definition, focus/layout/docking, rail visibility/zen, Git, extensions and other actions remain legacy. The removed Editor bodies are sidebar toggle, terminal open/toggle, settings opening and duplicate palette routes for this slice. Existing side-docked terminal behavior and sidebar/zen effects are explicitly protected.

## Current ownership interfaces

This is the **implemented current state**, not an assertion that every target domain service exists. The target architecture remains in [03](03-target-architecture.md).

| Domain | Canonical owner now | Derived state | Persistence owner | Platform dependencies | Public commands/events | UI consumers |
| --- | --- | --- | --- | --- | --- | --- |
| Workbench | Editor React panel/tab/layout state; existing dock/focus models; new bounded command controller owns panel/settings intent | Slots, visibility, labels, sizes, focus availability | Existing queued layout/settings readers/writers and tab restoration | Window port through TitleBar; injected legacy dock model | Six commands above; existing focus/dock callbacks remain legacy | TitleBar, activity/sidebar/bottom/status, palette/Spotlight |
| Documents | Shared `useEditorPersistence`, repository, revision/save queue and mutation guard; CodeMirror per-document session owns selection/undo | Dirty/save status, active buffer, tab display | Existing shared repository/queued native writer; no second save queue | Workspace write port injected by Editor; legacy document/provider operations | Existing save/Save All/code-change/tab callbacks; future facade deferred | Editor/CodeEditor/tabs/status/storage notice |
| Workspace | Editor workspacePath/files/tree request generation plus current tree models; main owns canonical allowed roots | Flattened/lazy nodes, open tab references, search candidates | Existing file repository and workspace restore; main's selected root remains native authority | Workspace port now used by Editor; SearchPanel legacy bridge remains | Existing folder/file/rename/delete/refresh callbacks; new Explorer/Search commands route panels | Explorer, Editor, search/Spotlight |
| Language Services | Existing LSP service/client/transport and editor provider lifecycle; main owns processes | Capabilities, diagnostics/decorations, completion/status | Existing settings/server setup; diagnostics are runtime state | New LSP port available, existing transport still legacy | Existing document notifications/requests and provider results; no new event channel | CodeEditor, Problems/status, LSP settings |
| Terminal | Existing TerminalPanel/session/output model and main stdio processes | Bounded visible output/session status | Existing terminal settings; session/output are runtime | New Terminal port, existing TerminalPanel raw bridge still legacy | New terminal panel open/toggle intent; existing run/input/kill/output/exit/ready | TerminalPanel, toolbar, status, tasks/extensions |
| SCM | Existing Git/GitHub panel query/mutation state and main Git/GitHub/auth services | Files/staged/diff/remote lists and request status | Git repository on disk; main secret storage; existing settings | New Git/GitHub ports; current models/UI bridge still legacy | Existing local/remote actions and events; no live mutation added | Git/GitHub/issue/PR/project panels |
| Settings | Editor's settings object, legacy loader, new seven-key schema and existing keybinding/theme normalizers | Resolved theme, settings metadata/search, shortcut rows | Existing queued `settingsStorage` key `nexus-code-settings`; acknowledged settings persistence still deferred | No native dependency for schema; LSP setup remains legacy | Existing onUpdate/queued write; `workbench.openSettings` controls view only | Existing SettingsPanel, Editor, CodeEditor, palettes/chrome |

## Settings compatibility

`src/settings/settingsSchema.ts` adds metadata/default/type/category/validation/normalization for theme, font family, font size, tab size, word wrap, auto save, keybinding overrides. The existing loader first applies its historical theme/visual/shortcut normalizers, then the schema. No storage key/version/default queue changed; no Settings UI rewrite.

Legacy numeric strings still coerce; font size clamps to 10–28 and tab size to 2–10. Invalid boolean/string values use safe existing defaults with structured schema issues. Stored unknown top-level keys and nested values survive default merging and JSON round trips. Compatible future/extension shortcut IDs with string values survive; known commands retain the old normalizer's validation and default-removal behavior. Invalid shortcut values are rejected. Custom extension theme strings are not silently replaced by the schema. Runtime settings retain an open `unknown` compatibility record while the validated subset has explicit types.

## Evidence and remaining limits

[Type inventory](13-diagnostics.md): **4,353 before, 4,270 after, zero introduced, 83 removed**. New foundation files have zero diagnostics under both full check and strict new-boundary gate. Full JS check still exits 2; inherited JSX/model errors remain enumerated.

Focused tests: 20 pass; strict foundation typecheck passes. Actual compiled adapters pass seven native checks through production main/preload, keeping the account gate, path/protected/symlink guards, acknowledgment/bytes/rename/delete, window query/offline service envelopes and real runner stdout/stderr/stdin/exit with a spaced path. The first native attempt exposed a localized error-classification gap; it is fixed and retained separately as development evidence. The historical harness passed 10/10 before implementation without modifying it or fixing the runner again.

Lint, 52 IDE-core scenarios, 36 SSR fixtures, security regression, markup/build and ecosystem/browser persistence checks pass; exact final results/scope are in [09](09-test-strategy.md). Full historical visual matrix remains 119/120; its isolated successful recheck does not certify a fresh full pass. Native checks are Windows/disposable/signed-out. No authenticated production Editor, live LSP/GitHub mutation, installed restart/force-kill/upgrade, DAP or PTY acceptance is claimed.

Next: **Wave 2 semantic UI tokens and primitives** after a new `weiter`, starting with the CSS/token inventory and existing PanelChrome. Workbench/Settings/Git/Terminal UI, globals.css, engine, auth policy, shared persistence and preload security were not redesigned in Wave 1.
