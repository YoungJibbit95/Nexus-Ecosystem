# Cached view commands and Task edits

Main keeps selected views mounted to retain their local state. The view host now supplies active command ownership; Tasks, Notes, Files, Flux, Reminders and Canvas keyboard handlers yield when hidden, while workspace replacement is active, for already handled events, input methods or repeated presses. Editor/select/contenteditable targets retain their own search and typing events. Intentional modified Flux and Canvas commands keep their explicit branches.

Task date inputs preserve the exact original deadline when the displayed date is unchanged. Changing its date preserves an existing time/offset/precision suffix; clearing removes the deadline. A date-only deadline remains date-only. This preserves existing temporal kinds and does not infer a named zone from an offset.

The Task dialog has a labelled modal role, title focus, bounded Tab/Shift+Tab containment, Escape close and focus return. Its quick-add shortcuts suspend while the form is open. These local fixes do not establish a universal overlay/screen-reader/native-picker contract.

`node tools/run-task-interaction-browser-smoke.mjs` exercises actual cached Main views and Task controls in isolated Electron (62 assertions at this checkpoint). The deadline helper has three regression tests. The styled Task dialog was captured separately; native find UI, real screen-reader, touch and device acceptance remain open.
