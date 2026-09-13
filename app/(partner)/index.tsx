import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { listCommissions } from '@/api/repositories/commissionsRepository';
import { listLeads, getPartnerLink } from '@/api/repositories/partnersRepository';
import {
  AppHeader,
  Button,
  ListRow,
  LoadingState,
  MetricCard,
  Screen,
  SectionHeader,
} from '@/design-system';
import { formatCurrency } from '@/lib/format';
import { spacing } from '@/theme';

export default function PartnerHomeScreen() {
  const { t } = useTranslation('partners');
  const { t: tc } = useTranslation('commissions');
  const router = useRouter();
  const [leadCount, setLeadCount] = useState(0);
  const [commissionTotal, setCommissionTotal] = useState(0);
  const [link, setLink] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [leads, commissions, partnerLink] = await Promise.all([
        listLeads(),
        listCommissions(),
        getPartnerLink(),
      ]);
      setLeadCount(leads.length);
      setCommissionTotal(commissions.reduce((sum, c) => sum + c.amountCents, 0));
      setLink(partnerLink);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) return <LoadingState />;

  return (
    <Screen scroll testID="partner-dashboard-screen">
      <AppHeader subtitle={t('dashboard')} />

      <View style={styles.metrics}>
        <MetricCard
          testID="partner-metric-leads"
          title={t('leads')}
          value={String(leadCount)}
          detail={
            leadCount === 0 ? t('leadsEmpty') : t('leadsDetail', { count: leadCount })
          }
          icon="account-group-outline"
          onPress={() => router.push('/(partner)/leads')}
        />
        <MetricCard
          testID="partner-metric-commissions"
          title={tc('title')}
          value={formatCurrency(commissionTotal)}
          detail={tc('dashboardDetail')}
          icon="cash-multiple"
          onPress={() => router.push('/(partner)/commissions')}
        />
      </View>

      <SectionHeader title={t('link')} />
      <ListRow testID="partner-code-link" title={t('link')} subtitle={link} />

      <SectionHeader title={t('supportTickets')} />
      <Button
        testID="partner-support-open"
        title={t('supportTickets')}
        variant="secondary"
        style={styles.cta}
        onPress={() => router.push('/(partner)/support')}
      />
      <Button
        testID="partner-lead-create"
        title={t('leads')}
        variant="secondary"
        style={styles.cta}
        onPress={() => router.push('/(partner)/leads')}
      />
      <Button
        testID="partner-payout-request"
        title={tc('requestPayout')}
        variant="gold"
        onPress={() => router.push('/(partner)/payouts')}
      />
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
  cta: { marginBottom: spacing.md },
});
