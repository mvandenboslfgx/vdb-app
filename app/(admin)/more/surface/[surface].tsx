import { useCallback, useEffect, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import {
  listAdminAppointments,
  listAdminCustomers,
  listAdminInvoices,
  listAdminPartners,
  listAdminProducts,
  listAdminProjects,
  listAdminQuotes,
  reactivatePartner,
  suspendPartner,
  getAdminSecurityStatus,
  getAdminSettingsSummary,
} from '@/api/repositories/adminRepository';
import type { AdminDirectoryPage } from '@/api/contract/adminRc4Mappers';
import { getWhatsAppConfig } from '@/config/whatsapp';
import { BACKEND_CONTRACT } from '@/config/backendContract';
import { clientEnv } from '@/config/env';
import {
  Button,
  EmptyState,
  ErrorState,
  ListRow,
  LoadingState,
  Screen,
  Text,
  TextInput,
} from '@/design-system';
import { DomainError } from '@/lib/errors';
import { useAuth } from '@/providers/AuthProvider';
import { isAdmin } from '@/security/roles';
import { spacing } from '@/theme';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { newIdempotencyKey } from '@/api/contract/adminRc4Mappers';
import { Aal2StepUpModal } from '@/features/auth/aal2/Aal2StepUpModal';
import { useAal2StepUp } from '@/features/auth/aal2/useAal2StepUp';

const SURFACE_KEYS = [
  'products',
  'partners',
  'customers',
  'projects',
  'quotes',
  'invoices',
  'appointments',
  'settings',
  'security',
] as const;

type SurfaceKey = (typeof SURFACE_KEYS)[number];

function isSurfaceKey(value: string): value is SurfaceKey {
  return (SURFACE_KEYS as readonly string[]).includes(value);
}

const LIST_LOADERS: Partial<
  Record<
    SurfaceKey,
    (opts?: { limit?: number; cursor?: string | null }) => Promise<AdminDirectoryPage>
  >
> = {
  products: listAdminProducts,
  partners: listAdminPartners,
  customers: listAdminCustomers,
  projects: listAdminProjects,
  quotes: listAdminQuotes,
  invoices: listAdminInvoices,
  appointments: listAdminAppointments,
};

export default function AdminSurfaceScreen() {
  const { t } = useTranslation('admin');
  const { t: tc } = useTranslation('common');
  const { surface } = useLocalSearchParams<{ surface?: string }>();
  const key = surface && isSurfaceKey(surface) ? surface : null;
  const title = key ? t(`more.${key}`) : t('unavailable.title');
  const { roles } = useAuth();
  const canMutatePartners = isAdmin(roles);
  const aal2 = useAal2StepUp();
  const router = useRouter();

  const DETAIL_SURFACES = new Set([
    'products',
    'partners',
    'customers',
    'projects',
    'quotes',
    'invoices',
    'appointments',
  ]);

  const [page, setPage] = useState<AdminDirectoryPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [settingsText, setSettingsText] = useState<string | null>(null);
  const [securityText, setSecurityText] = useState<string | null>(null);
  const [partnerId, setPartnerId] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!key) return;
    setLoading(true);
    setError(null);
    try {
      if (key === 'settings') {
        const summary = await getAdminSettingsSummary();
        const wa = getWhatsAppConfig();
        setSettingsText(
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
        setPage(null);
      } else if (key === 'security') {
        const status = await getAdminSecurityStatus();
        setSecurityText(
          [
            `AAL: ${status.currentAal}`,
            `MFA enrolled: ${status.mfaEnrolled ? 'yes' : 'no'}`,
            `MFA required: ${status.mfaRequired ? 'yes' : 'no'}`,
            `Step-up required: ${status.stepUpRequired ? 'yes' : 'no'}`,
            `Actor role: ${status.actorRole}`,
            `Capabilities: ${status.capabilities.join(', ') || '—'}`,
          ].join('\n'),
        );
        setPage(null);
      } else {
        const loader = LIST_LOADERS[key];
        if (!loader) throw DomainError.configuration(`Unknown surface:${key}`);
        setPage(await loader({ limit: 25 }));
      }
    } catch (err) {
      const code =
        err instanceof DomainError
          ? err.code
          : err instanceof Error && err.message.includes('AAL2_REQUIRED')
            ? 'AAL2_REQUIRED'
            : 'ERROR';
      setError(String(code));
      setPage(null);
    } finally {
      setLoading(false);
    }
  }, [key]);

  useEffect(() => {
    void load();
  }, [load]);

  async function runPartnerAction(action: 'suspend' | 'reactivate') {
    if (!canMutatePartners) {
      Alert.alert(t('restricted'), t('mutationUnavailable'));
      return;
    }
    if (!partnerId.trim() || reason.trim().length < 8) {
      Alert.alert(t('leads.reason'), t('leads.reasonPlaceholder'));
      return;
    }
    Alert.alert(
      action === 'suspend' ? t('more.partners') : t('more.partners'),
      action === 'suspend'
        ? t('partnerLifecycle.confirmSuspend')
        : t('partnerLifecycle.confirmReactivate'),
      [
        { text: tc('cancel'), style: 'cancel' },
        {
          text: tc('confirm'),
          style: 'destructive',
          onPress: () => {
            void (async () => {
              setBusy(true);
              try {
                const keyIdem = newIdempotencyKey(action);
                const result = await aal2.runWithStepUp(async () => {
                  if (action === 'suspend') {
                    await suspendPartner(partnerId.trim(), reason.trim(), keyIdem);
                  } else {
                    await reactivatePartner(partnerId.trim(), reason.trim(), keyIdem);
                  }
                });
                if (result.status === 'cancelled') {
                  Alert.alert(t('aal2Required'), t('aal2Cancelled'));
                  return;
                }
                if (result.status === 'enrollment_required') {
                  Alert.alert(t('aal2.enrollmentTitle'), t('aal2.enrollmentBody'));
                  return;
                }
                if (result.status === 'error') {
                  const err = result.error;
                  Alert.alert(
                    t('error'),
                    err instanceof DomainError ? err.toUserMessage() : t('error'),
                  );
                  return;
                }
                setReason('');
                await load();
              } finally {
                setBusy(false);
              }
            })();
          },
        },
      ],
    );
  }

  if (!key) {
    return (
      <Screen>
        <Text variant="title">{t('unavailable.title')}</Text>
      </Screen>
    );
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
    <Screen scroll testID={`admin-surface-${key}`}>
      <Aal2StepUpModal visible={aal2.visible} status={aal2.status} onComplete={aal2.onComplete} />
      <Stack.Screen options={{ title }} />
      <Text variant="title">{title}</Text>

      {key === 'settings' && settingsText ? (
        <Text variant="body" color="textSecondary" style={styles.block}>
          {settingsText}
        </Text>
      ) : null}

      {key === 'security' && securityText ? (
        <Text variant="body" color="textSecondary" style={styles.block}>
          {securityText}
        </Text>
      ) : null}

      {key === 'partners' ? (
        <View style={styles.actions}>
          <Text variant="subtitle">{t('partnerLifecycle.title')}</Text>
          {!canMutatePartners ? (
            <Text variant="caption" color="textMuted">
              {t('partnerLifecycle.staffReadOnly')}
            </Text>
          ) : (
            <>
              <TextInput
                label={t('partnerLifecycle.partnerId')}
                value={partnerId}
                onChangeText={setPartnerId}
                autoCapitalize="none"
              />
              <TextInput
                label={t('leads.reason')}
                value={reason}
                onChangeText={setReason}
                multiline
              />
              <Button
                title={t('partnerLifecycle.suspend')}
                variant="danger"
                loading={busy}
                disabled={busy}
                onPress={() => void runPartnerAction('suspend')}
              />
              <Button
                title={t('partnerLifecycle.reactivate')}
                variant="gold"
                loading={busy}
                disabled={busy}
                onPress={() => void runPartnerAction('reactivate')}
              />
            </>
          )}
        </View>
      ) : null}

      {page ? (
        page.items.length === 0 ? (
          <EmptyState title={tc('empty')} />
        ) : (
          page.items.map((item) => (
            <ListRow
              key={item.id}
              title={item.title}
              subtitle={item.subtitle}
              meta={item.status ?? item.meta}
              onPress={() => {
                if (key && DETAIL_SURFACES.has(key)) {
                  router.push(`/(admin)/more/surface/${key}/${item.id}`);
                  return;
                }
                Alert.alert(t('unavailable.badge'), t('unavailable.detailPending'));
              }}
            />
          ))
        )
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  block: { marginTop: spacing.md, lineHeight: 22 },
  actions: { gap: spacing.sm, marginVertical: spacing.lg },
});
