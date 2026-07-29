import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { clientEnv } from '@/config/env';
import { Button, Divider, ListRow, Screen, Text } from '@/design-system';
import { useAuth } from '@/providers/AuthProvider';
import { isCustomer } from '@/security/roles';
import { spacing } from '@/theme';

import { useDevicePreferences } from './useDevicePreferences';

export function SettingsScreen() {
  const { t } = useTranslation('common');
  const { t: ta } = useTranslation('auth');
  const { t: tc } = useTranslation('customer');
  const router = useRouter();
  const { profile, roles, signOut } = useAuth();
  const prefs = useDevicePreferences();

  const roleLabel = roles.length > 0 ? roles.join(', ') : '—';
  const appVersion = Constants.expoConfig?.version ?? '—';
  const showAccountDeletion = isCustomer(roles);

  return (
    <Screen scroll testID="screen-settings">
      <Text variant="title">{t('settings.title')}</Text>

      <Text variant="subtitle" style={styles.section}>
        {t('settings.profile')}
      </Text>
      <ListRow
        testID="settings-profile-name"
        title={t('settings.name')}
        subtitle={profile?.fullName || '—'}
      />
      <ListRow
        testID="settings-profile-email"
        title={t('settings.email')}
        subtitle={profile?.email || '—'}
      />
      <ListRow testID="settings-profile-role" title={t('settings.role')} subtitle={roleLabel} />
      {showAccountDeletion ? (
        <ListRow
          testID="settings-account-deletion"
          title={tc('profile.deleteAccount')}
          onPress={() => router.push('/(customer)/more/account-deletion')}
        />
      ) : null}

      <Divider />
      <Text variant="subtitle" style={styles.section}>
        {t('settings.language')}
      </Text>
      <View style={styles.rowGap}>
        <Button
          testID="settings-lang-nl"
          title={t('languageNl')}
          variant={prefs.language === 'nl' ? 'gold' : 'secondary'}
          onPress={() => void prefs.setLanguage('nl')}
        />
        <Button
          testID="settings-lang-en"
          title={t('languageEn')}
          variant={prefs.language === 'en' ? 'gold' : 'secondary'}
          onPress={() => void prefs.setLanguage('en')}
        />
      </View>

      <Divider />
      <Text variant="subtitle" style={styles.section}>
        {t('settings.appearance')}
      </Text>
      <Text variant="body" color="textSecondary">
        {t('settings.appearanceSystemDark')}
      </Text>

      <Divider />
      <Text variant="subtitle" style={styles.section}>
        {t('settings.notifications')}
      </Text>
      <Text variant="caption" color="textMuted" style={styles.hint}>
        {t('settings.notificationsDeviceOnly')}
      </Text>
      <ListRow
        testID="settings-notif-push"
        title={t('settings.notificationsPush')}
        meta={prefs.notifications.push ? t('settings.on') : t('settings.off')}
        onPress={() => void prefs.toggleNotificationPref('push')}
      />
      <ListRow
        testID="settings-notif-email"
        title={t('settings.notificationsEmail')}
        meta={prefs.notifications.email ? t('settings.on') : t('settings.off')}
        onPress={() => void prefs.toggleNotificationPref('email')}
      />
      <ListRow
        testID="settings-notif-marketing"
        title={t('settings.notificationsMarketing')}
        subtitle={t('settings.marketingDefaultOff')}
        meta={prefs.notifications.marketing ? t('settings.on') : t('settings.off')}
        onPress={() => void prefs.toggleNotificationPref('marketing')}
      />

      <Divider />
      <Text variant="subtitle" style={styles.section}>
        {t('settings.privacy')}
      </Text>
      <ListRow
        testID="settings-privacy"
        title={t('settings.privacyPolicy')}
        onPress={() => router.push('/(public)/privacy')}
      />
      <ListRow
        testID="settings-terms"
        title={t('settings.terms')}
        onPress={() => router.push('/(public)/terms')}
      />

      <Divider />
      <Text variant="subtitle" style={styles.section}>
        {t('settings.security')}
      </Text>
      <Text variant="caption" color="textMuted" style={styles.hint}>
        {t('settings.mfaNote')}
      </Text>
      <Button
        testID="settings-sign-out"
        title={ta('signOut')}
        variant="danger"
        style={styles.signOut}
        onPress={() => {
          void signOut().then(() => router.replace('/(public)'));
        }}
      />

      <Divider />
      <Text variant="subtitle" style={styles.section}>
        {t('settings.help')}
      </Text>
      <ListRow
        testID="settings-app-version"
        title={t('settings.appVersion')}
        subtitle={appVersion}
      />
      <ListRow
        testID="settings-support-email"
        title={t('settings.supportEmail')}
        subtitle={clientEnv.supportEmail}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: spacing.md, marginBottom: spacing.sm },
  hint: { marginBottom: spacing.sm },
  rowGap: { gap: spacing.sm },
  signOut: { marginTop: spacing.sm },
});
