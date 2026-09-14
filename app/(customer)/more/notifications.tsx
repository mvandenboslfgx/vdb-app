import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';

import { ListRow, Screen, Text } from '@/design-system';
import { useFeatureFlags } from '@/providers/FeatureFlagsProvider';
import { spacing } from '@/theme';

const STORAGE_KEY = 'vdb.notification.preferences.v1';

interface NotificationPreferences {
  projectUpdates: boolean;
  messages: boolean;
  documents: boolean;
  quotesInvoices: boolean;
  marketing: boolean;
}

const DEFAULTS: NotificationPreferences = {
  projectUpdates: true,
  messages: true,
  documents: true,
  quotesInvoices: true,
  marketing: false,
};

type PrefKey = keyof NotificationPreferences;

/**
 * Notification preferences UI.
 * External push delivery remains blocked without provider credentials;
 * this screen still stores preferences and explains the disabled delivery state.
 */
export default function NotificationPreferencesScreen() {
  const { t } = useTranslation('notifications');
  const { enabled } = useFeatureFlags();
  const pushEnabled = enabled('pushNotifications');
  const [prefs, setPrefs] = useState<NotificationPreferences>(DEFAULTS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          setPrefs({ ...DEFAULTS, ...(JSON.parse(raw) as NotificationPreferences) });
        }
      } catch {
        // keep defaults
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  const persist = useCallback(async (next: NotificationPreferences) => {
    setPrefs(next);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  function toggle(key: PrefKey) {
    if (!loaded) return;
    void persist({ ...prefs, [key]: !prefs[key] });
  }

  const rows: { key: PrefKey; label: string }[] = [
    { key: 'projectUpdates', label: t('prefs.projectUpdates') },
    { key: 'messages', label: t('prefs.messages') },
    { key: 'documents', label: t('prefs.documents') },
    { key: 'quotesInvoices', label: t('prefs.quotesInvoices') },
    { key: 'marketing', label: t('prefs.marketing') },
  ];

  return (
    <Screen scroll testID="screen-notification-prefs">
      <Text variant="title">{t('prefs.title')}</Text>
      <Text variant="body" color="textSecondary" style={styles.subtitle}>
        {t('prefs.subtitle')}
      </Text>

      {!pushEnabled ? (
        <Text variant="caption" color="warning" style={styles.warn} testID="push-delivery-disabled">
          {t('prefs.deliveryDisabled')}
        </Text>
      ) : null}

      <Text variant="caption" color="textMuted" style={styles.lock}>
        {t('prefs.lockScreenHint')}
      </Text>

      {rows.map((row) => (
        <ListRow
          key={row.key}
          testID={`pref-${row.key}`}
          title={row.label}
          meta={prefs[row.key] ? t('prefs.on') : t('prefs.off')}
          onPress={() => toggle(row.key)}
        />
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  subtitle: { marginTop: spacing.sm, marginBottom: spacing.md },
  warn: { marginBottom: spacing.md },
  lock: { marginBottom: spacing.lg },
});
