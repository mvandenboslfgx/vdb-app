import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { getDocument, reviewDocument } from '@/api/repositories/documentsRepository';
import {
  Button,
  ErrorState,
  LoadingState,
  Screen,
  StatusPill,
  Text,
  TextInput,
} from '@/design-system';
import { useFeatureFlags } from '@/providers/FeatureFlagsProvider';
import type { Document } from '@/types/domain';
import { spacing } from '@/theme';

export default function DocumentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation('documents');
  const { t: tc } = useTranslation('common');
  const { enabled } = useFeatureFlags();
  const [doc, setDoc] = useState<Document | null>(null);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(false);
    try {
      setDoc(await getDocument(id));
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function decide(decision: 'approved' | 'changes_requested') {
    if (!id || !enabled('documentApproval')) return;
    setBusy(true);
    try {
      const updated = await reviewDocument(id, decision, comment);
      setDoc(updated);
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <LoadingState />;
  if (error || !doc) {
    return <ErrorState title={t('error')} retryLabel={tc('retry')} onRetry={() => void load()} />;
  }

  const canReview = doc.status === 'under_review' || doc.status === 'available';

  return (
    <Screen scroll>
      <Text variant="title">{doc.title}</Text>
      <StatusPill label={t(`status.${doc.status}`)} tone="gold" />
      <Text variant="caption" color="textMuted" style={styles.meta}>
        {t('version', { version: doc.currentVersion })} · {t(`scan.${doc.scanStatus}`)}
      </Text>

      {canReview && enabled('documentApproval') ? (
        <View style={styles.actions}>
          <TextInput
            label={t('comment')}
            placeholder={t('commentPlaceholder')}
            value={comment}
            onChangeText={setComment}
            multiline
          />
          <Button
            title={t('approve')}
            variant="gold"
            loading={busy}
            onPress={() => void decide('approved')}
          />
          <Button
            title={t('requestChanges')}
            variant="secondary"
            loading={busy}
            onPress={() => void decide('changes_requested')}
          />
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  meta: { marginTop: spacing.md, marginBottom: spacing.xl },
  actions: { gap: spacing.md },
});
