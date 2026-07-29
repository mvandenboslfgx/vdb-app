import { useRouter } from 'expo-router';
import { StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Button, ListRow, LoadingState, Screen, Text } from '@/design-system';
import { usePartnerTicketGate } from '@/features/support/usePartnerTicketGate';
import { useWhatsAppContact } from '@/features/support/useWhatsAppContact';
import { useAuth } from '@/providers/AuthProvider';
import { useFeatureFlags } from '@/providers/FeatureFlagsProvider';
import { canAccessAdminArea } from '@/security/roles';
import { spacing } from '@/theme';

export default function PartnerMoreScreen() {
  const { t } = useTranslation('partners');
  const { t: tc } = useTranslation('common');
  const { t: ta } = useTranslation('auth');
  const { t: tcom } = useTranslation('commissions');
  const router = useRouter();
  const { roles, signOut } = useAuth();
  const { enabled } = useFeatureFlags();
  const whatsapp = useWhatsAppContact();
  const payoutsEnabled = enabled('partnerPayouts');
  const ticketGate = usePartnerTicketGate();

  if (ticketGate.loading) {
    return <LoadingState />;
  }

  return (
    <Screen scroll testID="screen-partner-more">
      <Text variant="title">{t('title')}</Text>
      <ListRow
        testID="partner-more-settings"
        title={tc('settings.title')}
        onPress={() => router.push('/(partner)/more/settings')}
      />
      {ticketGate.access.canList ? (
        <ListRow
          testID="partner-more-support"
          title={t('supportTickets')}
          subtitle={t('supportTicketsHint')}
          onPress={() => router.push('/(partner)/support')}
        />
      ) : (
        <ListRow
          testID="partner-more-support-denied"
          title={t('supportTickets')}
          subtitle={t('supportDenied')}
        />
      )}
      {whatsapp.enabled ? (
        <ListRow
          testID="partner-more-whatsapp"
          title={t('whatsappAdditional')}
          subtitle={whatsapp.subtitle}
          onPress={() => void whatsapp.open()}
        />
      ) : (
        <ListRow
          testID="partner-more-whatsapp-disabled"
          title={t('whatsappAdditional')}
          subtitle={whatsapp.subtitle}
        />
      )}
      <ListRow title={tc('switchArea.customer')} onPress={() => router.replace('/(customer)')} />
      {canAccessAdminArea(roles) ? (
        <ListRow title={tc('switchArea.admin')} onPress={() => router.replace('/(admin)')} />
      ) : null}
      {payoutsEnabled ? (
        <ListRow title={tcom('requestPayout')} onPress={() => router.push('/(partner)/payouts')} />
      ) : (
        <ListRow title={tcom('requestPayout')} subtitle={tcom('payoutDisabled')} />
      )}
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
