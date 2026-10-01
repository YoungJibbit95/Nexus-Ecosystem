# Current-main reconciliation before Wave 1

Date: 2026-10-01. Historical Wave 0 remains `642bde6` on `recode/nexus-code-v2-wave-0`, audited implementation `10f8684`. The original `dev` checkout still has its pending merge/staged work; it is not the current integration base and was not resolved/reset.

The freshly fetched integration base is **`0cb408b02f4ba54f0626b4031d73541b8cb94287` (`origin/main`)**, merged PR #425 after #424 and #418. New work is isolated at `F:/Coding/Nexus Workspace/Nexus-Code-v2-wave-1`, branch `recode/nexus-code-v2-wave-1`. The two audit commits were cherry-picked to retain the packet; historical evidence stays unmodified.

## Verified changes affecting Code

Current main differs in Code's `electron/main.cjs` (five-line Windows launch fix), package/lock pins, and the added `scripts/run-native-terminal-regression.cjs`. Main wraps the cmd `/s /c` command in outer quotes and uses `windowsVerbatimArguments`; non-Windows launch is unchanged. Moment/axios/brace-expansion/DOMPurify/fast-uri/undici pins are newer. Shared-core changes add planning/reminder/application contracts and strengthen draft/hydration/journal/workspace transactions; Code's renderer files and shared document save queue/mutation guard were not broadly recoded.

## Historical / fixed / open

| Finding | Historical Wave 0 | Current verification |
| --- | --- | --- |
| Quoted absolute Windows script path | Native suite 9/10, MODULE_NOT_FOUND | **Subsequently fixed in merged main. Unchanged historical native harness passes 10/10**, including real stdout/stderr/stdin/exit 7. Do not fix again |
| Quoted executable path | Not an original Wave 0 assertion | Added V7 regression exists; do not conflate it with the original quoted script case |
| Installation/tooling CI repair | Incoming pending #418 in original checkout | Included in integration base along with later merged work; local clean install still not certified here |
| Full typecheck | 4,353 diagnostics on historical base | Fresh current-main diagnostic baseline captured before implementation; compare Wave 1 by identity, not only totals |
| Full visual suite | 119/120, single recheck passes | Historical result retained. No full matrix rerun for source-identical renderer reconciliation |
| Debug simulation/PTY absence/declarative marketplace | Present/absent as audited | Still open: current main does not add DAP, PTY or executable extension host |
| Scattered IPC/commands/settings/ownership | Audited debt | Still open before Wave 1; only bounded seams will migrate |
| Native installed durability/live LSP/GitHub | Unverified | Remains unverified; merged report/CI is not acceptance of these workflows |

Minimum fresh baseline: current-main production build passes; original native characterization passes 10/10, keeping account gate/no bypass and real guards. Fresh full JS check remains red and is inventoried in [diagnostic baseline](evidence/wave-1/diagnostic-baseline.json). Logs: [build](evidence/wave-1/build-before.log), [typecheck](evidence/wave-1/typecheck-before.log), [native log](evidence/wave-1/native-historical-harness.log), [native result](evidence/wave-1/native-historical-harness.json).

Installed app/core dependencies are junctions to the already installed V7 environment. No fresh lockfile install or dependency repinning was performed in this wave. This comparison does not certify installer/platform/live account acceptance.

Subsequent authorized consolidation: foundation now lives in the main Nexus-Ecosystem folder as `b0d3fc2`, after separately reviewed persistence commit `f58ebbb`. Historical audit copies are `49408da`/`3a96e4d`. Final gates run in the main folder with its existing physical dependencies. The initial temporary worktree paths above are historical provenance; [checkpoint](10-next-session.md) and [consolidation status](evidence/wave-1/consolidation.json) govern continuation.
