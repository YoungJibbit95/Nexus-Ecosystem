# Desktop and release security boundaries

This integration starts at clean main `dd0dab04b925d8e504b8f0a2efef0a7214bd3f7d`.
Selected source behavior was ported without merging historical branch ancestry.
PR #439 remains closed without merge.

Main starts without filesystem roots. Its native directory picker grants a
canonical root for the current session; existing and missing paths must remain
within a granted root, including through links. The obsolete native snippet
execution bridge is removed: the existing Main Code view remains an archive.
Production navigation is confined to canonical files inside dist. Development
permits the exact configured loopback origin. External links require HTTPS and
cannot contain URL credentials.

Code permits ordinary editing in restricted workspaces. Native confirmation
grants execution trust tied to canonical directory identity, stored outside the
workspace in the application's secure profile directory. Replacement directories
do not inherit it. Revocation invalidates pending starts and stops managed
terminal and language-server processes. Privileged IPC authenticates the live
main window and frame again after relevant asynchronous execution preflight.
Git inspection suppresses executable repository configuration; mutations require
trust. Production CSP permits local scripts without eval and bounds network
connections. Workspace Trust is not operating-system containment. An already
launched external terminal cannot be recalled, and an already completed mutation
cannot be undone by revocation.

Actions are pinned to upstream commits recorded in `.github/action-pins.json`.
Candidate builds have no signing or publication authority. Explicit manual main
release jobs process validated immutable payloads in separate environments.
Platform signing, checksum signing and publication use separate jobs and keys.
The four release environments were verified on GitHub with main-only branch
policies and a required owner review on 2026-10-07. Wiki publication is manual.
No release, tag or application deployment was performed for this integration.

Current audits required updates to transitive source-map-js, shell-quote, Joi,
http-cache-semantics and the global-agent dependency chain. Exact overrides retain
the moderate vulnerability threshold; no advisory suppression was introduced.
The relevant upstream advisories include
[shell-quote](https://github.com/advisories/GHSA-pqg4-j6r4-53mv) and
[sprintf-js](https://github.com/advisories/GHSA-hp3w-g68c-fv3c).

Local regression and disposable native-bridge results are retained in the
workspace maintenance report. They do not qualify signed, installed macOS,
Android or Linux releases. Those platform acceptance checks and operator-managed
release credentials remain prerequisites for the corresponding production release.
