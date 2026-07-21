import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { AppState, Platform, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import * as WebBrowser from 'expo-web-browser';

import { getInvoice } from '@/api/repositories/invoicesRepository';
import { createCheckout } from '@/api/repositories/paymentsRepository';
import {
  Button,
  ErrorState,
  LoadingState,
  Screen,
  StatusPill,
  Text,
} from '@/design-system';
import { DomainError } from '@/lib/errors';
import { formatCurrency, formatDate } from '@/lib/format';
import type { Invoice } from '@/types/domain';
import { spacing } from '@/theme';

export default function InvoiceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation('invoices');
  const { t: tp } = useTranslation('payments');
  const { t: tc } = useTranslation('common');
  const { t: te } = useTranslation('errors');
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [payMessage, setPayMessage] = useState<string | null>(null);
  const [payError, setPayError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(false);
    try {
      setInvoice(await getInvoice(id));
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  // After browser checkout return (deep link or app resume), refresh authoritative status.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void load();
      }
    });
    return () => sub.remove();
  }, [load]);

  async function onPay() {
    if (!invoice || busy) return;
    setBusy(true);
    setPayMessage(null);
    setPayError(null);
    try {
      const platform =
        Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'web';
      const result = await createCheckout({
        invoiceId: invoice.id,
        productCategory: 'custom_project',
        platform,
      });
      if (result.allowed && result.checkoutUrl) {
        await WebBrowser.openBrowserAsync(result.checkoutUrl);
        setPayMessage(tp('redirecting'));
        // Authoritative status is always re-fetched — never trust client-side paid claims.
        await load();
      } else if (!result.allowed) {
        const key = result.messageKey ?? 'payments.policy.checkoutDisabled';
        const localKey = key.replace(/^payments\./, '');
        setPayMessage(tp(localKey as 'policy.checkoutDisabled'));
      }
    } catch (err) {
      setPayError(err instanceof DomainError ? err.toUserMessage() : te('generic'));
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <Screen testID="screen-invoice-detail">
        <LoadingState />
      </Screen>
    );
  }
  if (error || !invoice) {
    return (
      <Screen testID="screen-invoice-detail">
        <ErrorState title={t('error')} retryLabel={tc('retry')} onRetry={() => void load()} />
      </Screen>
    );
  }

  const canPay = ['sent', 'viewed', 'partially_paid', 'overdue'].includes(invoice.status);

  return (
    <Screen scroll testID="screen-invoice-detail">
      <Text variant="title">{invoice.number}</Text>
      <StatusPill label={t(`status.${invoice.status}`)} tone="gold" />
      <View style={styles.meta}>
        <Text variant="body">
          {t('issueDate')}: {formatDate(invoice.issueDate)}
        </Text>
        <Text variant="body">
          {t('dueDate')}: {formatDate(invoice.dueDate)}
        </Text>
        <Text variant="subtitle" color="champagneGold">
          {t('amountDue')}: {formatCurrency(invoice.totalCents - invoice.amountPaidCents)}
        </Text>
        {invoice.paymentReference ? (
          <Text variant="caption" color="textMuted">
            {t('reference')}: {invoice.paymentReference}
          </Text>
        ) : null}
      </View>

      {payMessage ? (
        <Text variant="body" color="warning" style={styles.message} testID="invoice-pay-message">
          {payMessage}
        </Text>
      ) : null}
      {payError ? (
        <Text variant="caption" color="error" style={styles.message} testID="invoice-pay-error">
          {payError}
        </Text>
      ) : null}

      {canPay ? (
        <Button
          testID="customer-checkout-start"
          title={t('payNow')}
          variant="gold"
          loading={busy}
          onPress={() => void onPay()}
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  meta: { gap: spacing.sm, marginVertical: spacing.xl },
  message: { marginBottom: spacing.lg },
});
