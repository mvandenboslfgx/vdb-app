/**
 * Shared render helper for component tests.
 *
 * Wraps a screen with the minimum set of *real* providers it needs to render
 * (i18n, safe area, network, feature flags). Auth is intentionally NOT
 * wrapped here — screens that call `useAuth()` should `jest.mock('@/providers/AuthProvider')`
 * directly so each test can control the signed-in user/actions precisely.
 */
import { render, type RenderOptions } from '@testing-library/react-native';
import React, { type ReactElement } from 'react';
import { I18nextProvider } from 'react-i18next';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { i18n, initI18n } from '@/i18n';
import { FeatureFlagsProvider } from '@/providers/FeatureFlagsProvider';
import { NetworkProvider } from '@/providers/NetworkProvider';

initI18n('en');

// The real `initialWindowMetrics` export is only populated by the native
// module at runtime; in Jest it's `null`, which leaves SafeAreaProvider
// waiting on an onLayout measurement that the test renderer never fires.
// Supplying fixed metrics makes children render synchronously.
const TEST_SAFE_AREA_METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

function AllProviders({ children }: { children: React.ReactNode }) {
  return (
    <SafeAreaProvider initialMetrics={TEST_SAFE_AREA_METRICS}>
      <I18nextProvider i18n={i18n}>
        <NetworkProvider>
          <FeatureFlagsProvider>{children}</FeatureFlagsProvider>
        </NetworkProvider>
      </I18nextProvider>
    </SafeAreaProvider>
  );
}

/**
 * RNTL's `render` is asynchronous (it wraps the initial render in `act`).
 * Always `await renderWithProviders(...)` so `screen` queries are ready.
 */
export function renderWithProviders(ui: ReactElement, options?: RenderOptions) {
  return render(ui, { wrapper: AllProviders, ...options });
}

export * from '@testing-library/react-native';
