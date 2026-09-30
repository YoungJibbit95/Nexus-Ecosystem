# Visual baseline and manual inspection

Actual Electron fixture captures were inspected along with the actual production signed-out app. No account credentials were supplied; authenticated production workbench interactions were not accepted. The four-view fixture matrix uses desktop 1440x900, tablet 1024x768, short-wide 900x512 and phone portrait 390x900. The production app's minimum is 900x600, so below-minimum fixture outcomes are stress observations, not supported desktop requirements.

## Retained images and findings

| Capture | Observation | Meaning / next check |
| --- | --- | --- |
| [Workbench desktop](visual/workbench-shell-desktop.png) | Fixture fills roughly 884px of 1440 width; remaining area is blank. Busy title/rail, duplicated Explorer heading, many status chips and blue welcome surface. | Fixture composition/layout assertion gap; do not claim this exact width bug in live authenticated app. Inspect real shell before Wave 3 |
| [Workbench short-wide](visual/workbench-shell-short-wide.png) | Fixture occupies roughly 413px, sidebar covers much of center. | Short-window stress reveals geometry/hierarchy gap; generic “pass” is insufficient |
| [Settings desktop](visual/settings-panel-desktop.png) | Large nested cards/padding, effect/engine terminology, tiny muted helper text and ambiguous F/C/W presets. | Improve density, semantic surfaces, user copy and keyboard/contrast validation in Waves 2/13 |
| [Editor JavaScript](visual/editor-javascript-desktop.png) | Real CM syntax/readable buffer dominates; tiny bottom bar contains red TS fallback and Tools 0/7 telemetry. | Keep editor clarity; explain readiness/source in ordinary language. Syntax is not live LSP acceptance |
| [GitHub offline](visual/github-workbench-desktop.png) | Bridge unavailable state is explicit but repeated in header, badge, card and large banner. | Preserve honesty; one actionable error with retry/account path |
| [Editor scroll recheck](visual/editor-scroll-desktop.png) | Focused warm rerun passed after first full-run grammar race. | This is the recheck image, not the original failed image |
| [Production gate 1440](visual/production-account-gate-1440x900.png) | Real dist/preload account screen, clear two-card form; mixed languages, technical access/release copy and Remember device control. | Gate is active. Explain backend remember flag vs local sessionStorage; native restart restore unverified |
| [Production gate 900](visual/production-account-gate-900x600.png) | Both cards/fields/actions remain visible at minimum content size. | Useful native resize baseline; login, focus, hover and screen-reader flow remain unverified |

## Evidence boundaries

The full run recorded 119 successes/one failed editor-scroll@desktop. The focused recheck reused its output directory, overwriting full summary.json/md and the failed editor image. The original failure is retained in [visual.log](visual.log); its image and full metrics summary are unavailable. [Manifest](visual-baseline-manifest.json) reconstructs outcomes from that log and hashes the retained/local images. Do not present reconstructed data as original full-run metrics or the recheck as a green 120-case run.

Inspected: visible spacing/alignment/overflow/dark surfaces/small-size composition and copy. Not established by static captures: keyboard focus traversal, hover/active state transitions, menus/popovers opened by real input, contrast ratios, drag/resize interaction and logged-in production flow. Those remain required acceptance in every relevant UI migration. Full fixture images remain locally under `.test-artifacts/nexus-code/visual-smoke`; eight selected captures are committed for durable comparison.
