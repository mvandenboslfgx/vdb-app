import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { RefreshControl, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';

import { listLeads } from '@/api/repositories/partnersRepository';
import {
  Button,
  EmptyState,
  ErrorState,
  ListRow,
  LoadingState,
  Screen,
  StatusPill,
  Text,
} from '@/design-system';
import { translateEnum } from '@/i18n/translateEnum';
import { formatDate } from '@/lib/format';
import type { Lead } from '@/types/domain';
import { spacing } from '@/theme';

const STATUS_TONE: Record<Lead['status'], 'neutral' | 'gold' | 'success' | 'error'> = {
  new: 'neutral',
  contacted: 'gold',
  qualified: 'gold',
  converted: 'success',
  rejected: 'error',
  invalid: 'error',
};

function leadSubtitle(lead: Lead, t: (k: string) => string): string {
  const parts: string[] = [];
  if (lead.email) parts.push(lead.email);
  else if (lead.phone) parts.push(lead.phone);
  if (lead.interest) parts.push(`${t('leadInterest')}: ${lead.interest}`);
  if (lead.createdAt) parts.push(formatDate(lead.createdAt));
  return parts.join(' · ');
}

export default function LeadsScreen() {
  const { t } = useTranslation('partners');
  const { t: tc } = useTranslation('common');
  const router = useRouter();
  const [items, setItems] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(false);
    try {
      setItems(await listLeads());
    } catch {
      setError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) return <LoadingState label={t('leadsLoading')} />;
  if (error) {
    return (
      <ErrorState title={t('leadsError')} retryLabel={tc('retry')} onRetry={() => void load()} />
    );
  }

  return (
    <Screen
      scroll
      testID="screen-leads"
      scrollProps={{
        refreshControl: (
          <RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} />
        ),
      }}
    >
      <Text variant="title">{t('leads')}</Text>
      <Button
        testID="btn-lead-new"
        title={t('submitLead')}
        variant="gold"
        style={styles.cta}
        onPress={() => router.push('/(partner)/leads/new')}
      />
      {items.length === 0 ? (
        <EmptyState title={t('leadsEmpty')} />
      ) : (
        items.map((lead) => (
          <ListRow
            key={lead.id}
            title={lead.name || lead.email || 'Lead'}
            subtitle={leadSubtitle(lead, t) || undefined}
            onPress={() => undefined}
            right={
              <StatusPill
                label={translateEnum(t, 'leadStatus', lead.status)}
                tone={STATUS_TONE[lead.status]}
              />
            }
          />
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  cta: { marginVertical: spacing.lg },
});
