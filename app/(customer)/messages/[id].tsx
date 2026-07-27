import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import {
  listMessages,
  markConversationRead,
  sendMessage,
} from '@/api/repositories/messagesRepository';
import { Button, ErrorState, LoadingState, Screen, Text, TextInput } from '@/design-system';
import { useAuth } from '@/providers/AuthProvider';
import type { Message } from '@/types/domain';
import { colors, radii, spacing } from '@/theme';

export default function MessageThreadScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation('messages');
  const { t: tc } = useTranslation('common');
  const { profile } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(false);
    try {
      setMessages(await listMessages(id));
      try {
        await markConversationRead(id);
      } catch {
        // Read-state is best-effort; do not fail the thread UI.
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onSend() {
    if (!id || !body.trim() || !profile) return;
    setSending(true);
    try {
      const msg = await sendMessage({
        conversationId: id,
        senderId: profile.id,
        senderName: profile.fullName,
        body: body.trim(),
      });
      setMessages((prev) => [...prev, msg]);
      setBody('');
    } finally {
      setSending(false);
    }
  }

  if (loading) return <LoadingState />;
  if (error) {
    return <ErrorState title={t('error')} retryLabel={tc('retry')} onRetry={() => void load()} />;
  }

  return (
    <Screen padded={false} style={styles.screen} testID="screen-message-thread">
      <FlatList
        data={messages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const mine = item.senderId === profile?.id;
          return (
            <View
              style={[styles.bubble, mine ? styles.mine : styles.theirs]}
              testID={`message-${item.id}`}
            >
              {!mine ? (
                <Text variant="caption" color="champagneGold">
                  {item.senderName}
                </Text>
              ) : null}
              <Text variant="body">{item.body}</Text>
            </View>
          );
        }}
      />
      <View style={styles.composer}>
        <TextInput
          testID="customer-chat-input"
          placeholder={t('composerPlaceholder')}
          value={body}
          onChangeText={setBody}
          style={styles.input}
        />
        <Button
          testID="customer-chat-send"
          title={t('send')}
          variant="gold"
          loading={sending}
          onPress={() => void onSend()}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  list: { padding: spacing.lg, gap: spacing.sm },
  bubble: {
    padding: spacing.md,
    borderRadius: radii.lg,
    marginBottom: spacing.sm,
    maxWidth: '85%',
    gap: spacing.xxs,
  },
  mine: {
    alignSelf: 'flex-end',
    backgroundColor: colors.surfaceElevated,
  },
  theirs: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surfacePrimary,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  composer: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
    alignItems: 'center',
  },
  input: { flex: 1 },
});
