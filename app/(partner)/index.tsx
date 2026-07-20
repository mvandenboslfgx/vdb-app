import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { listCommissions } from '@/api/repositories/commissionsRepository';
import { listLeads, getPartnerLink } from '@/api/repositories/partnersRepository';
import { Button, ListRow, LoadingState, Screen, Text } from '@/design-system';
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
    <Screen scroll>
      <Text variant="title">{t('dashboard')}</Text>
      <View style={styles.stats}>
        <View style={styles.stat}>
          <Text variant="caption" color="textMuted">
            {t('leads')}
          </Text>
          <Text variant="title" color="champagneGold">
            {leadCount}
          </Text>
        </View>
        <View style={styles.stat}>
          <Text variant="caption" color="textMuted">
            {tc('title')}
          </Text>
          <Text variant="title">{formatCurrency(commissionTotal)}</Text>
        </View>
      </View>
      <ListRow title={t('link')} subtitle={link} />
      <Button
        title={t('leads')}
        variant="secondary"
        style={styles.cta}
        onPress={() => router.push('/(partner)/leads')}
      />
      <Button
        title={tc('requestPayout')}
        variant="gold"
        onPress={() => router.push('/(partner)/payouts')}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  stats: { flexDirection: 'row', gap: spacing.md, marginVertical: spacing.xl },
  stat: {
    flex: 1,
    gap: spacing.xs,
    padding: spacing.lg,
    backgroundColor: '#141416',
    borderRadius: 10,
  },
  cta: { marginBottom: spacing.md },
});
