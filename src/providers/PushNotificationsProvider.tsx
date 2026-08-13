import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import React, { useEffect, type ReactNode } from 'react';

import { deepLinkToHref, parseAppDeepLink } from '@/lib/linking';
import { captureException } from '@/lib/observability';
import { registerCurrentPushToken } from '@/lib/pushNotifications';
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

function notificationDeepLink(response: Notifications.NotificationResponse): string | null {
  const data = response.notification.request.content.data;
  const candidate = data?.deepLink;
  return typeof candidate === 'string' && candidate.trim() ? candidate.trim() : null;
}

export function PushNotificationsProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { user, isAuthenticated, isDemoMode } = useAuth();
  const { isEnabled } = useFeatureFlags();
  const pushEnabled = isEnabled('pushNotifications');

  useEffect(() => {
    if (!pushEnabled || !isAuthenticated || isDemoMode || !user?.id) return;

    let cancelled = false;
    void registerCurrentPushToken().catch((error) => {
      if (!cancelled) {
        captureException(error, { feature: 'push_notifications', phase: 'register_device' });
      }
    });

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, isDemoMode, pushEnabled, user?.id]);

  useEffect(() => {
    if (!pushEnabled) return;

    function navigate(response: Notifications.NotificationResponse | null | undefined) {
      if (!response) return;
      const url = notificationDeepLink(response);
      if (!url) return;
      const href = deepLinkToHref(parseAppDeepLink(url));
      if (!href) return;
      router.push(href as `/`);
    }

    void Notifications.getLastNotificationResponseAsync().then(navigate).catch((error) => {
      captureException(error, { feature: 'push_notifications', phase: 'initial_response' });
    });

    const subscription = Notifications.addNotificationResponseReceivedListener(navigate);
    return () => subscription.remove();
  }, [pushEnabled, router]);

  return children;
}
