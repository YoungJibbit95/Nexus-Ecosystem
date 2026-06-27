import { createLspService } from "../lsp/lspService.js";
import {
  detectLanguageId,
  getLanguageDefinition as resolveLanguageDefinition,
  isLspReadyLanguage as resolveLspReadyLanguage,
  normalizeLanguageId,
} from "../languages/languageIds.js";
import { createDocumentUriDescriptor } from "./monacoModelUri.js";

export const EDITOR_ENGINE_CONTRACT_VERSION = "0.1.0";

export const EDITOR_ENGINE_EVENTS = Object.freeze({
  DOCUMENT_OPENED: "documentOpened",
  DOCUMENT_CHANGED: "documentChanged",
  DOCUMENT_CLOSED: "documentClosed",
  DIAGNOSTICS_CHANGED: "diagnosticsChanged",
});

export const EDITOR_ENGINE_CAPABILITIES = Object.freeze({
  languageRegistry: true,
  monacoModelUris: true,
  lspCompletion: true,
  lspHover: true,
  lspDiagnostics: true,
  externalServerProcesses: true,
});

/**
 * @typedef {Object} EditorPosition
 * @property {number} lineNumber
 * @property {number} column
 */

/**
 * @typedef {Object} EditorDocument
 * @property {string} id
 * @property {string} uri
 * @property {string} modelPath
 * @property {string} path
 * @property {string|null} fsPath
 * @property {string|null} workspacePath
 * @property {string} languageId
 * @property {string} value
 * @property {number} version
 * @property {boolean} dirty
 * @property {Record<string, unknown>} metadata
 */

function createDocumentId(uri) {
  return `doc:${uri}`;
}

function emit(listeners, eventName, payload) {
  for (const listener of listeners) {
    try {
      listener(eventName, payload);
    } catch (error) {
      console.error("EditorEngine listener failed", error);
    }
  }
}

/**
 * @param {Object} input
 * @param {string} [input.id]
 * @param {string} [input.uri]
 * @param {string} [input.modelPath]
 * @param {string} [input.fileName]
 * @param {string} [input.path]
 * @param {string} [input.name]
 * @param {string} [input.fsPath]
 * @param {string} [input.workspacePath]
 * @param {string} [input.languageId]
 * @param {string} [input.value]
 * @param {number} [input.version]
 * @param {boolean} [input.dirty]
 * @param {Record<string, unknown>} [input.metadata]
 * @returns {EditorDocument}
 */
export function createEditorDocument(input = {}) {
  const descriptor = createDocumentUriDescriptor(input);
  const languageSource =
    input.languageId ||
    detectLanguageId(input.fsPath || input.fileName || input.path || input.name || descriptor.path);

  return {
    id: input.id || createDocumentId(descriptor.uri),
    uri: descriptor.uri,
    modelPath: input.modelPath || descriptor.modelPath,
    path: descriptor.path,
    fsPath: descriptor.fsPath,
    workspacePath: descriptor.workspacePath,
    languageId: normalizeLanguageId(languageSource),
    value: typeof input.value === "string" ? input.value : "",
    version: Number.isFinite(input.version) ? Number(input.version) : 1,
    dirty: input.dirty === true,
    metadata: input.metadata && typeof input.metadata === "object" ? { ...input.metadata } : {},
  };
}

export function createEditorEngine(options = {}) {
  const documents = new Map();
  const listeners = new Set();
  const lspService = options.lspService || createLspService(options.lsp || {});

  const resolveDocument = (documentOrUri) => {
    if (!documentOrUri) return null;
    if (typeof documentOrUri === "string") {
      return documents.get(documentOrUri) || null;
    }
    if (documentOrUri.uri && documents.has(documentOrUri.uri)) {
      return documents.get(documentOrUri.uri);
    }
    return createEditorDocument(documentOrUri);
  };

  return {
    contractVersion: EDITOR_ENGINE_CONTRACT_VERSION,
    capabilities: EDITOR_ENGINE_CAPABILITIES,
    lspService,

    onEvent(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },

    async openDocument(input) {
      const document = createEditorDocument(input);
      documents.set(document.uri, document);
      await lspService.openDocument(document);
      emit(listeners, EDITOR_ENGINE_EVENTS.DOCUMENT_OPENED, document);
      return document;
    },

    async updateDocument(documentOrUri, value, patch = {}) {
      const current = resolveDocument(documentOrUri);
      if (!current) return null;
      const next = {
        ...current,
        ...patch,
        value: typeof value === "string" ? value : current.value,
        version: Number.isFinite(patch.version) ? Number(patch.version) : current.version + 1,
        dirty: patch.dirty ?? true,
      };
      documents.set(next.uri, next);
      await lspService.updateDocument(next);
      emit(listeners, EDITOR_ENGINE_EVENTS.DOCUMENT_CHANGED, next);
      return next;
    },

    async closeDocument(documentOrUri) {
      const document = resolveDocument(documentOrUri);
      if (!document) return false;
      documents.delete(document.uri);
      await lspService.closeDocument(document.uri);
      emit(listeners, EDITOR_ENGINE_EVENTS.DOCUMENT_CLOSED, document);
      return true;
    },

    getDocument(documentOrUri) {
      return resolveDocument(documentOrUri);
    },

    listDocuments() {
      return [...documents.values()];
    },

    getLanguageDefinition(languageId) {
      return resolveLanguageDefinition(languageId);
    },

    getLanguageIdForPath(resourcePath) {
      return detectLanguageId(resourcePath);
    },

    isLspReadyLanguage(languageId) {
      return resolveLspReadyLanguage(languageId);
    },

    async getCompletions(documentOrUri, position, context = {}) {
      const document = resolveDocument(documentOrUri);
      if (!document) return { isIncomplete: false, items: [] };
      return lspService.getCompletions(document, position, context);
    },

    async getHover(documentOrUri, position, context = {}) {
      const document = resolveDocument(documentOrUri);
      if (!document) return null;
      return lspService.getHover(document, position, context);
    },

    async getDiagnostics(documentOrUri, context = {}) {
      const document = resolveDocument(documentOrUri);
      if (!document) return [];
      return lspService.getDiagnostics(document, context);
    },

    dispose() {
      listeners.clear();
      documents.clear();
      lspService.dispose();
    },
  };
}
