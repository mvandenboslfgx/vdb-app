import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';

import { getTicket } from '@/api/repositories/supportRepository';
import { ErrorState, LoadingState, Screen, StatusPill, Text } from '@/design-system';
import type { SupportTicket } from '@/types/domain';
import { spacing } from '@/theme';

export default function SupportTicketDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation('support');
  const { t: tc } = useTranslation('common');
  const [ticket, setTicket] = useState<SupportTicket | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(false);
    try {
      setTicket(await getTicket(id));
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) return <LoadingState />;
  if (error || !ticket) {
    return <ErrorState title={t('error')} retryLabel={tc('retry')} onRetry={() => void load()} />;
  }

  return (
    <Screen scroll>
      <Text variant="title">{ticket.subject}</Text>
      <StatusPill label={t(`status.${ticket.status}`)} tone="gold" />
      <Text variant="caption" color="textMuted" style={styles.meta}>
        {t(`categories.${ticket.category}` as 'categories.other')} ·{' '}
        {t(`priorities.${ticket.priority}`)}
      </Text>
      <Text variant="body" color="textSecondary">
        {ticket.description}
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  meta: { marginVertical: spacing.lg },
});
