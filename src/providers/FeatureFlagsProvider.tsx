import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import {
  getFeatureFlags,
  isFeatureEnabled,
  setFeatureFlags,
  type FeatureFlagKey,
  type FeatureFlagMap,
} from '@/security/featureFlags';

export interface FeatureFlagsContextValue {
  flags: FeatureFlagMap;
  isEnabled: (key: FeatureFlagKey) => boolean;
  /** Alias used by screens — same as isEnabled. */
  enabled: (key: FeatureFlagKey) => boolean;
  /** Test / remote-config helper — fail-closed flags still default off when undefined. */
  override: (partial: Partial<FeatureFlagMap>) => void;
}

const FeatureFlagsContext = createContext<FeatureFlagsContextValue | null>(null);

export function FeatureFlagsProvider({ children }: { children: ReactNode }) {
  const [flags, setFlags] = useState<FeatureFlagMap>(() => getFeatureFlags());

  const isEnabled = useCallback((key: FeatureFlagKey) => isFeatureEnabled(key), []);

  const override = useCallback((partial: Partial<FeatureFlagMap>) => {
    setFlags(setFeatureFlags(partial));
  }, []);

  const value = useMemo(
    () => ({
      flags,
      isEnabled,
      enabled: isEnabled,
      override,
    }),
    [flags, isEnabled, override],
  );

  return <FeatureFlagsContext.Provider value={value}>{children}</FeatureFlagsContext.Provider>;
}

export function useFeatureFlags(): FeatureFlagsContextValue {
  const ctx = useContext(FeatureFlagsContext);
  if (!ctx) {
    throw new Error('useFeatureFlags must be used within FeatureFlagsProvider');
  }
  return ctx;
}
