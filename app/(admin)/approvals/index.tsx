import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import {
  approvePartnerApplication,
  listApprovals,
  rejectPartnerApplication,
} from '@/api/repositories/adminRepository';
import type { AdminQueueItem } from '@/api/mockData';
import {
  Button,
  EmptyState,
  ErrorState,
  ListRow,
  LoadingState,
  Screen,
  Text,
} from '@/design-system';
import { spacing } from '@/theme';

export default function ApprovalsScreen() {
  const { t } = useTranslation('admin');
  const { t: tc } = useTranslation('common');
  const [items, setItems] = useState<AdminQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

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

  async function onApprove(id: string) {
    setBusyId(id);
    try {
      await approvePartnerApplication(id, 'Approved via mobile admin');
      await load();
    } finally {
      setBusyId(null);
    }
  }

  async function onReject(id: string) {
    setBusyId(id);
    try {
      await rejectPartnerApplication(id, 'Rejected via mobile admin');
      await load();
    } finally {
      setBusyId(null);
    }
  }

  if (loading) return <LoadingState />;
  if (error) {
    return <ErrorState title={t('error')} retryLabel={tc('retry')} onRetry={() => void load()} />;
  }

  const firstPartnerApplicationIndex = items.findIndex((item) => item.type === 'partner_application');

  return (
    <Screen scroll testID="screen-admin-approvals">
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
                  onPress={() => void onApprove(item.id)}
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
                  onPress={() => void onReject(item.id)}
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
  card: { marginBottom: spacing.lg },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
});

