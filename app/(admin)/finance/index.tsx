import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import {
  useAdminFinance,
  useAdminPayoutRequests,
  useApproveCommission,
  useProcessPayoutRequest,
  useRejectCommission,
  useRejectPayoutRequest,
} from '@/features/admin/hooks/useAdminData';
import {
  Button,
  EmptyState,
  ErrorState,
  ListRow,
  LoadingState,
  Screen,
  StatusPill,
  Text,
  TextInput,
} from '@/design-system';
import { DomainError } from '@/lib/errors';
import { formatCurrency } from '@/lib/format';
import { spacing } from '@/theme';

type Selection = { kind: 'commission' | 'payout'; id: string } | null;

export default function AdminFinanceScreen() {
  const { t } = useTranslation('commissions');
  const { t: ta } = useTranslation('admin');
  const { t: tc } = useTranslation('common');
  const { t: te } = useTranslation('errors');

  const finance = useAdminFinance();
  const payouts = useAdminPayoutRequests();
  const approveCommission = useApproveCommission();
  const rejectCommission = useRejectCommission();
  const processPayout = useProcessPayoutRequest();
  const rejectPayout = useRejectPayoutRequest();

  const [selection, setSelection] = useState<Selection>(null);
  const [reason, setReason] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);

  const loading = finance.isLoading || payouts.isLoading;
  const error = finance.isError || payouts.isError;

  async function reload() {
    await Promise.all([finance.refetch(), payouts.refetch()]);
  }

  function select(kind: 'commission' | 'payout', id: string) {
    setSelection({ kind, id });
    setReason('');
    setActionError(null);
  }

  async function runAction(action: () => Promise<unknown>) {
    setActionError(null);
    try {
      await action();
      setSelection(null);
      setReason('');
    } catch (err) {
      setActionError(err instanceof DomainError ? err.toUserMessage() : te('generic'));
    }
  }

  if (loading) return <LoadingState label={ta('loading')} />;
  if (error) {
    return <ErrorState title={ta('error')} retryLabel={tc('retry')} onRetry={() => void reload()} />;
  }

  const commissionsUnderReview = (finance.data ?? []).filter((c) => c.status === 'under_review');
  const submittedPayouts = (payouts.data ?? []).filter((p) => p.status === 'submitted');
  const isBusy =
    approveCommission.isPending ||
    rejectCommission.isPending ||
    processPayout.isPending ||
    rejectPayout.isPending;

  return (
    <Screen scroll testID="screen-admin-finance">
      <Text variant="title">{ta('stats.commissionsReview')}</Text>
      {commissionsUnderReview.length === 0 ? (
        <EmptyState title={t('empty')} />
      ) : (
        commissionsUnderReview.map((c, index) => (
          <View key={c.id}>
            <ListRow
              testID={index === 0 ? 'row-finance-commission-0' : `row-finance-commission-${c.id}`}
              title={c.saleLabel}
              meta={formatCurrency(c.amountCents)}
              onPress={() => select('commission', c.id)}
              right={<StatusPill label={t(`status.${c.status}`)} tone="gold" />}
            />
            {selection?.kind === 'commission' && selection.id === c.id ? (
              <View style={styles.actions}>
                <TextInput
                  testID="input-finance-reason"
                  label={ta('leads.reason')}
                  placeholder={ta('leads.reasonPlaceholder')}
                  value={reason}
                  onChangeText={setReason}
                  multiline
                />
                {actionError ? (
                  <Text testID="text-finance-error" variant="caption" color="error">
                    {actionError}
                  </Text>
                ) : null}
                <Button
                  testID="btn-finance-approve-commission"
                  title={ta('actions.approveCommission')}
                  variant="gold"
                  loading={approveCommission.isPending}
                  disabled={isBusy || !reason.trim()}
                  onPress={() => void runAction(() => approveCommission.mutateAsync({ id: c.id, reason }))}
                />
                <Button
                  testID="btn-finance-reject-commission"
                  title={ta('actions.rejectCommission')}
                  variant="danger"
                  loading={rejectCommission.isPending}
                  disabled={isBusy || !reason.trim()}
                  onPress={() => void runAction(() => rejectCommission.mutateAsync({ id: c.id, reason }))}
                />
              </View>
            ) : null}
          </View>
        ))
      )}

      <Text variant="title" style={styles.sectionTitle}>
        {ta('stats.payoutRequests')}
      </Text>
      {submittedPayouts.length === 0 ? (
        <EmptyState title={t('payouts.historyEmpty')} />
      ) : (
        submittedPayouts.map((p, index) => (
          <View key={p.id}>
            <ListRow
              testID={index === 0 ? 'row-finance-payout-0' : `row-finance-payout-${p.id}`}
              title={formatCurrency(p.amountCents)}
              subtitle={p.submittedAt ?? undefined}
              onPress={() => select('payout', p.id)}
              right={<StatusPill label={t(`payouts.status.${p.status}`)} tone="gold" />}
            />
            {selection?.kind === 'payout' && selection.id === p.id ? (
              <View style={styles.actions}>
                <TextInput
                  testID="input-finance-payout-reason"
                  label={ta('leads.reason')}
                  placeholder={ta('leads.reasonPlaceholder')}
                  value={reason}
                  onChangeText={setReason}
                  multiline
                />
                {actionError ? (
                  <Text testID="text-finance-error" variant="caption" color="error">
                    {actionError}
                  </Text>
                ) : null}
                <Button
                  testID="btn-finance-process-payout"
                  title={ta('actions.processPayout')}
                  variant="gold"
                  loading={processPayout.isPending}
                  disabled={isBusy || !reason.trim()}
                  onPress={() => void runAction(() => processPayout.mutateAsync({ id: p.id, reason }))}
                />
                <Button
                  testID="btn-finance-reject-payout"
                  title={ta('actions.rejectPayout')}
                  variant="danger"
                  loading={rejectPayout.isPending}
                  disabled={isBusy || !reason.trim()}
                  onPress={() => void runAction(() => rejectPayout.mutateAsync({ id: p.id, reason }))}
                />
              </View>
            ) : null}
          </View>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  actions: { gap: spacing.sm, marginBottom: spacing.lg, paddingHorizontal: spacing.md },
  sectionTitle: { marginTop: spacing.xl, marginBottom: spacing.sm },
});
