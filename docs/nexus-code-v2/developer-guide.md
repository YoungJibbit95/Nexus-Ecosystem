# Developer guide and audit entry points

Read [starting state](00-current-state.md) and [continuation](10-next-session.md) before editing. The primary checkout has a pending merge; this isolated worktree is the Wave 0 artifact. Do not resolve or reset another session's merge implicitly.

| Topic | Authoritative V2 guide | Existing seam to read/test before changes |
| --- | --- | --- |
| Architecture/state ownership | [Target architecture](03-target-architecture.md), [state ADR](decisions/0005-state-ownership.md) | Editor, shared storage contracts and all injected consumers |
| IPC/errors/security | [Security model](07-security-model.md), [IPC ADR](decisions/0006-ipc.md) | main/preload/security/services; native and security harnesses |
| Editor/LSP/diagnostics | [Capabilities](06-ide-capabilities.md), [CM ADR](decisions/0001-codemirror.md) | CodeEditor, ide/editor, ide/lsp, ide/languages and featureModel |
| Git/GitHub | [Subsystem audit](subsystem-audit.md), [security model](07-security-model.md) | gitService, githubService/auth/token storage, GitPanel/models and split remote panels |
| Debug | [DAP ADR](decisions/0003-debug-dap.md) | Current synthetic DebugPanel; new real runtime is Wave 11 |
| Extensions | [Extension ADR](decisions/0004-extensions.md) | Manifest/contribution validation, extensionSystem, consumers and stored records |
| Runner/PTY | [Terminal ADR](decisions/0002-terminal-pty.md) | real main runner, Terminal, env/policy, red native path test |
| Settings/UI | [UI system](05-ui-system.md), [architecture](03-target-architecture.md) | Defaults/catalog/storageManager/consumer keys; PanelChrome and docking models |
| Testing/performance | [Test strategy](09-test-strategy.md), [performance plan](08-performance-plan.md) | Existing scripts plus Wave 0 evidence collectors/native harness |

Before each subsystem migration: read its docs/tests, search every consumer, define current/target semantics, add meaningful protection, implement one compatible boundary, verify, update ledger/checkpoint, commit and stop. Do not use full-file size as rewrite proof or mechanically move folders. Do not introduce an enormous store/Manager, second save queue, arbitrary event bus, mass TS conversion, weaker auth/path guards or production simulated success.

Use the strict future boundary gate alongside the inherited full JS check, never instead of a silently removed gate. The audit's installed junction environment is not a lockfile/CI certification. Measurements and fixture screenshots explicitly state their scope. The exact next bounded work is [Wave 1](04-migration-roadmap.md); no part was implemented in this session.
