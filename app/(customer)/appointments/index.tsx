import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { listAppointments } from '@/api/repositories/appointmentsRepository';
import {
  EmptyState,
  ErrorState,
  ListRow,
  LoadingState,
  Screen,
  StatusPill,
  Text,
} from '@/design-system';
import { formatDateTime } from '@/lib/format';
import { useFeatureFlags } from '@/providers/FeatureFlagsProvider';
import type { Appointment } from '@/types/domain';

export default function AppointmentsScreen() {
  const { t } = useTranslation('customer');
  const { t: tc } = useTranslation('common');
  const { enabled } = useFeatureFlags();
  const [items, setItems] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    if (!enabled('appointments')) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(false);
    try {
      setItems(await listAppointments());
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) return <LoadingState />;
  if (error) {
    return (
      <ErrorState
        title={t('appointments.title')}
        retryLabel={tc('retry')}
        onRetry={() => void load()}
      />
    );
  }

  return (
    <Screen scroll>
      <Text variant="title">{t('appointments.title')}</Text>
      {!enabled('appointments') || items.length === 0 ? (
        <EmptyState title={t('appointments.empty')} />
      ) : (
        items.map((a) => (
          <ListRow
            key={a.id}
            title={a.title}
            subtitle={formatDateTime(a.startsAt)}
            right={
              <StatusPill label={t(`appointments.status.${a.status}`)} tone="gold" />
            }
          />
        ))
      )}
    </Screen>
  );
}
