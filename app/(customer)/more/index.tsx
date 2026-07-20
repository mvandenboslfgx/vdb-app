import * as WebBrowser from 'expo-web-browser';
import { useRouter } from 'expo-router';
import { StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Button, Divider, ListRow, Screen, Text } from '@/design-system';
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
        title={tc('language')}
        subtitle={lang === 'nl' ? tc('languageNl') : tc('languageEn')}
        onPress={() => void toggleLanguage()}
      />
      <ListRow title={tm('whatsapp')} subtitle={tm('whatsappHint')} onPress={() => void openWhatsApp()} />
      <ListRow
        title={tp('apply.title')}
        onPress={() => router.push('/(customer)/more/partner-apply')}
      />
      <ListRow
        title={t('profile.deleteAccount')}
        onPress={() => router.push('/(customer)/more/account-deletion')}
      />
      <ListRow title={t('profile.support')} onPress={() => router.push('/(customer)/support')} />
      <ListRow title={tc('tabs.documents')} onPress={() => router.push('/(customer)/documents')} />
      <ListRow
        title={t('dashboard.openQuotes')}
        onPress={() => router.push('/(customer)/quotes')}
      />
      <ListRow
        title={t('dashboard.openInvoices')}
        onPress={() => router.push('/(customer)/invoices')}
      />
      <ListRow
        title={t('appointments.title')}
        onPress={() => router.push('/(customer)/appointments')}
      />

      {canAccessPartnerArea(roles) ? (
        <ListRow
          title={tc('switchArea.partner')}
          onPress={() => router.replace('/(partner)')}
        />
      ) : null}
      {canAccessAdminArea(roles) ? (
        <ListRow title={tc('switchArea.admin')} onPress={() => router.replace('/(admin)')} />
      ) : null}

      <Divider />
      <Button
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
