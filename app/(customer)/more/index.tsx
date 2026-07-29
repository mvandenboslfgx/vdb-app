import { useRouter } from 'expo-router';
import { StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Button, Divider, ListRow, Screen, Text } from '@/design-system';
import { isDevelopment } from '@/config/env';
import { DEVICE_PREF_KEYS, serializeLanguage } from '@/features/settings/devicePreferences';
import { useWhatsAppContact } from '@/features/support/useWhatsAppContact';
import { getCurrentLanguage, setAppLanguage } from '@/i18n';
import { useAuth } from '@/providers/AuthProvider';
import { canAccessAdminArea, canAccessPartnerArea } from '@/security/roles';
import { spacing } from '@/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function CustomerMoreScreen() {
  const { t } = useTranslation('customer');
  const { t: tc } = useTranslation('common');
  const { t: ta } = useTranslation('auth');
  const { t: tp } = useTranslation('partners');
  const router = useRouter();
  const { roles, signOut } = useAuth();
  const lang = getCurrentLanguage();
  const whatsapp = useWhatsAppContact();

  async function toggleLanguage() {
    const next = lang === 'nl' ? 'en' : 'nl';
    await setAppLanguage(next);
    await AsyncStorage.setItem(DEVICE_PREF_KEYS.language, serializeLanguage(next));
  }

  return (
    <Screen scroll>
      <Text variant="title">{t('profile.title')}</Text>

      <ListRow
        testID="nav-settings"
        title={tc('settings.title')}
        onPress={() => router.push('/(customer)/more/settings')}
      />
      <ListRow
        testID="nav-language-toggle"
        title={tc('language')}
        subtitle={lang === 'nl' ? tc('languageNl') : tc('languageEn')}
        onPress={() => void toggleLanguage()}
      />
      {whatsapp.enabled ? (
        <ListRow
          testID="nav-whatsapp"
          title={whatsapp.title}
          subtitle={whatsapp.subtitle}
          onPress={() => void whatsapp.open()}
        />
      ) : (
        <ListRow
          testID="nav-whatsapp-disabled"
          title={whatsapp.title}
          subtitle={whatsapp.subtitle}
        />
      )}
      <ListRow
        testID="nav-notifications"
        title={t('profile.notifications')}
        onPress={() => router.push('/(customer)/more/notifications')}
      />
      {isDevelopment ? (
        <ListRow
          testID="nav-dev-diagnostics"
          title={tc('diagnostics.title')}
          onPress={() => router.push('/(customer)/more/diagnostics')}
        />
      ) : null}
      <ListRow
        testID="nav-partner-apply"
        title={tp('apply.title')}
        onPress={() => router.push('/(customer)/more/partner-apply')}
      />
      <ListRow
        testID="nav-account-delete"
        title={t('profile.deleteAccount')}
        onPress={() => router.push('/(customer)/more/account-deletion')}
      />
      <ListRow
        testID="nav-support"
        title={t('profile.support')}
        onPress={() => router.push('/(customer)/support')}
      />
      <ListRow
        testID="nav-documents"
        title={tc('tabs.documents')}
        onPress={() => router.push('/(customer)/documents')}
      />
      <ListRow
        testID="nav-quotes"
        title={t('dashboard.openQuotes')}
        onPress={() => router.push('/(customer)/quotes')}
      />
      <ListRow
        testID="nav-invoices"
        title={t('dashboard.openInvoices')}
        onPress={() => router.push('/(customer)/invoices')}
      />
      <ListRow
        testID="nav-appointments"
        title={t('appointments.title')}
        onPress={() => router.push('/(customer)/appointments')}
      />

      {canAccessPartnerArea(roles) ? (
        <ListRow
          testID="nav-switch-partner"
          title={tc('switchArea.partner')}
          onPress={() => router.replace('/(partner)')}
        />
      ) : null}
      {canAccessAdminArea(roles) ? (
        <ListRow
          testID="nav-switch-admin"
          title={tc('switchArea.admin')}
          onPress={() => router.replace('/(admin)')}
        />
      ) : null}

      <Divider />
      <Button
        testID="auth-logout-button"
        title={ta('signOut')}
        variant="danger"
        style={styles.signOut}
        onPress={() => {
          void signOut().then(() => router.replace('/(public)'));
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  signOut: { marginTop: spacing.xl },
});
