import React from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
  type ScrollViewProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { OfflineBanner } from '@/design-system/OfflineBanner';
import { colors, spacing } from '@/theme';

export interface ScreenProps {
  children: React.ReactNode;
  scroll?: boolean;
  padded?: boolean;
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  scrollProps?: Omit<ScrollViewProps, 'contentContainerStyle' | 'children'>;
  edges?: ('top' | 'right' | 'bottom' | 'left')[];
  showOfflineBanner?: boolean;
}

export function Screen({
  children,
  scroll = false,
  padded = true,
  style,
  contentContainerStyle,
  scrollProps,
  edges = ['top', 'left', 'right'],
  showOfflineBanner = true,
}: ScreenProps) {
  const paddingStyle = padded ? styles.padded : null;

  return (
    <SafeAreaView style={[styles.safe, style]} edges={edges}>
      {showOfflineBanner ? <OfflineBanner /> : null}
      {scroll ? (
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[styles.scrollContent, paddingStyle, contentContainerStyle]}
          {...scrollProps}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.body, paddingStyle, contentContainerStyle]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.backgroundPrimary,
  },
  body: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: spacing['4xl'],
  },
  padded: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
});
