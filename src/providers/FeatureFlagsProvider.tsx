import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { fromOwnerTable } from '@/api/contract/ownerClient';
import { captureException } from '@/lib/observability';
import { getSupabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';
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

const SERVER_FLAG_MAP = {
  mollie_checkout: 'mollieCheckout',
  digital_product_checkout: 'digitalProductCheckout',
  partner_payouts: 'partnerPayouts',
  push_notifications: 'pushNotifications',
  maintenance_mode: 'maintenanceMode',
} as const satisfies Record<string, FeatureFlagKey>;

const SAFE_SERVER_DEFAULTS: Pick<
  FeatureFlagMap,
  'mollieCheckout' | 'digitalProductCheckout' | 'partnerPayouts' | 'pushNotifications' | 'maintenanceMode'
> = {
  mollieCheckout: false,
  digitalProductCheckout: false,
  partnerPayouts: false,
  pushNotifications: false,
  maintenanceMode: false,
};

async function loadServerAuthoritativeFlags(): Promise<Partial<FeatureFlagMap>> {
  const supabase = getSupabase();
  if (!supabase) return {};

  const keys = Object.keys(SERVER_FLAG_MAP);
  const { data, error } = await fromOwnerTable(supabase, 'feature_flags')
    .select('key, enabled')
    .in('key', keys);
  if (error) throw error;

  const remote: Partial<FeatureFlagMap> = {};
  for (const row of data ?? []) {
    const key = typeof row.key === 'string' ? row.key : '';
    const clientKey = SERVER_FLAG_MAP[key as keyof typeof SERVER_FLAG_MAP];
    if (!clientKey || typeof row.enabled !== 'boolean') continue;
    remote[clientKey] = row.enabled;
  }
  return remote;
}

export function FeatureFlagsProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, isDemoMode, user } = useAuth();
  const [flags, setFlags] = useState<FeatureFlagMap>(() => getFeatureFlags());

  useEffect(() => {
    let cancelled = false;

    // Never carry server-authoritative state across logout/account changes.
    setFlags(setFeatureFlags(SAFE_SERVER_DEFAULTS));

    if (!isAuthenticated || isDemoMode || !user?.id) {
      return () => {
        cancelled = true;
      };
    }

    void loadServerAuthoritativeFlags()
      .then((remote) => {
        if (cancelled) return;
        // Missing rows remain fail-closed instead of inheriting a previous user's values.
        setFlags(setFeatureFlags({ ...SAFE_SERVER_DEFAULTS, ...remote }));
      })
      .catch((error) => {
        if (cancelled) return;
        // Keep safe defaults on failure.
        setFlags(setFeatureFlags(SAFE_SERVER_DEFAULTS));
        captureException(error, { feature: 'feature_flags', phase: 'remote_sync' });
      });

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, isDemoMode, user?.id]);

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
