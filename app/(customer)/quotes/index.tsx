import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { listQuotes } from '@/api/repositories/quotesRepository';
import {
  EmptyState,
  ErrorState,
  ListRow,
  LoadingState,
  Screen,
  StatusPill,
  Text,
} from '@/design-system';
import { formatCurrency } from '@/lib/format';
import type { Quote } from '@/types/domain';

export default function QuotesScreen() {
  const { t } = useTranslation('quotes');
  const { t: tc } = useTranslation('common');
  const router = useRouter();
  const [items, setItems] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      setItems(await listQuotes());
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
    <Screen scroll testID="screen-quotes">
      <Text variant="title">{t('title')}</Text>
      {items.length === 0 ? (
        <EmptyState title={t('empty')} description={t('emptyHint')} />
      ) : (
        items.map((quote, index) => (
          <ListRow
            key={quote.id}
            testID={index === 0 ? 'quote-row-0' : `quote-row-${quote.id}`}
            title={quote.title}
            subtitle={quote.number}
            meta={formatCurrency(quote.totalCents)}
            right={<StatusPill label={t(`status.${quote.status}`)} tone="gold" />}
            onPress={() => router.push(`/(customer)/quotes/${quote.id}`)}
          />
        ))
      )}
    </Screen>
  );
}
