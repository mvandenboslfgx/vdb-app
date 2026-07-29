import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import {
  approvePartnerApplication,
  listApprovals,
  rejectPartnerApplication,
} from '@/api/repositories/adminRepository';
import type { AdminQueueItem } from '@/api/mockData';
import { Aal2StepUpModal } from '@/features/auth/aal2/Aal2StepUpModal';
import { useAal2StepUp } from '@/features/auth/aal2/useAal2StepUp';
import {
  Button,
  EmptyState,
  ErrorState,
  ListRow,
  LoadingState,
  Screen,
  Text,
  TextInput,
} from '@/design-system';
import { DomainError } from '@/lib/errors';
import { useAuth } from '@/providers/AuthProvider';
import { isAdmin } from '@/security/roles';
import { spacing } from '@/theme';

export default function ApprovalsScreen() {
  const { t } = useTranslation('admin');
  const { t: tc } = useTranslation('common');
  const { roles } = useAuth();
  const canReviewApplications = isAdmin(roles);
  const aal2 = useAal2StepUp();

  const [items, setItems] = useState<AdminQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionErrorById, setActionErrorById] = useState<Record<string, string>>({});
  const [rejectReasonById, setRejectReasonById] = useState<Record<string, string>>({});
  /** Synchronous lock — React state alone cannot block double-tap in the same tick. */
  const busyLockRef = useRef(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      setItems(await listApprovals());
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function setItemError(id: string, message: string | null) {
    setActionErrorById((prev) => {
      if (!message) {
        const next = { ...prev };
        delete next[id];
        return next;
      }
      return { ...prev, [id]: message };
    });
  }

  async function runReview(action: 'approve' | 'reject', id: string) {
    if (busyLockRef.current) return;
    if (!canReviewApplications) {
      setItemError(id, t('partnerLifecycle.staffReadOnly'));
      return;
    }
    if (!id.trim()) {
      setItemError(id, t('error'));
      return;
    }

    const rejectReason = (rejectReasonById[id] ?? '').trim();
    if (action === 'reject' && rejectReason.length < 8) {
      setItemError(id, t('leads.reasonPlaceholder'));
      return;
    }

    busyLockRef.current = true;
    setBusyId(id);
    setItemError(id, null);
    try {
      const result = await aal2.runWithStepUp(async () => {
        if (action === 'approve') {
          await approvePartnerApplication(id);
        } else {
          await rejectPartnerApplication(id, rejectReason);
        }
      });

      if (result.status === 'cancelled') {
        setItemError(id, t('aal2Cancelled'));
        return;
      }
      if (result.status === 'enrollment_required') {
        setItemError(id, t('aal2.enrollmentBody'));
        return;
      }
      if (result.status === 'error') {
        const err = result.error;
        setItemError(id, err instanceof DomainError ? err.toUserMessage() : t('error'));
        return;
      }

      setRejectReasonById((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      await load();
    } finally {
      busyLockRef.current = false;
      setBusyId(null);
    }
  }

  if (loading) return <LoadingState />;
  if (error) {
    return <ErrorState title={t('error')} retryLabel={tc('retry')} onRetry={() => void load()} />;
  }

  const firstPartnerApplicationIndex = items.findIndex(
    (item) => item.type === 'partner_application',
  );

  return (
    <Screen scroll testID="screen-admin-approvals">
      <Aal2StepUpModal visible={aal2.visible} status={aal2.status} onComplete={aal2.onComplete} />
      <Text variant="title">{t('queue')}</Text>
      {items.length === 0 ? (
        <EmptyState title={tc('empty')} />
      ) : (
        items.map((item, index) => (
          <View
            key={item.id}
            style={styles.card}
            testID={index === 0 ? 'approval-row-0' : `approval-row-${item.id}`}
          >
            <ListRow title={item.title} subtitle={item.subtitle} />
            {item.type === 'partner_application' ? (
              <View style={styles.actions}>
                {!canReviewApplications ? (
                  <Text testID="text-approvals-readonly" variant="caption" color="textMuted">
                    {t('partnerLifecycle.staffReadOnly')}
                  </Text>
                ) : (
                  <>
                    <TextInput
                      testID={
                        index === firstPartnerApplicationIndex
                          ? 'input-approvals-reject-reason'
                          : `input-approvals-reject-reason-${item.id}`
                      }
                      label={t('leads.reason')}
                      placeholder={t('leads.reasonPlaceholder')}
                      value={rejectReasonById[item.id] ?? ''}
                      onChangeText={(value) =>
                        setRejectReasonById((prev) => ({ ...prev, [item.id]: value }))
                      }
                      multiline
                    />
                    {actionErrorById[item.id] ? (
                      <Text
                        testID={
                          index === firstPartnerApplicationIndex
                            ? 'text-approvals-error'
                            : `text-approvals-error-${item.id}`
                        }
                        variant="caption"
                        color="error"
                      >
                        {actionErrorById[item.id]}
                      </Text>
                    ) : null}
                    <View style={styles.buttonRow}>
                      <Button
                        testID={
                          index === firstPartnerApplicationIndex
                            ? 'admin-partner-approve'
                            : `btn-approve-${item.id}`
                        }
                        title={t('actions.approvePartner')}
                        variant="gold"
                        size="sm"
                        loading={busyId === item.id}
                        disabled={Boolean(busyId)}
                        onPress={() => void runReview('approve', item.id)}
                      />
                      <Button
                        testID={
                          index === firstPartnerApplicationIndex
                            ? 'admin-partner-reject'
                            : `btn-reject-${item.id}`
                        }
                        title={t('actions.rejectPartner')}
                        variant="danger"
                        size="sm"
                        loading={busyId === item.id}
                        disabled={
                          Boolean(busyId) || (rejectReasonById[item.id] ?? '').trim().length < 8
                        }
                        onPress={() => void runReview('reject', item.id)}
                      />
                    </View>
                  </>
                )}
              </View>
            ) : null}
          </View>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: spacing.lg },
  actions: { gap: spacing.sm, marginTop: spacing.sm },
  buttonRow: { flexDirection: 'row', gap: spacing.sm },
});
