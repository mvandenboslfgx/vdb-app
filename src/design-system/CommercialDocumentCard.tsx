import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { StatusPill } from '@/design-system/StatusPill';
import { Text } from '@/design-system/Text';
import { colors, radii, spacing } from '@/theme';

export interface CommercialDocumentCardProps {
  kind: 'quote' | 'invoice';
  title: string;
  reference?: string | null;
  amount: string;
  statusLabel: string;
  meta?: string | null;
  actionLabel?: string;
  onPress: () => void;
  testID?: string;
}

export function CommercialDocumentCard({
  kind,
  title,
  reference,
  amount,
  statusLabel,
  meta,
  actionLabel,
  onPress,
  testID,
}: CommercialDocumentCardProps) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${amount}. ${statusLabel}`}
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.top}>
        <View style={styles.titleCol}>
          <Text style={styles.cardTitle} weight="semibold" numberOfLines={2}>
            {title}
          </Text>
          {reference ? (
            <Text variant="caption" color="textMuted" numberOfLines={1}>
              {reference}
            </Text>
          ) : null}
        </View>
        <Text variant="label" weight="semibold" color="textPrimary">
          {amount}
        </Text>
      </View>

      <View style={styles.footer}>
        <StatusPill label={statusLabel} tone={kind === 'invoice' ? 'warning' : 'info'} />
        <View style={styles.action}>
          {meta ? (
            <Text variant="caption" color="textSecondary" numberOfLines={1}>
              {meta}
            </Text>
          ) : null}
          <View style={styles.actionRow}>
            {actionLabel ? (
              <Text variant="caption" color="champagneGold" weight="medium">
                {actionLabel}
              </Text>
            ) : null}
            <MaterialCommunityIcons name="chevron-right" size={18} color={colors.champagneGold} />
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfacePrimary,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: radii.xl,
    padding: spacing.xl,
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  pressed: {
    opacity: 0.9,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  titleCol: {
    flex: 1,
    gap: 4,
  },
  cardTitle: {
    fontSize: 17,
    lineHeight: 22,
    color: colors.textPrimary,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  action: {
    alignItems: 'flex-end',
    gap: 2,
    flexShrink: 1,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
});
