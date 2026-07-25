import {
  mapMobileRpcToOwner,
  mapMobileTableToOwner,
  OWNER_TABLES,
} from '@/api/contract/ownerMapping';
import { fromOwnerTable, isContractSurfaceUnavailable, rpcOwner } from '@/api/contract/ownerClient';
import {
  mapPortalFile,
  mapPortalInvoice,
  mapPortalProject,
  mapPortalQuote,
  mapPortalQuoteItem,
} from '@/api/contract/portalMappers';
import {
  REQUIRED_A5_TABLE_MAPPINGS,
  resolveRequiredOwnerTable,
} from '@/api/contract/ownerSurfaces';
import { DomainError } from '@/lib/errors';
import { loadOptionalDashboardSurface } from '@/api/repositories/projectsRepository';
import { listConversations } from '@/api/repositories/messagesRepository';

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

describe('A5 owner contract runtime adapter', () => {
  beforeEach(() => {
    mockFrom.mockReset();
    mockRpc.mockReset();
  });

  it('maps proven logical names to portal_* owner tables', () => {
    expect(REQUIRED_A5_TABLE_MAPPINGS.projects).toBe('portal_projects');
    expect(mapMobileTableToOwner('projects')).toBe(OWNER_TABLES.projects);
    expect(mapMobileTableToOwner('quotes')).toBe('portal_quotes');
    expect(mapMobileTableToOwner('quote_items')).toBe('portal_quote_items');
    expect(mapMobileTableToOwner('invoices')).toBe('portal_invoices');
    expect(mapMobileTableToOwner('documents')).toBe('portal_files');
    expect(resolveRequiredOwnerTable('projects')).toBe('portal_projects');
  });

  it('maps proven RPCs to owner RPC names', () => {
    expect(mapMobileRpcToOwner('accept_quote')).toBe('accept_portal_quote');
    expect(mapMobileRpcToOwner('reject_quote')).toBe('decline_portal_quote');
  });

  it('fromOwnerTable routes projects to portal_projects at runtime', () => {
    const client = { from: mockFrom, rpc: mockRpc } as never;
    mockFrom.mockReturnValue(makeQuery({ data: [], error: null }));
    fromOwnerTable(client, 'projects').select('*');
    expect(mockFrom).toHaveBeenCalledWith('portal_projects');
    expect(mockFrom).not.toHaveBeenCalledWith('projects');
  });

  it('fromOwnerTable rejects unsupported legacy conversations', () => {
    const client = { from: mockFrom, rpc: mockRpc } as never;
    expect(() => fromOwnerTable(client, 'conversations')).toThrow(DomainError);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('rpcOwner routes accept_quote to accept_portal_quote', () => {
    const client = { from: mockFrom, rpc: mockRpc } as never;
    mockRpc.mockReturnValue(makeQuery({ data: null, error: null }));
    rpcOwner(client, 'accept_quote', { p_quote_id: 'q1' });
    expect(mockRpc).toHaveBeenCalledWith('accept_portal_quote', { p_quote_id: 'q1' });
  });
});

describe('portal mappers', () => {
  it('maps portal project/quote/invoice/file fixtures', () => {
    const project = mapPortalProject({
      id: 'p1',
      organization_id: 'org1',
      name: 'Website',
      description: 'Desc',
      status: 'IN_PROGRESS',
      progress_percent: 40,
      planned_delivery_date: null,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-02T00:00:00Z',
    });
    expect(project.title).toBe('Website');
    expect(project.status).toBe('in_progress');

    const item = mapPortalQuoteItem({
      id: 'i1',
      quote_id: 'q1',
      title: 'Setup',
      description: null,
      quantity: 2,
      unit_price_cents: 1000,
      tax_rate_basis_points: 2100,
      subtotal_cents: 2000,
      tax_cents: 420,
      total_cents: 2420,
      sort_order: 0,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    });
    expect(item.unitPriceCents).toBe(1000);
    expect(item.vatPercent).toBe(21);

    const quote = mapPortalQuote(
      {
        id: 'q1',
        organization_id: 'org1',
        quote_number: 'Q-1',
        title: 'Offerte',
        description: null,
        status: 'SENT',
        currency: 'EUR',
        subtotal_cents: 2000,
        vat_cents: 420,
        total_cents: 2420,
        valid_until: '2026-02-01',
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      },
      [
        {
          id: 'i1',
          quote_id: 'q1',
          title: 'Setup',
          description: null,
          quantity: 1,
          unit_price_cents: 2000,
          tax_rate_basis_points: 2100,
          subtotal_cents: 2000,
          tax_cents: 420,
          total_cents: 2420,
          sort_order: 0,
          created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-01-01T00:00:00Z',
        },
      ],
    );
    expect(quote.status).toBe('sent');
    expect(quote.items).toHaveLength(1);

    const invoice = mapPortalInvoice({
      id: 'inv1',
      organization_id: 'org1',
      invoice_number: 'F-1',
      status: 'OPEN',
      issue_date: '2026-01-01',
      due_date: '2026-01-15',
      currency: 'EUR',
      subtotal_cents: 100,
      vat_cents: 21,
      total_cents: 121,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    });
    expect(invoice.status).toBe('sent');

    const file = mapPortalFile({
      id: 'd1',
      organization_id: 'org1',
      project_id: null,
      quote_id: null,
      invoice_id: null,
      title: 'Brief',
      file_name: 'brief.pdf',
      mime_type: 'application/pdf',
      size_bytes: 10,
      status: 'AVAILABLE',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    });
    expect(file.status).toBe('available');
  });
});

describe('dashboard optional surfaces', () => {
  it('does not fail overview when conversations are unavailable', async () => {
    const result = await loadOptionalDashboardSurface(async () => {
      throw DomainError.configuration('CONTRACT_SURFACE_UNAVAILABLE:conversations');
    }, []);
    expect(result.unavailable).toBe(true);
    expect(result.data).toEqual([]);
    expect(
      isContractSurfaceUnavailable(
        DomainError.configuration('CONTRACT_SURFACE_UNAVAILABLE:conversations'),
      ),
    ).toBe(true);
  });

  it('live listConversations does not query conversations table', async () => {
    try {
      await listConversations();
      throw new Error('expected reject');
    } catch (err) {
      expect(isContractSurfaceUnavailable(err)).toBe(true);
    }
  });
});

describe('production ref absence in owner mapping', () => {
  it('does not embed production project ref', () => {
    const blob = JSON.stringify({
      ...REQUIRED_A5_TABLE_MAPPINGS,
      tables: OWNER_TABLES,
    });
    expect(blob).not.toContain('nhsrdnjfsxfikfbdmdfj');
  });
});
