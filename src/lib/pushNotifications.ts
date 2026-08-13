import * as Application from 'expo-application';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { getSupabase } from '@/lib/supabase';

let currentExpoPushToken: string | null = null;

export function resolveExpoProjectId(): string | null {
  const projectId =
    Constants.easConfig?.projectId ??
    (Constants.expoConfig?.extra?.eas as { projectId?: string } | undefined)?.projectId;
  return typeof projectId === 'string' && projectId.trim() ? projectId.trim() : null;
}

export async function getOrCreateCurrentExpoPushToken(): Promise<string | null> {
  if (Platform.OS !== 'android' && Platform.OS !== 'ios') return null;
  if (!Device.isDevice) return null;
  if (currentExpoPushToken) return currentExpoPushToken;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'VDB Digital',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#C7A66A',
    });
  }

  let permission = await Notifications.getPermissionsAsync();
  if (permission.status === 'undetermined') {
    permission = await Notifications.requestPermissionsAsync();
  }
  if (permission.status !== 'granted') return null;

  const projectId = resolveExpoProjectId();
  if (!projectId) throw new Error('Expo EAS project id is missing');

  const tokenResult = await Notifications.getExpoPushTokenAsync({ projectId });
  const token = tokenResult.data?.trim();
  if (!token) throw new Error('Expo push token is empty');
  currentExpoPushToken = token;
  return token;
}

export async function registerCurrentPushToken(): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;

  const token = await getOrCreateCurrentExpoPushToken();
  if (!token) return false;

  const { data, error } = await supabase.functions.invoke('register-push-token', {
    body: {
      token,
      platform: Platform.OS,
      deviceId: null,
      appVersion: Application.nativeApplicationVersion ?? Constants.expoConfig?.version ?? null,
      active: true,
    },
  });

  if (error) throw error;
  const payload = data as { ok?: boolean; error?: string } | null;
  if (!payload?.ok) throw new Error(payload?.error ?? 'Push token registration failed');
  return true;
}

/**
 * Best-effort revocation while the current Supabase session still exists.
 * Must be called before auth.signOut().
 */
export async function revokeCurrentPushToken(): Promise<void> {
  const supabase = getSupabase();
  if (!supabase || !currentExpoPushToken) return;

  const token = currentExpoPushToken;
  const { data, error } = await supabase.functions.invoke('register-push-token', {
    body: {
      token,
      platform: Platform.OS === 'ios' ? 'ios' : 'android',
      active: false,
    },
  });

  if (error) throw error;
  const payload = data as { ok?: boolean; error?: string } | null;
  if (!payload?.ok) throw new Error(payload?.error ?? 'Push token revocation failed');
  currentExpoPushToken = null;
}
