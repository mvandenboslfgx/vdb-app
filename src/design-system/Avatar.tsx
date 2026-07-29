import React from 'react';
import { Image, StyleSheet, View } from 'react-native';

import { Text } from '@/design-system/Text';
import { colors } from '@/theme';

export interface AvatarProps {
  name: string;
  uri?: string | null;
  size?: number;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ''}${parts[1]![0] ?? ''}`.toUpperCase();
}

export function Avatar({ name, uri, size = 40 }: AvatarProps) {
  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
        accessibilityLabel={name}
      />
    );
  }

  return (
    <View
      style={[styles.fallback, { width: size, height: size, borderRadius: size / 2 }]}
      accessibilityLabel={name}
    >
      <Text variant="label" weight="semibold" color="champagneGoldLight">
        {initials(name)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
});
