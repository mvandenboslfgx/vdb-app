import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getCustomerDashboard } from '@/api/repositories/customerRepository';
import {
  AppHeader,
  CommercialDocumentCard,
  DashboardGreeting,
  EmptyState,
  ErrorState,
  LoadingState,
  MetricCard,
  ProjectSummaryCard,
  QuickAction,
  QuickActionRow,
  Screen,
  SectionHeader,
} from '@/design-system';
import { formatCurrency, formatDate } from '@/lib/format';
import { PREMIUM_TAB_BAR_BASE_HEIGHT } from '@/navigation/premiumTabBar';
import { useAuth } from '@/providers/AuthProvider';
import type { CustomerDashboard } from '@/types/domain';
import { spacing } from '@/theme';

export default function CustomerHomeScreen() {
  const { t } = useTranslation('customer');
  const { t: tp } = useTranslation('projects');
  const { t: tc } = useTranslation('common');
  const { t: tq } = useTranslation('quotes');
  const { t: ti } = useTranslation('invoices');
  const { profile } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
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

  const conversationsUnavailable = data.unavailableSurfaces?.includes('conversations') ?? false;
  const appointmentsUnavailable = data.unavailableSurfaces?.includes('appointments') ?? false;
  const messagesDetail = conversationsUnavailable
    ? t('dashboard.messagesUnavailable')
    : data.unreadMessages === 0
      ? t('dashboard.messagesNone')
      : t('dashboard.messagesNew', { count: data.unreadMessages });
  const documentsDetail =
    data.documentsPendingReview === 0
      ? t('dashboard.documentsNone')
      : t('dashboard.documentsNeedReview', { count: data.documentsPendingReview });

  const bottomPad = PREMIUM_TAB_BAR_BASE_HEIGHT + Math.max(insets.bottom, 8) + spacing['2xl'];

  return (
    <Screen
      scroll
      testID="customer-dashboard-screen"
      contentContainerStyle={{ paddingBottom: bottomPad }}
    >
      <AppHeader />
      <DashboardGreeting fullName={data.welcomeName || profile?.fullName} />

      <View style={styles.metrics}>
        <MetricCard
          testID="metric-messages"
          title={t('dashboard.unreadMessages')}
          value={String(data.unreadMessages)}
          detail={messagesDetail}
          icon="message-text-outline"
          onPress={() => router.push('/(customer)/messages')}
        />
        <MetricCard
          testID="metric-documents"
          title={t('dashboard.documentsPending')}
          value={
            data.documentsPendingReview === 0
              ? t('dashboard.metricOk')
              : String(data.documentsPendingReview)
          }
          detail={documentsDetail}
          icon="file-document-outline"
          onPress={() => router.push('/(customer)/documents')}
        />
        <MetricCard
          testID="metric-quotes"
          title={t('dashboard.openQuotes')}
          value={String(data.openQuotes.length)}
          detail={
            data.openQuotes.length === 0
              ? t('dashboard.quotesNone')
              : t('dashboard.quotesOpen', { count: data.openQuotes.length })
          }
          icon="file-sign"
          onPress={() => router.push('/(customer)/quotes')}
        />
        <MetricCard
          testID="metric-invoices"
          title={t('dashboard.openInvoices')}
          value={
            data.openInvoices.length === 0
              ? t('dashboard.metricOk')
              : formatCurrency(data.openInvoices.reduce((sum, inv) => sum + inv.totalCents, 0))
          }
          detail={
            data.openInvoices.length === 0
              ? t('dashboard.invoicesNone')
              : t('dashboard.invoicesOpen', { count: data.openInvoices.length })
          }
          icon="receipt"
          onPress={() => router.push('/(customer)/invoices')}
        />
      </View>

      <SectionHeader title={t('dashboard.quickActions')} />
      <QuickActionRow>
        <QuickAction
          testID="quick-new-project"
          label={t('dashboard.actionNewProject')}
          icon="folder-plus-outline"
          onPress={() => router.push('/(customer)/projects/request')}
        />
        <QuickAction
          testID="quick-support"
          label={t('dashboard.actionSupport')}
          icon="lifebuoy"
          onPress={() => router.push('/(customer)/support')}
        />
        <QuickAction
          testID="quick-upload"
          label={t('dashboard.actionUpload')}
          icon="upload-outline"
          onPress={() => router.push('/(customer)/documents')}
        />
        <QuickAction
          testID="quick-appointment"
          label={
            appointmentsUnavailable
              ? t('dashboard.appointmentsUnavailable')
              : t('dashboard.actionAppointment')
          }
          icon="calendar-month-outline"
          onPress={() => router.push('/(customer)/appointments')}
        />
      </QuickActionRow>

      <SectionHeader title={t('dashboard.activeProjects')} />
      {data.activeProjects.length === 0 ? (
        <EmptyState
          title={t('dashboard.emptyProjects')}
          actionLabel={tp('requestCta')}
          onAction={() => router.push('/(customer)/projects/request')}
        />
      ) : (
        data.activeProjects.map((project) => (
          <ProjectSummaryCard
            key={project.id}
            testID={`dashboard-project-${project.id}`}
            title={project.title}
            description={project.description}
            statusLabel={tp(`status.${project.status}`)}
            progressPercent={project.progressPercent}
            nextAction={project.nextMilestone}
            lastUpdated={project.updatedAt}
            onPress={() => router.push(`/(customer)/projects/${project.id}`)}
          />
        ))
      )}

      <SectionHeader title={t('dashboard.sectionOpenQuotes')} />
      {data.openQuotes.length === 0 ? (
        <EmptyState title={t('dashboard.emptyQuotes')} />
      ) : (
        data.openQuotes.map((quote) => (
          <CommercialDocumentCard
            key={quote.id}
            kind="quote"
            title={quote.title}
            reference={quote.number}
            amount={formatCurrency(quote.totalCents)}
            statusLabel={tq(`status.${quote.status}`, { defaultValue: quote.status })}
            meta={
              quote.validUntil
                ? tq('validUntil', { date: formatDate(quote.validUntil) })
                : undefined
            }
            actionLabel={t('dashboard.actionReview')}
            onPress={() => router.push(`/(customer)/quotes/${quote.id}`)}
          />
        ))
      )}

      <SectionHeader title={t('dashboard.sectionOpenInvoices')} />
      {data.openInvoices.length === 0 ? (
        <EmptyState title={t('dashboard.emptyInvoices')} />
      ) : (
        data.openInvoices.map((invoice) => (
          <CommercialDocumentCard
            key={invoice.id}
            kind="invoice"
            title={ti('cardTitle')}
            reference={invoice.number}
            amount={formatCurrency(invoice.totalCents)}
            statusLabel={ti(`status.${invoice.status}`, { defaultValue: invoice.status })}
            meta={invoice.dueDate ? `${ti('dueDate')}: ${formatDate(invoice.dueDate)}` : undefined}
            actionLabel={t('dashboard.actionPay')}
            onPress={() => router.push(`/(customer)/invoices/${invoice.id}`)}
          />
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  metrics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    justifyContent: 'space-between',
  },
});
