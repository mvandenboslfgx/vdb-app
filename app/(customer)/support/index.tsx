import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';

import { listTickets } from '@/api/repositories/supportRepository';
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
import type { SupportTicket } from '@/types/domain';
import { spacing } from '@/theme';

export default function SupportScreen() {
  const { t } = useTranslation('support');
  const { t: tc } = useTranslation('common');
  const router = useRouter();
  const [items, setItems] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      setItems(await listTickets());
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
  if (error) {
    return <ErrorState title={t('error')} retryLabel={tc('retry')} onRetry={() => void load()} />;
  }

  return (
    <Screen scroll>
      <Text variant="title">{t('title')}</Text>
      <Button
        title={t('newTicket')}
        variant="gold"
        style={styles.cta}
        onPress={() => router.push('/(customer)/support/new')}
      />
      {items.length === 0 ? (
        <EmptyState
          title={t('empty')}
          description={t('emptyHint')}
          actionLabel={t('newTicket')}
          onAction={() => router.push('/(customer)/support/new')}
        />
      ) : (
        items.map((ticket) => (
          <ListRow
            key={ticket.id}
            title={ticket.subject}
            subtitle={t(`categories.${ticket.category}` as 'categories.other')}
            right={<StatusPill label={t(`status.${ticket.status}`)} tone="gold" />}
            onPress={() => router.push(`/(customer)/support/${ticket.id}`)}
          />
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  cta: { marginVertical: spacing.lg },
});
