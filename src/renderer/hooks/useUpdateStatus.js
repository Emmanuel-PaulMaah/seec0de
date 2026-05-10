import { useEffect, useState, useCallback } from 'react';

// Default status used when the preload bridge isn't available
// (e.g. when running the renderer outside Electron, or before the
// initial getStatus() resolves).
const FALLBACK = {
  appVersion: 'dev',
  status: 'idle',
  info: null,
  lastChecked: null,
  error: null,
  releaseNotes: null,
  progress: null,
};

const bridge = (typeof window !== 'undefined' && window.seecode && window.seecode.updates)
  ? window.seecode.updates
  : null;

export function useUpdateStatus() {
  const [state, setState] = useState(FALLBACK);

  useEffect(() => {
    if (!bridge) return undefined;

    let cancelled = false;
    bridge.getStatus().then((s) => {
      if (!cancelled && s) setState(s);
    });

    const unsubscribe = bridge.onStatus((payload) => {
      if (payload) setState(payload);
    });

    return () => {
      cancelled = true;
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const checkNow = useCallback(() => {
    if (!bridge) return Promise.resolve(null);
    return bridge.checkNow();
  }, []);

  const installNow = useCallback(() => {
    if (!bridge) return Promise.resolve(false);
    return bridge.installNow();
  }, []);

  return { ...state, checkNow, installNow, bridgeAvailable: Boolean(bridge) };
}
