import { Stack, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
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
import { translateEnum } from '@/i18n/translateEnum';
import { DomainError } from '@/lib/errors';
import {
  allowedLeadActions,
  canLeadAction,
  leadActionRequiresConfirm,
  leadActionRequiresReason,
  type LeadAction,
} from '@/lib/leadTransitions';
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

  function runAction(action: LeadAction) {
    if (!lead || busy || !canLeadAction(lead.status, action)) return;
    if (leadActionRequiresReason(action) && !reason.trim()) return;

    const execute = () => {
      if (action === 'convert') {
        void onConvert();
      } else {
        void onQualify(action);
      }
    };

    if (leadActionRequiresConfirm(action)) {
      const title =
        action === 'rejected'
          ? t('leads.reject')
          : action === 'invalid'
            ? t('leads.markInvalid')
            : t('leads.convert');
      Alert.alert(title, undefined, [
        { text: tc('cancel'), style: 'cancel' },
        {
          text: tc('confirm'),
          style: action === 'convert' ? 'default' : 'destructive',
          onPress: execute,
        },
      ]);
      return;
    }

    execute();
  }

  if (loading) return <LoadingState />;
  if (error || !lead) {
    return <ErrorState title={t('error')} retryLabel={tc('retry')} onRetry={() => void load()} />;
  }

  const actions = allowedLeadActions(lead.status);
  const needsReason = actions.some((a) => leadActionRequiresReason(a));

  return (
    <Screen scroll testID="screen-admin-lead-detail">
      <Stack.Screen options={{ title: lead?.name || 'Lead' }} />
      <Text variant="title">{lead.name}</Text>
      <StatusPill
        label={translateEnum(tp, 'leadStatus', lead.status)}
        tone={STATUS_TONE[lead.status]}
      />

      <View style={styles.meta}>
        <Text variant="body" color="textSecondary">
          {lead.email}
        </Text>
        {lead.phone ? (
          <Text variant="body" color="textSecondary">
            {lead.phone}
          </Text>
        ) : null}
        {lead.interest ? (
          <Text variant="caption" color="textMuted">
            {tp('leadInterest')}: {lead.interest}
          </Text>
        ) : null}
        {lead.campaignCode ? (
          <Text variant="caption" color="textMuted">
            {lead.campaignCode}
          </Text>
        ) : null}
        {lead.notes ? <Text variant="body">{lead.notes}</Text> : null}
        {lead.rejectedReason ? (
          <Text testID="text-admin-lead-rejected-reason" variant="caption" color="error">
            {lead.rejectedReason}
          </Text>
        ) : null}
      </View>

      {actions.length > 0 ? (
        <View style={styles.actions}>
          {needsReason ? (
            <TextInput
              testID="input-admin-lead-reason"
              label={t('leads.reason')}
              placeholder={t('leads.reasonPlaceholder')}
              value={reason}
              onChangeText={setReason}
              multiline
            />
          ) : null}
          {actionError ? (
            <Text testID="text-admin-lead-error" variant="caption" color="error">
              {actionError}
            </Text>
          ) : null}

          {canLeadAction(lead.status, 'contacted') ? (
            <Button
              testID="btn-admin-lead-contacted"
              title={t('leads.markContacted')}
              variant="secondary"
              loading={busy}
              disabled={busy}
              onPress={() => runAction('contacted')}
            />
          ) : null}
          {canLeadAction(lead.status, 'qualified') ? (
            <Button
              testID="btn-admin-lead-qualify"
              title={t('leads.qualify')}
              variant="gold"
              loading={busy}
              disabled={busy}
              onPress={() => runAction('qualified')}
            />
          ) : null}
          {canLeadAction(lead.status, 'rejected') ? (
            <Button
              testID="btn-admin-lead-reject"
              title={t('leads.reject')}
              variant="danger"
              loading={busy}
              disabled={busy || !reason.trim()}
              onPress={() => runAction('rejected')}
            />
          ) : null}
          {canLeadAction(lead.status, 'invalid') ? (
            <Button
              testID="btn-admin-lead-invalid"
              title={t('leads.markInvalid')}
              variant="danger"
              loading={busy}
              disabled={busy || !reason.trim()}
              onPress={() => runAction('invalid')}
            />
          ) : null}
          {canLeadAction(lead.status, 'convert') ? (
            <Button
              testID="btn-admin-lead-convert"
              title={t('leads.convert')}
              variant="gold"
              loading={busy}
              disabled={busy}
              onPress={() => runAction('convert')}
            />
          ) : null}
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
