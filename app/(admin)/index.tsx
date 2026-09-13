import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { getAdminDashboardBundle } from '@/api/repositories/adminRepository';
import {
  AppHeader,
  EmptyState,
  ErrorState,
  ListRow,
  LoadingState,
  MetricCard,
  Screen,
  SectionHeader,
} from '@/design-system';
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
      <AppHeader subtitle={t('dashboard')} />

      <View style={styles.grid}>
        <MetricCard
          testID="admin-metric-partner-applications"
          title={t('stats.partnerApplications')}
          value={String(stats.openPartnerApplications)}
          detail={
            stats.openPartnerApplications === 0
              ? t('stats.allClear')
              : t('stats.partnerApplicationsDetail')
          }
          icon="account-plus-outline"
          onPress={() => router.push('/(admin)/approvals')}
        />
        <MetricCard
          testID="admin-metric-open-tickets"
          title={t('stats.openTickets')}
          value={String(stats.openTickets)}
          detail={stats.openTickets === 0 ? t('stats.allClear') : t('stats.openTicketsDetail')}
          icon="lifebuoy"
          onPress={() => router.push('/(admin)/tickets')}
        />
        <MetricCard
          testID="admin-metric-commissions"
          title={t('stats.commissionsReview')}
          value={String(stats.commissionsUnderReview)}
          detail={
            stats.commissionsUnderReview === 0
              ? t('stats.allClear')
              : t('stats.commissionsReviewDetail')
          }
          icon="cash-multiple"
          onPress={() => router.push('/(admin)/finance')}
        />
        <MetricCard
          testID="admin-metric-payout-requests"
          title={t('stats.payoutRequests')}
          value={String(stats.payoutRequests)}
          detail={
            stats.payoutRequests === 0 ? t('stats.allClear') : t('stats.payoutRequestsDetail')
          }
          icon="bank-transfer-out"
          onPress={() => router.push('/(admin)/finance')}
        />
      </View>

      <SectionHeader title={t('queue')} />
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

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    justifyContent: 'space-between',
  },
});
