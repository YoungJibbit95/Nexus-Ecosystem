# Shared core and runtime audit

Baseline: `d39cfa2`. **Core is a genuine shared client runtime with uneven domain authority.** It is neither a useless utility bucket nor the central domain layer implied by an idealized dependency diagram.

## Responsibility map

| Core area | Implemented responsibility / consumers | Boundary assessment |
| --- | --- | --- |
| `render/*` | Coordinator, profile, token/recipe resolution, effect allocation, invariants, runtime bridge and React hook factory; Main/Mobile surfaces/adapters | Coherent runtime; preserve public surface lifecycle. Add behavioral budget/cleanup tests |
| `motion/*` | Motion profiles/families, reduced-motion and degradation policies; client wrappers and shared surface motion | Coherent pure-policy layer. It does not own every CSS/Framer/Three animation in clients |
| `views.ts`, `ui/*` | View manifests, commands, layout/panel resolution, status and UI tokens; view shells/registries | Valuable contract but metadata mixes product policy and layout hints; archived Code descriptors lag route behavior |
| `liveSync.ts` | Catalog/schema-to-local-view filtering and fallback/development lists | Configuration availability, not domain data synchronization |
| `api/*` | Public fetch/control client, view access, compatibility, polling, telemetry, connection/performance managers | Real shared client integration. Leaf functions take `client: any` and reach its internals, so extraction has not created a strong internal interface |
| `api/runtime.ts` | Combines connection, performance and control managers; start/stop/subscriptions | Useful composition boundary. Test repeat start/stop and cancellation; do not infer cross-device sync |
| `runtime.ts` | Global font, accessibility, density, typography and safe-area DOM mutation | Browser/platform utility, not domain logic; should be imported explicitly by shells |
| `notes/*` | Knowledge analysis and magic/template registry; client note views/workers | Good candidates for authoritative pure semantics; not a Note store |
| `quickCapture.ts`, `todayLayer.ts` | Intent parsing and derived task/reminder summary | Small comprehensible helpers; preserve. Quick-capture tests pass |
| `reminders/*` | Templates, snooze presets, repeat labels | Healthy narrow helpers; delivery and recurrence mutation still client-owned |
| `canvas/model`, `canvas/engine` | Pure model/default/schema/command/hit-test/layout/export helpers | Coherent on paper, but no client import of model/engine subpaths or their model types was found; root export reachability is not adoption. Client canvas stores remain authoritative |
| `canvas/CanvasMagic*`, camera/preferences/templates | React block rendering, camera easing, safe markdown and templates | Used shared behavior; large renderer contains many block kinds, but does not justify replacing Canvas. Separate pure model from UI imports |
| `code/*` | Bounded execution/static analysis, language registry and IDE capability helpers | Preserve tested execution limits. Main/Mobile archive removed the old editing route; check consumers before declaring helpers obsolete (DevTools/shared renderers still exist) |
| `settings/*` | Defaults/schema/validation/migrations, browser persistence, UI primitives and store factory/singleton | Parser/transfer contract useful; not the active Main/Mobile settings owner |
| `devtools/*` | Artifact model/storage/export, default project, bounded/redacted output | Useful narrow contract; access policy is elsewhere and needs its own functioning tests |
| `viewWarmupStats.ts` | IDB warmup statistics used in preloading policy | Runtime cache only; must not be confused with domain durability |

Evidence: `packages/nexus-core/src/index.ts`, module sources above, client imports and E19/E20/E28. Core has 91 source files / approximately 15,599 counted lines; canvas and API account for approximately 3,867 and 3,078 respectively, render 2,625. These are descriptive counts.

## Existing good boundaries

No static import from core into a client was found. Render adapters are small factories configured with platform/hardware defaults. Core keeps explicit surface capability/invariant machinery rather than letting every component invent its own allocation algorithm. Notes analysis, quick capture, today summaries, templates, protocol-like schemas and bounded execution helpers can be reasoned about independently. Preserve these investments.

The standard core check passes: TypeScript and 13 tests plus a manifest/source scan. However, the scan checks strings/exports and eleven named views, not execution of each runtime contract. It misses Calendar in that required-view list. A separate DevTools access-policy test cannot load a missing helper and is not in `npm test`. These are protection limitations, not evidence that render/authorization behavior is correct or incorrect on devices.

## Authority gaps and unnecessary implicit behavior

### Canvas models

Main declares `CanvasNode` with flat planning fields; Mobile declares `CanvasNode.pm`; core declares a Main-like `CanvasNodeModel`. Client stores do not use the core command engine. Three similar declarations are not one authoritative schema. Promote core only after defining a lossless v1 compatibility codec for both shapes and explicit handling of Mobile-only statuses. Do not overwrite real data to fit an unused shared model.

### Settings

Main/Mobile settings bridge builds a `NexusSettings` snapshot from the live theme store and applies parsed values back to that theme. Core nevertheless exports `settingsStore = createSettingsStore()` at module load. Its `useSettingsStore` simply selects current state without subscribing with a React external-store hook. No client consumer was found. Treat it as unadopted/misleading API surface, not a proven second live owner. Keep schema/default/parser functions; isolate or retire the singleton only after consumer search and compatibility review.

### Root barrel and package contract

`src/index.ts` re-exports API, DOM utilities, React canvas renderers, settings and pure helpers. `package.json` points directly at source and has no explicit export map. This makes pure-helper imports resolve a broad mixed graph; tree shaking may reduce a bundle, but it is not an ownership boundary. Forty-three static importers target the root barrel in the inventory. Prefer explicit subpath imports and a documented export surface before splitting packages.

Core currently has only React/ReactDOM peer dependencies, not a complete separate build distribution. Aliases and client compiler resolution are part of the contract. Code's JS check also drags core/dependency JS/type noise into diagnostics, showing the practical cost of an implicit source package boundary.

## Where core should become more authoritative

- Versioned domain interchange codecs, IDs and invariant checks, especially Canvas and workspace snapshots.
- Pure Note/Task/Reminder transitions and projections after behavior is characterized; domain stores can remain client-owned adapters.
- Shared durability semantics for the two persistence families, with injected storage/scheduler/platform ports.
- A capability/access decision model with explicit client policy input and fixture coverage; preserve server denials.
- Public render/motion contracts and one set of property-ownership invariants.

## What should remain outside core or become an explicit adapter

OS files/processes/keychains, Capacitor notification/keyboard APIs, app-specific shell navigation and layout, auth form UI, product presets and desktop/mobile view composition. Move implicit browser side effects (global fonts, singleton settings, preference IO) behind named browser factories/subpaths, rather than treating core as a pure domain package when it is not.

No new package proliferation is required initially. Document bounded directories and explicit exports within `nexus-core`; split a package only when an independent consumer/build/test constraint makes the boundary useful.
