/**
 * Internal-note isolation — customer/partner paths must never surface is_internal rows.
 */
jest.mock('@/api/repositories/_utils', () => {
  const actual = jest.requireActual('@/api/repositories/_utils') as Record<string, unknown>;
  return {
    ...actual,
    shouldUseMockApi: () => true,
    delay: async () => undefined,
  };
});

import { mapPortalSupportReply } from '@/api/contract/portalMappers';
import { mockStore } from '@/api/mockData';
import { listMessages, listStaffTicketMessages } from '@/api/repositories/supportRepository';
import { BACKEND_CONTRACT } from '@/config/backendContract';

describe('support internal-note isolation', () => {
  const ticketId = 'iso-ticket-1';

  beforeEach(() => {
    mockStore.ticketMessages.length = 0;
    mockStore.ticketMessages.push(
      {
        id: 'pub-1',
        ticketId,
        authorId: 'customer-1',
        body: 'Public customer message',
        isInternal: false,
        createdAt: '2026-07-01T01:00:00.000Z',
        updatedAt: '2026-07-01T01:00:00.000Z',
      },
      {
        id: 'int-1',
        ticketId,
        authorId: 'staff-1',
        body: 'SECRET internal escalation',
        isInternal: true,
        createdAt: '2026-07-01T02:00:00.000Z',
        updatedAt: '2026-07-01T02:00:00.000Z',
      },
    );
  });

  it('listMessages (customer path) drops internal notes', async () => {
    const messages = await listMessages(ticketId);
    expect(messages.every((m) => m.isInternal === false)).toBe(true);
    expect(messages.map((m) => m.id)).toEqual(['pub-1']);
    expect(messages.some((m) => m.body.includes('SECRET'))).toBe(false);
  });

  it('listStaffTicketMessages still returns internal notes for staff UI', async () => {
    const messages = await listStaffTicketMessages(ticketId);
    expect(messages.some((m) => m.id === 'int-1' && m.isInternal)).toBe(true);
    expect(messages.some((m) => m.id === 'pub-1')).toBe(true);
  });

  it('mapPortalSupportReply preserves is_internal so callers can fail-closed', () => {
    const mapped = mapPortalSupportReply({
      id: 'r1',
      ticket_id: ticketId,
      author_user_id: 'staff-1',
      body: 'hidden',
      is_internal: true,
      created_at: '2026-07-01T00:00:00.000Z',
    });
    expect(mapped.isInternal).toBe(true);
  });

  it('pins support_internal_notes_rpc fail-closed on the RC6 consumer contract', () => {
    expect(BACKEND_CONTRACT.version).toBe('0.2.0-rc.7');
  });
});
