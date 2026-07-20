import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import {
  convertPartnerLead,
  getPartnerLead,
  qualifyPartnerLead,
  type LeadQualifyStatus,
} from '@/api/repositories/adminRepository';
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
import type { Lead } from '@/types/domain';
import { spacing } from '@/theme';

const STATUS_TONE: Record<Lead['status'], 'neutral' | 'gold' | 'success' | 'error'> = {
  new: 'neutral',
  contacted: 'gold',
  qualified: 'gold',
  converted: 'success',
  rejected: 'error',
  invalid: 'error',
};

export default function AdminLeadDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation('admin');
  const { t: tp } = useTranslation('partners');
  const { t: tc } = useTranslation('common');
  const { t: te } = useTranslation('errors');

  const [lead, setLead] = useState<Lead | null>(null);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(false);
    try {
      setLead(await getPartnerLead(id));
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onQualify(status: LeadQualifyStatus) {
    if (!lead || busy) return;
    setActionError(null);
    setBusy(true);
    try {
      setLead(await qualifyPartnerLead(lead.id, status, reason || undefined));
      setReason('');
    } catch (err) {
      setActionError(err instanceof DomainError ? err.toUserMessage() : te('generic'));
    } finally {
      setBusy(false);
    }
  }

  async function onConvert() {
    if (!lead || busy) return;
    setActionError(null);
    setBusy(true);
    try {
      setLead(await convertPartnerLead(lead.id));
    } catch (err) {
      setActionError(err instanceof DomainError ? err.toUserMessage() : te('generic'));
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <LoadingState />;
  if (error || !lead) {
    return <ErrorState title={t('error')} retryLabel={tc('retry')} onRetry={() => void load()} />;
  }

  const isFinal = lead.status === 'converted' || lead.status === 'rejected' || lead.status === 'invalid';

  return (
    <Screen scroll testID="screen-admin-lead-detail">
      <Text variant="title">{lead.name}</Text>
      <StatusPill label={tp(`leadStatus.${lead.status}`)} tone={STATUS_TONE[lead.status]} />

      <View style={styles.meta}>
        <Text variant="body" color="textSecondary">{lead.email}</Text>
        {lead.phone ? <Text variant="body" color="textSecondary">{lead.phone}</Text> : null}
        {lead.interest ? (
          <Text variant="caption" color="textMuted">{tp('leadInterest')}: {lead.interest}</Text>
        ) : null}
        {lead.campaignCode ? (
          <Text variant="caption" color="textMuted">{lead.campaignCode}</Text>
        ) : null}
        {lead.notes ? <Text variant="body">{lead.notes}</Text> : null}
        {lead.rejectedReason ? (
          <Text testID="text-admin-lead-rejected-reason" variant="caption" color="error">
            {lead.rejectedReason}
          </Text>
        ) : null}
      </View>

      {!isFinal ? (
        <View style={styles.actions}>
          <TextInput
            testID="input-admin-lead-reason"
            label={t('leads.reason')}
            placeholder={t('leads.reasonPlaceholder')}
            value={reason}
            onChangeText={setReason}
            multiline
          />
          {actionError ? (
            <Text testID="text-admin-lead-error" variant="caption" color="error">
              {actionError}
            </Text>
          ) : null}

          <Button
            testID="btn-admin-lead-contacted"
            title={t('leads.markContacted')}
            variant="secondary"
            loading={busy}
            disabled={busy || lead.status !== 'new'}
            onPress={() => void onQualify('contacted')}
          />
          <Button
            testID="btn-admin-lead-qualify"
            title={t('leads.qualify')}
            variant="gold"
            loading={busy}
            disabled={busy}
            onPress={() => void onQualify('qualified')}
          />
          <Button
            testID="btn-admin-lead-reject"
            title={t('leads.reject')}
            variant="danger"
            loading={busy}
            disabled={busy}
            onPress={() => void onQualify('rejected')}
          />
          <Button
            testID="btn-admin-lead-invalid"
            title={t('leads.markInvalid')}
            variant="danger"
            loading={busy}
            disabled={busy}
            onPress={() => void onQualify('invalid')}
          />
          <Button
            testID="btn-admin-lead-convert"
            title={t('leads.convert')}
            variant="gold"
            loading={busy}
            disabled={busy || lead.status === 'new'}
            onPress={() => void onConvert()}
          />
        </View>
      ) : (
        <Text variant="caption" color="textMuted" style={styles.finalNote}>
          {t('leads.finalState')}
        </Text>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  meta: { gap: spacing.xs, marginTop: spacing.lg, marginBottom: spacing.xl },
  actions: { gap: spacing.md },
  finalNote: { marginTop: spacing.xl },
});