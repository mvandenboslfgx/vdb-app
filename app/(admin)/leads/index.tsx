import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { listPartnerLeads } from '@/api/repositories/adminRepository';
import {
  EmptyState,
  ErrorState,
  ListRow,
  LoadingState,
  Screen,
  StatusPill,
  Text,
} from '@/design-system';
import { translateEnum } from '@/i18n/translateEnum';
import type { Lead } from '@/types/domain';

const STATUS_TONE: Record<Lead['status'], 'neutral' | 'gold' | 'success' | 'error'> = {
  new: 'neutral',
  contacted: 'gold',
  qualified: 'gold',
  converted: 'success',
  rejected: 'error',
  invalid: 'error',
};

export default function AdminLeadsScreen() {
  const { t } = useTranslation('admin');
  const { t: tp } = useTranslation('partners');
  const { t: tc } = useTranslation('common');
  const router = useRouter();
  const [items, setItems] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      setItems(await listPartnerLeads());
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
    <Screen scroll testID="screen-admin-leads">
      <Text variant="title">{t('leads.title')}</Text>
      {items.length === 0 ? (
        <EmptyState title={tp('leadsEmpty')} />
      ) : (
        items.map((lead) => (
          <ListRow
            key={lead.id}
            title={lead.name}
            subtitle={lead.email}
            right={
              <StatusPill
                label={translateEnum(tp, 'leadStatus', lead.status)}
                tone={STATUS_TONE[lead.status]}
              />
            }
            onPress={() => router.push(`/(admin)/leads/${lead.id}`)}
          />
        ))
      )}
    </Screen>
  );
}
