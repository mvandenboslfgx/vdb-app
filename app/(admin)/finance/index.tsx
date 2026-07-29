import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { newIdempotencyKey } from '@/api/contract/adminRc4Mappers';
import { approveCommission, rejectCommission } from '@/api/repositories/adminRepository';
import { Aal2StepUpModal } from '@/features/auth/aal2/Aal2StepUpModal';
import { useAal2StepUp } from '@/features/auth/aal2/useAal2StepUp';
import { useAdminFinance, useAdminPayoutRequests } from '@/features/admin/hooks/useAdminData';
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
import { useAuth } from '@/providers/AuthProvider';
import { isFeatureEnabled } from '@/security/featureFlags';
import { isAdmin } from '@/security/roles';
import { spacing } from '@/theme';

type Selection = { kind: 'commission' | 'payout'; id: string } | null;

export default function AdminFinanceScreen() {
  const { t } = useTranslation('commissions');
  const { t: ta } = useTranslation('admin');
  const { t: tc } = useTranslation('common');
  const { roles } = useAuth();
  const canReviewCommissions = isAdmin(roles);
  const aal2 = useAal2StepUp();

  const finance = useAdminFinance();
  const payoutsEnabled = isFeatureEnabled('partnerPayouts');
  const payouts = useAdminPayoutRequests({ enabled: payoutsEnabled });
  const [selection, setSelection] = useState<Selection>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [idempotencyKey, setIdempotencyKey] = useState<string | null>(null);

  // Commissions are independent of payouts. Never fail the whole screen on payout query.
  const loading = finance.isLoading || (payoutsEnabled && payouts.isLoading);
  const error = finance.isError;

  async function reload() {
    await finance.refetch();
    if (payoutsEnabled) await payouts.refetch();
  }

  function selectCommission(id: string) {
    setSelection({ kind: 'commission', id });
    setReason('');
    setActionError(null);
    setIdempotencyKey(newIdempotencyKey('approve_commission'));
  }

  function runCommission(action: 'approve' | 'reject', id: string) {
    if (!canReviewCommissions) {
      setActionError(ta('partnerLifecycle.staffReadOnly'));
      return;
    }
    if (reason.trim().length < 8) {
      setActionError(ta('leads.reasonPlaceholder'));
      return;
    }
    const key =
      idempotencyKey ??
      newIdempotencyKey(action === 'approve' ? 'approve_commission' : 'reject_commission');
    Alert.alert(
      action === 'approve' ? ta('actions.approveCommission') : ta('actions.rejectCommission'),
      reason.trim(),
      [
        { text: tc('cancel'), style: 'cancel' },
        {
          text: tc('confirm'),
          style: action === 'reject' ? 'destructive' : 'default',
          onPress: () => {
            void (async () => {
              if (busy) return;
              setBusy(true);
              setActionError(null);
              try {
                const result = await aal2.runWithStepUp(async () => {
                  if (action === 'approve') {
                    await approveCommission(id, reason.trim(), key);
                  } else {
                    await rejectCommission(id, reason.trim(), key);
                  }
                });
                if (result.status === 'cancelled') {
                  setActionError(ta('aal2Cancelled'));
                  return;
                }
                if (result.status === 'enrollment_required') {
                  setActionError(ta('aal2.enrollmentBody'));
                  return;
                }
                if (result.status === 'error') {
                  const err = result.error;
                  setActionError(err instanceof DomainError ? err.toUserMessage() : ta('error'));
                  return;
                }
                setSelection(null);
                setReason('');
                await reload();
              } finally {
                setBusy(false);
              }
            })();
          },
        },
      ],
    );
  }

  if (loading) return <LoadingState label={ta('loading')} />;
  if (error) {
    return (
      <ErrorState title={ta('error')} retryLabel={tc('retry')} onRetry={() => void reload()} />
    );
  }

  const commissionsUnderReview = (finance.data ?? []).filter(
    (c) => c.status === 'under_review' || c.status === 'pending',
  );
  const submittedPayouts = payoutsEnabled
    ? (payouts.data ?? []).filter((p) => p.status === 'submitted')
    : [];

  return (
    <Screen scroll testID="screen-admin-finance">
      <Aal2StepUpModal visible={aal2.visible} status={aal2.status} onComplete={aal2.onComplete} />
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
              onPress={() => selectCommission(c.id)}
              right={
                <StatusPill
                  label={t(`status.${c.status}`, { defaultValue: c.status })}
                  tone="gold"
                />
              }
            />
            {selection?.kind === 'commission' && selection.id === c.id ? (
              <View style={styles.actions}>
                {!canReviewCommissions ? (
                  <Text variant="caption" color="textMuted">
                    {ta('partnerLifecycle.staffReadOnly')}
                  </Text>
                ) : (
                  <>
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
                      loading={busy}
                      disabled={busy || reason.trim().length < 8}
                      onPress={() => runCommission('approve', c.id)}
                    />
                    <Button
                      testID="btn-finance-reject-commission"
                      title={ta('actions.rejectCommission')}
                      variant="danger"
                      loading={busy}
                      disabled={busy || reason.trim().length < 8}
                      onPress={() => runCommission('reject', c.id)}
                    />
                  </>
                )}
              </View>
            ) : null}
          </View>
        ))
      )}

      <Text variant="title" style={styles.sectionTitle}>
        {ta('stats.payoutRequests')}
      </Text>
      {!payoutsEnabled ? (
        <EmptyState
          title={t('payouts.error.partner_payouts_disabled', {
            defaultValue: 'Uitbetalingen zijn uitgeschakeld',
          })}
        />
      ) : payouts.isError ? (
        <EmptyState title={t('payouts.historyEmpty')} />
      ) : submittedPayouts.length === 0 ? (
        <EmptyState title={t('payouts.historyEmpty')} />
      ) : (
        submittedPayouts.map((p, index) => (
          <View key={p.id}>
            <ListRow
              testID={index === 0 ? 'row-finance-payout-0' : `row-finance-payout-${p.id}`}
              title={formatCurrency(p.amountCents)}
              subtitle={p.submittedAt ?? undefined}
              onPress={() => setSelection({ kind: 'payout', id: p.id })}
              right={<StatusPill label={t(`payouts.status.${p.status}`)} tone="gold" />}
            />
            {selection?.kind === 'payout' && selection.id === p.id ? (
              <View style={styles.actions}>
                <Text variant="caption" color="textMuted" testID="text-finance-payout-unavailable">
                  {ta('payoutProcessingDisabled')}
                </Text>
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
