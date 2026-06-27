import { createFileUriString } from "../editor/monacoModelUri.js";

const DEFAULT_CLIENT_CAPABILITIES = Object.freeze({
  textDocument: {
    synchronization: {
      dynamicRegistration: false,
      didSave: true,
    },
    completion: {
      dynamicRegistration: false,
      completionItem: {
        snippetSupport: true,
        documentationFormat: ["markdown", "plaintext"],
        deprecatedSupport: true,
        preselectSupport: true,
      },
      contextSupport: true,
    },
    hover: {
      dynamicRegistration: false,
      contentFormat: ["markdown", "plaintext"],
    },
    definition: {
      dynamicRegistration: false,
      linkSupport: true,
    },
    formatting: {
      dynamicRegistration: false,
    },
    publishDiagnostics: {
      relatedInformation: true,
      versionSupport: true,
    },
  },
  workspace: {
    configuration: false,
    workspaceFolders: true,
  },
});

function getElectronApi() {
  if (typeof window === "undefined") return null;
  return window.electronAPI || null;
}

function unwrapIpcResponse(result) {
  if (result && typeof result === "object" && "ok" in result) {
    if (result.ok === false) {
      throw new Error(result.error || "LSP backend request failed.");
    }
    return result.data;
  }
  return result;
}

function toWorkspaceUri(workspacePath) {
  return workspacePath ? createFileUriString(workspacePath) : null;
}

function normalizeLanguageId(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

export function hasElectronLspBridge() {
  const api = getElectronApi();
  return Boolean(api?.lspStart && api?.lspRequest && api?.lspNotify);
}

export function createElectronLspTransport(options = {}) {
  const api = getElectronApi();
  const languageId = normalizeLanguageId(options.languageId);
  const workspacePath = options.workspacePath || null;
  const workspaceUri = toWorkspaceUri(workspacePath);
  const disposers = new Set();
  let sessionId = null;
  let startPromise = null;
  let disposed = false;

  const emitStatus = (status) => {
    try {
      options.onStatus?.(status);
    } catch {}
  };

  const handleNotification = (payload) => {
    try {
      options.onNotification?.(payload);
      if (payload?.method === "textDocument/publishDiagnostics") {
        options.onDiagnostics?.(payload.params || {});
      }
    } catch {}
  };

  const ensureStarted = async () => {
    if (disposed) throw new Error("LSP transport is disposed.");
    if (!api?.lspStart) throw new Error("Electron LSP bridge is not available.");
    if (!workspacePath) throw new Error("A workspace folder is required for LSP.");
    if (sessionId) return sessionId;
    if (startPromise) return startPromise;

    startPromise = api
      .lspStart({ languageId, workspacePath })
      .then((result) => unwrapIpcResponse(result))
      .then((session) => {
        sessionId = session.sessionId;
        if (api.onLspNotification) {
          const dispose = api.onLspNotification(sessionId, handleNotification);
          if (dispose) disposers.add(dispose);
        }
        if (api.onLspStatus) {
          const dispose = api.onLspStatus(sessionId, emitStatus);
          if (dispose) disposers.add(dispose);
        }
        emitStatus({ ...session, state: session.state || "starting" });
        return sessionId;
      })
      .catch((error) => {
        startPromise = null;
        emitStatus({
          state: "unavailable",
          languageId,
          message: error?.message || "LSP server is unavailable.",
        });
        throw error;
      });

    return startPromise;
  };

  return {
    languageId,
    workspacePath,
    initializeParams: {
      processId: null,
      rootUri: workspaceUri,
      workspaceFolders: workspaceUri
        ? [{ uri: workspaceUri, name: workspacePath.split(/[\\/]/).pop() || "workspace" }]
        : null,
      capabilities: DEFAULT_CLIENT_CAPABILITIES,
      clientInfo: { name: "Nexus Code", version: "0.2.0" },
    },

    async request(method, params = {}) {
      const id = await ensureStarted();
      const result = await api.lspRequest({
        sessionId: id,
        method,
        params,
      });
      return unwrapIpcResponse(result);
    },

    async notify(method, params = {}) {
      const id = await ensureStarted();
      api.lspNotify({ sessionId: id, method, params });
    },

    async stop() {
      if (!sessionId || !api?.lspStop) return;
      await api.lspStop({ sessionId }).catch(() => {});
    },

    dispose() {
      disposed = true;
      for (const dispose of disposers) {
        try {
          dispose();
        } catch {}
      }
      disposers.clear();
      if (sessionId && api?.lspStop) {
        api.lspStop({ sessionId }).catch(() => {});
      }
      sessionId = null;
      startPromise = null;
    },
  };
}
