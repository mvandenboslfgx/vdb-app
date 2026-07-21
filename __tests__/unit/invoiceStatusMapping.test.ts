import { mapInvoiceStatus } from '@/lib/mappers';

describe('mapInvoiceStatus', () => {
  it('maps DB issued to domain sent so checkout CTAs can render', () => {
    expect(mapInvoiceStatus('issued')).toBe('sent');
  });

  it('maps payable-adjacent statuses used by the detail screen', () => {
    expect(mapInvoiceStatus('partially_paid')).toBe('partially_paid');
    expect(mapInvoiceStatus('overdue')).toBe('overdue');
    expect(mapInvoiceStatus('paid')).toBe('paid');
  });
});
