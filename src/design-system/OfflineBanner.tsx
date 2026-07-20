import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import Animated, { FadeInDown, FadeOutUp } from 'react-native-reanimated';

import { Text } from '@/design-system/Text';
import { useNetwork } from '@/providers/NetworkProvider';
import { colors, spacing } from '@/theme';

export function OfflineBanner() {
  const { isConnected } = useNetwork();
  const { t } = useTranslation('common');

  if (isConnected) {
    return null;
  }

  return (
    <Animated.View entering={FadeInDown} exiting={FadeOutUp} style={styles.banner}>
      <View>
        <Text variant="label" weight="semibold" color="warning">
          {t('offline.title')}
        </Text>
        <Text variant="caption" color="textSecondary">
          {t('offline.description')}
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: colors.warningMuted,
    borderBottomWidth: 1,
    borderBottomColor: colors.warning,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
});
