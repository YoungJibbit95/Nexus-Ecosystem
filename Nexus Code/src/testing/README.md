# Nexus Code UI Smoke Harness

This folder is test-only. It renders Nexus Code component surfaces directly with
fixtures so the UI can be smoke-checked while the normal `App.jsx` account gate
stays strict.

Run:

```sh
npm run smoke:ui
```

The smoke does not start Electron, does not call the Nexus API, and does not
persist account state. Keep runtime login, account validation, and boot-gate
logic out of this folder.
