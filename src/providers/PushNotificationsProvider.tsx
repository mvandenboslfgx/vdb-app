import * as Application from 'expo-application';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import React, { useEffect, type ReactNode } from 'react';
import { Platform } from 'react-native';

import { captureException } from '@/lib/observability';
import { getSupabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';
import { useFeatureFlags } from '@/providers/FeatureFlagsProvider';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

function resolveProjectId(): string | null {
  const projectId =
    Constants.easConfig?.projectId ??
    (Constants.expoConfig?.extra?.eas as { projectId?: string } | undefined)?.projectId;
  return typeof projectId === 'string' && projectId.trim() ? projectId.trim() : null;
}

async function registerCurrentDevice(userId: string): Promise<void> {
  if (Platform.OS !== 'android' && Platform.OS !== 'ios') return;
  if (!Device.isDevice) return;

  const supabase = getSupabase();
  if (!supabase) return;

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
  if (permission.status !== 'granted') return;

  const projectId = resolveProjectId();
  if (!projectId) throw new Error('Expo EAS project id is missing');

  const tokenResult = await Notifications.getExpoPushTokenAsync({ projectId });
  const token = tokenResult.data?.trim();
  if (!token) throw new Error('Expo push token is empty');

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
  if (!payload?.ok) {
    throw new Error(payload?.error ?? 'Push token registration failed');
  }

  // userId is intentionally used only as observability context; the server derives identity from JWT.
  void userId;
}

export function PushNotificationsProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated, isDemoMode } = useAuth();
  const { isEnabled } = useFeatureFlags();
  const pushEnabled = isEnabled('pushNotifications');

  useEffect(() => {
    if (!pushEnabled || !isAuthenticated || isDemoMode || !user?.id) return;

    let cancelled = false;
    void registerCurrentDevice(user.id).catch((error) => {
      if (!cancelled) {
        captureException(error, { feature: 'push_notifications', phase: 'register_device' });
      }
    });

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, isDemoMode, pushEnabled, user?.id]);

  return children;
}
