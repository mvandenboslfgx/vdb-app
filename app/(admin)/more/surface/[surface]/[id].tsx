import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';

import {
  getAdminAppointmentDetail,
  getAdminCustomerDetail,
  getAdminInvoiceDetail,
  getAdminPartnerDetail,
  getAdminProductDetail,
  getAdminProjectDetail,
  getAdminQuoteDetail,
} from '@/api/repositories/adminRepository';
import type { AdminDirectoryDetail } from '@/api/contract/adminRc5Mappers';
import { ACTIVATION_BLOCK_COPY } from '@/api/contract/adminRc5Mappers';
import { adminReviewStatusTitle } from '@/lib/partnerAdminReview';
import { Button, EmptyState, ErrorState, LoadingState, Screen, Text } from '@/design-system';
import { DomainError } from '@/lib/errors';
import { spacing } from '@/theme';

const DETAIL_LOADERS = {
  products: getAdminProductDetail,
  partners: getAdminPartnerDetail,
  customers: getAdminCustomerDetail,
  projects: getAdminProjectDetail,
  quotes: getAdminQuoteDetail,
  invoices: getAdminInvoiceDetail,
  appointments: getAdminAppointmentDetail,
} as const;

type DetailSurface = keyof typeof DETAIL_LOADERS;

function isDetailSurface(value: string): value is DetailSurface {
  return value in DETAIL_LOADERS;
}

export default function AdminSurfaceDetailScreen() {
  const { t } = useTranslation('admin');
  const { t: tc } = useTranslation('common');
  const router = useRouter();
  const { surface, id } = useLocalSearchParams<{ surface?: string; id?: string }>();
  const key = surface && isDetailSurface(surface) ? surface : null;

  const [detail, setDetail] = useState<AdminDirectoryDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorCode, setErrorCode] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!key || !id) return;
    setLoading(true);
    setErrorCode(null);
    try {
      setDetail(await DETAIL_LOADERS[key](String(id)));
    } catch (err) {
      setDetail(null);
      if (err instanceof DomainError) {
        setErrorCode(err.message.includes('NOT_FOUND') ? 'NOT_FOUND' : err.code);
      } else if (err instanceof Error && err.message.includes('CONTRACT_DRIFT')) {
        setErrorCode('CONTRACT_DRIFT');
      } else {
        setErrorCode('ERROR');
      }
    } finally {
      setLoading(false);
    }
  }, [key, id]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!key || !id) {
    return (
      <Screen>
        <Text variant="title">{t('unavailable.title')}</Text>
        <Button title={tc('back')} onPress={() => router.back()} />
      </Screen>
    );
  }

  if (loading) return <LoadingState label={t('loading')} />;

  if (errorCode === 'NOT_FOUND') {
    return (
      <Screen testID={`admin-detail-${key}-empty`}>
        <Stack.Screen options={{ title: t(`more.${key}`) }} />
        <EmptyState title={t('detail.notFound')} />
        <Button title={tc('back')} onPress={() => router.back()} />
      </Screen>
    );
  }

  if (errorCode === 'FORBIDDEN') {
    return (
      <ErrorState title={t('restricted')} retryLabel={tc('back')} onRetry={() => router.back()} />
    );
  }

  if (errorCode || !detail) {
    return (
      <ErrorState
        title={errorCode === 'CONTRACT_DRIFT' ? t('detail.contractDrift') : t('error')}
        retryLabel={tc('retry')}
        onRetry={() => void load()}
      />
    );
  }

  const checklist = detail.partner?.activationChecklist;

  return (
    <Screen scroll testID={`admin-detail-${key}`}>
      <Stack.Screen options={{ title: detail.title }} />
      <Text variant="title">{detail.title}</Text>
      {detail.subtitle ? (
        <Text variant="body" color="textSecondary" style={styles.sub}>
          {detail.subtitle}
        </Text>
      ) : null}
      {detail.status ? (
        <Text variant="caption" color="champagneGold" style={styles.sub}>
          {detail.status}
        </Text>
      ) : null}
      <View style={styles.block}>
        {detail.metaLines.map((line) => (
          <Text key={line} variant="body" color="textSecondary" style={styles.line}>
            {line}
          </Text>
        ))}
      </View>

      {checklist ? (
        <View style={styles.block} testID="partner-activation-checklist">
          <Text variant="subtitle">{t('detail.activationTitle')}</Text>
          <Text variant="body" color="textSecondary">
            {checklist.canActivate ? t('detail.activationReady') : t('detail.activationBlocked')}
          </Text>
          {checklist.missing.map((code) => (
            <Text key={code} variant="caption" color="error" style={styles.line}>
              • {ACTIVATION_BLOCK_COPY[code] ?? code}
            </Text>
          ))}
          <Text variant="caption" color="textMuted" style={styles.hint}>
            {t('detail.noSelfActivation')}
          </Text>
          <Text variant="caption" color="textMuted" style={styles.hint}>
            {t('detail.kycUnavailable')}
          </Text>
          {detail.partner?.identityVerificationStatus ? (
            <Text
              variant="caption"
              color="textSecondary"
              style={styles.hint}
              testID="admin-review-status-readonly"
            >
              {t('detail.adminReviewTitle')}:{' '}
              {adminReviewStatusTitle(detail.partner.identityVerificationStatus, 'nl')}
            </Text>
          ) : null}
          <Text variant="caption" color="textMuted" style={styles.hint}>
            {t('detail.adminReviewReadOnly')}
          </Text>
        </View>
      ) : null}

      <Button title={tc('back')} variant="secondary" onPress={() => router.back()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  sub: { marginTop: spacing.xs },
  block: { marginVertical: spacing.lg, gap: spacing.xs },
  line: { lineHeight: 20 },
  hint: { marginTop: spacing.sm },
});
