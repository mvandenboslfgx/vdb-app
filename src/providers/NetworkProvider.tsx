import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export interface NetworkContextValue {
  isOnline: boolean;
  /** Alias for design-system OfflineBanner */
  isConnected: boolean;
  /** Test helper — forces offline state without NetInfo. */
  setOffline: (offline: boolean) => void;
}

const NetworkContext = createContext<NetworkContextValue | null>(null);

type NetInfoModule = {
  addEventListener: (
    listener: (state: { isConnected: boolean | null; isInternetReachable: boolean | null }) => void,
  ) => () => void;
};

function tryLoadNetInfo(): NetInfoModule | null {
  try {
    // Optional dependency — fall back when not installed / not linked.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('@react-native-community/netinfo').default as NetInfoModule;
  } catch {
    return null;
  }
}

export function NetworkProvider({ children }: { children: ReactNode }) {
  const [isOnline, setIsOnline] = useState(true);
  const [forcedOffline, setForcedOffline] = useState(false);

  useEffect(() => {
    const NetInfo = tryLoadNetInfo();
    if (!NetInfo) {
      return;
    }
    return NetInfo.addEventListener((state) => {
      const connected = state.isConnected !== false && state.isInternetReachable !== false;
      setIsOnline(connected);
    });
  }, []);

  const setOffline = useCallback((offline: boolean) => {
    setForcedOffline(offline);
  }, []);

  const online = forcedOffline ? false : isOnline;

  const value = useMemo<NetworkContextValue>(
    () => ({
      isOnline: online,
      isConnected: online,
      setOffline,
    }),
    [online, setOffline],
  );

  return <NetworkContext.Provider value={value}>{children}</NetworkContext.Provider>;
}

export function useNetwork(): NetworkContextValue {
  const ctx = useContext(NetworkContext);
  if (!ctx) {
    throw new Error('useNetwork must be used within NetworkProvider');
  }
  return ctx;
}
