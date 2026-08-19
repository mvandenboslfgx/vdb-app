/**
 * AuthProvider
 *
 * When Supabase env is configured: real session via PKCE + SecureStore.
 * When Supabase is NOT configured: DEMO mode with a mock customer user so
 * local UI work continues. Documented clearly in common.demoMode strings.
 *
 * Security: public register NEVER assigns admin/staff/owner roles client-side.
 */
import type { Session, User } from '@supabase/supabase-js';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { clientEnv } from '@/config/env';
import { fetchRolesForUser } from '@/lib/auth/fetchRoles';
import {
  classifyBootstrapError,
  classifySupabaseAuthError,
} from '@/lib/auth/signInErrors';
import { shouldClearQueryCacheOnSessionChange } from '@/lib/auth/sessionCache';
import { getSupabase } from '@/lib/supabase';
import { isPubliclyAssignableRole } from '@/security/roles';
import type { AppRole, Profile } from '@/types/domain';

const DEMO_USER_ID = 'demo-customer-0001';

const DEMO_PROFILE: Profile = {
  id: DEMO_USER_ID,
  email: 'demo@vdbdigital.nl',
  fullName: 'Demo Klant',
  phone: '+31612345678',
  avatarUrl: null,
  locale: 'nl',
  roles: ['customer'],
  emailVerified: true,
  createdAt: '2026-01-01T10:00:00.000Z',
  updatedAt: '2026-01-01T10:00:00.000Z',
};

export interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  roles: AppRole[];
  loading: boolean;
  /** Alias for screens that use isLoading */
  isLoading: boolean;
  isAuthenticated: boolean;
  isDemoMode: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (input: {
    email: string;
    password: string;
    fullName: string;
    phone?: string;
  }) => Promise<{ needsEmailConfirmation: boolean }>;
  signOut: () => Promise<void>;
  signOutAll: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  resendVerification: (email?: string) => Promise<void>;
  enterDemoAs: (role: 'customer' | 'partner' | 'admin') => void;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function mapProfileFromUser(user: User, roles: AppRole[] = ['customer']): Profile {
  const meta = user.user_metadata ?? {};
  return {
    id: user.id,
    email: user.email ?? '',
    fullName: typeof meta.full_name === 'string' ? meta.full_name : (user.email ?? ''),
    phone: typeof meta.phone === 'string' ? meta.phone : null,
    avatarUrl: typeof meta.avatar_url === 'string' ? meta.avatar_url : null,
    locale: meta.locale === 'en' ? 'en' : 'nl',
    // Keep DB roles intact — privileged roles are assigned server-side only.
    roles: roles.length > 0 ? roles : ['customer'],
    emailVerified: Boolean(user.email_confirmed_at),
    createdAt: user.created_at,
    updatedAt: user.updated_at ?? user.created_at,
  };
}

/** Strip any privileged roles that a client might try to claim during register. */
function sanitizePublicRoles(roles: readonly AppRole[]): AppRole[] {
  const allowed = roles.filter(isPubliclyAssignableRole);
  return allowed.length > 0 ? [...allowed] : ['customer'];
}

const DEMO_PROFILES: Record<
  'customer' | 'partner' | 'admin',
  { profile: Profile; roles: AppRole[] }
> = {
  customer: {
    profile: DEMO_PROFILE,
    roles: ['customer'],
  },
  partner: {
    profile: {
      ...DEMO_PROFILE,
      id: 'demo-partner-0001',
      email: 'demo.partner@vdbdigital.nl',
      fullName: 'Demo Partner',
      roles: ['customer', 'partner'],
    },
    roles: ['customer', 'partner'],
  },
  admin: {
    profile: {
      ...DEMO_PROFILE,
      id: 'demo-admin-0001',
      email: 'demo.admin@vdbdigital.nl',
      fullName: 'Demo Beheerder',
      roles: ['customer', 'staff', 'admin'],
    },
    roles: ['customer', 'staff', 'admin'],
  },
};

export function AuthProvider({ children }: { children: ReactNode }) {
  /** Demo only when explicitly enabled in development — never silent fallback. */
  const isDemoMode = clientEnv.useMockData;
  const queryClient = useQueryClient();
  const lastUserIdRef = useRef<string | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(!isDemoMode);

  const applySession = useCallback(
    async (next: Session | null) => {
      const nextId = next?.user?.id ?? null;
      if (shouldClearQueryCacheOnSessionChange(lastUserIdRef.current, nextId)) {
        queryClient.clear();
      }
      lastUserIdRef.current = nextId;

      setSession(next);
      setUser(next?.user ?? null);
      if (!next?.user) {
        setProfile(null);
        setRoles([]);
        return;
      }
      const nextRoles = await fetchRolesForUser(next.user.id);
      setRoles(nextRoles);
      setProfile(mapProfileFromUser(next.user, nextRoles));
    },
    [queryClient],
  );

  useEffect(() => {
    if (isDemoMode) {
      setLoading(false);
      return;
    }

    const supabase = getSupabase();
    if (!supabase) {
      setLoading(false);
      return;
    }

    let mounted = true;

    void (async () => {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      await applySession(data.session);
      setLoading(false);
    })();

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      void applySession(nextSession);
    });

    return () => {
      mounted = false;
      subscription.subscription.unsubscribe();
    };
  }, [applySession, isDemoMode]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      if (isDemoMode) {
        // DEMO: accept any non-empty credentials as the mock customer.
        if (!email.trim() || !password) {
          throw new Error('errors.auth.invalidCredentials');
        }
        queryClient.clear();
        lastUserIdRef.current = DEMO_USER_ID;
        setProfile({
          ...DEMO_PROFILE,
          email: email.trim().toLowerCase(),
          fullName: email.split('@')[0] || DEMO_PROFILE.fullName,
        });
        setRoles(['customer']);
        setSession(null);
        setUser(null);
        return;
      }

      const supabase = getSupabase();
      if (!supabase) {
        throw new Error('errors.auth.network');
      }
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        throw new Error(classifySupabaseAuthError(error));
      }
      if (!data.session) {
        throw new Error('errors.auth.emailNotConfirmed');
      }
      // Apply session + roles before callers navigate — otherwise resolveHomeRoute([])
      // treats an empty role list as customer and skips admin/partner areas.
      try {
        await applySession(data.session);
      } catch (bootstrapError) {
        await supabase.auth.signOut({ scope: 'local' });
        throw new Error(classifyBootstrapError(bootstrapError));
      }
    },
    [applySession, isDemoMode, queryClient],
  );

  const signUp = useCallback(
    async (input: { email: string; password: string; fullName: string; phone?: string }) => {
      // Never allow client to set admin role on register.
      const publicRoles = sanitizePublicRoles(['customer']);

      if (isDemoMode) {
        setProfile({
          ...DEMO_PROFILE,
          id: `demo-${Date.now()}`,
          email: input.email.trim().toLowerCase(),
          fullName: input.fullName.trim(),
          phone: input.phone?.trim() || null,
          roles: publicRoles,
          emailVerified: true,
        });
        setRoles(publicRoles);
        return { needsEmailConfirmation: false };
      }

      const supabase = getSupabase();
      if (!supabase) {
        throw new Error('Supabase is not configured');
      }

      const { data, error } = await supabase.auth.signUp({
        email: input.email,
        password: input.password,
        options: {
          data: {
            full_name: input.fullName,
            phone: input.phone ?? '',
            // Roles are assigned server-side only; metadata is informational.
            requested_role: 'customer',
          },
        },
      });

      if (error) {
        throw new Error(error.message);
      }

      return { needsEmailConfirmation: !data.session };
    },
    [isDemoMode],
  );

  const signOut = useCallback(async () => {
    if (isDemoMode) {
      queryClient.clear();
      lastUserIdRef.current = null;
      setProfile(null);
      setRoles([]);
      setSession(null);
      setUser(null);
      return;
    }
    const supabase = getSupabase();
    if (!supabase) return;
    await supabase.auth.signOut({ scope: 'local' });
  }, [isDemoMode, queryClient]);

  const signOutAll = useCallback(async () => {
    if (isDemoMode) {
      queryClient.clear();
      lastUserIdRef.current = null;
      setProfile(null);
      setRoles([]);
      setSession(null);
      setUser(null);
      return;
    }
    const supabase = getSupabase();
    if (!supabase) return;
    await supabase.auth.signOut({ scope: 'global' });
  }, [isDemoMode, queryClient]);

  const refresh = useCallback(async () => {
    if (isDemoMode) {
      if (profile) {
        setProfile({ ...profile, updatedAt: new Date().toISOString() });
      }
      return;
    }
    const supabase = getSupabase();
    if (!supabase) return;
    const { data } = await supabase.auth.getSession();
    await applySession(data.session);
  }, [applySession, isDemoMode, profile]);

  const enterDemoAs = useCallback(
    (role: 'customer' | 'partner' | 'admin') => {
      if (!clientEnv.demoAllowed || !isDemoMode) return;
      const demo = DEMO_PROFILES[role];
      setProfile(demo.profile);
      setRoles(demo.roles);
      setSession(null);
      setUser(null);
    },
    [isDemoMode],
  );

  const requestPasswordReset = useCallback(
    async (email: string) => {
      if (isDemoMode) {
        return;
      }
      const supabase = getSupabase();
      if (!supabase) throw new Error('Supabase is not configured');
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
      if (error) throw new Error(error.message);
    },
    [isDemoMode],
  );

  const updatePassword = useCallback(
    async (password: string) => {
      if (isDemoMode) {
        return;
      }
      const supabase = getSupabase();
      if (!supabase) throw new Error('Supabase is not configured');
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw new Error(error.message);
    },
    [isDemoMode],
  );

  const resendVerification = useCallback(
    async (email?: string) => {
      if (isDemoMode) {
        return;
      }
      const supabase = getSupabase();
      if (!supabase) throw new Error('Supabase is not configured');
      const target = email?.trim() || user?.email;
      if (!target) throw new Error('Email required');
      const { error } = await supabase.auth.resend({ type: 'signup', email: target });
      if (error) throw new Error(error.message);
    },
    [isDemoMode, user?.email],
  );

  const isAuthenticated = Boolean(session) || Boolean(profile);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user,
      profile,
      roles,
      loading,
      isLoading: loading,
      isAuthenticated,
      isDemoMode,
      signIn,
      signUp,
      signOut,
      signOutAll,
      requestPasswordReset,
      updatePassword,
      resendVerification,
      enterDemoAs,
      refresh,
    }),
    [
      session,
      user,
      profile,
      roles,
      loading,
      isAuthenticated,
      isDemoMode,
      signIn,
      signUp,
      signOut,
      signOutAll,
      requestPasswordReset,
      updatePassword,
      resendVerification,
      enterDemoAs,
      refresh,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
