/**
 * Decide when authenticated data caches must be wiped.
 * Prevents previous-user rows from flashing after logout or account switch.
 */
export function shouldClearQueryCacheOnSessionChange(
  previousUserId: string | null | undefined,
  nextUserId: string | null | undefined,
): boolean {
  const prev = previousUserId ?? null;
  const next = nextUserId ?? null;
  if (!next) return true;
  if (prev && prev !== next) return true;
  return false;
}
