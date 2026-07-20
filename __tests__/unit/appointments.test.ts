import { reserveSlot, reserveSlotExclusive } from '@/domain/appointments';

describe('appointment slot locking', () => {
  it('reserves when capacity remains', () => {
    const result = reserveSlot({ id: 's1', capacity: 1, reservedCount: 0 });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.slot.reservedCount).toBe(1);
  });

  it('rejects when full', () => {
    const result = reserveSlot({ id: 's1', capacity: 1, reservedCount: 1 });
    expect(result).toEqual({ ok: false, reason: 'full' });
  });

  it('allows exactly one success under concurrent exclusive attempts', () => {
    const shared = { slot: { id: 's1', capacity: 1, reservedCount: 0 } };
    const outcome = reserveSlotExclusive(shared, 2);
    expect(outcome.successes).toBe(1);
    expect(outcome.failures).toBe(1);
    expect(shared.slot.reservedCount).toBe(1);
  });
});
