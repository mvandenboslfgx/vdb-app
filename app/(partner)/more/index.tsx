import { useRouter } from 'expo-router';
import { StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Button, ListRow, Screen, Text } from '@/design-system';
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

  return (
    <Screen scroll>
      <Text variant="title">{t('title')}</Text>
      <ListRow
        title={tc('switchArea.customer')}
        onPress={() => router.replace('/(customer)')}
      />
      {canAccessAdminArea(roles) ? (
        <ListRow
          title={tc('switchArea.admin')}
          onPress={() => router.replace('/(admin)')}
        />
      ) : null}
      <ListRow
        title={tcom('requestPayout')}
        subtitle={enabled('partnerPayouts') ? undefined : tcom('payoutDisabled')}
        onPress={() => router.push('/(partner)/payouts')}
      />
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
