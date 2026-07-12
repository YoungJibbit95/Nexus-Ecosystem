export {
  EDITOR_COMMAND_CATEGORIES,
  EDITOR_COMMAND_CATEGORY_ORDER,
  EDITOR_COMMANDS,
  createEditorCommandRegistry,
  getEditorCommandCategory,
  normalizeEditorCommand,
} from "./featureModel/commands.js";
export { createEditorHighlightStyle } from "./featureModel/highlightStyle.js";
export {
  cmPosToLspPosition,
  getPrimaryLspLocation,
  lspRangeToCodeMirrorRange,
  lspTextEditsToCodeMirrorChanges,
  lspWorkspaceEditToCodeMirrorChanges,
} from "./featureModel/textEdits.js";
export {
  findDiagnosticAtPosition,
  getProblemFilePath,
  getProblemKey,
  getProblemSeverityId,
  lspDiagnosticsToCodeMirror,
  lspDiagnosticsToProblems,
  lspSeverityToProblemSeverity,
  problemMatchesQuery,
  summarizeEditorDiagnostics,
} from "./featureModel/diagnostics.js";
export {
  createEditorScopeInfo,
  extractDocumentSymbols,
  getActiveDocumentSymbol,
} from "./featureModel/symbolsScope.js";
export {
  createEditorLargeFilePolicy,
  createEditorSelectionSnapshot,
  createEditorStatusModel,
  createEditorTextSelectionSnapshot,
} from "./featureModel/editorStatus.js";
export { readHoverText } from "./featureModel/lspMarkup.js";
export {
  EDITOR_LSP_FEATURE_IDS,
  createEditorLanguageFeatureModel,
  createEditorLspActionStatus,
  createEditorLspFeatureContracts,
  createEditorLspFeatureRequest,
  getEditorLspFeatureContract,
  normalizeEditorFeaturePosition,
  normalizeEditorFeatureRange,
} from "./featureModel/lspStatusActions.js";
export {
  createSnippetCompletions,
  lspCompletionsToCodeMirror,
  shouldRequestLspCompletion,
} from "./featureModel/completions.js";
