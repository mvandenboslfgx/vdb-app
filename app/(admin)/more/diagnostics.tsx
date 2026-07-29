import { useCallback, useEffect, useState } from 'react';
import { Redirect } from 'expo-router';
import { StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';

import { getAdminSettingsSummary } from '@/api/repositories/adminRepository';
import { BACKEND_CONTRACT } from '@/config/backendContract';
import { clientEnv } from '@/config/env';
import { getWhatsAppConfig } from '@/config/whatsapp';
import { ErrorState, LoadingState, Screen, Text } from '@/design-system';
import { DomainError } from '@/lib/errors';
import { useAuth } from '@/providers/AuthProvider';
import { canAccessAdminArea } from '@/security/roles';
import { spacing } from '@/theme';

/**
 * Admin-only contract / environment / feature-flag dump.
 * Secrets and tokens are never shown.
 */
export default function AdminDiagnosticsScreen() {
  const { t } = useTranslation('admin');
  const { t: tc } = useTranslation('common');
  const { roles } = useAuth();
  const [text, setText] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const summary = await getAdminSettingsSummary();
      const wa = getWhatsAppConfig();
      setText(
        [
          `Environment: ${clientEnv.appEnv}`,
          `Contract: ${BACKEND_CONTRACT.packageId}`,
          `Schema: ${BACKEND_CONTRACT.schemaVersion}`,
          `Owner report contract: ${summary.contractVersion}`,
          `Owner report schema: ${summary.schemaVersion}`,
          `WhatsApp configured (app): ${wa.enabled ? 'yes' : 'no'}`,
          `Checkout: ${summary.checkoutEnabled ? 'on' : 'off'}`,
          `Mollie: ${summary.mollieEnabled ? 'on' : 'off'}`,
          `Payouts: ${summary.payoutsEnabled ? 'on' : 'off'}`,
          `Realtime messaging: ${summary.messagingRealtime ? 'on' : 'off'}`,
          `Appointments booking: ${summary.appointmentsBooking ? 'on' : 'off'}`,
        ].join('\n'),
      );
    } catch (err) {
      const code =
        err instanceof DomainError
          ? err.code
          : err instanceof Error && err.message.includes('AAL2_REQUIRED')
            ? 'AAL2_REQUIRED'
            : 'ERROR';
      setError(String(code));
      setText(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!canAccessAdminArea(roles)) return;
    void load();
  }, [load, roles]);

  if (!canAccessAdminArea(roles)) {
    return <Redirect href="/(customer)" />;
  }

  if (loading) return <LoadingState label={t('loading')} />;
  if (error) {
    return (
      <ErrorState
        title={error === 'AAL2_REQUIRED' || error === 'FORBIDDEN' ? t('aal2Required') : t('error')}
        retryLabel={tc('retry')}
        onRetry={() => void load()}
      />
    );
  }

  return (
    <Screen scroll testID="screen-admin-diagnostics">
      <Text variant="title">{t('more.diagnostics')}</Text>
      <Text variant="caption" color="textMuted" style={styles.hint}>
        {tc('diagnostics.noSecrets')}
      </Text>
      {text ? (
        <Text variant="body" color="textSecondary" style={styles.block}>
          {text}
        </Text>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hint: { marginTop: spacing.sm, marginBottom: spacing.md },
  block: { lineHeight: 22 },
});
