/**
 * Global Jest setup for component + unit tests.
 *
 * Keep this file defensive: repositories/providers used by screens are meant
 * to be mocked per-test (see __tests__/test-utils.tsx). What lives here is
 * only the low-level native/module shimming needed so React Native Testing
 * Library can render screens at all.
 */

// Reanimated 4 splits its native module into `react-native-worklets`.
// `react-native-reanimated/mock` still eagerly requires the *real* package
// entrypoint (for type re-exports), which in turn loads the real Worklets
// native module and crashes outside a real app runtime. Mocking
// `react-native-worklets` first (with its own official mock) short-circuits
// that chain so Reanimated's mock can load cleanly.
jest.mock('react-native-worklets', () => require('react-native-worklets/lib/module/mock'));

// react-native-reanimated ships an official jest mock; without it, hooks like
// useSharedValue/useAnimatedStyle used by Button/LoadingState/OfflineBanner
// throw in the JS (non-worklet) test environment.
jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));

// Never touch the real keychain/keystore in tests.
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => undefined),
  deleteItemAsync: jest.fn(async () => undefined),
}));

jest.mock('expo-web-browser', () => ({
  openBrowserAsync: jest.fn(async () => ({ type: 'dismiss' })),
}));

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(async () => undefined),
  notificationAsync: jest.fn(async () => undefined),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// NetworkProvider optionally requires netinfo at runtime; its real native
// module isn't linked in the Jest environment, so addEventListener would
// throw while computing initial connectivity state.
jest.mock('@react-native-community/netinfo', () => ({
  __esModule: true,
  default: {
    addEventListener: jest.fn(() => () => undefined),
    fetch: jest.fn(async () => ({ isConnected: true, isInternetReachable: true })),
    configure: jest.fn(),
  },
}));

// Avoid noisy act()/animation warnings unrelated to what a given test is
// asserting; real failures still surface via thrown errors/expect() calls.
const originalConsoleError = console.error;
// eslint-disable-next-line no-console
console.error = (...args) => {
  const [first] = args;
  if (typeof first === 'string' && first.includes('useNativeDriver')) {
    return;
  }
  originalConsoleError(...args);
};
