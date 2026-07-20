/**
 * Scaffold providers, mock API, and Expo Router screens for VDB Digital.
 * Run: node scripts/scaffold-app-shell.js
 */
const fs = require('fs');
const path = require('path');
const root = process.cwd();

function w(rel, content) {
  const p = path.join(root, rel);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, content.replace(/\r?\n/g, '\n'), 'utf8');
  console.log('wrote', rel);
}

function rm(rel) {
  const p = path.join(root, rel);
  if (fs.existsSync(p)) {
    fs.rmSync(p, { recursive: true, force: true });
    console.log('removed', rel);
  }
}

// Remove obsolete template + duplicate design-system/components
rm('app/(tabs)');
rm('app/modal.tsx');
rm('components');
rm('constants');
rm('src/design-system/components');

// ---------- Providers ----------
w(
  'src/providers/NetworkProvider.tsx',
  `import React, { createContext, useContext, useMemo, useState } from 'react';

interface NetworkContextValue {
  isOnline: boolean;
  setOnlineForTests: (online: boolean) => void;
}

const NetworkContext = createContext<NetworkContextValue | null>(null);

export function NetworkProvider({ children }: { children: React.ReactNode }) {
  const [isOnline, setIsOnline] = useState(true);
  const value = useMemo(
    () => ({
      isOnline,
      setOnlineForTests: setIsOnline,
    }),
    [isOnline],
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
`,
);

w(
  'src/providers/FeatureFlagsProvider.tsx',
  `import React, { createContext, useContext, useMemo } from 'react';
import {
  DEFAULT_FEATURE_FLAGS,
  type FeatureFlagKey,
  isFeatureEnabled,
} from '@/security/featureFlags';
import { clientEnv } from '@/config/env';

type Flags = Record<FeatureFlagKey, boolean>;

interface FeatureFlagsContextValue {
  flags: Flags;
  enabled: (key: FeatureFlagKey) => boolean;
  remoteAvailable: boolean;
}

const FeatureFlagsContext = createContext<FeatureFlagsContextValue | null>(null);

export function FeatureFlagsProvider({ children }: { children: React.ReactNode }) {
  const remoteAvailable = !clientEnv.useMockData;
  const flags = useMemo(() => ({ ...DEFAULT_FEATURE_FLAGS }), []);
  const value = useMemo<FeatureFlagsContextValue>(
    () => ({
      flags,
      remoteAvailable,
      enabled: (key) => isFeatureEnabled(flags, key, remoteAvailable),
    }),
    [flags, remoteAvailable],
  );
  return (
    <FeatureFlagsContext.Provider value={value}>{children}</FeatureFlagsContext.Provider>
  );
}

export function useFeatureFlags(): FeatureFlagsContextValue {
  const ctx = useContext(FeatureFlagsContext);
  if (!ctx) {
    throw new Error('useFeatureFlags must be used within FeatureFlagsProvider');
  }
  return ctx;
}
`,
);

w(
  'src/providers/AuthProvider.tsx',
  `import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { Session } from '@supabase/supabase-js';
import { clientEnv } from '@/config/env';
import { getSupabase } from '@/lib/supabase';
import type { AppRole } from '@/security/roles';
import { mapLegacyAdminRole, type LegacyAdminRole } from '@/security/roles';
import type { Profile } from '@/types/domain';

export interface AuthUserView {
  id: string;
  email: string;
}

interface AuthContextValue {
  session: Session | null;
  user: AuthUserView | null;
  profile: Profile | null;
  roles: AppRole[];
  loading: boolean;
  isDemoMode: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (input: {
    email: string;
    password: string;
    fullName: string;
  }) => Promise<{ needsEmailVerification: boolean }>;
  signOut: () => Promise<void>;
  signOutAll: () => Promise<void>;
  refresh: () => Promise<void>;
  enterDemoAs: (role: 'customer' | 'partner' | 'admin') => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const DEMO_PROFILES: Record<'customer' | 'partner' | 'admin', { profile: Profile; roles: AppRole[] }> = {
  customer: {
    profile: {
      id: 'demo-customer',
      email: 'demo.klant@vdbdigital.nl',
      fullName: 'Demo Klant',
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    roles: ['customer'],
  },
  partner: {
    profile: {
      id: 'demo-partner',
      email: 'demo.partner@vdbdigital.nl',
      fullName: 'Demo Partner',
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    roles: ['customer', 'partner'],
  },
  admin: {
    profile: {
      id: 'demo-admin',
      email: 'demo.admin@vdbdigital.nl',
      fullName: 'Demo Beheerder',
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    roles: ['customer', 'staff', 'admin'],
  },
};

async function loadRoles(userId: string): Promise<AppRole[]> {
  const supabase = getSupabase();
  if (!supabase) return ['customer'];

  const roles: AppRole[] = [];
  const { data: appRoles } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .is('revoked_at', null);

  for (const row of appRoles ?? []) {
    roles.push(row.role as AppRole);
  }

  const { data: adminRows } = await supabase
    .from('admin_roles')
    .select('role')
    .eq('user_id', userId);

  for (const row of adminRows ?? []) {
    roles.push(mapLegacyAdminRole(row.role as LegacyAdminRole));
  }

  if (roles.length === 0) {
    roles.push('customer');
  }
  return Array.from(new Set(roles));
}

async function loadProfile(userId: string, email: string): Promise<Profile> {
  const supabase = getSupabase();
  if (!supabase) {
    return {
      id: userId,
      email,
      fullName: null,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }
  const { data } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
  if (!data) {
    return {
      id: userId,
      email,
      fullName: null,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }
  return {
    id: data.id,
    email: data.email,
    fullName: data.full_name,
    isActive: data.is_active,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const isDemoMode = clientEnv.useMockData;
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  const hydrate = useCallback(async (next: Session | null) => {
    setSession(next);
    if (!next?.user) {
      setProfile(null);
      setRoles([]);
      return;
    }
    const email = next.user.email ?? '';
    const [nextProfile, nextRoles] = await Promise.all([
      loadProfile(next.user.id, email),
      loadRoles(next.user.id),
    ]);
    setProfile(nextProfile);
    setRoles(nextRoles);
  }, []);

  useEffect(() => {
    let mounted = true;
    const supabase = getSupabase();

    async function boot() {
      if (!supabase) {
        if (mounted) setLoading(false);
        return;
      }
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      await hydrate(data.session);
      setLoading(false);
    }

    void boot();

    if (!supabase) {
      return () => {
        mounted = false;
      };
    }

    const { data: sub } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      void hydrate(nextSession);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [hydrate]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      const supabase = getSupabase();
      if (!supabase) {
        // Demo: any credentials → customer (never admin via login form)
        const demo = DEMO_PROFILES.customer;
        setProfile(demo.profile);
        setRoles(demo.roles);
        setSession({
          access_token: 'demo',
          refresh_token: 'demo',
          expires_in: 3600,
          token_type: 'bearer',
          user: {
            id: demo.profile.id,
            email: email || demo.profile.email,
            app_metadata: {},
            user_metadata: {},
            aud: 'authenticated',
            created_at: demo.profile.createdAt,
          },
        } as Session);
        return;
      }
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    },
    [],
  );

  const signUp = useCallback(
    async (input: { email: string; password: string; fullName: string }) => {
      const supabase = getSupabase();
      if (!supabase) {
        const demo = DEMO_PROFILES.customer;
        setProfile({ ...demo.profile, email: input.email, fullName: input.fullName });
        setRoles(['customer']);
        return { needsEmailVerification: false };
      }
      const { data, error } = await supabase.auth.signUp({
        email: input.email,
        password: input.password,
        options: { data: { full_name: input.fullName } },
      });
      if (error) throw error;
      // Role assignment to customer happens server-side / trigger; never admin here.
      if (data.user) {
        await supabase.from('user_roles').insert({
          user_id: data.user.id,
          role: 'customer',
        });
      }
      return { needsEmailVerification: !data.session };
    },
    [],
  );

  const signOut = useCallback(async () => {
    const supabase = getSupabase();
    if (supabase) {
      await supabase.auth.signOut({ scope: 'local' });
    }
    setSession(null);
    setProfile(null);
    setRoles([]);
  }, []);

  const signOutAll = useCallback(async () => {
    const supabase = getSupabase();
    if (supabase) {
      await supabase.auth.signOut({ scope: 'global' });
    }
    setSession(null);
    setProfile(null);
    setRoles([]);
  }, []);

  const refresh = useCallback(async () => {
    const supabase = getSupabase();
    if (!supabase) return;
    const { data } = await supabase.auth.getSession();
    await hydrate(data.session);
  }, [hydrate]);

  const enterDemoAs = useCallback((role: 'customer' | 'partner' | 'admin') => {
    if (!isDemoMode) return;
    const demo = DEMO_PROFILES[role];
    setProfile(demo.profile);
    setRoles(demo.roles);
    setSession({
      access_token: 'demo',
      refresh_token: 'demo',
      expires_in: 3600,
      token_type: 'bearer',
      user: {
        id: demo.profile.id,
        email: demo.profile.email,
        app_metadata: {},
        user_metadata: {},
        aud: 'authenticated',
        created_at: demo.profile.createdAt,
      },
    } as Session);
  }, [isDemoMode]);

  const user = useMemo<AuthUserView | null>(() => {
    if (!session?.user) return null;
    return { id: session.user.id, email: session.user.email ?? profile?.email ?? '' };
  }, [session, profile]);

  const value = useMemo(
    () => ({
      session,
      user,
      profile,
      roles,
      loading,
      isDemoMode,
      signIn,
      signUp,
      signOut,
      signOutAll,
      refresh,
      enterDemoAs,
    }),
    [
      session,
      user,
      profile,
      roles,
      loading,
      isDemoMode,
      signIn,
      signUp,
      signOut,
      signOutAll,
      refresh,
      enterDemoAs,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
`,
);

w(
  'src/providers/AppProviders.tsx',
  `import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClientProvider } from '@tanstack/react-query';
import { StyleSheet } from 'react-native';
import { queryClient } from '@/lib/queryClient';
import { initI18n } from '@/i18n';
import { initObservability } from '@/lib/observability';
import { AuthProvider } from './AuthProvider';
import { NetworkProvider, useNetwork } from './NetworkProvider';
import { FeatureFlagsProvider } from './FeatureFlagsProvider';
import { OfflineBanner } from '@/design-system';
import { useTranslation } from 'react-i18next';
import { colors } from '@/theme';

initI18n();

function NetworkBannerHost({ children }: { children: React.ReactNode }) {
  const { isOnline } = useNetwork();
  const { t } = useTranslation('common');
  return (
    <>
      {!isOnline ? <OfflineBanner message={t('offlineHint')} /> : null}
      {children}
    </>
  );
}

export function AppProviders({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    initObservability();
  }, []);

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <NetworkProvider>
            <FeatureFlagsProvider>
              <AuthProvider>
                <NetworkBannerHost>
                  <StatusBar style="light" />
                  {children}
                </NetworkBannerHost>
              </AuthProvider>
            </FeatureFlagsProvider>
          </NetworkProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.backgroundPrimary },
});
`,
);

console.log('providers done');
