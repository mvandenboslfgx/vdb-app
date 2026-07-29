import * as Clipboard from 'expo-clipboard';
import * as Linking from 'expo-linking';
import { useCallback, useEffect, useState } from 'react';
import { Share, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { getPartnerLinkDetails } from '@/api/repositories/partnersRepository';
import { Button, EmptyState, LoadingState, Screen, Text } from '@/design-system';
import { isValidPartnerLinkUrl } from '@/lib/partnerLink';
import { spacing } from '@/theme';

export default function MarketingScreen() {
  const { t } = useTranslation('partners');
  const { t: tc } = useTranslation('common');
  const [link, setLink] = useState('');
  const [code, setCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setCopyError(null);
    try {
      const details = await getPartnerLinkDetails();
      setLink(details.available ? details.url : '');
      setCode(details.code);
    } catch {
      setLink('');
      setCode('');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  async function onCopy() {
    setCopyError(null);
    if (!isValidPartnerLinkUrl(link)) {
      setCopyError(t('copyLinkFailed'));
      setCopied(false);
      return;
    }
    try {
      await Clipboard.setStringAsync(link);
      setCopied(true);
    } catch {
      setCopied(false);
      setCopyError(t('copyLinkFailed'));
    }
  }

  async function onShare() {
    if (!isValidPartnerLinkUrl(link)) {
      setCopyError(t('linkUnavailable'));
      return;
    }
    try {
      await Share.share({ message: link, url: link });
    } catch {
      setCopyError(t('copyLinkFailed'));
    }
  }

  async function onOpen() {
    if (!isValidPartnerLinkUrl(link)) {
      setCopyError(t('linkUnavailable'));
      return;
    }
    await Linking.openURL(link);
  }

  if (loading) return <LoadingState />;

  const available = isValidPartnerLinkUrl(link);

  return (
    <Screen scroll testID="screen-partner-marketing">
      <Text variant="title">{t('link')}</Text>
      {!available ? (
        <EmptyState title={t('linkUnavailable')} />
      ) : (
        <>
          {code ? (
            <Text variant="caption" color="textSecondary" style={styles.code}>
              {t('referralCode')}: {code}
            </Text>
          ) : null}
          <Text
            testID="text-partner-link"
            selectable
            variant="body"
            color="textSecondary"
            style={styles.link}
          >
            {link}
          </Text>
          <View style={styles.actions}>
            <Button
              testID="btn-copy-partner-link"
              title={copied ? tc('actions.copied') : t('copyLink')}
              variant="gold"
              onPress={() => void onCopy()}
            />
            <Button
              testID="btn-share-partner-link"
              title={t('shareLink')}
              variant="secondary"
              onPress={() => void onShare()}
            />
            <Button
              testID="btn-open-partner-link"
              title={t('openLink')}
              variant="secondary"
              onPress={() => void onOpen()}
            />
          </View>
        </>
      )}
      {copyError ? (
        <Text testID="text-partner-link-error" variant="caption" color="error" style={styles.error}>
          {copyError}
        </Text>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  code: { marginTop: spacing.md },
  link: { marginVertical: spacing.lg },
  actions: { gap: spacing.sm },
  error: { marginTop: spacing.md },
});
