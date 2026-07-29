import { allowedLeadActions, canLeadAction, leadActionRequiresReason } from '@/lib/leadTransitions';
import { nextPrimaryTicketActions, toOwnerTicketStatus } from '@/lib/ticketTransitions';

describe('leadTransitions', () => {
  it('blocks actions on final states', () => {
    expect(allowedLeadActions('converted')).toEqual([]);
    expect(canLeadAction('new', 'contacted')).toBe(true);
    expect(canLeadAction('new', 'convert')).toBe(false);
    expect(leadActionRequiresReason('rejected')).toBe(true);
  });
});

describe('ticketTransitions', () => {
  it('maps waiting_on_customer to owner WAITING_FOR_CUSTOMER', () => {
    expect(toOwnerTicketStatus('waiting_on_customer')).toBe('WAITING_FOR_CUSTOMER');
    expect(toOwnerTicketStatus('in_progress')).toBe('IN_PROGRESS');
  });

  it('returns a primary next action', () => {
    expect(nextPrimaryTicketActions('open')[0]).toBe('in_progress');
    expect(nextPrimaryTicketActions('resolved')).toContain('closed');
  });
});
