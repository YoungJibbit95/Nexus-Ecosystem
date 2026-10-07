# Nexus Code V2 Beta — packet 2A

Date: 2026-10-07. Base: `5532bebcb9827e1a3d1629004fd17a261c8fb815`.
Branch: `recode/nexus-code-v2-beta-wave-2a-visual-foundation`.

## Behavior and ownership

Shared panels previously used hardcoded dark gradients, repeated borders and motion values that competed with custom theme settings. `workbenchTokens.ts` now derives semantic levels 0–5, text, borders, accent/status, focus/selection, spacing, radius and motion from the existing theme resolver. The new pure TypeScript boundary is included in the strict foundation gate. Stored settings, legacy resolver variables and syntax output are preserved.

PanelChrome consumes one scoped stylesheet. Headers, states, notices, cards, inputs and actions use readable theme-derived colors. Panel entrance/section movement and blur are removed; success has a success color. Search and Problems adopt the primitives, readable secondary text and consistent selection. Diagnostic rows stay still on hover. Copy remains visible without hover. Narrow filters use panel width. Small bottom panels allow header/footer scrolling to keep the result body usable.

The existing command registry, typed native ports and settings seam remain canonical. No new store, writer, registry or platform adapter is introduced. Editor composition, CodeMirror, Git/Runner/Settings internals and other legacy CSS remain in their existing owners. A one-line motion-variant type annotation in WelcomeScreen preserves its existing polymorphic PanelCard call without suppressing a contract error.

## Data and security

No persisted format or key changes. Unknown compatible settings, custom themes, syntax, document revisions, save acknowledgment and recovery remain with the existing owners. No dependency or release/version change.

A separate base-to-packet comparison executed 192 complete theme resolutions (presets, backgrounds, custom colors, effect modes and invalid values). After excluding the new `--wb-` entries, every returned legacy value and syntax definition matches base exactly. Script and output: `check-legacy-theme.mjs` and `legacy-theme-compatibility.log` in the local evidence folder.

Security compatibility: **NO** changes to credential persistence, token exposure, renderer privilege, raw IPC, path checks, account gating, external navigation, packaged DevTools, insecure content, arbitrary execution, command policy, secret scanning or trusted origins. Native main/preload/security files are absent from the packet diff. Current upstream security wins over old V2 descriptions.

## Executed qualification

Commands below run from repository root unless an app prefix is shown.

| Command | Result |
| --- | --- |
| `npm --prefix "./Nexus Code" run lint` | PASS |
| `npm --prefix "./Nexus Code" run typecheck:foundation` | PASS; includes new strict palette |
| `npm --prefix "./Nexus Code" run test:foundation` | 24/24 PASS |
| `npm --prefix "./Nexus Code" run smoke:ide-core` | 52/52 PASS |
| `npm --prefix "./Nexus Code" run smoke:ui` | 36/36 PASS |
| `npm --prefix "./Nexus Code" run test:security` | Attack regression + 27/27 PASS |
| `npm --prefix "./Nexus Code" run build` | Markup, build typecheck and production Vite build PASS |
| `npm --prefix "./Nexus Code" run test:visual-foundation` | 11 checks PASS; nine viewport/state/theme cases plus real input dispatch and live motion/section checks |
| `npm --prefix "./Nexus Code" run smoke:visual` with explicit filters below | 24/24 PASS; a filtered matrix, not the historical full matrix |
| `npm run verify:single-react` | PASS |
| `npm run verify:ecosystem` | 91/91 PASS |
| `npm run verify:public` | Lockfiles, public ecosystem, 271 passed/17 skipped, single React, encoding PASS |

The public gate used the existing Main dependency path via `NODE_PATH`; dependencies remain existing shared junctions. No clean install is claimed. Test outputs are stored only under workspace `.workspace-maintenance/2026-10-07/code-v2-2a/`, not committed generated evidence.

Type diagnostics: `npm --prefix "./Nexus Code" run typecheck` is **inherited-red**. Current base: **4,285**, packet: **4,263**, **0 introduced / 22 removed**. Comparison uses a multiset of file + TS code + complete diagnostic message, ignoring moved line/column positions. `typecheck-before.log`, `typecheck-after.log`, `diagnostic-delta.json` and the comparison script retain exact local evidence. The historical 4,270 Wave 1 count is not reused as today's baseline.

## Visual evidence and limits

Actual Electron renderer fixtures use production Search, Problems, CodeEditor and PanelChrome components, synthetic documents and a disposable profile. Native input proves search-to-file dispatch, diagnostic arrow/Enter dispatch, Tab focus, stable hover bounds and section collapse. Computed styles verify 2px outlines, control bounds, scroll ownership, minimum result-body height and disabled motion. Hidden-window focus and the system media preference are emulated through Chromium's test protocol; no production debugging policy changes.

Reviewed captures in `visual/`: `desktop.png` (1440×900), `compact.png` (1280×720), `small.png` (1024×768), `minimum.png` (900×600), `zoom-200.png` (1440×900 at actual Electron zoom factor 2), `custom-dark.png`, `custom-light-panels.png`, `reduced-motion.png`, `system-reduced-motion.png`, and `empty.png`. Long filenames, selected rows, readable search matches and loading/error/empty states are represented. At 200% zoom the constrained Problems header/footer and result list scroll independently; resizing the bottom host remains the existing shell responsibility.

The broader `smoke:visual` selection uses surfaces `panel-chrome,workbench-shell,settings-panel,github-workbench,account-panel,launchpad` and viewports `desktop,tablet,short-wide,phone-portrait`. Its 24 captures qualify shared consumers and legacy robustness at 1440×900, 1024×768, 900×512 and 390×900. Desktop remains the product target. Baseline `before-visual/panel-chrome-desktop.png` is retained.

The first focused test attempts exposed harness key naming, async input timing, selector and hidden-window paint/focus issues; those attempts are not passes. The final run includes real user-input events and waits for committed render/paint. New contrast tests cover every preset/background, custom light/dark inputs, all 16 grayscale steps and opposite-brightness input/panel colors. Normal text is checked at 4.5:1 and focus at 3:1.

Fixtures do not establish authenticated end-to-end workspace/save/restart, live LSP/GitHub, installed packages, or macOS/Linux acceptance. The shell and CodeMirror status strip still have legacy density at 200% zoom. Light custom colors are qualified for the migrated panels; full legacy-panel light-theme acceptance is deferred. No PTY, DAP or executable marketplace capability was added. Existing capability maturity remains unchanged.

## Main CI baseline and next packet

Initial main `b15a532`: Security Verify, Release Gate, Contract Parity, CodeQL and Source Secret Scan green. Native installer/Android candidate failures were **BASELINE FAILURE**, separately corrected by upstream PR 441. Base advanced by fast-forward to `5532beb` before committing this UI packet; its four packaging-only files do not overlap Code UI or diagnostic input.

Next planned packet: **Wave 3 — workbench composition**. Stop after this PR and await `WEITER`; inspect merge status and current main first. No automatic merge, stacking or release.
