import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { listConversations } from '@/api/repositories/messagesRepository';
import { isContractSurfaceUnavailable } from '@/api/contract/ownerClient';
import { EmptyState, ErrorState, ListRow, LoadingState, Screen, Text } from '@/design-system';
import { formatRelative } from '@/lib/format';
import type { Conversation } from '@/types/domain';

export default function MessagesScreen() {
  const { t } = useTranslation('messages');
  const { t: tc } = useTranslation('common');
  const router = useRouter();
  const [items, setItems] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [unavailable, setUnavailable] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    setUnavailable(false);
    try {
      setItems(await listConversations());
    } catch (err) {
      if (isContractSurfaceUnavailable(err)) {
        setUnavailable(true);
      } else {
        setError(true);
      }
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
    <Screen scroll testID="screen-messages">
      <Text variant="title">{t('title')}</Text>
      {unavailable ? (
        <EmptyState title={t('unavailableTitle')} description={t('unavailableHint')} />
      ) : items.length === 0 ? (
        <EmptyState title={t('empty')} description={t('emptyHint')} />
      ) : (
        items.map((c, index) => (
          <ListRow
            key={c.id}
            testID={index === 0 ? 'conversation-row-0' : `conversation-row-${c.id}`}
            title={c.title}
            subtitle={c.lastMessagePreview ?? undefined}
            meta={
              c.unreadCount > 0
                ? t('unread', { count: c.unreadCount })
                : c.lastMessageAt
                  ? formatRelative(c.lastMessageAt)
                  : undefined
            }
            onPress={() => router.push(`/(customer)/messages/${c.id}`)}
          />
        ))
      )}
    </Screen>
  );
}
