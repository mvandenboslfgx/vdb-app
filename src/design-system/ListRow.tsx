import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Card } from '@/design-system/Card';
import { Text } from '@/design-system/Text';
import { spacing } from '@/theme';

export interface ListRowProps {
  title: string;
  subtitle?: string;
  meta?: string;
  left?: React.ReactNode;
  right?: React.ReactNode;
  onPress?: () => void;
  testID?: string;
}

export function ListRow({ title, subtitle, meta, left, right, onPress, testID }: ListRowProps) {
  return (
    <Card testID={testID} onPress={onPress} style={styles.card}>
      <View style={styles.row}>
        {left ? <View style={styles.left}>{left}</View> : null}
        <View style={styles.content}>
          <Text variant="body" weight="medium" numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? (
            <Text variant="caption" color="textSecondary" numberOfLines={2}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        <View style={styles.trailing}>
          {meta ? (
            <Text variant="caption" color="textMuted">
              {meta}
            </Text>
          ) : null}
          {right}
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    paddingVertical: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  left: {
    marginRight: spacing.xs,
  },
  content: {
    flex: 1,
    gap: spacing.xxs,
  },
  trailing: {
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
});
