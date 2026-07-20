import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';

import { listCommissions } from '@/api/repositories/commissionsRepository';
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
import { formatCurrency, formatDate } from '@/lib/format';
import type { Commission } from '@/types/domain';
import { spacing } from '@/theme';

export default function CommissionsScreen() {
  const { t } = useTranslation('commissions');
  const { t: tc } = useTranslation('common');
  const router = useRouter();
  const [items, setItems] = useState<Commission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      setItems(await listCommissions());
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
        title={t('requestPayout')}
        variant="secondary"
        style={styles.cta}
        onPress={() => router.push('/(partner)/payouts')}
      />
      {items.length === 0 ? (
        <EmptyState title={t('empty')} description={t('emptyHint')} />
      ) : (
        items.map((c) => (
          <ListRow
            key={c.id}
            title={c.saleLabel}
            subtitle={
              c.expectedReleaseAt
                ? t('expectedRelease', { date: formatDate(c.expectedReleaseAt) })
                : undefined
            }
            meta={formatCurrency(c.amountCents)}
            right={<StatusPill label={t(`status.${c.status}`)} tone="gold" />}
          />
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  cta: { marginVertical: spacing.lg },
});
