import { useCallback, useState } from 'react';
import { StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Button, EmptyState, ListRow, LoadingState, Screen, StatusPill, Text } from '@/design-system';
import {
  useCommissions,
  usePayableBalance,
  usePayoutRequests,
  useRequestPayout,
} from '@/features/partner/hooks/usePartnerData';
import { formatCurrency } from '@/lib/format';
import { useFeatureFlags } from '@/providers/FeatureFlagsProvider';
import type { RequestPayoutFailureReason } from '@/api/repositories/commissionsRepository';
import { spacing } from '@/theme';

export default function PayoutsIndexScreen() {
  const { t } = useTranslation('commissions');
  const { enabled } = useFeatureFlags();
  const balance = usePayableBalance();
  const commissions = useCommissions();
  const payoutRequests = usePayoutRequests();
  const request = useRequestPayout();
  const [errorReason, setErrorReason] = useState<RequestPayoutFailureReason | null>(null);

  const payableCommissions = (commissions.data ?? []).filter((c) => c.status === 'payable');

  const onRequest = useCallback(async () => {
    setErrorReason(null);
    if (!enabled('partnerPayouts')) {
      setErrorReason('partner_payouts_disabled');
      return;
    }
    try {
      const result = await request.mutateAsync({});
      if (!result.allowed) {
        setErrorReason(result.reason ?? 'unknown');
      }
    } catch {
      setErrorReason('unknown');
    }
  }, [enabled, request]);

  if (balance.isLoading || commissions.isLoading) {
    return <LoadingState label={t('loading')} />;
  }

  const amountCents = balance.data?.amountCents ?? 0;

  return (
    <Screen scroll testID="screen-partner-payouts">
      <Text variant="title">{t('payouts.title')}</Text>

      <Text variant="caption" color="textSecondary" style={styles.balanceLabel}>
        {t('payouts.balanceLabel')}
      </Text>
      <Text testID="text-payout-balance" variant="title">
        {formatCurrency(amountCents)}
      </Text>

      <Button
        testID="btn-payout-request"
        title={t('requestPayout')}
        variant="gold"
        fullWidth
        loading={request.isPending}
        disabled={request.isPending || amountCents <= 0}
        onPress={() => void onRequest()}
        style={styles.cta}
      />
      {errorReason ? (
        <Text testID="text-payout-error" variant="caption" color="error" style={styles.hint}>
          {t(`payouts.error.${errorReason}`)}
        </Text>
      ) : null}

      <Text variant="label" color="textSecondary" style={styles.sectionTitle}>
        {t('payouts.commissionsTitle')}
      </Text>
      {payableCommissions.length === 0 ? (
        <EmptyState title={t('payouts.noPayable')} />
      ) : (
        payableCommissions.map((c) => (
          <ListRow
            key={c.id}
            testID={`row-payout-commission-${c.id}`}
            title={c.saleLabel}
            meta={formatCurrency(c.amountCents)}
            right={<StatusPill label={t(`status.${c.status}`)} tone="gold" />}
          />
        ))
      )}

      <Text variant="label" color="textSecondary" style={styles.sectionTitle}>
        {t('payouts.historyTitle')}
      </Text>
      {(payoutRequests.data ?? []).length === 0 ? (
        <Text testID="text-payout-history-empty" variant="body" color="textSecondary">
          {t('payouts.historyEmpty')}
        </Text>
      ) : (
        (payoutRequests.data ?? []).map((p) => (
          <ListRow
            key={p.id}
            testID={`row-payout-request-${p.id}`}
            title={formatCurrency(p.amountCents)}
            subtitle={p.submittedAt ?? undefined}
            right={<StatusPill label={t(`payouts.status.${p.status}`)} tone="gold" />}
          />
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  balanceLabel: { marginTop: spacing.lg },
  hint: { marginTop: spacing.sm },
  cta: { marginTop: spacing.xl },
  sectionTitle: { marginTop: spacing.xl, marginBottom: spacing.sm },
});
