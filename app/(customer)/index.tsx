import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { getCustomerDashboard } from '@/api/repositories/customerRepository';
import {
  EmptyState,
  ErrorState,
  ListRow,
  LoadingState,
  Screen,
  StatusPill,
  Text,
} from '@/design-system';
import { formatCurrency } from '@/lib/format';
import { useAuth } from '@/providers/AuthProvider';
import type { CustomerDashboard } from '@/types/domain';
import { spacing } from '@/theme';

export default function CustomerHomeScreen() {
  const { t } = useTranslation('customer');
  const { t: tp } = useTranslation('projects');
  const { t: tc } = useTranslation('common');
  const { profile } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<CustomerDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const dash = await getCustomerDashboard(profile?.fullName);
      setData(dash);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [profile?.fullName]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) return <LoadingState label={t('dashboard.title')} />;
  if (error || !data) {
    return (
      <ErrorState
        title={t('dashboard.title')}
        retryLabel={tc('retry')}
        onRetry={() => void load()}
      />
    );
  }

  return (
    <Screen scroll testID="screen-customer-dashboard">
      <Text variant="title">
        {t('dashboard.greeting', { name: data.welcomeName || profile?.fullName || '' })}
      </Text>

      <View style={styles.stats}>
        <View style={styles.stat}>
          <Text variant="caption" color="textMuted">
            {t('dashboard.unreadMessages')}
          </Text>
          <Text variant="title" color="champagneGold">
            {data.unreadMessages}
          </Text>
        </View>
        <View style={styles.stat}>
          <Text variant="caption" color="textMuted">
            {t('dashboard.documentsPending')}
          </Text>
          <Text variant="title">{data.documentsPendingReview}</Text>
        </View>
      </View>

      <Text variant="subtitle" style={styles.section}>
        {t('dashboard.activeProjects')}
      </Text>
      {data.activeProjects.length === 0 ? (
        <EmptyState
          title={t('dashboard.emptyProjects')}
          actionLabel={tp('requestCta')}
          onAction={() => router.push('/(customer)/projects/request')}
        />
      ) : (
        data.activeProjects.map((project) => (
          <View key={project.id} testID={`dashboard-project-${project.id}`}>
            <ListRow
              title={project.title}
              subtitle={project.nextMilestone ?? project.description}
              meta={`${project.progressPercent}%`}
              right={
                <StatusPill label={tp(`status.${project.status}`)} tone="gold" />
              }
              onPress={() => router.push(`/(customer)/projects/${project.id}`)}
            />
          </View>
        ))
      )}

      <Text variant="subtitle" style={styles.section}>
        {t('dashboard.openQuotes')}
      </Text>
      {data.openQuotes.length === 0 ? (
        <Text variant="caption" color="textMuted">
          {t('dashboard.emptyQuotes')}
        </Text>
      ) : (
        data.openQuotes.map((quote) => (
          <ListRow
            key={quote.id}
            title={quote.title}
            subtitle={quote.number}
            meta={formatCurrency(quote.totalCents)}
            onPress={() => router.push(`/(customer)/quotes/${quote.id}`)}
          />
        ))
      )}

      <Text variant="subtitle" style={styles.section}>
        {t('dashboard.openInvoices')}
      </Text>
      {data.openInvoices.length === 0 ? (
        <Text variant="caption" color="textMuted">
          {t('dashboard.emptyInvoices')}
        </Text>
      ) : (
        data.openInvoices.map((invoice) => (
          <ListRow
            key={invoice.id}
            title={invoice.number}
            meta={formatCurrency(invoice.totalCents)}
            onPress={() => router.push(`/(customer)/invoices/${invoice.id}`)}
          />
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  stats: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.xl,
    marginBottom: spacing.lg,
  },
  stat: {
    flex: 1,
    gap: spacing.xs,
    padding: spacing.lg,
    backgroundColor: '#141416',
    borderRadius: 10,
  },
  section: { marginTop: spacing.xl, marginBottom: spacing.md },
});
