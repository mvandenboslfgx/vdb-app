import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { listFinanceItems } from '@/api/repositories/adminRepository';
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
import type { Commission } from '@/types/domain';

export default function AdminFinanceScreen() {
  const { t } = useTranslation('commissions');
  const { t: ta } = useTranslation('admin');
  const { t: tc } = useTranslation('common');
  const [items, setItems] = useState<Commission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      setItems(await listFinanceItems());
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) return <LoadingState />;
  if (error) {
    return <ErrorState title={ta('error')} retryLabel={tc('retry')} onRetry={() => void load()} />;
  }

  return (
    <Screen scroll>
      <Text variant="title">{ta('stats.commissionsReview')}</Text>
      {items.length === 0 ? (
        <EmptyState title={t('empty')} />
      ) : (
        items.map((c) => (
          <ListRow
            key={c.id}
            title={c.saleLabel}
            meta={formatCurrency(c.amountCents)}
            right={<StatusPill label={t(`status.${c.status}`)} tone="gold" />}
          />
        ))
      )}
    </Screen>
  );
}
