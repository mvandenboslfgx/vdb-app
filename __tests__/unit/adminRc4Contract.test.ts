import { BACKEND_CONTRACT } from '@/config/backendContract';
import {
  mapAdminDashboardStats,
  mapAdminQueueItem,
  mapAdminWorkQueue,
} from '@/api/contract/adminRc4Mappers';
import { REQUIRED_RC4_ADMIN_RPCS, RC4_OWNER_RPCS } from '@/api/contract/ownerSurfaces';
import { OWNER_RPCS } from '@/api/contract/ownerMapping';
import backendContract from '../../contracts/backend-contract.json';

describe('RC4 admin control surface contract', () => {
  it('allowlists Owner RC4 admin RPCs', () => {
    for (const name of Object.values(REQUIRED_RC4_ADMIN_RPCS)) {
      expect(RC4_OWNER_RPCS.has(name)).toBe(true);
    }
    expect(OWNER_RPCS.transitionSupportTicket).toBe('transition_portal_support_ticket_status');
    expect(backendContract.rpcNames.required).toContain('admin_dashboard_stats');
    expect(backendContract.rpcNames.required).toContain('admin_work_queue');
    expect(backendContract.rpcNames.required).toContain('approve_partner_commission');
    expect(backendContract.rpcNames.mobileClientRpcMapping.admin_update_ticket_status).toBe(
      'transition_portal_support_ticket_status',
    );
  });

  it('maps dashboard stats and rejects schema drift', () => {
    const stats = mapAdminDashboardStats({
      open_partner_applications: 2,
      open_tickets: 1,
      commissions_under_review: 3,
      payout_requests: 4,
      unread_messages: 0,
      documents_pending_review: 0,
      upcoming_appointments: 1,
      schema_version: BACKEND_CONTRACT.schemaVersion,
    });
    expect(stats.openPartnerApplications).toBe(2);
    expect(stats.payoutRequests).toBe(4);
    expect(stats.openPayments).toBe(0);
    expect(() =>
      mapAdminDashboardStats({
        open_partner_applications: 0,
        schema_version: 'wrong',
      }),
    ).toThrow(/CONTRACT_DRIFT/);
  });

  it('maps work queue including unknown types without crashing', () => {
    const page = mapAdminWorkQueue({
      schema_version: BACKEND_CONTRACT.schemaVersion,
      next_cursor: null,
      items: [
        {
          id: '1',
          type: 'partner_application',
          title: 'App',
          subtitle: 'sub',
          priority: 'urgent',
          created_at: '2026-07-29T00:00:00Z',
        },
        {
          id: '2',
          type: 'weird_future_type',
          title: 'x',
          subtitle: 'y',
          priority: 'normal',
          created_at: '2026-07-29T00:00:00Z',
        },
      ],
    });
    expect(page.items).toHaveLength(2);
    expect(page.items[0]?.priority).toBe('high');
    expect(page.items[1]?.type).toBe('unknown');
    expect(page.items[1]?.title).toContain('Onbekend');
  });

  it('mapAdminQueueItem falls back safely', () => {
    const item = mapAdminQueueItem({ type: null, id: 'z' }, 3);
    expect(item.type).toBe('unknown');
    expect(item.id).toBe('z');
  });
});
