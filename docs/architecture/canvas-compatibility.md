# Canvas planning compatibility

Main exposes flat status/priority/owner/dueDate/effort/progress/tags. Mobile exposes these under `pm`, with estimate instead of effort and additional states and metadata. The shared adapter is `packages/nexus-core/src/canvas/planningCompatibility.ts`.

When `pm` exists it remains the source for projection. Main displays review as doing and idea/backlog as todo, while retaining the original `pm.status`. An explicit Main planning edit updates the corresponding pm field. Unrelated node edits retain richer values. Mobile keeps Main-only lane/icon fields. Store hydration and live workspace imports use the same projection; backup restore projects before the UI observes the new state.

Both store normalizers retain unknown board, node, connection and pm metadata. Their existing bounds for known fields and invalid-edge cleanup still apply; this is not a promise to accept arbitrary malformed Canvas data without normalization.

Canvas node patches are batched to animation frames. Both stores register a draft flush so export, persistence checkpoints and workspace replacement include the most recent queued patch. A late animation frame cannot overwrite a replacement generation.

Validation: fixtures cover every supported Mobile status, explicit Main edits, unknown metadata, lane/icon and estimate mapping. The browser harness runs actual Main and Mobile stores through hydration and storage roundtrips, including a queued node-title edit captured before its animation frame.
