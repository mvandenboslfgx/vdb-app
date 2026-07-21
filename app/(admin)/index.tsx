import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { getAdminDashboardBundle } from '@/api/repositories/adminRepository';
import { ErrorState, ListRow, LoadingState, Screen, Text } from '@/design-system';
import type { AdminDashboardStats } from '@/types/domain';
import type { AdminQueueItem } from '@/api/mockData';
import { spacing } from '@/theme';

export default function AdminHomeScreen() {
  const { t } = useTranslation('admin');
  const { t: tc } = useTranslation('common');
  const router = useRouter();
  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [queue, setQueue] = useState<AdminQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const data = await getAdminDashboardBundle();
      setStats(data.stats);
      setQueue(data.queue);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) return <LoadingState label={t('loading')} />;
  if (error || !stats) {
    return <ErrorState title={t('error')} retryLabel={tc('retry')} onRetry={() => void load()} />;
  }

  return (
    <Screen scroll testID="admin-dashboard-screen">
      <Text variant="title">{t('dashboard')}</Text>
      <View style={styles.grid}>
        <Stat label={t('stats.partnerApplications')} value={stats.openPartnerApplications} />
        <Stat label={t('stats.openTickets')} value={stats.openTickets} />
        <Stat label={t('stats.commissionsReview')} value={stats.commissionsUnderReview} />
        <Stat label={t('stats.payoutRequests')} value={stats.payoutRequests} />
      </View>

      <Text variant="subtitle" style={styles.section}>
        {t('queue')}
      </Text>
      {queue.map((item) => (
        <ListRow
          key={item.id}
          title={item.title}
          subtitle={item.subtitle}
          onPress={() => {
            if (item.type === 'support_ticket') router.push('/(admin)/tickets');
            else if (item.type === 'partner_application' || item.type === 'document_review') {
              router.push('/(admin)/approvals');
            } else router.push('/(admin)/finance');
          }}
        />
      ))}
    </Screen>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.stat}>
      <Text variant="caption" color="textMuted">
        {label}
      </Text>
      <Text variant="title" color="champagneGold">
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginVertical: spacing.xl,
  },
  stat: {
    width: '47%',
    gap: spacing.xs,
    padding: spacing.lg,
    backgroundColor: '#141416',
    borderRadius: 10,
  },
  section: { marginBottom: spacing.md },
});
