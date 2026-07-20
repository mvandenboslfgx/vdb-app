import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { bookSlot, listAvailableSlots } from '@/api/repositories/appointmentsRepository';
import {
  Button,
  EmptyState,
  ErrorState,
  ListRow,
  LoadingState,
  Screen,
  Text,
} from '@/design-system';
import { DomainError } from '@/lib/errors';
import { formatDateTime } from '@/lib/format';
import type { AppointmentSlot } from '@/types/domain';
import { spacing } from '@/theme';

export default function BookAppointmentScreen() {
  const { t } = useTranslation('customer');
  const { t: tc } = useTranslation('common');
  const router = useRouter();
  const [slots, setSlots] = useState<AppointmentSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [bookError, setBookError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const busyRef = useRef(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      setSlots(await listAvailableSlots());
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function onBook(slotId: string) {
    if (busyRef.current) return;
    busyRef.current = true;
    setBookingId(slotId);
    setBookError(null);
    try {
      await bookSlot({ slotId, title: t('appointments.request') });
      setSuccess(true);
    } catch (err) {
      if (err instanceof DomainError && err.code === 'VALIDATION') {
        setBookError(t('appointments.book.slotTaken'));
        // The slot is gone either way â€” refresh so the stale row disappears.
        void load();
      } else {
        setBookError(err instanceof DomainError ? err.toUserMessage() : t('appointments.book.bookError'));
      }
    } finally {
      setBookingId(null);
      busyRef.current = false;
    }
  }

  if (success) {
    return (
      <Screen testID="screen-appointments-book-success">
        <Text variant="title">{t('appointments.book.success')}</Text>
        <Button
          testID="btn-appointments-book-done"
          title={tc('close')}
          variant="gold"
          fullWidth
          style={styles.doneBtn}
          onPress={() => router.replace('/(customer)/appointments')}
        />
      </Screen>
    );
  }

  if (loading) return <LoadingState label={t('appointments.book.loading')} />;
  if (error) {
    return (
      <ErrorState
        title={t('appointments.book.error')}
        retryLabel={tc('retry')}
        onRetry={() => void load()}
      />
    );
  }

  return (
    <Screen scroll testID="screen-appointments-book">
      <Text variant="title">{t('appointments.book.title')}</Text>
      <Text variant="body" color="textSecondary" style={styles.subtitle}>
        {t('appointments.book.subtitle')}
      </Text>
      <Text variant="caption" color="textMuted" style={styles.timezone}>
        {t('appointments.timezoneLabel')}
      </Text>

      {bookError ? (
        <Text variant="body" color="error" testID="appointments-book-error" style={styles.timezone}>
          {bookError}
        </Text>
      ) : null}

      {slots.length === 0 ? (
        <EmptyState title={t('appointments.book.empty')} />
      ) : (
        slots.map((slot) => (
          <View key={slot.id} testID={`slot-row-${slot.id}`} style={styles.slotRow}>
            <ListRow title={formatDateTime(slot.startsAt)} subtitle={t('appointments.timezoneLabel')} />
            <Button
              testID={`btn-book-slot-${slot.id}`}
              title={t('appointments.book.confirm')}
              variant="gold"
              size="sm"
              loading={bookingId === slot.id}
              disabled={bookingId !== null}
              style={styles.bookBtn}
              onPress={() => void onBook(slot.id)}
            />
          </View>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  subtitle: { marginTop: spacing.sm, marginBottom: spacing.xs },
  timezone: { marginBottom: spacing.lg },
  slotRow: { marginBottom: spacing.md },
  bookBtn: { alignSelf: 'flex-start', marginTop: spacing.xs },
  doneBtn: { marginTop: spacing.xl },
});
