import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { RefreshControl, StyleSheet } from 'react-native';
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
import { usePartnerTicketGate } from '@/features/support/usePartnerTicketGate';
import { translateEnum } from '@/i18n/translateEnum';
import type { SupportTicket } from '@/types/domain';
import { spacing } from '@/theme';

function formatUpdatedAt(iso: string): string {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export default function PartnerSupportListScreen() {
  const { t } = useTranslation('support');
  const { t: tp } = useTranslation('partners');
  const { t: tc } = useTranslation('common');
  const router = useRouter();
  const gate = usePartnerTicketGate();

  const [items, setItems] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (opts?: { refresh?: boolean }) => {
    if (opts?.refresh) setRefreshing(true);
    else setLoading(true);
    setError(false);
    try {
      setItems(await listTickets());
    } catch {
      setError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (gate.loading) return;
    if (!gate.access.canList) {
      setLoading(false);
      return;
    }
    void load();
  }, [gate.loading, gate.access.canList, load]);

  if (gate.loading || (gate.access.canList && loading)) {
    return <LoadingState label={t('loading')} />;
  }

  if (!gate.access.canList) {
    return (
      <ErrorState
        title={tp('supportDenied')}
        retryLabel={tc('retry')}
        onRetry={() => gate.reload()}
      />
    );
  }

  if (error) {
    return <ErrorState title={t('error')} retryLabel={tc('retry')} onRetry={() => void load()} />;
  }

  return (
    <Screen
      scroll
      testID="screen-partner-support"
      scrollProps={{
        refreshControl: (
          <RefreshControl refreshing={refreshing} onRefresh={() => void load({ refresh: true })} />
        ),
      }}
    >
      <Text variant="title">{tp('supportTickets')}</Text>
      <Text variant="caption" color="textMuted" style={styles.hint}>
        {tp('supportTicketsHint')}
      </Text>
      {gate.access.canCreate ? (
        <Button
          testID="btn-partner-support-new"
          title={t('newTicket')}
          variant="gold"
          style={styles.cta}
          onPress={() => router.push('/(partner)/support/new')}
        />
      ) : null}
      {items.length === 0 ? (
        <EmptyState
          title={t('empty')}
          description={t('emptyHint')}
          actionLabel={gate.access.canCreate ? t('newTicket') : undefined}
          onAction={gate.access.canCreate ? () => router.push('/(partner)/support/new') : undefined}
        />
      ) : (
        items.map((ticket) => (
          <ListRow
            key={ticket.id}
            testID={`row-partner-ticket-${ticket.id}`}
            title={ticket.subject}
            subtitle={`${translateEnum(t, 'categories', ticket.category)} · ${formatUpdatedAt(ticket.updatedAt)}`}
            right={<StatusPill label={translateEnum(t, 'status', ticket.status)} tone="gold" />}
            onPress={() => router.push(`/(partner)/support/${ticket.id}`)}
          />
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hint: { marginTop: spacing.sm },
  cta: { marginVertical: spacing.lg },
});
