import { useState } from 'react';
import { StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Button, Screen, Text } from '@/design-system';
import { useFeatureFlags } from '@/providers/FeatureFlagsProvider';
import { useRequestPayout } from '@/features/partner/hooks/usePartnerData';
import { spacing } from '@/theme';

export default function PayoutsIndexScreen() {
  const { t } = useTranslation('commissions');
  const { enabled } = useFeatureFlags();
  const request = useRequestPayout();
  const [message, setMessage] = useState<string | null>(null);

  async function onRequest() {
    if (!enabled('partnerPayouts')) {
      setMessage(t('payoutDisabled'));
      return;
    }
    try {
      await request.mutateAsync([]);
      setMessage(t('payoutDisabled'));
    } catch {
      setMessage(t('payoutDisabled'));
    }
  }

  return (
    <Screen scroll>
      <Text variant="title">{t('title')}</Text>
      <Text variant="body" color="textSecondary" style={styles.hint}>
        {t('emptyHint')}
      </Text>
      <Button
        title={t('requestPayout')}
        variant="gold"
        fullWidth
        loading={request.isPending}
        onPress={onRequest}
        style={styles.cta}
      />
      {message ? (
        <Text variant="caption" color="warning" style={styles.hint}>
          {message}
        </Text>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hint: { marginTop: spacing.sm },
  cta: { marginTop: spacing.xl },
});
