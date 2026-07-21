import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { listInvoices } from '@/api/repositories/invoicesRepository';
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
import type { Invoice } from '@/types/domain';

export default function InvoicesScreen() {
  const { t } = useTranslation('invoices');
  const { t: tc } = useTranslation('common');
  const router = useRouter();
  const [items, setItems] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      setItems(await listInvoices());
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
        items.map((invoice, index) => (
          <ListRow
            key={invoice.id}
            testID={index === 0 ? 'invoice-row-0' : `invoice-row-${invoice.id}`}
            title={invoice.number}
            meta={formatCurrency(invoice.totalCents)}
            right={<StatusPill label={t(`status.${invoice.status}`)} tone="gold" />}
            onPress={() => router.push(`/(customer)/invoices/${invoice.id}`)}
          />
        ))
      )}
    </Screen>
  );
}
