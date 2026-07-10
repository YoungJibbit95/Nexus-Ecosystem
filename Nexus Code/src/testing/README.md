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

`smoke:visual` starts a test-only Vite harness in Electron and captures the
same fixture surfaces at 1440x900, 1024x768, 900x512, and 390x900. It still
does not import `App.jsx`, does not call the Nexus API, and writes screenshots
to the OS temp directory unless `NEXUS_CODE_VISUAL_SMOKE_OUTPUT_DIR` is set.

The visual scenario matrix is centralized in `visualSmokeScenarios.js`. Use
`NEXUS_CODE_VISUAL_SMOKE_SURFACES=editor-rust,editor-glsl` or
`NEXUS_CODE_VISUAL_SMOKE_VIEWPORTS=desktop,phone-portrait` for focused local
runs. Editor-language surfaces cover CodeMirror rendering, vertical scroll, and
token-color variance for JavaScript, MJS, JSX, JSON/JSONC, CSS/SCSS, Python,
Rust, Go, HTML, YAML, SQL, Shell, PHP, Java, C++, Gherkin, RDF, LaTeX, XQuery,
and GLSL/WGSL fallback.

If Electron exits before rendering with messages such as `GPU process isn't
usable` or `ContextResult::kFatalFailure`, treat the run as environment-blocked.
The harness keeps that as a failing result and prints a GPU/sandbox diagnostic;
do not record it as a visual success without rerunning in an Electron
environment that can create the renderer/GPU context.
