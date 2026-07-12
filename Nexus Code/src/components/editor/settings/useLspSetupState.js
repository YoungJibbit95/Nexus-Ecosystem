import React from "react";
import { unwrapIpcResponse } from "./settingsModels.js";

export function useLspSetupState() {
  const [servers, setServers] = React.useState([]);
  const [state, setState] = React.useState({
    loading: false,
    error: null,
    bridgeAvailable: null,
    checkedAt: null,
  });
  const refreshIdRef = React.useRef(0);
  const mountedRef = React.useRef(false);

  const refresh = React.useCallback(async () => {
    const refreshId = refreshIdRef.current + 1;
    refreshIdRef.current = refreshId;
    const api = typeof window !== "undefined" ? window.electronAPI : null;
    if (!api?.lspListServers) {
      if (!mountedRef.current) return;
      setServers([]);
      setState({
        loading: false,
        error: null,
        bridgeAvailable: false,
        checkedAt: null,
      });
      return;
    }

    if (mountedRef.current) {
      setState((current) => ({
        ...current,
        loading: true,
        error: null,
        bridgeAvailable: true,
      }));
    }

    try {
      const result = await api.lspListServers();
      const nextServers = unwrapIpcResponse(result);
      if (!mountedRef.current || refreshIdRef.current !== refreshId) return;
      setServers(Array.isArray(nextServers) ? nextServers : []);
      setState({
        loading: false,
        error: null,
        bridgeAvailable: true,
        checkedAt: new Date().toISOString(),
      });
    } catch (error) {
      if (!mountedRef.current || refreshIdRef.current !== refreshId) return;
      setServers([]);
      setState({
        loading: false,
        error: error?.message || "LSP status check failed.",
        bridgeAvailable: true,
        checkedAt: new Date().toISOString(),
      });
    }
  }, []);

  React.useEffect(() => {
    mountedRef.current = true;
    refresh();
    return () => {
      mountedRef.current = false;
    };
  }, [refresh]);

  return {
    servers,
    state,
    refresh,
  };
}
