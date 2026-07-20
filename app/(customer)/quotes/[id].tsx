import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { acceptQuote, getQuote, rejectQuote } from '@/api/repositories/quotesRepository';
import {
  Button,
  ErrorState,
  LoadingState,
  Screen,
  StatusPill,
  Text,
} from '@/design-system';
import { formatCurrency, formatDate } from '@/lib/format';
import type { Quote } from '@/types/domain';
import { spacing } from '@/theme';

export default function QuoteDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation('quotes');
  const { t: tc } = useTranslation('common');
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(false);
    try {
      setQuote(await getQuote(id));
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onAccept() {
    if (!id) return;
    setBusy(true);
    try {
      setQuote(await acceptQuote(id));
      setMessage(t('acceptedSuccess'));
    } finally {
      setBusy(false);
    }
  }

  async function onReject() {
    if (!id) return;
    setBusy(true);
    try {
      setQuote(await rejectQuote(id, 'declined'));
      setMessage(t('rejectedSuccess'));
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <LoadingState />;
  if (error || !quote) {
    return <ErrorState title={t('error')} retryLabel={tc('retry')} onRetry={() => void load()} />;
  }

  const actionable = quote.status === 'sent' || quote.status === 'viewed';

  return (
    <Screen scroll>
      <Text variant="title">{quote.title}</Text>
      <StatusPill label={t(`status.${quote.status}`)} tone="gold" />
      <Text variant="caption" color="textMuted" style={styles.meta}>
        {quote.number} · {t('validUntil', { date: formatDate(quote.validUntil) })}
      </Text>

      <View style={styles.totals}>
        <Text variant="body">
          {t('subtotal')}: {formatCurrency(quote.subtotalCents)}
        </Text>
        <Text variant="body">
          {t('vat')}: {formatCurrency(quote.vatCents)}
        </Text>
        <Text variant="subtitle" color="champagneGold">
          {t('total')}: {formatCurrency(quote.totalCents)}
        </Text>
      </View>

      {quote.items.map((item) => (
        <Text key={item.id} variant="caption" color="textSecondary" style={styles.item}>
          {item.description} × {item.quantity}
        </Text>
      ))}

      {message ? (
        <Text variant="body" color="success" style={styles.message}>
          {message}
        </Text>
      ) : null}

      {actionable ? (
        <View style={styles.actions}>
          <Button title={t('accept')} variant="gold" loading={busy} onPress={() => void onAccept()} />
          <Button title={t('reject')} variant="danger" loading={busy} onPress={() => void onReject()} />
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  meta: { marginTop: spacing.md, marginBottom: spacing.lg },
  totals: { gap: spacing.sm, marginBottom: spacing.xl },
  item: { marginBottom: spacing.xs },
  message: { marginVertical: spacing.lg },
  actions: { gap: spacing.md, marginTop: spacing.xl },
});
