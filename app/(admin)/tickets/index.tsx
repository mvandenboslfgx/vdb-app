import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { listAdminTickets } from '@/api/repositories/adminRepository';
import {
  EmptyState,
  ErrorState,
  ListRow,
  LoadingState,
  Screen,
  StatusPill,
  Text,
} from '@/design-system';
import type { SupportTicket } from '@/types/domain';

export default function AdminTicketsScreen() {
  const { t } = useTranslation('support');
  const { t: ta } = useTranslation('admin');
  const { t: tc } = useTranslation('common');
  const router = useRouter();
  const [items, setItems] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      setItems(await listAdminTickets());
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
    return <ErrorState title={ta('error')} retryLabel={tc('retry')} onRetry={() => void load()} />;
  }

  return (
    <Screen scroll testID="screen-admin-tickets">
      <Text variant="title">{t('tickets')}</Text>
      {items.length === 0 ? (
        <EmptyState title={t('empty')} />
      ) : (
        items.map((ticket, index) => (
          <ListRow
            key={ticket.id}
            testID={index === 0 ? 'row-ticket-0' : `row-ticket-${ticket.id}`}
            title={ticket.subject}
            subtitle={ticket.description}
            right={<StatusPill label={t(`status.${ticket.status}`)} tone="gold" />}
            onPress={() => router.push(`/(admin)/tickets/${ticket.id}`)}
          />
        ))
      )}
    </Screen>
  );
}
