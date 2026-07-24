import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { StatusPill } from '@/design-system/StatusPill';
import { Text } from '@/design-system/Text';
import { formatRelative } from '@/lib/format';
import { colors, radii, spacing, typography } from '@/theme';

export interface ProjectSummaryCardProps {
  title: string;
  description?: string | null;
  statusLabel: string;
  progressPercent: number;
  nextAction?: string | null;
  lastUpdated?: string | null;
  onPress: () => void;
  testID?: string;
}

export function ProjectSummaryCard({
  title,
  description,
  statusLabel,
  progressPercent,
  nextAction,
  lastUpdated,
  onPress,
  testID,
}: ProjectSummaryCardProps) {
  const clamped = Math.max(0, Math.min(100, progressPercent));
  const updatedLabel = lastUpdated ? formatRelative(lastUpdated) : null;

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${statusLabel}. ${clamped}%. ${nextAction ?? ''}`}
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.top}>
        <View style={styles.titleCol}>
          <Text style={styles.cardTitle} weight="semibold" numberOfLines={2}>
            {title}
          </Text>
          {description ? (
            <Text variant="caption" color="textSecondary" numberOfLines={2}>
              {description}
            </Text>
          ) : null}
        </View>
        <MaterialCommunityIcons name="chevron-right" size={20} color={colors.textMuted} />
      </View>

      <View style={styles.badgeRow}>
        <StatusPill label={statusLabel} tone="gold" />
      </View>

      <View style={styles.progressBlock}>
        <View style={styles.progressMeta}>
          <Text variant="caption" color="textMuted">
            {clamped}%
          </Text>
        </View>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${clamped}%` }]} />
        </View>
      </View>

      {nextAction ? (
        <Text variant="caption" color="textSecondary" numberOfLines={1}>
          {nextAction}
        </Text>
      ) : null}
      {updatedLabel ? (
        <Text variant="caption" color="textMuted" numberOfLines={1}>
          {updatedLabel}
        </Text>
      ) : null}
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
    gap: spacing.sm,
  },
  titleCol: {
    flex: 1,
    gap: 4,
  },
  cardTitle: {
    fontSize: typography.size.lg,
    lineHeight: typography.size.lg * typography.lineHeight.normal,
    color: colors.textPrimary,
  },
  badgeRow: {
    flexDirection: 'row',
  },
  progressBlock: {
    gap: spacing.xs,
  },
  progressMeta: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  track: {
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.borderSubtle,
    overflow: 'hidden',
  },
  fill: {
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.champagneGold,
  },
});
