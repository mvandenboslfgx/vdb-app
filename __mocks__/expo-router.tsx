/**
 * Manual mock for `expo-router`, automatically applied to every test file
 * (Jest resolves `<rootDir>/__mocks__/<module>` for node_modules packages
 * without needing an explicit `jest.mock('expo-router')` call).
 *
 * Screens under test typically only need `useRouter`, `useLocalSearchParams`
 * and `Link`. Each is a `jest.fn()` so individual tests can override return
 * values with `mockReturnValue`/`mockReturnValueOnce`.
 */
import React from 'react';
import { Pressable } from 'react-native';

export const routerMock = {
  push: jest.fn(),
  replace: jest.fn(),
  back: jest.fn(),
  canGoBack: jest.fn(() => true),
  setParams: jest.fn(),
};

export const useRouter = jest.fn(() => routerMock);

export const useLocalSearchParams = jest.fn(() => ({}));

export const useSegments = jest.fn(() => []);

export const usePathname = jest.fn(() => '/');

export const useFocusEffect = jest.fn((effect) => {
  React.useEffect(() => {
    const cleanup = effect();
    return typeof cleanup === 'function' ? cleanup : undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
});

interface LinkMockProps {
  children?: React.ReactNode;
  href: string;
  asChild?: boolean;
  onPress?: (event: unknown) => void;
  testID?: string;
  [key: string]: unknown;
}

export function Link({ children, href, asChild, onPress, testID, ...rest }: LinkMockProps) {
  const handlePress = (event: unknown) => {
    routerMock.push(href);
    onPress?.(event);
  };

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement<Record<string, unknown>>, {
      onPress: handlePress,
      testID,
      ...rest,
    });
  }

  return (
    <Pressable onPress={handlePress} testID={testID} {...rest}>
      {children}
    </Pressable>
  );
}

function ScreenStub() {
  return null;
}

export const Stack = { Screen: ScreenStub };
export const Tabs = { Screen: ScreenStub };
export const Redirect = () => null;

export const router = routerMock;
