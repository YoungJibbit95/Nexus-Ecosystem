# Complete subsystem audit

Base `10f8684`, 2026-09-30. Each record states all twelve requested audit fields. “None found” is an inspection result, not proof of absence; “unverified” is deliberately distinct from broken. File paths below are relative to `Nexus Code` unless prefixed `packages/`. Class meanings and wave sequence: [inventory](01-problem-inventory.md), [roadmap](04-migration-roadmap.md). No production behavior changes were made in this packet.

Historical records below remain for provenance. [Current-main reconciliation](11-main-reconciliation.md) marks the quoted-path finding as subsequently fixed (original native harness 10/10). [Wave 1 implementation](12-wave-1-foundation.md) records the bounded adapter/command/settings changes and remaining legacy owners; references below to unimplemented foundations describe the original audit state.

## 1. Application boot — PRESERVE + CLEANUP

- **Current purpose:** mount a policy-valid desktop application. **Actual implementation:** `src/main.jsx`, `App.jsx`, `app/useNexusCodeBoot.js`, lazy Editor, HashRouter, error boundary, shared runtime/API lifecycle.
- **Working:** production signed-out gate and static contracts. **Partial:** authenticated boot acceptance unavailable. **Simulated:** none found. **Broken/unreliable:** no reproduced boot failure; full type gate fails elsewhere.
- **Technical debt:** boot hook combines multiple policy/lifecycle stages. **Security risk:** preserve fail-closed gates and public-config/secret distinction. **Performance risk:** boot instrumentation exists but authenticated TTI unmeasured. **UX problems:** verbose implementation-oriented gate copy.
- **Target state:** focused boot stages with explicit outcomes. **Migration strategy:** retain behavior, extract only proven seams after tests; foundation interfaces in Wave 1.

## 2. Authentication/account — PRESERVE + CLEANUP

- **Current purpose:** validate Nexus session/account/tier. **Actual implementation:** local accountSession/nexusApiClient plus shared access policy, screens/panel; sessionStorage token and legacy localStorage removal.
- **Working:** signed-out workbench stays unmounted; mocked no-localStorage-token regression. **Partial:** live sign-in/reconnect and native restart restoration not exercised. **Simulated:** none in active auth path; unused older AuthContext/base44 scaffolds are removal candidates. **Broken/unreliable:** Remember-device copy is ambiguous, but its flag really is forwarded to the backend; no ignored-flag defect is claimed.
- **Technical debt:** stale parallel scaffold and mixed account/remote GitHub concepts. **Security risk:** token lifetime/handling must remain unchanged. **Performance risk:** validation/network stages can delay boot. **UX problems:** German/English mixture and internal status codes.
- **Target state:** clear account states matching actual lifetime. **Migration strategy:** preserve policy, characterize request/error transitions, correct copy without inventing offline/login bypass.

## 3. Release compatibility/access — PRESERVE + CLEANUP

- **Current purpose:** block incompatible/unauthorized views. **Actual implementation:** boot release/tier validation, shared policy, `viewValidationFailOpen:false`, background synchronization disabled.
- **Working:** fail-closed contract. **Partial:** live version/backend matrix unverified. **Simulated:** none found. **Broken/unreliable:** no reproduced failure; historical PR CI failures do not prove runtime gate defects.
- **Technical debt:** intertwined boot decisions/error presentation. **Security risk:** never enable fail-open to ease UI testing. **Performance risk:** sequential remote checks. **UX problems:** implementation codes obscure retry/action.
- **Target state:** explicit compatible/incompatible/unavailable results. **Migration strategy:** adapter/error model; preserve server policy and release semantics.

## 4. Workbench/Editor orchestration — PARTIAL REWRITE

- **Current purpose:** coordinate every IDE surface. **Actual implementation:** `pages/Editor.jsx` 88,702 bytes/2,363 lines, 21 direct states/12 effects, direct bridge consumers, shared injected persistence.
- **Working:** panel/file/editor composition and useful pure models. **Partial:** canonical document/workspace/diagnostic ownership. **Simulated:** mounted Debug/extension surfaces; real terminal path also exists. **Broken/unreliable:** fixture shell wastes width; live authenticated resize unverified.
- **Technical debt:** commands, domain state, IO, layout/settings and rendering in one owner. **Security risk:** scattered bridge assumptions. **Performance risk:** broad rerenders and heavy static panel imports. **UX problems:** crowded/duplicated chrome.
- **Target state:** composition-only Workbench with bounded controllers. **Migration strategy:** one tested seam at a time, retain models/IDs/persistence; never create a replacement god component.

## 5. Title bar — PARTIAL REWRITE

- **Current purpose:** window controls, menus, workspace identity/actions. **Actual implementation:** `components/editor/TitleBar.jsx`, native window bridge, independent menu action wiring.
- **Working:** controls/menu rendering. **Partial:** platform/window/keyboard interaction acceptance. **Simulated:** none found. **Broken/unreliable:** focus/menu behavior not established by SSR.
- **Technical debt:** duplicate global actions and command metadata. **Security risk:** external/window actions must stay validated. **Performance risk:** low, shared motion effects. **UX problems:** too many competing buttons and traffic-light/menu density.
- **Target state:** compact command center and accessible menu. **Migration strategy:** registry first, UI Wave 3; verify Windows/macOS controls and keyboard menus.

## 6. Activity/sidebar navigation — PARTIAL REWRITE

- **Current purpose:** select panels/global account/settings. **Actual implementation:** `Sidebar.jsx`, Editor panel IDs and focus/dock models.
- **Working:** stable panel selection/model helpers. **Partial:** all icons' tooltip/focus semantics and narrow layouts. **Simulated:** navigation exposes synthetic Debug features. **Broken/unreliable:** fixture short-wide side panel obscures central space.
- **Technical debt:** many panel identities and local visual variants. **Security risk:** availability must reflect platform/account capability. **Performance risk:** unnecessarily mounted surfaces. **UX problems:** rail has many competing icons.
- **Target state:** narrow stable rail, settings bottom, explicit labels/active/focus. **Migration strategy:** reuse IDs/layout model, rebuild navigation composition in Wave 3.

## 7. Side-panel framework — PRESERVE + CLEANUP

- **Current purpose:** consistent headers/toolbars/content states. **Actual implementation:** `panels/PanelChrome.jsx` plus feature-specific panels.
- **Working:** shared primitives and fixture renders. **Partial:** adoption, keyboard focus, uniform loading/error states. **Simulated:** feature contents can be synthetic, chrome itself is real. **Broken/unreliable:** no proven model failure.
- **Technical debt:** duplicate feature headers/card patterns. **Security risk:** generic chrome must not own platform actions. **Performance risk:** effects/layers repeated across panels. **UX problems:** inconsistent density and repeated headings.
- **Target state:** one frame with standardized empty/loading/error states. **Migration strategy:** evolve current primitive, migrate panel-by-panel; delete styles only after consumers move.

## 8. Docking/layout — PRESERVE + CLEANUP

- **Current purpose:** side/bottom positions, size/visibility/focus persistence. **Actual implementation:** normalized `pages/editor` docking/focus models, left/right/bottom/hidden zones and presets.
- **Working:** pure model smoke cases, persisted normalization. **Partial:** actual drag/resize/keyboard/platform behavior. **Simulated:** none found. **Broken/unreliable:** generic fixture geometry does not prove usable layout.
- **Technical debt:** panel controls/composition tangled with Editor. **Security risk:** low; validate persisted values. **Performance risk:** resize updates and paint. **UX problems:** preset codes and multiple dock controls.
- **Target state:** predictable resizable layout with editor priority. **Migration strategy:** keep normalized model/readers; add interaction assertions before Wave 3 composition changes.

## 9. Bottom panel/status — PARTIAL REWRITE

- **Current purpose:** terminal/problems/output/debug console and status. **Actual implementation:** Editor dock controls/conditional panels; CodeEditor status strip and workbench status.
- **Working:** collapse/restore model and status callbacks. **Partial:** single container/focus and consistent status ownership. **Simulated:** Debug status can represent generated state. **Broken/unreliable:** native interactive bottom-panel behavior unverified.
- **Technical debt:** overlapping per-editor/global status and controls. **Security risk:** avoid status claiming unsupported execution. **Performance risk:** output/diagnostic rerenders. **UX problems:** tiny telemetry chips compete with useful line/language information.
- **Target state:** unified resizable bottom area; restrained derived status. **Migration strategy:** registry/layout seam, then Wave 3; runtime content remains domain-owned.

## 10. Tabs — REFACTOR

- **Current purpose:** open/active documents and close/switch. **Actual implementation:** `TabBar.jsx`, Editor handlers and shared persistence draft identity.
- **Working:** dirty indicator, selection/keyboard switching, draft preservation. **Partial:** pending save/close failure UX. **Simulated:** none found. **Broken/unreliable:** nested close span tabIndex -1; no middle-close/close-others/right/reopen path found.
- **Technical debt:** tab close removes UI state without explicit dirty-choice contract; this alone is not proof of lost drafts. **Security risk:** low. **Performance risk:** per-switch provider lifecycle. **UX problems:** inaccessible close and missing expected tab actions.
- **Target state:** tabs reference documents, accessible context/close/reopen lifecycle. **Migration strategy:** Wave 4, preserve single draft/save owner and test rapid switch/late acknowledgment.

## 11. Workspace model/tree — REFACTOR

- **Current purpose:** selected root, lazy entries and open files. **Actual implementation:** Editor + `FileExplorer.jsx` and `fileTreeModel` helpers, stable IDs, virtual rows.
- **Working:** refresh/lazy loading and virtualization. **Partial:** 900-child listing/2,200-row cap and complete workspace scope. **Simulated:** none found. **Broken/unreliable:** `!file.content` treats valid empty content as needing reload; watcher absent.
- **Technical debt:** tree metadata/content/draft concerns intermix. **Security risk:** root changes/paths stay native-authorized. **Performance risk:** flatten/map loaded trees; measured 10k model hides 9,100 children by cap. **UX problems:** limits and stale entries need explanation.
- **Target state:** workspace controller/tree cache, file metadata separate from documents. **Migration strategy:** wrap current models, introduce watcher/conflict semantics in Wave 4.

## 12. Native filesystem — PRESERVE + CLEANUP

- **Current purpose:** native workspace IO. **Actual implementation:** `electron/main.cjs`, canonical allowed roots/protected metadata/size guards; preload methods.
- **Working:** real read/write/rename/delete, empty/Unicode/EOL and traversal/symlink rejection passed. **Partial:** UTF-8 only, 20MiB bridge cap, no watcher. **Simulated:** none. **Broken/unreliable:** crash/atomic durability unverified, not reproduced corruption.
- **Technical debt:** thrown/raw filesystem errors and main registration concentration. **Security risk:** canonical-check/IO race needs targeted analysis; existing guards preserved. **Performance risk:** reads/serialization up to cap. **UX problems:** raw error messages and encoding limits.
- **Target state:** typed results and native atomic writer/events with explicit semantics. **Migration strategy:** compatible adapters first, atomicity/path race work separately with real failure tests.

## 13. Persistence/restore — PRESERVE + CLEANUP

- **Current purpose:** retain drafts/saves, restore and serialize mutations. **Actual implementation:** `packages/nexus-core/src/storage` repository/save queue/hook/mutation guard; Code adapter.
- **Working:** revision-bound clean acknowledgments, save-before-mutation, atomic whole v3 localStorage snapshot replacement, retained v2/legacy/corrupt recovery paths. **Partial:** installed process restart/upgrade/force-kill/multi-window acceptance. **Simulated:** browser suite injects native write port, documented fixture. **Broken/unreliable:** no new reproduced shared persistence defect.
- **Technical debt:** settings writer is separate legacy subsystem. **Security risk:** do not persist auth tokens or delete recovery data. **Performance risk:** whole snapshot serialization/storage limits. **UX problems:** saved/error/recovery state needs clear presentation.
- **Target state:** same shared authority through document facade, separately accepted native durability. **Migration strategy:** retain recent fixes/readers/tests; do not build a second queue.

## 14. Editor/CodeMirror integration — REFACTOR (engine PRESERVE)

- **Current purpose:** editing, providers and document synchronization. **Actual implementation:** `CodeEditor.jsx` 49,344 bytes/1,479 lines, CM6, 11 states/8 effects, feature/rendering models.
- **Working:** actual editor/syntax/find/undo/local assistance; large-file policy. **Partial:** per-document undo/selection lifecycle and async provider acceptance. **Simulated:** local hints must not masquerade as server intelligence. **Broken/unreliable:** first visual scroll capture raced grammar; focused recheck passed.
- **Technical debt:** view/session/provider/process/status/commands combined. **Security risk:** provider edits must route through document authority. **Performance risk:** appearance changes can recreate engines; grammar chunks. **UX problems:** status exposes internal tool counts/fallback codes.
- **Target state:** CM host + document session + provider bridges. **Migration strategy:** Wave 5, protect text/revision/selection/undo before extraction; ADR retains CM.

## 15. Workspace search — PARTIAL REWRITE

- **Current purpose:** find text and jump. **Actual implementation:** `SearchPanel.jsx`, sequential `searchFiles` over loaded nodes/readFile callback; regex options/debounce.
- **Working:** actual text matches/ranges and jump callbacks. **Partial:** 1,400 files, 500 results, 32/file, 1m chars, 260ms debounce; only loaded scope. **Simulated:** none. **Broken/unreliable:** UI cancellation suppresses stale results but does not stop backend scan; no replacement pipeline.
- **Technical debt:** separate Spotlight scope. **Security risk:** regex/workspace edits need bounds; current scans bounded. **Performance risk:** sequential IO/regex and incomplete scans. **UX problems:** users can mistake capped results for exhaustive search.
- **Target state:** shared cancellable search with visible limits and revision-safe replace. **Migration strategy:** keep tested matching models, Wave 7 consistent scope then replacement.

## 16. Problems panel — REFACTOR

- **Current purpose:** diagnostic list/filter/jump. **Actual implementation:** `ProblemsPanel.jsx`, normalized active editor callback/parent array, source/group/filter model.
- **Working:** real diagnostic display/filter/jump fixtures. **Partial:** authoritative workspace diagnostics and version identity. **Simulated:** fixtures contain sample diagnostics, not production runtime proof. **Broken/unreliable:** active-array overwrite can omit other documents; not a reproduced provider failure.
- **Technical debt:** editor/Problems/status owners differ. **Security risk:** diagnostic URI must resolve within allowed navigation scope. **Performance risk:** frequent full arrays/filtering. **UX problems:** count/scope can be misleading.
- **Target state:** one per-URI/source/version collection. **Migration strategy:** Wave 6 diagnostics bridge, Wave 7 UI/navigation; keep normalized models.

## 17. Terminal/runner — PARTIAL REWRITE; canned responses REMOVE

- **Current purpose:** execute commands/show output. **Actual implementation:** `Terminal.jsx` 45,870 bytes/1,347 lines; SIMULATED_RESPONSES plus real main `child_process` stdio bridge, stdin/session events.
- **Working:** real relative command output/error/input/exit; bounded eight sessions, 700 lines/4k entry. **Partial:** one-shot runner, ANSI stripped, no PTY/resize/persistent shell. **Simulated:** browser npm/git/file responses. **Broken/unreliable:** quoted Windows absolute path reproduced failing; process-tree teardown unverified.
- **Technical debt:** UI/session/canned runtime mixed. **Security risk:** retain sanitized environment, cwd and manual command rules; separate future agent policy. **Performance risk:** output flooding/process leaks. **UX problems:** “bash”/terminal naming implies shell behavior absent on Windows.
- **Target state:** real Runner; PTY only after actual platform validation. **Migration strategy:** Wave 8; keep red quote test and real bridge/security contracts, remove production canned success.

## 18. Tasks/running code — PARTIAL REWRITE

- **Current purpose:** repeat useful execution. **Actual implementation:** terminal preset templates/commands and real runner path.
- **Working:** actual simple command invocation. **Partial:** static tasks, no package-script discovery/launch schema/dependency lifecycle. **Simulated:** canned path can imitate task progress. **Broken/unreliable:** inherited Windows quoting bug.
- **Technical debt:** task definitions/state embedded in terminal UI. **Security risk:** task provenance/cwd and explicit execution policy. **Performance risk:** uncontrolled parallel tasks need domain limits. **UX problems:** preset task can imply project detection.
- **Target state:** typed project task/launch model with real status. **Migration strategy:** Wave 8 task discovery first, Wave 11 launch/debug bridge; no fake run results.

## 19. Local Git — service PRESERVE + CLEANUP; UI PARTIAL REWRITE

- **Current purpose:** local SCM. **Actual implementation:** `electron/services/gitService.cjs`, validated argv/status-z/path commands; `GitPanel.jsx` 64,324 bytes/1,779 lines, 29 states/5 effects, model helpers.
- **Working:** native status/stage/commit passed; implementation for diff/unstage/branches/log/remotes. **Partial:** mature binary/hunk/conflict UI and network actions. **Simulated:** terminal canned Git path only; local service is real. **Broken/unreliable:** full branch/conflict/live UI acceptance unverified.
- **Technical debt:** UI mixes local/remote/GitHub domains. **Security risk:** preserve argv/path rules and token scrubbing. **Performance risk:** stale refresh/diff size/large history. **UX problems:** crowded SCM workflows, unsupported actions must be explicit.
- **Target state:** focused changes/staged/commit/branches/history domain. **Migration strategy:** Wave 9 service split only where useful; disposable repo tests before action/UI changes.

## 20. GitHub — REFACTOR

- **Current purpose:** remote repository/issues/PR/review/projects/auth. **Actual implementation:** `githubService.cjs` 58,374 bytes/1,679 lines, REST/GraphQL, device auth, rate limits, safeStorage/fallback token store, split panel components.
- **Working:** substantial real request/auth implementation and deterministic contracts. **Partial:** live account/network acceptance; secure-backend grades. **Simulated:** fixture data/error states, no proof of live success. **Broken/unreliable:** no reproduced API defect.
- **Technical debt:** large service and mixed query/UI state. **Security risk:** machine-local fallback not OS secret protection; safeStorage basic backend matters. **Performance risk:** query invalidation/rate limits/large remote collections. **UX problems:** bridge-offline error repeated across header/cards/banner.
- **Target state:** shared request client + focused auth/repo/issue/PR/project owners. **Migration strategy:** Wave 10 preserve functionality/readers, add storage-grade/request fixtures and authorized live tests.

## 21. Debugging — FULL INTERNAL REWRITE

- **Current purpose:** claim launch/breakpoints/stack/variables/stepping. **Actual implementation:** `DebugPanel.jsx` 35,088 bytes/919 lines, fixed INITIAL_VARIABLES/generated call stacks and timer transitions; line-only local breakpoints.
- **Working:** UI preview only. **Partial:** configuration forms/local breakpoint affordance. **Simulated:** pause/continue/step/runtime values. **Broken/unreliable:** operational debugger does not exist; no DAP/process acceptance.
- **Technical debt:** synthetic UI is its own runtime. **Security risk:** real adapter spawning/launch credentials need separate boundary. **Performance risk:** process cleanup unknown until actual runtime. **UX problems:** current panel/README overclaim inspection.
- **Target state:** experimental/unavailable until real Node DAP launch. **Migration strategy:** Wave 11 reconceive session/URI breakpoint/adapter ownership; remove generated production state.

## 22. Extensions — PARTIAL REWRITE

- **Current purpose:** configurable IDE contributions. **Actual implementation:** `extensionSystem.js` 51,400 bytes/1,499 lines, static catalog/manifests/install records; validated restricted contribution/action routes.
- **Working:** local theme/snippet/keybinding/allowed action data; unknown records retained disabled. **Partial:** contribution semantics and provenance. **Simulated:** catalog install/update/version presentation; install only updates local record. **Broken/unreliable:** actual download/package/executable host absent.
- **Technical debt:** marketplace branding confused with declarative settings. **Security risk:** do not introduce eval/untrusted renderer host; validate manifests/actions. **Performance risk:** contribution fan-out/large catalogs. **UX problems:** branded Prettier/ESLint entries imply runtime execution absent.
- **Target state:** honest built-in/declarative registry. **Migration strategy:** preserve validation/readers/contributions, remove fake marketplace in Wave 12; separate design for any executable host.

## 23. Command palette — PARTIAL REWRITE

- **Current purpose:** discover/execute commands. **Actual implementation:** `CommandPalette.jsx`, feature command metadata/ranking and Editor switch dispatch.
- **Working:** real ranking/actions. **Partial:** one source for availability/handlers/keybindings. **Simulated:** can navigate to synthetic feature. **Broken/unreliable:** dispatch parity across menus/keys unverified.
- **Technical debt:** metadata already exists but handlers/IDs duplicated. **Security risk:** commands must use domain ports/availability. **Performance risk:** low; avoid broad re-render. **UX problems:** overlapping Spotlight overlay.
- **Target state:** one registry/multi-mode overlay. **Migration strategy:** Wave 1 registry compatibility, Wave 7 merge UI while keeping rankings.

## 24. Spotlight/quick open — PARTIAL REWRITE

- **Current purpose:** file/content/local-symbol navigation. **Actual implementation:** recursive native readDir, ignore rules, depth 9/220 dirs/2,600 entries/900 candidates; scan 650 files, content 48, symbols 80.
- **Working:** real bounded quick-open/regex symbols. **Partial:** complete workspace/scope consistency and provider symbols. **Simulated:** none found. **Broken/unreliable:** no full-scope promise; cancellation/large-tree acceptance limited.
- **Technical debt:** duplicate overlay/search and independent limits. **Security risk:** keep canonical roots and text bounds. **Performance risk:** directory walks/reads. **UX problems:** mode/scope overlap with palette/Search.
- **Target state:** unified command/file/@workspace/:line/#document modes. **Migration strategy:** Wave 7 shared search/navigation; retain tested ranking/local models.

## 25. Settings — PARTIAL REWRITE

- **Current purpose:** preferences/layout/editor/tool configuration. **Actual implementation:** `SettingsPanel.jsx` 91,206 bytes/2,081 lines; catalog/widgets/navigation/KeybindingManager; defaults in editorShared; old storageManager queued writer.
- **Working:** rich configurable controls/defaults. **Partial:** typed schema/default/validation/error acknowledgments. **Simulated:** extension/engine labels can imply unavailable behavior. **Broken/unreliable:** settings writes can swallow errors; no reproduced file-queue defect implied.
- **Technical debt:** UI/state/persistence/effect internals combined. **Security risk:** no secret configuration in renderer/public env. **Performance risk:** broad settings updates/effect layers. **UX problems:** oversized decorative cards/internal shader/glow language.
- **Target state:** dense searchable schema-driven settings and acknowledged persistence. **Migration strategy:** small compatible schema in Wave 1; UI/consumer migration in Wave 13, preserve keys/unknown data.

## 26. Theme/global styles — REFACTOR / PARTIAL REWRITE

- **Current purpose:** workbench/syntax/effects appearance. **Actual implementation:** theme helpers/next-themes, editor theme models, 65,919-byte/2,192-line globals with 331 rgba/182 important and repeated selectors.
- **Working:** presets/CM styling. **Partial:** semantic token ownership/contrast/reduced motion. **Simulated:** none. **Broken/unreliable:** appearance-dependent provider recreation risk; no measured contrast certification.
- **Technical debt:** late overrides, responsive/z-index/magic sizing and feature styles. **Security risk:** low. **Performance risk:** many glow/blur/motion layers. **UX problems:** editor loses hierarchy amid bright decorated surfaces.
- **Target state:** six surface levels, semantic tokens and separate syntax/effects. **Migration strategy:** Wave 2 scoped adoption, per-component visual acceptance; retire rules only with moved consumers.

## 27. Keyboard shortcuts — REFACTOR

- **Current purpose:** keyboard-first actions. **Actual implementation:** Editor global Ctrl/Meta handlers, DEFAULT_KEYBINDINGS, separate menu/palette/provider events and KeybindingManager.
- **Working:** save/new/open/toggle/palette/tab actions. **Partial:** platform/menu/editor-context arbitration and all remaps. **Simulated:** none. **Broken/unreliable:** parity/accessibility interaction unverified.
- **Technical debt:** duplicated ID/availability/dispatch sources and CustomEvents. **Security risk:** shortcut must not bypass capability or execution policy. **Performance risk:** listener teardown/duplicate dispatch. **UX problems:** advertised keys can differ from active path.
- **Target state:** registry-owned keys/context and one dispatch. **Migration strategy:** Wave 1 initial command set/aliases, behavioral tests and disposers; later full migration.

## 28. LSP lifecycle/protocol — PRESERVE + CLEANUP

- **Current purpose:** real language-server requests/notifications. **Actual implementation:** main `lspProcessService.cjs`, URI/protocol/client/service helpers, CodeEditor engine, pending timeouts/didOpen/change/close maps/capabilities.
- **Working:** real subprocess transport implementation. **Partial:** actual binaries/readiness/runtime acceptance, workspace lifecycle and cancellation. **Simulated:** local fallbacks distinct from process service. **Broken/unreliable:** appearance-driven recreation possible; not a reproduced server crash.
- **Technical debt:** per-view process ownership and inconsistent async identity. **Security risk:** privileged executable environment overrides and document paths. **Performance risk:** duplicate server starts/requests. **UX problems:** unavailable reasons not consistently user-readable.
- **Target state:** workspace/language owner, versioned sessions/capabilities. **Migration strategy:** Wave 6 actual Tier 1 server tests; preserve protocol/transport and timeout protections.

## 29. Language support/completion — REFACTOR

- **Current purpose:** grammars/local assistance/semantic providers. **Actual implementation:** lazy CM language imports/legacy modes; feature completions and LSP presets for JS/TS/Python/Rust/Go/C/C++.
- **Working:** broad syntax/local hints; screenshot fixtures. **Partial:** server binaries external, no JSON/HTML/CSS native presets. **Simulated:** grammar count is not server capability. **Broken/unreliable:** no actual server acceptance; async completion response version/cancellation not comprehensive.
- **Technical debt:** language metadata/features/settings dispersed. **Security risk:** provider edits/executable choices need boundary validation. **Performance risk:** large grammar chunks and stale requests. **UX problems:** support tier/source ambiguous.
- **Target state:** Tier 1 JS/TS/JSON/HTML/CSS, then Python, then other preset languages. **Migration strategy:** per-method readiness/tests; preserve grammar coverage and local fallback labels.

## 30. Diagnostics — REFACTOR

- **Current purpose:** track/render language issues. **Actual implementation:** LSP service maps per URI, CodeEditor normalization/decorations -> parent active Problems array.
- **Working:** normalization/decorations and fixture jumps. **Partial:** document version/source/workspace ownership. **Simulated:** sample fixtures only. **Broken/unreliable:** possible stale/omitted cross-document arrays; reproduction pending.
- **Technical debt:** multiple derived copies. **Security risk:** validate ranges/URIs. **Performance risk:** rapid publications/full decoration rebuild. **UX problems:** workspace count may mean current file.
- **Target state:** shared versioned diagnostic collection. **Migration strategy:** Wave 6 source ownership, Wave 7 Problems/navigation; race/order fixtures before changes.

## 31. Formatting — REFACTOR

- **Current purpose:** format current document. **Actual implementation:** real LSP request path plus local whitespace/JSON fallback and extension command routes.
- **Working:** local transforms/request plumbing. **Partial:** actual server formatter and revision-safe edit acceptance. **Simulated:** installed Prettier catalog record does not execute Prettier. **Broken/unreliable:** no live provider acceptance performed.
- **Technical debt:** dispatch/provider selection duplicated. **Security risk:** edit revisions/ranges and multi-file authority. **Performance risk:** full-buffer formatting on large files. **UX problems:** formatter source is unclear.
- **Target state:** one available format command with provider identity. **Migration strategy:** Wave 1 command availability, Waves 5/6 transactional document edits.

## 32. Code actions/rename — REFACTOR

- **Current purpose:** apply server edits/actions and symbol rename. **Actual implementation:** LSP request/response/edit helpers plus CodeEditor/Editor command/event paths.
- **Working:** protocol/model implementation. **Partial:** accepted real server workflows, multi-file revisions and undo. **Simulated:** no fake server process found. **Broken/unreliable:** no runtime acceptance; do not claim safe multi-file transaction yet.
- **Technical debt:** handlers cross component boundaries/events. **Security risk:** validate returned URIs/ranges/commands through existing workspace authority. **Performance risk:** large workspace edits. **UX problems:** unavailable actions lack unified predicate.
- **Target state:** capability-aware actions through document mutation owner. **Migration strategy:** Waves 1/6, real server and concurrent-edit/failure fixtures before expanded claims.

## 33. Navigation/symbols — REFACTOR

- **Current purpose:** definition/result/line/symbol jumps. **Actual implementation:** real definition request path, local regex symbol extraction and parent selection/events.
- **Working:** local symbol/result navigation models. **Partial:** exact cross-file URI/range and focus lifecycle. **Simulated:** local symbols are not LSP workspace-symbol responses. **Broken/unreliable:** references/signatures/highlights absent.
- **Technical debt:** multiple navigation event/command paths. **Security risk:** prevent outside-workspace URI/path action. **Performance risk:** capped scans; no semantic index. **UX problems:** multiple overlays and ambiguous scopes.
- **Target state:** unified navigation contract/history and truthful symbol sources. **Migration strategy:** registry first, language/search waves 6/7; keep model range tests.

## 34. Performance — PRESERVE + CLEANUP

- **Current purpose:** keep editing/boot/layout responsive. **Actual implementation:** boot-stage/TTI/lag helpers, virtualization, lazy grammars, large-file policy and chunk report.
- **Working:** 220k/7.5k guarded and 650k/18k plain policies; model timings collected. **Partial:** authenticated startup/heap/edit/resize/soak/platform baseline. **Simulated:** in-memory timing is not UI performance. **Broken/unreliable:** no measured production SLA failure; visual grammar race exists.
- **Technical debt:** broad owners/static panels/duplicate style effects. **Security risk:** bounds guard resource abuse. **Performance risk:** large chunks, repeated providers, output/regex flooding. **UX problems:** technical tuning exposed too widely.
- **Target state:** instrumented user workflows with explicit budgets. **Migration strategy:** preserve policies, measure before optimizing; Wave 14 actual production cases, never remove support just to meet a number.

## 35. Electron IPC/main — REFACTOR

- **Current purpose:** window/files/process/Git/GitHub/LSP authority. **Actual implementation:** 37,040-byte/1,114-line main registering domains with extracted services/security helpers.
- **Working:** real native file/Git/runner tests and guarded services. **Partial:** common errors/sender validation/domain registration. **Simulated:** main real paths are not terminal canned UI. **Broken/unreliable:** Windows runner quoting red test.
- **Technical debt:** registration/lifecycle/fs/terminal concentration. **Security risk:** senderFrame validation missing centrally; existing payload/path/env guards must stay. **Performance risk:** IPC serialization/event flooding. **UX problems:** inconsistent error shapes.
- **Target state:** domain registration with typed validated contracts. **Migration strategy:** Wave 1 adapters then parity-tested registration extraction; no arbitrary channel access.

## 36. Preload — REFACTOR

- **Current purpose:** isolated renderer API. **Actual implementation:** `electron/preload.cjs` ~15KB, explicit grouped methods/payload validation and event subscription functions.
- **Working:** production bridge and native tests; no raw Node exposed. **Partial:** TypeScript schema/result consistency/capability discoverability. **Simulated:** browser fixture bridge may be absent/injected. **Broken/unreliable:** no reproduced preload defect.
- **Technical debt:** ad-hoc method inference in UI, inconsistent throws/results. **Security risk:** main must validate too; don't expose raw IPC or tokens. **Performance risk:** large payload/events. **UX problems:** consumers show repeated raw missing-method errors.
- **Target state:** typed capability groups/result/disposer ports. **Migration strategy:** compatible wrapper first, change API only with all consumers and parity tests.

## 37. Security — PRESERVE (guards) / PRESERVE + CLEANUP (coverage)

- **Current purpose:** protect host/credentials/workspaces. **Actual implementation:** isolation/sandbox/no Node/webviews, navigation/permissions denial, canonical workspace/metadata guards, sanitized process env, token handling.
- **Working:** navigation/token regressions and native traversal/symlink/protected metadata rejection. **Partial:** packaged CSP/sender/race/process-tree/secret-backend validation. **Simulated:** none in guards. **Broken/unreliable:** no validated exploit in this audit; un-packaged boot emits CSP warning.
- **Technical debt:** validation distributed between preload/main/services. **Security risk:** detailed observations in [security model](07-security-model.md), not exploit claims. **Performance risk:** validation overhead should remain bounded. **UX problems:** security errors should be actionable without leaking details.
- **Target state:** preserved controls with measurable threat-boundary tests. **Migration strategy:** keep manual terminal policy; separate agent-generated commands; never weaken gates for smoke tests.

## 38. Installer/platform behavior — PRESERVE + CLEANUP

- **Current purpose:** distribute real desktop runtime. **Actual implementation:** electron-builder NSIS x64 user install/no elevation, DMG arm64/x64 hardened entitlements, Linux AppImage/deb x64; npmRebuild false; host scripts.
- **Working:** build/config/discovery tests. **Partial:** installer/signing/notarization/upgrade/platform launch acceptance. **Simulated:** none; config is not execution proof. **Broken/unreliable:** primary pending tooling merge and historical release failures differ by SHA.
- **Technical debt:** installed environment vs lockfile/CI; platform scripts need supported-host matrix. **Security risk:** optional Windows signing and safeStorage grades require explicit release claims. **Performance risk:** size/startup/native ABI if PTY introduced. **UX problems:** reliable install/recovery not demonstrated here.
- **Target state:** accepted platform packages/upgrade paths. **Migration strategy:** retain tooling, reconcile #418 base, run release matrix in Wave 14; PTY dependencies require rebuild strategy first.

## 39. Testing — PRESERVE + CLEANUP

- **Current purpose:** protect contracts/workflows. **Actual implementation:** 52 IDE model cases, SSR/visual fixtures, security/markup/public/shared persistence scripts; added real native characterization.
- **Working:** results in [test strategy](09-test-strategy.md). **Partial:** live auth/server/GitHub/DAP/PTY/installer and DOM interactions. **Simulated:** fixtures are intentionally isolated, not production capability proof. **Broken/unreliable:** typecheck red; full visual 119/120; native quotes 9/10.
- **Technical debt:** duplicate output-directory summaries overwritten by focused visual recheck. **Security risk:** tests must not use user secrets/projects. **Performance risk:** full visual matrix ~15 minutes. **UX problems:** generic screenshots can pass unusable fixture geometry.
- **Target state:** layered behavioral/model/native/production/release evidence. **Migration strategy:** retain gates, add targeted non-mirroring protections, archive distinct outputs and track inherited failures.

## 40. Accessibility — PRESERVE + CLEANUP

- **Current purpose:** keyboard/screen-reader/zoom/motion usability. **Actual implementation:** selected ARIA/tab roles, tooltips/labels, focus models and reduced-motion hooks.
- **Working:** partial semantic foundations. **Partial:** complete menu/focus/contrast/screen-reader/zoom audit. **Simulated:** SSR dimensions cannot prove interaction. **Broken/unreliable:** tab close cannot receive normal tab focus; other interactions unverified.
- **Technical debt:** custom nested controls/feature-specific menus. **Security risk:** low; keyboard dispatch still obeys capabilities. **Performance risk:** excessive motion/render effects. **UX problems:** microcopy contrast and tiny status/control density.
- **Target state:** visible focus, semantic controls, complete keyboard workflows and reduced motion. **Migration strategy:** per-UI-wave interaction and actual Electron inspections; comprehensive Wave 14 acceptance.

## 41. Documentation — PARTIAL REWRITE

- **Current purpose:** explain supported workflows/architecture/continuation. **Actual implementation:** app README, July recode plan, architecture recovery/current storage ledgers; new V2 packet.
- **Working:** useful storage/security/build descriptions and new evidence. **Partial:** current user/developer workflow coverage; installed/live acceptance unknown. **Simulated:** README Debug inspection and catalog/language claims overstate reality. **Broken/unreliable:** old completed checklists and push-main permission stale; primary ledgers conflicted.
- **Technical debt:** multiple historical/current continuation sources. **Security risk:** avoid publishing secrets or implying account bypass. **Performance risk:** none material. **UX problems:** user cannot distinguish preview from support.
- **Target state:** one current feature ledger, bounded wave checkpoints and truthful user/developer guides. **Migration strategy:** V2 packet supersedes product claims without destroying history; update every wave, STOP for weiter.
