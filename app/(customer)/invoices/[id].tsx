import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
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
import { formatCurrency, formatDate } from '@/lib/format';
import type { Invoice } from '@/types/domain';
import { spacing } from '@/theme';

export default function InvoiceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation('invoices');
  const { t: tp } = useTranslation('payments');
  const { t: tc } = useTranslation('common');
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [payMessage, setPayMessage] = useState<string | null>(null);

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

  async function onPay() {
    if (!invoice) return;
    setBusy(true);
    setPayMessage(null);
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
      } else if (!result.allowed) {
        const key = result.messageKey ?? 'payments.policy.checkoutDisabled';
        const localKey = key.replace(/^payments\./, '');
        setPayMessage(tp(localKey as 'policy.checkoutDisabled'));
      }
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <LoadingState />;
  if (error || !invoice) {
    return <ErrorState title={t('error')} retryLabel={tc('retry')} onRetry={() => void load()} />;
  }

  const canPay = ['sent', 'viewed', 'partially_paid', 'overdue'].includes(invoice.status);

  return (
    <Screen scroll>
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
        <Text variant="body" color="warning" style={styles.message}>
          {payMessage}
        </Text>
      ) : null}

      {canPay ? (
        <Button title={t('payNow')} variant="gold" loading={busy} onPress={() => void onPay()} />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  meta: { gap: spacing.sm, marginVertical: spacing.xl },
  message: { marginBottom: spacing.lg },
});
