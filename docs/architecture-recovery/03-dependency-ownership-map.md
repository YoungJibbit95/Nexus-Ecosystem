# Dependency and ownership map

Evidence IDs refer to [02](02-current-architecture.md#evidence-index). Current owner means the implementation module, not a presumed team. `.github/CODEOWNERS` assigns a general repository owner; it does not establish per-domain runtime ownership. Primary classifications and sequencing are in [14](14-subsystem-health-matrix.md).

## Subsystem contracts and owners

| Subsystem / purpose | Current implementation owner | State / persistence owner | Public or internal contract | Dependencies → consumers |
| --- | --- | --- | --- | --- |
| Application shell: boot and composition | Main/Mobile `App.tsx`; Code `useNexusCodeBoot.js`; Code-Mobile `App.jsx` | Local React state/refs; last-known view/session preferences | Bootstrap stages, retry, fallback and runtime start/stop | Core API/render + client config → all view hosts [E02] |
| Authentication: establish account identity | Main App helpers; Code `accountSession.js`/`nexusApiClient.js`; Code-Mobile App/sessionLogout | React session + sessionStorage; localStorage device/remember hints; external server identity | Expiry, tier normalization, logout cleanup, `canStartWorkbench` | fetch/core user context → boot/view guards [E02,E03,E21] |
| View runtime/navigation: visible capabilities | Core `views.ts`/`liveSync.ts`; client registries/hosts | Core metadata, control caches, shell availability/mounted arrays; local nav preferences | View IDs, command IDs, layout/panel schema, validation result | Core policy + client loaders → sidebar/toolbars/views [E03,E04] |
| Workspace domain collections | Both `store/appStore.ts` | Zustand domain arrays mixed with open IDs/dirty flags/activity; client IndexedDB | Note/Task/Reminder/CodeFile/Folder shapes; CRUD and linking actions | genId/storage → Notes, Tasks, Calendar, Files, Flux, Dashboard, terminal [E05] |
| Notes: writing and knowledge links | Notes views and analysis/draft/magic helpers | app-store Notes + React draft/undo/ref state; IndexedDB + UI localStorage | Note IDs/content/tags, save/open/close, knowledge helpers | app/theme/canvas/workspace + core notes → editing, planning capture, exports [E12] |
| Tasks: planning and dependencies | Tasks views plus app-store task actions | app-store Task array; local composer/filter/focus state; IndexedDB | Status, priority, dependencies, subtasks and linked entity IDs | app/workspace/core today → Calendar, Flux, Dashboard, Canvas links [E05,E15,E16] |
| Reminders: due/snooze/notify | Reminder view/checker; Mobile reminder service | app reminders; per-view fired IDs; service permission/scheduled-ID caches; IndexedDB + quiet-hour keys + native scheduler | Due time, repeat/snooze, completion, native schedule/cancel | app store + notification adapter → due UI, native/toast delivery [E13] |
| Calendar: planning projection | Main `CalendarView.tsx` and `icsImport.ts` | Tasks/Reminders canonical; local date/mode/import preview | Calendar item projection, drag reschedule, ICS parse/map warnings | app store → Main calendar and task/reminder updates [E15] |
| Canvas: visual planning | Client canvas stores, stage/node/controller modules | Separate client Canvas arrays; viewport/selection/drafts/history session state; IndexedDB | Nodes/edges, link IDs, normalization, gesture and history behavior | app/theme, core camera/render/templates → boards, Files and backups [E14] |
| Workspace membership and handoff | `workspaceStore.ts`; Main `useWorkspaceSync`; Mobile Files/handoff store | Membership ID arrays, active ID, disk root, checkpoint; localStorage + exported files | Membership assignments, runtime snapshot v1, merge/replace | app/canvas stores + platform IO → Files, Dashboard, Settings [E05,E09,E11] |
| Main backup/restore | `workspaceBackup.ts` + SettingsBackupRestorePanel | IDB snapshot catalog; five store domains at restore | Schema v1, preview/conflicts, pre-restore backup, checksum field | All local stores/theme bridge → Settings backup UX [E10] |
| Flux: local activity and review queue | Client Flux views | Derived from app arrays/activity; persisted filter/focus preferences | Severity/time ordering, quick actions, target navigation | app stores → Flux UI and underlying task/reminder/note actions [E16] |
| Embedded Code archive | Main/Mobile `CodeView.tsx` + `codeArchive.ts` | Existing app-store code/folders; ephemeral search | Read-only route; JSON format `nexus-code-archive` v1; individual downloads | app/theme stores → compatibility access/export [E17] |
| Settings/theme/design | Client theme stores/settings panels; Code theme resolver/settings | Main/Mobile theme store; Code settings state; localStorage; shared snapshot schema | Existing presets/tokens plus export/import/section reset | core settings/render, browser DOM/CSS → all product UI [E18,E19,E24] |
| Render runtime | Core coordinator/budgets/invariants, client adapters | Per-client bridge/coordinator registries, profile/budget state; no domain persistence | Surface lifecycle, capability owner, diagnostic subscription | browser measure/schedule → Glass/interactive surfaces/diagnostics [E20] |
| Motion runtime | Core motion/surface motion; client wrappers | Derived from theme/device/profile; client event/RAF state | Motion families, reduced-motion/degradation, transform ownership | render profile + browser/Framer → shell and interaction animation [E20] |
| Main/Mobile storage engine | Both copied `store/persistence/*` | Debounced maps/ref caches, IDB and localStorage fallback | Zustand `PersistStorage`, segment keys and hydration semantics | browser storage/schedulers → app/canvas/theme/terminal stores [E06,E07] |
| Code local file storage | Both `editorShared.jsx`/`storageManager.js` | Index/content keys and module caches; localStorage | Legacy read, segmented v2 files, settings read/write | browser storage → Editor file arrays and local save indicators [E08] |
| Code workbench | Desktop/Mobile `pages/Editor.jsx` | React arrays/tabs/buffers/layout/settings/refs; local files versus native files | Open/edit/save/close, dirty tabs, workspace refresh, commands | components + editor model + IO → workbench panels [E21,E22] |
| Desktop editor/LSP engine | `ide/editor`, `ide/lsp`, `ide/languages`; CodeEditor adapter | Engine/LSP documents and diagnostics; app buffers are inputs | Engine v0.2.0, document URIs/versions, protocol, capability fallbacks | transport + CodeMirror → completion/hover/diagnostics/workspace edits [E21,E27] |
| Git/GitHub/extensions | Electron services; editor models/panels/extensionSystem | Service results; OS-encrypted token file; registry v3 localStorage | Git IPC envelopes, GitHub service shapes, declarative extension contributions | process/network/token adapters → desktop IDE panels/palette/themes [E23,E27] |
| Terminal and preview tools | Main/Mobile terminal stores; desktop Code terminal IPC; mobile simulation/Debug | Command history/macros versus actual process sessions versus sample preview state | Three distinct contracts, not one interchangeable terminal API | domain stores or Electron processes → terminal/debug surfaces [E05,E22,E23] |
| Cloud client/API | Core `api/*`, client boot policy | Runtime caches, in-flight requests, event queues; remote server authority | Catalog/layout/release v2, view validation, start/stop, telemetry | fetch/browser bus → all client shells [E03,E28] |
| Diagnostics/DevTools | Client diagnostic views; core artifacts | Render snapshots, perf data, artifact library/browser storage | Bounded/redacted artifact export; development/access gates | core runtime + browser → developer views and support reports [E20,E26] |
| Electron adapters | Main active CJS modules; Code main/preload/services | Authorized roots, process sessions, token service; real filesystem | `window.api` versus `window.electronAPI`, sender/root/payload checks | Node/Electron → respective renderers [E23] |
| Capacitor adapters | Mobile lifecycle/reminder helpers; Code-Mobile nativeFS | Permissions/keyboard/safe area and native files; web storage remains separate | Plugin schedule/cancel, Documents/Data paths, bridge results | Capacitor plugins → Mobile UX and Code-Mobile filesystem [E13,E22] |
| Release/verification | root tools, per-app scripts and workflows | Build artifacts, evidence/checksum/signature files | Host packaging, checks, release artifact policy | local tools/optional siblings/CI → shipped clients [E01,E25] |
| Documentation/Wiki | Markdown docs and Wiki data/pages | Independent edited source; generated web build | Public guidance, historic plans, product capability claims | implementation/release evidence → users and future agents [E29] |
| Legacy/scaffold candidates | Alternate Electron sources, unused editor scaffolds and dormant hook | No confirmed current runtime owner | Compatibility exports/config references must be checked | No current production importer for named candidates; see 08 |

## Failure modes, debt and existing protection

This table completes the subsystem profiles above. “No targeted test found” is a repository-search result, not a claim that a feature never receives manual testing. A passing build is not behavioral coverage.

| Subsystem | Existing protection observed | Known failure or concrete architectural risk | Migration risk |
| --- | --- | --- | --- |
| Shell | Source gates; selected UI/login tests | Many effects jointly own runtime, fallback, preloading, auth and theme; cached hidden effects survive | High |
| Auth | Main/Code-Mobile logout tests; Code session smoke | Policy differs across clients; replacing boot can unintentionally change local/protected access | High |
| Views/navigation | Core manifest scan; Main wired-command source test | Several lists; calendar omitted from verifier's 11-name list; metadata still describes editing in archive | Medium-high |
| Domain collections | Indirect consumers; no comprehensive CRUD/referential suite found | UI confirmation in store (`safeClose*`); deletes do not centrally reconcile workspace/link references | High |
| Notes | Worker/helper extraction; privacy/source checks | Saved marker precedes durability; same-ID external restore need not reset ID-keyed draft; cross-domain mutations in view | High |
| Tasks | Derived helper use; no targeted task-transition suite found | Subtask paths and timestamps differ from updateTask; dependencies/linked entities are weak references | High |
| Reminders | Template helpers; no delivery lifecycle suite found | Checker mounted by view; native scheduling caches are process-local; overlapping async reschedules need testing | High |
| Calendar | Separate ICS parser, no dedicated date/ICS suite found | Date/timezone/recurrence mapping embedded near UI; no Mobile Calendar route | Medium-high |
| Canvas | Persistence sanitizers, no comprehensive gesture/history/handoff suite found | Main flat planning schema versus Mobile `pm`; separate history/normalization and graph mutations | High |
| Workspace/handoff | Source-pattern Files test; preview/checkpoint UX | Unwired Auto-Sync; several direct store writers; shallow snapshot parse; membership can dangle | High |
| Backup/restore | Source gate and pre-restore backup UX | Checksum not checked; incomplete shape can throw; sequential store replacement has no all-or-nothing boundary | High |
| Flux | Source hardening test | Domain projection and command behavior remain duplicated in views; source names can outlive targets | Medium |
| Code archive | No dedicated archive roundtrip suite found | Active compatibility asset; old commands/create-code paths elsewhere still need product alignment | Low-medium |
| Settings/design | Shared parser, theme normalization; source UI checks | Theme is real owner; shared singleton is not active owner; lossy snapshot mappings and cascading overrides | High for visual equivalence |
| Render | Typecheck, invariant implementation, source gates | Runtime allocations/lifecycle not protected by focused behavioral suite | Medium-high |
| Motion | Shared functions and wrappers, no dedicated motion matrix suite found | Framer/CSS/Three still need surface-property ownership verification | Medium |
| Main/Mobile storage | No durability suite found | Early fallback removal and dropped failed batches reproduced with a fake IDB open failure | Very high |
| Code local storage | No migration suite found | Legacy content loss on second load reproduced for both clients | Very high |
| Workbench | 52 desktop model smokes; UI/visual harness exists | Draft arrays/refs/tabs/editor models; save callback consults current active tab after delay | High |
| Editor/LSP | Multiple successful protocol/document/capability smokes | Real server crash/large-file/device behavior remains outside synthetic coverage | Medium |
| Git/extensions | Passing model/service smokes; security runner exists | Broad GitPanel/GitHub services and registry module; OS/network integrations unexecuted here | Medium-high |
| Terminal/preview | Selected IDE model checks; mobile Debug labeling test passes | Similar UI names conceal domain dispatcher/process/simulation; lifetimes differ | Medium-high |
| Cloud client | Source gates, timeout/capability implementation; policy test currently unloadable | Client helpers typed `any` access internal client fields; per-client duplicated boot policy | High |
| Diagnostics | 13 core tests include execution/artifact boundaries | Dev-only policy test omitted/broken; redact/export and access are separate concerns | Medium |
| Electron | Main canonical path/sender tests pass; desktop smoke/security tooling exists | Keep active entry selection explicit; split handlers without weakening checks | High |
| Capacitor | Static config and selected mobile source tests | Native plugin availability, background delivery, permission and filesystem roundtrip not run | High |
| Release | Release signing/checksum tests pass | Icon verifier stale; build/typecheck scopes differ; sibling discovery changes gate surface | Medium-high |
| Docs/Wiki | Encoding gate; Wiki i18n/budget scripts exist | Multiple overlapping truth sources and unqualified historical completion flags | Medium |
| Legacy candidates | AST inventory plus targeted searches/history | Config/dynamic/worker consumers can evade static graph; deletion is not yet approved | Medium |

## Boundary violations that matter

1. **UI → multi-domain write:** Notes planning/canvas generation calls `useApp.getState()` and `useCanvas.getState()` directly; Settings restore sets five stores; Files import sets app/canvas/workspace stores. Add explicit use-case functions before splitting files. [E09–E12]
2. **Store → UI decision:** `appStore.safeCloseNote/safeCloseCode` call browser confirmation. A headless domain command cannot be tested or reused without UI policy. Preserve current prompts through an adapter. [E05]
3. **Domain type → client store:** consumers import Note/Task/Canvas types from client stores. Core's parallel types do not remove this ownership. The initial-data imports back into appStore are type-only and are not evidence of a runtime cycle. [E05,E14]
4. **Runtime → feature policy:** shared view-access fallback hardcodes client-specific free views; shell configs also enumerate safe views. This is intentional product policy scattered across owners, not just a generic utility concern. [E02,E03]
5. **Theme → whole UI:** 55 distinct static importers for Main themeStore, 44 for Mobile; Main canvasStore has 43, appStore 28. Count includes types/tests. Broad imports explain change blast radius better than file size. [08]

6. **Configuration → loader → diagnostics → configuration:** Main `app/mainAppConfig.ts:3` imports `VIEW_IDS` from `app/viewPreload.tsx`. That loader dynamically imports `views/DevToolsView.tsx:24`, whose static dependency `views/devtools/ReleaseHealthDashboard.tsx:21-22` imports both configuration and the loader. A type-filtered import-graph pass found this four-file strongly connected component. The closing loader edge is lazy, so this is not evidence of a synchronous initialization failure. It does make configuration consumers depend on a UI-loading module, which also eagerly imports Dashboard. The existing `mainViewRegistry.ts` already owns `MAIN_VIEW_IDS`; future cleanup can draw metadata from that boundary after preload/diagnostics characterization. [E31]

No static import from core back into a client was found. The cycle above is a concrete dependency loop with a lazy edge; no runtime cycle defect was reproduced. Type-only store/model feedback edges were excluded from the cycle pass. The graph covered literal imports/re-exports/dynamic imports/require, not runtime-generated paths or external consumers.
