import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import * as WebBrowser from 'expo-web-browser';

import {
  getDocument,
  getDocumentDownloadLink,
  reviewDocument,
} from '@/api/repositories/documentsRepository';
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
import { useFeatureFlags } from '@/providers/FeatureFlagsProvider';
import type { Document } from '@/types/domain';
import { documentReviewDecisionSchema } from '@/validation/documents';
import { spacing } from '@/theme';

const BLOCKED_SCAN_STATUSES = new Set<Document['scanStatus']>(['flagged', 'failed']);

export default function DocumentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation('documents');
  const { t: tc } = useTranslation('common');
  const { t: te } = useTranslation('errors');
  const { enabled } = useFeatureFlags();
  const [doc, setDoc] = useState<Document | null>(null);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [openError, setOpenError] = useState<string | null>(null);

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
    if (!id || !enabled('documentApproval') || busy) return;
    setCommentError(null);
    setActionError(null);

    const parsed = documentReviewDecisionSchema.safeParse({ decision, comment });
    if (!parsed.success) {
      setCommentError(t('commentRequired'));
      return;
    }

    setBusy(true);
    try {
      const updated = await reviewDocument(id, decision, parsed.data.comment);
      setDoc(updated);
      setComment('');
    } catch (err) {
      setActionError(err instanceof DomainError ? err.toUserMessage() : te('generic'));
    } finally {
      setBusy(false);
    }
  }

  async function onOpen() {
    if (!id || !doc || opening) return;
    setOpenError(null);
    if (BLOCKED_SCAN_STATUSES.has(doc.scanStatus)) {
      setOpenError(t('openBlocked'));
      return;
    }
    setOpening(true);
    try {
      const link = await getDocumentDownloadLink(id);
      await WebBrowser.openBrowserAsync(link.url);
    } catch (err) {
      setOpenError(err instanceof DomainError ? err.toUserMessage() : t('openError'));
    } finally {
      setOpening(false);
    }
  }

  if (loading) return <LoadingState />;
  if (error || !doc) {
    return <ErrorState title={t('error')} retryLabel={tc('retry')} onRetry={() => void load()} />;
  }

  const canReview = doc.status === 'under_review' || doc.status === 'available';
  const scanBlocked = BLOCKED_SCAN_STATUSES.has(doc.scanStatus);

  return (
    <Screen scroll testID="screen-document-detail">
      <Text variant="title">{doc.title}</Text>
      <StatusPill label={t(`status.${doc.status}`)} tone="gold" />
      <Text variant="caption" color="textMuted" style={styles.meta}>
        {t('version', { version: doc.currentVersion })}
      </Text>
      <StatusPill
        label={t(`scan.${doc.scanStatus}`)}
        tone={scanBlocked ? 'error' : doc.scanStatus === 'clean' ? 'success' : 'neutral'}
      />

      <View style={styles.openRow}>
        <Button
          testID="btn-document-open"
          title={opening ? t('requestingLink') : t('open')}
          variant="secondary"
          loading={opening}
          disabled={scanBlocked || opening}
          onPress={() => void onOpen()}
        />
        {scanBlocked ? (
          <Text variant="caption" color="error" testID="doc-scan-blocked" style={styles.meta}>
            {t('openBlocked')}
          </Text>
        ) : null}
        {openError ? (
          <Text variant="caption" color="error" testID="doc-open-error" style={styles.meta}>
            {openError}
          </Text>
        ) : null}
      </View>

      {canReview && enabled('documentApproval') ? (
        <View style={styles.actions}>
          <TextInput
            testID="input-document-comment"
            label={t('comment')}
            placeholder={t('commentPlaceholder')}
            value={comment}
            onChangeText={setComment}
            multiline
          />
          {commentError ? (
            <Text variant="caption" color="error" testID="doc-comment-error">
              {commentError}
            </Text>
          ) : null}
          {actionError ? (
            <Text variant="caption" color="error" testID="doc-action-error">
              {actionError}
            </Text>
          ) : null}
          <Button
            testID="btn-document-approve"
            title={t('approve')}
            variant="gold"
            loading={busy}
            disabled={busy}
            onPress={() => void decide('approved')}
          />
          <Button
            testID="btn-document-request-changes"
            title={t('requestChanges')}
            variant="secondary"
            loading={busy}
            disabled={busy}
            onPress={() => void decide('changes_requested')}
          />
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  meta: { marginTop: spacing.md, marginBottom: spacing.xl },
  openRow: { gap: spacing.sm, marginBottom: spacing.xl },
  actions: { gap: spacing.md },
});
