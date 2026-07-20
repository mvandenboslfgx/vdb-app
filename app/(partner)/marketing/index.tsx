import * as Clipboard from 'expo-clipboard';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';

import { getPartnerLink } from '@/api/repositories/partnersRepository';
import { Button, LoadingState, Screen, Text } from '@/design-system';
import { spacing } from '@/theme';

export default function MarketingScreen() {
  const { t } = useTranslation('partners');
  const { t: tc } = useTranslation('common');
  const [link, setLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setLink(await getPartnerLink());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) return <LoadingState />;

  return (
    <Screen scroll>
      <Text variant="title">{t('link')}</Text>
      <Text variant="body" color="textSecondary" style={styles.link}>
        {link}
      </Text>
      <Button
        title={copied ? tc('actions.copied') : t('copyLink')}
        variant="gold"
        onPress={() => {
          void Clipboard.setStringAsync(link).then(() => setCopied(true));
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  link: { marginVertical: spacing.xl },
});
