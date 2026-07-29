import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

import { getCurrentLanguage, setAppLanguage, type AppLanguage } from '@/i18n';

import {
  DEFAULT_NOTIFICATION_PREFS,
  DEVICE_PREF_KEYS,
  parseNotificationPrefs,
  parseStoredLanguage,
  serializeBoolPref,
  serializeLanguage,
  type DeviceNotificationPrefs,
} from './devicePreferences';

export function useDevicePreferences() {
  const [language, setLanguageState] = useState<AppLanguage>(getCurrentLanguage);
  const [notifications, setNotifications] = useState<DeviceNotificationPrefs>(
    DEFAULT_NOTIFICATION_PREFS,
  );
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const [langRaw, pushRaw, emailRaw, marketingRaw] = await AsyncStorage.multiGet([
          DEVICE_PREF_KEYS.language,
          DEVICE_PREF_KEYS.notificationsPush,
          DEVICE_PREF_KEYS.notificationsEmail,
          DEVICE_PREF_KEYS.notificationsMarketing,
        ]);

        const storedLang = parseStoredLanguage(langRaw?.[1]);
        if (storedLang) {
          setLanguageState(storedLang);
          if (storedLang !== getCurrentLanguage()) {
            await setAppLanguage(storedLang);
          }
        } else {
          setLanguageState(getCurrentLanguage());
        }

        setNotifications(
          parseNotificationPrefs({
            push: pushRaw?.[1],
            email: emailRaw?.[1],
            marketing: marketingRaw?.[1],
          }),
        );
      } catch {
        setLanguageState(getCurrentLanguage());
        setNotifications(DEFAULT_NOTIFICATION_PREFS);
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  const setLanguage = useCallback(async (next: AppLanguage) => {
    setLanguageState(next);
    await setAppLanguage(next);
    await AsyncStorage.setItem(DEVICE_PREF_KEYS.language, serializeLanguage(next));
  }, []);

  const setNotificationPref = useCallback(
    async (key: keyof DeviceNotificationPrefs, value: boolean) => {
      setNotifications((prev) => {
        const next = { ...prev, [key]: value };
        return next;
      });
      const storageKey =
        key === 'push'
          ? DEVICE_PREF_KEYS.notificationsPush
          : key === 'email'
            ? DEVICE_PREF_KEYS.notificationsEmail
            : DEVICE_PREF_KEYS.notificationsMarketing;
      await AsyncStorage.setItem(storageKey, serializeBoolPref(value));
    },
    [],
  );

  const toggleNotificationPref = useCallback(
    async (key: keyof DeviceNotificationPrefs) => {
      if (!loaded) return;
      const next = !notifications[key];
      await setNotificationPref(key, next);
    },
    [loaded, notifications, setNotificationPref],
  );

  return {
    loaded,
    language,
    setLanguage,
    notifications,
    setNotificationPref,
    toggleNotificationPref,
  };
}
