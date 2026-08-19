/**
 * Normalize controlled TextInput values after native/IME/Maestro edits.
 * Prevents `undefined` leaking into React state when nativeEvent.text is absent.
 */
export function syncControlledFieldValue(
  current: string,
  nativeText: string | undefined | null,
): string {
  if (typeof nativeText === 'string') {
    return nativeText;
  }
  return current ?? '';
}
