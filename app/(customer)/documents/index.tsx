import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { listDocuments } from '@/api/repositories/documentsRepository';
import {
  EmptyState,
  ErrorState,
  ListRow,
  LoadingState,
  Screen,
  StatusPill,
  Text,
} from '@/design-system';
import type { Document } from '@/types/domain';

export default function DocumentsScreen() {
  const { t } = useTranslation('documents');
  const { t: tc } = useTranslation('common');
  const router = useRouter();
  const [items, setItems] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      setItems(await listDocuments());
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
      {items.length === 0 ? (
        <EmptyState title={t('empty')} description={t('emptyHint')} />
      ) : (
        items.map((doc) => (
          <ListRow
            key={doc.id}
            title={doc.title}
            subtitle={t('version', { version: doc.currentVersion })}
            right={<StatusPill label={t(`status.${doc.status}`)} tone="gold" />}
            onPress={() => router.push(`/(customer)/documents/${doc.id}`)}
          />
        ))
      )}
    </Screen>
  );
}
