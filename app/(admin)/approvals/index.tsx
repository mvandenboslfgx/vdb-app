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
import { useAuth } from '@/providers/AuthProvider';
import { spacing } from '@/theme';

export default function ApprovalsScreen() {
  const { t } = useTranslation('admin');
  const { t: tc } = useTranslation('common');
  const { profile } = useAuth();
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
    if (!profile) return;
    setBusyId(id);
    try {
      await approvePartnerApplication(id, profile.id);
      await load();
    } finally {
      setBusyId(null);
    }
  }

  async function onReject(id: string) {
    if (!profile) return;
    setBusyId(id);
    try {
      await rejectPartnerApplication(id, profile.id, 'Rejected via mobile admin');
      await load();
    } finally {
      setBusyId(null);
    }
  }

  if (loading) return <LoadingState />;
  if (error) {
    return <ErrorState title={t('error')} retryLabel={tc('retry')} onRetry={() => void load()} />;
  }

  return (
    <Screen scroll>
      <Text variant="title">{t('queue')}</Text>
      {items.length === 0 ? (
        <EmptyState title={tc('empty')} />
      ) : (
        items.map((item) => (
          <View key={item.id} style={styles.card}>
            <ListRow title={item.title} subtitle={item.subtitle} />
            {item.type === 'partner_application' ? (
              <View style={styles.actions}>
                <Button
                  title={t('actions.approvePartner')}
                  variant="gold"
                  size="sm"
                  loading={busyId === item.id}
                  onPress={() => void onApprove(item.id)}
                />
                <Button
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
