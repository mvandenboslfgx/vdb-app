import { useRouter } from 'expo-router';
import { StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Button, Divider, ListRow, Screen, Text } from '@/design-system';
import { useWhatsAppContact } from '@/features/support/useWhatsAppContact';
import { useAuth } from '@/providers/AuthProvider';
import { spacing } from '@/theme';

type Surface =
  | 'products'
  | 'partners'
  | 'customers'
  | 'projects'
  | 'quotes'
  | 'invoices'
  | 'appointments'
  | 'settings'
  | 'security';

export default function AdminMoreScreen() {
  const { t } = useTranslation('admin');
  const { t: tc } = useTranslation('common');
  const { t: ta } = useTranslation('auth');
  const router = useRouter();
  const { signOut } = useAuth();
  const whatsapp = useWhatsAppContact();

  function openSurface(surface: Surface) {
    router.push(`/(admin)/more/surface/${surface}`);
  }

  return (
    <Screen scroll testID="screen-admin-more">
      <Text variant="title">{t('title')}</Text>

      <ListRow
        testID="admin-more-leads"
        title={t('leads.title')}
        onPress={() => router.push('/(admin)/leads')}
      />
      <ListRow
        testID="admin-more-products"
        title={t('more.products')}
        onPress={() => openSurface('products')}
      />
      <ListRow
        testID="admin-more-partners"
        title={t('more.partners')}
        onPress={() => openSurface('partners')}
      />
      <ListRow
        testID="admin-more-customers"
        title={t('more.customers')}
        onPress={() => openSurface('customers')}
      />
      <ListRow
        testID="admin-more-projects"
        title={t('more.projects')}
        onPress={() => openSurface('projects')}
      />
      <ListRow
        testID="admin-more-quotes"
        title={t('more.quotes')}
        onPress={() => openSurface('quotes')}
      />
      <ListRow
        testID="admin-more-invoices"
        title={t('more.invoices')}
        onPress={() => openSurface('invoices')}
      />
      <ListRow
        testID="admin-more-appointments"
        title={t('more.appointments')}
        onPress={() => openSurface('appointments')}
      />
      <ListRow
        testID="admin-more-settings"
        title={t('more.settings')}
        onPress={() => openSurface('settings')}
      />
      <ListRow
        testID="admin-more-diagnostics"
        title={t('more.diagnostics')}
        onPress={() => router.push('/(admin)/more/diagnostics')}
      />
      {whatsapp.enabled ? (
        <ListRow
          testID="admin-more-whatsapp"
          title={whatsapp.title}
          subtitle={whatsapp.subtitle}
          onPress={() => void whatsapp.open()}
        />
      ) : (
        <ListRow
          testID="admin-more-whatsapp-disabled"
          title={whatsapp.title}
          subtitle={whatsapp.subtitle}
        />
      )}
      <ListRow
        testID="admin-more-security"
        title={t('more.security')}
        onPress={() => openSurface('security')}
      />

      <Divider />
      <ListRow title={tc('switchArea.customer')} onPress={() => router.replace('/(customer)')} />
      <ListRow title={tc('switchArea.partner')} onPress={() => router.replace('/(partner)')} />
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
