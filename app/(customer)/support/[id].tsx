import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { getTicket, listMessages, replyTicket } from '@/api/repositories/supportRepository';
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
import { useAuth } from '@/providers/AuthProvider';
import type { SupportTicket, SupportTicketMessage } from '@/types/domain';
import { colors, radii, spacing } from '@/theme';

const CLOSED_STATUSES = new Set(['closed', 'resolved']);

/** Customer UI must never render internal notes, even if a row slips through. */
function publicMessagesOnly(messages: SupportTicketMessage[]): SupportTicketMessage[] {
  return messages.filter((m) => m.isInternal !== true);
}

export default function SupportTicketDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation('support');
  const { t: tc } = useTranslation('common');
  const { user } = useAuth();

  const [ticket, setTicket] = useState<SupportTicket | null>(null);
  const [messages, setMessages] = useState<SupportTicketMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [replyBody, setReplyBody] = useState('');
  const [sending, setSending] = useState(false);
  const [replyError, setReplyError] = useState<string | null>(null);
  const [replySuccess, setReplySuccess] = useState(false);

  const ticketId = typeof id === 'string' ? id : Array.isArray(id) ? id[0] : undefined;

  const load = useCallback(async () => {
    if (!ticketId) {
      setError(true);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(false);
    try {
      const [ticketData, messageData] = await Promise.all([
        getTicket(ticketId),
        listMessages(ticketId),
      ]);
      if (!ticketData) {
        setTicket(null);
        setMessages([]);
        setError(true);
        return;
      }
      setTicket(ticketData);
      setMessages(publicMessagesOnly(messageData));
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [ticketId]);

  useEffect(() => {
    setTicket(null);
    setMessages([]);
    setReplyBody('');
    setReplyError(null);
    setReplySuccess(false);
    void load();
  }, [load]);

  const visibleMessages = useMemo(() => publicMessagesOnly(messages), [messages]);

  async function onSendReply() {
    if (!ticketId || !replyBody.trim() || sending) return;
    const body = replyBody.trim();
    setSending(true);
    setReplyError(null);
    setReplySuccess(false);
    try {
      const message = await replyTicket(ticketId, body);
      if (message.isInternal === true) {
        // Fail-closed: never append an unexpected internal row into the customer thread.
        setReplyError(t('detail.error'));
        return;
      }
      setMessages((prev) => publicMessagesOnly([...prev, message]));
      setReplyBody('');
      setReplySuccess(true);
      const updated = await getTicket(ticketId);
      if (updated) setTicket(updated);
    } catch (err) {
      setReplyError(err instanceof DomainError ? err.toUserMessage() : t('detail.error'));
    } finally {
      setSending(false);
    }
  }

  if (loading) return <LoadingState label={t('loading')} />;
  if (error || !ticket) {
    return <ErrorState title={t('error')} retryLabel={tc('retry')} onRetry={() => void load()} />;
  }

  const canReply = !CLOSED_STATUSES.has(ticket.status);
  const myUserId = user?.id ?? '';

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
    >
      <Screen scroll testID="screen-support-detail">
        <Text variant="title">{ticket.subject}</Text>
        <StatusPill label={translateEnum(t, 'status', ticket.status)} tone="gold" />
        <Text variant="caption" color="textMuted" style={styles.meta}>
          {translateEnum(t, 'categories', ticket.category)} ·{' '}
          {translateEnum(t, 'priorities', ticket.priority)}
        </Text>
        <Text variant="body" color="textSecondary">
          {ticket.description}
        </Text>

        <Text variant="subtitle" style={styles.threadTitle}>
          {t('detail.threadTitle')}
        </Text>
        {visibleMessages.length === 0 ? (
          <Text testID="text-support-thread-empty" variant="caption" color="textMuted">
            {t('detail.threadEmpty')}
          </Text>
        ) : (
          visibleMessages.map((m) => {
            const mine = Boolean(myUserId) && m.authorId === myUserId;
            return (
              <View
                key={m.id}
                testID={`row-support-message-${m.id}`}
                style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleStaff]}
              >
                <Text variant="caption" color="textMuted">
                  {mine ? t('detail.you') : t('detail.supportTeam')}
                </Text>
                <Text variant="body">{m.body}</Text>
                <Text variant="caption" color="textMuted" style={styles.bubbleMeta}>
                  {new Date(m.createdAt).toLocaleString()}
                </Text>
              </View>
            );
          })
        )}

        {canReply ? (
          <View style={styles.composer}>
            <TextInput
              testID="input-support-reply"
              label={t('detail.customerComposer')}
              placeholder={t('detail.customerReplyPlaceholder')}
              value={replyBody}
              onChangeText={(text) => {
                setReplyBody(text);
                if (replySuccess) setReplySuccess(false);
              }}
              multiline
            />
            {replyError ? (
              <Text testID="text-support-reply-error" variant="caption" color="error">
                {replyError}
              </Text>
            ) : null}
            {replySuccess ? (
              <Text testID="text-support-reply-success" variant="caption" color="success">
                {t('detail.replySent')}
              </Text>
            ) : null}
            <Button
              testID="btn-support-send-reply"
              title={t('detail.sendReply')}
              variant="gold"
              loading={sending}
              disabled={sending || replyBody.trim().length === 0}
              onPress={() => void onSendReply()}
            />
          </View>
        ) : (
          <Text
            testID="text-support-reply-closed"
            variant="caption"
            color="textMuted"
            style={styles.closed}
          >
            {t('detail.closedHint')}
          </Text>
        )}
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  meta: { marginVertical: spacing.lg },
  threadTitle: { marginTop: spacing.xl, marginBottom: spacing.sm },
  bubble: {
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.xs,
  },
  bubbleMine: { backgroundColor: colors.surfaceElevated },
  bubbleStaff: { backgroundColor: colors.surfaceSecondary },
  bubbleMeta: { marginTop: spacing.xs },
  composer: { marginTop: spacing.xl, gap: spacing.md, paddingBottom: spacing.xl },
  closed: { marginTop: spacing.xl },
});
