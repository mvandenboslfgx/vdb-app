import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import { clientEnv, hasSupabaseConfig } from '@/config/env';
import type { Database } from '@/types/database.generated';

export type TypedSupabaseClient = SupabaseClient<Database>;

const ExpoSecureStoreAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    if (Platform.OS === 'web') {
      try {
        return globalThis.localStorage?.getItem(key) ?? null;
      } catch {
        return null;
      }
    }
    return SecureStore.getItemAsync(key);
  },
  setItem: async (key: string, value: string): Promise<void> => {
    if (Platform.OS === 'web') {
      try {
        globalThis.localStorage?.setItem(key, value);
      } catch {
        // ignore quota / private mode
      }
      return;
    }
    await SecureStore.setItemAsync(key, value);
  },
  removeItem: async (key: string): Promise<void> => {
    if (Platform.OS === 'web') {
      try {
        globalThis.localStorage?.removeItem(key);
      } catch {
        // ignore
      }
      return;
    }
    await SecureStore.deleteItemAsync(key);
  },
};

let client: TypedSupabaseClient | null = null;

/**
 * Returns a configured Supabase client, or `null` when env is missing / placeholder.
 * Prefer this for optional integrations; use `requireSupabase()` when auth is mandatory.
 */
export function getSupabase(): TypedSupabaseClient | null {
  if (!hasSupabaseConfig) {
    return null;
  }
  if (!client) {
    client = createClient<Database>(clientEnv.supabaseUrl, clientEnv.supabaseAnonKey, {
      auth: {
        storage: ExpoSecureStoreAdapter,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
        flowType: 'pkce',
      },
    });
  }
  return client;
}

/**
 * Returns a configured Supabase client or throws a clear configuration error.
 */
export function requireSupabase(): TypedSupabaseClient {
  const supabase = getSupabase();
  if (!supabase) {
    throw new Error(
      'Supabase is not configured. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.',
    );
  }
  return supabase;
}

export function isSupabaseReady(): boolean {
  return hasSupabaseConfig && getSupabase() !== null;
}
