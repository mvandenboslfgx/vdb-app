import backendContract from '../../contracts/backend-contract.json';
import { BACKEND_CONTRACT } from '@/config/backendContract';
import {
  mapMobileRpcToOwner,
  mapMobileTableToOwner,
  OWNER_RPCS,
  OWNER_TABLES,
} from '@/api/contract/ownerMapping';
import {
  RC3_OWNER_RPCS,
  RC3_OWNER_TABLES,
  RC3_UNSUPPORTED_LOGICAL_SURFACES,
  REQUIRED_RC3_TABLE_MAPPINGS,
} from '@/api/contract/ownerSurfaces';
import {
  mapPortalAppointment,
  mapPortalConversation,
  mapPortalMessage,
  mapPortalSupportReply,
  mapPortalSupportTicket,
} from '@/api/contract/portalMappers';
import { DomainError, fromSupabaseError } from '@/lib/errors';
import { requireLiveSupabase } from '@/api/repositories/_utils';
import { resolveCallerOrganizationId } from '@/api/repositories/_org';
import {
  bookSlot,
  listAvailableSlots,
  requestAppointment,
} from '@/api/repositories/appointmentsRepository';
import { listMessages as listConversationMessages } from '@/api/repositories/messagesRepository';
import {
  listMessages as listTicketReplies,
  replyTicket,
} from '@/api/repositories/supportRepository';

jest.mock('@/api/repositories/_utils', () => {
  const actual = jest.requireActual('@/api/repositories/_utils') as Record<string, unknown>;
  return {
    ...actual,
    shouldUseMockApi: jest.fn(() => false),
    requireLiveSupabase: jest.fn(),
  };
});

const mockFrom = jest.fn();
const mockRpc = jest.fn();
const mockGetUser = jest.fn();
const mockRequireLiveSupabase = requireLiveSupabase as jest.MockedFunction<
  typeof requireLiveSupabase
>;

function makeQuery(result: { data: unknown; error: null | { message: string; code?: string } }) {
  const thenable: Record<string, unknown> = {
    then(resolve: (v: unknown) => void) {
      resolve(result);
    },
  };
  for (const method of [
    'select',
    'order',
    'eq',
    'neq',
    'in',
    'is',
    'maybeSingle',
    'single',
    'insert',
    'update',
    'limit',
  ]) {
    thenable[method] = jest.fn(() => thenable);
  }
  return thenable;
}

function makeClient() {
  return { from: mockFrom, rpc: mockRpc, auth: { getUser: mockGetUser } } as never;
}

describe('rc.6 contract pin', () => {
  it('pins the JSON bundle and the TS pin module to the same rc.6 identity', () => {
    expect(backendContract.version).toBe('0.2.0-rc.6');
    expect(backendContract.schemaVersion).toBe('2026.07.29.partner-approval-aal2-rc6');
    expect(backendContract.packageId).toBe('vdb-backend-contract@0.2.0-rc.6');
    expect(backendContract.status).toBe('CONSUMER_PIN_OWNER_RC6');
    expect(backendContract.minimumCompatibleClientVersion).toBe('>=0.2.0-rc.6');
    expect(backendContract.version).toBe(BACKEND_CONTRACT.version);
    expect(backendContract.schemaVersion).toBe(BACKEND_CONTRACT.schemaVersion);
  });

  it('keeps messaging/support/appointments/payout feature flags fail-closed in the consumer pin', () => {
    expect(backendContract.featureFlags.messaging_realtime).toBe(false);
    expect(backendContract.featureFlags.support_internal_notes_rpc).toBe(false);
    expect(backendContract.featureFlags.appointments_booking).toBe(false);
    expect(backendContract.featureFlags.mollie_checkout).toBe(false);
    expect(backendContract.featureFlags.partner_payouts).toBe(false);
  });

  it('never embeds the production project ref', () => {
    expect(JSON.stringify(backendContract)).not.toContain('nhsrdnjfsxfikfbdmdfj');
  });

  it('lists the rc.3/rc.6 error codes needed by messaging/support/appointments/AAL2', () => {
    for (const code of [
      'FEATURE_DISABLED',
      'NOT_PARTICIPANT',
      'INTERNAL_LEAK_DENIED',
      'DOUBLE_BOOKING',
      'INVALID_TRANSITION',
      'IDEMPOTENCY_CONFLICT',
      'AUTH_REQUIRED',
      'AUTH_NO_ACCESS',
      'CONFLICT',
      'VALIDATION_FAILED',
      'AAL2_REQUIRED',
    ]) {
      expect(backendContract.errorCodes).toContain(code);
    }
    // Existing Mobile codes must still be present.
    expect(backendContract.errorCodes).toContain('CONFIGURATION_ERROR');
    expect(backendContract.errorCodes).toContain('CONTRACT_DRIFT');
  });
});

describe('rc.3 owner surfaces allowlist', () => {
  it('no longer treats conversations/messages/appointments/support as unsupported', () => {
    for (const surface of [
      'conversations',
      'messages',
      'appointments',
      'support_tickets',
      'support_ticket_messages',
    ]) {
      expect(RC3_UNSUPPORTED_LOGICAL_SURFACES as readonly string[]).not.toContain(surface);
    }
  });

  it('still treats availability_slots and other unimplemented surfaces as unsupported', () => {
    for (const surface of [
      'availability_slots',
      'project_milestones',
      'user_roles',
      'payment_events',
    ]) {
      expect(RC3_UNSUPPORTED_LOGICAL_SURFACES as readonly string[]).toContain(surface);
    }
  });

  it('allowlists all rc.3 portal_* messaging/support/appointments tables', () => {
    for (const table of [
      'portal_conversations',
      'portal_conversation_participants',
      'portal_messages',
      'portal_message_attachments',
      'portal_support_tickets',
      'portal_support_replies',
      'portal_appointments',
      'portal_appointment_participants',
    ]) {
      expect(RC3_OWNER_TABLES.has(table)).toBe(true);
    }
  });

  it('allowlists all rc.3 messaging/support/appointments RPCs', () => {
    for (const rpc of Object.values(OWNER_RPCS)) {
      expect(RC3_OWNER_RPCS.has(rpc)).toBe(true);
    }
  });

  it('exposes REQUIRED_RC3_TABLE_MAPPINGS for the proven messaging/support/appointments tables', () => {
    expect(REQUIRED_RC3_TABLE_MAPPINGS.conversations).toBe('portal_conversations');
    expect(REQUIRED_RC3_TABLE_MAPPINGS.messages).toBe('portal_messages');
    expect(REQUIRED_RC3_TABLE_MAPPINGS.support_tickets).toBe('portal_support_tickets');
    expect(REQUIRED_RC3_TABLE_MAPPINGS.support_ticket_messages).toBe('portal_support_replies');
    expect(REQUIRED_RC3_TABLE_MAPPINGS.appointments).toBe('portal_appointments');
  });
});

describe('rc.3 mobile -> owner RPC mapping', () => {
  it('maps book_appointment_slot / cancel_appointment / admin_reply_support_ticket', () => {
    expect(mapMobileRpcToOwner('book_appointment_slot')).toBe(OWNER_RPCS.bookAppointment);
    expect(mapMobileRpcToOwner('cancel_appointment')).toBe(OWNER_RPCS.cancelAppointment);
    expect(mapMobileRpcToOwner('admin_reply_support_ticket')).toBe(OWNER_RPCS.replySupportTicket);
    expect(mapMobileRpcToOwner('admin_assign_ticket')).toBe(OWNER_RPCS.assignSupportTicket);
    expect(mapMobileRpcToOwner('admin_update_ticket_status')).toBe(
      OWNER_RPCS.transitionSupportTicket,
    );
  });

  it('maps conversations/messages tables', () => {
    expect(mapMobileTableToOwner('conversations')).toBe(OWNER_TABLES.conversations);
    expect(mapMobileTableToOwner('messages')).toBe(OWNER_TABLES.messages);
    expect(mapMobileTableToOwner('appointments')).toBe(OWNER_TABLES.appointments);
  });
});

describe('rc.3 portal mappers', () => {
  it('mapPortalConversation: title=subject, lastMessagePreview null, unreadCount from opts', () => {
    const conversation = mapPortalConversation({
      id: 'conv-1',
      organization_id: 'org1',
      project_id: null,
      subject: 'Support thread',
      last_message_at: null,
      conversation_type: 'SUPPORT',
      deleted_at: null,
      created_at: '2026-07-01T00:00:00Z',
      updated_at: '2026-07-01T00:00:00Z',
    });
    expect(conversation.title).toBe('Support thread');
    expect(conversation.lastMessagePreview).toBeNull();
    expect(conversation.unreadCount).toBe(0);

    const withUnread = mapPortalConversation(
      {
        id: 'conv-2',
        organization_id: 'org1',
        project_id: null,
        subject: null,
        last_message_at: null,
        conversation_type: 'PROJECT',
        deleted_at: null,
        created_at: '2026-07-01T00:00:00Z',
        updated_at: '2026-07-01T00:00:00Z',
      },
      { unreadCount: 5, lastReadAt: '2026-07-01T00:00:00Z' },
    );
    expect(withUnread.unreadCount).toBe(5);
    expect(withUnread.title).toBe('Conversation');
  });

  it('mapPortalMessage: senderId=author_user_id, deliveryStatus sent', () => {
    const message = mapPortalMessage({
      id: 'msg-1',
      conversation_id: 'conv-1',
      author_user_id: 'user-42',
      body: 'Hi!',
      is_internal: false,
      created_at: '2026-07-01T00:00:00Z',
    });
    expect(message.senderId).toBe('user-42');
    expect(message.deliveryStatus).toBe('sent');
    expect(message.body).toBe('Hi!');
  });

  it('mapPortalSupportTicket: maps all rc.3 statuses and normalizes priority', () => {
    const statuses: Array<[string, string]> = [
      ['NEW', 'new'],
      ['OPEN', 'open'],
      ['IN_PROGRESS', 'in_progress'],
      ['WAITING_FOR_CUSTOMER', 'waiting_for_customer'],
      ['RESOLVED', 'resolved'],
      ['CLOSED', 'closed'],
    ];
    for (const [portalStatus, expected] of statuses) {
      const ticket = mapPortalSupportTicket({
        id: 't1',
        organization_id: 'org1',
        subject: 'Subject',
        description: 'Desc',
        category: 'billing',
        priority: 'medium',
        status: portalStatus,
        created_by: 'user-1',
        created_at: '2026-07-01T00:00:00Z',
        updated_at: '2026-07-01T00:00:00Z',
      });
      expect(ticket.status).toBe(expected);
    }

    const fallbackPriority = mapPortalSupportTicket({
      id: 't2',
      organization_id: 'org1',
      subject: 'Subject',
      description: 'Desc',
      category: 'billing',
      priority: 'not-a-real-priority',
      status: 'NEW',
      created_by: 'user-1',
      created_at: '2026-07-01T00:00:00Z',
      updated_at: '2026-07-01T00:00:00Z',
    });
    expect(fallbackPriority.priority).toBe('medium');
  });

  it('mapPortalSupportReply: isInternal from is_internal', () => {
    const publicReply = mapPortalSupportReply({
      id: 'r1',
      ticket_id: 't1',
      author_user_id: 'staff-1',
      body: 'Public reply',
      is_internal: false,
      created_at: '2026-07-01T00:00:00Z',
    });
    expect(publicReply.isInternal).toBe(false);

    const internalReply = mapPortalSupportReply({
      id: 'r2',
      ticket_id: 't1',
      author_user_id: 'staff-1',
      body: 'Internal only',
      is_internal: true,
      created_at: '2026-07-01T00:00:00Z',
    });
    expect(internalReply.isInternal).toBe(true);
  });

  it('mapPortalAppointment: maps all rc.3 statuses', () => {
    const statuses: Array<[string, string]> = [
      ['SCHEDULED', 'requested'],
      ['CONFIRMED', 'confirmed'],
      ['RESCHEDULED', 'rescheduled'],
      ['CANCELLED', 'cancelled'],
      ['COMPLETED', 'completed'],
      ['NO_SHOW', 'no_show'],
    ];
    for (const [portalStatus, expected] of statuses) {
      const appointment = mapPortalAppointment({
        id: 'a1',
        organization_id: 'org1',
        title: 'Call',
        starts_at: '2026-08-01T09:00:00Z',
        ends_at: '2026-08-01T09:30:00Z',
        status: portalStatus,
        location: null,
        created_at: '2026-07-01T00:00:00Z',
        updated_at: '2026-07-01T00:00:00Z',
      });
      expect(appointment.status).toBe(expected);
    }
  });
});

describe('fromSupabaseError rc.3 RPC exception mapping', () => {
  it.each([
    ['FEATURE_DISABLED:appointments_booking', 'CONFIGURATION'],
    ['NOT_PARTICIPANT: caller is not in this conversation', 'FORBIDDEN'],
    ['DOUBLE_BOOKING: slot already taken', 'VALIDATION'],
    ['INTERNAL_LEAK_DENIED', 'FORBIDDEN'],
    ['INVALID_TRANSITION: cannot reopen a closed ticket', 'VALIDATION'],
    ['IDEMPOTENCY_CONFLICT: retry with a different key', 'VALIDATION'],
    ['AUTH_REQUIRED', 'UNAUTHORIZED'],
    ['AUTH_NO_ACCESS:organization_members', 'FORBIDDEN'],
    ['VALIDATION_FAILED: body is required', 'VALIDATION'],
    ['CONFLICT: version mismatch', 'VALIDATION'],
  ] as const)('maps message %s to DomainError code %s', (message, expectedCode) => {
    const error = fromSupabaseError({ message });
    expect(error.code).toBe(expectedCode);
  });
});

describe('messagesRepository / supportRepository defense-in-depth is_internal filtering', () => {
  beforeEach(() => {
    mockFrom.mockReset();
    mockRpc.mockReset();
    mockGetUser.mockReset();
    mockRequireLiveSupabase.mockReset();
  });

  it('listMessages (messages) filters is_internal=false', async () => {
    const client = makeClient();
    mockRequireLiveSupabase.mockReturnValue(client);
    const query = makeQuery({ data: [], error: null });
    mockFrom.mockReturnValue(query);

    await listConversationMessages('conv-1');
    expect(mockFrom).toHaveBeenCalledWith('portal_messages');
    expect(query.eq).toHaveBeenCalledWith('is_internal', false);
  });

  it('supportRepository listMessages (replies) uses RC5 replies RPC and drops internals', async () => {
    const client = makeClient();
    mockRequireLiveSupabase.mockReturnValue(client);
    mockRpc.mockReturnValue(
      makeQuery({
        data: {
          schema_version: BACKEND_CONTRACT.schemaVersion,
          items: [
            {
              id: 'r1',
              ticket_id: 'ticket-1',
              body: 'public',
              is_internal: false,
              created_at: '2026-07-29T00:00:00Z',
              author_user_id: 'u1',
            },
            {
              id: 'r2',
              ticket_id: 'ticket-1',
              body: 'secret',
              is_internal: true,
              created_at: '2026-07-29T00:01:00Z',
              author_user_id: 'staff-1',
            },
          ],
          next_cursor: null,
        },
        error: null,
      }),
    );

    const rows = await listTicketReplies('ticket-1');
    expect(mockRpc).toHaveBeenCalledWith(
      'list_portal_support_ticket_replies',
      expect.objectContaining({ p_ticket_id: 'ticket-1' }),
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]?.body).toBe('public');
    expect(rows.every((r) => r.isInternal === false)).toBe(true);
  });

  it('supportRepository never calls an internal-note RPC from customer flows', async () => {
    const client = makeClient();
    mockRequireLiveSupabase.mockReturnValue(client);
    mockRpc.mockReturnValue(makeQuery({ data: null, error: null }));

    await replyTicket('ticket-1', 'Thanks for reaching out');
    expect(mockRpc).toHaveBeenCalledWith(
      'reply_portal_support_ticket',
      expect.objectContaining({ p_ticket_id: 'ticket-1' }),
    );
    const calledRpcNames = mockRpc.mock.calls.map((call) => call[0]);
    expect(calledRpcNames).not.toContain('add_portal_support_internal_note');
  });
});

describe('appointmentsRepository rc.3 behaviour', () => {
  beforeEach(() => {
    mockFrom.mockReset();
    mockRpc.mockReset();
    mockGetUser.mockReset();
    mockRequireLiveSupabase.mockReset();
  });

  it('listAvailableSlots always returns [] without querying a non-existent table', async () => {
    const slots = await listAvailableSlots();
    expect(slots).toEqual([]);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('bookSlot (legacy slotId API) surfaces FEATURE_DISABLED as a configuration error, never crashes', async () => {
    await expect(bookSlot({ slotId: 'slot-1', title: 'Kickoff' })).rejects.toMatchObject({
      code: 'CONFIGURATION',
      message: expect.stringContaining('FEATURE_DISABLED'),
    });
  });

  it('requestAppointment resolves the org then calls book_portal_appointment', async () => {
    const client = makeClient();
    mockRequireLiveSupabase.mockReturnValue(client);
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
    mockFrom.mockReturnValue(makeQuery({ data: { organization_id: 'org-1' }, error: null }));
    mockRpc.mockReturnValue(
      makeQuery({
        data: {
          id: 'appt-1',
          organization_id: 'org-1',
          title: 'Kickoff',
          starts_at: '2026-08-01T09:00:00Z',
          ends_at: '2026-08-01T09:30:00Z',
          status: 'SCHEDULED',
          location: null,
          created_at: '2026-08-01T00:00:00Z',
          updated_at: '2026-08-01T00:00:00Z',
        },
        error: null,
      }),
    );

    const appointment = await requestAppointment({
      title: 'Kickoff',
      startsAt: '2026-08-01T09:00:00Z',
      endsAt: '2026-08-01T09:30:00Z',
    });

    expect(mockRpc).toHaveBeenCalledWith(
      'book_portal_appointment',
      expect.objectContaining({ p_organization_id: 'org-1', p_title: 'Kickoff' }),
    );
    expect(appointment.status).toBe('requested');
  });

  it('requestAppointment surfaces FEATURE_DISABLED cleanly when the flag is off', async () => {
    const client = makeClient();
    mockRequireLiveSupabase.mockReturnValue(client);
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
    mockFrom.mockReturnValue(makeQuery({ data: { organization_id: 'org-1' }, error: null }));
    mockRpc.mockReturnValue(
      makeQuery({ data: null, error: { message: 'FEATURE_DISABLED:appointments_booking' } }),
    );

    await expect(
      requestAppointment({
        title: 'Kickoff',
        startsAt: '2026-08-01T09:00:00Z',
        endsAt: '2026-08-01T09:30:00Z',
      }),
    ).rejects.toMatchObject({ code: 'CONFIGURATION' });
  });
});

describe('resolveCallerOrganizationId', () => {
  beforeEach(() => {
    mockFrom.mockReset();
    mockRpc.mockReset();
    mockGetUser.mockReset();
  });

  it('fails closed when there is no session', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    const client = makeClient();
    await expect(resolveCallerOrganizationId(client)).rejects.toMatchObject({
      code: 'UNAUTHORIZED',
    });
  });

  it('fails closed when the caller has no organization_members row', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
    mockFrom.mockReturnValue(makeQuery({ data: null, error: null }));
    const client = makeClient();
    await expect(resolveCallerOrganizationId(client)).rejects.toMatchObject({
      code: 'CONFIGURATION',
    });
  });

  it('resolves the organization id from organization_members', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
    mockFrom.mockReturnValue(makeQuery({ data: { organization_id: 'org-9' }, error: null }));
    const client = makeClient();
    await expect(resolveCallerOrganizationId(client)).resolves.toBe('org-9');
  });
});

describe('DomainError instances are never thrown as bare errors', () => {
  it('DomainError is not wrapped twice by fromSupabaseError', () => {
    const original = DomainError.configuration('FEATURE_DISABLED:appointments_booking');
    expect(fromSupabaseError(original)).toBe(original);
  });
});
