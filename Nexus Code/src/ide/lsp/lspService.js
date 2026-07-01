import { createLspClient } from "./lspClient.js";
import {
  EMPTY_COMPLETION_LIST,
  EMPTY_WORKSPACE_EDIT,
  normalizeCodeActions,
  normalizeCompletionList,
  normalizeDefinition,
  normalizeDiagnostics,
  normalizeHover,
  normalizeTextEdits,
  normalizeWorkspaceEdit,
} from "./protocol.js";
import { isLspReadyLanguage, normalizeLanguageId } from "../languages/languageIds.js";

function resolveUri(documentOrUri) {
  if (typeof documentOrUri === "string") return documentOrUri;
  return documentOrUri?.uri || "";
}

function emptyCompletionList() {
  return { ...EMPTY_COMPLETION_LIST, items: [] };
}

function emptyWorkspaceEdit() {
  return { ...EMPTY_WORKSPACE_EDIT, changes: {} };
}

async function callClientFeature(client, method, args, fallback) {
  if (typeof client?.[method] !== "function") return fallback;
  try {
    const result = await client[method](...args);
    return result ?? fallback;
  } catch (error) {
    console.warn(`LSP client feature failed: ${method}`, error);
    return fallback;
  }
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
      const diagnostics = await callClientFeature(
        client,
        "getDiagnostics",
        [document, context],
        diagnosticsByUri.get(document.uri) || [],
      );
      const normalized = normalizeDiagnostics(diagnostics);
      diagnosticsByUri.set(document.uri, normalized);
      return normalized;
    },

    async getCompletions(documentOrUri, position, context = {}) {
      const document = resolveDocument(documentOrUri);
      if (!document) return emptyCompletionList();
      const client = ensureClient(document.languageId);
      if (!client) return emptyCompletionList();
      return normalizeCompletionList(
        await callClientFeature(
          client,
          "getCompletions",
          [document, position, context],
          emptyCompletionList(),
        ),
      );
    },

    async getHover(documentOrUri, position, context = {}) {
      const document = resolveDocument(documentOrUri);
      if (!document) return null;
      const client = ensureClient(document.languageId);
      if (!client) return null;
      return normalizeHover(
        await callClientFeature(client, "getHover", [document, position, context], null),
      );
    },

    async getDefinition(documentOrUri, position, context = {}) {
      const document = resolveDocument(documentOrUri);
      if (!document) return [];
      const client = ensureClient(document.languageId);
      if (!client) return [];
      return normalizeDefinition(
        await callClientFeature(client, "getDefinition", [document, position, context], []),
      );
    },

    async formatDocument(documentOrUri, options = {}) {
      const document = resolveDocument(documentOrUri);
      if (!document) return [];
      const client = ensureClient(document.languageId);
      if (!client) return [];
      return normalizeTextEdits(
        await callClientFeature(client, "formatDocument", [document, options], []),
      );
    },

    async getCodeActions(documentOrUri, range = {}, context = {}) {
      const document = resolveDocument(documentOrUri);
      if (!document) return [];
      const client = ensureClient(document.languageId);
      if (!client) return [];
      return normalizeCodeActions(
        await callClientFeature(client, "getCodeActions", [document, range, context], []),
      );
    },

    async renameSymbol(documentOrUri, position, newName) {
      const document = resolveDocument(documentOrUri);
      if (!document) return emptyWorkspaceEdit();
      const client = ensureClient(document.languageId);
      if (!client) return emptyWorkspaceEdit();
      return normalizeWorkspaceEdit(
        await callClientFeature(
          client,
          "renameSymbol",
          [document, position, newName],
          emptyWorkspaceEdit(),
        ),
      );
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
