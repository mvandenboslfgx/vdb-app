import * as WebBrowser from 'expo-web-browser';
import { useRouter } from 'expo-router';
import { StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Button, Divider, ListRow, Screen, Text } from '@/design-system';
import { isDevelopment } from '@/config/env';
import { getCurrentLanguage, i18n } from '@/i18n';
import { buildWhatsAppUrl } from '@/lib/whatsapp';
import { useAuth } from '@/providers/AuthProvider';
import { canAccessAdminArea, canAccessPartnerArea } from '@/security/roles';
import { spacing } from '@/theme';

export default function CustomerMoreScreen() {
  const { t } = useTranslation('customer');
  const { t: tc } = useTranslation('common');
  const { t: ta } = useTranslation('auth');
  const { t: tp } = useTranslation('partners');
  const { t: tm } = useTranslation('messages');
  const router = useRouter();
  const { roles, signOut, profile } = useAuth();
  const lang = getCurrentLanguage();

  async function toggleLanguage() {
    await i18n.changeLanguage(lang === 'nl' ? 'en' : 'nl');
  }

  async function openWhatsApp() {
    const url = buildWhatsAppUrl(undefined, `Hallo VDB Digital — ${profile?.fullName ?? ''}`);
    if (url) {
      await WebBrowser.openBrowserAsync(url);
    }
  }

  return (
    <Screen scroll>
      <Text variant="title">{t('profile.title')}</Text>

      <ListRow
        testID="nav-language-toggle"
        title={tc('language')}
        subtitle={lang === 'nl' ? tc('languageNl') : tc('languageEn')}
        onPress={() => void toggleLanguage()}
      />
      <ListRow title={tm('whatsapp')} subtitle={tm('whatsappHint')} onPress={() => void openWhatsApp()} />
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
