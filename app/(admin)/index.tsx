import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { getAdminDashboardBundle } from '@/api/repositories/adminRepository';
import { EmptyState, ErrorState, ListRow, LoadingState, Screen, Text } from '@/design-system';
import { DomainError } from '@/lib/errors';
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
  const [errorCode, setErrorCode] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErrorCode(null);
    try {
      const data = await getAdminDashboardBundle();
      setStats(data.stats);
      setQueue(data.queue);
    } catch (err) {
      setStats(null);
      setQueue([]);
      if (err instanceof DomainError) {
        setErrorCode(err.code);
      } else if (err instanceof Error && err.message.includes('CONTRACT_DRIFT')) {
        setErrorCode('CONTRACT_DRIFT');
      } else {
        setErrorCode('UNKNOWN');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) return <LoadingState label={t('loading')} />;
  if (errorCode || !stats) {
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
      {queue.length === 0 ? (
        <EmptyState title={tc('empty')} />
      ) : (
        queue.map((item) => (
          <ListRow
            key={`${item.type}-${item.id}`}
            title={item.title}
            subtitle={item.subtitle}
            onPress={() => {
              if (item.type === 'support_ticket') router.push('/(admin)/tickets');
              else if (
                item.type === 'partner_application' ||
                item.type === 'document_review' ||
                item.type === 'commission_review'
              ) {
                router.push('/(admin)/approvals');
              } else if (item.type === 'appointment') {
                router.push('/(admin)/more/surface/appointments');
              } else if (item.type === 'unknown') {
                return;
              } else {
                router.push('/(admin)/finance');
              }
            }}
          />
        ))
      )}
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
