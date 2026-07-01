import {
  EMPTY_COMPLETION_LIST,
  EMPTY_WORKSPACE_EDIT,
  LSP_METHODS,
  normalizeCodeActions,
  normalizeCompletionList,
  normalizeDefinition,
  normalizeDiagnostics,
  normalizeHover,
  normalizeServerCapabilities,
  normalizeTextEdits,
  normalizeWorkspaceEdit,
  lspServerCapabilitiesToFeatureMap,
  toLspFormattingOptions,
  toLspPosition,
  toLspRange,
  toTextDocumentIdentifier,
  toTextDocumentItem,
} from "./protocol.js";

async function safeRequest(transport, method, params, fallback) {
  if (typeof transport?.request !== "function") return fallback;
  try {
    return await transport.request(method, params);
  } catch (error) {
    console.warn(`LSP request failed: ${method}`, error);
    return fallback;
  }
}

async function safeNotify(transport, method, params) {
  if (typeof transport?.notify !== "function") return;
  try {
    await transport.notify(method, params);
  } catch (error) {
    console.warn(`LSP notification failed: ${method}`, error);
  }
}

export function createLspClient(options = {}) {
  const languageId = options.languageId || "plaintext";
  const transport = options.transport || null;
  const documents = new Map();
  let initialized = false;
  let serverCapabilities = normalizeServerCapabilities(options.capabilities || {});

  return {
    languageId,
    transport,

    async initialize(capabilities = {}) {
      if (initialized) return { capabilities: serverCapabilities };
      initialized = true;
      const initializeParams = {
        processId: null,
        capabilities,
        clientInfo: { name: "Nexus Code", version: "0.2.0" },
        ...(transport?.initializeParams || {}),
        ...(options.initializeParams || {}),
      };
      const result = await safeRequest(
        transport,
        LSP_METHODS.INITIALIZE,
        initializeParams,
        { capabilities: serverCapabilities },
      );
      await safeNotify(transport, LSP_METHODS.INITIALIZED, {});
      serverCapabilities = normalizeServerCapabilities(result || serverCapabilities);
      return { ...(result || {}), capabilities: serverCapabilities };
    },

    async openDocument(document) {
      if (!document?.uri) return;
      documents.set(document.uri, document);
      await safeNotify(transport, LSP_METHODS.DID_OPEN, {
        textDocument: toTextDocumentItem(document),
      });
    },

    async updateDocument(document) {
      if (!document?.uri) return;
      documents.set(document.uri, document);
      await safeNotify(transport, LSP_METHODS.DID_CHANGE, {
        textDocument: {
          uri: document.uri,
          version: Number.isFinite(document.version) ? Number(document.version) : 1,
        },
        contentChanges: [{ text: typeof document.value === "string" ? document.value : "" }],
      });
    },

    async closeDocument(uri) {
      if (!uri) return;
      documents.delete(uri);
      await safeNotify(transport, LSP_METHODS.DID_CLOSE, {
        textDocument: { uri },
      });
    },

    getDocument(uri) {
      return documents.get(uri) || null;
    },

    getServerCapabilities() {
      return serverCapabilities;
    },

    getServerFeatures() {
      return lspServerCapabilitiesToFeatureMap(serverCapabilities);
    },

    async getCompletions(document, position, context = {}) {
      if (!document?.uri) return { ...EMPTY_COMPLETION_LIST, items: [] };
      const result = await safeRequest(
        transport,
        LSP_METHODS.COMPLETION,
        {
          textDocument: toTextDocumentIdentifier(document),
          position: toLspPosition(position),
          context,
        },
        EMPTY_COMPLETION_LIST,
      );
      return normalizeCompletionList(result);
    },

    async getHover(document, position, context = {}) {
      if (!document?.uri) return null;
      const result = await safeRequest(
        transport,
        LSP_METHODS.HOVER,
        {
          textDocument: toTextDocumentIdentifier(document),
          position: toLspPosition(position),
          context,
        },
        null,
      );
      return normalizeHover(result);
    },

    async getDefinition(document, position) {
      if (!document?.uri) return [];
      const result = await safeRequest(
        transport,
        LSP_METHODS.DEFINITION,
        {
          textDocument: toTextDocumentIdentifier(document),
          position: toLspPosition(position),
        },
        [],
      );
      return normalizeDefinition(result);
    },

    async formatDocument(document, options = {}) {
      if (!document?.uri) return [];
      const result = await safeRequest(
        transport,
        LSP_METHODS.FORMATTING,
        {
          textDocument: toTextDocumentIdentifier(document),
          options: toLspFormattingOptions(options),
        },
        [],
      );
      return normalizeTextEdits(result);
    },

    async getCodeActions(document, range = {}, context = {}) {
      if (!document?.uri) return [];
      const result = await safeRequest(
        transport,
        LSP_METHODS.CODE_ACTION,
        {
          textDocument: toTextDocumentIdentifier(document),
          range: toLspRange(range),
          context: {
            diagnostics: Array.isArray(context.diagnostics) ? context.diagnostics : [],
            ...(context.only ? { only: context.only } : {}),
            ...(context.triggerKind ? { triggerKind: context.triggerKind } : {}),
          },
        },
        [],
      );
      return normalizeCodeActions(result);
    },

    async renameSymbol(document, position, newName) {
      if (!document?.uri || !String(newName || "").trim()) {
        return { ...EMPTY_WORKSPACE_EDIT, changes: {} };
      }
      const result = await safeRequest(
        transport,
        LSP_METHODS.RENAME,
        {
          textDocument: toTextDocumentIdentifier(document),
          position: toLspPosition(position),
          newName: String(newName),
        },
        EMPTY_WORKSPACE_EDIT,
      );
      return normalizeWorkspaceEdit(result);
    },

    async getDiagnostics(document, context = {}) {
      if (!document?.uri) return [];
      const result = await safeRequest(
        transport,
        LSP_METHODS.DIAGNOSTIC,
        {
          textDocument: toTextDocumentIdentifier(document),
          context,
        },
        [],
      );
      return normalizeDiagnostics(result);
    },

    dispose() {
      documents.clear();
      initialized = false;
      serverCapabilities = normalizeServerCapabilities(options.capabilities || {});
      transport?.dispose?.();
    },
  };
}

export function createNoopLspClient(options = {}) {
  return createLspClient({ ...options, transport: null });
}
