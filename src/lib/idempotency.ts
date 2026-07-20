/**
 * Create a client-side idempotency key for payment / mutation retries.
 * Prefer crypto.randomUUID when available; fall back to a time+random token.
 */
export function createIdempotencyKey(prefix = 'idem'): string {
  const uuid =
    typeof globalThis.crypto?.randomUUID === 'function'
      ? globalThis.crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
  return `${prefix}_${uuid}`;
}
