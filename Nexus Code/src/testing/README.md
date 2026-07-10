# Nexus Code UI Smoke Harness

This folder is test-only. It renders Nexus Code component surfaces directly with
fixtures so the UI can be smoke-checked while the normal `App.jsx` account gate
stays strict.

Run:

```sh
npm run smoke:ui
npm run smoke:visual
```

`smoke:ui` does not start Electron, does not call the Nexus API, and does not
persist account state. Keep runtime login, account validation, and boot-gate
logic out of this folder.

`smoke:visual` starts a test-only Vite harness in Electron and captures fixture
surfaces without importing `App.jsx` or calling the Nexus API. The default
`full` preset covers 4 viewports x 30 surfaces (120 screenshots). It writes
screenshots plus `summary.json` and `summary.md` to the OS temp directory unless
`NEXUS_CODE_VISUAL_SMOKE_OUTPUT_DIR` is set.

The visual scenario matrix is centralized in `visualSmokeScenarios.js`.

- Full QA: `npm run smoke:visual`
- Focused QA: `NEXUS_CODE_VISUAL_SMOKE_PRESET=focused npm run smoke:visual`
- Custom surfaces: `NEXUS_CODE_VISUAL_SMOKE_SURFACES=editor-rust,editor-glsl`
- Custom viewports: `NEXUS_CODE_VISUAL_SMOKE_VIEWPORTS=desktop,phone-portrait`

In PowerShell, set env vars before the command, for example
`$env:NEXUS_CODE_VISUAL_SMOKE_PRESET="focused"; npm run smoke:visual`.

The `focused` preset covers `launchpad`, `editor-rust`, and `editor-glsl` at
`desktop` and `short-wide` (6 screenshots). Custom filters override that preset
dimension, so `NEXUS_CODE_VISUAL_SMOKE_PRESET=focused` can still be combined
with an explicit surface or viewport list. Duplicate comma/space-separated
filter entries are de-duped before scenarios are generated.

Editor-language surfaces cover CodeMirror rendering, vertical scroll, and
token-color variance for JavaScript, MJS, JSX, JSON/JSONC, CSS/SCSS, Python,
Rust, Go, HTML, YAML, SQL, Shell, PHP, Java, C++, Gherkin, RDF, LaTeX, XQuery,
and GLSL/WGSL fallback.

Useful timeout knobs:

- `NEXUS_CODE_VISUAL_SMOKE_TIMEOUT_MS`: per-scenario renderer readiness timeout.
- `NEXUS_CODE_VISUAL_SMOKE_PROCESS_TIMEOUT_MS`: whole Electron run timeout.
- `NEXUS_CODE_VISUAL_SMOKE_PORT`: fixed harness port, or unset/0 for an open port.

If Electron exits before rendering with messages such as `GPU process isn't
usable` or `ContextResult::kFatalFailure`, treat the run as environment-blocked.
The harness keeps that as a failing result and prints a GPU/sandbox diagnostic;
do not record it as a visual success without rerunning in an Electron
environment that can create the renderer/GPU context.
