/**
 * Transactional appointment slot reservation helpers.
 * Two concurrent reserves against capacity 1 → exactly one success.
 */

export interface AvailabilitySlot {
  id: string;
  capacity: number;
  reservedCount: number;
}

export type ReserveResult =
  | { ok: true; slot: AvailabilitySlot }
  | { ok: false; reason: 'full' | 'invalid' };

export function reserveSlot(slot: AvailabilitySlot): ReserveResult {
  if (slot.capacity <= 0 || slot.reservedCount < 0) {
    return { ok: false, reason: 'invalid' };
  }
  if (slot.reservedCount >= slot.capacity) {
    return { ok: false, reason: 'full' };
  }
  return {
    ok: true,
    slot: { ...slot, reservedCount: slot.reservedCount + 1 },
  };
}

/** Deterministic race simulation for tests: first caller wins. */
export function reserveSlotExclusive(
  shared: { slot: AvailabilitySlot },
  attempts: number,
): { successes: number; failures: number } {
  let successes = 0;
  let failures = 0;
  for (let i = 0; i < attempts; i += 1) {
    const result = reserveSlot(shared.slot);
    if (result.ok) {
      shared.slot = result.slot;
      successes += 1;
    } else {
      failures += 1;
    }
  }
  return { successes, failures };
}
