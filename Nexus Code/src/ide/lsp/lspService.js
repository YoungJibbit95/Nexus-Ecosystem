import { createLspClient } from "./lspClient.js";
import { EMPTY_COMPLETION_LIST, normalizeDiagnostics } from "./protocol.js";
import { isLspReadyLanguage, normalizeLanguageId } from "../languages/languageIds.js";

function resolveUri(documentOrUri) {
  if (typeof documentOrUri === "string") return documentOrUri;
  return documentOrUri?.uri || "";
}

export function createLspService(options = {}) {
  const clients = new Map();
  const documents = new Map();
  const diagnosticsByUri = new Map();
  const diagnosticsListeners = new Set();
  const clientFactory =
    options.clientFactory ||
    ((languageId) =>
      createLspClient({
        languageId,
        transport: options.transports?.[languageId] || null,
      }));

  const notifyDiagnostics = (uri, diagnostics) => {
    const payload = { uri, diagnostics };
    for (const listener of diagnosticsListeners) {
      try {
        listener(payload);
      } catch (error) {
        console.error("LSP diagnostics listener failed", error);
      }
    }
  };

  const resolveDocument = (documentOrUri) => {
    if (!documentOrUri) return null;
    if (typeof documentOrUri === "string") return documents.get(documentOrUri) || null;
    if (documentOrUri.uri && documents.has(documentOrUri.uri)) {
      return documents.get(documentOrUri.uri);
    }
    return documentOrUri.uri ? documentOrUri : null;
  };

  const ensureClient = (languageId) => {
    const normalized = normalizeLanguageId(languageId);
    if (!isLspReadyLanguage(normalized) && options.allowUnsupportedLanguages !== true) {
      return null;
    }
    if (!clients.has(normalized)) {
      clients.set(normalized, clientFactory(normalized));
    }
    return clients.get(normalized) || null;
  };

  return {
    registerClient(languageId, client) {
      const normalized = normalizeLanguageId(languageId);
      clients.set(normalized, client || clientFactory(normalized));
      return clients.get(normalized);
    },

    getClient(languageId) {
      return clients.get(normalizeLanguageId(languageId)) || null;
    },

    ensureClient,

    async openDocument(document) {
      if (!document?.uri) return;
      documents.set(document.uri, document);
      const client = ensureClient(document.languageId);
      await client?.initialize?.();
      await client?.openDocument?.(document);
    },

    async updateDocument(document) {
      if (!document?.uri) return;
      documents.set(document.uri, document);
      const client = ensureClient(document.languageId);
      await client?.updateDocument?.(document);
    },

    async closeDocument(documentOrUri) {
      const uri = resolveUri(documentOrUri);
      const document = documents.get(uri);
      documents.delete(uri);
      diagnosticsByUri.delete(uri);
      const client = document ? ensureClient(document.languageId) : null;
      await client?.closeDocument?.(uri);
    },

    getDocument(documentOrUri) {
      return resolveDocument(documentOrUri);
    },

    listDocuments() {
      return [...documents.values()];
    },

    setDiagnostics(documentOrUri, diagnostics) {
      const uri = resolveUri(documentOrUri);
      if (!uri) return [];
      const normalized = normalizeDiagnostics(diagnostics);
      diagnosticsByUri.set(uri, normalized);
      notifyDiagnostics(uri, normalized);
      return normalized;
    },

    async getDiagnostics(documentOrUri, context = {}) {
      const document = resolveDocument(documentOrUri);
      if (!document) return [];
      const client = ensureClient(document.languageId);
      if (!client) return diagnosticsByUri.get(document.uri) || [];
      const diagnostics = await client.getDiagnostics(document, context);
      const normalized = normalizeDiagnostics(diagnostics);
      diagnosticsByUri.set(document.uri, normalized);
      return normalized;
    },

    async getCompletions(documentOrUri, position, context = {}) {
      const document = resolveDocument(documentOrUri);
      if (!document) return { ...EMPTY_COMPLETION_LIST, items: [] };
      const client = ensureClient(document.languageId);
      if (!client) return { ...EMPTY_COMPLETION_LIST, items: [] };
      return client.getCompletions(document, position, context);
    },

    async getHover(documentOrUri, position, context = {}) {
      const document = resolveDocument(documentOrUri);
      if (!document) return null;
      const client = ensureClient(document.languageId);
      if (!client) return null;
      return client.getHover(document, position, context);
    },

    async getDefinition(documentOrUri, position, context = {}) {
      const document = resolveDocument(documentOrUri);
      if (!document) return [];
      const client = ensureClient(document.languageId);
      if (!client) return [];
      return client.getDefinition(document, position, context);
    },

    async formatDocument(documentOrUri, options = {}) {
      const document = resolveDocument(documentOrUri);
      if (!document) return [];
      const client = ensureClient(document.languageId);
      if (!client) return [];
      return client.formatDocument(document, options);
    },

    onDiagnostics(listener) {
      diagnosticsListeners.add(listener);
      return () => diagnosticsListeners.delete(listener);
    },

    dispose() {
      for (const client of clients.values()) {
        client?.dispose?.();
      }
      clients.clear();
      documents.clear();
      diagnosticsByUri.clear();
      diagnosticsListeners.clear();
    },
  };
}
