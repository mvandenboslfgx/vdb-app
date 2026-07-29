import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { cancelAppointment, listAppointments } from '@/api/repositories/appointmentsRepository';
import { isContractSurfaceUnavailable } from '@/api/contract/ownerClient';
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
import { getAppLocale } from '@/i18n';
import { translateEnum } from '@/i18n/translateEnum';
import { presentAppointmentListItem } from '@/lib/appointmentPresentation';
import { DomainError } from '@/lib/errors';
import { useFeatureFlags } from '@/providers/FeatureFlagsProvider';
import type { Appointment } from '@/types/domain';
import { spacing } from '@/theme';

const CANCELLABLE_STATUSES = new Set<Appointment['status']>([
  'scheduled',
  'requested',
  'confirmed',
  'rescheduled',
]);

export default function AppointmentsScreen() {
  const { t } = useTranslation('customer');
  const { t: tc } = useTranslation('common');
  const { t: te } = useTranslation('errors');
  const { enabled } = useFeatureFlags();
  const router = useRouter();
  const [items, setItems] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const appointmentsEnabled = enabled('appointments');
  // Booking remains fail-closed server-side; treat list as read-only when unavailable.
  const canBook = appointmentsEnabled && !unavailable;
  const canCancel = appointmentsEnabled && !unavailable;

  const load = useCallback(async () => {
    if (!enabled('appointments')) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(false);
    setUnavailable(false);
    try {
      setItems(await listAppointments());
    } catch (err) {
      if (isContractSurfaceUnavailable(err)) {
        setUnavailable(true);
      } else {
        setError(true);
      }
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    void load();
  }, [load]);

  async function doCancel(id: string) {
    setBusyId(id);
    setActionError(null);
    try {
      const updated = await cancelAppointment(id);
      setItems((prev) => prev.map((a) => (a.id === id ? updated : a)));
    } catch (err) {
      setActionError(err instanceof DomainError ? err.toUserMessage() : te('generic'));
    } finally {
      setBusyId(null);
    }
  }

  function onCancelPress(id: string) {
    Alert.alert(t('appointments.cancelConfirmTitle'), t('appointments.cancelConfirmMessage'), [
      { text: tc('cancel'), style: 'cancel' },
      { text: tc('confirm'), style: 'destructive', onPress: () => void doCancel(id) },
    ]);
  }

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

  const locale = getAppLocale();

  return (
    <Screen scroll testID="screen-appointments">
      <View style={styles.header}>
        <Text variant="title">{t('appointments.title')}</Text>
        {canBook ? (
          <Button
            testID="btn-appointments-book"
            title={t('appointments.bookCta')}
            variant="gold"
            size="sm"
            onPress={() => router.push('/(customer)/appointments/book')}
          />
        ) : null}
      </View>
      <Text variant="caption" color="textMuted" style={styles.timezone}>
        {t('appointments.timezoneLabel')}
      </Text>

      {actionError ? (
        <Text variant="caption" color="error" testID="appointments-error" style={styles.timezone}>
          {actionError}
        </Text>
      ) : null}

      {unavailable ? (
        <EmptyState title={t('appointments.unavailable')} />
      ) : !appointmentsEnabled || items.length === 0 ? (
        <EmptyState title={t('appointments.empty')} />
      ) : (
        items.map((a) => {
          const presented = presentAppointmentListItem(a, locale);
          const subtitle = presented.locationLabel
            ? `${presented.dateLabel} · ${presented.timeRangeLabel} · ${presented.locationLabel}`
            : `${presented.dateLabel} · ${presented.timeRangeLabel}`;
          return (
            <View key={a.id} testID={`appointment-row-${a.id}`}>
              <ListRow
                title={presented.title}
                subtitle={subtitle}
                right={
                  <StatusPill
                    label={translateEnum(t, 'appointments.status', presented.statusKey)}
                    tone="gold"
                  />
                }
              />
              {canCancel && CANCELLABLE_STATUSES.has(a.status) ? (
                <Button
                  testID={`btn-appointment-cancel-${a.id}`}
                  title={t('appointments.cancel')}
                  variant="danger"
                  size="sm"
                  loading={busyId === a.id}
                  disabled={busyId === a.id}
                  style={styles.cancelBtn}
                  onPress={() => onCancelPress(a.id)}
                />
              ) : null}
            </View>
          );
        })
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  timezone: { marginTop: spacing.xs, marginBottom: spacing.lg },
  cancelBtn: { marginBottom: spacing.md, alignSelf: 'flex-start' },
});
