import type { AppLanguage } from '@/i18n';

export const DEVICE_PREF_KEYS = {
  language: 'vdb.pref.language',
  notificationsPush: 'vdb.pref.notifications.push',
  notificationsEmail: 'vdb.pref.notifications.email',
  notificationsMarketing: 'vdb.pref.notifications.marketing',
} as const;

export type DeviceNotificationPrefs = {
  push: boolean;
  email: boolean;
  marketing: boolean;
};

/** Device-only defaults until server-backed prefs exist. Marketing stays opt-in. */
export const DEFAULT_NOTIFICATION_PREFS: DeviceNotificationPrefs = {
  push: false,
  email: false,
  marketing: false,
};

export function parseStoredLanguage(raw: string | null | undefined): AppLanguage | null {
  if (raw === 'nl' || raw === 'en') return raw;
  return null;
}

export function serializeLanguage(language: AppLanguage): string {
  return language;
}

export function parseBoolPref(raw: string | null | undefined, defaultValue: boolean): boolean {
  if (raw === null || raw === undefined) return defaultValue;
  if (raw === 'true' || raw === '1') return true;
  if (raw === 'false' || raw === '0') return false;
  return defaultValue;
}

export function serializeBoolPref(value: boolean): string {
  return value ? 'true' : 'false';
}

export function parseNotificationPrefs(raw: {
  push?: string | null;
  email?: string | null;
  marketing?: string | null;
}): DeviceNotificationPrefs {
  return {
    push: parseBoolPref(raw.push, DEFAULT_NOTIFICATION_PREFS.push),
    email: parseBoolPref(raw.email, DEFAULT_NOTIFICATION_PREFS.email),
    marketing: parseBoolPref(raw.marketing, DEFAULT_NOTIFICATION_PREFS.marketing),
  };
}
