import {
  EMPTY_COMPLETION_LIST,
  LSP_METHODS,
  normalizeCompletionList,
  normalizeDiagnostics,
  normalizeHover,
  toLspPosition,
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

  return {
    languageId,
    transport,

    async initialize(capabilities = {}) {
      if (initialized) return { capabilities: options.capabilities || {} };
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
        { capabilities: options.capabilities || {} },
      );
      await safeNotify(transport, LSP_METHODS.INITIALIZED, {});
      return result || { capabilities: {} };
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
      transport?.dispose?.();
    },
  };
}

export function createNoopLspClient(options = {}) {
  return createLspClient({ ...options, transport: null });
}
