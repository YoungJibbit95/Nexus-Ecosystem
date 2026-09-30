# IDE capability model

Product status is independent from UI presence. [Feature status](feature-status.md) is the authoritative current ledger; “real” means an actual implementation exists, not every supported platform/account combination was accepted. Runtime-tested paths and limits are stated separately.

## Current reality and V2 promise

| Area | Current implementation | V2 supported promise / acceptance |
| --- | --- | --- |
| Projects/files | Canonical native workspace, lazy tree, bounded reads/writes/rename/delete; browser local repository | Workspace-scoped IO, recents, watcher and explicit dirty conflicts; native restart/upgrade acceptance |
| Editing | CodeMirror 6, tabs/drafts, syntax, find, local hints, shared save revisions | Per-document undo/selection, trustworthy saves, tab lifecycle, visible large-file mode |
| Language intelligence | Local heuristics plus optional real LSP subprocesses | Per-language/method readiness, no grammar-equals-server claim; actual server fixtures |
| Search | Real but capped/loaded-tree scope; separate recursive Spotlight; local symbols | Consistent scope/cancellation/limits and document-aware safe replacement |
| Problems | Real diagnostic normalization/filter/jump; active editor array handoff | Versioned diagnostics for every document, same source for editor/status/Problems |
| Terminal/run/tasks | Real one-command stdio bridge plus simulated browser path/static task templates | Real Runner immediately; interactive Terminal only with PTY/session/resize evidence |
| Git | Real local status/diff/stage/unstage/commit/branch/log/remotes | Focused real repository actions, explicit unsupported network operations, reliable refresh |
| GitHub | Real REST/GraphQL/device auth, issues/PR/reviews/Projects v2 | Separate auth/repo/issue/PR/project state, real errors/rate limits, graded token storage |
| Debug | Generated stacks/variables/pauses; no process adapter | Unavailable/experimental until first real Node DAP acceptance |
| Extensions | Validated local manifests and restricted contributions; simulated install records | Built-in/declarative registry with honest install origin; no VS Code host promise |
| Commands/settings | Existing catalogs + separate dispatch/keybindings; rich panel with old settings writer | Unified registry/schema/acknowledged errors, preserve IDs and stored keys |

## Language tiers

Tier 1 target: JavaScript, TypeScript, JSON, HTML and CSS. Tier 2: Python. Tier 3: Rust, Go, C and C++. Markdown/XML/SQL/Java/PHP and legacy grammars remain syntax features unless separately accepted. JavaScript/TypeScript real-process preset uses `typescript-language-server --stdio`; Python uses pyright, Rust rust-analyzer, Go gopls, C/C++ clangd. Seven language IDs have native server presets today. Binaries must be installed/resolvable (or explicitly configured through the current environment override); the application does not bundle these servers.

JSON/HTML/CSS have native CodeMirror grammars and local assistance, but no native process presets. Native server availability was not exercised in Wave 0. Grammar screenshots validate colored syntax, not semantic language intelligence.

| Protocol feature | Current path | Status / target |
| --- | --- | --- |
| completion | LSP requests + local words/snippets/hints | Real conditional; label source and readiness, version-check responses |
| hover | LSP + local fallback | Real conditional; bounded/cancelable UI |
| diagnostics | publish notifications -> URI map -> active editor parent | Partial workspace ownership; canonical version/source collection |
| definition | LSP request + command/navigation path | Real conditional; exact URI/range acceptance needed |
| formatting | LSP request; local whitespace/JSON fallback | Limited; never advertise Prettier execution from a catalog record |
| code actions | LSP response/edits/command path | Real conditional; document/multi-file mutation validation needed |
| rename | LSP request/edit application | Real conditional; revision-safe multi-file transaction acceptance needed |
| document/workspace symbols | Regex/local extraction | Limited local feature; not LSP symbol service |
| references | No implemented native/provider command path found | Not present |
| signature help | No implemented provider path found | Not present |
| document highlights | No implemented semantic path found | Not present |
| semantic tokens / inlay hints | No implemented provider path found | Not present |

Unavailable means a clear reason (bridge absent, server missing, unsupported method, request failed). Fallback completion must identify itself as local assistance; “Tools 0/7” and red fallback labels are internal telemetry, not sufficient ordinary user explanations.

## Real-runtime acceptance

The native characterization uses production main/preload and real disk/process/Git in a disposable selected workspace. It proves the signed-out production gate remains active, boundary rejection, acknowledged bytes, simple runner and a Git commit. It does not log in or test real GitHub/LSP/DAP accounts/servers. Authentication remains fail-closed; the local token uses sessionStorage and legacy localStorage credentials are removed. Browser fixture success never certifies a desktop capability.

Debug acceptance requires a real target and adapter, breakpoint hit, URI/line identity, stack/variables obtained from the adapter, actual stepping and clean termination. PTY acceptance requires resize, shell continuity, streamed ANSI/control behavior, stdin, exit/cancel and native installer support across advertised platforms. Extension acceptance requires actual validated declarative contributions and provenance; package download/execution is out of core scope until a separate security design.
