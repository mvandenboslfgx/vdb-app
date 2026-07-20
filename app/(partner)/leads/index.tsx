import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';

import { listLeads } from '@/api/repositories/partnersRepository';
import {
  Button,
  EmptyState,
  ErrorState,
  ListRow,
  LoadingState,
  Screen,
  Text,
} from '@/design-system';
import type { Lead } from '@/types/domain';
import { spacing } from '@/theme';

export default function LeadsScreen() {
  const { t } = useTranslation('partners');
  const { t: tc } = useTranslation('common');
  const router = useRouter();
  const [items, setItems] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      setItems(await listLeads());
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
    return <ErrorState title={t('leads')} retryLabel={tc('retry')} onRetry={() => void load()} />;
  }

  return (
    <Screen scroll>
      <Text variant="title">{t('leads')}</Text>
      <Button
        title={tc('actions.submit')}
        variant="gold"
        style={styles.cta}
        onPress={() => router.push('/(partner)/leads/new')}
      />
      {items.length === 0 ? (
        <EmptyState title={t('leadsEmpty')} />
      ) : (
        items.map((lead) => (
          <ListRow
            key={lead.id}
            title={lead.name}
            subtitle={lead.email}
            meta={lead.status}
          />
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  cta: { marginVertical: spacing.lg },
});
