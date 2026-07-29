import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import {
  replyInternal,
  replyPublic,
  updateTicketStatus,
  type AdminTicketStatus,
} from '@/api/repositories/adminRepository';
import { getTicket, listStaffTicketMessages } from '@/api/repositories/supportRepository';
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
import type { SupportTicket, SupportTicketMessage } from '@/types/domain';
import { colors, radii, spacing } from '@/theme';

const STATUS_ACTIONS: AdminTicketStatus[] = [
  'open',
  'in_progress',
  'waiting_on_customer',
  'resolved',
  'closed',
];

const REASON_REQUIRED: AdminTicketStatus[] = ['resolved', 'closed'];

export default function AdminTicketDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation('support');
  const { t: tc } = useTranslation('common');
  const { t: ta } = useTranslation('admin');

  const [ticket, setTicket] = useState<SupportTicket | null>(null);
  const [messages, setMessages] = useState<SupportTicketMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [replyBody, setReplyBody] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [sending, setSending] = useState(false);
  const [replyError, setReplyError] = useState<string | null>(null);

  const [pendingStatus, setPendingStatus] = useState<AdminTicketStatus | null>(null);
  const [statusReason, setStatusReason] = useState('');
  const [statusBusy, setStatusBusy] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(false);
    try {
      const [ticketData, messageData] = await Promise.all([
        getTicket(id),
        listStaffTicketMessages(id),
      ]);
      if (!ticketData) {
        setError(true);
        return;
      }
      setTicket(ticketData);
      setMessages(messageData);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onSendReply() {
    if (!id || !replyBody.trim() || sending) return;
    setSending(true);
    setReplyError(null);
    try {
      const message = isInternal
        ? await replyInternal(id, replyBody)
        : await replyPublic(id, replyBody);
      setMessages((prev) => [...prev, message]);
      setReplyBody('');
      if (!isInternal) {
        const updated = await getTicket(id);
        if (updated) setTicket(updated);
      }
    } catch (err) {
      if (
        err instanceof DomainError &&
        (err.message.includes('FEATURE_DISABLED') || err.code === 'CONFIGURATION')
      ) {
        setReplyError(isInternal ? ta('internalNotesDisabled') : err.toUserMessage());
      } else {
        setReplyError(err instanceof DomainError ? err.toUserMessage() : t('detail.error'));
      }
    } finally {
      setSending(false);
    }
  }

  function onPressStatus(status: AdminTicketStatus) {
    setStatusError(null);
    if (REASON_REQUIRED.includes(status)) {
      setPendingStatus(status);
      setStatusReason('');
      return;
    }
    void applyStatus(status);
  }

  async function applyStatus(status: AdminTicketStatus, reason?: string) {
    if (!id || statusBusy) return;
    setStatusBusy(true);
    setStatusError(null);
    try {
      const updated = await updateTicketStatus(id, status, reason);
      setTicket(updated);
      setPendingStatus(null);
      setStatusReason('');
    } catch (err) {
      setStatusError(err instanceof DomainError ? err.toUserMessage() : t('detail.error'));
    } finally {
      setStatusBusy(false);
    }
  }

  if (loading) return <LoadingState label={t('loading')} />;
  if (error || !ticket) {
    return <ErrorState title={t('error')} retryLabel={tc('retry')} onRetry={() => void load()} />;
  }

  return (
    <Screen padded={false} style={styles.screen} testID="screen-admin-ticket-detail">
      <FlatList
        data={messages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text variant="title">{ticket.subject}</Text>
            <StatusPill label={t(`status.${ticket.status}`)} tone="gold" />
            <Text variant="caption" color="textMuted" style={styles.meta}>
              {t(`categories.${ticket.category}` as 'categories.other')} ·{' '}
              {t(`priorities.${ticket.priority}`)}
            </Text>
            <Text variant="body" color="textSecondary">
              {ticket.description}
            </Text>

            <View style={styles.statusRow}>
              {STATUS_ACTIONS.map((status) => (
                <Button
                  key={status}
                  testID={`btn-ticket-status-${status}`}
                  title={t(`detail.actions.${status}`)}
                  variant={ticket.status === status ? 'gold' : 'secondary'}
                  size="sm"
                  disabled={statusBusy}
                  onPress={() => onPressStatus(status)}
                />
              ))}
            </View>

            {pendingStatus ? (
              <View style={styles.reasonBox}>
                <TextInput
                  testID="input-ticket-status-reason"
                  placeholder={t('detail.statusReasonPlaceholder')}
                  value={statusReason}
                  onChangeText={setStatusReason}
                  multiline
                />
                <View style={styles.statusRow}>
                  <Button
                    testID="btn-ticket-status-confirm"
                    title={tc('confirm')}
                    variant="gold"
                    size="sm"
                    loading={statusBusy}
                    disabled={statusBusy || !statusReason.trim()}
                    onPress={() => void applyStatus(pendingStatus, statusReason)}
                  />
                  <Button
                    testID="btn-ticket-status-cancel"
                    title={tc('cancel')}
                    variant="ghost"
                    size="sm"
                    disabled={statusBusy}
                    onPress={() => setPendingStatus(null)}
                  />
                </View>
              </View>
            ) : null}
            {statusError ? (
              <Text testID="text-ticket-status-error" variant="caption" color="error">
                {statusError}
              </Text>
            ) : null}

            <Text variant="label" color="textSecondary" style={styles.threadTitle}>
              {t('detail.threadTitle')}
            </Text>
            {messages.length === 0 ? (
              <Text testID="text-ticket-thread-empty" variant="body" color="textSecondary">
                {t('detail.threadEmpty')}
              </Text>
            ) : null}
          </View>
        }
        renderItem={({ item }) => (
          <View
            style={[styles.bubble, item.isInternal ? styles.internal : styles.public]}
            testID={`row-ticket-message-${item.id}`}
          >
            {item.isInternal ? (
              <Text variant="caption" color="champagneGold">
                {t('detail.internalNote')}
              </Text>
            ) : null}
            <Text variant="body">{item.body}</Text>
          </View>
        )}
      />
      <View style={styles.composer}>
        <View style={styles.toggleRow}>
          <Button
            testID="toggle-ticket-reply-public"
            title={t('detail.sendReply')}
            variant={isInternal ? 'secondary' : 'gold'}
            size="sm"
            onPress={() => setIsInternal(false)}
          />
          <Button
            testID="toggle-ticket-reply-internal"
            title={t('detail.internalNote')}
            variant={isInternal ? 'gold' : 'secondary'}
            size="sm"
            onPress={() => setIsInternal(true)}
          />
        </View>
        <TextInput
          testID="input-ticket-reply"
          placeholder={isInternal ? t('detail.notePlaceholder') : t('detail.replyPlaceholder')}
          value={replyBody}
          onChangeText={setReplyBody}
          multiline
        />
        {replyError ? (
          <Text testID="text-ticket-reply-error" variant="caption" color="error">
            {replyError}
          </Text>
        ) : null}
        <Button
          testID="btn-ticket-send-reply"
          title={isInternal ? t('detail.sendNote') : t('detail.sendReply')}
          variant="gold"
          fullWidth
          loading={sending}
          disabled={sending || !replyBody.trim()}
          onPress={() => void onSendReply()}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  list: { padding: spacing.lg, gap: spacing.sm },
  header: { gap: spacing.sm, marginBottom: spacing.lg },
  meta: { marginTop: spacing.xs },
  statusRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm },
  reasonBox: { gap: spacing.sm, marginTop: spacing.sm },
  threadTitle: { marginTop: spacing.lg },
  bubble: {
    padding: spacing.md,
    borderRadius: radii.lg,
    marginBottom: spacing.sm,
    gap: spacing.xxs,
  },
  public: {
    backgroundColor: colors.surfacePrimary,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  internal: {
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.champagneGoldDim,
  },
  composer: {
    gap: spacing.sm,
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
  },
  toggleRow: { flexDirection: 'row', gap: spacing.sm },
});
