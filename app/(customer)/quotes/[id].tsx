import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { acceptQuote, getQuote, rejectQuote } from '@/api/repositories/quotesRepository';
import {
  Button,
  ErrorState,
  LoadingState,
  Screen,
  StatusPill,
  Text,
  TextInput,
} from '@/design-system';
import { DomainError } from '@/lib/errors';
import { formatCurrency, formatDate } from '@/lib/format';
import type { Quote } from '@/types/domain';
import { colors, radii, spacing } from '@/theme';

export default function QuoteDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation('quotes');
  const { t: tc } = useTranslation('common');
  const { t: te } = useTranslation('errors');
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const busyRef = useRef(false);

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

  async function doAccept() {
    if (!id || busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setActionError(null);
    try {
      setQuote(await acceptQuote({ quoteId: id, acceptTerms: true }));
      setMessage(t('acceptedSuccess'));
    } catch (err) {
      setActionError(err instanceof DomainError ? err.toUserMessage() : t('acceptError'));
    } finally {
      setBusy(false);
      busyRef.current = false;
    }
  }

  async function doReject() {
    if (!id || busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setActionError(null);
    try {
      setQuote(await rejectQuote(id, rejectReason.trim()));
      setMessage(t('rejectedSuccess'));
    } catch (err) {
      setActionError(err instanceof DomainError ? err.toUserMessage() : t('rejectError'));
    } finally {
      setBusy(false);
      busyRef.current = false;
    }
  }

  function onAcceptPress() {
    if (busy) return;
    if (!acceptTerms) {
      setActionError(te('validation.acceptQuoteTerms'));
      return;
    }
    setActionError(null);
    Alert.alert(t('confirmAcceptTitle'), t('confirmAcceptMessage'), [
      { text: tc('cancel'), style: 'cancel' },
      { text: tc('confirm'), onPress: () => void doAccept() },
    ]);
  }

  function onRejectPress() {
    if (busy) return;
    setActionError(null);
    Alert.alert(t('confirmRejectTitle'), t('confirmRejectMessage'), [
      { text: tc('cancel'), style: 'cancel' },
      { text: tc('confirm'), style: 'destructive', onPress: () => void doReject() },
    ]);
  }

  if (loading) return <LoadingState />;
  if (error || !quote) {
    return <ErrorState title={t('error')} retryLabel={tc('retry')} onRetry={() => void load()} />;
  }

  const actionable = quote.status === 'sent' || quote.status === 'viewed';

  return (
    <Screen scroll testID="screen-quote-detail">
      <Text variant="title">{quote.title}</Text>
      <StatusPill label={t(`status.${quote.status}`)} tone="gold" />
      <Text variant="caption" color="textMuted" style={styles.meta}>
        {quote.number} · {t('validUntil', { date: formatDate(quote.validUntil) })}
      </Text>
      {quote.termsVersion ? (
        <Text variant="caption" color="textMuted" testID="quote-terms-version">
          {t('termsVersion', { version: quote.termsVersion })}
        </Text>
      ) : null}

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
        <Text variant="body" color="success" style={styles.message} testID="quote-message">
          {message}
        </Text>
      ) : null}
      {actionError ? (
        <Text variant="body" color="error" style={styles.message} testID="quote-error">
          {actionError}
        </Text>
      ) : null}

      {actionable ? (
        <View style={styles.actions}>
          <Pressable
            testID="checkbox-quote-terms"
            onPress={() => setAcceptTerms((v) => !v)}
            style={[styles.check, acceptTerms && styles.checkOn]}
          >
            <Text variant="body" color={acceptTerms ? 'champagneGold' : 'textSecondary'}>
              {acceptTerms ? '✓ ' : '○ '}
              {t('acceptTerms')}
            </Text>
          </Pressable>
          <Button
            testID="btn-quote-accept"
            title={t('accept')}
            variant="gold"
            loading={busy}
            disabled={busy}
            onPress={onAcceptPress}
          />
          <TextInput
            testID="input-quote-reject-reason"
            label={t('rejectReason')}
            placeholder={t('rejectReasonPlaceholder')}
            value={rejectReason}
            onChangeText={setRejectReason}
            multiline
          />
          <Button
            testID="btn-quote-reject"
            title={t('reject')}
            variant="danger"
            loading={busy}
            disabled={busy}
            onPress={onRejectPress}
          />
        </View>
      ) : (
        <Text variant="caption" color="textMuted" testID="quote-readonly-notice" style={styles.message}>
          {t('readOnlyNotice')}
        </Text>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  meta: { marginTop: spacing.md, marginBottom: spacing.lg },
  totals: { gap: spacing.sm, marginBottom: spacing.xl },
  item: { marginBottom: spacing.xs },
  message: { marginVertical: spacing.lg },
  actions: { gap: spacing.md, marginTop: spacing.xl },
  check: {
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  checkOn: { borderColor: colors.champagneGoldDim },
});
